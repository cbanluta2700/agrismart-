import { z } from 'zod'

// Production configuration schema
const productionConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.literal('production'),
    url: z.string().url(),
    apiUrl: z.string().url(),
    maxUploadSize: z.number().default(10 * 1024 * 1024), // 10MB
  }),

  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(3000),
    cors: z.object({
      origin: z.array(z.string()),
      credentials: z.boolean().default(true)
    }),
    rateLimiting: z.object({
      windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
      max: z.number().default(100) // limit each IP to 100 requests per windowMs
    })
  }),

  database: z.object({
    url: z.string(),
    maxConnections: z.number().default(20),
    statementTimeout: z.number().default(30000), // 30 seconds
    idleTimeout: z.number().default(10000), // 10 seconds
    connectionTimeout: z.number().default(5000) // 5 seconds
  }),

  redis: z.object({
    url: z.string(),
    maxConnections: z.number().default(50),
    keyPrefix: z.string().default('agrismart:'),
    defaultTTL: z.number().default(86400) // 24 hours
  }),

  auth: z.object({
    jwtSecret: z.string(),
    jwtExpiresIn: z.string().default('15m'),
    refreshTokenSecret: z.string(),
    refreshTokenExpiresIn: z.string().default('7d'),
    passwordMinLength: z.number().default(8),
    maxLoginAttempts: z.number().default(5),
    lockoutDuration: z.number().default(15 * 60) // 15 minutes
  }),

  email: z.object({
    from: z.string().email(),
    smtp: z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean().default(true),
      auth: z.object({
        user: z.string(),
        pass: z.string()
      })
    })
  }),

  storage: z.object({
    provider: z.enum(['local', 's3']),
    bucket: z.string(),
    region: z.string(),
    cdnUrl: z.string().url(),
    maxFileSize: z.number().default(5 * 1024 * 1024) // 5MB
  }),

  monitoring: z.object({
    sentry: z.object({
      dsn: z.string().url(),
      tracesSampleRate: z.number().default(0.2)
    }),
    logging: z.object({
      level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
      format: z.enum(['json', 'pretty']).default('json')
    })
  }),

  cache: z.object({
    ttl: z.object({
      short: z.number().default(60), // 1 minute
      medium: z.number().default(300), // 5 minutes
      long: z.number().default(3600), // 1 hour
      day: z.number().default(86400) // 24 hours
    }),
    compression: z.boolean().default(true),
    staleWhileRevalidate: z.boolean().default(true)
  }),

  payment: z.object({
    stripe: z.object({
      publicKey: z.string(),
      secretKey: z.string(),
      webhookSecret: z.string(),
      currency: z.string().default('USD'),
      paymentMethods: z.array(z.string()).default(['card'])
    })
  }),

  security: z.object({
    helmet: z.object({
      contentSecurityPolicy: z.object({
        directives: z.record(z.array(z.string())).default({
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"]
        })
      })
    }),
    rateLimit: z.object({
      apiWindow: z.number().default(900000), // 15 minutes
      apiMax: z.number().default(100),
      authWindow: z.number().default(300000), // 5 minutes
      authMax: z.number().default(5)
    })
  })
})

type ProductionConfig = z.infer<typeof productionConfigSchema>

// Production configuration values
export const productionConfig: ProductionConfig = {
  app: {
    name: 'AgriSmart',
    version: '1.0.0',
    environment: 'production',
    url: process.env.APP_URL!,
    apiUrl: process.env.API_URL!,
    maxUploadSize: 10 * 1024 * 1024
  },

  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: {
      origin: [process.env.APP_URL!],
      credentials: true
    },
    rateLimiting: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  },

  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: 20,
    statementTimeout: 30000,
    idleTimeout: 10000,
    connectionTimeout: 5000
  },

  redis: {
    url: process.env.REDIS_URL!,
    maxConnections: 50,
    keyPrefix: 'agrismart:',
    defaultTTL: 86400
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: '15m',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
    refreshTokenExpiresIn: '7d',
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60
  },

  email: {
    from: process.env.EMAIL_FROM!,
    smtp: {
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    }
  },

  storage: {
    provider: 's3',
    bucket: process.env.STORAGE_BUCKET!,
    region: 'us-east-1',
    cdnUrl: process.env.CDN_URL!,
    maxFileSize: 5 * 1024 * 1024
  },

  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN!,
      tracesSampleRate: 0.2
    },
    logging: {
      level: 'info',
      format: 'json'
    }
  },

  cache: {
    ttl: {
      short: 60,
      medium: 300,
      long: 3600,
      day: 86400
    },
    compression: true,
    staleWhileRevalidate: true
  },

  payment: {
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY!,
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      currency: 'USD',
      paymentMethods: ['card']
    }
  },

  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", process.env.API_URL!]
        }
      }
    },
    rateLimit: {
      apiWindow: 900000,
      apiMax: 100,
      authWindow: 300000,
      authMax: 5
    }
  }
}

// Validate configuration
const validationResult = productionConfigSchema.safeParse(productionConfig)

if (!validationResult.success) {
  console.error('Invalid production configuration:')
  console.error(JSON.stringify(validationResult.error.format(), null, 2))
  process.exit(1)
}

export default productionConfig