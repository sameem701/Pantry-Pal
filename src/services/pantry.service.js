const pool = require('../config/db');

// 1. Add ingredient to pantry
const addPantryItem = async (userId, ingredientId, quantity, unit, storageLocation) => {
    const query = `
        SELECT upsert_pantry_item($1, $2, $3, $4, $5) AS result
    `;
    const { rows } = await pool.query(query, [userId, ingredientId, quantity, unit, storageLocation]);
    return rows[0].result;
};

// 2. Get all pantry items for user
const getUserPantry = async (userId) => {
    const query = `
        SELECT get_user_pantry($1) AS result
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0].result;
};

// 3. Remove ingredient from pantry
const removePantryItem = async (userId, ingredientId) => {
    const query = `
        SELECT remove_pantry_item($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [userId, ingredientId]);
    return rows[0].result;
};

// 4. Get all available ingredients
const getAllIngredients = async () => {
    const query = `
        SELECT ingredient_id, ingredient_name, category 
        FROM ingredients 
        ORDER BY ingredient_name ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

// 5. Search ingredients by name
const searchIngredients = async (searchTerm) => {
    const query = `
        SELECT ingredient_id, ingredient_name, category 
        FROM ingredients 
        WHERE ingredient_name ILIKE $1 
        ORDER BY ingredient_name ASC
    `;
    const { rows } = await pool.query(query, [`%${searchTerm}%`]);
    return rows;
};

module.exports = {
    addPantryItem,
    getUserPantry,
    removePantryItem,
    getAllIngredients,
    searchIngredients
};
