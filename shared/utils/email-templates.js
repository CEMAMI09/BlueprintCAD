// Email templates for verification
export function getVerificationEmailHTML(username, verificationLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Blueprint</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">
                🔐 Blueprint
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Verify Your Email Address
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                Hi <strong style="color: #ffffff;">${username}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                Thanks for signing up for Blueprint! To get started uploading and sharing your 3D models, please verify your email address by clicking the button below.
              </p>

              <!-- Verification Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 20px 0; padding: 12px; background-color: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; font-size: 13px; color: #6b7280; word-break: break-all;">
                ${verificationLink}
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #1e293b; border-left: 4px solid #3b82f6; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                  <strong style="color: #ffffff;">⏱️ This link expires in 24 hours</strong><br>
                  If you didn't create an account with Blueprint, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #0a0a0a; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                Questions? Contact us at <a href="mailto:support@forge.com" style="color: #3b82f6; text-decoration: none;">support@forge.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                © ${new Date().getFullYear()} Blueprint. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getVerificationEmailText(username, verificationLink) {
  return `
Hi ${username},

Thanks for signing up for Blueprint! To get started uploading and sharing your 3D models, please verify your email address.

Verify your email by clicking this link:
${verificationLink}

This link expires in 24 hours.

If you didn't create an account with Forge, you can safely ignore this email.

Questions? Contact us at support@forge.com

© ${new Date().getFullYear()} Forge. All rights reserved.
  `.trim();
}

export function purchaseConfirmation(username, projectTitle, orderNumber, amount, downloadToken) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/orders/${orderNumber}`;
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; color: #ffffff;">✅ Purchase Confirmed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Your purchase of <strong style="color: #ffffff;">${projectTitle}</strong> has been confirmed!</p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #0a0a0a; border-radius: 8px;">
                <p style="margin: 5px 0; color: #6b7280;">Order Number: <strong style="color: #ffffff;">${orderNumber}</strong></p>
                <p style="margin: 5px 0; color: #6b7280;">Amount: <strong style="color: #ffffff;">$${amount.toFixed(2)}</strong></p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Order & Download
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #6b7280;">You can download this file up to 3 times within 1 year.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #0a0a0a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">© ${new Date().getFullYear()} Blueprint. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function saleNotification(username, projectTitle, buyerUsername, amount, orderNumber) {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; color: #ffffff;">🎉 You Made a Sale!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Great news! Your project <strong style="color: #ffffff;">${projectTitle}</strong> was just purchased by <strong>${buyerUsername}</strong>.</p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #0a0a0a; border-radius: 8px;">
                <p style="margin: 5px 0; color: #6b7280;">Order: <strong style="color: #ffffff;">${orderNumber}</strong></p>
                <p style="margin: 5px 0; color: #6b7280;">Amount: <strong style="color: #10b981; font-size: 24px;">$${amount.toFixed(2)}</strong></p>
                <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">Platform fee (10%): $${(amount * 0.1).toFixed(2)}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #ffffff;">Your earnings: <strong style="color: #10b981;">$${(amount * 0.9).toFixed(2)}</strong></p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">Keep creating amazing designs!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #0a0a0a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">© ${new Date().getFullYear()} Blueprint. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function refundNotification(username, projectTitle, orderNumber, amount) {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; color: #ffffff;">Refund Processed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Your refund for <strong style="color: #ffffff;">${projectTitle}</strong> has been processed.</p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #0a0a0a; border-radius: 8px;">
                <p style="margin: 5px 0; color: #6b7280;">Order: <strong style="color: #ffffff;">${orderNumber}</strong></p>
                <p style="margin: 5px 0; color: #6b7280;">Refund Amount: <strong style="color: #ffffff;">$${amount.toFixed(2)}</strong></p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">The refund will appear in your account within 5-10 business days.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function sellerRefundNotification(username, projectTitle, orderNumber, amount) {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px;">
          <tr>
            <td style="background-color: #1e293b; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; color: #ffffff;">Order Refunded</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">A refund has been processed for your project <strong style="color: #ffffff;">${projectTitle}</strong>.</p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #0a0a0a; border-radius: 8px;">
                <p style="margin: 5px 0; color: #6b7280;">Order: <strong style="color: #ffffff;">${orderNumber}</strong></p>
                <p style="margin: 5px 0; color: #6b7280;">Refund Amount: <strong style="color: #ffffff;">$${amount.toFixed(2)}</strong></p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">The sale earnings will be deducted from your account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
