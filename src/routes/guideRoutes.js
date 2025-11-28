// src/routes/guideRoutes.js

const express = require('express');
const guideController = require('../controllers/guideController');
const { protect } = require('../middleware/authMiddleware'); // Middleware para proteger rutas

const router = express.Router();

// Prefijo Base: /api/v1/guides

// ==================================================
// RUTAS PÚBLICAS Y DE CONSULTA
// ==================================================

// GET /api/v1/guides - Obtener y buscar guías (Req. 3.3, 3.4, 3.7)
// Maneja la paginación, búsqueda (search) y ordenamiento (sortBy)
router.get('/', protect, guideController.getGuides); 

// GET /api/v1/guides/user/:userId - Obtener guías por autor (Req. 1.8)
router.get('/user/:userId', protect, guideController.getGuidesByUserId);

// GET /api/v1/guides/:guideId - Obtener una guía específica
router.get('/:guideId', protect, guideController.getGuideById);


// ==================================================
// RUTAS DE MUTACIÓN (REQUIEREN AUTENTICACIÓN)
// ==================================================

// POST /api/v1/guides - Crear nueva guía (Req. 3.1)
router.post('/', protect, guideController.createGuide); 

// POST /api/v1/guides/:guideId/useful - Togglear la marca 'Útil' (Req. 3.8)
router.post('/:guideId/useful', protect, guideController.toggleUseful);

// PUT /api/v1/guides/:guideId - Actualizar/Editar guía (Req. 3.6)
router.put('/:guideId', protect, guideController.updateGuide); 

// DELETE /api/v1/guides/:guideId - Eliminar guía (Req. 3.6)
router.delete('/:guideId', protect, guideController.deleteGuide); 


module.exports = router;