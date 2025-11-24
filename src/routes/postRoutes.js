// src/routes/postRoutes.js

const express = require('express');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware'); 
const upload = require('../middleware/upload'); // 👈 este apunta al middleware con CloudinaryStorage

const router = express.Router();

// ==========================================================
// 1. CREAR PUBLICACIÓN CON IMAGEN
// ==========================================================
router.post('/', protect, upload.single('image'), postController.createPost);

// ==========================================================
// 2. FEED PRINCIPAL
// ==========================================================
router.get('/feed', protect, postController.getFeedPosts);

// ==========================================================
// 3. DAR / QUITAR LIKE
// ==========================================================
router.put('/:postId/like', protect, postController.toggleLike);

// ==========================================================
// 4. BÚSQUEDA DE PUBLICACIONES
// ==========================================================
router.get('/search', protect, postController.searchPosts);

module.exports = router;
