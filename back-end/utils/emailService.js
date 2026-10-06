const nodemailer = require('nodemailer');

/**
 * Creates and configures the email transporter.
 * If SMTP credentials are provided in .env, sends real emails.
 * Otherwise, falls back to a development simulator that logs to the console.
 */
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null; // Signals dev simulation mode
  }

  // If EMAIL_HOST is provided (e.g. Mailtrap, SendGrid, custom SMTP)
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass }
    });
  }

  // Default to standard service (e.g., Gmail)
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user, pass }
  });
}

/**
 * Sends a 6-digit OTP verification email to the user.
 * 
 * @param {string} toEmail - Recipient email address
 * @param {string} toName - Recipient full name or username
 * @param {string} otpCode - 6-digit verification code
 * @returns {Promise<{success: boolean, simulated?: boolean}>}
 */
async function sendVerificationOtpEmail(toEmail, toName, otpCode) {
  const transporter = createTransporter();

  const subject = `${otpCode} is your Taurus Bike Verification Code`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }
        .email_container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .email_header { background: #8b1e1e; padding: 28px 24px; text-align: center; color: #ffffff; }
        .email_header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .email_header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .email_body { padding: 32px 28px; color: #1e293b; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .otp_box { background: #fdf2f2; border: 2px dashed #8b1e1e; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp_number { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #8b1e1e; font-family: monospace, Courier, sans-serif; display: inline-block; padding-left: 10px; }
        .expiry_notice { font-size: 13px; color: #64748b; text-align: center; margin-top: 8px; }
        .security_warning { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
        .email_footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email_container">
        <div class="email_header">
          <h1>TAURUS BIKE SHOP</h1>
          <p>Ordering & Billing System</p>
        </div>
        <div class="email_body">
          <div class="greeting">Hello, ${toName || 'Rider'}!</div>
          <p>Thank you for registering your account with Taurus Bike. To complete your registration and start placing orders, please enter the 6-digit verification code below:</p>
          
          <div class="otp_box">
            <div class="otp_number">${otpCode}</div>
            <div class="expiry_notice">⏱️ This code will expire in <strong>10 minutes</strong>.</div>
          </div>

          <p>If you did not request this account creation, please disregard this email or contact support.</p>
          
          <div class="security_warning">
            🛡️ <strong>Security Tip:</strong> Never share your verification code with anyone. Taurus Bike staff will never ask for your code.
          </div>
        </div>
        <div class="email_footer">
          &copy; ${new Date().getFullYear()} Taurus Bike Shop • Sandico St, Abangan Sur, Marilao, Bulacan
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${toName || 'Rider'},\n\nYour Taurus Bike 6-digit verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please disregard.`;

  // Development Fallback: If no SMTP credentials are configured, log to server console
  if (!transporter) {
    console.log('\n' + '='.repeat(64));
    console.log('📨 [BICOBS EMAIL SERVICE - SIMULATOR]');
    console.log(`To: ${toEmail} (${toName})`);
    console.log(`Subject: ${subject}`);
    console.log(`🔑 6-Digit OTP Code: >>> ${otpCode} <<<`);
    console.log('⏱️ Valid for 10 minutes');
    console.log('💡 To send real emails, add EMAIL_USER and EMAIL_PASS to your .env');
    console.log('='.repeat(64) + '\n');
    return { success: true, simulated: true, otp: otpCode };
  }

  // Real Email Dispatch via SMTP
  try {
    const fromAddress = process.env.EMAIL_FROM || `"Taurus Bike Shop" <${process.env.EMAIL_USER}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[EmailService] Real verification email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService Error] Failed to send real email via SMTP:', error.message);
    // Fall back to terminal logging if SMTP fails so the customer/dev is not locked out!
    console.log('\n' + '!'.repeat(64));
    console.log('⚠️ [SMTP SEND FAILED - FALLBACK CONSOLE OTP]');
    console.log(`Recipient: ${toEmail}`);
    console.log(`🔑 6-Digit OTP Code: >>> ${otpCode} <<<`);
    console.log('!'.repeat(64) + '\n');
    return { success: true, simulated: true, otp: otpCode, warning: 'SMTP delivery failed; code logged to terminal' };
  }
}

module.exports = {
  sendVerificationOtpEmail
};
