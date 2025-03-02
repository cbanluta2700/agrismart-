interface EmailTemplate {
  subject: string
  text: string
  html: string
}

export function getVerificationEmailTemplate(
  name: string,
  verificationLink: string
): EmailTemplate {
  return {
    subject: 'Verify Your AgriSmart Account',
    text: `
Hello ${name},

Thank you for registering with AgriSmart. Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
The AgriSmart Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Verify your AgriSmart account</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333; text-align: center;">Welcome to AgriSmart!</h2>
    <p style="color: #666;">Hello ${name},</p>
    <p style="color: #666;">Thank you for registering with AgriSmart. Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
    </div>
    <p style="color: #666;">This link will expire in 24 hours.</p>
    <p style="color: #666;">If you did not create an account, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      © ${new Date().getFullYear()} AgriSmart. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim(),
  }
}

export function getPasswordResetEmailTemplate(
  name: string,
  resetLink: string
): EmailTemplate {
  return {
    subject: 'Reset Your AgriSmart Password',
    text: `
Hello ${name},

We received a request to reset your password. Click the link below to set a new password:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Best regards,
The AgriSmart Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Reset your AgriSmart password</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
    <p style="color: #666;">Hello ${name},</p>
    <p style="color: #666;">We received a request to reset your password. Click the button below to set a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: #666;">This link will expire in 1 hour.</p>
    <p style="color: #666;">If you did not request a password reset, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      © ${new Date().getFullYear()} AgriSmart. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim(),
  }
}