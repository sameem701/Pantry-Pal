const pool = require('../config/db');

const addPantryItem = async (userId, ingredientId, quantity, unit, storageLocation) => {
    const query = `
        SELECT insert_update_pantry_item($1, $2, $3, $4, $5) AS result
    `;
    const { rows } = await pool.query(query, [userId, ingredientId, quantity, unit, storageLocation]);
    return rows[0].result;
};

const getUserPantry = async (userId) => {
    const query = `
        SELECT get_user_pantry($1) AS result
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0].result;
};

const removePantryItem = async (userId, ingredientId) => {
    const query = `
        SELECT remove_pantry_item($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [userId, ingredientId]);
    return rows[0].result;
};

const getAllIngredients = async () => {
    const query = `
        SELECT ingredient_id, ingredient_name, category 
        FROM ingredients 
        ORDER BY ingredient_name ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

const searchIngredients = async (searchTerm) => {
    const query = 'SELECT search_ingredients($1) AS result';
    const { rows } = await pool.query(query, [searchTerm]);
    return rows[0].result;
};

const createPantryItem = async (req, res) => {
    try {
        const { user_id, ingredient_id, quantity, unit, storage_location } = req.body;

        if (!user_id || !ingredient_id || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'user_id, ingredient_id, and quantity are required'
            });
        }

        if (storage_location && !['Fridge', 'Pantry', 'Freezer'].includes(storage_location)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid storage_location. Must be: Fridge, Pantry, or Freezer'
            });
        }

        const result = await addPantryItem(
            Number(user_id),
            Number(ingredient_id),
            quantity,
            unit || 'unit',
            storage_location || 'Pantry'
        );

        return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Add pantry item error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getPantry = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id || Number.isNaN(Number(user_id))) {
            return res.status(400).json({ success: false, message: 'Valid user_id is required' });
        }

        const result = await getUserPantry(Number(user_id));
        return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Get pantry error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updatePantryItem = async (req, res) => {
    try {
        const { user_id, ingredient_id } = req.params;
        const { quantity, unit, storage_location } = req.body;

        if (!user_id || !ingredient_id || Number.isNaN(Number(user_id)) || Number.isNaN(Number(ingredient_id))) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id and ingredient_id are required'
            });
        }

        if (!quantity) {
            return res.status(400).json({ success: false, message: 'Quantity is required' });
        }

        if (storage_location && !['Fridge', 'Pantry', 'Freezer'].includes(storage_location)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid storage_location. Must be: Fridge, Pantry, or Freezer'
            });
        }

        const result = await addPantryItem(
            Number(user_id),
            Number(ingredient_id),
            quantity,
            unit || 'unit',
            storage_location || 'Pantry'
        );

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Update pantry item error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deletePantryItem = async (req, res) => {
    try {
        const { user_id, ingredient_id } = req.params;

        if (!user_id || !ingredient_id || Number.isNaN(Number(user_id)) || Number.isNaN(Number(ingredient_id))) {
            return res.status(400).json({
                success: false,
                message: 'Valid user_id and ingredient_id are required'
            });
        }

        const result = await removePantryItem(Number(user_id), Number(ingredient_id));
        return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Remove pantry item error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const listIngredients = async (req, res) => {
    try {
        const result = await getAllIngredients();
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get all ingredients error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const searchIngredientOptions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Search term (q) is required' });
        }

        const result = await searchIngredients(q);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Search ingredients error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    addPantryItem,
    getUserPantry,
    removePantryItem,
    getAllIngredients,
    searchIngredients,
    createPantryItem,
    getPantry,
    updatePantryItem,
    deletePantryItem,
    listIngredients,
    searchIngredientOptions
};