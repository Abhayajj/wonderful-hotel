const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const cloudinaryEnabled =
  process.env.CLOUD_NAME &&
  process.env.CLOUD_NAME.trim() !== "" &&
  process.env.CLOUD_API_KEY &&
  process.env.CLOUD_API_KEY.trim() !== "" &&
  process.env.CLOUD_API_SECRET &&
  process.env.CLOUD_API_SECRET.trim() !== "";

let storage;

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME.trim(),
    api_key: process.env.CLOUD_API_KEY.trim(),
    api_secret: process.env.CLOUD_API_SECRET.trim(),
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "wonderfull_listings",
      allowed_formats: ["png", "jpg", "jpeg", "webp"],
      transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto" }],
    },
  });
  console.log("☁️ Cloudinary Storage integration enabled.");
} else {
  // Fallback to local storage
  const uploadDir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  });
  console.log("📁 Local File Storage fallback enabled (no Cloudinary credentials found).");
}

module.exports = { cloudinary, storage, cloudinaryEnabled };
