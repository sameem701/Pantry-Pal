# PantryPal API Documentation

Base URL: `http://localhost:5001`

## General Notes

- All responses are JSON unless an endpoint explicitly returns a file such as PDF.
- Most endpoints follow this response pattern:

```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

- User IDs, recipe IDs, plan IDs, and similar identifiers are numeric.
- Meal planner endpoints use lowercase meal types: `breakfast`, `lunch`, `dinner`.
- Recipe listing and search endpoints may filter out recipes that conflict with the requesting user's dietary preferences.

## Health

### GET /api/health
Checks that the server is running.

Example response:

```json
{
  "status": "OK"
}
```

## Users

### POST /api/users/register
Registers a new user in the temp users table.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123"
}
```

Example response:

```json
{
  "success": true,
  "message": "Verification code sent",
  "data": {
    "email": "user@example.com",
    "note": "Verification code sent to email (check console for testing: 123456)"
  }
}
```

### POST /api/users/verify
Verifies a temp user and creates the real account.

Request body:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Example response:

```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": 1,
  "email": "user@example.com"
}
```

### POST /api/users/login
Logs a user in.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Example response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "email": "user@example.com"
  }
}
```

### GET /api/users/:id
Returns a user profile.

Example response:

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "skill_level": "Beginner",
    "dietary_preferences": [],
    "cuisine_preferences": []
  }
}
```

### PUT /api/users/:id
Updates a user profile.

Request body:

```json
{
  "skill_level": "Advanced",
  "dietary_preferences": [1, 4],
  "cuisine_preferences": [1, 3]
}
```

### GET /api/users/preferences/dietary
Returns the available dietary preferences.

### GET /api/users/preferences/cuisines
Returns the available cuisines.

### POST /api/users/forgot-password
Requests a password reset code.

Request body:

```json
{
  "email": "user@example.com"
}
```

Example response:

```json
{
  "success": true,
  "message": "Reset code sent",
  "note": "Reset code sent to email (check console for testing: 123456)"
}
```

### POST /api/users/reset-password
Resets a user's password.

