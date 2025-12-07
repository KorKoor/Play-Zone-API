// src/routes/adminRoutes.js

const express = require('express');
const {
    // Dashboard
    getDashboardStats,
    getAdminLogs,
    
    // Reportes
    getReports,
    approveReport,
    rejectReport,
    deleteReport,
    
    // Usuarios
    banUser,
    unbanUser,
    deleteUser,
    updateUserRole,
    
    // Juegos
    getGames,
    createGame,
    updateGame,
    deleteGame
} = require('../controllers/adminController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

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

// Aplicar middleware de autenticación a todas las rutas
router.use(protect);

// ========== RUTAS DE DASHBOARD ==========
router.get('/dashboard/stats', verifyAdmin, getDashboardStats);
router.get('/logs', verifyAdmin, getAdminLogs);

// ========== RUTAS DE REPORTES ==========
router.get('/reports', verifyAdmin, getReports);
router.put('/reports/:id/approve', verifyAdmin, approveReport);
router.put('/reports/:id/reject', verifyAdmin, rejectReport);
router.delete('/reports/:id', verifyAdmin, deleteReport);

// ========== RUTAS DE USUARIOS ==========
// Solo administradores pueden banear/desbanear usuarios
router.put('/users/:id/ban', verifyAdminOnly, banUser);
router.put('/users/:id/unban', verifyAdminOnly, unbanUser);
router.delete('/users/:id', verifyAdminOnly, deleteUser);
router.put('/users/:id/role', verifyAdminOnly, updateUserRole);

// ========== RUTAS DE CATÁLOGO (JUEGOS) ==========
router.get('/games', verifyAdmin, getGames);
router.post('/games', verifyAdminOnly, createGame);
router.put('/games/:id', verifyAdminOnly, updateGame);
router.delete('/games/:id', verifyAdminOnly, deleteGame);

module.exports = router;