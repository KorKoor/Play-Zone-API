// src/routes/postRoutes.js

const express = require('express');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware'); 

const router = express.Router();
router.post('/', protect, postController.createPost); 
router.get('/feed', protect, postController.getFeedPosts); 
module.exports = router;
