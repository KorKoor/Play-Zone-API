// src/models/Game.js

const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título del juego es obligatorio.'],
        trim: true,
        maxlength: [100, 'El título no puede exceder los 100 caracteres.']
    },
    description: {
        type: String,
        required: [true, 'La descripción del juego es obligatoria.'],
        trim: true,
        maxlength: [1000, 'La descripción no puede exceder los 1000 caracteres.']
    },
    genre: {
        type: [String],
        required: [true, 'Al menos un género es obligatorio.'],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'Debe incluir al menos un género.'
        }
    },
    platform: {
        type: [String],
        required: [true, 'Al menos una plataforma es obligatoria.'],
        enum: [
            'PC',
            'PlayStation 5',
            'PlayStation 4', 
            'Xbox Series X/S',
            'Xbox One',
            'Nintendo Switch',
            'Mobile',
            'VR'
        ],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'Debe incluir al menos una plataforma.'
        }
    },
    developer: {
        type: String,
        required: [true, 'El desarrollador es obligatorio.'],
        trim: true,
        maxlength: [100, 'El nombre del desarrollador no puede exceder los 100 caracteres.']
    },
    publisher: {
        type: String,
        required: [true, 'El publicador es obligatorio.'],
        trim: true,
        maxlength: [100, 'El nombre del publicador no puede exceder los 100 caracteres.']
    },
    releaseDate: {
        type: Date,
        required: [true, 'La fecha de lanzamiento es obligatoria.']
    },
    rating: {
        type: String,
        enum: ['E', 'E10+', 'T', 'M', 'AO', 'RP'],
        required: [true, 'La clasificación por edad es obligatoria.']
    },
    price: {
        type: Number,
        min: [0, 'El precio no puede ser negativo.'],
        default: 0
    },
    imageUrl: {
        type: String,
        trim: true,
        default: '/default-game-cover.jpg'
    },
    trailerUrl: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Cada tag no puede exceder los 30 caracteres.']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    metacriticScore: {
        type: Number,
        min: [0, 'La puntuación no puede ser menor a 0.'],
        max: [100, 'La puntuación no puede ser mayor a 100.']
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
gameSchema.index({ title: 'text', description: 'text' });
gameSchema.index({ genre: 1 });
gameSchema.index({ platform: 1 });
gameSchema.index({ featured: -1, createdAt: -1 });
gameSchema.index({ isActive: 1 });

// Habilitar la inclusión de virtuales en las salidas JSON y object
gameSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        // Elimina campos no deseados
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Game', gameSchema);