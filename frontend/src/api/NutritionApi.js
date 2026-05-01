import { apiRequest } from './client';

/**
 * Log a cooked recipe to today's nutrition log.
 * @param {number} userId
 * @param {number} recipeId
 */
export function logNutritionEntry(userId, recipeId) {
    return apiRequest('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, recipe_id: recipeId }),
    });
}

/**
 * Get the daily nutrition log for a user.
 * @param {number} userId
 * @param {string} [date]  YYYY-MM-DD, defaults to today on the server
 */
export function getDailyNutritionLog(userId, date) {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`/nutrition/log/${userId}${params}`);
}
