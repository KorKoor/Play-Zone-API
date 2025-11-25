// src/controllers/postController.js

const Post = require('../models/Post');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary'); // Asegúrate de que esta ruta es correcta
const fs = require('fs'); // Módulo necesario para eliminar archivos temporales

// Helper para poblar el post con informacion basica del autor
const populateAuthor = (query) => {
    // Si la entrada es un array de posts, usamos Promise.all
    if (Array.isArray(query)) {
        return Promise.all(query.map(post => Post.populate(post, {
            path: 'authorId',
            select: 'alias avatarUrl'
        })));
    }
    // Si la entrada es una query de Mongoose, simplemente aplicamos populate
    return query.populate('authorId', 'alias avatarUrl');
}

// ==========================================================
// 1. CREAR PUBLICACIÓN (Req. 2.1)
// POST /api/v1/posts
// ==========================================================
exports.createPost = async (req, res) => {
    const { gameTitle, description, rating } = req.body;
    const authorId = req.user.userId;

    // Ruta donde Multer guarda el archivo temporalmente
    const filePath = req.file ? req.file.path : null;
    let imageUrl = null;
    
    try {
        // 🚀 Subir imagen a Cloudinary si existe 🚀
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'playzone_posts',
                // Optimizacion simple
                transformation: [{ quality: "auto:low", fetch_format: "auto" }]
            });
            imageUrl = result.secure_url;
        }

        const newPost = await Post.create({
            authorId,
            gameTitle,
            description,
            rating,
            imageUrl,
        });

        // Incrementar contador de posts del autor (Req. 2.12)
        await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });

        // Poblar datos básicos del autor para devolver la respuesta completa
        const populatedPost = await Post.populate(newPost, {
            path: 'authorId',
            select: 'alias avatarUrl'
        });

        // ⚠️ Eliminar archivo temporal si la subida fue exitosa ⚠️
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(201).json(populatedPost);
    } catch (error) {
        console.error('Error al crear la publicación:', error);
        
        // ⚠️ Limpiar el archivo temporal en caso de cualquier fallo ⚠️
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        res.status(500).json({
            message: "Error al crear la publicación.",
            error: error.message
        });
    }
};

// ==========================================================
// 2. FEED PRINCIPAL (Req. 2.3, 4.3)
// GET /api/v1/posts/feed
// ESTO RESUELVE EL ERROR 404 DEL FEED
// ==========================================================
exports.getFeedPosts = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const user = await User.findById(userId).select('following');
        const followingIds = user && user.following ? user.following : []; 

        // Filtro: Posts de usuarios que sigo O posts míos.
        const authorFilter = [...followingIds, userId];

        const posts = await Post.find({ authorId: { $in: authorFilter } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('authorId', 'alias avatarUrl') // Poblar en la consulta inicial es más eficiente
            .lean(); // Usar lean para mejorar performance si no se modificará el documento

        // Mapear para añadir el estado 'isLiked'
        const postsWithLikes = posts.map(post => ({
            ...post, // Ya es un objeto plano gracias a .lean()
            isLiked: post.likes.some(likeId => likeId.equals(userId)),
            likes: undefined // Ocultar el array de IDs de likes
        }));

        res.status(200).json({ posts: postsWithLikes });
    } catch (error) {
        console.error('Error al cargar el feed:', error);
        res.status(500).json({
            message: "Error al cargar el feed.",
            error: error.message
        });
    }
};

// ==========================================================
// 3. DAR / QUITAR LIKE (Req. 2.4)
// ==========================================================
exports.toggleLike = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId; // Esto es una cadena (string)

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Publicación no encontrada." });
        }

        // 🚀 CORRECCIÓN CLAVE: Usamos .some() y .toString() para comparar ObjectId con string 🚀
        const isLiked = post.likes.some(likeId => likeId.toString() === userId); 

        if (isLiked) {
            // ➡️ QUITAR LIKE
            await Post.findByIdAndUpdate(postId, {
                $pull: { likes: userId }, // Mongoose maneja la conversion a ObjectId aqui
                $inc: { likesCount: -1 }
            });
            res.status(200).json({ message: "Like removido.", status: "unliked" });
        } else {
            // ➡️ DAR LIKE
            await Post.findByIdAndUpdate(postId, {
                $push: { likes: userId },
                $inc: { likesCount: 1 }
            });
            res.status(200).json({ message: "Like agregado.", status: "liked" });
        }
    } catch (error) {
        console.error('Error al procesar el like:', error);
        res.status(500).json({
            message: "Error al procesar el like.",
            error: error.message
        });
    }
};

// ==========================================================
// 3.1. OBTENER LISTA DE LIKES (Requisito 2.6 - Complemento)
// GET /api/v1/posts/:postId/likes
// ==========================================================
exports.getLikesList = async (req, res) => {
    const { postId } = req.params;
    
    try {
        // Encontrar el post y poblar la lista completa de usuarios que dieron like
        const post = await Post.findById(postId)
            .select('likes')
            .populate('likes', 'alias avatarUrl'); // Poblar solo alias y avatar

        if (!post) {
            return res.status(404).json({ message: "Publicacion no encontrada." });
        }
        
        // Devolver el array poblado de usuarios
        res.status(200).json({ users: post.likes });

    } catch (error) {
        console.error('Error al obtener lista de likes:', error);
        res.status(500).json({ message: "Error al obtener la lista de usuarios." });
    }
};

// ==========================================================
// 4. BÚSQUEDA DE PUBLICACIONES (Req. 2.8)
// GET /api/v1/posts/search?q=query
// ==========================================================
exports.searchPosts = async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ message: "El parámetro de búsqueda 'q' es requerido." });
    }

    try {
        // Usa el indice de texto creado en el modelo Post
        const posts = await Post.find({ $text: { $search: query } })
            .sort({ score: { $meta: "textScore" } })
            .limit(20)
            .populate('authorId', 'alias avatarUrl')
            .lean();

        res.status(200).json({ posts });
    } catch (error) {
        console.error('Error en la búsqueda de publicaciones:', error);
        res.status(500).json({
            message: "Error en la búsqueda de publicaciones.",
            error: error.message
        });
    }
};