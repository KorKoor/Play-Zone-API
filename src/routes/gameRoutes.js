// src/routes/gameRoutes.js

const express = require('express');
const router = express.Router();
const { getAllGames, getGameById, createGame, updateGame, deleteGame } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

// Middleware para verificar que el usuario es administrador
const verifyAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de administrador o moderador.'
        });
    }
    next();
};

// Middleware específico para administradores (solo admin, no moderadores)
const verifyAdminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de administrador.'
        });
    }
    next();
};

/**
 * @route GET /api/v1/games
 * @description Obtener catálogo de juegos
 * @access Público
 */
router.get('/', getAllGames);

/**
 * @route GET /api/v1/games/:id
 * @description Obtener juego específico
 * @access Público
 */
router.get('/:id', getGameById);

/**
 * @route POST /api/v1/games
 * @description Crear juego
 * @access Admin
 */
router.post('/', protect, verifyAdminOnly, createGame);

/**
 * @route PUT /api/v1/games/:id
 * @description Actualizar juego
 * @access Admin
 */
router.put('/:id', protect, verifyAdminOnly, updateGame);

/**
 * @route DELETE /api/v1/games/:id
 * @description Eliminar juego
 * @access Admin
 */
router.delete('/:id', protect, verifyAdminOnly, deleteGame);

module.exports = router;