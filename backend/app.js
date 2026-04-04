const express = require('express');
const mealPlannerRoutes = require('./routes/mealPlannerRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Workflow 3 routes
app.use('/api/meal-plans', mealPlannerRoutes);

module.exports = app;
