const express = require('express');
const multer = require('multer');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const advertisementController = require('../controllers/advertisementController');

const router = express.Router();

// Multer configuration for advertisements (images and videos)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/quicktime', 'video/avi', 'video/mov'];
  
  if (allowedImages.includes(file.mimetype) || allowedVideos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpg, png, webp, gif) and video (mp4, mov, avi) files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB for videos
    files: 2 // banner and video
  },
});

// Create advertisement (authenticated, with file upload)
router.post('/', 
  requireAuth,
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  advertisementController.create
);

// Get user's advertisements
router.get('/my-ads', requireAuth, advertisementController.getUserAds);

// Get active advertisements for display
router.get('/active', optionalAuth, advertisementController.getActiveAds);

// Get approved advertisements (for homepage feed)
router.get('/approved', optionalAuth, advertisementController.getApprovedAds);

// Get a featured video ad for the full-screen popup (once per day)
router.get('/featured-video', optionalAuth, advertisementController.getFeaturedVideoAd);

// Record advertisement view
router.post('/:id/view', optionalAuth, advertisementController.recordView);

// Record advertisement click
router.post('/:id/click', optionalAuth, advertisementController.recordClick);

// Get advertisement analytics
router.get('/:id/analytics', requireAuth, advertisementController.getAnalytics);

module.exports = router;