# PantryPal — Frontend

React 19 + Vite single-page application for PantryPal.

> **Full setup instructions, feature list, and team contributions are in the [root README](../README.md).**

## Quick Start

```bash
npm install
npm run dev       # Vite dev server → http://localhost:5174
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

## Key Directories

| Path | Contents |
|---|---|
| `src/services/` | Page-level components (Dashboard, Pantry, RecipeDetail, MealPlanner, ShoppingList, CookingSession, etc.) |
| `src/components/` | Shared UI components (ConfirmModal, StarRating, …) |
| `src/api/` | Fetch wrappers for all backend endpoints |
| `src/context/` | React context providers (AuthContext, ToastContext) |
| `src/utils/` | Local-storage helpers, food-group classifier, nav guard |
| `src/App.css` | Global design tokens (Deep Autumn palette, typography, spacing)
