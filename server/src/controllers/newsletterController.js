const crypto = require("crypto");
const Newsletter = require("../models/Newsletter");
const NewsletterCampaign = require("../models/NewsletterCampaign");
const NewsletterRecipient = require("../models/NewsletterRecipient");
const Product = require("../models/Product");
const Offer = require("../models/Offer");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const { createNotification } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");
const env = require("../config/env");
const { sendNewsletterEmail, isConfigured, getConfigError } = require("../services/emailService");
const { sendMockEmail } = require("../services/mockNewsletterEmailService");
const { generateToken, verifyToken } = require("../utils/unsubscribeToken");
const { money, getEffectiveStatus } = require("../services/offerService");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function buildEmail(campaign, unsubscribeUrl) {
  const content = escapeHtml(campaign.content).replace(/\n/g, "<br/>");
  const heading = escapeHtml(campaign.heading || campaign.subject);
  const preheader = escapeHtml(campaign.preheader || "");
  const button = campaign.buttonText && campaign.buttonUrl
    ? `<a href="${escapeHtml(campaign.buttonUrl)}" style="display:inline-block;padding:12px 24px;background:#245C3A;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(campaign.buttonText)}</a>`
    : "";
  const banner = campaign.bannerImage
    ? `<img src="${escapeHtml(campaign.bannerImage)}" alt="" style="width:100%;max-width:600px;display:block;border:0;" />`
    : "";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FAF8F1;font-family:Arial,Helvetica,sans-serif;color:#26352B;">
  <span style="display:none;font-size:1px;color:#FAF8F1;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F1;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#245C3A;padding:20px 24px;color:#ffffff;">
          <h1 style="margin:0;font-size:22px;">GreenMart</h1>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Fresh. Organic. Direct from Farmers.</p>
        </td></tr>
        ${banner ? `<tr><td>${banner}</td></tr>` : ""}
        <tr><td style="padding:24px;">
          <h2 style="margin:0 0 12px;color:#245C3A;font-size:20px;">${heading}</h2>
          <div style="font-size:14px;line-height:1.6;">${content}</div>
          ${button ? `<div style="margin-top:20px;">${button}</div>` : ""}
          <p style="margin-top:24px;font-size:12px;color:#6B7280;"><a href="${escapeHtml(env.clientUrl)}" style="color:#245C3A;">Visit GreenMart</a></p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#EAF2E7;font-size:11px;color:#6B7280;">
          <p style="margin:0 0 8px;">You received this email because you subscribed to GreenMart updates.</p>
          <p style="margin:0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#245C3A;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = `${campaign.heading || campaign.subject}\n\n${campaign.content}\n\n${campaign.buttonText ? campaign.buttonText + ": " + (campaign.buttonUrl || env.clientUrl) + "\n\n" : ""}Unsubscribe: ${unsubscribeUrl}`;
  return { html, text };
}

exports.preferences = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  const sub = await Newsletter.findOne({ email });
  res.json({
    email,
    subscriberType: sub?.subscriberType || "guest",
    isSubscribed: !!sub?.isActive,
    subscribedAt: sub?.subscribedAt || null,
    updatedAt: sub?.updatedAt || null,
  });
});

