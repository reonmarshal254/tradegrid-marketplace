'use strict';
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ApiError } = require('./error');

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Only image files (jpg, png, webp, gif, heic) are allowed'));
  }
  cb(null, true);
};

const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
}).array('images', 8);

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
}).single('avatar');

module.exports = { uploadImages, uploadAvatar };
