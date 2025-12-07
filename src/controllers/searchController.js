// src/controllers/searchController.js

const Post = require('../models/Post');
const Guide = require('../models/Guide');
const User = require('../models/User');
const Game = require('../models/Game');

// ==========================================================
// BÚSQUEDA GLOBAL
// GET /api/v1/search
// ==========================================================
exports.globalSearch = async (req, res) => {
    try {
        const {
            q = '',
            type = 'all',
            category = '',
            sortBy = 'relevance',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        const searchQuery = q.trim();
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Crear regex para búsqueda case-insensitive
        const regex = new RegExp(searchQuery, 'i');

        const results = {
            users: { data: [], total: 0, totalPages: 0, currentPage: pageNum },
            games: { data: [], total: 0, totalPages: 0, currentPage: pageNum },
            posts: { data: [], total: 0, totalPages: 0, currentPage: pageNum },
            guides: { data: [], total: 0, totalPages: 0, currentPage: pageNum }
        };

        // Buscar en usuarios si type es 'all' o 'users'
        if (type === 'all' || type === 'users') {
            const [users, usersTotal] = await Promise.all([
                User.find({
                    $or: [
                        { alias: regex },
                        { email: regex }
                    ]
                })
                .select('alias email avatarUrl created_at')
                .limit(limitNum)
                .skip(skip)
                .sort({ alias: sortOrder === 'desc' ? -1 : 1 }),
                
                User.countDocuments({
                    $or: [
                        { alias: regex },
                        { email: regex }
                    ]
                })
            ]);

            results.users = {
                data: users.map(user => ({
                    id: user._id,
                    username: user.alias,
                    name: user.alias,
                    avatar: user.avatarUrl || null,
                    email: user.email
                })),
                total: usersTotal,
                totalPages: Math.ceil(usersTotal / limitNum),
                currentPage: pageNum
            };
        }

        // Buscar en juegos si type es 'all' o 'games'
        if (type === 'all' || type === 'games') {
            const gameFilters = {
                $or: [
                    { title: regex },
                    { developer: regex }
                ]
            };

            const [games, gamesTotal] = await Promise.all([
                Game.find(gameFilters)
                    .select('_id title description developer genre platform coverImage rating')
                    .limit(limitNum)
                    .skip(skip),
                
                Game.countDocuments(gameFilters)
            ]);

            results.games = {
                data: games.map(game => ({
                    id: game._id,
                    title: game.title,
                    description: game.description,
                    developer: game.developer,
                    genre: game.genre,
                    platform: game.platform,
                    coverImage: game.coverImage || null,
                    rating: game.rating || 0
                })),
                total: gamesTotal,
                totalPages: Math.ceil(gamesTotal / limitNum),
                currentPage: pageNum
            };
        }

        // Buscar en posts si type es 'all' o 'posts'
        if (type === 'all' || type === 'posts') {
            const postFilters = {
                $or: [
                    { gameTitle: regex },
                    { description: regex }
                ]
            };

            const [posts, postsTotal] = await Promise.all([
                Post.find(postFilters)
                    .populate('authorId', 'alias')
                    .select('_id gameTitle description authorId created_at updated_at')
                    .limit(limitNum)
                    .skip(skip)
                    .sort({ created_at: sortOrder === 'desc' ? -1 : 1 }),
                
                Post.countDocuments(postFilters)
            ]);

            results.posts = {
                data: posts.map(post => ({
                    id: post._id,
                    title: post.gameTitle,
                    content: post.description?.substring(0, 200) + (post.description?.length > 200 ? '...' : ''),
                    author: {
                        id: post.authorId._id,
                        username: post.authorId.alias,
                        name: post.authorId.alias
                    },
                    createdAt: post.created_at,
                    updatedAt: post.updated_at
                })),
                total: postsTotal,
                totalPages: Math.ceil(postsTotal / limitNum),
                currentPage: pageNum
            };
        }

        // Buscar en guías si type es 'all' o 'guides'
        if (type === 'all' || type === 'guides') {
            const guideFilters = {
                $or: [
                    { title: regex },
                    { description: regex }
                ]
            };

            // Agregar filtro de categoría si se proporciona
            if (category) {
                guideFilters.category = category;
            }

            const [guides, guidesTotal] = await Promise.all([
                Guide.find(guideFilters)
                    .populate('authorId', 'alias')
                    .limit(limitNum)
                    .skip(skip)
                    .sort({ created_at: sortOrder === 'desc' ? -1 : 1 }),
                
                Guide.countDocuments(guideFilters)
            ]);

            results.guides = {
                data: guides.map(guide => ({
                    id: guide._id,
                    title: guide.title,
                    content: guide.description?.substring(0, 200) + (guide.description?.length > 200 ? '...' : ''),
                    author: {
                        id: guide.authorId._id,
                        username: guide.authorId.alias,
                        name: guide.authorId.alias
                    },
                    category: guide.category || null,
                    difficulty: guide.difficulty || null,
                    createdAt: guide.created_at
                })),
                total: guidesTotal,
                totalPages: Math.ceil(guidesTotal / limitNum),
                currentPage: pageNum
            };
        }

        res.json({
            success: true,
            query: searchQuery,
            ...results
        });

    } catch (error) {
        console.error('Error en búsqueda global:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al realizar la búsqueda'
        });
    }
};

