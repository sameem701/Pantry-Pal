import { API_BASE_URL } from '../constants/config';

const REQUEST_TIMEOUT_MS = 15000;

async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return { message: 'Invalid server response format.' };
    }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('Request timed out. Check backend server status and network access.');
        }

        throw new Error(`Network error. Verify API URL and backend reachability: ${API_BASE_URL}`);
    } finally {
        clearTimeout(timeoutId);
    }

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        const message = payload?.message || 'Request failed.';
        const err = new Error(message);
        err.status = response.status;
        err.payload = payload;
        throw err;
    }

    return payload;
}
