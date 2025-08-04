import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES Client using environment variables
// Ensure these environment variables are loaded (e.g., via dotenv in your main server file)
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1", // Default region if env var not set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL;

  // This check ensures we have all necessary SES environment variables.
  // If not, it falls back to console logging (your old mock behavior).
  if (!SES_FROM_EMAIL || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.error(`
      --- SES Configuration Error ---
      Required environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, SES_FROM_EMAIL)
      are not fully set. Falling back to console logging for verification code.
      ---
    `);
    console.log(`
=== EMAIL VERIFICATION (MOCK) ===
To: ${email}
Subject: Verify your EZApply account
Code: ${code}
=========================
    `);
    return true; // Return true for fallback mode (development)
  }

  const emailSubject = "Verify your EZApply account";
  const emailBodyText = `
    Hello,

    Thank you for registering with EZApply.
    Please use the following 6-digit code to verify your email address:

    ${code}

    This code will expire in 15 minutes.

    If you did not request this, please ignore this email.

    Best regards,
    Prism Tech
  `;

  const emailBodyHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your EZApply account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #24c96b; margin: 0; font-size: 28px; font-weight: bold;">EZApply</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Your Job Application Assistant</p>
        </div>
        
        <!-- Main Content -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Verify Your Account</h2>
          <p style="color: #666; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
            Thank you for registering with EZApply! Please use the verification code below to complete your account setup.
          </p>
        </div>
        
        <!-- Verification Code -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f8f9fa; border: 2px solid #24c96b; border-radius: 8px; padding: 20px; display: inline-block; min-width: 200px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-weight: bold;">VERIFICATION CODE</p>
            <div style="font-size: 32px; font-weight: bold; color: #24c96b; letter-spacing: 4px; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
        </div>
        
        <!-- Instructions -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
            Enter this code in the verification page to complete your registration.
          </p>
          <p style="color: #ff6b6b; margin: 0; font-size: 14px; font-weight: bold;">
            ⏰ This code expires in 15 minutes
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; text-align: center;">
          <p style="color: #999; margin: 0 0 10px 0; font-size: 12px;">
            If you didn't request this verification, please ignore this email.
          </p>
          <p style="color: #999; margin: 0; font-size: 12px;">
            Best regards,<br>
            <strong style="color: #24c96b;">The Prism Tech Team</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: emailBodyText,
        },
        Html: {
          Charset: "UTF-8",
          Data: emailBodyHtml,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: emailSubject,
      },
    },
    Source: SES_FROM_EMAIL, // Your verified email address (newton.ochieng97@gmail.com)
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    console.log(`Verification email sent to ${email} via SES. MessageId: ${data.MessageId}`);
    return true; // Email sent successfully
  } catch (error: any) {
    console.error(`Failed to send verification email to ${email} via SES:`, error);
    return false; // Email sending failed
  }
};

// Export as an object to match the import in auth.ts
export const emailService = {
  sendVerificationEmail
};