const db = require('../config/database');
const PDFDocument = require('pdfkit');

const getOwnedShoppingListItems = async (planId, userId) => {
    const listResult = await db.query(
        `SELECT sl.list_id
         FROM shopping_lists sl
         JOIN meal_plans mp ON mp.plan_id = sl.plan_id
         WHERE sl.plan_id = $1 AND mp.user_id = $2
         LIMIT 1`,
        [planId, userId]
    );

    if (listResult.rowCount === 0) {
        return { found: false, listId: null, items: [] };
    }

    const listId = listResult.rows[0].list_id;
    const itemsResult = await db.query(
        `SELECT ingredient_name, quantity, category, is_checked
         FROM shopping_list_items
         WHERE list_id = $1
         ORDER BY category, ingredient_name`,
        [listId]
    );

    return {
        found: true,
        listId,
        items: itemsResult.rows
    };
};

const buildShoppingListText = (items) => {
    if (!items.length) {
        return 'Shopping List\n\nNo items in the shopping list yet.';
    }

    const grouped = items.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});

    const lines = ['Shopping List'];
    for (const category of Object.keys(grouped)) {
        lines.push('');
        lines.push(`${category}:`);
        grouped[category].forEach((item) => {
            const checkedMark = item.is_checked ? '[x]' : '[ ]';
            const qty = item.quantity ? ` - ${item.quantity}` : '';
            lines.push(`${checkedMark} ${item.ingredient_name}${qty}`);
        });
    }

    return lines.join('\n');
};

