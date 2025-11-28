// src/controllers/guideController.js

const Guide = require('../models/Guide');
const User = require('../models/User');
// Asumimos que el modelo Comment y su controlador existen para las referencias.
const Comment = require('../models/Comment'); 

const authorFields = 'alias avatarUrl';

// ==========================================================
// 1. CREAR GUÍA (Req. 3.1, 3.2)
// POST /api/v1/guides
// ==========================================================
exports.createGuide = async (req, res) => {
    // title, game, description, y steps vienen del body
    const { title, game, description, steps } = req.body;
    const authorId = req.user.userId;

    try {
        const newGuide = await Guide.create({
            authorId,
            title,
            game,
            description,
            steps: steps || [] // Asegurar que steps sea un array, aunque la validación está en el modelo
        });

        // Incrementar contador de guías del autor
        await User.findByIdAndUpdate(authorId, { $inc: { guidesCount: 1 } });

        // Poblar autor para devolver la respuesta completa
        const populatedGuide = await Guide.populate(newGuide, { path: 'authorId', select: authorFields });

        res.status(201).json(populatedGuide);
    } catch (error) {
        console.error('Error al crear la guía:', error);
        // Manejo de errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Datos de guía incompletos o inválidos.", details: error.message });
        }
        res.status(500).json({ message: "Error interno al crear la guía.", error: error.message });
    }
};

