const Review = require('../models/Review');
const Game = require('../models/Game');
const mongoose = require('mongoose');

// @desc    Obtener reseñas de un juego
// @route   GET /api/v1/games/:gameId/reviews
// @access  Public
exports.getGameReviews = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({ success: false, message: 'ID de juego no válido.' });
        }

        const gameExists = await Game.findById(gameId);
        if (!gameExists) {
            return res.status(404).json({ success: false, message: 'Juego no encontrado.' });
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const reviews = await Review.find({ gameId })
            .populate('authorId', '_id alias avatarUrl') // Popula con _id, alias y avatarUrl del autor
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalReviews = await Review.countDocuments({ gameId });

        res.status(200).json({
            success: true,
            totalReviews,
            currentPage: pageNum,
            totalPages: Math.ceil(totalReviews / limitNum),
            reviews
        });

    } catch (error) {
        console.error(`Error al obtener reseñas del juego ${req.params.gameId}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// @desc    Crear una reseña para un juego
// @route   POST /api/v1/games/:gameId/reviews
// @access  Private
exports.createReview = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { rating, comment } = req.body;

        // req.user.id viene del middleware de autenticación
        const authorId = req.user.id; 

        if (!mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({ success: false, message: 'ID de juego no válido.' });
        }

        const gameExists = await Game.findById(gameId);
        if (!gameExists) {
            return res.status(404).json({ success: false, message: 'Juego no encontrado.' });
        }

        // Validar que el rating y comment estén presentes
        if (!rating || !comment) {
            return res.status(400).json({ success: false, message: 'La calificación y el comentario son requeridos.' });
        }

        // Validar el rango del rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'La calificación debe estar entre 1 y 5.' });
        }

        // Verificar si el usuario ya ha dejado una reseña para este juego
        const existingReview = await Review.findOne({ gameId, authorId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'Ya has dejado una reseña para este juego.' });
        }

        const review = await Review.create({
            gameId,
            authorId,
            rating,
            comment
        });

        res.status(201).json({ success: true, review });

    } catch (error) {
        console.error(`Error al crear reseña para el juego ${req.params.gameId}:`, error);
        // Manejar errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// @desc    Actualizar una reseña
// @route   PUT /api/v1/reviews/:reviewId
// @access  Private (Owner only)
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ success: false, message: 'ID de reseña no válido.' });
        }

        let review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Reseña no encontrada.' });
        }

        // Verificar si el usuario es el propietario de la reseña
        if (review.authorId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar esta reseña.' });
        }

        // Validar el rango del rating si se proporciona
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({ success: false, message: 'La calificación debe estar entre 1 y 5.' });
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;

        await review.save();

        res.status(200).json({ success: true, review });

    } catch (error) {
        console.error(`Error al actualizar reseña ${req.params.reviewId}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// @desc    Eliminar una reseña
// @route   DELETE /api/v1/reviews/:reviewId
// @access  Private (Owner only)
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ success: false, message: 'ID de reseña no válido.' });
        }

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Reseña no encontrada.' });
        }

        // Verificar si el usuario es el propietario de la reseña
        if (review.authorId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar esta reseña.' });
        }

        await review.deleteOne(); // Usar deleteOne() en lugar de remove() para Mongoose 6+

        res.status(200).json({ success: true, message: 'Reseña eliminada correctamente.' });

    } catch (error) {
        console.error(`Error al eliminar reseña ${req.params.reviewId}:`, error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};