Request body:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "newpassword123",
  "new_password_confirm": "newpassword123"
}
```

## Pantry

### POST /api/pantry
Adds or updates a pantry item.

Request body:

```json
{
  "user_id": 1,
  "ingredient_id": 8,
  "quantity": 2,
  "unit": "cups",
  "storage_location": "Pantry"
}
```

### GET /api/pantry/:user_id
Returns the pantry contents for a user.

### PUT /api/pantry/:user_id/:ingredient_id
Updates a pantry item.

Request body:

```json
{
  "quantity": 3,
  "unit": "cups",
  "storage_location": "Pantry"
}
```

### DELETE /api/pantry/:user_id/:ingredient_id
Removes a pantry item.

### GET /api/pantry/ingredients/all
Returns the ingredient catalog.

### GET /api/pantry/ingredients/search?q=term
Searches ingredients by name.

Example:

`/api/pantry/ingredients/search?q=onion`

## Recipes

### GET /api/recipes
Lists published recipes.

Query parameters:
- `user_id` optional, used to apply dietary filtering
- `searchTerm`, `q`, or `search`
- `cuisineIds` or `cuisine_ids`
- `difficulty`
- `creatorId` or `creator_id`
- `limit`
- `offset`

### POST /api/recipes
Creates a recipe.

Request body:

```json
{
  "userId": 1,
  "title": "Runner A Rice Bowl",
  "description": "Example recipe",
  "difficulty": "Easy",
  "cookingTime": 20,
  "imageUrl": null,
  "status": "published",
  "ingredients": [
    { "ingredient_id": 8, "quantity": 200, "unit": "grams" }
  ],
  "instructions": [
    { "step_number": 1, "instruction_text": "Prep ingredients." }
  ],
  "cuisineIds": [1],
  "dietaryTagIds": [1],
  "nutrition": {
    "calories": 320,
    "protein_g": 11,
    "carbs_g": 55,
    "fat_g": 7
  }
}
```

### GET /api/recipes/:recipe_id
Returns full recipe details.

Query parameters:
- `user_id` optional, used for favourite state and pantry highlighting

### PUT /api/recipes/:id
Updates a recipe.

Request body uses the same structure as create.

### DELETE /api/recipes/:id
Deletes a recipe owned by the requesting user.

Request body:

```json
{
  "userId": 1
}
```

### GET /api/recipes/search-by-pantry/:user_id
Searches recipes based on pantry match.

Query parameters:
- `page`
- `limit`
- `cuisine_ids` or `cuisine_id`
- `difficulty`
- `max_missing`

### GET /api/recipes/browse
Browses community recipes.

Query parameters:
- `user_id` required
- `difficulty`
- `cuisine_ids` or `cuisine_id`
- `creator_id`
- `search_term` or `q`
- `page`
- `limit`

### GET /api/recipes/options/cuisines
Returns cuisine filter options.

### GET /api/recipes/options/dietary-preferences
Returns dietary preference filter options.

## Recipe Social and Cooking

### GET /api/recipes/favourites/:user_id
Lists a user's favourite recipes.

### POST /api/recipes/:recipe_id/favourite
Toggles favourite state.

Request body:

```json
{
  "user_id": 1
}
```

### GET /api/recipes/:recipe_id/reviews
Lists reviews for a recipe.

### POST /api/recipes/:recipe_id/reviews
Creates or updates a review.

Request body:

```json
{
  "user_id": 1,
  "rating": 5,
  "review_text": "Great recipe"
}
```

### DELETE /api/recipes/:recipe_id/reviews
Deletes a review.

Request body:

```json
{
  "user_id": 1
}
```

### POST /api/recipes/:recipe_id/cooking-sessions
Starts or resumes a cooking session.

Request body:

```json
{
  "user_id": 1
}
```

### GET /api/recipes/cooking-sessions/:session_id
Returns the cooking session state.

Query parameters:
- `user_id` required

### PATCH /api/recipes/cooking-sessions/:session_id/step
Updates the current cooking step.

Request body:

```json
{
  "user_id": 1,
  "step_number": 2
}
```

### PATCH /api/recipes/cooking-sessions/:session_id/complete
Marks the cooking session complete.

Request body:

```json
{
  "user_id": 1
}
```

## Meal Plans

### POST /api/meal-plans
Creates a meal plan.

Request body:

```json
{
  "user_id": 1,
  "week_start": "2026-04-05",
  "name": "Weekly Plan"
}
```

### GET /api/meal-plans/:planId
Returns a meal plan.

Query parameters:
- `user_id` required

### POST /api/meal-plans/:planId/meals
Adds or updates a meal in the plan.

Request body:

```json
{
  "user_id": 1,
  "recipe_id": 2,
  "day_of_week": "Monday",
  "meal_type": "lunch"
}
```

### DELETE /api/meal-plans/:planId/meals
Removes a meal from the plan.

Request body:

```json
{
  "user_id": 1,
  "day_of_week": "Monday",
  "meal_type": "lunch"
}
```

### PATCH /api/meal-plans/:planId/meals/cooked
Marks a planned meal as cooked.

Request body:

```json
{
  "user_id": 1,
  "day_of_week": "Monday",
  "meal_type": "lunch"
}
```

### DELETE /api/meal-plans/:planId
Clears a meal plan.

Query parameters:
- `user_id` required

### POST /api/meal-plans/:planId/suggestions
Generates weekly meal suggestions.

Request body:

```json
{
  "user_id": 1,
  "days": 7
}
```

### GET /api/meal-plans/:planId/missing-ingredients
Returns missing ingredients for the plan.

Query parameters:
- `user_id` required

### POST /api/meal-plans/:planId/shopping-list
Saves a shopping list.

Request body:

```json
{
  "user_id": 1,
  "items": [
    { "name": "Tomato", "quantity": "2", "category": "Produce" }
  ]
}
```

### GET /api/meal-plans/:planId/shopping-list/text
Returns the shopping list as plain text in JSON.

Query parameters:
- `user_id` required

### GET /api/meal-plans/:planId/shopping-list/export/pdf
Downloads the shopping list as a PDF.

Query parameters:
- `user_id` required

### PATCH /api/meal-plans/shopping-list/:listId/toggle
Toggles a shopping list item.

Request body:

```json
{
  "user_id": 1,
  "ingredient_name": "Tomato"
}
```

### POST /api/meal-plans/:planId/templates
Saves the current plan as a template.

Request body:

```json
{
  "user_id": 1,
  "name": "My Template"
}
```

### POST /api/meal-plans/:planId/templates/load
Loads a saved template into the plan.

Request body:

```json
{
  "user_id": 1,
  "template_id": 1
}
```

### GET /api/meal-plans/templates
Lists saved templates.

Query parameters:
- `user_id` required

### DELETE /api/meal-plans/templates/:templateId
Deletes a template.

Query parameters:
- `user_id` required

### GET /api/meal-plans/recipes/:recipeId/nutrition
Returns nutrition info for a recipe.

### GET /api/meal-plans/:planId/nutrition
Returns weekly nutrition totals.

Query parameters:
- `user_id` required

## Example Successful Response

```json
{
  "success": true,
  "message": "Recipe deleted"
}
```

## Example Error Response

```json
{
  "success": false,
  "message": "Invalid meal type"
}
```
