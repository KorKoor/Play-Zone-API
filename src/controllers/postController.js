// src/controllers/postController.js

const Post = require('../models/Post');
const User = require('../models/User'); 

// Helper para poblar el post con información básica del autor
const populateAuthor = (query) => {
    return query.populate('authorId', 'alias avatarUrl');
};

// ==========================================================
// 1. CREAR PUBLICACIÓN
// ==========================================================
exports.createPost = async (req, res) => {
    const { gameTitle, imageUrl, description, rating } = req.body;
    const authorId = req.user.userId;

    try {
        const newPost = await Post.create({
            authorId, gameTitle, imageUrl, description, rating,
        });

        await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } }); 

        // Usar Model.populate para documentos ya creados
        const populatedPost = await Post.populate(newPost, { path: 'authorId', select: 'alias avatarUrl' });

        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Error al crear la publicación.", error: error.message });
    }
};

// ==========================================================
// 2. FEED PRINCIPAL
// ==========================================================
exports.getFeedPosts = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const user = await User.findById(userId).select('following');
        const followingIds = user && user.following ? user.following : []; 
        const authorFilter = [...followingIds, userId]; 

        // Aquí sí se puede usar populate directamente en la query
        const posts = await Post.find({ authorId: { $in: authorFilter } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('authorId', 'alias avatarUrl');

        const postsWithLikes = posts.map(post => ({
            ...post.toObject(),
            isLiked: post.likes.some(likeId => likeId.equals(userId)),
            likes: undefined // ocultar array completo de likes
        }));

        res.status(200).json({ posts: postsWithLikes });

    } catch (error) {
        console.error('Error al cargar el feed:', error);
        res.status(500).json({ message: "Error al cargar el feed.", error: error.message });
    }
};

// ==========================================================
// 3. DAR / QUITAR LIKE
// ==========================================================
exports.toggleLike = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Publicación no encontrada." });
        }

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            await Post.findByIdAndUpdate(postId, { $pull: { likes: userId }, $inc: { likesCount: -1 } });
            res.status(200).json({ message: "Like removido.", status: "unliked" });
        } else {
            await Post.findByIdAndUpdate(postId, { $push: { likes: userId }, $inc: { likesCount: 1 } });
            res.status(200).json({ message: "Like agregado.", status: "liked" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error al procesar el like.", error: error.message });
    }
};

// ==========================================================
// 4. BÚSQUEDA DE PUBLICACIONES
// ==========================================================
exports.searchPosts = async (req, res) => {
    const query = req.query.q; 

    if (!query) {
        return res.status(400).json({ message: "El parámetro de búsqueda 'q' es requerido." });
    }

    try {
        const posts = await Post.find({ $text: { $search: query } })
            .sort({ score: { $meta: "textScore" } })
            .limit(20)
            .populate('authorId', 'alias avatarUrl')
            .lean();

        res.status(200).json({ posts });
    } catch (error) {
        res.status(500).json({ message: "Error en la búsqueda de publicaciones.", error: error.message });
    }
};
