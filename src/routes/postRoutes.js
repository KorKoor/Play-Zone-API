// src/routes/postRoutes.js (CÓDIGO COMPLETO PARA EL FEED Y LAS INTERACCIONES)

const express = require('express');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController'); 
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // Asumimos que este middleware está definido

const router = express.Router();

// 1. CREAR PUBLICACIÓN (Incluye subida de archivo si el frontend envia 'image')
router.post('/', protect, upload.single('image'), postController.createPost); 

// 2. FEED PRINCIPAL (GET /posts/feed)
router.get('/feed', protect, postController.getFeedPosts); // <-- RUTA ESENCIAL RESUELTA

// 3. BÚSQUEDA DE PUBLICACIONES
router.get('/search', protect, postController.searchPosts);

// 4. DAR / QUITAR LIKE (Requisito 2.4)
router.put('/:postId/like', protect, postController.toggleLike);
router.get('/:postId/likes', protect, postController.getLikesList);

// 5. FAVORITOS (múltiples endpoints para compatibilidad)
router.put('/:postId/favorite', protect, postController.toggleFavorite);
router.put('/:postId/bookmark', protect, postController.toggleFavorite); // Alias para compatibilidad
router.put('/:postId/toggle-favorite', protect, postController.toggleFavorite); // Alias para compatibilidad
router.get('/:postId/favorite-status', protect, postController.getFavoriteStatus);

// 6. COMENTARIOS (Requisito 2.5, 2.6)
router.post('/:postId/comments', protect, commentController.addComment); 
router.get('/:postId/comments', protect, commentController.getComments); 

module.exports = router;