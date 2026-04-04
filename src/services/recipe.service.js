const pool = require('../config/db');

// 1. Search recipes by available pantry ingredients
const searchRecipesByPantry = async (userId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const query = `
        SELECT search_recipes_by_pantry($1, $2, $3) AS result
    `;
    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows[0].result;
};

// 2. Browse recipes with filters
const browseRecipes = async (userId, filters = {}, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const { difficulty, cuisineId, dietaryPreference, sortBy } = filters;

    const query = `
        SELECT browse_recipes(
            $1, $2, $3, $4, $5, $6, $7, $8
        ) AS result
    `;
    const { rows } = await pool.query(query, [
        userId,
        difficulty || null,
        cuisineId || null,
        dietaryPreference || null,
        sortBy || 'trending',
        limit,
        offset,
        false  // my_recipes flag
    ]);
    return rows[0].result;
};

// 3. Get recipe details
const getRecipeDetails = async (recipeId, userId = null) => {
    const query = `
        SELECT get_recipe_details($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [recipeId, userId]);
    return rows[0].result;
};

// 4. Get all cuisines
const getAllCuisines = async () => {
    const query = `
        SELECT cuisine_id, name FROM cuisines ORDER BY name ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

// 5. Get all dietary preferences
const getAllDietaryPreferences = async () => {
    const query = `
        SELECT get_all_dietary_preferences() AS result
    `;
    const { rows } = await pool.query(query);
    return rows[0].result;
};

module.exports = {
    searchRecipesByPantry,
    browseRecipes,
    getRecipeDetails,
    getAllCuisines,
    getAllDietaryPreferences
};
