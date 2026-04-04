# PantryPal Backend Setup Guide

## Prerequisites

- **Node.js** v16+ installed
- **npm** or **yarn** package manager
- **PostgreSQL** v12+ installed and running
- **Git** for version control

## Setup Steps

### 1. Clone Repository

```bash
git clone https://github.com/sameem701/Pantry-Pal.git
cd Pantry-Pal
```

### 2. Switch to Workflow 1 Branch

```bash
git checkout workflow1
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your database credentials
# Open .env in your editor and update:
# - DATABASE_URL: Your PostgreSQL connection string
# - NODE_ENV: Set to 'development' or 'production'
# - PORT: Server port (default: 5000)
```

**Example .env**:
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/pantrypal_db
CORS_ORIGIN=*
```

### 5. Setup PostgreSQL Database

```bash
# Create database
createdb pantrypal_db

# Run schema and migrations
psql -U postgres -d pantrypal_db -f database/schema.sql
psql -U postgres -d pantrypal_db -f database/logic.sql
```

**Alternative (if using pgAdmin or another client)**:
1. Create new database named `pantrypal_db`
2. Open `database/schema.sql` in your PostgreSQL client and execute
3. Open `database/logic.sql` and execute

### 6. Start Development Server

```bash
npm run dev
```

Expected output:
```
╔════════════════════════════════════════╗
║     🍳 PantryPal Backend Server 🍳     ║
╚════════════════════════════════════════╝

✅ Server started on port 5000
📝 Environment: development
📚 API Docs: http://localhost:5000/api/docs
🏥 Health Check: http://localhost:5000/api/health

Endpoints:
  👤 Users:   http://localhost:5000/api/users
  🩶 Pantry:  http://localhost:5000/api/pantry
  🍽️  Recipes: http://localhost:5000/api/recipes
```

### 7. Verify Installation

```bash
# Health check
curl http://localhost:5000/api/health

# API Documentation
curl http://localhost:5000/api/docs
```

---

## Project Structure

```
Pantry-Pal/
├── src/
│   ├── app.js                 # Express app setup
│   ├── index.js               # Server entry point
│   ├── config/
│   │   └── db.js              # Database connection pool
│   ├── services/
│   │   ├── user.service.js    # User business logic
│   │   ├── pantry.service.js  # Pantry business logic
│   │   └── recipe.service.js  # Recipe business logic
│   └── routes/
│       ├── user.routes.js     # User endpoints
│       ├── pantry.routes.js   # Pantry endpoints
│       └── recipe.routes.js   # Recipe endpoints
├── database/
│   ├── schema.sql             # Database schema
│   ├── logic.sql              # Database functions
│   └── db_setup.py            # Optional: DB setup script
├── .env.example               # Environment variables template
├── package.json               # Project dependencies
├── API_DOCUMENTATION.md       # Complete API reference
└── SETUP_GUIDE.md             # This file
```

---

## Architecture

### Three-Layer Architecture

1. **Routes Layer** (`/src/routes/`)
   - Handles HTTP requests/responses
   - Validates input parameters
   - Returns consistent JSON responses

2. **Service Layer** (`/src/services/`)
   - Contains business logic
   - Calls database functions
   - Handles data transformation

3. **Data Layer** (`/src/config/`)
   - PostgreSQL connection pool
   - Executes SQL functions

### Data Flow

```
HTTP Request
    ↓
Routes (Validation)
    ↓
Services (Business Logic)
    ↓
Database (PostgreSQL Pool → SQL Functions)
    ↓
Services (Format Response)
    ↓
Routes (JSON Response)
    ↓
HTTP Response
```

---

## Available Scripts

```bash
# Development (with nodemon auto-reload)
npm run dev

# Production
npm start

# Test (when available)
npm test
```

---

## API Endpoints

### Users API
- `POST /api/users/register` - Register new user
- `POST /api/users/verify` - Verify email
- `POST /api/users/login` - Login user
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Pantry API
- `POST /api/pantry` - Add ingredient
- `GET /api/pantry/:user_id` - Get user's pantry
- `PUT /api/pantry/:user_id/:ingredient_id` - Update ingredient
- `DELETE /api/pantry/:user_id/:ingredient_id` - Remove ingredient
- `GET /api/pantry/ingredients/all` - Get all ingredients
- `GET /api/pantry/ingredients/search?q=term` - Search ingredients

### Recipes API
- `GET /api/recipes/search-by-pantry/:user_id` - Search recipes by pantry
- `GET /api/recipes/browse` - Browse recipes with filters
- `GET /api/recipes/:recipe_id` - Get recipe details
- `GET /api/recipes/options/cuisines` - Get cuisines
- `GET /api/recipes/options/dietary-preferences` - Get dietary preferences

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## Troubleshooting

### Database Connection Error

```
Error: ECONNREFUSED 127.0.0.1:5432
```

**Solution**: 
- Ensure PostgreSQL is running: `sudo service postgresql start` (Linux) or start PostgreSQL app (macOS/Windows)
- Check DATABASE_URL in .env is correct
- Verify database name exists: `psql -l`

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
- Change PORT in .env file
- Or kill process using port 5000: `sudo lsof -i :5000` then `kill -9 <PID>`

### Module Not Found

```
Error: Cannot find module 'express'
```

**Solution**:
- Run `npm install` to install dependencies
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Schema Not Found

```
Error: relation "app_users" does not exist
```

**Solution**:
- Run schema setup: `psql -U postgres -d pantrypal_db -f database/schema.sql`
- Check database name matches DATABASE_URL

---

## Development Best Practices

### Code Organization
- Keep routes focused on HTTP handling
- Put business logic in services
- Use meaningful variable names
- Add comments for complex logic

### Error Handling
- Always validate input parameters
- Return consistent error responses
- Log errors to console for debugging
- Use appropriate HTTP status codes

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make changes and commit
git add .
git commit -m "feat: implement user authentication"

# Push to branch
git push origin feature/user-authentication

# Create pull request on GitHub
# After review, merge to main
```

### Testing
Use tools like Postman or cURL to test endpoints:

```bash
# Test user registration
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","password_confirm":"pass123"}'

# Test pantry
curl -X POST http://localhost:5000/api/pantry \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"ingredient_id":5,"quantity":2.5,"unit":"cups","storage_location":"Pantry"}'
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment mode |
| PORT | 5000 | Server port |
| DATABASE_URL | - | PostgreSQL connection string |
| CORS_ORIGIN | * | Allowed CORS origins |

---

## Next Steps

1. ✅ Complete Setup (you are here)
2. 📝 Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. 🧪 Test all endpoints using cURL or Postman
4. 🔧 Integrate with frontend (when ready)
5. 🚀 Deploy to production

---

## Support

- **GitHub Issues**: https://github.com/sameem701/Pantry-Pal/issues
- **Team**: Muhammad Ahzam, Sohaib Sohail, Muhammad Sameem
- **TAs**: adeenaoop, Muh-Aqib-Shah

---

Last Updated: January 2024
