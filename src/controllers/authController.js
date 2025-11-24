// src/controllers/authController.js
const User = require('../models/User'); // Modelo de usuario
const jwt = require('jsonwebtoken');

// ==========================================================
// Función auxiliar para generar el Token JWT
// ==========================================================
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, alias: user.alias, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token caduca en 7 días
  );
};

// ==========================================================
// REGISTRO - POST /api/v1/auth/register
// ==========================================================
const register = async (req, res) => {
  const { name, alias, email, password } = req.body;

  try {
    // Validar si ya existe usuario con ese correo o alias
    const existingUser = await User.findOne({ $or: [{ email }, { alias }] });
    if (existingUser) {
      return res.status(409).json({ message: "El correo o el alias ya están registrados." });
    }

    // Crear nuevo usuario (el modelo debe tener middleware para hashear password)
    const newUser = await User.create({ name, alias, email, password });

    // Generar token
    const token = generateToken(newUser);

    res.status(201).json({
      message: "Registro exitoso.",
      token,
      user: {
        id: newUser._id,
        alias: newUser.alias,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor.", error: error.message });
  }
};

// ==========================================================
// LOGIN - POST /api/v1/auth/login
// ==========================================================
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario y traer el campo password explícitamente
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    // Comparar contraseña (el modelo debe tener método comparePassword)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    // Generar token
    const token = generateToken(user);

    res.status(200).json({
      message: "Login exitoso.",
      token,
      user: {
        id: user._id,
        alias: user.alias,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor.", error: error.message });
  }
};

module.exports = { register, login };
