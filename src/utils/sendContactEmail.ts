// utils/sendContactEmail.ts
import nodemailer from "nodemailer";

// Load SMTP credentials from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@trayarunyaventures.com";

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  company?: string;
  phone?: string;
  notifyEmail?: string; // Email to receive notifications (admin email)
}

interface EmailTemplate {
  adminNotification: {
    subject: string;
    html: string;
    text: string;
  };
  customerConfirmation: {
    subject: string;
    html: string;
    text: string;
  };
}

async function createTransporter() {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    } as nodemailer.TransportOptions);

    await transporter.verify();
    return transporter;
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error;
  }
}

function generateEmailTemplates(params: ContactEmailParams): EmailTemplate {
  const { name, email, subject, message, company, phone } = params;

  // Admin notification email
  const adminNotification = {
    subject: `New Lead: ${subject}`,
    text: `
New contact form submission received:

Name: ${name}
Email: ${email}
Company: ${company || "Not provided"}
Phone: ${phone || "Not provided"}
Subject: ${subject}

Message:
${message}

Please respond to this inquiry promptly.
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0070f3, #0051cc); padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Lead Inquiry</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="color: #0070f3; margin-top: 0;">Contact Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Name:</td>
              <td style="padding: 8px 0; color: #666;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td>
              <td style="padding: 8px 0; color: #666;"><a href="mailto:${email}" style="color: #0070f3;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Company:</td>
              <td style="padding: 8px 0; color: #666;">${
                company || "Not provided"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Phone:</td>
              <td style="padding: 8px 0; color: #666;">${
                phone || "Not provided"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Subject:</td>
              <td style="padding: 8px 0; color: #666;">${subject}</td>
            </tr>
          </table>
          
          <h3 style="color: #0070f3; margin-bottom: 10px;">Message</h3>
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #0070f3;">
            <p style="margin: 0; line-height: 1.6; color: #333;">${message.replace(
              /\n/g,
              "<br>"
            )}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #1976d2;">
              <strong>Action Required:</strong> Please respond to this inquiry promptly to maintain our high customer service standards.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  // Customer confirmation email
  const customerConfirmation = {
    subject: `Thank you for contacting Trayarunya Ventures - We've received your message`,
    text: `
Dear ${name},

Thank you for reaching out to Trayarunya Ventures. We have received your message regarding "${subject}" and appreciate you taking the time to contact us.

Our team will review your inquiry and get back to you within 24-48 hours. If your matter is urgent, please feel free to call us directly.

Here's a summary of your message:
Subject: ${subject}
Message: ${message}

Best regards,
Trayarunya Ventures Team

---
This is an automated confirmation email. Please do not reply to this email.
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0070f3, #0051cc); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0;">Thank You for Contacting Us</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333; margin-top: 0;">Dear <strong>${name}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for reaching out to <strong>Trayarunya Ventures</strong>. We have received your message regarding 
            "<em>${subject}</em>" and appreciate you taking the time to contact us.
          </p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>✓ Message Received Successfully</strong><br>
              Our team will review your inquiry and get back to you within 24-48 hours.
            </p>
          </div>
          
          <h3 style="color: #0070f3; margin-bottom: 10px;">Your Message Summary</h3>
          <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 0; color: #666;"><strong>Message:</strong></p>
            <p style="margin: 5px 0 0 0; line-height: 1.6; color: #333; font-style: italic;">"${message}"</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 5px; border-left: 4px solid #ff9800;">
            <p style="margin: 0; font-size: 14px; color: #e65100;">
              <strong>Need Immediate Assistance?</strong><br>
              If your matter is urgent, please feel free to call us directly or visit our contact page for more options.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Best regards,<br>
              <strong style="color: #0070f3;">Trayarunya Ventures Team</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              This is an automated confirmation email. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  return {
    adminNotification,
    customerConfirmation,
  };
}

export async function sendContactEmails(params: ContactEmailParams) {
  const { email, notifyEmail = "sumitsharmaa@trayarunyaventures.com" } = params;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP configuration is missing in environment variables");
  }

  try {
    const transporter = await createTransporter();
    const templates = generateEmailTemplates(params);

    const results = [];

    // Send admin notification email
    const adminMailOptions = {
      from: {
        name: "Trayarunya Ventures Contact Form",
        address: FROM_EMAIL,
      },
      to: notifyEmail, // Admin email for testing
      subject: templates.adminNotification.subject,
      text: templates.adminNotification.text,
      html: templates.adminNotification.html,
      replyTo: email, // Allow admin to reply directly to the customer
    };

    const adminResult = await transporter.sendMail(adminMailOptions);
    results.push({ type: "admin", result: adminResult });

    // Send customer confirmation email
    const customerMailOptions = {
      from: {
        name: "Trayarunya Ventures",
        address: FROM_EMAIL,
      },
      to: email, // Customer's email
      subject: templates.customerConfirmation.subject,
      text: templates.customerConfirmation.text,
      html: templates.customerConfirmation.html,
    };

    const customerResult = await transporter.sendMail(customerMailOptions);
    results.push({ type: "customer", result: customerResult });

    return {
      success: true,
      results,
      message: "Both emails sent successfully",
    };
  } catch (error) {
    console.error("Error sending contact emails:", error);
    throw error;
  }
}

// Helper function to send only admin notification (for testing)
export async function sendAdminNotification(params: ContactEmailParams) {
  const { notifyEmail = "sumitsharmaa@trayarunyaventures.com" } = params;

  try {
    const transporter = await createTransporter();
    const templates = generateEmailTemplates(params);

    const mailOptions = {
      from: {
        name: "Trayarunya Ventures Contact Form",
        address: FROM_EMAIL,
      },
      to: notifyEmail,
      subject: templates.adminNotification.subject,
      text: templates.adminNotification.text,
      html: templates.adminNotification.html,
      replyTo: params.email,
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      result,
      message: "Admin notification sent successfully",
    };
  } catch (error) {
    console.error("Error sending admin notification:", error);
    throw error;
  }
}
