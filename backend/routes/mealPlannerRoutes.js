const express = require('express');
const controller = require('../controllers/mealPlannerController');

const router = express.Router();

router.post('/', controller.createMealPlan);
router.post('/:planId/meals', controller.upsertMealToPlan);
router.post('/:planId/suggestions', controller.suggestWeeklyMeals);
router.post('/:planId/shopping-list', controller.saveAIShoppingList);
router.post('/:planId/templates', controller.savePlanAsTemplate);
router.post('/:planId/templates/load', controller.loadTemplateIntoPlan);
router.get('/templates', controller.listTemplates);
router.get('/recipes/:recipeId/nutrition', controller.getRecipeNutrition);
router.get('/:planId/shopping-list/text', controller.getShoppingListText);
router.get('/:planId/shopping-list/export/pdf', controller.exportShoppingListPdf);
router.get('/:planId/nutrition', controller.getWeeklyNutrition);
router.delete('/templates/:templateId', controller.deleteTemplate);
router.patch('/shopping-list/:listId/toggle', controller.toggleShoppingItem);
router.patch('/:planId/meals/cooked', controller.markMealCooked);
router.get('/:planId/missing-ingredients', controller.getMissingIngredients);
router.delete('/:planId/meals', controller.removeMealFromPlan);
router.delete('/:planId', controller.clearMealPlan);
router.get('/:planId', controller.getMealPlan);

module.exports = router;
