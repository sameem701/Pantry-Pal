import { apiRequest } from './client';

// ── Auth ──────────────────────────────────────────────────────────────────────

export function register(email, password, passwordConfirm) {
    return apiRequest('/users/register', {
        method: 'POST',
        body: { email, password, password_confirm: passwordConfirm },
    });
}

export function verifyEmail(email, code) {
    return apiRequest('/users/verify', {
        method: 'POST',
        body: { email, code },
    });
}

export function login(email, password) {
    return apiRequest('/users/login', {
        method: 'POST',
        body: { email, password },
    });
}

export function forgotPassword(email) {
    return apiRequest('/users/forgot-password', {
        method: 'POST',
        body: { email },
    });
}

export function resetPassword(email, code, newPassword, newPasswordConfirm) {
    return apiRequest('/users/reset-password', {
        method: 'POST',
        body: { email, code, new_password: newPassword, new_password_confirm: newPasswordConfirm },
    });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function getProfile(userId) {
    return apiRequest(`/users/${userId}`);
}

export function updateProfile(userId, { skill_level, dietary_preferences, cuisine_preferences }) {
    return apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: { skill_level, dietary_preferences, cuisine_preferences },
    });
}

// ── Options ───────────────────────────────────────────────────────────────────

export function getDietaryOptions() {
    return apiRequest('/users/preferences/dietary');
}

export function getCuisineOptions() {
    return apiRequest('/users/preferences/cuisines');
}
