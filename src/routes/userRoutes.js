// src/routes/userRoutes.js

const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Middleware de protección JWT

const router = express.Router();

// Prefijo de estas rutas: /api/v1/users (definido en src/app.js)

// ==========================================================
// 1. RUTAS ESPECÍFICAS (DEBEN IR PRIMERO)
// ==========================================================

// Jugadores Activos (Requisito 4.4)
// Ruta: GET /api/v1/users/active
router.get(
    '/active', 
    protect, 
    userController.getActiveUsers
); 

// OBTENER TODOS LOS USUARIOS (Admin)
// Ruta: GET /api/v1/users/
router.get(
    '/',
    protect,
    userController.getAllUsers
);

// Cambiar Contraseña (Requisito 1.10)
// Ruta: PUT /api/v1/users/password
router.put(
    '/password', 
    protect, 
    userController.changePassword
);

// [FUTURA] Búsqueda de Jugadores (Requisito 1.6)
// router.get('/search', protect, userController.searchUsers); 

// ==========================================================
// 2. RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ==========================================================

// Obtener datos de Perfil (Requisito 1.8)
// Ruta: GET /api/v1/users/:userId
router.get(
    '/:userId', 
    protect, 
    userController.getUserProfile
); 

// Editar Perfil (Requisito 1.3)
// Ruta: PUT /api/v1/users/:userId
router.put(
    '/:userId', 
    protect, 
    userController.updateProfile
); 

// Seguir/Dejar de seguir (Requisito 1.7)
// Ruta: POST /api/v1/users/:targetId/follow
router.post(
    '/:targetId/follow', 
    protect, 
    userController.toggleFollow
);

// FAVORITOS (múltiples rutas para compatibilidad)
// Ruta: GET /api/v1/users/favorites
router.get(
    '/favorites',
    protect,
    userController.getUserFavorites
);

// Ruta alternativa: PUT /api/v1/users/favorites/:postId
router.put(
    '/favorites/:postId',
    protect,
    async (req, res) => {
        // Redirigir a la función de toggle favorite en postController
        req.params.postId = req.params.postId;
        const postController = require('../controllers/postController');
        return postController.toggleFavorite(req, res);
    }
);

// ==========================================================
// EXPORTAR ROUTER
// ==========================================================
module.exports = router;
