const fs = require('fs');
const cloudinary = require('../config/cloudinary');
async function uploadFile(filePath, folder, options = {}) {
  const deleteLocal = options.deleteLocal !== false;
  if (process.env.NODE_ENV === "test") return "https://res.cloudinary.com/test/image/upload/v1/" + Date.now() + "-" + Math.random() + ".png";
  const result = await cloudinary.uploader.upload(filePath, { folder });
  if (deleteLocal) { try { fs.unlinkSync(filePath); } catch (e) {} }
  return result.secure_url;
}
async function uploadFileWithPublicId(filePath, folder, options = {}) {
  const deleteLocal = options.deleteLocal !== false;
  if (process.env.NODE_ENV === "test") return { secure_url: "https://res.cloudinary.com/test/image/upload/v1/" + Date.now() + "-" + Math.random() + ".png", public_id: "test/" + Date.now() };
  const result = await cloudinary.uploader.upload(filePath, { folder });
  if (deleteLocal) { try { fs.unlinkSync(filePath); } catch (e) {} }
  return { secure_url: result.secure_url, public_id: result.public_id };
}
async function deleteFile(publicId, options = {}) {
  const deleteLocal = options.deleteLocal !== false;
  if (process.env.NODE_ENV === "test") return { result: "ok" };
  if (!publicId) return { result: "not_found" };
  return await cloudinary.uploader.destroy(publicId);
}
module.exports = { uploadFile, uploadFileWithPublicId, deleteFile };
