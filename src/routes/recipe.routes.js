const express = require('express');
const router = express.Router();
const recipeService = require('../services/recipe.service');

// ============================================================
// RECIPE SEARCH & DISCOVERY ROUTES
// ============================================================

/**
 * GET /api/recipes/search-by-pantry/:user_id
 * Search recipes based on user's pantry ingredients
 * Params: user_id
 * Query: page (default: 1), limit (default: 10)
 */
router.get('/search-by-pantry/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id is required'
            });
        }

        if (isNaN(page) || isNaN(limit)) {
            return res.status(400).json({
                success: false,
                message: 'page and limit must be valid numbers'
            });
        }

        const result = await recipeService.searchRecipesByPantry(
            parseInt(user_id),
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            data: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Search recipes by pantry error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

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
router.get('/browse', async (req, res) => {
    try {
        const {
            user_id,
            difficulty,
            cuisine_id,
            dietary_preference,
            sort_by = 'trending',
            page = 1,
            limit = 10
        } = req.query;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'user_id query parameter is required'
            });
        }

        if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: 'difficulty must be: Easy, Medium, or Hard'
            });
        }

        if (isNaN(page) || isNaN(limit)) {
            return res.status(400).json({
                success: false,
                message: 'page and limit must be valid numbers'
            });
        }

        const filters = {
            difficulty: difficulty || null,
            cuisineId: cuisine_id ? parseInt(cuisine_id) : null,
            dietaryPreference: dietary_preference ? parseInt(dietary_preference) : null,
            sortBy: sort_by || 'trending'
        };

        const result = await recipeService.browseRecipes(
            parseInt(user_id),
            filters,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            data: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            },
            filters: filters
        });
    } catch (error) {
        console.error('Browse recipes error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * GET /api/recipes/:recipe_id
 * Get detailed recipe information
 * Params: recipe_id
 * Query: user_id (optional - to check if user favorited it)
 */
router.get('/:recipe_id', async (req, res) => {
    try {
        const { recipe_id } = req.params;
        const { user_id } = req.query;

        if (!recipe_id || isNaN(recipe_id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid recipe_id is required'
            });
        }

        const result = await recipeService.getRecipeDetails(
            parseInt(recipe_id),
            user_id ? parseInt(user_id) : null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get recipe details error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================================
// RECIPE FILTER OPTIONS ROUTES
// ============================================================

/**
 * GET /api/recipes/options/cuisines
 * Get all available cuisines for filtering
 */
router.get('/options/cuisines', async (req, res) => {
    try {
        const result = await recipeService.getAllCuisines();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get cuisines error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * GET /api/recipes/options/dietary-preferences
 * Get all available dietary preferences for filtering
 */
router.get('/options/dietary-preferences', async (req, res) => {
    try {
        const result = await recipeService.getAllDietaryPreferences();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get dietary preferences error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
