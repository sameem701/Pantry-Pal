const pool = require('../config/db');

const toIntegerArray = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => Number(entry)).filter(Number.isFinite);
    }

    if (typeof value === 'string') {
        if (!value.trim()) {
            return [];
        }

        return value
            .split(',')
            .map((entry) => Number(entry.trim()))
            .filter(Number.isFinite);
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? [numericValue] : [];
};

const searchRecipesByPantry = async (userId, { cuisineIds = null, difficulty = null, maxMissing = null } = {}, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const numericMaxMissing = maxMissing !== null && maxMissing !== undefined && Number.isFinite(Number(maxMissing))
        ? Number(maxMissing)
        : null;
    const query = `
        SELECT search_recipes_by_pantry($1, $2, $3, $4, $5, $6) AS result
    `;
    const { rows } = await pool.query(query, [
        userId,
        toIntegerArray(cuisineIds),
        difficulty || null,
        numericMaxMissing,
        limit,
        offset
    ]);
    return rows[0].result;
};

const browseRecipes = async (userId, filters = {}, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const {
        searchTerm = null,
        cuisineIds = null,
        difficulty = null,
        creatorId = null
    } = filters;
    const numericCreatorId = creatorId !== null && creatorId !== undefined && Number.isFinite(Number(creatorId))
        ? Number(creatorId)
        : null;

    const query = `
        SELECT browse_recipes($1, $2, $3, $4, $5, $6, $7) AS result
    `;
    const { rows } = await pool.query(query, [
        userId,
        searchTerm,
        toIntegerArray(cuisineIds),
        difficulty || null,
        numericCreatorId,
        limit,
        offset
    ]);
    return rows[0].result;
};

const getRecipeDetails = async (recipeId, userId = null) => {
    const query = `
        SELECT get_recipe_details($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [recipeId, userId]);
    return rows[0].result;
};

const getAllCuisines = async () => {
    const query = 'SELECT get_all_cuisines() AS result';
    const { rows } = await pool.query(query);
    return rows[0].result;
};

const getAllDietaryPreferences = async () => {
    const query = `
        SELECT get_all_dietary_preferences() AS result
    `;
    const { rows } = await pool.query(query);
    return rows[0].result;
};

const searchByPantry = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10, cuisine_ids, cuisine_id, difficulty, max_missing } = req.query;

        if (!user_id || Number.isNaN(Number(user_id))) {
            return res.status(400).json({ success: false, message: 'Valid user_id is required' });
        }

        if (Number.isNaN(Number(page)) || Number.isNaN(Number(limit))) {
            return res.status(400).json({
                success: false,
                message: 'page and limit must be valid numbers'
            });
        }

        const result = await searchRecipesByPantry(
            Number(user_id),
            {
                cuisineIds: cuisine_ids || cuisine_id || null,
                difficulty: difficulty || null,
                maxMissing: max_missing
            },
            Number(page),
            Number(limit)
        );

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Search recipes by pantry error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const browse = async (req, res) => {
    try {
        const {
            user_id,
            difficulty,
            cuisine_ids,
            cuisine_id,
            creator_id,
            search_term,
            q,
            page = 1,
            limit = 10
        } = req.query;

        if (!user_id || Number.isNaN(Number(user_id))) {
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

        if (Number.isNaN(Number(page)) || Number.isNaN(Number(limit))) {
            return res.status(400).json({
                success: false,
                message: 'page and limit must be valid numbers'
            });
        }

        const result = await browseRecipes(
            Number(user_id),
            {
                searchTerm: search_term || q || null,
                cuisineIds: cuisine_ids || cuisine_id || null,
                difficulty: difficulty || null,
                creatorId: creator_id || null
            },
            Number(page),
            Number(limit)
        );

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Browse recipes error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getDetails = async (req, res) => {
    try {
        const { recipe_id } = req.params;
        const { user_id } = req.query;

        if (!recipe_id || Number.isNaN(Number(recipe_id))) {
            return res.status(400).json({ success: false, message: 'Valid recipe_id is required' });
        }

        const result = await getRecipeDetails(Number(recipe_id), user_id ? Number(user_id) : null);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Get recipe details error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const listCuisineOptions = async (req, res) => {
    try {
        const result = await getAllCuisines();
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Get cuisines error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const listDietaryOptions = async (req, res) => {
    try {
        const result = await getAllDietaryPreferences();
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Get dietary preferences error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    searchRecipesByPantry,
    browseRecipes,
    getRecipeDetails,
    getAllCuisines,
    getAllDietaryPreferences,
    searchByPantry,
    browse,
    getDetails,
    listCuisineOptions,
    listDietaryOptions
};