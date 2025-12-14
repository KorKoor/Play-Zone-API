// src/controllers/uploadController.js

const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const User = require('../models/User');

// POST /api/v1/upload/avatar
exports.uploadAvatar = async (req, res) => {
  const userId = req.user && req.user.userId;

  // === 1. VALIDACIONES INICIALES ===
  if (!req.file) {
    return res.status(400).json({ message: "No se encontró ningún archivo para subir." });
  }
  if (!userId) {
    return res.status(401).json({ message: "No autorizado. El ID de usuario es requerido para la subida." });
  }

  const filePath = req.file.path; // Ruta temporal del archivo

  try {
    // === 2. SUBIDA A CLOUDINARY ===
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "playzone_avatars",
      public_id: `${userId}_avatar`,
      overwrite: true,
      transformation: [
        {
          width: 300,
          height: 300,
          crop: "fill",
          gravity: "face",
          quality: "auto:best",
          fetch_format: "auto"
        }
      ]
    });

    // === 3. ELIMINAR ARCHIVO TEMPORAL ===
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error al eliminar archivo temporal:", err);
    });

    // === 4. ACTUALIZAR URL DEL AVATAR EN LA BASE DE DATOS DEL USUARIO ===
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatarUrl: result.secure_url },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.error("Error: Usuario no encontrado al intentar actualizar avatarUrl para userId:", userId);
      return res.status(404).json({ message: "Usuario no encontrado para actualizar avatar." });
    }

    // === 5. RESPUESTA AL FRONTEND ===
    return res.status(200).json({
      message: "Avatar subido y perfil actualizado con éxito.",
      imageUrl: result.secure_url,
    });

  } catch (error) {
    // === 5. LIMPIEZA EN CASO DE ERROR ===
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error al limpiar archivo temporal tras fallo:", err);
      });
    }

    console.error("❌ Cloudinary Upload Error:", error);

    // === 6. MENSAJE DE ERROR ROBUSTO ===
    let errorMessage = "Error al subir el archivo. Verifique credenciales o permisos.";
    if (error.http_code === 400 || error.http_code === 401) {
      errorMessage = "Fallo de autenticación con la nube. Revise CLOUDINARY_API_SECRET.";
    }

    return res.status(500).json({ message: errorMessage });
  }
};
