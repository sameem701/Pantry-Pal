const express = require('express');
const controller = require('../controllers/mealPlannerController');

const router = express.Router();

// ── Meals (per-day, no plan concept) ─────────────────────────────────────────
router.get('/meals', controller.getMealsForRange);   // ?user_id&start&end
router.post('/meals', controller.upsertMeal);
router.delete('/meals', controller.removeMeal);
router.delete('/day', controller.clearMealsForDate);
router.patch('/meals/cooked', controller.markMealCooked);

// ── Suggestions ───────────────────────────────────────────────────────────────
router.post('/suggestions', controller.suggestMeals);

// ── Missing ingredients & nutrition ──────────────────────────────────────────
router.get('/missing-ingredients', controller.getMissingIngredients); // ?user_id&start&end
router.get('/nutrition', controller.getNutritionForRange);  // ?user_id&start&end
router.get('/recipes/:recipeId/nutrition', controller.getRecipeNutrition);

// ── Shopping list ─────────────────────────────────────────────────────────────
router.post('/shopping-list', controller.saveShoppingList);
router.get('/shopping-list/:listId/text', controller.getShoppingListText);
router.get('/shopping-list/:listId/export/pdf', controller.exportShoppingListPdf);
router.patch('/shopping-list/:listId/toggle', controller.toggleShoppingItem);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates', controller.listTemplates);
router.post('/templates', controller.saveTemplate);
router.delete('/templates/:templateId', controller.deleteTemplate);

module.exports = router;

