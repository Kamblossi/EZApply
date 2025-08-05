// Quick CLI test for AWS SES email sending
require('dotenv').config();
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Initialize SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function testSESEmail() {
  console.log("🧪 Testing AWS SES Email Configuration...\n");
  
  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SES_FROM_EMAIL: ${process.env.SES_FROM_EMAIL}\n`);

  const testCode = "123456";
  const testEmail = process.env.SES_FROM_EMAIL; // Send to yourself for testing
  
  const emailSubject = "EZApply SES Test - Verification Code";
  const emailBodyText = `
    TEST EMAIL - AWS SES Configuration Check
    
    Your test verification code is: ${testCode}
    
    If you receive this email, your AWS SES configuration is working correctly!
    
    Best regards,
    EZApply Test
  `;

  const emailBodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SES Test Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #24c96b;">🧪 AWS SES Test Email</h2>
        <p>Your test verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 32px; font-weight: bold; color: #24c96b; letter-spacing: 4px;">
            ${testCode}
          </div>
        </div>
        <p style="color: #666;">
          ✅ If you receive this email, your AWS SES configuration is working correctly!
        </p>
        <hr style="margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          This is a test email from EZApply backend server.
        </p>
      </div>
    </body>
    </html>
  `;

  const params = {
    Destination: {
      ToAddresses: [testEmail],
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
    Source: process.env.SES_FROM_EMAIL,
  };

  try {
    console.log("📧 Attempting to send test email via AWS SES...");
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    
    console.log("\n✅ SUCCESS! AWS SES email sent successfully!");
    console.log(`📬 Message ID: ${data.MessageId}`);
    console.log(`📧 Test email sent to: ${testEmail}`);
    console.log("\n🎉 Your AWS SES configuration is working correctly!");
    console.log("   You can now proceed with registration testing.");
    
  } catch (error) {
    console.log("\n❌ FAILED! AWS SES email sending failed:");
    console.error("Error details:", error.message);
    
    if (error.name === 'MessageRejected' && error.message?.includes('Email address is not verified')) {
      console.log("\n🔧 SOLUTION:");
      console.log("   Your sender email address needs to be verified in AWS SES.");
      console.log("   Go to AWS SES Console > Verified identities > Create identity");
      console.log(`   Add: ${process.env.SES_FROM_EMAIL}`);
    } else if (error.name === 'InvalidClientTokenId') {
      console.log("\n🔧 SOLUTION:");
      console.log("   Check your AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
    } else {
      console.log("\n🔧 Check your AWS SES configuration and try again.");
    }
  }
}

// Run the test
testSESEmail().catch(console.error);
