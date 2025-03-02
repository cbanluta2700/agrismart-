import nodemailer from 'nodemailer'
import { EmailTemplate } from './templates'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@agrismart.com'
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    })
  }

  async sendEmail(
    to: string,
    template: EmailTemplate,
    attachments?: nodemailer.Attachment[]
  ) {
    try {
      const info = await this.transporter.sendMail({
        from: emailConfig.from,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments
      })

      console.log('Email sent:', info.messageId)
      return info
    } catch (error) {
      console.error('Failed to send email:', error)
      throw new Error('Failed to send email')
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service verification failed:', error)
      return false
    }
  }
}

// Create a singleton instance
const emailService = new EmailService(emailConfig)

export default emailService

// Helper functions for specific email types
export async function sendVerificationEmail(
  to: string,
  template: EmailTemplate
) {
  return emailService.sendEmail(to, template)
}

export async function sendPasswordResetEmail(
  to: string,
  template: EmailTemplate
) {
  return emailService.sendEmail(to, template)
}

// Types
export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html: string
  attachments?: nodemailer.Attachment[]
}