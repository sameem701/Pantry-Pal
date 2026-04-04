const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');

// Middleware to validate required fields
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ============================================================
// USER AUTHENTICATION ROUTES
// ============================================================

/**
 * POST /api/users/register
 * Step 1: Register user (creates temp record)
 * Body: { email, password, password_confirm }
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, password_confirm } = req.body;

        if (!email || !password || !password_confirm) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        if (password !== password_confirm) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // In production, hash the password using bcrypt
        const passwordHash = password; // TODO: implement bcrypt hashing
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await userService.registerUserTemp(email, passwordHash, verificationCode);

        // TODO: Send verification code via email
        res.status(201).json({
            success: result.success,
            message: result.message,
            data: {
                email: email,
                note: 'Verification code sent to email (check console for testing: ' + verificationCode + ')'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * POST /api/users/verify
 * Step 2: Verify email and create user
 * Body: { email, code }
 */
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        const result = await userService.verifyAndCreateUser(email, code);

        res.json(result);
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * POST /api/users/login
 * Login user
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // TODO: Use bcrypt to compare hashed passwords
        const passwordHash = password; // Placeholder

        const result = await userService.loginUser(email, passwordHash);

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================================
// USER PROFILE ROUTES
// ============================================================

/**
 * GET /api/users/:id
 * Get user profile
 * Params: id (user_id)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }

        const result = await userService.getUserProfile(parseInt(id));

        res.json(result);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * PUT /api/users/:id
 * Update user profile
 * Params: id (user_id)
 * Body: { skill_level, dietary_preferences, cuisine_preferences }
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { skill_level, dietary_preferences, cuisine_preferences } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }

        if (skill_level && !['Beginner', 'Intermediate', 'Advanced'].includes(skill_level)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid skill level. Must be: Beginner, Intermediate, or Advanced'
            });
        }

        const result = await userService.updateUserProfile(
            parseInt(id),
            skill_level,
            dietary_preferences,
            cuisine_preferences
        );

        res.json(result);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================================
// USER PREFERENCES ROUTES
// ============================================================

/**
 * GET /api/users/preferences/dietary
 * Get all available dietary preferences
 */
router.get('/preferences/dietary', async (req, res) => {
    try {
        const result = await userService.getDietaryPreferences();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get dietary preferences error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * GET /api/users/preferences/cuisines
 * Get all available cuisines
 */
router.get('/preferences/cuisines', async (req, res) => {
    try {
        const result = await userService.getAllCuisines();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get cuisines error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================================
// PASSWORD RESET ROUTES
// ============================================================

/**
 * POST /api/users/forgot-password
 * Request password reset
 * Body: { email }
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const result = await userService.requestPasswordReset(email, resetCode);

        // TODO: Send reset code via email
        res.json({
            ...result,
            note: 'Reset code sent to email (check console for testing: ' + resetCode + ')'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

/**
 * POST /api/users/reset-password
 * Reset password
 * Body: { email, code, new_password, new_password_confirm }
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, new_password, new_password_confirm } = req.body;

        if (!email || !code || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Email, code, and new password are required'
            });
        }

        if (new_password !== new_password_confirm) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // TODO: Use bcrypt to hash password
        const newPasswordHash = new_password; // Placeholder

        const result = await userService.resetPassword(email, code, newPasswordHash);

        res.json(result);
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
