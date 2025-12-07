// src/models/GuideComment.js

const mongoose = require('mongoose');

const guideCommentSchema = new mongoose.Schema({
    guideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guide',
        required: [true, 'El ID de la guía es obligatorio.']
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El autor del comentario es obligatorio.']
    },
    content: {
        type: String,
        required: [true, 'El contenido del comentario es obligatorio.'],
        trim: true,
        minlength: [1, 'El comentario debe tener al menos 1 carácter.'],
        maxlength: [500, 'El comentario no puede exceder los 500 caracteres.']
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
guideCommentSchema.index({ guideId: 1, createdAt: -1 });
guideCommentSchema.index({ authorId: 1 });
guideCommentSchema.index({ isDeleted: 1 });

// Middleware para popular datos del autor automáticamente
guideCommentSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'authorId',
        select: 'alias avatarUrl',
        options: { strictPopulate: false }
    });
    next();
});

// Virtual para compatibilidad con el frontend (author en lugar de authorId)
guideCommentSchema.virtual('author').get(function() {
    return this.authorId;
});

// Asegurar que las virtuals se incluyan en JSON
guideCommentSchema.set('toJSON', { 
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.authorId;
        return ret;
    }
});

module.exports = mongoose.model('GuideComment', guideCommentSchema);