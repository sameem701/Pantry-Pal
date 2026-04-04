# 🚀 Workflow 1 - Startup & Testing Guide

## ✅ WHAT'S BEEN COMPLETED

### Routes & Services
- **22 API Endpoints** across 3 major modules (Users, Pantry, Recipes)
- **Complete CRUD operations** for all core entities
- **3 Service Layers** with database logic separation

### Documentation
- [ROUTES_CHECKLIST.md](ROUTES_CHECKLIST.md) - Complete endpoint verification
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Full API reference with examples
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Installation instructions
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guidelines

### Testing Tools
- `test-endpoints.ps1` - PowerShell test script (Windows)
- `test-endpoints.sh` - Bash test script (Linux/Mac)
- `ENDPOINT_TESTING.md` - Manual testing guide with curl examples

---

## 🔧 QUICK START

### Step 1: Verify .env Configuration

Your `.env` file has been created with defaults:

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/pantrypal_db
CORS_ORIGIN=*
```

**⚠️ IMPORTANT**: Update `DATABASE_URL` with your actual PostgreSQL credentials:

```
DATABASE_URL=postgresql://[username]:[password]@[host]:[port]/[database]
```

Example:
```
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/pantrypal_db
```

### Step 2: Verify PostgreSQL is Running

**Windows (Check if PostgreSQL service is running)**:
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Or connect to test:
psql -U postgres -d postgres -c "SELECT 1"
```

**Create database if not exists**:
```bash
createdb pantrypal_db
```

**Initialize schema**:
```bash
psql -U postgres -d pantrypal_db -f database/schema.sql
psql -U postgres -d pantrypal_db -f database/logic.sql
```

### Step 3: Start the Server

In PowerShell/Command Prompt:

```powershell
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

### Step 4: Test the Endpoints

**Option A: PowerShell Test Script** (Recommended for Windows)

Open new PowerShell window and run:

```powershell
cd C:\Users\khan\Documents\Pantry-Pal
.\test-endpoints.ps1
```

This will run 22 comprehensive tests and show results.

**Option B: Manual Testing with cURL**

In another PowerShell terminal:

```powershell
# Test health check
curl http://localhost:5000/api/health

# Test API docs
curl http://localhost:5000/api/docs

# Test register endpoint
curl -X POST http://localhost:5000/api/users/register `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"test@example.com","password":"pass123","password_confirm":"pass123"}'
```

**Option C: Postman**

1. Import endpoints from [ENDPOINT_TESTING.md](ENDPOINT_TESTING.md)
2. Or manually create requests for each endpoint

---

## 📋 ENDPOINT VERIFICATION CHECKLIST

### Before Testing
- [ ] PostgreSQL is running
- [ ] Database `pantrypal_db` exists
- [ ] Schema and logic scripts executed
- [ ] `.env` file configured with correct DATABASE_URL
- [ ] `npm install` completed
- [ ] Server started with `npm run dev`

### Quick Manual Tests

```powershell
# 1. Health Check
curl http://localhost:5000/api/health

# 2. Get API Docs
curl http://localhost:5000/api/docs

# 3. Get Dietary Preferences (no auth needed)
curl http://localhost:5000/api/users/preferences/dietary

# 4. Get Cuisines (no auth needed)
curl http://localhost:5000/api/users/preferences/cuisines

# 5. Get Ingredients (no auth needed)
curl http://localhost:5000/api/pantry/ingredients/all
```

All of these should return HTTP 200 with JSON responses.

---

## 🧪 COMPREHENSIVE TEST EXECUTION

Run full test suite:

```powershell
# PowerShell (Windows)
.\test-endpoints.ps1

# Or Bash (Linux/Mac)
bash test-endpoints.sh
```

**Expected Results**: All 22 tests should pass or show meaningful error messages

---

## 📊 ROUTES STATUS

```
USER ROUTES:          9 endpoints ✓
PANTRY ROUTES:        6 endpoints ✓
RECIPE ROUTES:        5 endpoints ✓
─────────────────────────────────────
TOTAL:               20 endpoints ✓
HEALTH/DOCS:          2 endpoints ✓
─────────────────────────────────────
TOTAL API:           22 endpoints ✓
```

**All endpoints have:**
- ✓ Input validation
- ✓ Error handling
- ✓ Consistent JSON responses
- ✓ HTTP status codes
- ✓ Documentation in code

---

## 🔍 IF TESTS FAIL

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -U postgres -l`

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution**:
```powershell
rm -r node_modules package-lock.json
npm install
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Kill existing process on port 5000
- Or change PORT in .env to 3000

### SQL Function Not Found
```
Error: function "register_user_temp" does not exist
```
**Solution**:
```bash
psql -U postgres -d pantrypal_db -f database/logic.sql
```

---

## 📝 NEXT STEPS

### After Successful Testing:

1. **Code Review**
   - Review route implementation with team
   - Check service layer logic
   - Verify error handling

2. **Git Commits**
   ```powershell
   git status
   git add .
   git commit -m "feat: implement workflow 1 endpoints and services"
   git push origin workflow1
   ```

3. **Merge to Main**
   ```powershell
   git checkout main
   git merge workflow1
   git push origin main
   ```

4. **Production Considerations**
   - [ ] Implement password hashing (bcrypt)
   - [ ] Add email verification service
   - [ ] Setup JWT authentication
   - [ ] Add rate limiting
   - [ ] Setup logging/monitoring

---

## 🎯 SUCCESS CRITERIA

✅ All endpoints respond correctly
✅ Database operations work as expected
✅ Error messages are helpful
✅ HTTP status codes are appropriate
✅ Response formats are consistent
✅ Code is well-documented
✅ Routes follow REST conventions
✅ Services separate business logic
✅ Team can test and review

---

## 📞 SUPPORT

If you encounter issues:

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for installation help
2. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint details
3. See [ENDPOINT_TESTING.md](ENDPOINT_TESTING.md) for manual testing
4. Check [DEVELOPMENT.md](DEVELOPMENT.md) for best practices

---

**Ready to test? Start with Step 1 above!** 🚀
