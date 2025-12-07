// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;
    // 1. Obtener el token del header (ej: 'Bearer TOKEN')
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // 401 Unauthorized
        return res.status(401).json({ 
            success: false,
            message: "No autorizado, no hay token." 
        });
    }

    try {
        // 2. Decodificar y verificar la validez/caducidad del token (Seguridad)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Obtener información completa del usuario desde la base de datos
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        // Verificar si el usuario está baneado
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Usuario baneado."
            });
        }

        // 4. Adjuntar el usuario completo a la petición
        req.user = {
            id: user._id,
            userId: user._id, // Para compatibilidad
            alias: user.alias,
            email: user.email,
            role: user.role
        };
        
        next(); // Continuar al controlador
    } catch (error) {
        console.error('Error en middleware protect:', error);
        // Token inválido o expirado
        return res.status(401).json({ 
            success: false,
            message: "Token inválido o expirado." 
        });
    }
};

// Middleware para verificar rol de administrador
exports.adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Acceso no autorizado"
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo administradores."
        });
    }

    next();
};