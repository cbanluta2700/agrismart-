import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface VerificationEmailParams {
  to: string;
  name: string;
  verificationUrl: string;
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

interface WelcomeEmailParams {
  to: string;
  name: string;
}

/**
 * Service for sending emails
 */
class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    // Create nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.fromEmail = process.env.SMTP_FROM || 'noreply@agrismart.com';
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, from }: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: from || this.fromEmail,
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail({ to, name, verificationUrl }: VerificationEmailParams): Promise<void> {
    const subject = 'Verify your email address for AgriSmart';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Welcome to AgriSmart!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up with AgriSmart. We're excited to have you as part of our agricultural community.</p>
        <p>To complete your registration and verify your email address, please click the link below:</p>
        <p>
          <a 
            href="${verificationUrl}" 
            style="display: inline-block; background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
          >
            Verify Email Address
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account with AgriSmart, please ignore this email.</p>
        <p>Best regards,<br>The AgriSmart Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ to, name, resetUrl }: PasswordResetEmailParams): Promise<void> {
    const subject = 'Reset your AgriSmart password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your AgriSmart account.</p>
        <p>To reset your password, please click the link below:</p>
        <p>
          <a 
            href="${resetUrl}" 
            style="display: inline-block; background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
          >
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The AgriSmart Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail({ to, name }: WelcomeEmailParams): Promise<void> {
    const subject = 'Welcome to AgriSmart!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Welcome to AgriSmart!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for joining AgriSmart! We're excited to have you as part of our community.</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Connect with other agricultural professionals</li>
          <li>Buy and sell agricultural products</li>
          <li>Access educational resources</li>
          <li>Stay updated with agricultural news and trends</li>
        </ul>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The AgriSmart Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}

// Create a singleton instance
export const emailService = new EmailService();
