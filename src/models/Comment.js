// src/models/Comment.js

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    postId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post', 
        required: true 
    },
    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    content: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: 500
    },
    // Campo para saber qué usuarios han leido este comentario (para notificaciones)
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    
}, { 
    timestamps: true 
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;