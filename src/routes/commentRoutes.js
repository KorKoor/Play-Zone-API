// src/routes/commentRoutes.js

const express = require('express');
const commentController = require('../controllers/commentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================================
// RUTAS PARA COMENTARIOS INDIVIDUALES
// ==========================================================

// Obtener comentario específico por ID (para reportes, enlaces directos, etc.)
router.get('/:commentId', protect, commentController.getCommentById);

// Eliminar comentario específico (autor o admin)
router.delete('/:commentId', protect, commentController.deleteComment);

module.exports = router;