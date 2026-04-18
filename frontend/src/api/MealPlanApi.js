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
 * @param {number} planId
 * @param {number} userId
 * Returns: { success, missing: [{ ingredient_name, quantity, ... }] }
 */
export function getMissingIngredients(planId, userId) {
  return apiRequest(`/meal-plans/${planId}/missing-ingredients?user_id=${userId}`);
}
