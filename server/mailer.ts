import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@auto360.co.ke";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export function isMailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getAppUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return "http://localhost:5000";
}

export async function sendVerificationEmail(opts: {
  toEmail: string;
  toName: string;
  businessName: string;
  token: string;
}): Promise<void> {
  if (!isMailConfigured()) {
    console.warn("[mailer] SMTP not configured — skipping verification email");
    return;
  }
  const verifyUrl = `${getAppUrl()}/verify-email/${opts.token}`;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Auto360" <${SMTP_FROM}>`,
    to: opts.toEmail,
    subject: "Verify your email — Auto360",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">Auto360 — Email Verification</h2>
        <p>Hi <strong>${opts.toName}</strong>,</p>
        <p>Thank you for registering <strong>${opts.businessName}</strong> on Auto360. Please click the button below to verify your email address and activate your account.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${verifyUrl}" style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px">
            Verify My Email
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px">Or copy and paste this link into your browser:<br><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color:#6b7280;font-size:13px">This link expires in 48 hours. If you did not register on Auto360, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Auto360 — Kenya's Automotive Marketplace</p>
      </div>
    `,
  });
}

export async function sendAdminNotificationEmail(opts: {
  businessName: string;
  businessCategory: string;
  businessCity: string;
  ownerName: string;
  ownerEmail: string;
  adminUrl: string;
}): Promise<void> {
  if (!isMailConfigured() || !ADMIN_EMAIL) {
    console.warn("[mailer] SMTP not configured or ADMIN_EMAIL not set — skipping admin notification");
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Auto360" <${SMTP_FROM}>`,
    to: ADMIN_EMAIL,
    subject: `New Business Registration — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">Auto360 — New Business Registration</h2>
        <p>A new business has been registered and is pending your approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:140px">Business Name</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.businessName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Category</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.businessCategory}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">City</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.businessCity}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Owner Name</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.ownerName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Owner Email</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.ownerEmail}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0">
          <a href="${opts.adminUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Review in Admin Panel
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Auto360 — Kenya's Automotive Marketplace</p>
      </div>
    `,
  });
}

export async function sendApprovalEmail(opts: {
  toEmail: string;
  toName: string;
  businessName: string;
}): Promise<void> {
  if (!isMailConfigured()) return;
  const transporter = getTransporter();
  const dashboardUrl = `${getAppUrl()}/dashboard`;
  await transporter.sendMail({
    from: `"Auto360" <${SMTP_FROM}>`,
    to: opts.toEmail,
    subject: `Your business is approved — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#16a34a">Congratulations, ${opts.toName}!</h2>
        <p>Your business <strong>${opts.businessName}</strong> has been reviewed and <strong style="color:#16a34a">approved</strong> on Auto360.</p>
        <p>Your business is now live and visible to customers across Kenya.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${dashboardUrl}" style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px">
            Go to Dashboard
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Auto360 — Kenya's Automotive Marketplace</p>
      </div>
    `,
  });
}

export async function sendRejectionEmail(opts: {
  toEmail: string;
  toName: string;
  businessName: string;
}): Promise<void> {
  if (!isMailConfigured()) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Auto360" <${SMTP_FROM}>`,
    to: opts.toEmail,
    subject: `Update on your business registration — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">Auto360 — Registration Update</h2>
        <p>Hi <strong>${opts.toName}</strong>,</p>
        <p>After review, your business <strong>${opts.businessName}</strong> was not approved at this time. This may be due to incomplete information or not meeting our listing guidelines.</p>
        <p>Please <a href="mailto:${ADMIN_EMAIL || "support@auto360.co.ke'}"}">contact our support team</a> if you have questions or would like to resubmit.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Auto360 — Kenya's Automotive Marketplace</p>
      </div>
    `,
  });
}
