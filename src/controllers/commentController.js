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

// GET /api/v1/comments/:commentId (NUEVO - Para sistema de reportes y referencias directas)
exports.getCommentById = async (req, res) => {
    const { commentId } = req.params;

    try {
        const comment = await Comment.findById(commentId)
            .populate('authorId', 'alias avatarUrl')
            .populate('postId', 'title')
            .lean();

        if (!comment) {
            return res.status(404).json({ 
                message: "Comentario no encontrado",
                success: false 
            });
        }

        res.status(200).json({ 
            success: true,
            data: comment 
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error al obtener el comentario.", 
            error: error.message,
            success: false 
        });
    }
};

// DELETE /api/v1/comments/:commentId (NUEVO - Para moderación)
exports.deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ 
                message: "Comentario no encontrado",
                success: false 
            });
        }

        // Solo el autor del comentario o un admin puede eliminarlo
        if (comment.authorId.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({ 
                message: "No tienes permisos para eliminar este comentario",
                success: false 
            });
        }

        await Comment.findByIdAndDelete(commentId);

        // Decrementar contador de comentarios en el Post
        await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } }); 

        res.status(200).json({ 
            success: true,
            message: "Comentario eliminado exitosamente" 
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error al eliminar el comentario.", 
            error: error.message,
            success: false 
        });
    }
};