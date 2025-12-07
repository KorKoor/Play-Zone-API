// src/controllers/reportController.js

const Report = require('../models/Report');
const Post = require('../models/Post');
const Guide = require('../models/Guide');
const GuideComment = require('../models/GuideComment');
const User = require('../models/User');

// ==========================================================
// CREAR REPORTE
// POST /api/v1/reports
// ==========================================================
exports.createReport = async (req, res) => {
    try {
        const {
            content_id,
            content_type,
            reason,
            description,
            reported_user_id,
            additional_info
        } = req.body;

        const reporter_user_id = req.user.userId;

        // === VALIDACIONES BÁSICAS ===
        if (!content_id) {
            return res.status(400).json({
                success: false,
                message: 'Los datos del reporte no son válidos',
                errors: ['El campo content_id es requerido']
            });
        }

        if (!content_type) {
            return res.status(400).json({
                success: false,
                message: 'Los datos del reporte no son válidos',
                errors: ['El campo content_type es requerido']
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Los datos del reporte no son válidos',
                errors: ['El campo reason es requerido']
            });
        }

        // === VERIFICAR RATE LIMITING ===
        const recentReportsCount = await Report.countRecentReports(reporter_user_id);
        if (recentReportsCount >= 10) {
            return res.status(429).json({
                success: false,
                message: 'Has enviado demasiados reportes recientemente',
                error: 'Máximo 10 reportes por día permitidos'
            });
        }

        // === VERIFICAR DUPLICADOS ===
        const existingReport = await Report.existsReport(content_id, content_type, reporter_user_id);
        if (existingReport) {
            return res.status(409).json({
                success: false,
                message: 'Ya has reportado este contenido anteriormente'
            });
        }

        // === VERIFICAR QUE EL CONTENIDO EXISTE ===
        let contentExists = false;
        let reportedUserId = reported_user_id;

        switch (content_type) {
            case 'post':
                const post = await Post.findById(content_id);
                if (post) {
                    contentExists = true;
                    if (!reportedUserId) reportedUserId = post.authorId;
                }
                break;

            case 'guide':
                const guide = await Guide.findById(content_id);
                if (guide) {
                    contentExists = true;
                    if (!reportedUserId) reportedUserId = guide.authorId;
                }
                break;

            case 'comment':
                const comment = await GuideComment.findById(content_id);
                if (comment) {
                    contentExists = true;
                    if (!reportedUserId) reportedUserId = comment.authorId;
                }
                break;

            case 'user':
                const user = await User.findById(content_id);
                if (user) {
                    contentExists = true;
                    reportedUserId = content_id;
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Los datos del reporte no son válidos',
                    errors: ['Tipo de contenido no válido']
                });
        }

        if (!contentExists) {
            return res.status(400).json({
                success: false,
                message: 'Los datos del reporte no son válidos',
                errors: ['El contenido especificado no existe']
            });
        }

        // === CREAR EL REPORTE ===
        const reportData = {
            content_id,
            content_type,
            reason,
            reporter_user_id,
            status: 'pending'
        };

        // Agregar campos opcionales solo si están presentes
        if (description) reportData.description = description;
        if (reportedUserId) reportData.reported_user_id = reportedUserId;
        if (additional_info) reportData.additional_info = additional_info;

        const newReport = new Report(reportData);
        const savedReport = await newReport.save();

        // === RESPUESTA EXITOSA ===
        res.status(201).json({
            success: true,
            message: 'Reporte creado exitosamente',
            data: {
                id: savedReport._id,
                status: savedReport.status,
                created_at: savedReport.created_at
            }
        });

    } catch (error) {
        console.error('Error al crear reporte:', error);

        // Manejo de errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Los datos del reporte no son válidos',
                errors
            });
        }

        // Error de duplicado (índice único)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Ya has reportado este contenido anteriormente'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear el reporte'
        });
    }
};

