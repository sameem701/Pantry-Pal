# PantryPal API Documentation

## Overview

PantryPal Backend API provides endpoints for managing users, pantry ingredients, and recipe discovery. Built with Node.js/Express and PostgreSQL.

**Base URL**: `http://localhost:5000/api`

**API Version**: 1.0.0

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Users API](#users-api)
4. [Pantry API](#pantry-api)
5. [Recipes API](#recipes-api)
6. [Response Format](#response-format)
7. [Error Handling](#error-handling)

---

## Getting Started

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sameem701/Pantry-Pal.git
   cd Pantry-Pal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your DATABASE_URL
   ```

4. **Initialize database**
   ```bash
   # Run schema.sql on your PostgreSQL database
   psql -U username -d pantrypal_db -f database/schema.sql
   psql -U username -d pantrypal_db -f database/logic.sql
   ```

5. **Start the server**
   ```bash
   npm run dev       # Development mode (with nodemon)
   npm start         # Production mode
   ```

6. **Verify server is running**
   ```bash
   curl http://localhost:5000/api/health
   ```

### Quick Test

```bash
# Health Check
curl http://localhost:5000/api/health

# API Documentation
curl http://localhost:5000/api/docs
```

---

## Authentication

**Note**: User login/register flows do NOT count toward Workflow 1 completion but are included for full functionality.

After a user logs in, store the `user_id` in your frontend and include it in subsequent API calls (as path parameter or query parameter).

---

## Users API

### 1. Register User (Step 1)

Create a temporary user record and send verification code.

**Endpoint**: `POST /users/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123"
}
```

**Response** (Success - 201):
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

**Response** (Error - 400):
```json
{
  "success": false,
  "message": "Invalid email format" | "Passwords do not match" | "Email already registered"
}
```

---

### 2. Verify Email (Step 2)

Verify email and promote temp record to real user.

**Endpoint**: `POST /users/verify`

**Request Body**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": 1,
  "email": "user@example.com"
}
```

---

### 3. Login User

Authenticate user with email and password.

**Endpoint**: `POST /users/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "user_id": 1,
  "email": "user@example.com",
  "skill_level": "Beginner"
}
```

---

### 4. Get User Profile

Retrieve complete user profile with preferences.

**Endpoint**: `GET /users/:id`

**Path Parameters**:
- `id` (integer): User ID

**Example**:
```bash
curl http://localhost:5000/api/users/1
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "skill_level": "Beginner",
    "dietary_preferences": [1, 3, 5],
    "cuisine_preferences": [1, 2],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. Update User Profile

Update user skill level and preferences.

**Endpoint**: `PUT /users/:id`

**Path Parameters**:
- `id` (integer): User ID

**Request Body**:
```json
{
  "skill_level": "Intermediate",
  "dietary_preferences": [1, 2, 3],
  "cuisine_preferences": [1, 4, 5]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": 1,
    "skill_level": "Intermediate",
    "dietary_preferences": [1, 2, 3],
    "cuisine_preferences": [1, 4, 5]
  }
}
```

---

### 6. Get Dietary Preferences

Get all available dietary preference options.

**Endpoint**: `GET /users/preferences/dietary`

**Example**:
```bash
curl http://localhost:5000/api/users/preferences/dietary
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "preference_id": 1,
      "preference_name": "Vegan",
      "preference_type": "Restrictions"
    },
    {
      "preference_id": 2,
      "preference_name": "Vegetarian",
      "preference_type": "Restrictions"
    },
    {
      "preference_id": 3,
      "preference_name": "Gluten-Free",
      "preference_type": "Restrictions"
    }
  ]
}
```

---

### 7. Get Available Cuisines

Get all cuisine options for user preferences.

**Endpoint**: `GET /users/preferences/cuisines`

**Example**:
```bash
curl http://localhost:5000/api/users/preferences/cuisines
```

**Response**:
```json
{
  "success": true,
  "data": [
    { "cuisine_id": 1, "name": "Italian" },
    { "cuisine_id": 2, "name": "Mexican" },
    { "cuisine_id": 3, "name": "Asian" },
    { "cuisine_id": 4, "name": "Indian" }
  ]
}
```

---

### 8. Request Password Reset

Send password reset code to email.

**Endpoint**: `POST /users/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Reset code sent",
  "note": "Reset code sent to email (check console for testing: 654321)"
}
```

---

### 9. Reset Password

Reset password with verification code.

**Endpoint**: `POST /users/reset-password`

**Request Body**:
```json
{
  "email": "user@example.com",
  "code": "654321",
  "new_password": "newpassword123",
  "new_password_confirm": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Pantry API

### 1. Add Ingredient to Pantry

Add or update an ingredient in user's pantry.

**Endpoint**: `POST /pantry`

**Request Body**:
```json
{
  "user_id": 1,
  "ingredient_id": 5,
  "quantity": 2.5,
  "unit": "cups",
  "storage_location": "Pantry"
}
```

**Parameters**:
- `user_id` (integer, required): User ID
- `ingredient_id` (integer, required): Ingredient ID
- `quantity` (decimal, required): Amount of ingredient
- `unit` (string): Unit of measurement (cups, grams, ml, etc.)
- `storage_location` (string): "Fridge", "Pantry", or "Freezer"

**Response** (Success - 201):
```json
{
  "success": true,
  "message": "Ingredient added to pantry",
  "data": {
    "user_id": 1,
    "ingredient_id": 5,
    "ingredient_name": "Tomato",
    "quantity": 2.5,
    "unit": "cups",
    "storage_location": "Pantry",
    "added_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get User's Pantry

Retrieve all ingredients in user's pantry, grouped by storage location.

**Endpoint**: `GET /pantry/:user_id`

**Path Parameters**:
- `user_id` (integer): User ID

**Example**:
```bash
curl http://localhost:5000/api/pantry/1
```

**Response**:
```json
{
  "success": true,
  "data": {
    "Fridge": [
      {
        "ingredient_id": 1,
        "ingredient_name": "Milk",
        "quantity": 1,
        "unit": "liter",
        "storage_location": "Fridge"
      }
    ],
    "Pantry": [
      {
        "ingredient_id": 5,
        "ingredient_name": "Tomato",
        "quantity": 2.5,
        "unit": "cups",
        "storage_location": "Pantry"
      }
    ],
    "Freezer": []
  }
}
```

---

### 3. Update Pantry Item

Update quantity or storage location of an ingredient.

**Endpoint**: `PUT /pantry/:user_id/:ingredient_id`

**Path Parameters**:
- `user_id` (integer): User ID
- `ingredient_id` (integer): Ingredient ID

**Request Body**:
```json
{
  "quantity": 3,
  "unit": "cups",
  "storage_location": "Fridge"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Pantry item updated",
  "data": {
    "user_id": 1,
    "ingredient_id": 5,
    "quantity": 3,
    "unit": "cups",
    "storage_location": "Fridge"
  }
}
```

---

### 4. Remove Ingredient from Pantry

Delete an ingredient from user's pantry.

**Endpoint**: `DELETE /pantry/:user_id/:ingredient_id`

**Path Parameters**:
- `user_id` (integer): User ID
- `ingredient_id` (integer): Ingredient ID

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/pantry/1/5
```

**Response**:
```json
{
  "success": true,
  "message": "Ingredient removed from pantry"
}
```

---

### 5. Get All Available Ingredients

Get complete list of ingredients in database.

**Endpoint**: `GET /pantry/ingredients/all`

**Example**:
```bash
curl http://localhost:5000/api/pantry/ingredients/all
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "ingredient_id": 1,
      "ingredient_name": "Milk",
      "category": "Dairy"
    },
    {
      "ingredient_id": 2,
      "ingredient_name": "Egg",
      "category": "Protein"
    },
    {
      "ingredient_id": 5,
      "ingredient_name": "Tomato",
      "category": "Vegetables"
    }
  ]
}
```

---

### 6. Search Ingredients

Search for ingredients by name.

**Endpoint**: `GET /pantry/ingredients/search?q=term`

**Query Parameters**:
- `q` (string, required): Search term

**Example**:
```bash
curl "http://localhost:5000/api/pantry/ingredients/search?q=tom"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "ingredient_id": 5,
      "ingredient_name": "Tomato",
      "category": "Vegetables"
    },
    {
      "ingredient_id": 6,
      "ingredient_name": "Tomato Sauce",
      "category": "Condiments"
    }
  ]
}
```

---

## Recipes API

### 1. Search Recipes by Pantry

Find recipes based on ingredients available in user's pantry.

**Endpoint**: `GET /recipes/search-by-pantry/:user_id`

**Path Parameters**:
- `user_id` (integer): User ID

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 10)

