// src/controllers/authController.js

const User = require('../models/User'); // Importamos el Modelo
const jwt = require('jsonwebtoken');

// Función auxiliar para generar el Token JWT
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, alias: user.alias, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token caduca en 7 días
    );
};

// POST /api/v1/auth/register (Requisito 1.1, 1.9)
exports.register = async (req, res) => {
    const { name, alias, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { alias }] });
        if (existingUser) {
            return res.status(409).json({ message: "El correo o el alias ya están registrados." });
        }
        
        const newUser = await User.create({ name, alias, email, password });
        const token = generateToken(newUser);

        res.status(201).json({ 
            message: "Registro exitoso.",
            token: token,
            alias: newUser.alias
        });

    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor.", error: error.message });
    }
};

// POST /api/v1/auth/login (Requisito 1.2)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password'); 

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Credenciales inválidas." });
        }

        const token = generateToken(user);

        res.status(200).json({ 
            token: token,
            alias: user.alias
        });

    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor." });
    }
};