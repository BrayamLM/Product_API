// routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ============= RUTAS PÚBLICAS =============

// GET - Obtener todos los productos
router.get('/', async (req, res) => {
  console.log('🔍 GET /api/products - Obteniendo lista de productos');
  
  try {
    const startTime = Date.now();
    const products = await Product.find().sort({ createdAt: -1 });
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Productos obtenidos: ${products.length} productos en ${queryTime}ms`);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('❌ ERROR obteniendo productos:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Nombre:', error.name);
    
    res.status(500).json({
      success: false,
      error: 'Error al obtener los productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET - Obtener un producto por ID
router.get('/:id', async (req, res) => {
  console.log(`🔍 GET /api/products/${req.params.id} - Buscando producto por ID`);
  
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.warn(`⚠️  Producto no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        id: req.params.id
      });
    }
    
    console.log(`✅ Producto encontrado: ${product.name}`);
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`❌ ERROR obteniendo producto ${req.params.id}:`);
    console.error('   Mensaje:', error.message);
    console.error('   Tipo:', error.kind);
    console.error('   Stack:', error.stack);
    
    if (error.kind === 'ObjectId') {
      console.error('   ⚠️  ID inválido de MongoDB');
      return res.status(400).json({
        success: false,
        error: 'ID de producto inválido',
        id: req.params.id
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al obtener el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============= RUTAS PROTEGIDAS (requieren autenticación) =============

// POST - Crear un nuevo producto (requiere token)
router.post('/', authenticateToken, async (req, res) => {
  console.log('📝 POST /api/products - Crear nuevo producto');
  console.log('   Usuario autenticado:', req.user?.email || 'No disponible');
  console.log('   Datos recibidos:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      name,
      category,
      description,
      image,
      brand,
      rating,
      fullDescription,
      features,
      applications,
      specifications
    } = req.body;

    // Validación básica con logs detallados
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!category) missingFields.push('category');
    if (!description) missingFields.push('description');
    if (!image) missingFields.push('image');
    if (!fullDescription) missingFields.push('fullDescription');

    if (missingFields.length > 0) {
      console.error('❌ Validación fallida - Campos faltantes:', missingFields);
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        missingFields
      });
    }

    console.log('✅ Validación inicial pasada');
    console.log('📦 Creando objeto producto...');

    // Crear nuevo producto
    const product = new Product({
      name,
      category,
      description,
      image,
      brand: brand || 'Fester',
      rating: rating || 5,
      fullDescription,
      features: features || [],
      applications: applications || [],
      specifications: specifications || {
        presentation: '',
        coverage: '',
        dryingTime: '',
        colors: ''
      }
    });

    console.log('💾 Guardando producto en la base de datos...');
    const savedProduct = await product.save();
    console.log(`✅ Producto guardado exitosamente con ID: ${savedProduct._id}`);
    console.log(`   Nombre: ${savedProduct.name}`);
    console.log(`   Categoría: ${savedProduct.category}`);
    console.log(`   Usuario: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: savedProduct
    });
  } catch (error) {
    console.error('❌ ERROR creando producto:');
    console.error('   Nombre del error:', error.name);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      console.error('   ⚠️  Error de validación de Mongoose:');
      const validationErrors = Object.values(error.errors).map(err => {
        console.error(`      - ${err.path}: ${err.message}`);
        return { field: err.path, message: err.message };
      });
      
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        validationErrors
      });
    }
    
    if (error.code === 11000) {
      console.error('   ⚠️  Error de duplicado (código 11000):');
      console.error('      Campo duplicado:', error.keyValue);
      return res.status(400).json({
        success: false,
        error: 'Ya existe un producto con esos datos',
        duplicateField: Object.keys(error.keyValue)[0]
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al crear el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT - Actualizar un producto (requiere token)
router.put('/:id', authenticateToken, async (req, res) => {
  console.log(`📝 PUT /api/products/${req.params.id} - Actualizar producto`);
  console.log('   Usuario autenticado:', req.user?.email || 'No disponible');
  console.log('   Datos a actualizar:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('🔍 Buscando producto...');
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.warn(`⚠️  Producto no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        id: req.params.id
      });
    }

    console.log(`✅ Producto encontrado: ${product.name}`);
    console.log('📝 Aplicando actualizaciones...');

    // Actualizar campos
    const allowedUpdates = [
      'name',
      'category',
      'description',
      'image',
      'brand',
      'rating',
      'fullDescription',
      'features',
      'applications',
      'specifications'
    ];

    const updatedFields = [];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        const oldValue = product[field];
        product[field] = req.body[field];
        updatedFields.push(field);
        console.log(`   ✓ ${field} actualizado`);
        if (process.env.NODE_ENV === 'development') {
          console.log(`      Anterior: ${JSON.stringify(oldValue)}`);
          console.log(`      Nuevo: ${JSON.stringify(req.body[field])}`);
        }
      }
    });

    console.log(`📊 Campos actualizados: ${updatedFields.join(', ')}`);
    console.log('💾 Guardando cambios...');
    
    const savedProduct = await product.save();
    console.log(`✅ Producto actualizado exitosamente`);
    console.log(`   ID: ${savedProduct._id}`);
    console.log(`   Usuario: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      updatedFields,
      data: savedProduct
    });
  } catch (error) {
    console.error(`❌ ERROR actualizando producto ${req.params.id}:`);
    console.error('   Nombre del error:', error.name);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.kind === 'ObjectId') {
      console.error('   ⚠️  ID inválido de MongoDB');
      return res.status(400).json({
        success: false,
        error: 'ID de producto inválido',
        id: req.params.id
      });
    }
    
    if (error.name === 'ValidationError') {
      console.error('   ⚠️  Error de validación de Mongoose:');
      const validationErrors = Object.values(error.errors).map(err => {
        console.error(`      - ${err.path}: ${err.message}`);
        return { field: err.path, message: err.message };
      });
      
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE - Eliminar un producto (requiere token)
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log(`🗑️  DELETE /api/products/${req.params.id} - Eliminar producto`);
  console.log('   Usuario autenticado:', req.user?.email || 'No disponible');
  
  try {
    console.log('🔍 Buscando producto...');
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.warn(`⚠️  Producto no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        id: req.params.id
      });
    }

    console.log(`✅ Producto encontrado: ${product.name}`);
    console.log('🗑️  Eliminando producto...');
    
    await Product.findByIdAndDelete(req.params.id);

    console.log(`✅ Producto eliminado exitosamente`);
    console.log(`   ID: ${req.params.id}`);
    console.log(`   Nombre: ${product.name}`);
    console.log(`   Usuario: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      deletedProduct: {
        id: product._id,
        name: product.name,
        category: product.category
      }
    });
  } catch (error) {
    console.error(`❌ ERROR eliminando producto ${req.params.id}:`);
    console.error('   Nombre del error:', error.name);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.kind === 'ObjectId') {
      console.error('   ⚠️  ID inválido de MongoDB');
      return res.status(400).json({
        success: false,
        error: 'ID de producto inválido',
        id: req.params.id
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;