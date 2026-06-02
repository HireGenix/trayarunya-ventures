// utils/sendContactEmail.ts
import nodemailer from "nodemailer";

// Load SMTP credentials from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@trayarunyaventures.com";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://trayarunyaventures.com"
).replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/Trayarunya-ventures-logo-Transparent.png`;
const LINKEDIN_URL = "https://www.linkedin.com/company/trayarunya-ventures";

// Brand palette
const BRAND = {
  amber: "#ffaf06",
  orange: "#ff7a06",
  green: "#14bb87",
  ink: "#0f1320",
  slate: "#475569",
  muted: "#94a3b8",
  line: "#e9eef6",
  bg: "#f4f7fc",
};

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  company?: string;
  phone?: string;
  notifyEmail?: string; // Email to receive notifications (admin email)
  country?: string;
  source?: string;
  // AI-personalised content (from GPT-5.5) — optional
  aiCustomerHtml?: string; // inner HTML body for the customer email
  aiEmailSubject?: string; // personalised subject line for the customer email
  aiTeamSummary?: string; // briefing for the sales team (admin email)
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

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap inner content in the branded, responsive Trayarunya email shell. */
function brandedShell(preheader: string, innerHtml: string): string {
  const year = new Date().getFullYear();
  return `
  <div style="margin:0;padding:0;background:${BRAND.bg};">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(
      preheader
    )}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
      BRAND.bg
    };padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(15,19,32,0.10);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,${BRAND.amber},${
    BRAND.orange
  });padding:26px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <img src="${LOGO_URL}" alt="Trayarunya Ventures" height="40" style="height:40px;display:block;border:0;outline:none;" />
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#1a1206;text-transform:uppercase;">Growth Partners</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:34px 32px 12px 32px;color:${
                BRAND.ink
              };font-size:15px;line-height:1.65;">
                ${innerHtml}
              </td>
            </tr>
            <!-- Divider -->
            <tr><td style="padding:8px 32px;"><div style="height:1px;background:${
              BRAND.line
            };"></div></td></tr>
            <!-- Footer -->
            <tr>
              <td style="padding:14px 32px 30px 32px;">
                <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:${
                  BRAND.ink
                };">Trayarunya Ventures</p>
                <p style="margin:0 0 12px 0;font-size:12.5px;color:${
                  BRAND.slate
                };line-height:1.6;">
                  Your B2B Growth Partner — LinkedIn-led high-ticket pipeline.<br/>
                  <a href="mailto:info@trayarunyaventures.com" style="color:${
                    BRAND.orange
                  };text-decoration:none;">info@trayarunyaventures.com</a>
                  &nbsp;·&nbsp;
                  <a href="${SITE_URL}" style="color:${
    BRAND.orange
  };text-decoration:none;">trayarunyaventures.com</a>
                  &nbsp;·&nbsp;
                  <a href="${LINKEDIN_URL}" style="color:${
    BRAND.orange
  };text-decoration:none;">LinkedIn</a>
                </p>
                <p style="margin:0;font-size:11px;color:${
                  BRAND.muted
                };">© ${year} Trayarunya Ventures. USA &amp; India.</p>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;margin:16px auto 0;font-size:11px;color:${
            BRAND.muted
          };text-align:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            You're receiving this because you connected with us at trayarunyaventures.com.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

