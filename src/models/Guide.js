// src/models/Guide.js

const mongoose = require('mongoose');

// Definición de un paso de la guía (puede ser un sub-documento o una simple lista de Strings)
const stepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    content: { 
        type: String, 
        required: [true, 'El contenido del paso es obligatorio.'],
        trim: true
    },
    // Opcional: para guías muy detalladas, podría incluir una imagen por paso
    imageUrl: { type: String, default: null } 
});

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
        trim: true,
        maxlength: [100, 'El título no puede exceder los 100 caracteres.']
    },
    game: { 
        type: String, 
        required: [true, 'El juego al que pertenece la guía es obligatorio.'], 
        trim: true 
    }, 
    description: { 
        type: String, 
        required: [true, 'La introducción de la guía es obligatoria.'],
        minlength: [30, 'La descripción debe tener al menos 30 caracteres.'],
        maxlength: [500, 'La descripción no puede exceder los 500 caracteres.']
    },
    
    // Contenido detallado (pasos para completar la misión)
    steps: {
        type: [stepSchema],
        default: [],
        validate: {
            validator: function(v) {
                // Requisito: La guía debe tener al menos 1 paso.
                return v.length > 0;
            },
            message: 'Una guía debe contener al menos un paso detallado.'
        }
    },
    
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
    }, // Contador de comentarios (Req. 3.5)
    
    // Lista de usuarios que marcaron la guía como "útil" (Req. 3.8)
    markedUsefulBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }] 
    
}, { 
    timestamps: true // Agrega createdAt y updatedAt (Req. 3.2: Fecha de publicación)
});

// Índice para mejorar la búsqueda por título o juego (Requisito 3.4)
guideSchema.index({ title: 'text', game: 'text' });

// Habilitar la inclusión de virtuales en las salidas JSON y object
guideSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        // Elimina campos no deseados
        delete ret._id;
        delete ret.__v;

        // Si hay subdocumentos en 'steps', también transformar cada uno
        if (ret.steps) {
            ret.steps.forEach(step => {
                delete step._id;
            });
        }
    }
});

const Guide = mongoose.model('Guide', guideSchema);
module.exports = Guide;