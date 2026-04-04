#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PantryPal Backend - Comprehensive Endpoint Tests       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

BASE_URL="http://localhost:5000/api"
TESTS_PASSED=0
TESTS_FAILED=0

# TEST COUNTER
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=$4
    local description=$5

    echo -e "${YELLOW}Testing:${NC} $description"
    echo -e "${BLUE}→${NC} $method $BASE_URL$endpoint"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "$expected_code" ]]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_code, Got $http_code)"
        ((TESTS_FAILED++))
    fi

    echo -e "  Response: $(echo $body | head -c 100)..."
    echo -e ""
}

# ============================================================
# 1. HEALTH CHECK
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1. HEALTH CHECK${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

test_endpoint "GET" "/health" "" "200" "Health check endpoint"

# ============================================================
# 2. API DOCUMENTATION
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2. API DOCUMENTATION${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

test_endpoint "GET" "/docs" "" "200" "API documentation endpoint"

# ============================================================
# 3. USER ENDPOINTS
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3. USER ENDPOINTS${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

test_register_data='{"email":"test@example.com","password":"password123","password_confirm":"password123"}'
test_endpoint "POST" "/users/register" "$test_register_data" "201" "Register user"

test_verify_data='{"email":"test@example.com","code":"000000"}'
test_endpoint "POST" "/users/verify" "$test_verify_data" "200" "Verify email"

test_login_data='{"email":"test@example.com","password":"password123"}'
test_endpoint "POST" "/users/login" "$test_login_data" "200" "Login user"

test_endpoint "GET" "/users/1" "" "200" "Get user profile (ID: 1)"

test_update_profile='{"skill_level":"Intermediate"}'
test_endpoint "PUT" "/users/1" "$test_update_profile" "200" "Update user profile"

test_endpoint "GET" "/users/preferences/dietary" "" "200" "Get dietary preferences"

test_endpoint "GET" "/users/preferences/cuisines" "" "200" "Get available cuisines"

test_forgot_password='{"email":"test@example.com"}'
test_endpoint "POST" "/users/forgot-password" "$test_forgot_password" "200" "Request password reset"

test_reset_password='{"email":"test@example.com","code":"000000","new_password":"newpass123","new_password_confirm":"newpass123"}'
test_endpoint "POST" "/users/reset-password" "$test_reset_password" "200" "Reset password"

# ============================================================
# 4. PANTRY ENDPOINTS
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4. PANTRY ENDPOINTS${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

test_endpoint "GET" "/pantry/ingredients/all" "" "200" "Get all ingredients"

test_endpoint "GET" "/pantry/ingredients/search?q=tomato" "" "200" "Search ingredients"

test_add_pantry='{"user_id":1,"ingredient_id":1,"quantity":2.5,"unit":"cups","storage_location":"Pantry"}'
test_endpoint "POST" "/pantry" "$test_add_pantry" "201" "Add ingredient to pantry"

test_endpoint "GET" "/pantry/1" "" "200" "Get user pantry (user_id: 1)"

test_update_pantry='{"quantity":3.5,"unit":"cups","storage_location":"Fridge"}'
test_endpoint "PUT" "/pantry/1/1" "$test_update_pantry" "200" "Update pantry item"

test_endpoint "DELETE" "/pantry/1/1" "" "200" "Remove ingredient from pantry"

# ============================================================
# 5. RECIPE ENDPOINTS
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5. RECIPE ENDPOINTS${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

test_endpoint "GET" "/recipes/options/cuisines" "" "200" "Get cuisines for filtering"

test_endpoint "GET" "/recipes/options/dietary-preferences" "" "200" "Get dietary preferences for filtering"

test_endpoint "GET" "/recipes/search-by-pantry/1?page=1&limit=10" "" "200" "Search recipes by pantry"

test_endpoint "GET" "/recipes/browse?user_id=1&difficulty=Easy&page=1&limit=10" "" "200" "Browse recipes with filters"

test_endpoint "GET" "/recipes/1?user_id=1" "" "200" "Get recipe details"

# ============================================================
# SUMMARY
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All $TOTAL_TESTS tests passed!${NC}\n"
else
    echo -e "${RED}✗ $TESTS_FAILED out of $TOTAL_TESTS tests failed${NC}\n"
fi

echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo -e ""
