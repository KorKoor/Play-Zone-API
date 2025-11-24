// src/middleware/upload.js
const multer = require('multer');

// Guardar temporalmente en carpeta local
const upload = multer({ dest: 'uploads/' });

module.exports = upload;
