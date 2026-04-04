# PantryPal Development Guidelines

## Team Collaboration

**Team Members:**
- Muhammad Ahzam
- Sohaib Sohail
- Muhammad Sameem

**TAs (Collaborators):**
- adeenaoop
- Muh-Aqib-Shah

---

## Git Workflow

### Branch Strategy

```
main (production)
  ├── workflow1 (current development)
  ├── workflow2 (future)
  ├── workflow3 (future)
  └── feature branches
       ├── feature/user-auth
       ├── feature/pantry-management
       ├── feature/recipe-search
       └── bugfix/...
```

### Creating Feature Branches

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### Commit Message Convention

Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation update
- `test`: Test files
- `chore`: Build, dependencies, etc.

**Scope:** Component affected (users, pantry, recipes, etc.)

**Examples:**
```bash
git commit -m "feat(users): implement user registration endpoint"
git commit -m "fix(pantry): correct storage location validation"
git commit -m "docs(api): update endpoint documentation"
git commit -m "refactor(recipes): optimize search query"
```

### Push and Pull Request

```bash
# Make commits on feature branch
git add .
git commit -m "feat(feature): description"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# - Go to GitHub repository
# - Click "New Pull Request"
# - Select base: workflow1, compare: feature/your-feature-name
# - Add description and request review from teammates
# - Address feedback and push updates
# - Merge once approved
```

### Merging to Main

```bash
# After feature is complete and tested
git checkout main
git pull origin main
git merge feature/your-feature-name
git push origin main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## Code Style Guidelines

### JavaScript/Node.js

**Naming Conventions:**
```javascript
// Variables and functions: camelCase
const userId = 1;
function getUserProfile() {}

// Classes: PascalCase
class UserService {}

// Constants: UPPER_SNAKE_CASE
const MAX_PANTRY_ITEMS = 1000;
```

**Function Organization:**
```javascript
// 1. Imports
const pool = require('../config/db');

// 2. Constants
const VALID_STORAGE_LOCATIONS = ['Fridge', 'Pantry', 'Freezer'];

// 3. Function definitions
const addPantryItem = async (userId, ingredientId, quantity) => {
    // Implementation
};

// 4. Exports
module.exports = { addPantryItem };
```

### Comments

```javascript
// Use comments for why, not what
// ✓ Good: Convert quantity to grams for consistency
const quantityInGrams = quantity * GRAMS_PER_UNIT;

// ✗ Avoid: Multiply quantity by GRAMS_PER_UNIT
const quantityInGrams = quantity * GRAMS_PER_UNIT;

// Use section comments
// ============================================================
// USER AUTHENTICATION ROUTES
// ============================================================
```

### Error Handling

```javascript
// Always handle errors in async/await
try {
    const result = await userService.loginUser(email, password);
    res.json(result);
} catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}

// Validate inputs before processing
if (!userId || isNaN(userId)) {
    return res.status(400).json({
        success: false,
        message: 'Valid user_id is required'
    });
}
```

---

## Project Structure

### Services Layer

```javascript
// src/services/user.service.js
const pool = require('../config/db');

// Each function handles one database operation
const loginUser = async (email, passwordHash) => {
    const query = 'SELECT login_user($1, $2) AS result';
    const { rows } = await pool.query(query, [email, passwordHash]);
    return rows[0].result;
};

module.exports = { loginUser };
```

### Routes Layer

```javascript
// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');

// Each route:
// 1. Validates input
// 2. Calls service
// 3. Returns consistent response
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        // Call service
        const result = await userService.loginUser(email, password);

        // Return response
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
```

### Response Format

Always return JSON with consistent structure:

```javascript
// Success (GET)
{
  "success": true,
  "data": { /* ... */ }
}

// Success (POST/PUT)
{
  "success": true,
  "message": "Action completed",
  "data": { /* ... */ }
}

// Error
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical details (dev only)"
}
```

---

## Testing

### Before Committing

1. **Syntax Check**
   ```bash
   # Use a linter (optional setup)
   npm install --save-dev eslint
   npx eslint src/
   ```

2. **Test Endpoints**
   ```bash
   # Test your changes work
   npm run dev
   # In another terminal, test endpoints with cURL or Postman
   ```

3. **Manual Testing Checklist**
   - [ ] All CRUD operations work
   - [ ] Error messages are helpful
   - [ ] Status codes are correct
   - [ ] Database changes persist
   - [ ] No console errors

### Test Each Endpoint

See [ENDPOINT_TESTING.md](./ENDPOINT_TESTING.md) for detailed testing commands.

---

## Workflow 1 Milestones

### ✅ Completed

- [x] Database schema design
- [x] Service layer architecture
- [x] API routes with CRUD operations
- [x] User authentication endpoints
- [x] Pantry management endpoints
- [x] Recipe discovery endpoints
- [x] API documentation
- [x] Setup guides

### 📋 In Progress

- [ ] Thorough endpoint testing
- [ ] Code review with team
- [ ] Performance optimization

### 🔄 Ready for Workflow 2

- [ ] Interactive cooking routes
- [ ] User-created recipes
- [ ] Reviews and ratings

---

## Common Issues & Solutions

### Issue: "Database connection failed"
```javascript
// Check .env DATABASE_URL format
// Format: postgresql://user:password@host:port/dbname
// Example: postgresql://postgres:password@localhost:5432/pantrypal_db
```

### Issue: "Module not found"
```bash
# Install missing dependency
npm install package-name

# Or reinstall all
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port already in use"
```bash
# Change PORT in .env file
PORT=3000

# Or kill process on port
sudo lsof -i :5000
kill -9 <PID>
```

### Issue: Routes not working
```javascript
// Check routes are registered in app.js
app.use('/api/users', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipeRoutes);
```

---

## Performance Tips

1. **Database Queries**
   - Use PostgreSQL functions when possible (they're optimized)
   - Avoid N+1 queries
   - Use pagination for large result sets

2. **API Responses**
   - Don't send unnecessary data
   - Use `fields` parameter for client to specify fields
   - Compress responses in production

3. **Error Handling**
   - Log errors for debugging
   - Don't expose sensitive details in error messages
   - Use appropriate HTTP status codes

---

## Security Considerations

⚠️ **TODO for Production**

1. **Authentication**
   - [ ] Implement JWT tokens
   - [ ] Add refresh tokens
   - [ ] Implement rate limiting

2. **Password Security**
   - [ ] Hash passwords with bcrypt
   - [ ] Add password strength validation
   - [ ] Implement account lockout after failed attempts

3. **Input Validation**
   - [ ] Sanitize all user inputs
   - [ ] Validate email formats
   - [ ] Prevent SQL injection (use prepared statements)

4. **CORS & HTTPS**
   - [ ] Configure CORS properly
   - [ ] Use HTTPS in production
   - [ ] Add security headers

5. **Database**
   - [ ] Use environment variables for credentials
   - [ ] Regular backups
   - [ ] Principle of least privilege for DB user

---

## Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Git Workflow Guide](https://www.atlassian.com/git/tutorials)

---

## Questions & Support

1. Check existing documentation
2. Ask in GitHub issues
3. Contact team members
4. Reach out to TAs: adeenaoop, Muh-Aqib-Shah

---

Last Updated: January 2024  
Maintained by: PantryPal Development Team
