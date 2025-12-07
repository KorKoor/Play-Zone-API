// src/controllers/gameController.js

const Game = require('../models/Game');

/**
 * Obtener todos los juegos activos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllGames = async (req, res) => {
    try {
        const games = await Game.find({ isActive: true })
            .sort({ title: 1 });

        const formattedGames = games.map(game => {
            const gameObj = game.toObject();
            return {
                ...gameObj,
                name: gameObj.title
            };
        });

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error al obtener los juegos:', error);
        res.status(500).json({
            message: 'Error interno del servidor al obtener los juegos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener un juego por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getGameById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const game = await Game.findOne({ _id: id, isActive: true });
        
        if (!game) {
            return res.status(404).json({
                message: 'Juego no encontrado'
            });
        }

        res.status(200).json(game);
    } catch (error) {
        console.error('Error al obtener el juego:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de juego inválido'
            });
        }
        
        res.status(500).json({
            message: 'Error interno del servidor al obtener el juego',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Crear un nuevo juego
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createGame = async (req, res) => {
    try {
        const gameData = req.body;
        
        if (gameData.name && !gameData.title) {
            gameData.title = gameData.name;
            delete gameData.name;
        }
        
        const newGame = new Game(gameData);
        const savedGame = await newGame.save();

        res.status(201).json({
            message: 'Juego creado exitosamente',
            game: savedGame
        });
    } catch (error) {
        console.error('Error al crear el juego:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            message: 'Error interno del servidor al crear el juego',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar un juego
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateGame = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.name && !updateData.title) {
            updateData.title = updateData.name;
            delete updateData.name;
        }

        const updatedGame = await Game.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!updatedGame) {
            return res.status(404).json({
                message: 'Juego no encontrado'
            });
        }

        res.status(200).json({
            message: 'Juego actualizado exitosamente',
            game: updatedGame
        });
    } catch (error) {
        console.error('Error al actualizar el juego:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Error de validación',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de juego inválido'
            });
        }
        
        res.status(500).json({
            message: 'Error interno del servidor al actualizar el juego',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Eliminar un juego (soft delete)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete: cambiar isActive a false
        const deletedGame = await Game.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!deletedGame) {
            return res.status(404).json({
                message: 'Juego no encontrado'
            });
        }

        res.status(200).json({
            message: 'Juego eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar el juego:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de juego inválido'
            });
        }
        
        res.status(500).json({
            message: 'Error interno del servidor al eliminar el juego',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllGames,
    getGameById,
    createGame,
    updateGame,
    deleteGame
};