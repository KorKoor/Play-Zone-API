// src/routes/reportRoutes.js

const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================================
// RUTAS PÚBLICAS (Requieren autenticación)
// ==========================================================

// Verificar si el usuario ya reportó el contenido
router.get('/check-duplicate', protect, reportController.checkDuplicate);

// Crear un nuevo reporte
router.post('/', protect, reportController.createReport);

// Obtener los reportes propios del usuario autenticado
router.get('/my-reports', protect, reportController.getMyReports);

// ==========================================================
// RUTAS PARA ADMINISTRADORES
// ==========================================================

// Obtener todos los reportes con filtros avanzados (solo admins)
router.get('/', protect, adminOnly, reportController.getAllReportsAdmin);

// Obtener todos los reportes con filtros avanzados (solo admins) - ruta alternativa
router.get('/admin/all', protect, adminOnly, reportController.getAllReportsAdmin);

// Actualizar estado de un reporte (solo admins)
router.put('/:reportId/status', protect, adminOnly, reportController.updateReportStatusAdmin);
router.patch('/admin/:reportId/status', protect, adminOnly, reportController.updateReportStatusAdmin);

// Eliminar un reporte (solo admins)
router.delete('/admin/:reportId', protect, adminOnly, reportController.deleteReportAdmin);

module.exports = router;