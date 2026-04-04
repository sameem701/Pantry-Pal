const express = require('express');
const router = express.Router();
const pantryService = require('../services/pantry.service');

// ============================================================
// PANTRY MANAGEMENT ROUTES
// ============================================================

/**
 * POST /api/pantry
 * Add ingredient to pantry
 * Body: { user_id, ingredient_id, quantity, unit, storage_location }
 */
router.post('/', async (req, res) => {
    try {
        const { user_id, ingredient_id, quantity, unit, storage_location } = req.body;

        if (!user_id || !ingredient_id || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'user_id, ingredient_id, and quantity are required'
            });
        }

        if (!['Fridge', 'Pantry', 'Freezer'].includes(storage_location)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid storage_location. Must be: Fridge, Pantry, or Freezer'
            });
        }

        const result = await pantryService.addPantryItem(
            user_id,
            ingredient_id,
            quantity,
            unit || 'unit',
            storage_location || 'Pantry'
        );

        res.status(201).json({
            success: true,
            message: 'Ingredient added to pantry',
            data: result
        });
    } catch (error) {
        console.error('Add pantry item error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * GET /api/pantry/:user_id
 * Get all pantry items for a user
 * Params: user_id
 */
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id is required'
            });
        }

        const result = await pantryService.getUserPantry(parseInt(user_id));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get pantry error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * PUT /api/pantry/:user_id/:ingredient_id
 * Update pantry item (quantity/storage location)
 * Params: user_id, ingredient_id
 * Body: { quantity, unit, storage_location }
 */
router.put('/:user_id/:ingredient_id', async (req, res) => {
    try {
        const { user_id, ingredient_id } = req.params;
        const { quantity, unit, storage_location } = req.body;

        if (!user_id || !ingredient_id || isNaN(user_id) || isNaN(ingredient_id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id and ingredient_id are required'
            });
        }

        if (!quantity) {
            return res.status(400).json({
                success: false,
                message: 'Quantity is required'
            });
        }

        if (storage_location && !['Fridge', 'Pantry', 'Freezer'].includes(storage_location)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid storage_location. Must be: Fridge, Pantry, or Freezer'
            });
        }

        const result = await pantryService.addPantryItem(
            parseInt(user_id),
            parseInt(ingredient_id),
            quantity,
            unit || 'unit',
            storage_location || 'Pantry'
        );

        res.json({
            success: true,
            message: 'Pantry item updated',
            data: result
        });
    } catch (error) {
        console.error('Update pantry item error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * DELETE /api/pantry/:user_id/:ingredient_id
 * Remove ingredient from pantry
 * Params: user_id, ingredient_id
 */
router.delete('/:user_id/:ingredient_id', async (req, res) => {
    try {
        const { user_id, ingredient_id } = req.params;

        if (!user_id || !ingredient_id || isNaN(user_id) || isNaN(ingredient_id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id and ingredient_id are required'
            });
        }

        const result = await pantryService.removePantryItem(
            parseInt(user_id),
            parseInt(ingredient_id)
        );

        res.json({
            success: true,
            message: 'Ingredient removed from pantry',
            data: result
        });
    } catch (error) {
        console.error('Remove pantry item error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================================
// INGREDIENT MANAGEMENT ROUTES
// ============================================================

/**
 * GET /api/pantry/ingredients/all
 * Get all available ingredients
 */
router.get('/ingredients/all', async (req, res) => {
    try {
        const result = await pantryService.getAllIngredients();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get all ingredients error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * GET /api/pantry/ingredients/search?q=term
 * Search ingredients by name
 * Query: q (search term)
 */
router.get('/ingredients/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search term (q) is required'
            });
        }

        const result = await pantryService.searchIngredients(q);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Search ingredients error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
