# PANTRY PAL — UX/UI POLISH & QA REVIEW
## Comprehensive Analysis & Proposal Log
**Date:** May 7, 2026
**Status:** Live-Code Verified — All findings confirmed against actual source
**Recommendation:** Implement in phases — Pillar 1 (Iconography + Colour), then Pillar 2 (QA), then Pillar 3 (Micro-interactions)

> **Note on Sidebar Navigation:** The sidebar in `App.jsx` already uses `lucide-react` icons (`Leaf`, `ChefHat`, `Heart`, `BookOpen`, `CalendarDays`, `ShoppingCart`, `User`, `Utensils`). No emoji eradication needed there. All findings below are based on direct code inspection.

---

## PILLAR 1 — ICONOGRAPHY & VISUAL POLISH

### 1.1 Emoji Eradication

> **Note:** Sidebar navigation already uses `lucide-react` icons — no changes needed there.

| ID | File | Location | Current | Replacement |
|----|------|----------|---------|-------------|
| **1.1.1** | `Dashboard.jsx:132` | Greeting header | `👋` wave emoji | `<Sparkles size={20} />` |
| **1.1.2** | `Dashboard.jsx:202` | Pantry health warning | `⚠️` emoji | `<TriangleAlert size={14} />` |
| **1.1.3** | `Dashboard.jsx:225` | Recently Cooked fallback icon | `🍽️` emoji | `<Utensils size={20} />` |
| **1.1.4** | `Pantry.jsx:294` | Empty pantry state | `🥦` emoji in `<p>` | Full `.empty-state` block with `<Leaf size={40} />` |
| **1.1.5** | `RecipeDetail.jsx:201` | "Shopping List for Missing" button | `🛒` prefix text | `<ShoppingCart size={14} />` icon |
| **1.1.6** | `MealPlanner.jsx:1252` | Recipe drag handle | `&#x2630;` hamburger char | `<GripVertical size={14} />` |
| **1.1.7** | `MealPlanner.jsx:1269` | Fav buttons in recipe list | `♥` / `♡` HTML entities | `<Heart size={14} fill="currentColor" />` / `<Heart size={14} />` |
| **1.1.8** | `MealPlanner.jsx:929–940` | Week nav arrows | `«` `‹` `›` `»` HTML entities | `<ChevronsLeft />` `<ChevronLeft />` `<ChevronRight />` `<ChevronsRight />` |
| **1.1.9** | `MealPlanner.jsx:1040` | Suggestion chip "+" button | raw `+` character | `<Plus size={12} />` |
| **1.1.10** | `ShoppingList.jsx:281` | Card collapse toggle | `▲` / `▼` unicode | `<ChevronUp size={14} />` / `<ChevronDown size={14} />` |
| **1.1.11** | `ShoppingList.jsx:263` | "Mark All" button (card face) | `&#10003;` HTML entity | `<CheckCheck size={14} />` |
| **1.1.12** | `ShoppingList.jsx:295` | "Mark All" button (expanded toolbar) | `&#10003;` HTML entity | `<CheckCheck size={14} />` |
| **1.1.13** | `ShoppingList.jsx:311` | Per-item check state | `…` / `✓` inline unicode | `<Loader2 size={12} className="spin" />` / `<Check size={12} />` |
| **1.1.14** | `ConfirmModal.jsx:19` | Default icon prop | `'!'` plain string | `<AlertTriangle size={32} />` lucide node as default |
| **1.1.15** | `Pantry.jsx:262` | "Add to Pantry" button | `+` plain text prefix | `<Plus size={14} />` icon |

**Status:** ✅ Implemented

---

### 1.2 Color & Typography Polish

**Root cause:** `--accent-orange` and `--accent-green` are both `#388e6d` (duplicate, misleading name). Several hardcoded hex values throughout component files bypass design tokens. Sidebar dark color `#1a1a2e` is cold navy — clashes with the warm canvas. Toast and nutrition chart colours are off-palette.

| ID | Token / Location | Current | Proposed |
|----|-----------------|---------|----------|
| **1.2.1** | `App.css` — `--accent-orange` | `#388e6d` (duplicate of green) | Rename to `--accent-primary: #388e6d`; add `--accent-warm: #c97c28` for warm CTA contrast |
| **1.2.2** | `App.css` — `--sidebar-bg` | `#1a1a2e` cold navy | `#1f1b16` warm dark charcoal — same family as canvas |
| **1.2.3** | `App.css` — sidebar active/hover | Same bg for both states | Active: `rgba(56,142,109,0.12)` green tint + `color:#fff`; Hover: keep `#252540` |
| **1.2.4** | `ToastContext.jsx:14` — success accent | `#4caf8c` (off-palette) | `#388e6d` — align to established accent green |
| **1.2.5** | `App.css` — `.empty-state-icon` | `font-size: 3rem` (works for emoji only) | `width:48px; height:48px; color:var(--text-muted); opacity:0.6` (works for SVG) |
| **1.2.6** | `MealPlanner.jsx` — `buildSlices` macro colors | Hardcoded `#2e9068`, `#3d31b0`, `#c97c28`, `#c03060` | Extract to CSS variables: `--macro-protein:#2e9068`, `--macro-carbs:#5a4fcf`, `--macro-fat:#c97c28`, `--macro-other: var(--accent-red)` |
| **1.2.7** | `Dashboard.jsx` — `MacroRing` colors | Hardcoded `#4caf50`, `#2196f3`, `#ff9800`, `#e91e63` (Material UI palette) | Map to tokens: `var(--accent-green)`, `var(--accent-purple)`, `var(--accent-warm)`, `var(--accent-red)` |