exports.customerSubscribe = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  let sub = await Newsletter.findOne({ email });
  if (sub) {
    if (sub.isActive) return res.json({ message: "You are already subscribed to GreenMart updates.", isSubscribed: true });
    if (sub.subscriberType !== "customer" && sub.subscriberType !== "guest") {
      return res.status(409).json({ message: "This email is already subscribed under a different account type." });
    }
    sub.isActive = true;
    sub.subscriberType = "customer";
    sub.subscribedAt = new Date();
    sub.unsubscribedAt = null;
    await sub.save();
  } else {
    sub = await Newsletter.create({ email, isActive: true, subscriberType: "customer" });
  }
  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_subscribed",
      category: "newsletter",
      title: "Newsletter Subscription",
      message: "You're subscribed to GreenMart newsletter updates!",
      resourceType: "Newsletter",
      resourceId: sub._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:customer-subscribed:${sub._id}`,
    });
  } catch (e) { /* ignore */ }
  res.json({ message: "You're subscribed to GreenMart newsletter updates!", isSubscribed: true });
});

exports.customerUnsubscribe = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  const sub = await Newsletter.findOne({ email });
  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  if (!sub.isActive) return res.json({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false });
  sub.isActive = false;
  sub.unsubscribedAt = new Date();
  await sub.save();
  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_unsubscribed",
      category: "newsletter",
      title: "Newsletter Unsubscribed",
      message: "You have successfully unsubscribed from GreenMart newsletter updates.",
      resourceType: "Newsletter",
      resourceId: sub._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:customer-unsubscribed:${sub._id}`,
    });
  } catch (e) { /* ignore */ }
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } }).catch(() => []);
  for (const admin of admins) {
    try {
      await createNotification({
        userId: admin._id,
        type: "newsletter_unsubscribed_admin",
        category: "newsletter",
        title: "Newsletter Unsubscription",
        message: `${email} (customer) has unsubscribed from GreenMart newsletter updates.`,
        resourceType: "Newsletter",
        resourceId: sub._id,
        actionUrl: "/admin/newsletter",
        eventKey: `newsletter:unsubscribed:${sub._id}`,
      });
    } catch (e) { /* ignore */ }
  }
  res.json({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false });
});

exports.list = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const { isActive, type, subscriberType, search, page: pageParam, limit: limitParam } = req.query || {};
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === "true";
  if (subscriberType && ["customer", "farmer", "guest"].includes(String(subscriberType).toLowerCase())) {
    query.subscriberType = String(subscriberType).toLowerCase();
  }
  if (search) query.email = { $regex: String(search), $options: "i" };

  let subscribers = await Newsletter.find(query).sort({ createdAt: -1 });

  if (type === "guest") {
    subscribers = subscribers.filter((s) => s.subscriberType === "guest");
  } else if (type === "registered" || type === "customer" || type === "farmer") {
    subscribers = subscribers.filter((s) => s.subscriberType !== "guest");
    if (type === "customer") subscribers = subscribers.filter((s) => s.subscriberType === "customer");
    if (type === "farmer") subscribers = subscribers.filter((s) => s.subscriberType === "farmer");
  }

  const total = subscribers.length;
  const paged = subscribers.slice((page - 1) * limit, page * limit);

  res.json({
    items: paged,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

exports.createCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const { isActive, type, subscriberType, search, page: pageParam, limit: limitParam } = req.query || {};
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === "true";
  if (subscriberType && ["customer", "farmer", "guest"].includes(String(subscriberType).toLowerCase())) {
    query.subscriberType = String(subscriberType).toLowerCase();
  }
  if (search) query.email = { $regex: String(search), $options: "i" };

  let subscribers = await Newsletter.find(query).sort({ createdAt: -1 });

  if (type === "guest") {
    subscribers = subscribers.filter((s) => s.subscriberType === "guest");
  } else if (type === "registered" || type === "customer" || type === "farmer") {
    subscribers = subscribers.filter((s) => s.subscriberType !== "guest");
    if (type === "customer") subscribers = subscribers.filter((s) => s.subscriberType === "customer");
    if (type === "farmer") subscribers = subscribers.filter((s) => s.subscriberType === "farmer");
  }

  const total = subscribers.length;
  const paged = subscribers.slice((page - 1) * limit, page * limit);

  res.json({
    items: paged,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

exports.stats = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const [total, active, unsubscribed, campaignsSent, deliveredAgg, failedAgg] = await Promise.all([
    Newsletter.countDocuments({}),
    Newsletter.countDocuments({ isActive: true }),
    Newsletter.countDocuments({ isActive: false }),
    NewsletterCampaign.countDocuments({ status: "sent" }),
    NewsletterRecipient.aggregate([{ $group: { _id: null, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }, accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } } } }]),
    NewsletterRecipient.countDocuments({ status: "failed" }),
  ]);
  res.json({
    totalSubscribers: total,
    activeSubscribers: active,
    unsubscribed,
    campaignsSent,
    totalEmailsDelivered: (deliveredAgg[0]?.delivered || 0) + (deliveredAgg[0]?.accepted || 0),
    failedEmails: failedAgg,
    mode: env.newsletterEmailMode,
  });
});

