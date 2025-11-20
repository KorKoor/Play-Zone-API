// src/routes/authRoutes.js

const express = require('express');
const authController = require('../controllers/authController'); // Necesita este controlador

const router = express.Router();

// Las rutas conectarán a las funciones en authController.js
router.post('/register', authController.register); 
router.post('/login', authController.login);   

module.exports = router;
// src/controllers/authController.js

// Placeholder para el registro (para que el módulo no falle al importarse)
exports.register = (req, res) => {
    res.status(500).json({ message: "El controlador de registro aún no está implementado." });
};

// Placeholder para el login
exports.login = (req, res) => {
    res.status(500).json({ message: "El controlador de login aún no está implementado." });
};
// Aquí pondremos la lógica real en el siguiente paso.