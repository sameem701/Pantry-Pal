const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'PantryPal Backend is running',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ROUTE IMPORTS
// ============================================================

const userRoutes = require('./routes/user.routes');
const pantryRoutes = require('./routes/pantry.routes');
const recipeRoutes = require('./routes/recipe.routes');

// ============================================================
// ROUTE REGISTRATION
// ============================================================

app.use('/api/users', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipeRoutes);

// ============================================================
// API DOCUMENTATION ROUTE
// ============================================================

app.get('/api/docs', (req, res) => {
    res.json({
        name: 'PantryPal API',
        version: '1.0.0',
        description: 'Smart cooking assistant backend API',
        baseUrl: '/api',
        endpoints: {
            users: {
                'POST /users/register': 'Register new user',
                'POST /users/verify': 'Verify email and create account',
                'POST /users/login': 'Login user',
                'GET /users/:id': 'Get user profile',
                'PUT /users/:id': 'Update user profile',
                'GET /users/preferences/dietary': 'Get dietary preferences',
                'GET /users/preferences/cuisines': 'Get cuisines',
                'POST /users/forgot-password': 'Request password reset',
                'POST /users/reset-password': 'Reset password'
            },
            pantry: {
                'POST /pantry': 'Add ingredient to pantry',
                'GET /pantry/:user_id': 'Get user pantry',
                'PUT /pantry/:user_id/:ingredient_id': 'Update pantry item',
                'DELETE /pantry/:user_id/:ingredient_id': 'Remove from pantry',
                'GET /pantry/ingredients/all': 'Get all ingredients',
                'GET /pantry/ingredients/search?q=term': 'Search ingredients'
            },
            recipes: {
                'GET /recipes/search-by-pantry/:user_id': 'Search recipes by pantry',
                'GET /recipes/browse': 'Browse recipes with filters',
                'GET /recipes/:recipe_id': 'Get recipe details',
                'GET /recipes/options/cuisines': 'Get cuisines',
                'GET /recipes/options/dietary-preferences': 'Get dietary preferences'
            }
        }
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 Not Found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = app;
