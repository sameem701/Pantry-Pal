const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// ============================================================
// RECIPE SEARCH & DISCOVERY ROUTES (from workflow1)
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

// ============================================================
// RECIPE FILTER OPTIONS ROUTES (from workflow1)
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

// ============================================================
// INTERACTIVE COOKING + FAVOURITES + REVIEWS (workflow2)
// ============================================================

router.get('/favourites/:user_id', recipeController.listFavourites);
router.post('/:recipe_id/favourite', recipeController.toggleFavouriteHandler);
router.get('/:recipe_id/reviews', recipeController.listRecipeReviewsHandler);
router.post('/:recipe_id/reviews', recipeController.upsertReviewHandler);
router.delete('/:recipe_id/reviews', recipeController.deleteReviewHandler);
router.post('/:recipe_id/cooking-sessions', recipeController.startCookingSessionHandler);
router.get('/cooking-sessions/:session_id', recipeController.getCookingSessionHandler);
router.patch('/cooking-sessions/:session_id/step', recipeController.updateCookingStepHandler);
router.patch('/cooking-sessions/:session_id/complete', recipeController.completeCookingSessionHandler);

/**
 * GET /api/recipes/:recipe_id
 * Get detailed recipe information
 * Params: recipe_id
 * Query: user_id (optional - to check if user favorited it)
 */
router.get('/:recipe_id', recipeController.getDetails);

// ============================================================
// BASIC CRUD ROUTES (from workflow2)
// ============================================================

router.get('/', recipeController.getAll);
router.post('/', recipeController.create);
router.put('/:id', recipeController.update);
router.delete('/:id', recipeController.remove);

module.exports = router;