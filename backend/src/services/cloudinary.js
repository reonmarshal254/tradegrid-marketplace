'use strict';
const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

async function uploadImages(files) {
  const results = [];
  for (const file of files) {
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: 'tradegrid/items',
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    results.push({
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
    });
    if (file.path) {
      const fs = require('fs');
      fs.unlink(file.path, () => {});
    }
  }
  return results;
}

async function uploadAvatar(file) {
  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder: 'tradegrid/avatars',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  if (file.path) {
    const fs = require('fs');
    fs.unlink(file.path, () => {});
  }
  return { publicId: uploaded.public_id, url: uploaded.secure_url };
}

async function destroyImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[cloudinary] destroy failed', err.message);
  }
}

// Generic upload function for buffer data (used by advertisements, etc.)
async function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'tradegrid',
        resource_type: options.resource_type || 'auto',
        transformation: options.transformation || [
          { quality: 'auto', fetch_format: 'auto' }
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
}

// Delete from Cloudinary by public ID
async function deleteFromCloudinary(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[cloudinary] delete failed', err.message);
  }
}

module.exports = { 
  uploadImages, 
  uploadAvatar, 
  destroyImage, 
  uploadToCloudinary, 
  deleteFromCloudinary 
};
