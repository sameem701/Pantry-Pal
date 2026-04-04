#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}  PantryPal Backend Testing Script   ${NC}"
echo -e "${YELLOW}======================================${NC}\n"

# Check Node.js
echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

# Check npm
echo -e "\n${YELLOW}[2/5] Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check dependencies
echo -e "\n${YELLOW}[3/5] Checking dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules directory found${NC}"
else
    echo -e "${RED}✗ node_modules not found, running npm install...${NC}"
    npm install
fi

# Check .env
echo -e "\n${YELLOW}[4/5] Checking .env configuration...${NC}"
if [ -f ".env" ]; then
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✓ .env file found with DATABASE_URL${NC}"
    else
        echo -e "${RED}✗ DATABASE_URL not set in .env${NC}"
        echo -e "${YELLOW}  Please configure DATABASE_URL in .env file${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found, creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}  Please update DATABASE_URL in .env file${NC}"
fi

# Check required files
echo -e "\n${YELLOW}[5/5] Checking project structure...${NC}"
REQUIRED_FILES=(
    "src/app.js"
    "src/index.js"
    "src/config/db.js"
    "src/services/user.service.js"
    "src/services/pantry.service.js"
    "src/services/recipe.service.js"
    "src/routes/user.routes.js"
    "src/routes/pantry.routes.js"
    "src/routes/recipe.routes.js"
)

ALL_FOUND=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file not found${NC}"
        ALL_FOUND=false
    fi
done

if [ "$ALL_FOUND" = true ]; then
    echo -e "\n${GREEN}======================================${NC}"
    echo -e "${GREEN}  ✓ All checks passed!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "  1. Ensure PostgreSQL is running"
    echo -e "  2. Update DATABASE_URL in .env file"
    echo -e "  3. Run: npm run dev"
    echo -e "  4. Visit: http://localhost:5000/api/health\n"
else
    echo -e "\n${RED}======================================${NC}"
    echo -e "${RED}  ✗ Some files are missing${NC}"
    echo -e "${RED}======================================${NC}"
    exit 1
fi
