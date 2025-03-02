#!/usr/bin/env bun
import { execSync } from 'child_process'
import { join } from 'path'
import { writeFileSync } from 'fs'
import productionConfig from '../config/production.config'

class MasterDeployment {
  private startTime: number
  private logFile: string

  constructor() {
    this.startTime = Date.now()
    this.logFile = join(process.cwd(), 'logs', `deploy-${Date.now()}.log`)
    this.ensureLogDirectory()
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    console.log(logMessage)
    writeFileSync(this.logFile, logMessage + '\n', { flag: 'a' })
  }

  private ensureLogDirectory() {
    execSync('mkdir -p logs')
  }

  private async runWithTimeout(command: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`))
      }, timeout)

      try {
        execSync(command, { stdio: 'inherit' })
        clearTimeout(timer)
        resolve()
      } catch (error) {
        clearTimeout(timer)
        reject(error)
      }
    })
  }

  private async validateEnvironment() {
    this.log('Validating production environment...')
    try {
      await this.runWithTimeout('bun run scripts/validate-production.ts', 60000)
      this.log('✅ Environment validation passed')
    } catch (error) {
      this.log(`Environment validation failed: ${error}`, 'error')
      throw error
    }
  }

  private async deployInfrastructure() {
    this.log('Setting up infrastructure...')
    try {
      // Deploy Kubernetes resources
      await this.runWithTimeout('bun run scripts/production-deploy.sh', 300000)
      this.log('✅ Infrastructure deployment complete')
    } catch (error) {
      this.log(`Infrastructure deployment failed: ${error}`, 'error')
      throw error
    }
  }

  private async setupMonitoring() {
    this.log('Setting up monitoring stack...')
    try {
      await this.runWithTimeout('bun run scripts/setup-monitoring.ts', 180000)
      this.log('✅ Monitoring setup complete')
    } catch (error) {
      this.log(`Monitoring setup failed: ${error}`, 'error')
      throw error
    }
  }

  private async verifyDeployment() {
    this.log('Verifying deployment...')
    try {
      // Check application health
      const healthCheck = execSync('curl -s http://localhost:3000/api/health').toString()
      if (!healthCheck.includes('ok')) {
        throw new Error('Health check failed')
      }

      // Check monitoring
      const prometheusCheck = execSync('curl -s http://prometheus:9090/-/healthy').toString()
      if (!prometheusCheck.includes('ok')) {
        throw new Error('Prometheus health check failed')
      }

      // Check basic functionality
      const basicChecks = [
        'kubectl get pods -n production',
        'kubectl get services -n production',
        'kubectl get ingress -n production'
      ]

      for (const check of basicChecks) {
        execSync(check, { stdio: 'inherit' })
      }

      this.log('✅ Deployment verification complete')
    } catch (error) {
      this.log(`Deployment verification failed: ${error}`, 'error')
      throw error
    }
  }

  private async runPostDeploymentTasks() {
    this.log('Running post-deployment tasks...')
    try {
      // Run database migrations
      execSync('bun run prisma migrate deploy')
      
      // Clear caches
      execSync('kubectl exec -n production deploy/redis -- redis-cli FLUSHALL')
      
      // Warm up caches
      execSync('curl -s http://localhost:3000/api/warmup')
      
      this.log('✅ Post-deployment tasks complete')
    } catch (error) {
      this.log(`Post-deployment tasks failed: ${error}`, 'error')
      throw error
    }
  }

  private generateDeploymentReport() {
    const duration = Date.now() - this.startTime
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      environment: 'production',
      config: {
        version: productionConfig.app.version,
        environment: productionConfig.app.environment
      },
      status: 'success'
    }

    const reportPath = join(process.cwd(), 'logs', `deploy-report-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    this.log(`Deployment report saved to ${reportPath}`)
  }

  public async deploy() {
    try {
      this.log('Starting production deployment...')

      // Sequential deployment steps
      await this.validateEnvironment()
      await this.deployInfrastructure()
      await this.setupMonitoring()
      await this.verifyDeployment()
      await this.runPostDeploymentTasks()

      this.generateDeploymentReport()
      
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2)
      this.log(`✨ Deployment completed successfully in ${duration}s`)
      
    } catch (error) {
      this.log('❌ Deployment failed', 'error')
      this.log(error as string, 'error')
      process.exit(1)
    }
  }
}

// Execute deployment
const deployment = new MasterDeployment()
deployment.deploy()