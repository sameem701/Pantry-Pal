const pool = require('../config/db');

// 1. Register User (Step 1: Create temp record)
const registerUserTemp = async (email, passwordHash, verificationCode) => {
    const query = `
        SELECT register_user_temp($1, $2, $3) AS result
    `;
    const { rows } = await pool.query(query, [email, passwordHash, verificationCode]);
    return rows[0].result;
};

// 2. Verify Email & Create User (Step 2: Promote temp to real user)
const verifyAndCreateUser = async (email, code) => {
    const query = `
        SELECT verify_and_create_user($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [email, code]);
    return rows[0].result;
};

// 3. Login User
const loginUser = async (email, passwordHash) => {
    const query = 'SELECT login_user($1, $2) AS result';
    const { rows } = await pool.query(query, [email, passwordHash]);
    return rows[0].result; 
};

// 4. Get User Profile
const getUserProfile = async (userId) => {
    const query = 'SELECT get_user_profile($1) AS result';
    const { rows } = await pool.query(query, [userId]);
    return rows[0].result;
};

// 5. Update User Profile
const updateUserProfile = async (userId, skillLevel, dietaryPreferences, cuisinePreferences) => {
    const query = `
        SELECT update_user_profile($1, $2, $3, $4) AS result
    `;
    const { rows } = await pool.query(query, [
        userId,
        skillLevel,
        dietaryPreferences ? JSON.stringify(dietaryPreferences) : null,
        cuisinePreferences ? JSON.stringify(cuisinePreferences) : null
    ]);
    return rows[0].result;
};

// 6. Get All Dietary Preferences
const getDietaryPreferences = async () => {
    const query = 'SELECT get_all_dietary_preferences() AS result';
    const { rows } = await pool.query(query);
    return rows[0].result;
};

// 7. Get All Cuisines
const getAllCuisines = async () => {
    const query = `
        SELECT cuisine_id, name FROM cuisines ORDER BY name ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

// 8. Request Password Reset
const requestPasswordReset = async (email, resetCode) => {
    const query = `
        SELECT request_password_reset($1, $2) AS result
    `;
    const { rows } = await pool.query(query, [email, resetCode]);
    return rows[0].result;
};

// 9. Reset Password
const resetPassword = async (email, resetCode, newPasswordHash) => {
    const query = `
        SELECT reset_password($1, $2, $3) AS result
    `;
    const { rows } = await pool.query(query, [email, resetCode, newPasswordHash]);
    return rows[0].result;
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
    resetPassword
};