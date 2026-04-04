# PantryPal Backend - Endpoint Testing Guide

This document provides cURL commands to test all PantryPal backend endpoints.

## Prerequisites

1. Server running: `npm run dev`
2. Base URL: `http://localhost:5000`
3. Database: PostgreSQL initialized with schema and logic

---

## 1. Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected Response**:
```json
{
  "status": "OK",
  "message": "PantryPal Backend is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 2. API Documentation

```bash
curl http://localhost:5000/api/docs
```

Returns list of all available endpoints.

---

## 3. User Endpoints

### 3.1 Register User

```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123"
  }'
```

**Save the verification code from the response.**

### 3.2 Verify Email

```bash
curl -X POST http://localhost:5000/api/users/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

**Save the user_id from response.**

### 3.3 Login User

```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3.4 Get User Profile

```bash
curl http://localhost:5000/api/users/1
```

Replace `1` with actual `user_id`.

### 3.5 Update User Profile

```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "skill_level": "Intermediate",
    "dietary_preferences": [1, 2],
    "cuisine_preferences": [1, 2, 3]
  }'
```

### 3.6 Get Dietary Preferences

```bash
curl http://localhost:5000/api/users/preferences/dietary
```

### 3.7 Get Cuisines

```bash
curl http://localhost:5000/api/users/preferences/cuisines
```

---

## 4. Pantry Endpoints

### 4.1 Add Ingredient to Pantry

```bash
curl -X POST http://localhost:5000/api/pantry \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "ingredient_id": 1,
    "quantity": 2.5,
    "unit": "cups",
    "storage_location": "Pantry"
  }'
```

### 4.2 Get User's Pantry

```bash
curl http://localhost:5000/api/pantry/1
```

### 4.3 Update Pantry Item

```bash
curl -X PUT http://localhost:5000/api/pantry/1/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3,
    "unit": "cups",
    "storage_location": "Fridge"
  }'
```

### 4.4 Remove Ingredient from Pantry

```bash
curl -X DELETE http://localhost:5000/api/pantry/1/1
```

### 4.5 Get All Ingredients

```bash
curl http://localhost:5000/api/pantry/ingredients/all
```

### 4.6 Search Ingredients

```bash
curl "http://localhost:5000/api/pantry/ingredients/search?q=tomato"
```

---

## 5. Recipe Endpoints

### 5.1 Search Recipes by Pantry

```bash
curl "http://localhost:5000/api/recipes/search-by-pantry/1?page=1&limit=10"
```

### 5.2 Browse Recipes

```bash
curl "http://localhost:5000/api/recipes/browse?user_id=1&difficulty=Easy&page=1&limit=10"
```

**Optional filters**:
- `difficulty`: Easy, Medium, Hard
- `cuisine_id`: Cuisine ID
- `dietary_preference`: Dietary preference ID
- `sort_by`: trending, newest, rating

### 5.3 Get Recipe Details

```bash
curl "http://localhost:5000/api/recipes/1?user_id=1"
```

### 5.4 Get Available Cuisines

```bash
curl http://localhost:5000/api/recipes/options/cuisines
```

### 5.5 Get Available Dietary Preferences

```bash
curl http://localhost:5000/api/recipes/options/dietary-preferences
```

---

## Testing Workflow

### Complete User Flow

```bash
# 1. Register
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","password_confirm":"pass123"}'

# 2. Verify (note the code from response)
curl -X POST http://localhost:5000/api/users/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# 3. Login
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# 4. Get profile
curl http://localhost:5000/api/users/1

# 5. Update profile
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"skill_level":"Intermediate"}'
```

### Complete Pantry Flow

```bash
# 1. Get all ingredients
curl http://localhost:5000/api/pantry/ingredients/all

# 2. Add to pantry (replace ingredient_id with actual)
curl -X POST http://localhost:5000/api/pantry \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"ingredient_id":1,"quantity":2.5,"unit":"cups","storage_location":"Pantry"}'

# 3. View pantry
curl http://localhost:5000/api/pantry/1

# 4. Update item
curl -X PUT http://localhost:5000/api/pantry/1/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity":3,"unit":"cups","storage_location":"Fridge"}'

# 5. Remove item
curl -X DELETE http://localhost:5000/api/pantry/1/1
```

### Complete Recipe Flow

```bash
# 1. Get cuisine options
curl http://localhost:5000/api/recipes/options/cuisines

# 2. Get dietary preferences
curl http://localhost:5000/api/recipes/options/dietary-preferences

# 3. Search by pantry
curl "http://localhost:5000/api/recipes/search-by-pantry/1?page=1&limit=5"

# 4. Browse with filters
curl "http://localhost:5000/api/recipes/browse?user_id=1&difficulty=Easy&page=1&limit=5"

# 5. Get recipe details
curl "http://localhost:5000/api/recipes/1?user_id=1"
```

---

## Using Postman

1. Open Postman
2. Create new collection "PantryPal"
3. Add requests for each endpoint
4. Save responses for verification
5. Export collection for team sharing

**Quick import**: Create file `postman_collection.json` with:
- All endpoints from /api/users, /api/pantry, /api/recipes
- Request/response examples
- Environment variables for user_id, recipe_id, etc.

---

## Troubleshooting

### Error: "Cannot connect to server"
- Ensure server is running: `npm run dev`
- Check port 5000 is not in use
- Verify no firewall blocks localhost:5000

### Error: "Database connection failed"
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify schema.sql and logic.sql were executed

### Error: "Invalid user ID"
- Ensure user was created via /api/users/verify
- Use correct user_id from database

### Error: "Invalid ingredient ID"
- Run query: `SELECT * FROM ingredients;` in PostgreSQL
- Use valid ingredient_id from database

---

## Performance Testing

For load testing:

```bash
# Test with Apache Bench
ab -n 100 -c 10 http://localhost:5000/api/health

# Test with wrk
wrk -t4 -c100 -d30s http://localhost:5000/api/health
```

---

Last Updated: January 2024
