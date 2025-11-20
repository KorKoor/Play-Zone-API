// src/models/Guide.js

const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
    // === Relación y Autor ===
    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // === Contenido de la Guía (Requisito 3.2) ===
    title: { 
        type: String, 
        required: [true, 'El título de la guía es obligatorio.'], 
        trim: true 
    },
    game: { 
        type: String, 
        required: [true, 'El juego al que pertenece la guía es obligatorio.'], 
        trim: true 
    }, // Juego al que pertenece
    description: { 
        type: String, 
        required: [true, 'El contenido de la guía es obligatorio.'],
        minlength: [50, 'La guía debe tener al menos 50 caracteres.'] 
    }, // Contenido o pasos
    
    // === Estadísticas y Valoración (Requisito 3.7, 3.8) ===
    usefulCount: { 
        type: Number, 
        default: 0,
        min: 0
    }, // Contador para "útil" (Popularidad/Req. 3.8)
    commentsCount: { 
        type: Number, 
        default: 0,
        min: 0
    },
    
    // Lista de usuarios que marcaron la guía como "útil"
    markedUsefulBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }] 
    
}, { 
    timestamps: true 
});

// Índice para mejorar la búsqueda por título o juego (Requisito 3.4)
guideSchema.index({ title: 'text', game: 'text' });

const Guide = mongoose.model('Guide', guideSchema);
module.exports = Guide;