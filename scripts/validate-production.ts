#!/usr/bin/env bun
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import { deploymentConfig } from '../config/deployment.config'

const execAsync = promisify(exec)

// Production environment validation schema
const productionEnvSchema = z.object({
  // App Configuration
  NODE_ENV: z.literal('production'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  
  // Infrastructure
  CLUSTER_NAME: z.string(),
  DIGITALOCEAN_ACCESS_TOKEN: z.string().min(20),
  GITHUB_TOKEN: z.string().min(20),
  
  // Database
  DATABASE_URL: z.string().includes('postgresql://'),
  REDIS_URL: z.string().includes('redis://'),
  
  // Security
  JWT_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  
  // Payment Processing
  STRIPE_PUBLIC_KEY: z.string().startsWith('pk_'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // Monitoring
  SENTRY_DSN: z.string().url(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('error'),
  
  // CDN and Storage
  CDN_URL: z.string().url(),
  STORAGE_BUCKET: z.string(),
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(8)
})

type ProductionEnv = z.infer<typeof productionEnvSchema>

async function validateKubernetes() {
  console.log('Validating Kubernetes cluster...')
  
  try {
    // Check cluster access
    const { stdout: clusterInfo } = await execAsync('kubectl cluster-info')
    console.log('✅ Kubernetes cluster accessible')
    
    // Check nodes
    const { stdout: nodes } = await execAsync('kubectl get nodes')
    const nodeCount = nodes.split('\n').length - 1
    if (nodeCount < 3) {
      throw new Error(`Insufficient nodes: ${nodeCount}. Minimum 3 required.`)
    }
    console.log(`✅ Node count sufficient: ${nodeCount}`)
    
    // Check resources
    const { stdout: resources } = await execAsync('kubectl describe nodes')
    if (resources.includes('Insufficient memory') || resources.includes('Insufficient cpu')) {
      throw new Error('Insufficient cluster resources')
    }
    console.log('✅ Cluster resources sufficient')
    
  } catch (error) {
    console.error('❌ Kubernetes validation failed:', error)
    process.exit(1)
  }
}

async function validateInfrastructure() {
  console.log('Validating infrastructure...')
  
  try {
    // Check DNS
    const { stdout: dns } = await execAsync(`dig +short ${process.env.APP_URL}`)
    if (!dns) {
      throw new Error('DNS not configured')
    }
    console.log('✅ DNS configured')
    
    // Check SSL certificates
    const { stdout: ssl } = await execAsync(`curl -sI https://${process.env.APP_URL}`)
    if (!ssl.includes('HTTP/2')) {
      throw new Error('SSL not properly configured')
    }
    console.log('✅ SSL configured')
    
    // Check CDN
    const { stdout: cdn } = await execAsync(`curl -sI ${process.env.CDN_URL}`)
    if (!cdn.includes('HTTP/2')) {
      throw new Error('CDN not properly configured')
    }
    console.log('✅ CDN configured')
    
  } catch (error) {
    console.error('❌ Infrastructure validation failed:', error)
    process.exit(1)
  }
}

async function validateSecuritySettings() {
  console.log('Validating security settings...')
  
  // Check security headers
  const { headers } = deploymentConfig.security
  
  try {
    const { stdout: response } = await execAsync(`curl -sI ${process.env.APP_URL}`)
    
    // Validate required headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Strict-Transport-Security'
    ]
    
    for (const header of requiredHeaders) {
      if (!response.includes(header)) {
        throw new Error(`Missing security header: ${header}`)
      }
    }
    
    console.log('✅ Security headers configured')
    
    // Validate rate limiting
    const { rateLimit } = deploymentConfig.security
    if (!rateLimit.window || !rateLimit.max) {
      throw new Error('Rate limiting not configured')
    }
    console.log('✅ Rate limiting configured')
    
  } catch (error) {
    console.error('❌ Security validation failed:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('Starting production environment validation...')
  
  try {
    // Validate environment variables
    const env = productionEnvSchema.parse(process.env)
    console.log('✅ Environment variables validated')
    
    // Validate infrastructure components
    await Promise.all([
      validateKubernetes(),
      validateInfrastructure(),
      validateSecuritySettings()
    ])
    
    console.log('✅ Production environment validation successful!')
    process.exit(0)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      console.error(JSON.stringify(error.format(), null, 2))
    } else {
      console.error('❌ Validation failed:', error)
    }
    process.exit(1)
  }
}

main()