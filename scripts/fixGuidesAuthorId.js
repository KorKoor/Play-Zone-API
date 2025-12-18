
require('dotenv').config();
// scripts/fixGuidesAuthorId.js
// Script para asignar un authorId válido a guías antiguas con authorId: null
// Ejecutar con: node scripts/fixGuidesAuthorId.js

const mongoose = require('mongoose');
const Guide = require('../src/models/Guide');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/playzone'; // Usa la misma variable que el backend

async function main() {

  console.log('Intentando conectar a MongoDB en URI:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado a MongoDB');

  // Mostrar todos los usuarios encontrados
  const allUsers = await User.find();
  console.log('Usuarios encontrados en la base de datos:', allUsers.map(u => ({ _id: u._id, alias: u.alias, role: u.role })));

  // Forzar el usuario 'Valen Achepe' como autor
  let adminUser = await User.findOne({ alias: 'Valen Achepe' });
  if (!adminUser) {
    console.error("No se encontró el usuario 'Valen Achepe'.");
    process.exit(1);
  }

  // Actualizar todas las guías con authorId null
  const result = await Guide.updateMany(
    { authorId: null },
    { $set: { authorId: adminUser._id } }
  );
  console.log(`Guías actualizadas: ${result.modifiedCount}`);
  console.log('Actualización completada.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error en el script:', err);
  process.exit(1);
});
