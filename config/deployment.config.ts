import { z } from 'zod'

// Environment variable validation schema
const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  
  // Redis
  REDIS_URL: z.string(),
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().email(),
  
  // Payment Processing
  STRIPE_PUBLIC_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Performance
  CACHE_TTL: z.string().transform(Number).default('3600'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100')
})

// Deployment environment configurations
export const deploymentConfig = {
  build: {
    // Build optimization settings
    optimization: {
      minimizer: true,
      splitChunks: true,
      treeshaking: true,
      imageOptimization: {
        quality: 80,
        formats: ['webp', 'avif']
      }
    },
    
    // Bundle analysis
    analysis: {
      enabled: true,
      reportDir: './reports/bundle-analysis'
    }
  },

  security: {
    headers: {
      'Content-Security-Policy': {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.API_URL],
      },
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    
    rateLimit: {
      window: Number(process.env.RATE_LIMIT_WINDOW),
      max: Number(process.env.RATE_LIMIT_MAX)
    }
  },

  monitoring: {
    sentry: {
      enabled: Boolean(process.env.SENTRY_DSN),
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2
    },
    
    logging: {
      level: process.env.LOG_LEVEL,
      format: 'json',
      outputDir: './logs'
    }
  },

  performance: {
    cache: {
      ttl: Number(process.env.CACHE_TTL),
      storage: 'redis'
    },
    
    cdn: {
      enabled: process.env.NODE_ENV === 'production',
      domain: process.env.CDN_URL
    }
  }
}

// Validate environment variables
export function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env)
    return { success: true, env: parsed }
  } catch (error) {
    console.error('Environment validation failed:', error)
    return { success: false, error }
  }
}

// Export validated environment
export const env = validateEnv()