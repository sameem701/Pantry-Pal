import { apiRequest } from './client';

/**
 * Create a new weekly meal plan for the user.
 * @param {number} userId
 * @param {string} weekStart - ISO date string for week start, e.g. "2026-04-20"
 * @param {string} [name]    - Optional plan name
 * Returns: { success, plan_id, ... }
 */
export function createMealPlan(userId, weekStart, name = null) {
  return apiRequest('/meal-plans', {
    method: 'POST',
    body: { user_id: userId, week_start: weekStart, ...(name ? { name } : {}) },
  });
}

/**
 * Get a meal plan and all its scheduled meals.
 * @param {number} planId
 * @param {number} userId
 * Returns: { success, plan_id, meals: [...] }
 */
export function getMealPlan(planId, userId) {
  return apiRequest(`/meal-plans/${planId}?user_id=${userId}`);
}

/**
 * Clear (delete) all meals from a plan without deleting the plan itself.
 * @param {number} planId
 * @param {number} userId
 * Returns: { success, message }
 */
export function clearMealPlan(planId, userId) {
  return apiRequest(`/meal-plans/${planId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Add or update a recipe in a specific day + meal slot.
 * @param {number} planId
 * @param {number} userId
 * @param {number} recipeId
 * @param {string} dayOfWeek  - e.g. "Monday"
 * @param {string} mealType   - "breakfast" | "lunch" | "dinner"
 * Returns: { success, message }
 */
export function upsertMeal(planId, userId, recipeId, dayOfWeek, mealType) {
  return apiRequest(`/meal-plans/${planId}/meals`, {
    method: 'POST',
    body: {
      user_id: userId,
      recipe_id: recipeId,
      day_of_week: dayOfWeek,
      meal_type: mealType,
    },
  });
}

/**
 * Remove the recipe from a specific day + meal slot.
 * @param {number} planId
 * @param {number} userId
 * @param {string} dayOfWeek  - e.g. "Monday"
 * @param {string} mealType   - "breakfast" | "lunch" | "dinner"
 * Returns: { success, message }
 */
export function removeMeal(planId, userId, dayOfWeek, mealType) {
  return apiRequest(`/meal-plans/${planId}/meals`, {
    method: 'DELETE',
    body: {
      user_id: userId,
      day_of_week: dayOfWeek,
      meal_type: mealType,
    },
  });
}

/**
 * Mark a planned meal as cooked.
 * @param {number} planId
 * @param {number} userId
 * @param {string} dayOfWeek  - e.g. "Monday"
 * @param {string} mealType   - "breakfast" | "lunch" | "dinner"
 * Returns: { success, message }
 */
export function markMealCooked(planId, userId, dayOfWeek, mealType) {
  return apiRequest(`/meal-plans/${planId}/meals/cooked`, {
    method: 'PATCH',
    body: {
      user_id: userId,
      day_of_week: dayOfWeek,
      meal_type: mealType,
    },
  });
}

/**
 * Auto-suggest meals for the week based on the user's pantry and preferences.
 * @param {number} planId
 * @param {number} userId
 * @param {number} [days=7]
 * Returns: { success, suggestions: [{ day_of_week, meal_type, recipe_id, recipe_title }] }
 */
export function suggestMeals(planId, userId, days = 7) {
  return apiRequest(`/meal-plans/${planId}/suggestions`, {
    method: 'POST',
    body: { user_id: userId, days },
  });
}

/**
 * Get ingredients needed by the plan that are not in the user's pantry.
 * Returns: { success, missing: [{ ingredient_name, quantity, ... }] }
 */
export function getMissingIngredients(planId, userId) {
  return apiRequest(`/meal-plans/${planId}/missing-ingredients?user_id=${userId}`);
}

// ── Shopping List ─────────────────────────────────────────────────────────────

/**
 * Save / generate a shopping list for the plan.
 * items: [{ ingredient_name, quantity, category }]
 * Returns: { success, list_id }
 */
export function saveShoppingList(planId, userId, items) {
  return apiRequest(`/meal-plans/${planId}/shopping-list`, {
    method: 'POST',
    body: { user_id: userId, items },
  });
}

/**
 * Get the shopping list as formatted plain text.
 * Returns: { success, list_id, text }
 */
export function getShoppingListText(planId, userId) {
  return apiRequest(`/meal-plans/${planId}/shopping-list/text?user_id=${userId}`);
}

/**
 * Returns the URL for downloading the shopping list as a PDF.
 * Use window.open(url) or an <a href> to trigger the download.
 */
export function getShoppingListPdfUrl(planId, userId) {
  return `/api/meal-plans/${planId}/shopping-list/export/pdf?user_id=${userId}`;
}

/**
 * Toggle an item in the shopping list as purchased / unpurchased.
 * Returns: { success, message }
 */
export function toggleShoppingItem(listId, userId, ingredientName) {
  return apiRequest(`/meal-plans/shopping-list/${listId}/toggle`, {
    method: 'PATCH',
    body: { user_id: userId, ingredient_name: ingredientName },
  });
}

// ── Nutrition ─────────────────────────────────────────────────────────────────

/**
 * Get weekly nutrition summary for a meal plan.
 * Returns: { success, nutrition: { calories, protein, carbs, fat } }
 */
export function getWeeklyNutrition(planId, userId) {
  return apiRequest(`/meal-plans/${planId}/nutrition?user_id=${userId}`);
}

/**
 * Get nutrition info for a single recipe.
 * Returns: { success, nutrition: { calories, protein_g, carbs_g, fat_g } }
 */
export function getRecipeNutrition(recipeId) {
  return apiRequest(`/meal-plans/recipes/${recipeId}/nutrition`);
}

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * Save the current plan as a named template.
 * Returns: { success, template_id }
 */
export function savePlanAsTemplate(planId, userId, name) {
  return apiRequest(`/meal-plans/${planId}/templates`, {
    method: 'POST',
    body: { user_id: userId, name },
  });
}

/**
 * Load a saved template into the current plan (replaces existing meals).
 * Returns: { success, message }
 */
export function loadTemplateIntoPlan(planId, userId, templateId) {
  return apiRequest(`/meal-plans/${planId}/templates/load`, {
    method: 'POST',
    body: { user_id: userId, template_id: templateId },
  });
}

/**
 * List all templates saved by the user.
 * Returns: { success, templates: [{ template_id, name, created_at }] }
 */
export function listTemplates(userId) {
  return apiRequest(`/meal-plans/templates?user_id=${userId}`);
}

/**
 * Delete a saved template.
 * Returns: { success, message }
 */
export function deleteTemplate(templateId, userId) {
  return apiRequest(`/meal-plans/templates/${templateId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}
