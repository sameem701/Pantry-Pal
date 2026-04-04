# PantryPal - Smart Cooking Assistant

A web application that helps users manage pantry ingredients, discover recipes, and plan meals.

**Status**: Milestone 3 - Workflow 1 Implementation ✅

## Quick Links

- 📚 [API Documentation](./API_DOCUMENTATION.md) - Complete API reference with examples
- 🔧 [Setup Guide](./SETUP_GUIDE.md) - Installation and configuration instructions
- 📋 [Workflow Documentation](./workflow.txt) - Project workflows and features

## Team Members
- Muhammad Ahzam
- Sohaib Sohail
- Muhammad Sameem

## Project Workflows

### ✅ Workflow 1: User Setup & Recipe Discovery (Currently Implementing)
**Features:**
- User registration, login, and profile management
- Dietary restrictions and cuisine preferences
- Pantry ingredient management (add, update, remove)
- Recipe search by available ingredients
- Recipe filtering and discovery

**Endpoints:**
- Users: `/api/users/*`
- Pantry: `/api/pantry/*`
- Recipes: `/api/recipes/*`

### 📋 Workflow 2: Interactive Cooking & Recipe Creation
- Interactive cooking sessions with step-by-step guidance
- User-created recipes (draft/publish)
- Recipe reviews and ratings

### 📋 Workflow 3: Meal Planning & Smart Features
- Weekly meal planning
- Shopping list generation
- Meal plan templates
- Nutrition tracking

## Quick Start

### Setup Backend

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database URL

# 3. Initialize database
psql -U postgres -d pantrypal_db -f database/schema.sql
psql -U postgres -d pantrypal_db -f database/logic.sql

# 4. Start server
npm run dev
```

**Server runs on**: `http://localhost:5000`

### Test API

```bash
# Health check
curl http://localhost:5000/api/health

# View API docs
curl http://localhost:5000/api/docs
```

## Technology Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL with custom SQL functions
- CORS enabled for frontend communication

**Database:**
- PostgreSQL
- Advanced functions for complex queries
- Automated triggers for data consistency

**Version Control:**
- Git with meaningful commits
- Feature branches for team collaboration
- Pull requests for code review

## Project Structure

```
Pantry-Pal/
├── src/                           # Main source code
│   ├── app.js                     # Express app setup
│   ├── index.js                   # Server entry point
│   ├── config/db.js               # Database connection
│   ├── services/                  # Business logic layer
│   │   ├── user.service.js
│   │   ├── pantry.service.js
│   │   └── recipe.service.js
│   └── routes/                    # API endpoints
│       ├── user.routes.js
│       ├── pantry.routes.js
│       └── recipe.routes.js
├── database/
│   ├── schema.sql                 # Database schema
│   ├── logic.sql                  # SQL functions
│   └── db_setup.py
├── API_DOCUMENTATION.md           # Complete API reference
├── SETUP_GUIDE.md                 # Installation guide
├── workflow.txt                   # Workflow details
└── package.json

```

## API Endpoints (Workflow 1)

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/verify` - Verify email
- `POST /api/users/login` - Login
- `GET /api/users/:id` - Get profile
- `PUT /api/users/:id` - Update profile
- `GET /api/users/preferences/dietary` - Get dietary options
- `GET /api/users/preferences/cuisines` - Get cuisines

### Pantry Management
- `POST /api/pantry` - Add ingredient
- `GET /api/pantry/:user_id` - Get user's pantry
- `PUT /api/pantry/:user_id/:ingredient_id` - Update ingredient
- `DELETE /api/pantry/:user_id/:ingredient_id` - Remove ingredient
- `GET /api/pantry/ingredients/all` - Get all ingredients
- `GET /api/pantry/ingredients/search?q=term` - Search ingredients

### Recipes
- `GET /api/recipes/search-by-pantry/:user_id` - Search by pantry items
- `GET /api/recipes/browse` - Browse with filters
- `GET /api/recipes/:recipe_id` - Get recipe details
- `GET /api/recipes/options/cuisines` - Get cuisines
- `GET /api/recipes/options/dietary-preferences` - Get dietary preferences

**For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

## Setup Instructions

For complete setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### Quick Requirements
- Node.js v16+
- PostgreSQL v12+
- npm/yarn

### Database Setup

1. Create PostgreSQL database
2. Run schema: `psql -U postgres -d pantrypal_db -f database/schema.sql`
3. Run functions: `psql -U postgres -d pantrypal_db -f database/logic.sql`

### Environment Variables

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/pantrypal_db
CORS_ORIGIN=*
```

## Development Guidelines

### Code Organization
- **Services**: Business logic and database operations
- **Routes**: HTTP request handling and validation
- **Config**: Database and application setup

### Response Format
All endpoints return consistent JSON:

```json
{
  "success": true/false,
  "message": "Human-readable message",
  "data": {}
}
```

### Error Handling
- Input validation at route level
- Descriptive error messages
- Appropriate HTTP status codes

### Git Workflow
```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: your feature description"
git push origin feature/your-feature
# Create pull request
```

## Testing

Use cURL or Postman to test endpoints:

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

## Milestone 3 Requirements

✅ **Version Control**
- Remote GitHub repository
- Meaningful commit messages
- Feature branches and pull requests

✅ **Flow Implementation**
- Complete CRUD operations for core entities
- Login/Register flows (support, not counted)
- Workflow 1 functionality

✅ **Backend Services**
- Modular service layer
- Well-defined REST routes
- Proper HTTP methods and responses
- API documentation

✅ **Database**
- PostgreSQL with schema
- SQL functions for complex queries
- Data consistency with triggers

## Next Steps

1. ✅ Setup backend server
2. ✅ Test all endpoints
3. 🔄 Review code with team
4. 📝 Create frontend integration
5. 🚀 Deploy to staging environment

## Support & Questions

- **GitHub Issues**: https://github.com/sameem701/Pantry-Pal/issues
- **Team Collaboration**: Check GitHub discussions
- **TAs**: adeenaoop, Muh-Aqib-Shah (added as collaborators)

## Repository

**Repository**: https://github.com/sameem701/Pantry-Pal

- **Main Branch**: Production-ready code
- **Workflow1 Branch**: Workflow 1 development (current)
- **Workflow2 Branch**: Workflow 2 development
- **Workflow3 Branch**: Workflow 3 development

---

**Last Updated**: January 2024  
**Version**: 1.0.0 - Milestone 3 Release
