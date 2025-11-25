// src/controllers/commentController.js (CÓDIGO COMPLETO)

const Comment = require('../models/Comment');
const Post = require('../models/Post'); 

// Helper para poblar el comentario con el autor
const populateCommentAuthor = (query) => {
    return query.populate('authorId', 'alias avatarUrl');
}

// POST /api/v1/posts/:postId/comments (Requisito 2.5: Crear comentario)
exports.addComment = async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const authorId = req.user.userId;

    try {
        const newComment = await Comment.create({
            postId,
            authorId,
            content,
        });

        // 1. Incrementar contador de comentarios en el Post (Requisito 2.6)
        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }); 

        // 2. Poblar autor para devolver el comentario completo al Frontend
        const populatedComment = await populateCommentAuthor(newComment);

        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ message: "Error al publicar el comentario.", error: error.message });
    }
};

// GET /api/v1/posts/:postId/comments (Requisito 2.6: Obtener lista de comentarios)
exports.getComments = async (req, res) => {
    const { postId } = req.params;

    try {
        const comments = await Comment.find({ postId })
            .sort({ createdAt: 1 }) // Ordenar por mas antiguo
            .populate('authorId', 'alias avatarUrl')
            .lean();

        res.status(200).json({ comments });
    } catch (error) {
        res.status(500).json({ message: "Error al cargar los comentarios.", error: error.message });
    }
};