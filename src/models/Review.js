const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Game'
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    rating: {
        type: Number,
        required: [true, 'La calificación es requerida.'],
        min: [1, 'La calificación debe ser al menos 1.'],
        max: [5, 'La calificación no puede ser mayor que 5.']
    },
    comment: {
        type: String,
        required: [true, 'El comentario es requerido.'],
        maxlength: [500, 'El comentario no puede exceder los 500 caracteres.']
    }
}, {
    timestamps: true
});

// Índice compuesto para asegurar que un usuario solo pueda dejar una reseña por juego
reviewSchema.index({ gameId: 1, authorId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;