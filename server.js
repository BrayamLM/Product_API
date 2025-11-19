// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
require('dotenv').config();

const app = express();

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============= CORS CONFIGURADO CORRECTAMENTE =============
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite
      'https://impertula.com'
    ];
    
    // Permitir peticiones sin origin (herramientas de desarrollo como Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Para desarrollo, acepta todo. En producción, cambia esto
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight por 10 minutos
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: Falta la variable MONGODB_URI en .env');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB - Base de datos de productos'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Routes
app.use('/api/products', productRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API de Productos funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`API de Productos corriendo en puerto ${PORT}`);
  console.log(`CORS habilitado para desarrollo`);
  console.log(`Rutas disponibles:`);
  console.log(`   GET    /api/products - Listar todos los productos`);
  console.log(`   GET    /api/products/:id - Obtener producto por ID`);
  console.log(`   POST   /api/products - Crear producto (requiere token)`);
  console.log(`   PUT    /api/products/:id - Actualizar producto (requiere token)`);
  console.log(`   DELETE /api/products/:id - Eliminar producto (requiere token)`);
});