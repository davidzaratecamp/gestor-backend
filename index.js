const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configurar CORS dinámicamente según el ambiente
const corsOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'http://31.97.138.23:5173', 'http://31.97.138.23:5174']
    : [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'];

// Middlewares
app.use(cors({
    origin: corsOrigins,
    credentials: true
})); // Permite peticiones desde el frontend
app.use(express.json()); // Para parsear el body de las peticiones como JSON

// Servir archivos estáticos (archivos adjuntos)
app.use('/api/files', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/users', require('./routes/users'));
app.use('/api/workstations', require('./routes/workstations'));
app.use('/api/chat', require('./routes/chat'));

app.get('/', (req, res) => {
  res.send('API del Call Center Support está funcionando!');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