exports.subscriberUnsubscribe = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const sub = await Newsletter.findById(req.params.id);
  if (!sub) return res.status(404).json({ message: "Subscriber not found" });
  await Newsletter.findByIdAndUpdate(sub._id, { isActive: false, unsubscribedAt: new Date() });
  res.json({ message: "Subscriber unsubscribed" });
});

exports.subscriberReactivate = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const sub = await Newsletter.findById(req.params.id);
  if (!sub) return res.status(404).json({ message: "Subscriber not found" });
  await Newsletter.findByIdAndUpdate(sub._id, { isActive: true, unsubscribedAt: null, subscribedAt: new Date() });
  res.json({ message: "Subscriber reactivated" });
});

exports.campaigns = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaigns = await NewsletterCampaign.find().sort({ createdAt: -1 });
  res.json(campaigns);
});

exports.getCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json(campaign);
});

exports.createCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const { campaignName, subject, preheader, heading, content, bannerImage, buttonText, buttonUrl, campaignType, selectedProductIds, selectedOfferIds, audienceType, selectedSubscriberIds } = req.body;
  if (!campaignName || !subject) return res.status(400).json({ message: "Campaign name and subject are required" });
  if (!isValidUrl(bannerImage) || !isValidUrl(buttonUrl)) return res.status(400).json({ message: "Invalid URL" });

  const products = selectedProductIds?.length ? await Product.find({ _id: { $in: selectedProductIds }, status: "Active" }) : [];
  if (selectedProductIds?.length && products.length !== selectedProductIds.length) {
    return res.status(400).json({ message: "One or more selected products are invalid" });
  }

  const offers = selectedOfferIds?.length ? await Offer.find({ _id: { $in: selectedOfferIds }, status: "Active", isActive: { $ne: false } }).populate("product") : [];
  if (selectedOfferIds?.length && offers.length !== selectedOfferIds.length) {
    return res.status(400).json({ message: "One or more selected offers are invalid" });
  }

  let selectedSubscribers = [];
  if (audienceType === "selected" && Array.isArray(selectedSubscriberIds)) {
    selectedSubscribers = await Newsletter.find({ _id: { $in: selectedSubscriberIds }, isActive: true, subscriberType: "customer" });
    if (selectedSubscribers.length !== selectedSubscriberIds.length) {
      return res.status(400).json({ message: "One or more selected subscribers are invalid or unsubscribed" });
    }
  }

  const campaign = await NewsletterCampaign.create({
    campaignName: String(campaignName).trim(),
    campaignType: campaignType || "custom",
    subject: String(subject).trim(),
    preheader: String(preheader || "").trim(),
    heading: String(heading || "").trim(),
    content: String(content || ""),
    bannerImage: String(bannerImage || "").trim(),
    buttonText: String(buttonText || "").trim(),
    buttonUrl: String(buttonUrl || "").trim(),
    selectedProducts: products.map((p) => ({ productId: p._id, snapshot: snapshotProduct(p) })),
    selectedOffers: offers.map((o) => ({ offerId: o._id, snapshot: snapshotOffer(o) })),
    audienceType: audienceType === "selected" ? "selected" : "all",
    selectedSubscribers: selectedSubscribers.map((s) => s._id),
    createdBy: req.user._id,
  });
  res.status(201).json(campaign);
});

