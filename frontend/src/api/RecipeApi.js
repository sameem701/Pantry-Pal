import { apiRequest } from './client';

// ── Browse / Search ───────────────────────────────────────────────────────────

export function searchByPantry({ userId, difficulty, cuisineId, page = 1, limit = 12 } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (difficulty) params.set('difficulty', difficulty);
    if (cuisineId)  params.set('cuisine_id', cuisineId);
    return apiRequest(`/recipes/search-by-pantry/${userId}?${params}`);
}

export function browseRecipes({ userId, q, difficulty, cuisineId, dietaryPreference, sortBy = 'trending', page = 1, limit = 12 }) {
    const params = new URLSearchParams({ user_id: userId, sort_by: sortBy, page, limit });
    if (q) params.set('q', q);
    if (difficulty) params.set('difficulty', difficulty);
    if (cuisineId) params.set('cuisine_id', cuisineId);
    if (dietaryPreference) params.set('dietary_preference', dietaryPreference);
    return apiRequest(`/recipes/browse?${params}`);
}

/** Browse all recipes (includes community / user-created).
 *  Supports: q, difficulty, creator_id, user_id, page, limit */
export function getAllRecipes({ userId, q, difficulty, creatorId, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (userId) params.set('user_id', userId);
    if (q) params.set('q', q);
    if (difficulty) params.set('difficulty', difficulty);
    if (creatorId) params.set('creator_id', creatorId);
    return apiRequest(`/recipes?${params}`);
}

export function getRecipeDetails(recipeId, userId) {
    const query = userId ? `?user_id=${userId}` : '';
    return apiRequest(`/recipes/${recipeId}${query}`);
}

// ── Options ───────────────────────────────────────────────────────────────────
export function listCuisineOptions() { return apiRequest('/recipes/options/cuisines'); }
export function listDietaryOptions() { return apiRequest('/recipes/options/dietary-preferences'); }

// ── Favourites ────────────────────────────────────────────────────────────────
export function toggleFavourite(recipeId, userId) {
    return apiRequest(`/recipes/${recipeId}/favourite`, {
        method: 'POST',
        body: { user_id: userId },
    });
}
export function listFavourites(userId) {
    return apiRequest(`/recipes/favourites/${userId}`);
}

// ── Reviews ───────────────────────────────────────────────────────────────────
/** GET /api/recipes/:recipe_id/reviews  */
export function getReviews(recipeId) {
    return apiRequest(`/recipes/${recipeId}/reviews`);
}

/** POST /api/recipes/:recipe_id/reviews  body: { user_id, rating, review_text } */
export function upsertReview(recipeId, userId, rating, reviewText) {
    return apiRequest(`/recipes/${recipeId}/reviews`, {
        method: 'POST',
        body: { user_id: userId, rating, review_text: reviewText },
    });
}

/** DELETE /api/recipes/:recipe_id/reviews  body: { user_id } */
export function deleteReview(recipeId, userId) {
    return apiRequest(`/recipes/${recipeId}/reviews`, {
        method: 'DELETE',
        body: { user_id: userId },
    });
}

// ── Cooking Sessions ──────────────────────────────────────────────────────────
/** POST /api/recipes/:recipe_id/cooking-sessions  body: { user_id }
 *  Returns: { success, session_id, message } */
export function startCookingSession(recipeId, userId) {
    return apiRequest(`/recipes/${recipeId}/cooking-sessions`, {
        method: 'POST',
        body: { user_id: userId },
    });
}

/** GET /api/recipes/cooking-sessions/:session_id?user_id=
 *  Returns: { success, session_id, recipe_id, recipe_title, current_step,
 *             total_steps, is_completed, steps:[{step_number,instruction_text}] } */
export function getCookingSession(sessionId, userId) {
    return apiRequest(`/recipes/cooking-sessions/${sessionId}?user_id=${userId}`);
}

/** PATCH /api/recipes/cooking-sessions/:session_id/step  body: { user_id, step_number } */
export function updateCookingStep(sessionId, userId, stepNumber) {
    return apiRequest(`/recipes/cooking-sessions/${sessionId}/step`, {
        method: 'PATCH',
        body: { user_id: userId, step_number: stepNumber },
    });
}

/** PATCH /api/recipes/cooking-sessions/:session_id/complete  body: { user_id } */
export function completeCookingSession(sessionId, userId) {
    return apiRequest(`/recipes/cooking-sessions/${sessionId}/complete`, {
        method: 'PATCH',
        body: { user_id: userId },
    });
}

// ── Recipe CRUD ───────────────────────────────────────────────────────────────
/** POST /api/recipes */
export function createRecipe(payload) {
    return apiRequest('/recipes', { method: 'POST', body: payload });
}

/** PUT /api/recipes/:id */
export function updateRecipe(recipeId, payload) {
    return apiRequest(`/recipes/${recipeId}`, { method: 'PUT', body: payload });
}

/** DELETE /api/recipes/:id?user_id= */
export function deleteRecipe(recipeId, userId) {
    return apiRequest(`/recipes/${recipeId}?user_id=${userId}`, { method: 'DELETE' });
}

