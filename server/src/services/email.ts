// Email service for sending verification codes
// For development, we'll log to console. In production, integrate with email provider.

export interface EmailService {
  sendVerificationEmail(email: string, code: string): Promise<boolean>;
}

class ConsoleEmailService implements EmailService {
  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    console.log(`📧 EMAIL VERIFICATION (Development Mode)`);
    console.log(`To: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Subject: Verify Your EZApply Account`);
    console.log(`Body: Your verification code is: ${code}`);
    console.log(`This code expires in 15 minutes.`);
    console.log(`─────────────────────────────────────────`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

// TODO: Add real email service implementation for production
// class NodemailerEmailService implements EmailService {
//   async sendVerificationEmail(email: string, code: string): Promise<boolean> {
//     // Implementation with nodemailer or other email service
//   }
// }

export const emailService: EmailService = new ConsoleEmailService();