exports.updateCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  if (campaign.status !== "draft") return res.status(400).json({ message: "Only drafts can be edited" });
  const { campaignName, subject, preheader, heading, content, bannerImage, buttonText, buttonUrl, campaignType, selectedProductIds, selectedOfferIds, audienceType, selectedSubscriberIds } = req.body;
  if (bannerImage !== undefined && !isValidUrl(bannerImage)) return res.status(400).json({ message: "Invalid banner URL" });
  if (buttonUrl !== undefined && !isValidUrl(buttonUrl)) return res.status(400).json({ message: "Invalid button URL" });
  const updates = {};
  if (campaignName !== undefined) updates.campaignName = String(campaignName).trim();
  if (subject !== undefined) updates.subject = String(subject).trim();
  if (preheader !== undefined) updates.preheader = String(preheader).trim();
  if (heading !== undefined) updates.heading = String(heading).trim();
  if (content !== undefined) updates.content = String(content);
  if (bannerImage !== undefined) updates.bannerImage = String(bannerImage).trim();
  if (buttonText !== undefined) updates.buttonText = String(buttonText).trim();
  if (buttonUrl !== undefined) updates.buttonUrl = String(buttonUrl).trim();
  if (campaignType !== undefined) updates.campaignType = campaignType;
  if (audienceType !== undefined) updates.audienceType = audienceType === "selected" ? "selected" : "all";

  if (selectedProductIds !== undefined) {
    const products = selectedProductIds.length ? await Product.find({ _id: { $in: selectedProductIds }, status: "Active" }) : [];
    if (products.length !== selectedProductIds.length) return res.status(400).json({ message: "One or more selected products are invalid" });
    updates.selectedProducts = products.map((p) => ({ productId: p._id, snapshot: snapshotProduct(p) }));
  }
  if (selectedOfferIds !== undefined) {
    const offers = selectedOfferIds.length ? await Offer.find({ _id: { $in: selectedOfferIds }, status: "Active", isActive: { $ne: false } }).populate("product") : [];
    if (offers.length !== selectedOfferIds.length) return res.status(400).json({ message: "One or more selected offers are invalid" });
    updates.selectedOffers = offers.map((o) => ({ offerId: o._id, snapshot: snapshotOffer(o) }));
  }
  if (audienceType === "selected" && selectedSubscriberIds !== undefined) {
    const subs = selectedSubscriberIds.length ? await Newsletter.find({ _id: { $in: selectedSubscriberIds }, isActive: true, subscriberType: "customer" }) : [];
    if (subs.length !== selectedSubscriberIds.length) return res.status(400).json({ message: "One or more selected subscribers are invalid or unsubscribed" });
    updates.selectedSubscribers = subs.map((s) => s._id);
  } else if (audienceType === "all") {
    updates.selectedSubscribers = [];
  }

  const updated = await NewsletterCampaign.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(updated);
});

exports.duplicateCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  const copy = await NewsletterCampaign.create({
    campaignName: campaign.campaignName + " (Copy)",
    subject: campaign.subject,
    preheader: campaign.preheader,
    heading: campaign.heading,
    content: campaign.content,
    bannerImage: campaign.bannerImage,
    buttonText: campaign.buttonText,
    buttonUrl: campaign.buttonUrl,
    createdBy: req.user._id,
    status: "draft",
  });
  res.status(201).json(copy);
});

exports.sendTest = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  const { email } = req.body;
  if (!email || !emailRegex.test(String(email).trim().toLowerCase())) return res.status(400).json({ message: "Valid test email required" });
  const testEmail = String(email).trim().toLowerCase();
  const isMock = env.newsletterEmailMode === "mock";
  const unsubscribeUrl = `${env.clientUrl}/newsletter/unsubscribe?token=${generateToken(testEmail)}`;
  const { html, text } = buildEmail(campaign, unsubscribeUrl);
  let result;
  if (isMock) {
    result = sendMockEmail({ to: testEmail });
  } else {
    result = await sendNewsletterEmail({
      to: testEmail,
      subject: "[TEST] " + campaign.subject,
      html,
      text,
      headers: { "X-GreenMart-Test": "true" },
    });
  }
  if (!result.accepted && !isMock) return res.status(502).json({ message: result.error || "Failed to send test email", disabled: !!result.disabled });
  res.json({ message: isMock ? "Test email simulated (mock mode)" : "Test email sent", messageId: result.messageId, simulated: !!result.simulated });
});

