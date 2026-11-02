const fs = require('fs');
const cloudinary = require('../config/cloudinary');
async function uploadFile(filePath, folder, options = {}) {
  const deleteLocal = options.deleteLocal !== false;
  if (process.env.NODE_ENV === "test") return "https://res.cloudinary.com/test/image/upload/v1/" + Date.now() + "-" + Math.random() + ".png";
  const result = await cloudinary.uploader.upload(filePath, { folder });
  if (deleteLocal) { try { fs.unlinkSync(filePath); } catch (e) {} }
  return result.secure_url;
}
module.exports = { uploadFile };
