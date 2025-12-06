// src/models/Report.js

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportedItem: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'reportedItemType'
    },
    reportedItemType: {
        type: String,
        required: true,
        enum: ['Post', 'Guide', 'Comment', 'User']
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'spam',
            'inappropriate_content',
            'harassment',
            'false_information',
            'copyright_violation',
            'other'
        ]
    },
    description: {
        type: String,
        maxlength: [500, 'La descripción no puede exceder los 500 caracteres.'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewNotes: {
        type: String,
        maxlength: [500, 'Las notas de revisión no pueden exceder los 500 caracteres.'],
        trim: true
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ reportedItem: 1, reportedItemType: 1 });

module.exports = mongoose.model('Report', reportSchema);