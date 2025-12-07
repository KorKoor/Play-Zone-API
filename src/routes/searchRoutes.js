// src/routes/searchRoutes.js

const express = require('express');
const searchController = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================================
// RUTAS DE BÚSQUEDA GLOBAL
// ==========================================================

// Búsqueda global con filtros
router.get('/', protect, searchController.globalSearch);

// Sugerencias de búsqueda en tiempo real
router.get('/suggestions', protect, searchController.getSearchSuggestions);

// Obtener filtros disponibles
router.get('/filters', protect, searchController.getSearchFilters);

module.exports = router;