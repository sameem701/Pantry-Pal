const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const svc = require('../controllers/recipeController');

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

/**
 * GET /api/recipes/:recipe_id
 * Get detailed recipe information
 * Params: recipe_id
 * Query: user_id (optional - to check if user favorited it)
 */
router.get('/:recipe_id', recipeController.getDetails);

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
// BASIC CRUD ROUTES (from workflow2)
// ============================================================

router.get('/', async (req, res) => {
  try {
    const recipes = await svc.getAllRecipes(req.query);
    res.json({ success: true, data: recipes });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await svc.getRecipeById(
      Number(req.params.id),
      req.query.userId ? Number(req.query.userId) : null
    );
    if (!recipe) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: recipe });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const recipe = await svc.createRecipe(req.body);
    res.status(201).json({ success: true, data: recipe });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const recipe = await svc.updateRecipe(Number(req.params.id), req.body);
    res.json({ success: true, data: recipe });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await svc.deleteRecipe(
      Number(req.params.id),
      req.body.userId ?? req.body.authorId ?? req.query.userId
    );
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;