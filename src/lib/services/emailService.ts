import nodemailer from 'nodemailer'

interface InvitationEmailData {
  to: string
  organizationName: string
  inviterName: string
  invitationToken: string
  role: string
  personalMessage?: string
  expiresAt: string
}

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

// Email service configuration
function getEmailConfig(): EmailConfig {
  const provider = process.env.EMAIL_PROVIDER || 'smtp'
  
  switch (provider) {
    case 'sendgrid':
      return {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY || ''
        }
      }
    case 'aws-ses':
      return {
        host: process.env.AWS_SES_SMTP_HOST || '',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_SMTP_USER || '',
          pass: process.env.AWS_SES_SMTP_PASSWORD || ''
        }
      }
    default:
      return {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || ''
        }
      }
  }
}

// Create email transporter
function createTransporter() {
  const config = getEmailConfig()
  return nodemailer.createTransport(config)
}

// Generate invitation email HTML
function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const invitationUrl = `${siteUrl}/invitations/${data.invitationToken}`
  const expiryDate = new Date(data.expiresAt).toLocaleDateString()
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Join ${data.organizationName} - Stuff Happens</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%);
          color: white;
          padding: 30px 40px;
          text-align: center;
        }
        .header h1 {
          font-family: 'Besley', serif;
          font-size: 28px;
          margin: 0;
          font-weight: 400;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #2c3e50;
        }
        .message {
          margin-bottom: 30px;
          line-height: 1.7;
        }
        .personal-message {
          background-color: #f8f9fa;
          border-left: 4px solid #81c784;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
          font-style: italic;
        }
        .cta-button {
          display: inline-block;
          background-color: #81c784;
          color: white !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #66bb6a;
        }
        .info-box {
          background-color: #e3f2fd;
          border: 1px solid #bbdefb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #1976d2;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px 40px;
          text-align: center;
          font-size: 14px;
          color: #666;
          border-top: 1px solid #e9ecef;
        }
        .footer a {
          color: #81c784;
          text-decoration: none;
        }
        .expiry-notice {
          background-color: #fff3e0;
          border: 1px solid #ffcc02;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
        .role-badge {
          display: inline-block;
          background-color: #e8f5e8;
          color: #2e7d32;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          text-transform: capitalize;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${data.organizationName} on Stuff Happens</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hi there! 👋
          </div>
          
          <div class="message">
            <strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> 
            as a <span class="role-badge">${data.role}</span> on Stuff Happens.
          </div>
          
          ${data.personalMessage ? `
            <div class="personal-message">
              <strong>Personal message from ${data.inviterName}:</strong><br>
              "${data.personalMessage}"
            </div>
          ` : ''}
          
          <div class="message">
            Stuff Happens helps families and organizations track household items, manage inventory, 
            and handle the invisible labor of keeping everything organized. You'll be able to:
          </div>
          
          <ul style="margin: 20px 0; padding-left: 20px; line-height: 1.8;">
            <li>📦 Track household items and consumables</li>
            <li>📍 Organize items by rooms and storage containers</li>
            <li>🛒 Manage shopping lists and inventory</li>
            <li>👥 Collaborate with your family or team</li>
            <li>📊 Get insights into household management</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" class="cta-button">Accept Invitation</a>
          </div>
          
          <div class="info-box">
            <strong>Organization:</strong> ${data.organizationName}<br>
            <strong>Your Role:</strong> <span class="role-badge">${data.role}</span><br>
            <strong>Invited By:</strong> ${data.inviterName}
          </div>
          
          <div class="expiry-notice">
            ⏰ <strong>Important:</strong> This invitation expires on ${expiryDate}. 
            Make sure to accept it before then!
          </div>
          
          <div class="message" style="font-size: 14px; color: #666; margin-top: 30px;">
            If you can't click the button above, copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #81c784; word-break: break-all;">${invitationUrl}</a>
          </div>
        </div>
        
        <div class="footer">
          <p>
            This invitation was sent by ${data.organizationName} using 
            <a href="${siteUrl}">Stuff Happens</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; color: #999;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate plain text version
function generateInvitationEmailText(data: InvitationEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const invitationUrl = `${siteUrl}/invitations/${data.invitationToken}`
  const expiryDate = new Date(data.expiresAt).toLocaleDateString()
  
  return `
You're Invited to Join ${data.organizationName}!

Hi there!

${data.inviterName} has invited you to join ${data.organizationName} as a ${data.role} on Stuff Happens.

${data.personalMessage ? `Personal message from ${data.inviterName}: "${data.personalMessage}"\n\n` : ''}

Stuff Happens helps families and organizations track household items, manage inventory, and handle the invisible labor of keeping everything organized.

To accept this invitation, visit: ${invitationUrl}

Organization: ${data.organizationName}
Your Role: ${data.role}
Invited By: ${data.inviterName}
Expires: ${expiryDate}

If you can't click the link above, copy and paste it into your browser.

---
This invitation was sent by ${data.organizationName} using Stuff Happens (${siteUrl})

If you didn't expect this invitation, you can safely ignore this email.
  `.trim()
}

// Send invitation email
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: {
        name: 'Stuff Happens',
        address: process.env.FROM_EMAIL || 'noreply@stuffhappens.app'
      },
      to: data.to,
      subject: `You're invited to join ${data.organizationName}`,
      html: generateInvitationEmailHTML(data),
      text: generateInvitationEmailText(data),
      headers: {
        'X-Organization': data.organizationName,
        'X-Invitation-Role': data.role,
        'X-Mailer': 'Stuff Happens Invitation System'
      }
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Invitation email sent successfully:', result.messageId)
    
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw new Error(`Email delivery failed: ${error}`)
  }
}

// Send welcome email after successful invitation acceptance
export async function sendWelcomeEmail(data: {
  to: string
  organizationName: string
  role: string
  organizationId: string
}): Promise<void> {
  try {
    const transporter = createTransporter()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const mailOptions = {
      from: {
        name: 'Stuff Happens',
        address: process.env.FROM_EMAIL || 'noreply@stuffhappens.app'
      },
      to: data.to,
      subject: `Welcome to ${data.organizationName}!`,
      html: `
        <h1>Welcome to ${data.organizationName}!</h1>
        <p>You've successfully joined as a ${data.role}.</p>
        <p><a href="${siteUrl}/dashboard/household">Get started here</a></p>
      `,
      text: `Welcome to ${data.organizationName}! You've successfully joined as a ${data.role}. Get started: ${siteUrl}/dashboard/household`
    }

    await transporter.sendMail(mailOptions)
    console.log('Welcome email sent successfully')
    
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    // Don't throw error for welcome emails - they're nice to have but not critical
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Email configuration test failed:', error)
    return false
  }
}