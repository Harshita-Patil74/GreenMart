const { sendMail } = require("../config/mailer");
const env = require("../config/env");
const layout = (title, body) => `<!DOCTYPE html><html><body style="font-family:Inter,Arial;background:#F5F8F6;padding:24px"><div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #E5E7EB"><h2 style="color:#0F3D2E">${title}</h2>${body}<p style="color:#6B7280;font-size:12px;margin-top:24px">GreenMart – Fresh. Organic. Direct from Farmers.</p></div></body></html>`;
const templates = {
  welcome: (u) => ({ subject: "Welcome to GreenMart", html: layout("Welcome!", `<p>Hi ${u.name}, your account is ready.</p>`) }),
  orderConfirmation: (o) => ({ subject: `Order ${o.orderNumber} confirmed`, html: layout("Order Confirmed", `<p>Your order ${o.orderNumber} total ₹ ${o.total}.</p>`) }),
  newOrderFarmer: (o, items) => ({ subject: `New order ${o.orderNumber}`, html: layout("New Order", `<p>Items: ${items.map(i=>i.name+" x"+i.quantity).join(", ")}</p>`) }),
  statusUpdate: (o) => ({ subject: `Order ${o.orderNumber} ${o.status}`, html: layout("Status Update", `<p>Your order is now ${o.status}.</p>`) }),
  lowStock: (p) => ({ subject: `Low stock: ${p.name}`, html: layout("Low Stock", `<p>${p.name} stock is low.</p>`) }),
  passwordReset: (link) => ({ subject: "Reset password", html: layout("Reset Password", `<p><a href="${link}">Reset</a></p>`) }),
  newMessage: (m) => ({ subject: "New message from customer", html: layout("New Message", `<p>${m.text}</p>`) }),
  contactForm: (d) => ({ subject: "Contact form", html: layout("Contact", `<p>${d.name} ${d.email}: ${d.message}</p>`) }),
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
  const { subject, html } = t(data);
  return sendMail({ to, subject, html });
}
module.exports = { sendEmail, templates };
