const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function makeUploader(subdir) {
  const dest = path.join(__dirname, "..", "..", "uploads", subdir);
  fs.mkdirSync(dest, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype] || ""}`),
  });
  const uploader = multer({ storage, limits: { fileSize: 5*1024*1024 }, fileFilter: (req,file,cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedExtension = IMAGE_TYPES[file.mimetype];
    const allowedJpegExtension = file.mimetype === "image/jpeg" && extension === ".jpeg";
    if (expectedExtension && (extension === expectedExtension || allowedJpegExtension)) {
      cb(null, true);
      return;
    }

    const error = new Error("Only JPEG, PNG, and WebP images are supported.");
    error.status = 400;
    cb(error);
  }});

  function wrap(multerMiddleware) {
    return (req, res, next) => multerMiddleware(req, res, async (error) => {
      if (error) return next(error);
      const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];
      try {
        for (const file of files) {
          const handle = await fs.promises.open(file.path, "r");
          let header;
          try {
            header = Buffer.alloc(12);
            const { bytesRead } = await handle.read(header, 0, header.length, 0);
            header = header.subarray(0, bytesRead);
          } finally {
            await handle.close();
          }
          const valid = file.mimetype === "image/png"
            ? header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : file.mimetype === "image/jpeg"
              ? header.length >= 3 && header[0] === 255 && header[1] === 216 && header[2] === 255
              : header.length >= 12 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
          if (!valid) {
            const invalidType = new Error("The uploaded file is not a valid JPEG, PNG, or WebP image.");
            invalidType.status = 400;
            throw invalidType;
          }
        }
        next();
      } catch (validationError) {
        await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch((cleanupError) => {
          console.error("Failed to remove rejected upload:", cleanupError.code || "FILE_ERROR");
        })));
        next(validationError);
      }
    });
  }

  return {
    single: (...args) => wrap(uploader.single(...args)),
    array: (...args) => wrap(uploader.array(...args)),
  };
}
module.exports = { makeUploader, uploadProduct: makeUploader("products"), uploadAvatar: makeUploader("avatars"), uploadFarm: makeUploader("farms") };