// ==========================================================
// 2. OBTENER Y BUSCAR GUÍAS (Req. 3.3, 3.4, 3.7)
// GET /api/v1/guides
// ==========================================================
exports.getGuides = async (req, res) => {
    const { sortBy, search, page = 1 } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    const userId = req.user.userId; // ID del usuario autenticado para saber si ya la marcó como útil

    let filter = {};
    let sortOptions = { createdAt: -1 }; // Req. 3.7: Por defecto, por fecha (más reciente)

    if (search) {
        // Req. 3.4: Búsqueda por título o juego (gracias al índice de texto)
        filter = { $text: { $search: search } };
        sortOptions = { score: { $meta: "textScore" }, createdAt: -1 };
    }

    if (sortBy === 'popularity') {
        // Req. 3.7: Ordenar por popularidad (más útiles)
        sortOptions = { usefulCount: -1, createdAt: -1 }; 
    }

    try {
        const totalGuides = await Guide.countDocuments(filter);
        const guides = await Guide.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('authorId', authorFields)
            .lean();

        // Adjuntar estado 'isUseful' para el frontend (Req. 3.8)
        const guidesWithStatus = guides.map(guide => ({
            ...guide,
            isUseful: guide.markedUsefulBy.some(id => id.equals(userId)),
            markedUsefulBy: undefined // Ocultar array de IDs al cliente
        }));

        res.status(200).json({ 
            guides: guidesWithStatus,
            totalPages: Math.ceil(totalGuides / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error al obtener guías:', error);
        res.status(500).json({ message: "Error interno al obtener las guías.", error: error.message });
    }
};

// ==========================================================
// 3. OBTENER GUÍA POR ID
// GET /api/v1/guides/:guideId
// ==========================================================
exports.getGuideById = async (req, res) => {
    const { guideId } = req.params;
    const userId = req.user.userId;

    try {
        const guide = await Guide.findById(guideId)
            .populate('authorId', authorFields)
            .lean();

        if (!guide) {
            return res.status(404).json({ message: "Guía no encontrada." });
        }

        // Adjuntar estado 'isUseful'
        guide.isUseful = guide.markedUsefulBy.some(id => id.equals(userId));
        guide.markedUsefulBy = undefined;

        res.status(200).json(guide);

    } catch (error) {
        console.error('Error al obtener guía por ID:', error);
        res.status(500).json({ message: "Error interno al obtener la guía.", error: error.message });
    }
};


// ==========================================================
// 4. ACTUALIZAR GUÍA (Req. 3.6 - Edición)
// PUT /api/v1/guides/:guideId
// ==========================================================
exports.updateGuide = async (req, res) => {
    const { guideId } = req.params;
    const userId = req.user.userId;

    try {
        const guide = await Guide.findById(guideId);
        if (!guide) {
            return res.status(404).json({ message: "Guía no encontrada." });
        }
        // Verificar que el usuario es el autor (Req. 3.6)
        if (guide.authorId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para editar esta guía." });
        }

        // Actualizar solo los campos permitidos
        const updatedGuide = await Guide.findByIdAndUpdate(
            guideId, 
            { $set: req.body }, 
            { new: true, runValidators: true } // Devolver el nuevo documento y validar esquema
        ).populate('authorId', authorFields);

        res.status(200).json(updatedGuide);

    } catch (error) {
        console.error('Error al actualizar guía:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Datos de guía incompletos o inválidos.", details: error.message });
        }
        res.status(500).json({ message: "Error interno al actualizar la guía.", error: error.message });
    }
};

// ==========================================================
// 5. ELIMINAR GUÍA (Req. 3.6)
// DELETE /api/v1/guides/:guideId
// ==========================================================
exports.deleteGuide = async (req, res) => {
    const { guideId } = req.params;
    const userId = req.user.userId;

    try {
        const guide = await Guide.findById(guideId).select('authorId');
        if (!guide) {
            return res.status(404).json({ message: "Guía no encontrada." });
        }
        // Verificar que el usuario es el autor (Req. 3.6)
        if (guide.authorId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta guía." });
        }

        // 1. Eliminar la guía
        await Guide.findByIdAndDelete(guideId);
        
        // 2. Decrementar el contador de guías del usuario
        await User.findByIdAndUpdate(userId, { $inc: { guidesCount: -1 } });

        // 3. Eliminar todos los comentarios asociados a esta guía (limpieza de datos)
        // Requisito 3.5: Asumiendo que el campo de referencia en Comment se llama 'guideId'
        await Comment.deleteMany({ guideId: guideId });

        res.status(200).json({ message: "Guía eliminada correctamente." });

    } catch (error) {
        console.error('Error al eliminar guía:', error);
        res.status(500).json({ message: "Error interno al eliminar la guía.", error: error.message });
    }
};


// ==========================================================
// 6. TOGGLEAR MARCA "ÚTIL" (Req. 3.8)
// POST /api/v1/guides/:guideId/useful
// ==========================================================
exports.toggleUseful = async (req, res) => {
    const { guideId } = req.params;
    const userId = req.user.userId;

    try {
        const guide = await Guide.findById(guideId).select('markedUsefulBy usefulCount');
        if (!guide) {
            return res.status(404).json({ message: "Guia no encontrada." });
        }

        const alreadyUseful = guide.markedUsefulBy.includes(userId);

        const updateOperation = alreadyUseful 
            ? { $pull: { markedUsefulBy: userId }, $inc: { usefulCount: -1 } } // Remueve
            : { $push: { markedUsefulBy: userId }, $inc: { usefulCount: 1 } };  // Agrega

        await Guide.findByIdAndUpdate(guideId, updateOperation);

        res.status(200).json({ 
            message: alreadyUseful ? "Marca 'Útil' removida." : "Guía marcada como útil.", 
            status: alreadyUseful ? "unmarked" : "marked",
            newUsefulCount: guide.usefulCount + (alreadyUseful ? -1 : 1)
        });

    } catch (error) {
        console.error('Error en toggleUseful:', error);
        res.status(500).json({ message: "Error interno al procesar la marca 'útil'." });
    }
};

// ==========================================================
// 7. OBTENER GUÍAS DE UN USUARIO ESPECÍFICO (Req. 1.8 - Perfil)
// GET /api/v1/guides/user/:userId
// ==========================================================
exports.getGuidesByUserId = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    const { page = 1 } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    try {
        const totalGuides = await Guide.countDocuments({ authorId: userId });
        const guides = await Guide.find({ authorId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('authorId', authorFields)
            .lean();

        // Adjuntar estado 'isUseful'
        const guidesWithStatus = guides.map(guide => ({
            ...guide,
            isUseful: guide.markedUsefulBy.some(id => id.equals(currentUserId)),
            markedUsefulBy: undefined
        }));

        res.status(200).json({ 
            guides: guidesWithStatus,
            totalPages: Math.ceil(totalGuides / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error al obtener guías del usuario:', error);
        res.status(500).json({ message: "Error interno al obtener las guías del usuario." });
    }
};