**Example**:
```bash
curl "http://localhost:5000/api/recipes/search-by-pantry/1?page=1&limit=10"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "recipe_id": 42,
      "title": "Simple Tomato Pasta",
      "difficulty": "Easy",
      "cooking_time_min": 20,
      "image_url": "https://...",
      "ingredients_matched": 5,
      "total_ingredients": 7
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

### 2. Browse Recipes with Filters

Discover recipes with multiple filter options.

**Endpoint**: `GET /recipes/browse`

**Query Parameters**:
- `user_id` (integer, required): User making the request
- `difficulty` (string): "Easy", "Medium", or "Hard"
- `cuisine_id` (integer): Filter by cuisine
- `dietary_preference` (integer): Filter by dietary tag
- `sort_by` (string): "trending", "newest", or "rating" (default: "trending")
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 10)

**Example**:
```bash
curl "http://localhost:5000/api/recipes/browse?user_id=1&difficulty=Easy&cuisine_id=1&sort_by=trending&page=1&limit=10"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "recipe_id": 1,
      "title": "Italian Pasta",
      "difficulty": "Easy",
      "cooking_time_min": 20,
      "image_url": "https://...",
      "rating": 4.5,
      "favourite_count": 125
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10
  },
  "filters": {
    "difficulty": "Easy",
    "cuisineId": 1,
    "dietaryPreference": null,
    "sortBy": "trending"
  }
}
```

---

### 3. Get Recipe Details

Get complete recipe information including ingredients and instructions.

**Endpoint**: `GET /recipes/:recipe_id`

**Path Parameters**:
- `recipe_id` (integer): Recipe ID

**Query Parameters**:
- `user_id` (integer, optional): User ID (to check if user favorited)

**Example**:
```bash
curl "http://localhost:5000/api/recipes/1?user_id=1"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recipe_id": 1,
    "title": "Italian Pasta",
    "difficulty": "Easy",
    "cooking_time_min": 20,
    "image_url": "https://...",
    "status": "published",
    "ingredients": [
      {
        "ingredient_id": 5,
        "ingredient_name": "Tomato",
        "quantity": 2,
        "unit": "cups"
      }
    ],
    "instructions": [
      {
        "step_number": 1,
        "instruction_text": "Boil water in a pot..."
      }
    ],
    "nutrition": {
      "calories": 350,
      "protein_g": 12,
      "carbs_g": 45,
      "fat_g": 8
    },
    "dietary_tags": ["Vegetarian"],
    "cuisines": ["Italian"],
    "user_favorited": false
  }
}
```

---

### 4. Get Available Cuisines

Get all cuisine options for filtering.

**Endpoint**: `GET /recipes/options/cuisines`

**Example**:
```bash
curl http://localhost:5000/api/recipes/options/cuisines
```

**Response**:
```json
{
  "success": true,
  "data": [
    { "cuisine_id": 1, "name": "Italian" },
    { "cuisine_id": 2, "name": "Mexican" },
    { "cuisine_id": 3, "name": "Asian" },
    { "cuisine_id": 4, "name": "Indian" }
  ]
}
```

---

### 5. Get Available Dietary Preferences

Get all dietary preference options for filtering.

**Endpoint**: `GET /recipes/options/dietary-preferences`

**Example**:
```bash
curl http://localhost:5000/api/recipes/options/dietary-preferences
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "preference_id": 1,
      "preference_name": "Vegan",
      "preference_type": "Restrictions"
    },
    {
      "preference_id": 2,
      "preference_name": "Vegetarian",
      "preference_type": "Restrictions"
    }
  ]
}
```

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details (development only)"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK - Request succeeded |
| 201  | Created - Resource created |
| 400  | Bad Request - Invalid parameters |
| 404  | Not Found - Resource not found |
| 500  | Server Error - Internal error |

---

## Error Handling

Common error scenarios:

**Invalid User ID**:
```json
{
  "success": false,
  "message": "Valid user_id is required"
}
```

**Missing Required Fields**:
```json
{
  "success": false,
  "message": "user_id, ingredient_id, and quantity are required"
}
```

**Database Error**:
```json
{
  "success": false,
  "message": "Server error",
  "error": "Database connection failed"
}
```

---

## Testing with cURL

### Test Register Flow
```bash
# Step 1: Register
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123"
  }'

# Step 2: Verify (use code from Step 1 response)
curl -X POST http://localhost:5000/api/users/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Test Pantry API
```bash
# Add ingredient to pantry
curl -X POST http://localhost:5000/api/pantry \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "ingredient_id": 5,
    "quantity": 2.5,
    "unit": "cups",
    "storage_location": "Pantry"
  }'

# Get user's pantry
curl http://localhost:5000/api/pantry/1

# Search recipes by pantry
curl "http://localhost:5000/api/recipes/search-by-pantry/1?page=1&limit=10"
```

---

## Notes for Development

- **Authentication**: Currently no token validation. In production, implement JWT authentication.
- **Password Hashing**: Today passwords are stored plaintext. Implement bcrypt hashing in production.
- **Email Service**: Verification codes are printed to console. Integrate email service (SendGrid, Nodemailer, etc.)
- **Validation**: Basic validation implemented. Consider adding more robust validation middleware.

---

## Support

For issues or questions:
1. Check GitHub issues: https://github.com/sameem701/Pantry-Pal/issues
2. Contact team members: Muhammad Ahzam, Sohaib Sohail, Muhammad Sameem

---

**Last Updated**: January 2024  
**API Version**: 1.0.0
