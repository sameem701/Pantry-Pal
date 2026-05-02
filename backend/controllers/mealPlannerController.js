const db = require('../config/database');
const PDFDocument = require('pdfkit');

// ── Meals ─────────────────────────────────────────────────────────────────────

const getMealsForRange = async (req, res) => {
    const userId = Number(req.query.user_id);
    const start  = req.query.start;
    const end    = req.query.end;

    if (!userId || !start || !end) {
        return res.status(400).json({ success: false, message: 'user_id, start, and end are required' });
    }

    try {
        const result = await db.query('SELECT get_meals_for_range($1, $2, $3) AS response', [userId, start, end]);
        return res.status(200).json(result.rows[0]?.response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const upsertMeal = async (req, res) => {
    const { user_id, date, meal_type, recipe_id } = req.body;

    if (!user_id || !date || !meal_type || !recipe_id) {
        return res.status(400).json({ success: false, message: 'user_id, date, meal_type, and recipe_id are required' });
    }

    try {
        const result = await db.query(
            'SELECT upsert_daily_meal($1, $2, $3, $4) AS response',
            [user_id, date, meal_type, recipe_id]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const removeMeal = async (req, res) => {
    const { user_id, date, meal_type } = req.body;

    if (!user_id || !date || !meal_type) {
        return res.status(400).json({ success: false, message: 'user_id, date, and meal_type are required' });
    }

    try {
        const result = await db.query(
            'SELECT remove_daily_meal($1, $2, $3) AS response',
            [user_id, date, meal_type]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(404).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const clearMealsForDate = async (req, res) => {
    const { user_id, date } = req.body;

    if (!user_id || !date) {
        return res.status(400).json({ success: false, message: 'user_id and date are required' });
    }

    try {
        const result = await db.query('SELECT clear_meals_for_date($1, $2) AS response', [user_id, date]);
        return res.status(200).json(result.rows[0]?.response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const markMealCooked = async (req, res) => {
    const { user_id, date, meal_type } = req.body;

    if (!user_id || !date || !meal_type) {
        return res.status(400).json({ success: false, message: 'user_id, date, and meal_type are required' });
    }

    try {
        const result = await db.query(
            'SELECT mark_daily_meal_cooked($1, $2, $3) AS response',
            [user_id, date, meal_type]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Suggestions ───────────────────────────────────────────────────────────────

const suggestMeals = async (req, res) => {
    const { user_id, start_date, days = 7 } = req.body;

    if (!user_id || !start_date) {
        return res.status(400).json({ success: false, message: 'user_id and start_date are required' });
    }

    try {
        const result = await db.query(
            'SELECT suggest_meals_for_dates($1, $2, $3) AS response',
            [user_id, start_date, Number(days)]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Missing ingredients ───────────────────────────────────────────────────────

const getMissingIngredients = async (req, res) => {
    const userId = Number(req.query.user_id);
    const start  = req.query.start;
    const end    = req.query.end;

    if (!userId || !start || !end) {
        return res.status(400).json({ success: false, message: 'user_id, start, and end are required' });
    }

    try {
        const result = await db.query(
            'SELECT get_missing_ingredients_for_range($1, $2, $3) AS response',
            [userId, start, end]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Nutrition ─────────────────────────────────────────────────────────────────

const getNutritionForRange = async (req, res) => {
    const userId = Number(req.query.user_id);
    const start  = req.query.start;
    const end    = req.query.end;

    if (!userId || !start || !end) {
        return res.status(400).json({ success: false, message: 'user_id, start, and end are required' });
    }

    try {
        const result = await db.query(
            'SELECT get_nutrition_for_range($1, $2, $3) AS response',
            [userId, start, end]
        );
        return res.status(200).json(result.rows[0]?.response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getRecipeNutrition = async (req, res) => {
    const recipeId = Number(req.params.recipeId);
    if (!recipeId) return res.status(400).json({ success: false, message: 'recipeId param is required' });

    try {
        const result = await db.query('SELECT get_recipe_nutrition($1) AS response', [recipeId]);
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(404).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Shopping list ─────────────────────────────────────────────────────────────

const saveShoppingList = async (req, res) => {
    const { user_id, items, name } = req.body;

    if (!user_id || !Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'user_id and items array are required' });
    }

    try {
        const result = await db.query(
            'SELECT save_ai_shopping_list($1, $2::json, $3) AS response',
            [user_id, JSON.stringify(items), name || null]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getShoppingListItemsHelper = async (listId, userId) => {
    const listResult = await db.query(
        'SELECT list_id FROM shopping_lists WHERE list_id = $1 AND user_id = $2 LIMIT 1',
        [listId, userId]
    );
    if (listResult.rowCount === 0) return { found: false, items: [] };

    const itemsResult = await db.query(
        'SELECT ingredient_name, quantity, category, is_checked FROM shopping_list_items WHERE list_id = $1 ORDER BY category, ingredient_name',
        [listId]
    );
    return { found: true, listId, items: itemsResult.rows };
};

const buildShoppingListText = (items) => {
    if (!items.length) return 'Shopping List\n\nNo items yet.';
    const grouped = items.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});
    const lines = ['Shopping List'];
    for (const cat of Object.keys(grouped)) {
        lines.push('', `${cat}:`);
        grouped[cat].forEach(item => {
            const qty = item.quantity ? ` - ${item.quantity}` : '';
            lines.push(`${item.is_checked ? '[x]' : '[ ]'} ${item.ingredient_name}${qty}`);
        });
    }
    return lines.join('\n');
};

const getShoppingListText = async (req, res) => {
    const listId = Number(req.params.listId);
    const userId = Number(req.query.user_id);
    if (!listId || !userId) return res.status(400).json({ success: false, message: 'listId and user_id are required' });

    try {
        const { found, items } = await getShoppingListItemsHelper(listId, userId);
        if (!found) return res.status(404).json({ success: false, message: 'Shopping list not found' });
        return res.status(200).json({ success: true, list_id: listId, text: buildShoppingListText(items) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const exportShoppingListPdf = async (req, res) => {
    const listId = Number(req.params.listId);
    const userId = Number(req.query.user_id);
    if (!listId || !userId) return res.status(400).json({ success: false, message: 'listId and user_id are required' });

    try {
        const { found, items } = await getShoppingListItemsHelper(listId, userId);
        if (!found) return res.status(404).json({ success: false, message: 'Shopping list not found' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="shopping-list-${listId}.pdf"`);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.pipe(res);
        doc.fontSize(18).text('PantryPal Shopping List');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666').text(`List ID: ${listId} | Generated: ${new Date().toISOString()}`);
        doc.moveDown().fillColor('black');

        if (!items.length) {
            doc.fontSize(12).text('No items yet.');
        } else {
            const grouped = items.reduce((acc, item) => {
                const cat = item.category || 'Other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});
            Object.keys(grouped).forEach(cat => {
                doc.moveDown(0.5).fontSize(13).text(cat, { underline: true });
                grouped[cat].forEach(item => {
                    const qty = item.quantity ? ` - ${item.quantity}` : '';
                    doc.fontSize(11).text(`${item.is_checked ? '[x]' : '[ ]'} ${item.ingredient_name}${qty}`);
                });
            });
        }
        doc.end();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const toggleShoppingItem = async (req, res) => {
    const listId = Number(req.params.listId);
    const { user_id, ingredient_name } = req.body;
    if (!listId || !user_id || !ingredient_name) {
        return res.status(400).json({ success: false, message: 'listId, user_id, and ingredient_name are required' });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM shopping_lists WHERE list_id = $1 AND user_id = $2',
            [listId, user_id]
        );
        if (ownership.rowCount === 0) return res.status(404).json({ success: false, message: 'List not found or access denied' });

        const result = await db.query('SELECT toggle_shopping_item($1, $2) AS response', [listId, ingredient_name]);
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(404).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Templates ─────────────────────────────────────────────────────────────────

const saveTemplate = async (req, res) => {
    const { user_id, name, meal_data } = req.body;

    if (!user_id || !name || !Array.isArray(meal_data)) {
        return res.status(400).json({ success: false, message: 'user_id, name, and meal_data array are required' });
    }

    try {
        const result = await db.query(
            'SELECT save_meals_as_template($1, $2, $3::json) AS response',
            [user_id, name, JSON.stringify(meal_data)]
        );
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const listTemplates = async (req, res) => {
    const userId = Number(req.query.user_id);
    if (!userId) return res.status(400).json({ success: false, message: 'user_id is required' });

    try {
        const result = await db.query('SELECT get_user_templates($1) AS response', [userId]);
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(400).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    const templateId = Number(req.params.templateId);
    const userId = Number(req.query.user_id);
    if (!templateId || !userId) return res.status(400).json({ success: false, message: 'templateId and user_id are required' });

    try {
        const result = await db.query('SELECT delete_template($1, $2) AS response', [templateId, userId]);
        const response = result.rows[0]?.response;
        if (!response?.success) return res.status(404).json(response || { success: false });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMealsForRange,
    upsertMeal,
    removeMeal,
    clearMealsForDate,
    markMealCooked,
    suggestMeals,
    getMissingIngredients,
    getNutritionForRange,
    getRecipeNutrition,
    saveShoppingList,
    getShoppingListText,
    exportShoppingListPdf,
    toggleShoppingItem,
    saveTemplate,
    listTemplates,
    deleteTemplate,
};
