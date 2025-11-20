// src/config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Asegúrate de que MONGO_URI esté definido en tu archivo .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB conectado en: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error de conexión a MongoDB: ${error.message}`);
        process.exit(1); 
    }
};

module.exports = connectDB;