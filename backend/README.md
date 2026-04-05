# Workflow 2 - Interactive Cooking & Recipe Creation

## Setup Instructions

### Prerequisites

- Node.js
- PostgreSQL

### Installation

1. Navigate to the workflow2-backend folder:
   cd workflow2-backend

2. Install dependencies:
   npm install

3. Create a .env file with:
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pantrypal_db"
   PORT=3000

4. Apply the PostgreSQL schema and functions from the repo root:
   - `database/schema.sql`
   - `database/logic.sql`

5. Start the server:
   npm run dev

Server runs on http://localhost:3000

---

## API Endpoints

### Recipes

| Method | Endpoint         | Description      |
| ------ | ---------------- | ---------------- |
| GET    | /api/recipes     | Get all recipes  |
| GET    | /api/recipes/:id | Get recipe by ID |
| POST   | /api/recipes     | Create a recipe  |
| PUT    | /api/recipes/:id | Update a recipe  |
| DELETE | /api/recipes/:id | Delete a recipe  |

### Reviews

| Method | Endpoint                                   | Description              |
| ------ | ------------------------------------------ | ------------------------ |
| GET    | /api/reviews/recipe/:recipeId              | Get reviews for a recipe |
| POST   | /api/reviews                               | Create a review          |
| PUT    | /api/reviews/user/:userId/recipe/:recipeId | Update a review          |
| DELETE | /api/reviews/user/:userId/recipe/:recipeId | Delete a review          |

### Favorites

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| GET    | /api/favorites/user/:userId | Get user favorites    |
| POST   | /api/favorites              | Add to favorites      |
| DELETE | /api/favorites              | Remove from favorites |

### Cooking Sessions

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| POST   | /api/cooking/start        | Start cooking session |
| GET    | /api/cooking/:id?userId=1 | Get session details   |
| PUT    | /api/cooking/:id/step     | Update current step   |
| PUT    | /api/cooking/:id/complete | Mark session complete |

---

## Example Requests

### Create a Recipe

POST /api/recipes

```json
{
  "userId": 1,
  "title": "Pasta Aglio e Olio",
  "difficulty": "Easy",
  "cookTime": 20,
  "imageUrl": null,
  "status": "published",
  "ingredients": [{ "ingredient_id": 1, "quantity": 200, "unit": "g" }],
  "instructions": [{ "step_number": 1, "instruction_text": "Boil pasta" }],
  "cuisineIds": [],
  "dietaryTagIds": []
}
```

### Create a Review

POST /api/reviews

```json
{
  "userId": 1,
  "rating": 5,
  "reviewText": "Delicious and easy!",
  "recipeId": 1
}
```

### Start a Cooking Session

POST /api/cooking/start

```json
{
  "userId": 1,
  "recipeId": 1
}
```

### Add to Favorites

POST /api/favorites

```json
{
  "userId": 1,
  "recipeId": 1
}
```
