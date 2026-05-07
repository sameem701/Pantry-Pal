# PantryPal

A full-stack smart meal planning and pantry management web application. PantryPal helps users discover recipes based on what they already own, plan their weekly meals, build categorised shopping lists, and cook step-by-step with per-step timers — all in one place.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Frameworks & Libraries](#frameworks--libraries)
4. [Setup Instructions](#setup-instructions)
5. [Team Contributions](#team-contributions)

---

## Project Overview

PantryPal is designed to reduce food waste and simplify meal planning. Users maintain a digital pantry inventory, browse or search recipes, and see at a glance which recipes they can cook right now. A weekly calendar lets them drag-and-drop meals, a nutrition dashboard tracks daily macro targets, and smart suggestion engine recommends distinct recipes per option while avoiding anything already planned for the week. Completed meals automatically deduct used ingredients from the pantry.

---

## Features

### Pantry Management
- Add, edit, and remove pantry items with quantity, unit, and storage location (Fridge / Pantry / Freezer)
- Visual indicators show stock levels at a glance

### Recipe Discovery
- Browse all published community recipes with image, difficulty badge, and cuisine tags
- Full-text search and filter by cuisine, dietary preference, and cook time
- Recipe detail page shows description, ingredients (with pantry availability highlights), step-by-step instructions, and nutrition macros
- Save recipes to favourites; leave star ratings and written reviews

### Cooking Mode
- Step-by-step guided cooking session with progress tracker
- **Per-step countdown timer** — auto-detects time mentions in the instruction text and offers a one-click hint; supports custom minute input
- Timer pulses red during the final 10 seconds; resets automatically on step change
- Missing-ingredient warning before a session begins, with option to proceed anyway
- Post-cook nutrition logging modal; recently cooked recipes persisted locally

### Meal Planning & Nutrition
- Drag-and-drop weekly calendar (Breakfast / Lunch / Dinner per day)
- Mark individual meals as Cooked — automatically deducts pantry stock
- Smart suggestion panel: three distinct option sets of 3 recipes each, all different across options, all excluding recipes already planned for the current week
- Nutrition tab with daily macro rings (Calories, Protein, Carbs, Fat) and weekly bar chart
- Missing-ingredient summary for the whole week with one-click shopping list generation

### Shopping Lists
- Auto-generated from recipe missing ingredients or added manually
- **Categorisation by food group** — toggle "By Category" to group items into Produce, Meat & Seafood, Dairy & Eggs, Grains & Pasta, etc.
- Check off items to automatically add them to your pantry
- **Export as plain-text `.txt` file** (in addition to existing PDF export) and copy to clipboard
- Mark All shortcut adds all unchecked items to pantry in one click

### User Accounts & Profiles
- Email/password authentication with JWT-style sessions
- Skill-level profile; dietary preferences respected by recipe suggestions
- Dashboard with pantry-health summary, macro ring for today, and recently cooked recipes

---

## Frameworks & Libraries

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI component framework |
| **Vite 8** | Development server and build tool |
| **React Router DOM v7** | Client-side routing |
| **Lucide React** | SVG icon library |
| Plain **CSS** (per-component) | Styling with CSS custom properties (Deep Autumn design tokens) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express 4** | HTTP server and REST API |
| **node-postgres (`pg`)** | PostgreSQL client |
| **Multer** | Multipart file upload (recipe images) |
| **PDFKit** | Server-side PDF generation for shopping lists |
| **dotenv** | Environment variable management |
| **nodemon** | Development auto-restart |

### Database
| Technology | Purpose |
|---|---|
| **PostgreSQL** (hosted on Supabase) | Relational database |
| Stored procedures / functions (PL/pgSQL) | Core business logic (session management, suggestions, pantry deduction, nutrition aggregation) |

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- A PostgreSQL database (local or Supabase)
- Git

### 1 — Clone the repository

```bash
git clone https://github.com/<your-org>/pantry-pal.git
cd pantry-pal
```

### 2 — Configure environment variables

Create `backend/.env` from the example below:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
PORT=5001
```

> If using Supabase, copy the **Connection String** from your project's database settings.

### 3 — Seed the database

The `database/` folder contains two files that must be run **in order** against your PostgreSQL instance:

| File | Purpose |
|---|---|
| `database/schema.sql` | Creates all tables, constraints, and indexes |
| `database/logic.sql` | Creates all stored functions and triggers |
| `database/sample_data.sql` | Inserts sample users, recipes, ingredients, and meal plans |

Run them via your preferred PostgreSQL client (psql, DBeaver, Supabase SQL editor, etc.):

```sql
-- Run in order:
\i database/schema.sql
\i database/logic.sql
\i database/sample_data.sql
```

After seeding, run the image + description migration script:

```bash
node backend/scripts/seed-images.js
```

### 4 — Install dependencies & start the backend

```bash
cd backend
npm install
npm run dev       # starts on port 5001 (nodemon, auto-reload)
# or
npm start         # production
```

### 5 — Install dependencies & start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev       # starts Vite dev server, typically http://localhost:5174
```

### 6 — Open the app

Navigate to `http://localhost:5174` in your browser.

**Sample login credentials** (from seeded data):

| Email | Password |
|---|---|
| sarah.chen@gmail.com | 12345678 |
| james.patel@hotmail.com | 12345678 |
| emma.wilson@outlook.com | 12345678 |
| miguel.torres@gmail.com | 12345678 |
| priya.sharma@yahoo.com | 12345678 |

---

## Team Contributions

| Team Member | Workflow | Responsibilities |
|---|---|---|
| **Sohaib** | Workflow 1 — User Setup & Recipe Discovery | User registration and login; profile management (dietary restrictions, cuisine preferences, skill level); pantry management (add/edit/remove ingredients, quantity, storage location); recipe search and filtering (by pantry match, dietary tag, cuisine, difficulty); recipe detail view with ingredient availability highlights |
| **Ahzam** | Workflow 2 — Interactive Cooking & Recipe Creation | Step-by-step cooking mode with progress bar and per-step countdown timers; post-cooking actions (star ratings, written reviews, save to favourites, pantry deduction on completion); create-your-own recipe (title, description, ingredients, instructions, difficulty, dietary tags, publish/draft); community recipe browsing and saving |
| **Sameem** | Workflow 3 — Meal Planning & Smart Features | Weekly meal planner calendar with drag-and-drop and click-to-assign; smart meal suggestions (3 distinct option sets, excludes already-planned recipes); shopping list generation with food-group categorisation (Produce, Dairy, Meat, etc.), check-off-to-pantry, plain-text and PDF export; nutrition dashboard (daily macro rings, weekly bar chart); meal completion tracking with automatic pantry deduction |
