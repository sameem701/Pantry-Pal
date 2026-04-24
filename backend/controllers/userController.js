const pool = require('../config/db');

const toIntegerArray = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => Number(entry)).filter(Number.isFinite);
    }

    if (typeof value === 'string') {
        if (!value.trim()) {
            return [];
        }

        return value
            .split(',')
            .map((entry) => Number(entry.trim()))
            .filter(Number.isFinite);
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? [numericValue] : [];
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const registerUserTemp = async (email, passwordHash, verificationCode) => {
    const query = `
        SELECT register_user_temp($1, $2, $3) AS result
    `;
    const { rows } = await pool.query(query, [email, passwordHash, verificationCode]);
    return rows[0].result;
};

const verifyAndCreateUser = async (email, code) => {
    const query = `
        SELECT verify_and_create_user($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [email, code]);
    return rows[0].result;
};

const loginUser = async (email, passwordHash) => {
    const query = 'SELECT login_user($1, $2) AS result';
    const { rows } = await pool.query(query, [email, passwordHash]);
    return rows[0].result;
};

const getUserProfile = async (userId) => {
    const query = 'SELECT get_user_profile($1) AS result';
    const { rows } = await pool.query(query, [userId]);
    return rows[0].result;
};

const updateUserProfile = async (userId, skillLevel, dietaryPreferences, cuisinePreferences) => {
    const updates = [];

    if (skillLevel) {
        const skillQuery = 'SELECT update_user_profile($1, $2) AS result';
        const { rows } = await pool.query(skillQuery, [userId, skillLevel]);
        const response = rows[0].result;

        if (!response?.success) {
            return response;
        }

        updates.push(response.message);
    }

    if (dietaryPreferences !== undefined && dietaryPreferences !== null) {
        const preferenceIds = toIntegerArray(dietaryPreferences);
        const preferenceQuery = 'SELECT set_dietary_preferences($1, $2) AS result';
        const { rows } = await pool.query(preferenceQuery, [userId, preferenceIds]);
        const response = rows[0].result;

        if (!response?.success) {
            return response;
        }

        updates.push(response.message);
    }

    if (cuisinePreferences !== undefined && cuisinePreferences !== null) {
        const cuisineIds = toIntegerArray(cuisinePreferences);
        const cuisineQuery = 'SELECT set_cuisine_preferences($1, $2) AS result';
        const { rows } = await pool.query(cuisineQuery, [userId, cuisineIds]);
        const response = rows[0].result;

        if (!response?.success) {
            return response;
        }

        updates.push(response.message);
    }

    if (!updates.length) {
        return {
            success: false,
            message: 'No profile fields provided'
        };
    }

    return {
        success: true,
        message: 'Profile updated',
        updates
    };
};

const getDietaryPreferences = async () => {
    const query = 'SELECT get_all_dietary_preferences() AS result';
    const { rows } = await pool.query(query);
    return rows[0].result;
};

const getAllCuisines = async () => {
    const query = 'SELECT get_all_cuisines() AS result';
    const { rows } = await pool.query(query);
    return rows[0].result;
};

const requestPasswordReset = async (email, resetCode) => {
    const query = `
        SELECT request_password_reset($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [email, resetCode]);
    return rows[0].result;
};

const resetPassword = async (email, resetCode, newPasswordHash) => {
    const query = `
        SELECT reset_password($1, $2, $3) AS result
    `;
    const { rows } = await pool.query(query, [email, resetCode, newPasswordHash]);
    return rows[0].result;
};

const register = async (req, res) => {
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

        const passwordHash = password;
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[REGISTER] Verification code for ${email}: ${verificationCode}`);
        const result = await registerUserTemp(email, passwordHash, verificationCode);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            ...result,
            data: {
                email,
                note: 'Verification code sent to email (check console for testing: ' + verificationCode + ')'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const verify = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        const result = await verifyAndCreateUser(email, code);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Verify error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await loginUser(email, password);
        return res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || Number.isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: 'Valid user ID is required' });
        }

        const result = await getUserProfile(Number(id));
        return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { skill_level, dietary_preferences, cuisine_preferences } = req.body;

        if (!id || Number.isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: 'Valid user ID is required' });
        }

        if (skill_level && !['Beginner', 'Intermediate', 'Advanced'].includes(skill_level)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid skill level. Must be: Beginner, Intermediate, or Advanced'
            });
        }

        if (skill_level === undefined && dietary_preferences === undefined && cuisine_preferences === undefined) {
            return res.status(400).json({
                success: false,
                message: 'At least one profile field must be provided'
            });
        }

        const result = await updateUserProfile(Number(id), skill_level, dietary_preferences, cuisine_preferences);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getDietaryPreferenceOptions = async (req, res) => {
    try {
        const result = await getDietaryPreferences();
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Get dietary preferences error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getCuisineOptions = async (req, res) => {
    try {
        const result = await getAllCuisines();
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Get cuisines error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[FORGOT PASSWORD] Reset code for ${email}: ${resetCode}`);
        const result = await requestPasswordReset(email, resetCode);

        return res.status(result.success ? 200 : 400).json({
            ...result,
            note: 'Reset code sent to email (check console for testing: ' + resetCode + ')'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const resetPasswordHandler = async (req, res) => {
    try {
        const { email, code, new_password, new_password_confirm } = req.body;

        if (!email || !code || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Email, code, and new password are required'
            });
        }

        if (new_password !== new_password_confirm) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const result = await resetPassword(email, code, new_password);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerUserTemp,
    verifyAndCreateUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getDietaryPreferences,
    getAllCuisines,
    requestPasswordReset,
    resetPassword,
    register,
    verify,
    login,
    getProfile,
    updateProfile,
    getDietaryPreferenceOptions,
    getCuisineOptions,
    forgotPassword,
    resetPasswordHandler
};