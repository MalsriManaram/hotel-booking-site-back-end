import { Request, Response, NextFunction } from "express";
import Contact from "../infrastructure/schemas/Contact";
import nodemailer from "nodemailer";
import { ContactDTO } from "../domain/dtos/contact";
import NotFoundError from "../domain/errors/not-found-error";

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
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

                <p style="margin:0 0 8px;"><strong>Name:</strong> ${safeName}</p>
                <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
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

export function getMailTransporter() {
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

  return null;
}

export const createContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parseResult = ContactDTO.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      res.status(400).json({ error: "Invalid input", details: errors });
      return;
    }
    const { name, email, message } = parseResult.data;

    const newContact = new Contact({
      name,
      email,
      message,
      status: "unread",
      createdAt: new Date(),
    });
    await newContact.save();

    let emailSent = false;
    const transporter = getMailTransporter();
    if (transporter) {
      try {
        const html = buildHtmlEmail({ name, email, message });
        const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USER;
        await transporter.sendMail({
          from: `"StayLux Contact" <${fromAddr}>`,
          to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
          subject: `New message from ${name} — StayLux contact form`,
          replyTo: email,
          text: message,
          html,
        });
        emailSent = true;
      } catch (mailErr: any) {
        console.warn("Contact notification email failed:", mailErr?.message ?? mailErr);
      }
    }

    res.status(201).json({
      message: emailSent
        ? "Contact message saved and notification sent"
        : "Contact message saved successfully",
      contactId: newContact._id,
    });
  } catch (err: any) {
    console.error("createContact error:", err?.message ?? err);
    next(err);
  }
};

export const getAllContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ contacts });
  } catch (error) {
    next(error);
  }
};

export const updateContactStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Contact.findByIdAndUpdate(
      id,
      { status: status === "resolved" ? "resolved" : "unread" },
      { new: true }
    );
    if (!updated) {
      throw new NotFoundError("Contact message not found");
    }
    res.status(200).json({ contact: updated });
  } catch (error) {
    next(error);
  }
};
