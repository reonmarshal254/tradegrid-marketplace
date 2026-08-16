'use strict';
const router = require('express').Router();
const controller = require('../controllers/itemController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', optionalAuth, asyncHandler(controller.listItems));
router.get('/search-suggestions', optionalAuth, asyncHandler(controller.getSearchSuggestions));
router.get('/nearby', optionalAuth, asyncHandler(controller.getNearbyItems));
router.get('/categories', asyncHandler(controller.listCategories));
router.get('/favorites', requireAuth, asyncHandler(controller.listFavorites));
router.get('/recently-viewed', requireAuth, asyncHandler(controller.listRecentlyViewed));
router.get('/my', requireAuth, asyncHandler(controller.myItems));
router.get('/my-stats', requireAuth, asyncHandler(controller.myStats));
router.post('/', requireAuth, uploadImages, asyncHandler(controller.createItem));

router.get('/:id', optionalAuth, asyncHandler(controller.getItem));
router.put('/:id', requireAuth, uploadImages, asyncHandler(controller.updateItem));
router.delete('/:id', requireAuth, asyncHandler(controller.deleteItem));
router.post('/:id/sold', requireAuth, asyncHandler(controller.markSold));
router.post('/:id/react', requireAuth, asyncHandler(controller.react));
router.post('/:id/view', requireAuth, asyncHandler(controller.recordView));
router.post('/:id/purchased', requireAuth, asyncHandler(controller.markPurchased));
router.post('/:id/review', requireAuth, asyncHandler(controller.addReview));

module.exports = router;