exports.sendCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  if (campaign.status !== "draft") return res.status(400).json({ message: "Campaign already processed" });

  // Validate selected offers are still approved and eligible before processing
  if (campaign.selectedOffers && campaign.selectedOffers.length > 0) {
    const offerIds = campaign.selectedOffers.map((o) => o.offerId);
    const offers = await Offer.find({ _id: { $in: offerIds } }).populate("product");
    const offerMap = new Map(offers.map((o) => [String(o._id), o]));
    for (const snap of campaign.selectedOffers) {
      const offer = offerMap.get(String(snap.offerId));
      if (!offer) {
        return res.status(400).json({ message: `Offer referenced in campaign no longer exists.` });
      }
      const product = offer.product || {};
      const status = getEffectiveStatus(offer, product, new Date());
      if (status !== "Active") {
        return res.status(400).json({ message: `Offer "${offer.title}" is no longer eligible (status: ${status}). Please update the campaign.` });
      }
    }
  }

  const subscribers = campaign.audienceType === "selected"
    ? await Newsletter.find({ _id: { $in: campaign.selectedSubscribers }, isActive: true, subscriberType: "customer" })
    : await Newsletter.find({ isActive: true, subscriberType: "customer" });
  campaign.status = "sending";
  campaign.startedAt = new Date();
  campaign.recipientCount = subscribers.length;
  await campaign.save();

  let accepted = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const recipient = await NewsletterRecipient.create({
      campaignId: campaign._id,
      subscriberId: sub._id,
      email: sub.email,
      status: "sending",
    });
    const isMock = env.newsletterEmailMode === "mock";
    const unsubscribeUrl = `${env.clientUrl}/newsletter/unsubscribe?token=${generateToken(sub.email)}`;
    const { html, text } = buildEmail(campaign, unsubscribeUrl);
    let result;
    if (isMock) {
      result = sendMockEmail({ to: sub.email });
    } else {
      result = await sendNewsletterEmail({
        to: sub.email,
        subject: campaign.subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      });
    }
    if (result.accepted) {
      recipient.status = "accepted";
      recipient.providerMessageId = result.messageId;
      recipient.acceptedAt = new Date();
      accepted += 1;
    } else {
      recipient.status = "failed";
      recipient.errorMessage = result.error;
      recipient.failedAt = new Date();
      failed += 1;
    }
    await recipient.save();
    await Newsletter.findByIdAndUpdate(sub._id, { lastEmailSentAt: new Date() });
  }

  campaign.acceptedCount = accepted;
  campaign.failedCount = failed;
  campaign.completedAt = new Date();
  campaign.status = failed === subscribers.length && subscribers.length > 0 ? "failed" : "sent";
  await campaign.save();

  // In-app notifications for customers with accounts only
  for (const sub of subscribers) {
    try {
      const user = await User.findOne({ email: sub.email });
      if (!user || user.role !== "customer") continue;
      await createNotification({
        userId: user._id,
        type: "newsletter_campaign",
        category: "newsletter",
        title: campaign.subject || campaign.campaignName,
        message: campaign.preheader || campaign.content.slice(0, 120),
        resourceType: "NewsletterCampaign",
        resourceId: campaign._id,
        actionUrl: `/customer/newsletters/${campaign._id}`,
        eventKey: `newsletter:campaign:${campaign._id}:user:${user._id}`,
      });
    } catch (e) { /* ignore */ }
  }

  if (failed > 0) {
    const admins = await User.find({ role: "admin", status: { $ne: "blocked" } }).catch(() => []);
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "newsletter_campaign_failure",
        category: "newsletter",
        title: "Newsletter Campaign Processing Failed",
        message: `Campaign "${campaign.campaignName}" had ${failed} failed recipient(s).`,
        resourceType: "NewsletterCampaign",
        resourceId: campaign._id,
        actionUrl: "/admin/newsletter",
        eventKey: `newsletter:campaign-failure:${campaign._id}`,
      });
    }
  }

  res.json({
    message: "Campaign processed",
    recipientCount: subscribers.length,
    accepted,
    failed,
  });
});

exports.recipients = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const list = await NewsletterRecipient.find({ campaignId: req.params.id }).sort({ createdAt: -1 });
  res.json(list);
});

exports.cancelCampaign = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const campaign = await NewsletterCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  if (campaign.status !== "draft") return res.status(400).json({ message: "Only drafts can be cancelled" });
  campaign.status = "cancelled";
  await campaign.save();
  res.json(campaign);
});