// ==========================================================
// OBTENER TODOS LOS REPORTES (Para administradores)
// GET /api/v1/reports/admin/all
// ==========================================================
exports.getAllReportsAdmin = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = 'pending', 
            content_type = 'all',
            reason = 'all',
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        // Construir filtros
        const filters = {};
        if (status && status !== 'all') filters.status = status;
        if (content_type && content_type !== 'all') filters.content_type = content_type;
        if (reason && reason !== 'all') filters.reason = reason;

        // Construir ordenamiento
        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;

        // Paginación
        const skip = (page - 1) * limit;
        const limitNum = parseInt(limit);

        // Ejecutar consultas en paralelo
        const [reports, total, stats] = await Promise.all([
            Report.find(filters)
                .populate('reporter_user_id', 'alias email')
                .populate('reported_user_id', 'alias email')
                .populate('reviewed_by', 'alias')
                .sort(sortOptions)
                .limit(limitNum)
                .skip(skip),
            
            Report.countDocuments(filters),
            
            // Estadísticas generales
            Report.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Procesar estadísticas
        const statsObj = {
            pending: 0,
            reviewing: 0,
            resolved: 0,
            dismissed: 0
        };
        
        stats.forEach(stat => {
            if (statsObj.hasOwnProperty(stat._id)) {
                statsObj[stat._id] = stat.count;
            }
        });

        // Formatear reportes para el frontend
        const formattedReports = reports.map(report => ({
            id: report._id,
            content_id: report.content_id,
            content_type: report.content_type,
            reason: report.reason,
            description: report.description,
            reporter: report.reporter_user_id ? {
                id: report.reporter_user_id._id,
                alias: report.reporter_user_id.alias
            } : null,
            reported_user: report.reported_user_id ? {
                id: report.reported_user_id._id,
                alias: report.reported_user_id.alias
            } : null,
            status: report.status,
            admin_notes: report.admin_notes,
            reviewed_by: report.reviewed_by?._id || null,
            reviewed_at: report.reviewed_at,
            created_at: report.created_at,
            updated_at: report.updated_at,
            additional_info: report.additional_info
        }));

        res.json({
            success: true,
            data: {
                reports: formattedReports,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limitNum),
                    total_reports: total,
                    per_page: limitNum,
                    has_next: page < Math.ceil(total / limitNum),
                    has_prev: page > 1
                },
                stats: statsObj
            }
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener reportes'
        });
    }
};

// ==========================================================
// ACTUALIZAR ESTADO DE REPORTE (Para administradores)
// PATCH /api/v1/reports/admin/:reportId/status
// ==========================================================
exports.updateReportStatusAdmin = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, admin_notes, action } = req.body;
        const reviewed_by = req.user.userId;

        // Validar status
        const validStatuses = ['reviewing', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido',
                errors: ['El estado debe ser: reviewing, resolved o dismissed']
            });
        }

        // Validar action si se proporciona
        const validActions = ['content_removed', 'user_warned', 'user_banned', 'no_action'];
        if (action && !validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Acción inválida',
                errors: ['La acción debe ser: content_removed, user_warned, user_banned o no_action']
            });
        }

        const updateData = {
            status,
            reviewed_by,
            reviewed_at: new Date()
        };

        if (admin_notes) updateData.admin_notes = admin_notes;
        if (action) updateData.action = action;

        const report = await Report.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        ).populate('reporter_user_id', 'alias email')
         .populate('reported_user_id', 'alias email')
         .populate('reviewed_by', 'alias');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Estado del reporte actualizado',
            data: {
                id: report._id,
                status: report.status,
                admin_notes: report.admin_notes,
                reviewed_by: report.reviewed_by?._id,
                reviewed_at: report.reviewed_at,
                action: report.action
            }
        });

    } catch (error) {
        console.error('Error al actualizar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar reporte'
        });
    }
};

// ==========================================================
// ELIMINAR REPORTE (Para administradores)
// DELETE /api/v1/reports/admin/:reportId
// ==========================================================
exports.deleteReportAdmin = async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await Report.findByIdAndDelete(reportId);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Reporte eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar reporte'
        });
    }
};

// ==========================================================
// OBTENER REPORTES DE UN USUARIO (Para ver sus propios reportes)
// GET /api/v1/reports/my-reports
// ==========================================================
exports.getMyReports = async (req, res) => {
    try {
        const reporter_user_id = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        const reports = await Report.find({ reporter_user_id })
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .select('content_id content_type reason description status created_at');

        const total = await Report.countDocuments({ reporter_user_id });

        res.json({
            success: true,
            data: reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener reportes del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener tus reportes'
        });
    }
};