**Status:** ✅ Implemented

---

### 1.3 Layout & Spacing

| ID | Location | Issue | Proposal |
|----|----------|-------|----------|
| **1.3.1** | `Pantry.jsx` — edit modal | No `.form-group` wrappers on label/input pairs | Wrap each pair in `<div className="form-group">` |
| **1.3.2** | `RecipeDetail.jsx:127–128` | Bare text loading/error states, no icons | Use `.empty-state` pattern with `<Loader />` and `<AlertTriangle />` |
| **1.3.3** | `Dashboard.jsx` — today's meals | "Start Cooking" only on current time-slot meal | Show cook icon on all of today's meals, not just the time-matched one |
| **1.3.4** | `MealPlanner.jsx` — future slots | Remove `<X>` only visible via Clear Mode — undiscoverable | Show remove `<X>` on hover for all future non-cooked slots |
| **1.3.5** | `ShoppingList.jsx` — zero lists | No empty state rendered | Add `.empty-state` with `<ShoppingCart size={48} />`, title, and CTA → `/meal-plan` |
| **1.3.6** | `Profile.jsx:91` | Single-letter avatar feels low-fi as visual centrepiece | Larger avatar (80px) with accent ring; `display_name` as prominent heading below |

**Status:** Pending (future phase)

---

## PILLAR 2 — WORKFLOW QA & EDGE CASE LOOPHOLES

### 2.1 Pantry Management

| ID | Issue | Severity | Fix |
|----|-------|----------|-----|
| **2.1.1** | `Pantry.jsx` — `handleDelete` uses `window.confirm()` instead of `ConfirmModal` | Medium | Replace with `ConfirmModal` component |
| **2.1.2** | `Pantry.jsx` — `handleEditSave` submits with empty/NaN quantity — no client guard | High | Guard: `if (!editQuantity \|\| parseFloat(editQuantity) <= 0) { setEditError('Quantity must be > 0'); return; }` |
| **2.1.3** | `Pantry.jsx` — add success does full re-fetch; noticeable lag | Low | Optimistically insert new item into state, then reconcile with re-fetch |

### 2.2 Interactive Cooking

| ID | Issue | Severity | Fix |
|----|-------|----------|-----|
| **2.2.1** | No `401` detection during cooking — session expiry mid-cook shows generic error | High | Detect `err.status === 401`; redirect to `/login` with toast: "Your session expired. Please sign in again." |
| **2.2.2** | `goToStep` non-throwing failure (falsy `res?.success`) silently ignored | Medium | Add `else` branch: `addToast('Step update failed. Please try again.', 'error')` |
| **2.2.3** | `handleLogNutrition` navigates away in `finally` even on API failure | Medium | Move `navigate(...)` into `try` success path only; keep modal open on error with retry |
| **2.2.4** | Error display shows raw `err.message` — could expose internal API strings | Low | Map `err.status === 404` → `"Recipe not found."` before displaying |

### 2.3 Meal Planning

| ID | Issue | Severity | Fix |
|----|-------|----------|-----|
| **2.3.1** | `openShopModal` empty-plan guard ✅ Already handled | — | No action needed |
| **2.3.2** | `handleDrop` — optimistic `setSlotMap` fires BEFORE `await upsertMeal` succeeds | **High** | Move `setSlotMap` to after the `await` in the `try` block |
| **2.3.3** | `handleSlotClick` — same optimistic-update-before-API pattern | **High** | Same fix as 2.3.2 |
| **2.3.4** | `handleMarkCooked` — optimistic `isCooked: true` not reverted on API failure | Medium | On `catch`: `setSlotMap(prev => ({ ...prev, [key]: { ...prev[key], isCooked: false } }))` |
| **2.3.5** | `openSaveTemplateModal` — `preSelected` variable used but **never declared** → `ReferenceError` crash | **CRITICAL** | Add `const preSelected = new Set();` before the `weekDays.forEach` loop |
| **2.3.6** | `confirmLoadTemplate` — partial failure mid-loop shows success toast | Medium | Use `Promise.allSettled`; only toast success if all resolved |
| **2.3.7** | Past non-cooked slots have no "Mark as cooked" retroactive action | Medium | Allow marking past meals cooked from calendar cell |