exports.webhook = asyncHandler(async (req, res) => {
  // Basic handler: update recipient by provider message id if present
  const event = req.body || {};
  const messageId = event?.data?.email_id || event?.email_id;
  const type = event?.type;
  if (messageId && type) {
    const recipient = await NewsletterRecipient.findOne({ providerMessageId: messageId });
    if (recipient) {
      if (type.includes("delivered")) {
        recipient.status = "delivered";
        recipient.deliveredAt = new Date();
      } else if (type.includes("bounced")) {
        recipient.status = "bounced";
        recipient.failedAt = new Date();
      } else if (type.includes("failed")) {
        recipient.status = "failed";
        recipient.failedAt = new Date();
      }
      await recipient.save();
    }
  }
  res.json({ received: true });
});

exports.products = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const { search, category } = req.query || {};
  const query = { status: "Active" };
  if (category) query.category = category;
  if (search) query.name = { $regex: String(search), $options: "i" };
  const products = await Product.find(query)
    .populate("farmer", "name")
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(products);
});

exports.offers = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Unauthorized" });
  const { search } = req.query || {};
  const now = new Date();
  const query = { status: "Active", isActive: true };
  if (search) query.title = { $regex: String(search), $options: "i" };
  const offers = await Offer.find(query).populate("product").sort({ createdAt: -1 }).limit(100);
  const eligible = offers.filter((o) => {
    const start = o.startAt || o.startDate;
    const end = o.endAt || o.endDate;
    return (!start || start <= now) && (!end || end >= now);
  });
  res.json(eligible);
});

function snapshotProduct(p) {
  return {
    productId: p._id,
    name: p.name,
    price: p.price,
    unit: p.unit,
    image: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
    category: p.category,
    stock: p.stock,
    status: p.status,
    farmerName: p.farmer?.name || null,
  };
}

function snapshotOffer(o) {
  const product = o.product || {};
  const originalPrice = product.price || 0;
  let discountedPrice = originalPrice;
  if (o.discountType === "Percentage") {
    discountedPrice = Math.max(0, originalPrice - (originalPrice * o.discountValue) / 100);
  } else {
    discountedPrice = Math.max(0, originalPrice - o.discountValue);
  }
  return {
    offerId: o._id,
    title: o.title,
    discountType: o.discountType,
    discountValue: o.discountValue,
    minimumQuantity: o.minimumQuantity || 1,
    originalPrice,
    discountedPrice: Number(discountedPrice.toFixed(2)),
    startDate: o.startAt || o.startDate,
    endDate: o.endAt || o.endDate,
    product: snapshotProduct(product),
  };
}

exports.customerNewsletters = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const search = req.query.search || "";
  const type = req.query.type || "all";
  const read = req.query.read || "all";

  const recipientQuery = { email };
  if (read === "read") recipientQuery.readAt = { $ne: null };
  else if (read === "unread") recipientQuery.readAt = null;

  const recipients = await NewsletterRecipient.find(recipientQuery)
    .populate({
      path: "campaignId",
      match: { status: "sent" },
      select: "campaignName campaignType subject heading content bannerImage buttonText buttonUrl createdAt completedAt selectedProducts selectedOffers",
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const items = recipients
    .filter((r) => r.campaignId)
    .filter((r) => type === "all" || r.campaignId.campaignType === type)
    .map((r) => ({
      _id: r._id,
      campaignId: r.campaignId._id,
      campaignName: r.campaignId.campaignName,
      campaignType: r.campaignId.campaignType,
      subject: r.campaignId.subject,
      heading: r.campaignId.heading || r.campaignId.subject,
      content: r.campaignId.content,
      bannerImage: r.campaignId.bannerImage,
      buttonText: r.campaignId.buttonText,
      buttonUrl: r.campaignId.buttonUrl,
      createdAt: r.campaignId.createdAt,
      completedAt: r.campaignId.completedAt,
      status: r.status,
      isRead: !!r.readAt,
      selectedProducts: r.campaignId.selectedProducts || [],
      selectedOffers: r.campaignId.selectedOffers || [],
    }));

  const total = await NewsletterRecipient.countDocuments({ ...recipientQuery, email }).then((count) => count);
  const typeFilteredTotal = await NewsletterRecipient.find(recipientQuery)
    .populate({ path: "campaignId", match: { status: "sent" } })
    .then((rs) => rs.filter((r) => r.campaignId && (type === "all" || r.campaignId.campaignType === type)).length);

  res.json({
    items,
    page,
    limit,
    total: typeFilteredTotal,
    pages: Math.ceil(typeFilteredTotal / limit),
  });
});

