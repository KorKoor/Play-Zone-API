// src/controllers/adminController.js

const User = require('../models/User');
const Post = require('../models/Post');
const Guide = require('../models/Guide');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Game = require('../models/Game');

// ========== DASHBOARD ==========

// GET /api/v1/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        // Estadísticas generales
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();
        const totalGuides = await Guide.countDocuments();
        const totalComments = await Comment.countDocuments();
        const totalGames = await Game.countDocuments();
        
        // Estadísticas de reportes
        const pendingReports = await Report.countDocuments({ status: 'pending' });
        const approvedReports = await Report.countDocuments({ status: 'approved' });
        const rejectedReports = await Report.countDocuments({ status: 'rejected' });
        
        // Usuarios activos (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = await User.countDocuments({ 
            updatedAt: { $gte: thirtyDaysAgo } 
        });

        // Nuevos usuarios (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUsers = await User.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo } 
        });

        // Usuarios baneados
        const bannedUsers = await User.countDocuments({ isBanned: true });

        res.status(200).json({
            success: true,
            data: {
                general: {
                    totalUsers,
                    totalPosts,
                    totalGuides,
                    totalComments,
                    totalGames
                },
                reports: {
                    pending: pendingReports,
                    approved: approvedReports,
                    rejected: rejectedReports,
                    total: pendingReports + approvedReports + rejectedReports
                },
                users: {
                    active: activeUsers,
                    newThisWeek: newUsers,
                    banned: bannedUsers
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// GET /api/v1/admin/logs
const getAdminLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, level = 'all' } = req.query;
        
        // Aquí podrías implementar un sistema de logs más sofisticado
        // Por ahora, devolvemos logs de acciones administrativas basados en reportes
        const query = {};
        
        if (level !== 'all') {
            // Filtrar por nivel de log (por ejemplo: 'info', 'warning', 'error')
            query.level = level;
        }

        // Obtener reportes recientes con información de quien los revisó
        const recentReports = await Report.find({ 
            status: { $in: ['approved', 'rejected'] },
            reviewedBy: { $ne: null }
        })
        .populate('reviewedBy', 'alias email')
        .populate('reportedBy', 'alias')
        .sort({ reviewedAt: -1 })
        .limit(parseInt(limit) * parseInt(page))
        .skip((parseInt(page) - 1) * parseInt(limit));

        // Transformar a formato de logs
        const logs = recentReports.map(report => ({
            id: report._id,
            timestamp: report.reviewedAt,
            level: report.status === 'approved' ? 'warning' : 'info',
            action: `Report ${report.status}`,
            user: report.reviewedBy.alias,
            details: `Report de ${report.reportedBy.alias} por ${report.reason} - ${report.status}`,
            metadata: {
                reportId: report._id,
                reportedItemType: report.reportedItemType,
                reason: report.reason
            }
        }));

        const totalLogs = await Report.countDocuments({ 
            status: { $in: ['approved', 'rejected'] },
            reviewedBy: { $ne: null }
        });

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(totalLogs / parseInt(limit)),
                    limit: parseInt(limit),
                    totalLogs
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener logs de administración:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========== REPORTES ==========

// GET /api/v1/admin/reports
const getReports = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status = 'all', 
            type = 'all',
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        // Construir query
        const query = {};
        if (status !== 'all') {
            query.status = status;
        }
        if (type !== 'all') {
            query.reportedItemType = type;
        }

        // Configurar ordenamiento
        const sortOrder = order === 'desc' ? -1 : 1;
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;

        const reports = await Report.find(query)
            .populate('reportedBy', 'alias email avatarUrl')
            .populate('reviewedBy', 'alias email')
            .populate('reportedItem')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const totalReports = await Report.countDocuments(query);

        // Estructura de respuesta compatible con el frontend actual
        res.status(200).json({
            success: true,
            reports, // Array directo para compatibilidad con frontend
            pagination: {
                current: parseInt(page),
                total: Math.ceil(totalReports / parseInt(limit)),
                limit: parseInt(limit),
                totalReports
            },
            // Estructura alternativa más profesional (opcional para uso futuro)
            data: {
                reports,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(totalReports / parseInt(limit)),
                    limit: parseInt(limit),
                    totalReports
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PUT /api/v1/admin/reports/:id/approve
const approveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body || {};

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden aprobar reportes pendientes'
            });
        }

        report.status = 'approved';
        report.reviewed_by = req.user.id;
        report.reviewed_at = new Date();
        if (notes) report.admin_notes = notes;

        await report.save();

        // Aquí podrías agregar lógica adicional para tomar acción sobre el contenido reportado
        // Por ejemplo, eliminar el post/comentario, banear usuario, etc.

        res.status(200).json({
            success: true,
            message: 'Reporte aprobado exitosamente',
            data: report
        });
    } catch (error) {
        console.error('Error al aprobar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PUT /api/v1/admin/reports/:id/reject
const rejectReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body || {};

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden rechazar reportes pendientes'
            });
        }

        report.status = 'rejected';
        report.reviewed_by = req.user.id;
        report.reviewed_at = new Date();
        if (notes) report.admin_notes = notes;
        
        await report.save();

        res.status(200).json({
            success: true,
            message: 'Reporte rechazado exitosamente',
            data: report
        });
    } catch (error) {
        console.error('Error al rechazar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// DELETE /api/v1/admin/reports/:id
const deleteReport = async (req, res) => {
    try {
        const { id } = req.params;

        const report = await Report.findByIdAndDelete(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reporte eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========== USUARIOS ==========

// PUT /api/v1/admin/users/:id/ban
const banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, duration } = req.body;

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes banearte a ti mismo'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.role === 'admin' || user.role === 'moderator') {
            return res.status(403).json({
                success: false,
                message: 'No se pueden banear administradores o moderadores por razones de seguridad'
            });
        }

        user.isBanned = true;
        user.banReason = reason;
        user.bannedBy = req.user.id;
        user.bannedAt = new Date();
        
        if (duration && duration > 0) {
            const banUntil = new Date();
            banUntil.setDate(banUntil.getDate() + duration);
            user.banUntil = banUntil;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Usuario baneado exitosamente',
            data: {
                userId: user._id,
                alias: user.alias,
                isBanned: user.isBanned,
                banReason: user.banReason,
                bannedAt: user.bannedAt,
                banUntil: user.banUntil
            }
        });
    } catch (error) {
        console.error('Error al banear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PUT /api/v1/admin/users/:id/unban
const unbanUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (!user.isBanned) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no está baneado'
            });
        }

        user.isBanned = false;
        user.banReason = undefined;
        user.bannedBy = undefined;
        user.bannedAt = undefined;
        user.banUntil = undefined;
        user.unbannedBy = req.user.id;
        user.unbannedAt = new Date();

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Usuario desbaneado exitosamente',
            data: {
                userId: user._id,
                alias: user.alias,
                isBanned: user.isBanned,
                unbannedAt: user.unbannedAt
            }
        });
    } catch (error) {
        console.error('Error al desbanear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// DELETE /api/v1/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No se puede eliminar a un administrador'
            });
        }

        // Eliminar contenido relacionado
        await Post.deleteMany({ author: id });
        await Guide.deleteMany({ author: id });
        await Comment.deleteMany({ author: id });
        await Report.deleteMany({ reportedBy: id });

        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Usuario y su contenido eliminados exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PUT /api/v1/admin/users/:id/role
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser: user, moderator o admin'
            });
        }

        if (id === req.user.id && role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol de administrador'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const previousRole = user.role;
        user.role = role;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Rol de usuario actualizado de ${previousRole} a ${role}`,
            data: {
                userId: user._id,
                alias: user.alias,
                previousRole,
                newRole: role
            }
        });
    } catch (error) {
        console.error('Error al actualizar rol de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========== CATÁLOGO (JUEGOS) ==========

// GET /api/v1/admin/games
const getGames = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '',
            genre = 'all',
            platform = 'all',
            isActive = 'all',
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        // Construir query
        const query = {};
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { developer: { $regex: search, $options: 'i' } },
                { publisher: { $regex: search, $options: 'i' } }
            ];
        }

        if (genre !== 'all') {
            query.genre = { $in: [genre] };
        }

        if (platform !== 'all') {
            query.platform = { $in: [platform] };
        }

        if (isActive !== 'all') {
            query.isActive = isActive === 'true';
        }

        // Configurar ordenamiento
        const sortOrder = order === 'desc' ? -1 : 1;
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;

        const games = await Game.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const totalGames = await Game.countDocuments(query);

        // Estructura de respuesta compatible con el frontend actual
        res.status(200).json({
            success: true,
            games, // Array directo para compatibilidad con frontend
            pagination: {
                current: parseInt(page),
                total: Math.ceil(totalGames / parseInt(limit)),
                limit: parseInt(limit),
                totalGames
            },
            // Estructura alternativa más profesional (opcional para uso futuro)
            data: {
                games,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(totalGames / parseInt(limit)),
                    limit: parseInt(limit),
                    totalGames
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener juegos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// POST /api/v1/admin/games
const createGame = async (req, res) => {
    try {
        const gameData = req.body;
        
        // Validar datos requeridos
        const requiredFields = ['title', 'description', 'genre', 'platform', 'developer', 'publisher', 'releaseDate', 'rating'];
        const missingFields = requiredFields.filter(field => !gameData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Faltan campos requeridos: ${missingFields.join(', ')}`
            });
        }

        const game = new Game(gameData);
        await game.save();

        res.status(201).json({
            success: true,
            message: 'Juego creado exitosamente',
            data: game
        });
    } catch (error) {
        console.error('Error al crear juego:', error);
        
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errorMessages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PUT /api/v1/admin/games/:id
const updateGame = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Juego no encontrado'
            });
        }

        // Actualizar campos
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                game[key] = updateData[key];
            }
        });

        await game.save();

        res.status(200).json({
            success: true,
            message: 'Juego actualizado exitosamente',
            data: game
        });
    } catch (error) {
        console.error('Error al actualizar juego:', error);
        
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errorMessages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// DELETE /api/v1/admin/games/:id
const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Juego no encontrado'
            });
        }

        await Game.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Juego eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar juego:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    // Dashboard
    getDashboardStats,
    getAdminLogs,
    
    // Reportes
    getReports,
    approveReport,
    rejectReport,
    deleteReport,
    
    // Usuarios
    banUser,
    unbanUser,
    deleteUser,
    updateUserRole,
    
    // Juegos
    getGames,
    createGame,
    updateGame,
    deleteGame
};