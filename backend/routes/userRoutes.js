const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ============================================================
// USER AUTHENTICATION ROUTES
// ============================================================

/**
 * POST /api/users/register
 * Step 1: Register user (creates temp record)
 * Body: { email, password, password_confirm }
 */
router.post('/register', userController.register);

/**
 * POST /api/users/verify
 * Step 2: Verify email and create user
 * Body: { email, code }
 */
router.post('/verify', userController.verify);

/**
 * POST /api/users/login
 * Login user
 * Body: { email, password }
 */
router.post('/login', userController.login);

// ============================================================
// USER PROFILE ROUTES
// ============================================================

/**
 * GET /api/users/:id
 * Get user profile
 * Params: id (user_id)
 */
router.get('/preferences/dietary', userController.getDietaryPreferenceOptions);

/**
 * GET /api/users/preferences/cuisines
 * Get all available cuisines
 */
router.get('/preferences/cuisines', userController.getCuisineOptions);

/**
 * GET /api/users/:id
 * Get user profile
 * Params: id (user_id)
 */
router.get('/:id', userController.getProfile);

/**
 * PUT /api/users/:id
 * Update user profile
 * Params: id (user_id)
 * Body: { skill_level, dietary_preferences, cuisine_preferences }
 */
router.put('/:id', userController.updateProfile);

// ============================================================
// PASSWORD RESET ROUTES
// ============================================================

/**
 * POST /api/users/forgot-password
 * Request password reset
 * Body: { email }
 */
router.post('/forgot-password', userController.forgotPassword);

/**
 * POST /api/users/reset-password
 * Reset password
 * Body: { email, code, new_password, new_password_confirm }
 */
router.post('/reset-password', userController.resetPasswordHandler);

module.exports = router;
