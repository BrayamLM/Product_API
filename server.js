// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
require('dotenv').config();

const app = express();

// ============= MIDDLEWARE DE LOGGING MEJORADO =============
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(`📍 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`🌐 Origin: ${req.headers.origin || 'Sin origin'}`);
  console.log(`🔑 Authorization: ${req.headers.authorization ? 'Presente ✓' : 'Ausente ✗'}`);
  console.log(`📦 Content-Type: ${req.headers['content-type'] || 'No especificado'}`);
  
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`📄 Body recibido:`, JSON.stringify(req.body, null, 2));
  }
  
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 Query params:`, req.query);
  }
  
  console.log('='.repeat(80));
  
  // Log de la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 Respuesta enviada: Status ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log(`❌ Error Response:`, typeof data === 'string' ? data : JSON.stringify(JSON.parse(data), null, 2));
    }
    originalSend.apply(res, arguments);
  };
  
  next();
});

// ============= CORS CONFIGURADO CON LOGS =============
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`🔐 CORS Check - Origin recibido: ${origin || 'Sin origin'}`);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite
      'https://impertula.com'
    ];
    
    // Permitir peticiones sin origin (herramientas de desarrollo como Postman)
    if (!origin) {
      console.log('✅ CORS: Permitido (sin origin - herramienta de desarrollo)');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS: Permitido (origin en whitelist)');
      callback(null, true);
    } else {
      console.log('⚠️  CORS: Origin no está en whitelist pero permitido (modo desarrollo)');
      callback(null, true); // Para desarrollo, acepta todo. En producción, cambia esto
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.use(cors(corsOptions));

// ============= MIDDLEWARE CON LOGS =============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log de errores de parsing JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ ERROR DE PARSING JSON:');
    console.error('   Body recibido:', req.body);
    console.error('   Error:', err.message);
    return res.status(400).json({
      success: false,
      error: 'JSON mal formado',
      details: err.message
    });
  }
  next(err);
});

// ============= MONGODB CONNECTION CON LOGS =============
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERROR CRÍTICO: Falta la variable MONGODB_URI en .env');
  process.exit(1);
}

console.log('🔄 Intentando conectar a MongoDB...');
console.log(`📍 URI: ${MONGODB_URI.substring(0, 20)}...`);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB exitosamente');
    console.log(`📊 Base de datos: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
  })
  .catch(err => {
    console.error('❌ ERROR CONECTANDO A MONGODB:');
    console.error('   Mensaje:', err.message);
    console.error('   Stack:', err.stack);
    process.exit(1);
  });

// Eventos de MongoDB
mongoose.connection.on('error', err => {
  console.error('❌ ERROR DE MONGODB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB desconectado');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconectado');
});

// ============= ROUTES =============
app.use('/api/products', productRoutes);

// ============= HEALTH CHECK =============
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    message: 'API de Productos funcionando correctamente',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  console.log('💊 Health check solicitado:', health);
  res.json(health);
});

// ============= ERROR HANDLERS =============

// Error handler general
app.use((err, req, res, next) => {
  console.error('\n' + '🔥'.repeat(40));
  console.error('❌ ERROR NO CONTROLADO:');
  console.error('   Ruta:', req.method, req.path);
  console.error('   Mensaje:', err.message);
  console.error('   Stack:', err.stack);
  console.error('   Body:', req.body);
  console.error('🔥'.repeat(40) + '\n');
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️  Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// ============= INICIAR SERVIDOR =============
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log('\n' + '🚀'.repeat(40));
  console.log(`✅ API de Productos corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS habilitado para desarrollo`);
  console.log(`📅 Iniciado: ${new Date().toISOString()}`);
  console.log('\n📋 Rutas disponibles:');
  console.log('   GET    /api/health');
  console.log('   GET    /api/products - Listar todos los productos');
  console.log('   GET    /api/products/:id - Obtener producto por ID');
  console.log('   POST   /api/products - Crear producto (requiere token)');
  console.log('   PUT    /api/products/:id - Actualizar producto (requiere token)');
  console.log('   DELETE /api/products/:id - Eliminar producto (requiere token)');
  console.log('🚀'.repeat(40) + '\n');
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recibido. Cerrando servidor...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB desconectado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT recibido. Cerrando servidor...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB desconectado');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ PROMESA RECHAZADA NO MANEJADA:');
  console.error('   Razón:', reason);
  console.error('   Promesa:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('❌ EXCEPCIÓN NO CAPTURADA:');
  console.error('   Error:', error);
  console.error('   Stack:', error.stack);
  process.exit(1);
});