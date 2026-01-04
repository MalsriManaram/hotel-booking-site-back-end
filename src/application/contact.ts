import { Request, Response, NextFunction } from "express";
import Contact from "../infrastructure/schemas/Contact";
import nodemailer from "nodemailer";
import { ContactDTO } from "../domain/dtos/contact";

function buildHtmlEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  // Simple responsive HTML with inline styles
  const safeMessage = message.replace(/\n/g, "<br>");
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>New Contact Form Submission</title>
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; background:#f6f8fa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.06); overflow:hidden;">
            <tr>
              <td style="padding:20px 28px;">
                <h1 style="margin:0 0 8px; font-size:20px;">New contact form message</h1>
                <p style="margin:0 0 16px; color:#6b7280;">Received from your website</p>

                <p style="margin:0 0 8px;"><strong>Name:</strong> ${name}</p>
                <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <hr style="margin:16px 0; border:none; border-top:1px solid #eef2f7;" />
                <h3 style="margin:0 0 8px; font-size:16px;">Message</h3>
                <div style="margin-bottom:20px; line-height:1.5; color:#111827;">${safeMessage}</div>

                <hr style="margin:12px 0; border:none; border-top:1px solid #eef2f7;" />
                <small style="color:#9ca3af; display:block;">Sent from StayLux hotel booking website</small>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb; padding:12px 28px; text-align:center; color:#9ca3af; font-size:12px;">
                © ${new Date().getFullYear()} StayLux
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/* ---------- Helper ---------- */
function getTransporter() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
    });
  }

  // Gmail fallback
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true,
    });
  }

  throw new Error("No mail configuration found.");
}

/* ---------- Controller ---------- */
export const createContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Validate payload
    const parseResult = ContactDTO.safeParse(req.body);
    if (!parseResult.success) {
      // zod format -> readable
      const errors = parseResult.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return res.status(400).json({ error: "Invalid input", details: errors });
    }
    const { name, email, message } = parseResult.data;

    // Save to DB
    const newContact = new Contact({
      name: name,
      email: email,
      message: message,
      createdAt: new Date(),
    });
    await newContact.save();

    // 4) Build email
    const html = buildHtmlEmail({ name: name, email: email, message: message });
    // Fallback text (strip tags)
    const text = message
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?[^>]+(>|$)/g, "");

    // Send email
    const transporter = getTransporter();

    const mailOptions = {
      from: `"StayLux Contact" <${process.env.EMAIL_FROM}>`,
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
      subject: `New message from ${name} — StayLux contact form`,
      replyTo: email,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);

    // Respond to front-end
    return res.status(201).json({
      message: "Contact message saved and notification sent",
      contactId: newContact._id,
    });
  } catch (err: any) {
    // handle known nodemailer errors gracefully
    console.error("createContact error:", err?.message ?? err);
    // Do not leak internal details in production
    return next(err);
  }
};
