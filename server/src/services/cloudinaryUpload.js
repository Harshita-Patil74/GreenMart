const fs = require('fs');
const cloudinary = require('../config/cloudinary');
async function uploadFile(filePath, folder) {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  try { fs.unlinkSync(filePath); } catch (e) {}
  return result.secure_url;
}
module.exports = { uploadFile };