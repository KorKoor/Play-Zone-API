// src/models/Report.js

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    // ID del contenido reportado
    content_id: {
        type: String,
        required: [true, 'El ID del contenido es obligatorio'],
        trim: true
    },

    // Tipo de contenido reportado
    content_type: {
        type: String,
        required: [true, 'El tipo de contenido es obligatorio'],
        enum: {
            values: ['post', 'guide', 'comment', 'user'],
            message: 'El tipo de contenido debe ser: post, guide, comment o user'
        }
    },

    // Razón del reporte
    reason: {
        type: String,
        required: [true, 'La razón del reporte es obligatoria'],
        enum: {
            values: ['spam', 'harassment', 'inappropriate', 'offensive', 'misinformation', 'copyright', 'violence', 'other'],
            message: 'La razón debe ser una opción válida'
        }
    },

    // Descripción adicional (opcional)
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
    },

    // Usuario que realiza el reporte
    reporter_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El usuario que reporta es obligatorio']
    },

    // Usuario reportado (opcional, para reportes de usuarios)
    reported_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Estado del reporte
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
        default: 'pending'
    },

    // Notas del administrador
    admin_notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Las notas del admin no pueden exceder 2000 caracteres']
    },

    // Admin que revisó el reporte
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Fecha de revisión
    reviewed_at: {
        type: Date
    },

    // Acción tomada por el administrador
    action: {
        type: String,
        enum: ['content_removed', 'user_warned', 'user_banned', 'no_action']
    },

    // Información adicional del cliente
    additional_info: {
        user_agent: String,
        timestamp: Date,
        url: String,
        ip_address: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices para optimizar búsquedas
reportSchema.index({ content_id: 1, content_type: 1 });
reportSchema.index({ reporter_user_id: 1 });
reportSchema.index({ reported_user_id: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ created_at: -1 });

// Índice compuesto para verificar duplicados
reportSchema.index({ 
    content_id: 1, 
    content_type: 1, 
    reporter_user_id: 1 
}, { unique: true });

// Método para verificar si un reporte ya existe
reportSchema.statics.existsReport = async function(contentId, contentType, reporterId) {
    return await this.findOne({
        content_id: contentId,
        content_type: contentType,
        reporter_user_id: reporterId
    });
};

// Método para contar reportes por usuario en las últimas 24 horas
reportSchema.statics.countRecentReports = async function(userId) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.countDocuments({
        reporter_user_id: userId,
        created_at: { $gte: twentyFourHoursAgo }
    });
};

// Middleware para actualizar reviewed_at cuando se cambia el estado
reportSchema.pre('findOneAndUpdate', function() {
    const update = this.getUpdate();
    if (update.status && update.status !== 'pending') {
        update.reviewed_at = new Date();
    }
});

// Virtual para obtener información del reporter
reportSchema.virtual('reporter', {
    ref: 'User',
    localField: 'reporter_user_id',
    foreignField: '_id',
    justOne: true
});

// Virtual para obtener información del usuario reportado
reportSchema.virtual('reported_user', {
    ref: 'User',
    localField: 'reported_user_id',
    foreignField: '_id',
    justOne: true
});

// Asegurar que los virtuals se incluyan cuando se convierte a JSON
reportSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
    }
});
reportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Report', reportSchema);