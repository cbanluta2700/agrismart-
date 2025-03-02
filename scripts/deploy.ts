#!/usr/bin/env bun
import { join } from 'path'
import { execSync } from 'child_process'
import { deploymentConfig, validateEnv } from '../config/deployment.config'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

interface DeploymentReport {
  timestamp: string
  status: 'success' | 'failure'
  environment: string
  buildInfo: {
    duration: number
    size: string
    chunks: number
  }
  errors?: string[]
}

class Deployment {
  private startTime: number
  private reports: DeploymentReport[] = []
  private reportDir = join(process.cwd(), 'reports', 'deployments')

  constructor() {
    this.startTime = Date.now()
    this.ensureDirectories()
  }

  private ensureDirectories() {
    const dirs = [
      join(process.cwd(), 'reports'),
      this.reportDir,
      join(process.cwd(), 'logs')
    ]

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })
  }

  private validateEnvironment() {
    console.log('🔍 Validating environment...')
    const { success, error } = validateEnv()
    if (!success) {
      throw new Error(`Environment validation failed: ${error}`)
    }
    console.log('✅ Environment validated')
  }

  private optimizeBuild() {
    console.log('🛠️ Optimizing build...')
    
    // Update next.config.js with optimization settings
    const nextConfig = {
      ...require('../next.config.js'),
      ...deploymentConfig.build.optimization
    }
    writeFileSync(
      join(process.cwd(), 'next.config.js'),
      `module.exports = ${JSON.stringify(nextConfig, null, 2)}`
    )

    console.log('✅ Build optimization configured')
  }

  private async runBuild() {
    console.log('🏗️ Running build...')
    try {
      execSync('bun run build', { stdio: 'inherit' })
      console.log('✅ Build completed')
    } catch (error) {
      throw new Error(`Build failed: ${error}`)
    }
  }

  private setupSecurityHeaders() {
    console.log('🔒 Setting up security headers...')
    
    // Update middleware with security headers
    const middlewarePath = join(process.cwd(), 'middleware.ts')
    let middleware = readFileSync(middlewarePath, 'utf-8')
    
    // Add security headers
    const headers = deploymentConfig.security.headers
    const headerConfig = `export const securityHeaders = ${JSON.stringify(headers, null, 2)}`
    
    middleware = `${headerConfig}\n${middleware}`
    writeFileSync(middlewarePath, middleware)
    
    console.log('✅ Security headers configured')
  }

  private setupMonitoring() {
    console.log('📊 Setting up monitoring...')
    
    if (deploymentConfig.monitoring.sentry.enabled) {
      // Initialize Sentry
      execSync('bun add @sentry/nextjs')
      const sentryConfig = {
        dsn: deploymentConfig.monitoring.sentry.dsn,
        tracesSampleRate: deploymentConfig.monitoring.sentry.tracesSampleRate
      }
      writeFileSync(
        join(process.cwd(), 'sentry.config.js'),
        `module.exports = ${JSON.stringify(sentryConfig, null, 2)}`
      )
    }

    // Setup logging
    const { level, format, outputDir } = deploymentConfig.monitoring.logging
    const logConfig = {
      level,
      format,
      outputDir
    }
    writeFileSync(
      join(process.cwd(), 'logging.config.js'),
      `module.exports = ${JSON.stringify(logConfig, null, 2)}`
    )
    
    console.log('✅ Monitoring configured')
  }

  private generateReport(): DeploymentReport {
    const duration = Date.now() - this.startTime
    const { size, chunks } = this.getBuildStats()

    return {
      timestamp: new Date().toISOString(),
      status: 'success',
      environment: process.env.NODE_ENV || 'development',
      buildInfo: {
        duration,
        size,
        chunks
      }
    }
  }

  private getBuildStats() {
    const statsPath = join(process.cwd(), '.next', 'stats.json')
    if (existsSync(statsPath)) {
      const stats = JSON.parse(readFileSync(statsPath, 'utf-8'))
      return {
        size: this.formatBytes(stats.totalSize),
        chunks: stats.chunks.length
      }
    }
    return { size: 'unknown', chunks: 0 }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
  }

  private saveReport(report: DeploymentReport) {
    const reportPath = join(
      this.reportDir,
      `deploy-${report.timestamp.replace(/:/g, '-')}.json`
    )
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📝 Deployment report saved to ${reportPath}`)
  }

  async deploy() {
    try {
      console.log('🚀 Starting deployment...')
      
      // Run deployment steps
      this.validateEnvironment()
      this.optimizeBuild()
      await this.runBuild()
      this.setupSecurityHeaders()
      this.setupMonitoring()

      // Generate and save report
      const report = this.generateReport()
      this.saveReport(report)

      console.log('✨ Deployment completed successfully!')
    } catch (error) {
      console.error('❌ Deployment failed:', error)
      const report: DeploymentReport = {
        timestamp: new Date().toISOString(),
        status: 'failure',
        environment: process.env.NODE_ENV || 'development',
        buildInfo: {
          duration: Date.now() - this.startTime,
          size: 'unknown',
          chunks: 0
        },
        errors: [error.toString()]
      }
      this.saveReport(report)
      process.exit(1)
    }
  }
}

// Run deployment
const deployment = new Deployment()
deployment.deploy()