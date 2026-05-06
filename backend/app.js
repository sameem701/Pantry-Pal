const express = require('express');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const pantryRoutes = require('./routes/pantryRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const mealPlannerRoutes = require('./routes/mealPlannerRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Workflow 3 routes
app.use('/api/meal-plans', mealPlannerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/upload', uploadRoutes);

module.exports = app;
