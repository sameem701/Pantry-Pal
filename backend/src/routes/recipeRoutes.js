const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// ============================================================
// RECIPE SEARCH & DISCOVERY ROUTES
// ============================================================

/**
 * GET /api/recipes/search-by-pantry/:user_id
 * Search recipes based on user's pantry ingredients
 * Params: user_id
 * Query: page (default: 1), limit (default: 10)
 */
router.get('/search-by-pantry/:user_id', recipeController.searchByPantry);

/**
 * GET /api/recipes/browse
 * Browse recipes with filters
 * Query:
 *   - user_id (required): user making the request
 *   - difficulty: Easy, Medium, Hard
 *   - cuisine_id: filter by cuisine
 *   - dietary_preference: filter by dietary tag
 *   - sort_by: trending, newest, rating (default: trending)
 *   - page: pagination (default: 1)
 *   - limit: results per page (default: 10)
 */
router.get('/browse', recipeController.browse);

/**
 * GET /api/recipes/:recipe_id
 * Get detailed recipe information
 * Params: recipe_id
 * Query: user_id (optional - to check if user favorited it)
 */
router.get('/:recipe_id', recipeController.getDetails);

// ============================================================
// RECIPE FILTER OPTIONS ROUTES
// ============================================================

/**
 * GET /api/recipes/options/cuisines
 * Get all available cuisines for filtering
 */
router.get('/options/cuisines', recipeController.listCuisineOptions);

/**
 * GET /api/recipes/options/dietary-preferences
 * Get all available dietary preferences for filtering
 */
router.get('/options/dietary-preferences', recipeController.listDietaryOptions);

module.exports = router;
