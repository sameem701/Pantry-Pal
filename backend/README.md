# PantryPal — Backend

Node.js / Express REST API for the PantryPal application.

> **Full setup instructions, feature list, and team contributions are in the [root README](../README.md).**

## Quick Start

```bash
# 1. Create backend/.env with your DATABASE_URL (see root README)
# 2. Install dependencies
npm install

# 3. Start in development mode (nodemon, auto-reload)
npm run dev

# 4. Start in production mode
npm start
```

Server listens on `PORT` from `.env`, defaulting to **5001**.

## Key Directories

| Path | Contents |
|---|---|
| `routes/` | Express routers (auth, recipes, pantry, meal-plans, nutrition, uploads) |
| `controllers/` | Business logic handlers |
| `config/database.js` | PostgreSQL pool setup |
| `scripts/` | One-off migration / seeding scripts |
| `uploads/` | Static recipe images served at `/uploads/*` |
