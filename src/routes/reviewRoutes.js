const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getGameReviews,
    createReview,
    updateReview,
    deleteReview
} = require('../controllers/reviewController');

const router = express.Router();

// Rutas para reseñas de un juego específico
router.route('/:gameId/reviews')
    .get(getGameReviews) // Público
    .post(protect, createReview); // Requiere autenticación para crear reseña

// Rutas para acciones sobre una reseña específica
router.route('/:reviewId')
    .put(protect, updateReview) // Requiere autenticación y ser propietario
    .delete(protect, deleteReview); // Requiere autenticación y ser propietario

module.exports = router;