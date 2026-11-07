const fs = require("fs");
const imagekit = require("../config/imagekit");
const crypto = require("crypto");

function isConfigured() {
  return Boolean(imagekit);
}

async function uploadNewsletterBanner(filePath, originalName) {
  if (process.env.NODE_ENV === "test") {
    return { url: "https://ik.imagekit.io/test/greenmart/newsletters/banners/test.png", fileId: "test-file-id" };
  }
  if (!isConfigured()) {
    const error = new Error("ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.");
    error.status = 503;
    throw error;
  }
  const ext = (originalName || "").split(".").pop() || "png";
  const fileName = `banner-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const fileBuffer = fs.readFileSync(filePath);
  const result = await imagekit.upload({
    file: fileBuffer,
    fileName,
    folder: "/greenmart/newsletters/banners/",
  });
  try { fs.unlinkSync(filePath); } catch (e) {}
  return { url: result.url, fileId: result.fileId };
}

async function deleteImage(fileId) {
  if (process.env.NODE_ENV === "test") return { result: "ok" };
  if (!isConfigured() || !fileId) return { result: "skipped" };
  try {
    await imagekit.deleteFile(fileId);
    return { result: "ok" };
  } catch (e) {
    return { result: "error", message: e.message };
  }
}

module.exports = { uploadNewsletterBanner, deleteImage, isConfigured };