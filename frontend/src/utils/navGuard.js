/**
 * Global navigation guard for CreateRecipe's dirty-state prompt.
 * CreateRecipe sets this ref when mounted; clears it on unmount.
 * The Sidebar checks it before following a NavLink.
 *
 * The stored function receives the destination path and returns:
 *   true  — navigation is allowed (form is clean)
 *   false — navigation was blocked (prompt shown to user)
 */
export const navGuardRef = { current: null };
