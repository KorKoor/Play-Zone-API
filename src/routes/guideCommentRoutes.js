// src/routes/guideCommentRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getGuideComments,
    createGuideComment,
    updateComment,
    deleteComment
} = require('../controllers/guideCommentController');

/**
 * @route GET /api/v1/guides/:guideId/comments
 * @description Obtener comentarios de una guía
 * @access Público
 */
router.get('/guides/:guideId/comments', getGuideComments);

/**
 * @route POST /api/v1/guides/:guideId/comments
 * @description Crear nuevo comentario en una guía
 * @access Usuario autenticado
 */
router.post('/guides/:guideId/comments', protect, createGuideComment);

/**
 * @route PUT /api/v1/comments/:commentId
 * @description Editar comentario propio
 * @access Usuario autenticado (solo autor)
 */
router.put('/comments/:commentId', protect, updateComment);

/**
 * @route DELETE /api/v1/comments/:commentId
 * @description Eliminar comentario
 * @access Usuario autenticado (autor o admin)
 */
router.delete('/comments/:commentId', protect, deleteComment);

module.exports = router;