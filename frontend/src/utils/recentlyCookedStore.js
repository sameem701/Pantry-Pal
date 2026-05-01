/**
 * Stores the last N recently cooked recipes in localStorage.
 */
const KEY = 'pantrypal_recently_cooked';
const LIMIT = 10;

export function saveRecentlyCookedLocally({ recipeId, title, imageUrl, cookingTime, difficulty }) {
    try {
        const list = getRecentlyCooked();
        // Remove existing entry for same recipe so we can push it to front
        const filtered = list.filter(r => r.recipeId !== recipeId);
        const updated = [
            { recipeId, title, imageUrl, cookingTime, difficulty, cookedAt: Date.now() },
            ...filtered,
        ].slice(0, LIMIT);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch { }
}

export function getRecentlyCooked() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
}
