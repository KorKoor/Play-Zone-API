// src/routes/uploadRoutes.js

const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================================
// 1. CONFIGURACIÓN DE MULTER
// ==========================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Carpeta temporal donde se guarda el archivo
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Nombre único
    }
});

// ==========================================================
// 2. INICIALIZACIÓN DE MULTER (límite 10MB y filtro de tipo)
// ==========================================================
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Error explícito si el formato no es válido
            return cb(new Error('Formato de archivo no soportado. Solo se permiten JPEG y PNG.'));
        }
    }
});

// ==========================================================
// 3. RUTA PRINCIPAL DE SUBIDA CON MANEJO DE ERRORES
// ==========================================================
router.post(
    '/avatar', 
    protect, 
    (req, res, next) => {
        upload.single('avatar')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Error propio de Multer (ej: límite de tamaño)
                console.error("❌ ERROR MULTER:", err.code);
                return res.status(400).json({ 
                    message: "Archivo rechazado por el servidor.",
                    details: err.code === 'LIMIT_FILE_SIZE' 
                        ? 'La imagen excede el límite de 10MB.' 
                        : err.code
                });
            } else if (err) {
                // Error lanzado por fileFilter (formato no soportado)
                console.error("❌ ERROR MULTER:", err.message);
                return res.status(400).json({ message: err.message });
            }
            // Si no hay errores, continuar al controlador
            next();
        });
    },
    uploadController.uploadAvatar // Controlador que sube a Cloudinary
);

// ==========================================================
// EXPORTAR ROUTER
// ==========================================================
module.exports = router;