### 2.4 Authentication & Session

| ID | Issue | Severity | Fix |
|----|-------|----------|-----|
| **2.4.1** | `AuthContext` stores user in `localStorage` with no expiry — stale sessions live forever | Medium | Add `loginAt` timestamp; auto-logout if `Date.now() - loginAt > 7 days` |
| **2.4.2** | `apiRequest` throws on `401` but **no component checks `err.status`** for global logout | High | Add global `401` handler in `apiRequest` — fire a custom event or expose logout callback |

---

## PILLAR 3 — MICRO-INTERACTIONS & FEEDBACK

### 3.1 Missing Loading / Disabled States

| ID | Location | Issue | Fix |
|----|----------|-------|-----|
| **3.1.1** | `Recipes.jsx` — fav button | No `favLoading` state — double-click fires two concurrent API calls | Add per-recipe `Set` of toggling `recipeId`s; disable while in-flight |
| **3.1.2** | `Favourites.jsx` — fav button | Same race condition as 3.1.1 | Same fix |
| **3.1.3** | `MealPlanner.jsx` — "Suggest Meals" button | `disabled` set ✅ but no spinner shown | Add `<Loader2 size={14} className="spin" />` when `suggestLoading` |
| **3.1.4** | `MealPlanner.jsx` — "Shopping List" button | No loading/disabled state while `shopLoading` | Disable button; optionally show spinner |
| **3.1.5** | `Profile.jsx` — page load | Plain text `"Loading profile…"` | Use global `.page-loading` with `<Loader size={20} className="spin" />` |
| **3.1.6** | `CookingSession.jsx` — init | Plain text `"Starting cooking session…"` shown for 2+ s | Animated `<ChefHat>` icon + subtitle `"Preparing your recipe…"` |
| **3.1.7** | `RecipeDetail.jsx` — fav button | Heart icon flips state without animation | CSS `transform: scale(1.25)` pulse keyframe on `.faved` transition |

### 3.2 Toast Notification Quality

| ID | Location | Issue | Fix |
|----|----------|-------|-----|
| **3.2.1** | `CookingSession.jsx:116` | Raw `err.message` on step update | Map to: `"Step couldn't be saved. Tap the step dot to retry."` |
| **3.2.2** | `MealPlanner.jsx` — all API error toasts | `err.message` could expose backend strings (e.g. "foreign key constraint") | Wrap: `err.status >= 500 ? 'Something went wrong. Please try again.' : (err.message \|\| 'Action failed.')` |
| **3.2.3** | `ShoppingList.jsx:77` — pantry-add failure | `'warning'` toast; revert is silent | Change to `'error'`; message: `"Could not add [item] to pantry — item unchecked."` |
| **3.2.4** | `Recipes.jsx` + `Favourites.jsx` — fav toggle | Errors silently swallowed (`catch {}`) — no feedback at all | `addToast('Recipe saved to Favourites!', 'success')` on success; `addToast('Could not update favourites.', 'error')` on fail |
| **3.2.5** | `RecipeDetail.jsx:77` — fav toggle | Same silent `catch {}` | Same fix as 3.2.4 |
| **3.2.6** | `ToastContext.jsx` — auto-dismiss | All toasts dismiss after hard-coded `4000ms` including errors | `success`/`info` → 4 s; `warning` → 6 s; `error` → no auto-dismiss (manual close only) |

---

## IMPLEMENTATION STATUS

| Phase | Items | Status |
|-------|-------|--------|
| **1.1 — Emoji Eradication** | 1.1.1 – 1.1.15 | ✅ Done |
| **1.2 — Color & Typography** | 1.2.1 – 1.2.7 | ✅ Done |
| **1.3 — Layout & Spacing** | 1.3.1 – 1.3.6 | ⬜ Pending |
| **2.1 – 2.4 — QA / Edge Cases** | 2.1.1 – 2.4.2 | ⬜ Pending |
| **3.1 – 3.2 — Micro-interactions** | 3.1.1 – 3.2.6 | ⬜ Pending |

---

## PRIORITY MATRIX

| Priority | Items |
|----------|-------|
| 🔴 **Critical** | 2.3.5 (ReferenceError crash), 2.4.2 (no 401 interceptor) |
| 🟠 **High** | 2.2.1 (auth expiry in cooking), 2.3.2, 2.3.3 (optimistic drag/drop false updates), 3.1.1, 3.1.2 (fav race conditions), 2.1.2 (NaN quantity submit) |
| 🟡 **Medium** | 1.3.x (layout polish), 2.2.3, 2.3.4, 2.3.6, 2.3.7, 3.2.x (toast quality), 2.4.1 (session expiry) |
| 🟢 **Low** | 1.3.3, 1.3.6 (dashboard/profile UX), 3.1.3–3.1.7 (spinners/animations), 2.1.3 |

---

**END OF REVIEW & PROPOSAL LOG**
