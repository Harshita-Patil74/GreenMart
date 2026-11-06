const { sendMail } = require("../config/mailer");
const env = require("../config/env");
const layout = (title, body) => `<!DOCTYPE html><html><body style="font-family:Inter,Arial;background:#F5F8F6;padding:24px"><div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #E5E7EB"><h2 style="color:#0F3D2E">${title}</h2>${body}<p style="color:#6B7280;font-size:12px;margin-top:24px">GreenMart – Fresh. Organic. Direct from Farmers.</p></div></body></html>`;
const templates = {
  welcome: (u) => ({ subject: "Welcome to GreenMart", html: layout("Welcome!", `<p>Hi ${u?.name || ""}, your account is ready.</p>`) }),
  orderConfirmation: (o) => ({ subject: `Order ${o?.orderNumber} confirmed`, html: layout("Order Confirmed", `<p>Your order ${o?.orderNumber} total ₹ ${o?.total}.</p>`) }),
  newOrderFarmer: (o, items) => ({ subject: `New order ${o?.orderNumber}`, html: layout("New Order", `<p>Items: ${(items || []).map(i => i.name + " x" + i.quantity).join(", ")}</p>`) }),
  statusUpdate: (o) => ({ subject: `Order ${o?.orderNumber} ${o?.status}`, html: layout("Status Update", `<p>Your order is now ${o?.status}.</p>`) }),
  lowStock: (p) => ({ subject: `Low stock: ${p?.name}`, html: layout("Low Stock", `<p>${p?.name} stock is low.</p>`) }),
  passwordReset: (link) => ({ subject: "Reset password", html: layout("Reset Password", `<p>Use this one-time link to reset your password. It expires in one hour.</p><p><a href="${link}">Reset password</a></p>`) }),
  farmerActivation: (link) => ({ subject: "Activate your GreenMart farmer account", html: layout("Set Up Your Farmer Account", `<p>Use this secure, one-time link to create your password:</p><p><a href="${link}">Activate account</a></p><p>This link expires in 24 hours.</p>`) }),
  newMessage: (m) => ({ subject: "New message from customer", html: layout("New Message", `<p>${m?.text || ""}</p>`) }),
  contactForm: (d) => ({ subject: "Contact form", html: layout("Contact", `<p>${d?.name || ""} ${d?.email || ""}: ${d?.message || ""}</p>`) }),
};

async function sendEmail(type, to, data) {
  if (!to) {
    const error = new Error("Email recipient is not configured.");
    error.code = "EMAIL_RECIPIENT_MISSING";
    throw error;
  }
  const t = templates[type];
  if (!t) {
    const error = new Error("Email template is not supported.");
    error.code = "EMAIL_TEMPLATE_UNSUPPORTED";
    throw error;
  }
  const extra = Array.isArray(data) ? data[1] : undefined;
  const { subject, html } = t(data, extra);
  return sendMail({ to, subject, html });
}

function isConfigured() {
  return Boolean(env.emailEnabled && env.resendApiKey && env.newsletterFromEmail);
}

function getConfigError() {
  if (!env.emailEnabled) return "Email sending is disabled (EMAIL_ENABLED=false)";
  if (!env.resendApiKey) return "RESEND_API_KEY is not configured";
  if (!env.newsletterFromEmail) return "NEWSLETTER_FROM_EMAIL is not configured";
  return null;
}

async function sendNewsletterEmail({ to, subject, html, text, headers }) {
  const configError = getConfigError();
  if (configError) {
    return { ok: false, accepted: false, error: configError, disabled: true };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.newsletterFromName ? `${env.newsletterFromName} <${env.newsletterFromEmail}>` : env.newsletterFromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: env.newsletterReplyTo || undefined,
        headers: headers || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, accepted: false, error: data?.message || response.statusText, providerResponse: data };
    }
    return { ok: true, accepted: true, messageId: data?.id, providerResponse: data };
  } catch (error) {
    return { ok: false, accepted: false, error: error.message };
  }
}

module.exports = { sendEmail, templates, isConfigured, getConfigError, sendNewsletterEmail };