exports.customerNewsletterDetail = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  const recipient = await NewsletterRecipient.findOne({
    campaignId: req.params.id,
    email,
  }).populate({
    path: "campaignId",
    match: { status: "sent" },
    select: "campaignName campaignType subject heading content bannerImage buttonText buttonUrl createdAt completedAt selectedProducts selectedOffers",
  });
  if (!recipient || !recipient.campaignId) {
    return res.status(404).json({ message: "Newsletter not found or you are not eligible to view it" });
  }
  if (!recipient.readAt) {
    recipient.readAt = new Date();
    await recipient.save();
  }
  res.json({
    _id: recipient._id,
    campaignId: recipient.campaignId._id,
    campaignName: recipient.campaignId.campaignName,
    campaignType: recipient.campaignId.campaignType,
    subject: recipient.campaignId.subject,
    heading: recipient.campaignId.heading || recipient.campaignId.subject,
    content: recipient.campaignId.content,
    bannerImage: recipient.campaignId.bannerImage,
    buttonText: recipient.campaignId.buttonText,
    buttonUrl: recipient.campaignId.buttonUrl,
    createdAt: recipient.campaignId.createdAt,
    completedAt: recipient.campaignId.completedAt,
    status: recipient.status,
    isRead: !!recipient.readAt,
    readAt: recipient.readAt,
    selectedProducts: recipient.campaignId.selectedProducts || [],
    selectedOffers: recipient.campaignId.selectedOffers || [],
  });
});

exports.markNewsletterRead = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  const recipient = await NewsletterRecipient.findOne({ campaignId: req.params.id, email });
  if (!recipient) return res.status(404).json({ message: "Newsletter recipient not found" });
  if (!recipient.readAt) {
    recipient.readAt = new Date();
    await recipient.save();
  }
  res.json({ message: "Marked as read", isRead: true });
});

exports.customerExclusiveOffers = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  const sub = await Newsletter.findOne({ email });
  if (!sub || !sub.isActive) {
    return res.json({ items: [], subscribed: false, message: "Not subscribed" });
  }
  const now = new Date();
  const nowMs = now.getTime();
  const offers = await Offer.find({
    status: "Active",
    isActive: { $ne: false },
    isSubscriberExclusive: true,
    endDate: { $gte: now },
  })
    .populate("farmer", "name")
    .populate({
      path: "product",
      select: "name description category price unit stock images status farmer isOrganic",
      populate: { path: "farmer", select: "name" },
    })
    .sort({ createdAt: -1 });

  const farmerIds = [...new Set(offers.map((o) => String(o.farmer?._id || o.farmer)).filter(Boolean))];
  const [eligibleFarmers, verifiedProfiles] = await Promise.all([
    User.find({ _id: { $in: farmerIds }, role: "farmer", status: "active" }).select("_id"),
    FarmerProfile.find({
      user: { $in: farmerIds },
      "certification.verifiedByAdmin": true,
      "certification.rejectedByAdmin": { $ne: true },
    }).select("user"),
  ]);
  const activeFarmerIds = new Set(eligibleFarmers.map((f) => String(f._id)));
  const verifiedFarmerIds = new Set(verifiedProfiles.map((p) => String(p.user)));

  const items = [];
  for (const offer of offers) {
    const product = offer.product;
    const farmerId = String(offer.farmer?._id || offer.farmer || "");
    if (!product || product.status !== "Active" ||
        String(product.farmer?._id || product.farmer || "") !== farmerId ||
        !activeFarmerIds.has(farmerId) ||
        !verifiedFarmerIds.has(farmerId) ||
        Number(product.stock) < Number(offer.minimumQuantity || 1)) continue;

    const effectiveStatus = getEffectiveStatus(offer, product, now);
    if (effectiveStatus !== "Active" && effectiveStatus !== "Scheduled") continue;

    const quantity = Math.max(1, Number(offer.minimumQuantity || 1));
    const originalPrice = Number(product.price);
    const perUnitDiscount = offer.discountType === "Percentage"
      ? originalPrice * Number(offer.discountValue) / 100
      : Number(offer.discountValue);
    const discount = money(Math.min(
      originalPrice * quantity,
      perUnitDiscount * quantity,
      offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount)
    ));
    if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !Number.isFinite(discount) || discount <= 0) continue;

    items.push({
      _id: offer._id,
      title: offer.title,
      description: offer.description,
      type: offer.type,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minimumQuantity: offer.minimumQuantity,
      originalPrice,
      offerPrice: money((originalPrice * quantity - discount) / quantity),
      discountAmount: money(discount / quantity),
      discountPercent: Math.round((discount / (originalPrice * quantity)) * 100),
      startDate: offer.startDate,
      endDate: offer.endDate,
      startAt: offer.startAt,
      endAt: offer.endAt,
      product: {
        _id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        stock: product.stock,
        images: product.images,
        isOrganic: product.isOrganic,
      },
      farmer: {
        _id: farmerId,
        name: product.farmer?.name || offer.farmer?.name || "GreenMart Farmer",
      },
    });
  }

  res.json({ items, subscribed: true });
});

