# PantryPal

PantryPal is a Node.js + PostgreSQL backend for user setup, pantry management, recipe discovery, cooking sessions, and meal planning.

## Prerequisites

- Node.js 20+ recommended
- PostgreSQL database
- `npm`

## Environment Variables

Create a `backend/.env` file with:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
PORT=5001
```

`DATABASE_URL` is required. `PORT` is optional and defaults to `5001`.

## Database setup

No setup required as it is hosted on supabase.

## Backend Setup

From the project root:

```powershell
cd backend
npm.cmd install
```

If you are using a shell where `npm.cmd` is not needed, `npm install` also works.

## Run the Server

From the `backend` folder:

```powershell
node server.js
```

The server listens on `PORT` from `.env`.

## Run the Endpoint Test Suite

With the server running:

```powershell
cd backend
node test-endpoints.js
```

The test runner uses the backend port automatically from `.env`.

## Project Structure

- `backend/` - Express server, controllers, routes, and endpoint test runner
- `database/` - Schema, database logic, and sample data
- `workflow.txt` - Functional requirements for the application

## Notes

- `backend/test-endpoints.js` exercises the API in a dependency-safe order.
- The sample data includes lookup tables, users, recipes, pantry items, reviews, favourites, and meal-planning data.
