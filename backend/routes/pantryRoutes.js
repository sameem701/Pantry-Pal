const express = require('express');
const router = express.Router();
const pantryController = require('../controllers/pantryController');

// ============================================================
// PANTRY MANAGEMENT ROUTES
// ============================================================

/**
 * POST /api/pantry
 * Add ingredient to pantry
 * Body: { user_id, ingredient_id, quantity, unit, storage_location }
 */
router.post('/', pantryController.createPantryItem);

/**
 * GET /api/pantry/ingredients/all
 * Get all available ingredients
 */
router.get('/ingredients/all', pantryController.listIngredients);

/**
 * GET /api/pantry/ingredients/search?q=term
 * Search ingredients by name
 * Query: q (search term)
 */
router.get('/ingredients/search', pantryController.searchIngredientOptions);

/**
 * GET /api/pantry/:user_id
 * Get all pantry items for a user
 * Params: user_id
 */
router.get('/:user_id', pantryController.getPantry);

/**
 * PUT /api/pantry/:user_id/:ingredient_id
 * Update pantry item (quantity/storage location)
 * Params: user_id, ingredient_id
 * Body: { quantity, unit, storage_location }
 */
router.put('/:user_id/:ingredient_id', pantryController.updatePantryItem);

/**
 * DELETE /api/pantry/:user_id/:ingredient_id
 * Remove ingredient from pantry
 * Params: user_id, ingredient_id
 */
router.delete('/:user_id/:ingredient_id', pantryController.deletePantryItem);

module.exports = router;
