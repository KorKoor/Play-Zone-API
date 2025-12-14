// src/routes/adminRoutes.js

const express = require('express');
const {
    // Importamos todas las funciones del controlador de admin
    getDashboardStats, getAdminLogs, getReports, approveReport, rejectReport, deleteReport,
    banUser, unbanUser, deleteUser, updateUserRole, getGames, createGame, updateGame, deleteGame
} = require('../controllers/adminController');

// 🚨 IMPORTACIÓN CRÍTICA: Necesitas 'protect' para autenticar y 'restrictTo' para la autorización.
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. DEFINICIÓN DE ROLES CON EL MIDDLEWARE CENTRALIZADO
// Permite acceso a administradores y moderadores
const adminAndModerator = restrictTo(['admin', 'moderator']);
// Permite acceso solo a administradores
const adminOnly = restrictTo(['admin']);

// 2. APLICAR MIDDLEWARE DE AUTENTICACIÓN A TODAS LAS RUTAS DE ADMIN
// Esto asegura que solo los usuarios logueados pueden acceder a cualquiera de estas rutas.
router.use(protect);

// =========================================================
// ========== RUTAS DE DASHBOARD Y LOGS (Admin/Mod) ==========
// =========================================================
router.get('/dashboard/stats', adminAndModerator, getDashboardStats);
router.get('/logs', adminAndModerator, getAdminLogs);

// =========================================================
// ========== RUTAS DE REPORTES (Admin/Mod) ==========
// =========================================================
// Moderadores pueden ver y aprobar/rechazar
router.get('/reports', adminAndModerator, getReports);
router.put('/reports/:id/approve', adminAndModerator, approveReport);
router.put('/reports/:id/reject', adminAndModerator, rejectReport);

// Solo el administrador debe poder eliminar el registro del reporte
router.delete('/reports/:id', adminOnly, deleteReport); 

// =========================================================
// ========== RUTAS DE USUARIOS (Solo Admin) ==========
// =========================================================
// Estas acciones son críticas y se limitan solo a Administradores.
router.put('/users/:id/ban', adminOnly, banUser);
router.put('/users/:id/unban', adminOnly, unbanUser);
router.delete('/users/:id', adminOnly, deleteUser);
router.put('/users/:id/role', adminOnly, updateUserRole);

// =========================================================
// ========== RUTAS DE CATÁLOGO (JUEGOS) ==========
// =========================================================
// Moderadores pueden ver el catálogo
router.get('/games', adminAndModerator, getGames);
// Solo el administrador debe poder crear, modificar o eliminar juegos
router.post('/games', adminOnly, createGame);
router.put('/games/:id', adminOnly, updateGame);
router.delete('/games/:id', adminOnly, deleteGame);

module.exports = router;