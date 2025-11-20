// src/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // === 1. IDENTIDAD Y AUTENTICACIÓN ===
    name: { 
        type: String, 
        required: [true, 'El nombre es obligatorio.'],
        trim: true
    },
    alias: { 
        type: String, 
        required: [true, 'El alias es obligatorio.'], 
        unique: true, 
        trim: true,
        minlength: [3, 'El alias debe tener al menos 3 caracteres.']
    }, 
    email: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio.'], 
        unique: true, 
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Por favor, introduce un correo válido.']
    }, 
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria.'], 
        select: false, // IMPORTANTE: No devolver la contraseña en consultas por defecto
        minlength: [8, 'La contraseña debe tener al menos 8 caracteres.']
    }, 
    role: { 
        type: String, 
        enum: ['user', 'admin', 'moderator'], 
        default: 'user' 
    },

    // === 2. PERFIL Y PREFERENCIAS ===
    avatarUrl: { 
        type: String, 
        default: '/default-avatar.png',
        trim: true
    },
    description: { 
        type: String, 
        default: '', 
        maxlength: [250, 'La descripción no puede exceder los 250 caracteres.']
    },
    consoles: { 
        type: [String], 
        default: [] 
    },
    genres: { 
        type: [String], 
        default: [] 
    },

    // === 3. ESTADÍSTICAS Y CONTADORES ===
    postsCount: { 
        type: Number, 
        default: 0,
        min: 0
    },
    guidesCount: { 
        type: Number, 
        default: 0,
        min: 0
    },

    // === 4. COMUNIDAD ===
    following: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    
    // === 5. INTERACCIONES ===
    favoritePosts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post' 
    }]
    
}, { 
    timestamps: true 
});

// ==========================================================
// MÉTODOS Y HOOKS DE SEGURIDAD
// ==========================================================

// Middleware: Hashear la contraseña antes de guardar
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Método de instancia: Comparar la contraseña hasheada
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Índices para mejorar búsquedas
userSchema.index({ alias: 'text', name: 'text', email: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