// ==========================================================
// SUGERENCIAS DE BÚSQUEDA
// GET /api/v1/search/suggestions
// ==========================================================
exports.getSearchSuggestions = async (req, res) => {
    try {
        const { q = '' } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        const searchQuery = q.trim();
        const regex = new RegExp(searchQuery, 'i');
        const suggestions = [];

        // Buscar en juegos (prioridad alta)
        const games = await Game.find({
            $or: [
                { title: regex },
                { developer: regex }
            ]
        })
        .limit(2)
        .select('title developer');

        games.forEach(game => {
            suggestions.push({
                type: 'game',
                title: game.title,
                id: game._id,
                subtitle: game.developer || ''
            });
        });

        // Buscar en usuarios
        const users = await User.find({
            alias: regex
        })
        .limit(2)
        .select('alias');

        users.forEach(user => {
            suggestions.push({
                type: 'user',
                title: user.alias,
                id: user._id,
                subtitle: 'Usuario'
            });
        });

        // Buscar en posts
        const posts = await Post.find({
            gameTitle: regex
        })
        .populate('authorId', 'alias')
        .limit(1)
        .select('gameTitle authorId');

        posts.forEach(post => {
            suggestions.push({
                type: 'post',
                title: post.gameTitle,
                id: post._id,
                subtitle: `Por ${post.authorId.alias}`
            });
        });

        res.json({
            success: true,
            suggestions: suggestions.slice(0, 5) // Máximo 5 sugerencias
        });

    } catch (error) {
        console.error('Error al obtener sugerencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener sugerencias'
        });
    }
};

// ==========================================================
// FILTROS DISPONIBLES
// GET /api/v1/search/filters
// ==========================================================
exports.getSearchFilters = async (req, res) => {
    try {
        // Obtener valores únicos de categorías y otros filtros
        const [gameGenres, gamePlatforms, guideCategories] = await Promise.all([
            Game.distinct('genre').then(genres => 
                genres.filter(Boolean).map(genre => ({ id: genre, name: genre }))
            ),
            Game.distinct('platform').then(platforms => 
                platforms.filter(Boolean).map(platform => ({ id: platform, name: platform }))
            ),
            Guide.distinct('category').then(categories => 
                categories.filter(Boolean).map(category => ({ id: category, name: category }))
            )
        ]);

        res.json({
            success: true,
            categories: guideCategories,
            difficulties: [
                { id: 'beginner', name: 'Principiante' },
                { id: 'intermediate', name: 'Intermedio' },
                { id: 'advanced', name: 'Avanzado' },
                { id: 'expert', name: 'Experto' }
            ],
            genres: gameGenres,
            platforms: gamePlatforms
        });

    } catch (error) {
        console.error('Error al obtener filtros:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener filtros'
        });
    }
};