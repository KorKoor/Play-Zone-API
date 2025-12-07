// src/routes/favoriteRoutes.js

const express = require('express');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// PUT /api/v1/favorites/:postId
router.put('/:postId', protect, postController.toggleFavorite);

// GET /api/v1/favorites
router.get('/', protect, async (req, res) => {
    // Redirigir a la función de getUserFavorites
    const userController = require('../controllers/userController');
    return userController.getUserFavorites(req, res);
});

module.exports = router;