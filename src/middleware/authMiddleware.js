// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    let token;
    // 1. Obtener el token del header (ej: 'Bearer TOKEN')
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // 401 Unauthorized
        return res.status(401).json({ message: "No autorizado, no hay token." });
    }

    try {
        // 2. Decodificar y verificar la validez/caducidad del token (Seguridad)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Adjuntar el payload de usuario a la petición para usarlo en el controlador
        req.user = decoded; 
        
        next(); // Continuar al controlador (ej: createPost)
    } catch (error) {
        // Token inválido o expirado
        return res.status(401).json({ message: "Token inválido o expirado." });
    }
};