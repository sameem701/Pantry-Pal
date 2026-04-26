/**
 * Lightweight localStorage-backed shopping list store.
 * Used by MealPlanner (shopping modal) and CookingSession (missing ingredients).
 */
const KEY = 'pantrypal_shopping_lists';

export function getSavedLists() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
}

export function saveShoppingListLocally(items, source = 'Meal Plan') {
    const lists = getSavedLists();
    const newList = {
        id: Date.now(),
        source,
        date: new Date().toISOString(),
        items: items.map(i => ({ ...i, is_checked: i.is_checked ?? false })),
    };
    const updated = [newList, ...lists].slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
}

export function toggleListItem(listId, itemIdx) {
    const lists = getSavedLists().map(l => {
        if (l.id !== listId) return l;
        const items = [...l.items];
        items[itemIdx] = { ...items[itemIdx], is_checked: !items[itemIdx].is_checked };
        return { ...l, items };
    });
    localStorage.setItem(KEY, JSON.stringify(lists));
    return lists;
}

export function clearList(listId) {
    const lists = getSavedLists().filter(l => l.id !== listId);
    localStorage.setItem(KEY, JSON.stringify(lists));
    return lists;
}

export function markAllListItems(listId, checked = true) {
    const lists = getSavedLists().map(l => {
        if (l.id !== listId) return l;
        return { ...l, items: l.items.map(i => ({ ...i, is_checked: checked })) };
    });
    localStorage.setItem(KEY, JSON.stringify(lists));
    return lists;
}
