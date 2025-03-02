import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using the configured email provider
 */
export async function sendEmail({ to, subject, text, html }: EmailParams): Promise<boolean> {
  try {
    // Check if we have the required environment variables
    if (!process.env.EMAIL_SERVER_HOST || 
        !process.env.EMAIL_SERVER_PORT || 
        !process.env.EMAIL_SERVER_USER || 
        !process.env.EMAIL_SERVER_PASSWORD || 
        !process.env.EMAIL_FROM) {
      console.error('Email configuration missing. Cannot send email.');
      return false;
    }

    // Create a transport
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // Send the email
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a formatted email with the AgriSmart template
 */
export async function sendFormattedEmail({ to, subject, text, html }: EmailParams): Promise<boolean> {
  // Create a formatted template with the AgriSmart branding
  const formattedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #13803b;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        a {
          color: #13803b;
          text-decoration: none;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #13803b;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AgriSmart</h1>
        </div>
        <div class="content">
          ${html || text || ''}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AgriSmart. All rights reserved.</p>
          <p>This email was sent to you because you're registered on AgriSmart.</p>
          <p>You can <a href="${process.env.NEXT_PUBLIC_URL}/account/notification-preferences">manage your notification preferences here</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html: formattedHtml,
  });
}