function infoRow(label: string, value: string, link?: string): string {
  const val = link
    ? `<a href="${link}" style="color:${BRAND.orange};text-decoration:none;">${esc(
        value
      )}</a>`
    : esc(value);
  return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${BRAND.line};font-size:13px;font-weight:700;color:${BRAND.ink};width:120px;vertical-align:top;">${esc(
    label
  )}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${BRAND.line};font-size:13px;color:${BRAND.slate};">${val}</td>
    </tr>`;
}

function generateEmailTemplates(params: ContactEmailParams): EmailTemplate {
  const {
    name,
    email,
    subject,
    message,
    company,
    phone,
    country,
    source,
    aiCustomerHtml,
    aiEmailSubject,
    aiTeamSummary,
  } = params;

  const firstName = (name || "there").split(/\s+/)[0];

  // ---------- Admin notification (branded) ----------
  const adminInner = `
    <div style="display:inline-block;padding:5px 12px;border-radius:99px;background:rgba(20,187,135,0.12);color:#0f7a57;font-size:11px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:14px;">
      ${esc(source === "ai-chat" ? "New AI-Chat Lead" : "New Website Lead")}
    </div>
    <h1 style="margin:0 0 6px 0;font-size:22px;color:${BRAND.ink};font-weight:800;">${esc(
    name
  )} just reached out</h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:${BRAND.slate};">${esc(
    subject
  )}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      ${infoRow("Name", name)}
      ${infoRow("Email", email, `mailto:${email}`)}
      ${infoRow("Company", company || "—")}
      ${infoRow("Phone", phone || "—")}
      ${country ? infoRow("Country", country) : ""}
      ${infoRow("Source", source || "Website")}
    </table>

    ${
      aiTeamSummary
        ? `<div style="background:${BRAND.bg};border-radius:12px;padding:16px 18px;border-left:4px solid ${BRAND.amber};margin-bottom:16px;">
             <p style="margin:0 0 6px 0;font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.orange};">AI Sales Briefing</p>
             <p style="margin:0;font-size:13.5px;line-height:1.6;color:${BRAND.ink};">${esc(
            aiTeamSummary
          ).replace(/\n/g, "<br/>")}</p>
           </div>`
        : ""
    }

    <p style="margin:0 0 8px 0;font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.slate};">Message / Notes</p>
    <div style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:12px;padding:15px 16px;">
      <p style="margin:0;font-size:14px;line-height:1.65;color:${BRAND.ink};">${esc(
    message
  ).replace(/\n/g, "<br/>")}</p>
    </div>

    <div style="margin-top:20px;">
      <a href="mailto:${email}" style="display:inline-block;background:linear-gradient(135deg,${BRAND.amber},${BRAND.orange});color:#1a1206;font-weight:800;font-size:14px;text-decoration:none;padding:12px 26px;border-radius:99px;">Reply to ${esc(
    firstName
  )} →</a>
    </div>`;

  const adminNotification = {
    subject: `${source === "ai-chat" ? "🔥 AI-Chat Lead" : "New Lead"}: ${name}${
      company ? ` — ${company}` : ""
    }`,
    text: `New lead received:

Name: ${name}
Email: ${email}
Company: ${company || "Not provided"}
Phone: ${phone || "Not provided"}
Country: ${country || "Not provided"}
Source: ${source || "Website"}
Subject: ${subject}
${aiTeamSummary ? `\nAI Sales Briefing:\n${aiTeamSummary}\n` : ""}
Message:
${message}

Respond promptly.`.trim(),
    html: brandedShell(`New lead: ${name}${company ? ` from ${company}` : ""}`, adminInner),
  };

  // ---------- Customer confirmation (branded + personalised) ----------
  const defaultCustomerBody = `
    <p style="margin:0 0 14px 0;">Hi ${esc(firstName)},</p>
    <p style="margin:0 0 14px 0;">Thank you for reaching out to <strong>Trayarunya Ventures</strong>. We've received your note${
      subject ? ` about <em>${esc(subject)}</em>` : ""
    } and a senior growth strategist is already reviewing it.</p>
    <p style="margin:0 0 14px 0;">We don't treat you as just another client — we work as your growth partner, owning your pipeline goals as if the company were ours. Expect a personal reply within <strong>24 hours</strong> with concrete next steps.</p>
    <p style="margin:0 0 14px 0;">— The Trayarunya Ventures Growth Team</p>`;

  const customerInner = `
    <h1 style="margin:0 0 4px 0;font-size:23px;color:${BRAND.ink};font-weight:800;">Welcome aboard, ${esc(
    firstName
  )} 👋</h1>
    <p style="margin:0 0 20px 0;font-size:13px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:${BRAND.orange};">Your B2B growth partner</p>
    ${aiCustomerHtml || defaultCustomerBody}
    <div style="margin-top:22px;">
      <a href="${SITE_URL}/contact" style="display:inline-block;background:linear-gradient(135deg,${BRAND.amber},${BRAND.orange});color:#1a1206;font-weight:800;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:99px;">Book your strategy call →</a>
    </div>`;

  const customerConfirmation = {
    subject:
      aiEmailSubject ||
      `Welcome to Trayarunya Ventures, ${firstName} — let's grow your pipeline`,
    text: `Hi ${firstName},

Thank you for connecting with Trayarunya Ventures. A senior growth strategist is reviewing your message and will reach out within 24 hours with concrete next steps.

We work as your growth partner — owning your pipeline goals as if the company were ours.

Book a strategy call: ${SITE_URL}/contact

— The Trayarunya Ventures Growth Team
trayarunyaventures.com`.trim(),
    html: brandedShell(
      `Welcome to Trayarunya Ventures, ${firstName}`,
      customerInner
    ),
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
