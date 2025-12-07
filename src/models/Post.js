// src/models/Post.js

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    gameTitle: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: false },             
    description: { type: String, required: true },          
    rating: { type: Number, required: true, min: 1, max: 5 }, 
    
    likesCount: { type: Number, default: 0 }, 
    commentsCount: { type: Number, default: 0 }, 
    
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
    
}, { timestamps: true });

postSchema.index({ gameTitle: 'text' });

// Habilitar la inclusión de virtuales en las salidas JSON y object
postSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        // Elimina campos no deseados
        delete ret._id;
        delete ret.__v;
    }
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;