const createMealPlan = async (req, res) => {
    const { user_id, week_start, name = null } = req.body;

    if (!user_id || !week_start) {
        return res.status(400).json({
            success: false,
            message: 'user_id and week_start are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT create_meal_plan($1, $2, $3) AS response',
            [user_id, week_start, name]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to create plan' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getMealPlan = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT get_meal_plan($1, $2) AS response',
            [planId, userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Plan not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const upsertMealToPlan = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, recipe_id, day_of_week, meal_type } = req.body;

    if (!planId || !user_id || !recipe_id || !day_of_week || !meal_type) {
        return res.status(400).json({
            success: false,
            message: 'Fill all fields.'
        });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM meal_plans WHERE plan_id = $1 AND user_id = $2',
            [planId, user_id]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT add_meal_to_plan($1, $2, $3, $4) AS response',
            [planId, recipe_id, day_of_week, meal_type]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to add meal' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const removeMealFromPlan = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, day_of_week, meal_type } = req.body;

    if (!planId || !user_id || !day_of_week || !meal_type) {
        return res.status(400).json({
            success: false,
            message: 'Fill all fields.'
        });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM meal_plans WHERE plan_id = $1 AND user_id = $2',
            [planId, user_id]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT remove_meal_from_plan($1, $2, $3) AS response',
            [planId, day_of_week, meal_type]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Meal slot not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const clearMealPlan = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT clear_meal_plan($1, $2) AS response',
            [planId, userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Plan not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const markMealCooked = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, day_of_week, meal_type } = req.body;

    if (!planId || !user_id || !day_of_week || !meal_type) {
        return res.status(400).json({
            success: false,
            message: 'Fill all fields.'
        });
    }

    try {
        const result = await db.query(
            'SELECT mark_meal_cooked($1, $2, $3, $4) AS response',
            [planId, user_id, day_of_week, meal_type]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to mark meal as cooked' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const suggestWeeklyMeals = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, days = 7 } = req.body;

    if (!planId || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id are required'
        });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM meal_plans WHERE plan_id = $1 AND user_id = $2',
            [planId, user_id]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT suggest_meals_for_week($1, $2, $3) AS response',
            [user_id, planId, Number(days)]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to generate suggestions' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getMissingIngredients = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM meal_plans WHERE plan_id = $1 AND user_id = $2',
            [planId, userId]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT get_missing_ingredients($1, $2) AS response',
            [planId, userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to get missing ingredients' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const saveAIShoppingList = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, items } = req.body;

    if (!planId || !user_id || !Array.isArray(items)) {
        return res.status(400).json({
            success: false,
            message: 'planId param, user_id, and items array are required'
        });
    }

    try {
        const ownership = await db.query(
            'SELECT 1 FROM meal_plans WHERE plan_id = $1 AND user_id = $2',
            [planId, user_id]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT save_ai_shopping_list($1, $2, $3::json) AS response',
            [planId, user_id, JSON.stringify(items)]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to save shopping list' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const toggleShoppingItem = async (req, res) => {
    const listId = Number(req.params.listId);
    const { user_id, ingredient_name } = req.body;

    if (!listId || !user_id || !ingredient_name) {
        return res.status(400).json({
            success: false,
            message: 'listId param, user_id, and ingredient_name are required'
        });
    }

    try {
        const ownership = await db.query(
            `SELECT 1
             FROM shopping_lists sl
             JOIN meal_plans mp ON mp.plan_id = sl.plan_id
             WHERE sl.list_id = $1 AND mp.user_id = $2`,
            [listId, user_id]
        );

        if (ownership.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Shopping list not found or access denied'
            });
        }

        const result = await db.query(
            'SELECT toggle_shopping_item($1, $2) AS response',
            [listId, ingredient_name]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Item not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const savePlanAsTemplate = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, name } = req.body;

    if (!planId || !user_id || !name) {
        return res.status(400).json({
            success: false,
            message: 'planId param, user_id, and name are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT save_plan_as_template($1, $2, $3) AS response',
            [user_id, planId, name]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to save template' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const loadTemplateIntoPlan = async (req, res) => {
    const planId = Number(req.params.planId);
    const { user_id, template_id } = req.body;

    if (!planId || !user_id || !template_id) {
        return res.status(400).json({
            success: false,
            message: 'planId param, user_id, and template_id are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT load_template_into_plan($1, $2, $3) AS response',
            [template_id, user_id, planId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to load template' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const listTemplates = async (req, res) => {
    const userId = Number(req.query.user_id);

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'user_id query is required'
        });
    }

    try {
        const result = await db.query(
            'SELECT get_user_templates($1) AS response',
            [userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(400).json(response || { success: false, message: 'Failed to fetch templates' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    const templateId = Number(req.params.templateId);
    const userId = Number(req.query.user_id);

    if (!templateId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'templateId param and user_id query are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT delete_template($1, $2) AS response',
            [templateId, userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Template not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getRecipeNutrition = async (req, res) => {
    const recipeId = Number(req.params.recipeId);

    if (!recipeId) {
        return res.status(400).json({
            success: false,
            message: 'recipeId param is required'
        });
    }

    try {
        const result = await db.query(
            'SELECT get_recipe_nutrition($1) AS response',
            [recipeId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Nutrition info not available' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getWeeklyNutrition = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const result = await db.query(
            'SELECT get_weekly_nutrition($1, $2) AS response',
            [planId, userId]
        );

        const response = result.rows[0]?.response;

        if (!response?.success) {
            return res.status(404).json(response || { success: false, message: 'Plan not found' });
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getShoppingListText = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const { found, listId, items } = await getOwnedShoppingListItems(planId, userId);

        if (!found) {
            return res.status(404).json({
                success: false,
                message: 'Shopping list not found or access denied'
            });
        }

        const text = buildShoppingListText(items);
        return res.status(200).json({
            success: true,
            plan_id: planId,
            list_id: listId,
            text
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const exportShoppingListPdf = async (req, res) => {
    const planId = Number(req.params.planId);
    const userId = Number(req.query.user_id);

    if (!planId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'planId param and user_id query are required'
        });
    }

    try {
        const { found, listId, items } = await getOwnedShoppingListItems(planId, userId);

        if (!found) {
            return res.status(404).json({
                success: false,
                message: 'Shopping list not found or access denied'
            });
        }

        const fileName = `shopping-list-plan-${planId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.pipe(res);

        doc.fontSize(18).text('PantryPal Shopping List');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666').text(`Plan ID: ${planId} | List ID: ${listId}`);
        doc.text(`Generated: ${new Date().toISOString()}`);
        doc.moveDown();
        doc.fillColor('black');

        if (!items.length) {
            doc.fontSize(12).text('No items in the shopping list yet.');
        } else {
            const grouped = items.reduce((acc, item) => {
                const category = item.category || 'Other';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(item);
                return acc;
            }, {});

            Object.keys(grouped).forEach((category) => {
                doc.moveDown(0.5);
                doc.fontSize(13).text(category, { underline: true });
                grouped[category].forEach((item) => {
                    const checkedMark = item.is_checked ? '[x]' : '[ ]';
                    const qty = item.quantity ? ` - ${item.quantity}` : '';
                    doc.fontSize(11).text(`${checkedMark} ${item.ingredient_name}${qty}`);
                });
            });
        }

        doc.end();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createMealPlan,
    getMealPlan,
    upsertMealToPlan,
    removeMealFromPlan,
    clearMealPlan,
    markMealCooked,
    suggestWeeklyMeals,
    getMissingIngredients,
    saveAIShoppingList,
    toggleShoppingItem,
    savePlanAsTemplate,
    loadTemplateIntoPlan,
    listTemplates,
    deleteTemplate,
    getRecipeNutrition,
    getWeeklyNutrition,
    getShoppingListText,
    exportShoppingListPdf
};
