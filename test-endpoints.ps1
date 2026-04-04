# PantryPal Backend - Comprehensive Endpoint Tests (PowerShell)

$BASE_URL = "http://localhost:5000/api"
$TESTS_PASSED = 0
$TESTS_FAILED = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data,
        [int]$ExpectedCode,
        [string]$Description
    )

    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "→ $Method $BASE_URL$Endpoint" -ForegroundColor Cyan

    try {
        $params = @{
            Uri = "$BASE_URL$Endpoint"
            Method = $Method
            Headers = @{"Content-Type" = "application/json"}
            UseBasicParsing = $true
        }

        if ($Data) {
            $params.Body = $Data
        }

        $response = Invoke-WebRequest @params -ErrorAction SilentlyContinue
        $httpCode = $response.StatusCode
        $body = $response.Content

        if ($httpCode -eq $ExpectedCode) {
            Write-Host "✓ PASS (HTTP $httpCode)" -ForegroundColor Green
            $script:TESTS_PASSED++
        } else {
            Write-Host "✗ FAIL (Expected HTTP $ExpectedCode, Got $httpCode)" -ForegroundColor Red
            $script:TESTS_FAILED++
        }

        $bodyPreview = $body.Substring(0, [Math]::Min(100, $body.Length))
        Write-Host "  Response: $bodyPreview..." 
        Write-Host ""
    }
    catch {
        Write-Host "✗ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:TESTS_FAILED++
        Write-Host ""
    }
}

# ============================================================
# Header
# ============================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PantryPal Backend - Comprehensive Endpoint Tests       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. HEALTH CHECK
# ============================================================
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1. HEALTH CHECK" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Method "GET" -Endpoint "/health" -ExpectedCode 200 -Description "Health check endpoint"

# ============================================================
# 2. API DOCUMENTATION
# ============================================================
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "2. API DOCUMENTATION" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Method "GET" -Endpoint "/docs" -ExpectedCode 200 -Description "API documentation endpoint"

# ============================================================
# 3. USER ENDPOINTS
# ============================================================
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "3. USER ENDPOINTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$registerData = '{"email":"test@example.com","password":"password123","password_confirm":"password123"}'
Test-Endpoint -Method "POST" -Endpoint "/users/register" -Data $registerData -ExpectedCode 201 -Description "Register user"

$verifyData = '{"email":"test@example.com","code":"000000"}'
Test-Endpoint -Method "POST" -Endpoint "/users/verify" -Data $verifyData -ExpectedCode 200 -Description "Verify email"

$loginData = '{"email":"test@example.com","password":"password123"}'
Test-Endpoint -Method "POST" -Endpoint "/users/login" -Data $loginData -ExpectedCode 200 -Description "Login user"

Test-Endpoint -Method "GET" -Endpoint "/users/1" -ExpectedCode 200 -Description "Get user profile (ID: 1)"

$updateData = '{"skill_level":"Intermediate"}'
Test-Endpoint -Method "PUT" -Endpoint "/users/1" -Data $updateData -ExpectedCode 200 -Description "Update user profile"

Test-Endpoint -Method "GET" -Endpoint "/users/preferences/dietary" -ExpectedCode 200 -Description "Get dietary preferences"

Test-Endpoint -Method "GET" -Endpoint "/users/preferences/cuisines" -ExpectedCode 200 -Description "Get available cuisines"

$forgotData = '{"email":"test@example.com"}'
Test-Endpoint -Method "POST" -Endpoint "/users/forgot-password" -Data $forgotData -ExpectedCode 200 -Description "Request password reset"

$resetData = '{"email":"test@example.com","code":"000000","new_password":"newpass123","new_password_confirm":"newpass123"}'
Test-Endpoint -Method "POST" -Endpoint "/users/reset-password" -Data $resetData -ExpectedCode 200 -Description "Reset password"

# ============================================================
# 4. PANTRY ENDPOINTS
# ============================================================
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "4. PANTRY ENDPOINTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Method "GET" -Endpoint "/pantry/ingredients/all" -ExpectedCode 200 -Description "Get all ingredients"

Test-Endpoint -Method "GET" -Endpoint "/pantry/ingredients/search?q=tomato" -ExpectedCode 200 -Description "Search ingredients"

$addPantryData = '{"user_id":1,"ingredient_id":1,"quantity":2.5,"unit":"cups","storage_location":"Pantry"}'
Test-Endpoint -Method "POST" -Endpoint "/pantry" -Data $addPantryData -ExpectedCode 201 -Description "Add ingredient to pantry"

Test-Endpoint -Method "GET" -Endpoint "/pantry/1" -ExpectedCode 200 -Description "Get user pantry (user_id: 1)"

$updatePantryData = '{"quantity":3.5,"unit":"cups","storage_location":"Fridge"}'
Test-Endpoint -Method "PUT" -Endpoint "/pantry/1/1" -Data $updatePantryData -ExpectedCode 200 -Description "Update pantry item"

Test-Endpoint -Method "DELETE" -Endpoint "/pantry/1/1" -ExpectedCode 200 -Description "Remove ingredient from pantry"

# ============================================================
# 5. RECIPE ENDPOINTS
# ============================================================
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "5. RECIPE ENDPOINTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Method "GET" -Endpoint "/recipes/options/cuisines" -ExpectedCode 200 -Description "Get cuisines for filtering"

Test-Endpoint -Method "GET" -Endpoint "/recipes/options/dietary-preferences" -ExpectedCode 200 -Description "Get dietary preferences for filtering"

Test-Endpoint -Method "GET" -Endpoint "/recipes/search-by-pantry/1?page=1&limit=10" -ExpectedCode 200 -Description "Search recipes by pantry"

Test-Endpoint -Method "GET" -Endpoint "/recipes/browse?user_id=1&difficulty=Easy&page=1&limit=10" -ExpectedCode 200 -Description "Browse recipes with filters"

Test-Endpoint -Method "GET" -Endpoint "/recipes/1?user_id=1" -ExpectedCode 200 -Description "Get recipe details"

# ============================================================
# SUMMARY
# ============================================================
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$TOTAL_TESTS = $TESTS_PASSED + $TESTS_FAILED

if ($TESTS_FAILED -eq 0) {
    Write-Host "✓ All $TOTAL_TESTS tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ $TESTS_FAILED out of $TOTAL_TESTS tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Passed: " -NoNewline
Write-Host $TESTS_PASSED -ForegroundColor Green
Write-Host "Failed: " -NoNewline
Write-Host $TESTS_FAILED -ForegroundColor Red
Write-Host ""
