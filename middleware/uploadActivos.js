const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorio para activos si no existe
const uploadDir = 'uploads/activos';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar almacenamiento para activos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Crear nombre único: timestamp_nombreoriginal
        const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1E9)}_${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Filtro de archivos para activos (imágenes y PDFs)
const fileFilter = (req, file, cb) => {
    // Tipos de archivo permitidos para activos
    const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WebP) y PDFs.'), false);
    }
};

// Configurar multer para activos
const uploadActivos = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB máximo por archivo (un poco más que incidencias)
        files: 1 // máximo 1 archivo por activo
    },
    fileFilter: fileFilter
});

module.exports = uploadActivos;