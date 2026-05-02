import { apiRequest } from './client';

// ── Meals (per-day) ───────────────────────────────────────────────────────────

/** Get all meals in [start, end] date range.
 *  Returns: { success, meals: [{ date, meal_type, recipe_id, recipe_title, is_cooked, calories, ... }] }
 */
export function getMealsForRange(userId, start, end) {
  return apiRequest(`/meal-plans/meals?user_id=${userId}&start=${start}&end=${end}`);
}

/** Add or replace a meal in a date+slot.
 *  Returns: { success, message }
 */
export function upsertMeal(userId, date, mealType, recipeId) {
  return apiRequest('/meal-plans/meals', {
    method: 'POST',
    body: { user_id: userId, date, meal_type: mealType, recipe_id: recipeId },
  });
}

/** Remove a single meal slot.
 *  Returns: { success, message }
 */
export function removeMeal(userId, date, mealType) {
  return apiRequest('/meal-plans/meals', {
    method: 'DELETE',
    body: { user_id: userId, date, meal_type: mealType },
  });
}

/** Clear all meal slots (breakfast/lunch/dinner) for a specific date.
 *  Returns: { success, deleted }
 */
export function clearMealsForDate(userId, date) {
  return apiRequest('/meal-plans/day', {
    method: 'DELETE',
    body: { user_id: userId, date },
  });
}

/** Mark a meal as cooked (also deducts pantry).
 *  Returns: { success, message }
 */
export function markMealCooked(userId, date, mealType) {
  return apiRequest('/meal-plans/meals/cooked', {
    method: 'PATCH',
    body: { user_id: userId, date, meal_type: mealType },
  });
}

// ── Suggestions ───────────────────────────────────────────────────────────────

/** Suggest meals for a date range.
 *  Returns: { success, data: [{ option_number, meals: [...] }] }
 */
export function suggestMeals(userId, startDate, days = 7) {
  return apiRequest('/meal-plans/suggestions', {
    method: 'POST',
    body: { user_id: userId, start_date: startDate, days },
  });
}

// ── Nutrition & missing ingredients ──────────────────────────────────────────

/** Get missing ingredients for the uncooked meals in a date range.
 *  Returns: { success, data: [{ ingredient_name, quantity_display, ... }] }
 */
export function getMissingIngredients(userId, start, end) {
  return apiRequest(`/meal-plans/missing-ingredients?user_id=${userId}&start=${start}&end=${end}`);
}

/** Get nutrition summary for a date range.
 *  Returns: { success, totals, daily_breakdown: [{ date, calories, ... }] }
 */
export function getNutritionForRange(userId, start, end) {
  return apiRequest(`/meal-plans/nutrition?user_id=${userId}&start=${start}&end=${end}`);
}

/** Get nutrition info for a single recipe. */
export function getRecipeNutrition(recipeId) {
  return apiRequest(`/meal-plans/recipes/${recipeId}/nutrition`);
}

// ── Shopping list ─────────────────────────────────────────────────────────────

/** Save a shopping list. items: [{ name, quantity, category }]
 *  Returns: { success, list_id }
 */
export function saveShoppingList(userId, items, name = null) {
  return apiRequest('/meal-plans/shopping-list', {
    method: 'POST',
    body: { user_id: userId, items, ...(name ? { name } : {}) },
  });
}

export function getShoppingListText(listId, userId) {
  return apiRequest(`/meal-plans/shopping-list/${listId}/text?user_id=${userId}`);
}

export function getShoppingListPdfUrl(listId, userId) {
  return `/api/meal-plans/shopping-list/${listId}/export/pdf?user_id=${userId}`;
}

export function toggleShoppingItem(listId, userId, ingredientName) {
  return apiRequest(`/meal-plans/shopping-list/${listId}/toggle`, {
    method: 'PATCH',
    body: { user_id: userId, ingredient_name: ingredientName },
  });
}

// ── Templates ─────────────────────────────────────────────────────────────────

/** Save a set of meals as a named template.
 *  meal_data: [{ day_index: 0, meal_type: 'breakfast', recipe_id: 1 }, ...]
 *  Returns: { success, template_id }
 */
export function saveTemplate(userId, name, mealData) {
  return apiRequest('/meal-plans/templates', {
    method: 'POST',
    body: { user_id: userId, name, meal_data: mealData },
  });
}

/** List all templates for a user.
 *  Returns: { success, data: [{ template_id, name, created_at, meals: [...] }] }
 */
export function listTemplates(userId) {
  return apiRequest(`/meal-plans/templates?user_id=${userId}`);
}

/** Delete a saved template. */
export function deleteTemplate(templateId, userId) {
  return apiRequest(`/meal-plans/templates/${templateId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}
