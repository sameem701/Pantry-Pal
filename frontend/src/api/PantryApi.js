import { apiRequest } from './client';

export function getPantry(userId) {
    return apiRequest(`/pantry/${userId}`);
}

export function addPantryItem(userId, ingredientId, quantity, unit, storageLocation) {
    return apiRequest('/pantry', {
        method: 'POST',
        body: { user_id: userId, ingredient_id: ingredientId, quantity, unit, storage_location: storageLocation },
    });
}

export function updatePantryItem(userId, ingredientId, quantity, unit, storageLocation) {
    return apiRequest(`/pantry/${userId}/${ingredientId}`, {
        method: 'PUT',
        body: { quantity, unit, storage_location: storageLocation },
    });
}

export function deletePantryItem(userId, ingredientId) {
    return apiRequest(`/pantry/${userId}/${ingredientId}`, { method: 'DELETE' });
}

export function searchIngredients(query) {
    return apiRequest(`/pantry/ingredients/search?q=${encodeURIComponent(query)}`);
}

export function getAllIngredients() {
    return apiRequest('/pantry/ingredients/all');
}
