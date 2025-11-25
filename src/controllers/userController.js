// src/controllers/userController.js (FINAL Y CORREGIDO)

const User = require('../models/User');
const Post = require('../models/Post'); 
const Guide = require('../models/Guide'); 
const bcrypt = require('bcryptjs');

// Campos de perfil que se deben retornar al frontend
const profileFields = 'alias email avatarUrl description consoles genres postsCount guidesCount following followers createdAt';

// Helper para verificar estado de seguimiento
const checkFollowingStatus = (currentUserFollowing, targetId) => {
    return currentUserFollowing.some(followedId => followedId.toString() === targetId.toString());
};

// ==========================================================
// 1. OBTENER PERFIL (Requisito 1.8)
// ==========================================================
exports.getUserProfile = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user ? req.user.userId : null;

    try {
        const user = await User.findById(userId).select(profileFields);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        
        const followersCount = user.followers.length;
        const followingCount = user.following.length;

        // Publicaciones recientes (CORRECCIÓN CLAVE: Asegurar la población del autor)
        const recentPostsQuery = Post.find({ authorId: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('authorId', 'alias avatarUrl') 
            .select('gameTitle imageUrl rating likesCount commentsCount createdAt');
        
        // Guías recientes
        const recentGuidesQuery = Guide.find({ authorId: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title game usefulCount commentsCount createdAt');
        
        // Ejecutar ambas consultas simultáneamente
        const [recentPosts, recentGuides] = await Promise.all([recentPostsQuery, recentGuidesQuery]);


        let isFollowing = false;
        if (currentUserId && currentUserId !== userId) {
            const currentUser = await User.findById(currentUserId).select('following');
            if (currentUser) {
                isFollowing = checkFollowingStatus(currentUser.following, user._id);
            }
        }
        
        // 🚀 CORRECCIÓN DE LA RESPUESTA JSON: Adjuntar arrays dentro del objeto user 🚀
        // Esto resuelve la duplicación en el frontend.
        res.status(200).json({ 
            user: { 
                ...user.toObject(), 
                followersCount, 
                followingCount, 
                isFollowing,
                recentPosts: recentPosts, 
                recentGuides: recentGuides 
            }
        });

    } catch (error) {
        console.error('Error in getUserProfile:', error);
        res.status(500).json({ message: "Error al obtener el perfil.", error: error.message });
    }
};

// ==========================================================
// 2. EDITAR PERFIL (Requisito 1.3)
// ==========================================================
exports.updateProfile = async (req, res) => {
    if (req.params.userId !== req.user.userId) {
        return res.status(403).json({ message: "No tienes permiso para editar este perfil." });
    }
    const { description, avatarUrl, consoles, genres } = req.body;
    const updateFields = { description, avatarUrl, consoles, genres };

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            updateFields,
            { new: true, runValidators: true }
        ).select(profileFields); 

        if (!updatedUser) {
             return res.status(404).json({ message: "Error: No se pudo encontrar el usuario para actualizar." });
        }
        res.status(200).json({ message: "Perfil actualizado con éxito.", user: updatedUser });

    } catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({ message: "Error al actualizar el perfil.", error: error.message });
    }
};

// ==========================================================
// 3. CAMBIAR CONTRASEÑA (Requisito 1.10)
// ==========================================================
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.userId).select('+password'); 
        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: "La contraseña actual es incorrecta." });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
        }

        user.password = newPassword; 
        await user.save();

        res.status(200).json({ message: "Contraseña cambiada con éxito." });
    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ message: "Error al cambiar la contraseña.", error: error.message });
    }
};

// ==========================================================
// 4. SEGUIR / DEJAR DE SEGUIR (Requisito 1.7)
// ==========================================================
exports.toggleFollow = async (req, res) => {
    const { targetId } = req.params;
    const currentUserId = req.user.userId;

    if (currentUserId === targetId) {
        return res.status(400).json({ message: "No puedes seguirte a ti mismo." });
    }

    try {
        const [targetUser, currentUser] = await Promise.all([
            User.findById(targetId).select('followers'),
            User.findById(currentUserId).select('following')
        ]);
        
        if (!targetUser || !currentUser) {
             return res.status(404).json({ message: "Usuario o jugador objetivo no encontrado." });
        }

        const isFollowing = currentUser.following.some(id => id.toString() === targetId);

        if (isFollowing) {
            currentUser.following.pull(targetId);
            targetUser.followers.pull(currentUserId);
        } else {
            currentUser.following.push(targetId);
            targetUser.followers.push(currentUserId);
        }

        await Promise.all([currentUser.save(), targetUser.save()]);

        res.status(200).json({ 
            message: isFollowing ? "Has dejado de seguir a este jugador." : "Ahora sigues a este jugador.", 
            status: isFollowing ? "unfollowed" : "followed" 
        });

    } catch (error) {
        console.error('Error in toggleFollow:', error);
        res.status(500).json({ message: "Error al procesar la acción de seguir.", error: error.message });
    }
};

// ==========================================================
// 5. OBTENER JUGADORES ACTIVOS (Requisito 4.4)
// ==========================================================
exports.getActiveUsers = async (req, res) => {
    try {
        const activeUsers = await User.find({})
            .sort({ postsCount: -1, guidesCount: -1 }) 
            .limit(5)
            .select('alias avatarUrl postsCount followers'); 

        const usersWithCounts = activeUsers.map(u => ({
            ...u.toObject(),
            followersCount: u.followers.length
        }));

        res.status(200).json({ users: usersWithCounts });
    } catch (error) {
        console.error('Error in getActiveUsers:', error);
        res.status(500).json({ message: "Error al obtener usuarios activos.", error: error.message });
    }
};