exports.preferences = asyncHandler(async (req, res) => {
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  const sub = await Newsletter.findOne({ email });
  res.json({
    email,
    subscriberType: sub?.subscriberType || "guest",
    isSubscribed: !!sub?.isActive,
    subscribedAt: sub?.subscribedAt || null,
    updatedAt: sub?.updatedAt || null,
  });
});

exports.customerSubscribe = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  let sub = await Newsletter.findOne({ email });
  if (sub) {
    if (sub.isActive) return res.json({ message: "You are already subscribed to GreenMart updates.", isSubscribed: true });
    if (sub.subscriberType !== "customer" && sub.subscriberType !== "guest") {
      return res.status(409).json({ message: "This email is already subscribed under a different account type." });
    }
    sub.isActive = true;
    sub.subscriberType = "customer";
    sub.subscribedAt = new Date();
    sub.unsubscribedAt = null;
    await sub.save();
  } else {
    sub = await Newsletter.create({ email, isActive: true, subscriberType: "customer" });
  }
  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_subscribed",
      category: "newsletter",
      title: "Newsletter Subscription",
      message: "You're subscribed to GreenMart newsletter updates!",
      resourceType: "Newsletter",
      resourceId: sub._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:customer-subscribed:${sub._id}`,
    });
  } catch (e) { /* ignore */ }
  res.json({ message: "You're subscribed to GreenMart newsletter updates!", isSubscribed: true });
});

module.exports = exports;

exports.customerUnsubscribe = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") return res.status(403).json({ message: "Unauthorized" });
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });
  const sub = await Newsletter.findOne({ email });
  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  if (!sub.isActive) return res.json({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false });
  sub.isActive = false;
  sub.unsubscribedAt = new Date();
  await sub.save();
  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_unsubscribed",
      category: "newsletter",
      title: "Newsletter Unsubscribed",
      message: "You have successfully unsubscribed from GreenMart newsletter updates.",
      resourceType: "Newsletter",
      resourceId: sub._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:customer-unsubscribed:${sub._id}`,
    });
  } catch (e) { /* ignore */ }
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } }).catch(() => []);
  for (const admin of admins) {
    try {
      await createNotification({
        userId: admin._id,
        type: "newsletter_unsubscribed_admin",
        category: "newsletter",
        title: "Newsletter Unsubscription",
        message: `${email} (customer) has unsubscribed from GreenMart newsletter updates.`,
        resourceType: "Newsletter",
        resourceId: sub._id,
        actionUrl: "/admin/newsletter",
        eventKey: `newsletter:unsubscribed:${sub._id}`,
      });
    } catch (e) { /* ignore */ }
  }
  res.json({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false });
});

module.exports = exports;
