// src/controllers/guideCommentController.js

const GuideComment = require('../models/GuideComment');
const Guide = require('../models/Guide');

/**
 * Obtener comentarios de una guía
 */
const getGuideComments = async (req, res) => {
    try {
        const { guideId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Verificar que la guía existe
        const guide = await Guide.findById(guideId);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Guía no encontrada'
            });
        }

        const comments = await GuideComment.find({ 
            guideId, 
            isDeleted: false 
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const total = await GuideComment.countDocuments({ 
            guideId, 
            isDeleted: false 
        });

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: comments,
            total,
            page,
            totalPages
        });
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener comentarios'
        });
    }
};

/**
 * Crear nuevo comentario
 */
const createGuideComment = async (req, res) => {
    try {
        const { guideId } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;

        // Verificar que la guía existe
        const guide = await Guide.findById(guideId);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Guía no encontrada'
            });
        }

        // Rate limiting: verificar comentarios del usuario en la última hora
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCommentsCount = await GuideComment.countDocuments({
            authorId,
            createdAt: { $gte: oneHourAgo },
            isDeleted: false
        });

        if (recentCommentsCount >= 10) {
            return res.status(429).json({
                success: false,
                message: 'Has excedido el límite de comentarios por hora. Intenta nuevamente más tarde.'
            });
        }

        const newComment = new GuideComment({
            guideId,
            authorId,
            content
        });

        const savedComment = await newComment.save();

        // Populate datos del autor para la respuesta
        await savedComment.populate({
            path: 'authorId',
            select: 'alias avatarUrl'
        });

        // Actualizar contador de comentarios en la guía
        await Guide.findByIdAndUpdate(guideId, {
            $inc: { commentsCount: 1 }
        });

        res.status(201).json({
            success: true,
            data: savedComment,
            message: 'Comentario creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear comentario:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear comentario'
        });
    }
};

/**
 * Editar comentario (solo autor)
 */
const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const comment = await GuideComment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        // Verificar que el usuario es el autor
        if (comment.authorId._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para editar este comentario'
            });
        }

        comment.content = content;
        const updatedComment = await comment.save();

        res.status(200).json({
            success: true,
            data: updatedComment,
            message: 'Comentario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar comentario:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar comentario'
        });
    }
};

/**
 * Eliminar comentario (autor o admin)
 */
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const comment = await GuideComment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        // Verificar permisos: autor del comentario o admin
        const isAuthor = comment.authorId._id.toString() === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar este comentario'
            });
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        // Actualizar contador de comentarios en la guía
        await Guide.findByIdAndUpdate(comment.guideId, {
            $inc: { commentsCount: -1 }
        });

        res.status(200).json({
            success: true,
            message: 'Comentario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar comentario'
        });
    }
};

module.exports = {
    getGuideComments,
    createGuideComment,
    updateComment,
    deleteComment
};