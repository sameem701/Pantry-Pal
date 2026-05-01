const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

/**
 * POST /api/nutrition/log
 * Log a cooked recipe to the daily nutrition log
 * Body: { user_id, recipe_id }
 */
router.post('/log', recipeController.logNutritionHandler);

/**
 * GET /api/nutrition/log/:user_id
 * Get nutrition log for a user on a given date
 * Query: date (YYYY-MM-DD, defaults to today)
 */
router.get('/log/:user_id', recipeController.getDailyNutritionLogHandler);

module.exports = router;
