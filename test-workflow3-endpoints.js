/*
  Workflow 3 endpoint smoke test runner (single-file root script).

  Run from PantryPal root:
    node test-workflow3-endpoints.js

  Optional environment variables:
    BASE_URL=http://localhost:5001
    USER_ID=1
    RECIPE_ID=1
    SECOND_RECIPE_ID=1
    PLAN_ID=123
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const USER_ID = Number(process.env.USER_ID || 1);
const RECIPE_ID = Number(process.env.RECIPE_ID || 1);
const SECOND_RECIPE_ID = Number(process.env.SECOND_RECIPE_ID || RECIPE_ID);

let planId = process.env.PLAN_ID ? Number(process.env.PLAN_ID) : null;
let listId = null;
let templateId = null;

const results = [];

const fmtDate = (date) => date.toISOString().slice(0, 10);

const buildWeekStart = () => {
    const now = new Date();
    const jitterDays = Math.floor(Math.random() * 365) + 30;
    const candidate = new Date(now.getTime() + jitterDays * 24 * 60 * 60 * 1000);
    return fmtDate(candidate);
};

const request = async (method, path, { query = null, body = null, expectPdf = false } = {}) => {
    const url = new URL(path, BASE_URL);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    const options = {
        method,
        headers: {}
    };

    if (body !== null) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (expectPdf) {
        const buffer = Buffer.from(await res.arrayBuffer());
        return {
            status: res.status,
            contentType,
            body: buffer
        };
    }

    let parsedBody;
    if (contentType.includes('application/json')) {
        parsedBody = await res.json();
    } else {
        parsedBody = await res.text();
    }

    return {
        status: res.status,
        contentType,
        body: parsedBody
    };
};

const runStep = async (name, fn) => {
    try {
        const info = await fn();
        results.push({ name, passed: true, info });
        console.log(`PASS | ${name} | ${info}`);
    } catch (error) {
        results.push({ name, passed: false, info: error.message });
        console.error(`FAIL | ${name} | ${error.message}`);
    }
};

const requireStatus = (res, expected, context) => {
    if (!expected.includes(res.status)) {
        throw new Error(
            `${context} expected status ${expected.join('/')} but got ${res.status}. body=${JSON.stringify(res.body)}`
        );
    }
};

const withPlan = (name, fn) => runStep(name, async () => {
    if (!planId) {
        throw new Error('plan_id unavailable');
    }
    return fn();
});

const main = async () => {
    const weekStart = buildWeekStart();

    console.log('--- Workflow 3 Endpoint Smoke Test ---');
    console.log(`BASE_URL=${BASE_URL}`);
    console.log(`USER_ID=${USER_ID}`);
    console.log(`RECIPE_ID=${RECIPE_ID}`);
    console.log(`SECOND_RECIPE_ID=${SECOND_RECIPE_ID}`);
    if (planId) {
        console.log(`PLAN_ID preset=${planId}`);
    }
    console.log('--------------------------------------');

    await runStep('GET /api/health', async () => {
        const res = await request('GET', '/api/health');
        requireStatus(res, [200], 'Health');
        return `status=${res.status}`;
    });

    await runStep('POST /api/meal-plans', async () => {
        const res = await request('POST', '/api/meal-plans', {
            body: {
                user_id: USER_ID,
                week_start: weekStart,
                name: `Smoke Test Plan ${Date.now()}`
            }
        });

        if (res.status === 200 && res.body && res.body.plan_id) {
            planId = Number(res.body.plan_id);
            return `created plan_id=${planId}`;
        }

        if (planId) {
            return `create returned status=${res.status}; using preset plan_id=${planId}`;
        }

        throw new Error(`Plan creation failed and no PLAN_ID fallback was provided. body=${JSON.stringify(res.body)}`);
    });

    await withPlan('GET /api/meal-plans/:planId', async () => {
        const res = await request('GET', `/api/meal-plans/${planId}`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Get plan');
        return `plan_id=${planId}, meals=${Array.isArray(res.body?.meals) ? res.body.meals.length : 'n/a'}`;
    });

    await withPlan('POST /api/meal-plans/:planId/meals (Monday dinner)', async () => {
        const res = await request('POST', `/api/meal-plans/${planId}/meals`, {
            body: {
                user_id: USER_ID,
                recipe_id: RECIPE_ID,
                day_of_week: 'Monday',
                meal_type: 'dinner'
            }
        });
        requireStatus(res, [200], 'Add meal Monday dinner');
        return `recipe_id=${RECIPE_ID}`;
    });

    await withPlan('POST /api/meal-plans/:planId/meals (Tuesday lunch)', async () => {
        const res = await request('POST', `/api/meal-plans/${planId}/meals`, {
            body: {
                user_id: USER_ID,
                recipe_id: SECOND_RECIPE_ID,
                day_of_week: 'Tuesday',
                meal_type: 'lunch'
            }
        });
        requireStatus(res, [200], 'Add meal Tuesday lunch');
        return `recipe_id=${SECOND_RECIPE_ID}`;
    });

    await withPlan('POST /api/meal-plans/:planId/suggestions', async () => {
        const res = await request('POST', `/api/meal-plans/${planId}/suggestions`, {
            body: {
                user_id: USER_ID,
                days: 7
            }
        });
        requireStatus(res, [200], 'Suggestions');
        return `mode=${res.body?.mode || 'n/a'}`;
    });

    await withPlan('GET /api/meal-plans/:planId/missing-ingredients', async () => {
        const res = await request('GET', `/api/meal-plans/${planId}/missing-ingredients`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Missing ingredients');
        const count = Array.isArray(res.body?.data) ? res.body.data.length : 'n/a';
        return `items=${count}`;
    });

    await withPlan('POST /api/meal-plans/:planId/shopping-list', async () => {
        const res = await request('POST', `/api/meal-plans/${planId}/shopping-list`, {
            body: {
                user_id: USER_ID,
                items: [
                    {
                        name: 'tomato',
                        quantity: 'approx 800g (6-8 pieces)',
                        category: 'Vegetable'
                    },
                    {
                        name: 'olive oil',
                        quantity: '1 bottle',
                        category: 'Pantry'
                    }
                ]
            }
        });
        requireStatus(res, [200], 'Save shopping list');
        listId = Number(res.body?.list_id);
        return `list_id=${listId || 'n/a'}`;
    });

    await withPlan('GET /api/meal-plans/:planId/shopping-list/text', async () => {
        const res = await request('GET', `/api/meal-plans/${planId}/shopping-list/text`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Shopping list text');
        if (!listId && res.body?.list_id) {
            listId = Number(res.body.list_id);
        }
        return `list_id=${listId || 'n/a'}`;
    });

    await withPlan('GET /api/meal-plans/:planId/shopping-list/export/pdf', async () => {
        const res = await request('GET', `/api/meal-plans/${planId}/shopping-list/export/pdf`, {
            query: { user_id: USER_ID },
            expectPdf: true
        });
        requireStatus(res, [200], 'Export PDF');
        if (!String(res.contentType).includes('application/pdf')) {
            throw new Error(`Expected application/pdf content-type, got ${res.contentType}`);
        }
        return `bytes=${res.body.length}`;
    });

    await runStep('PATCH /api/meal-plans/shopping-list/:listId/toggle', async () => {
        if (!listId) {
            throw new Error('list_id unavailable');
        }
        const res = await request('PATCH', `/api/meal-plans/shopping-list/${listId}/toggle`, {
            body: {
                user_id: USER_ID,
                ingredient_name: 'tomato'
            }
        });
        requireStatus(res, [200], 'Toggle shopping item');
        return `is_checked=${res.body?.is_checked}`;
    });

    await withPlan('PATCH /api/meal-plans/:planId/meals/cooked', async () => {
        const res = await request('PATCH', `/api/meal-plans/${planId}/meals/cooked`, {
            body: {
                user_id: USER_ID,
                day_of_week: 'Monday',
                meal_type: 'dinner'
            }
        });
        requireStatus(res, [200], 'Mark meal cooked');
        return 'marked cooked';
    });

    await withPlan('POST /api/meal-plans/:planId/templates', async () => {
        const res = await request('POST', `/api/meal-plans/${planId}/templates`, {
            body: {
                user_id: USER_ID,
                name: `Smoke Template ${Date.now()}`
            }
        });
        requireStatus(res, [200], 'Save template');
        templateId = Number(res.body?.template_id);
        return `template_id=${templateId || 'n/a'}`;
    });

    await runStep('GET /api/meal-plans/templates', async () => {
        const res = await request('GET', '/api/meal-plans/templates', {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'List templates');
        const count = Array.isArray(res.body?.data) ? res.body.data.length : 'n/a';
        return `templates=${count}`;
    });

    await withPlan('POST /api/meal-plans/:planId/templates/load', async () => {
        if (!templateId) {
            throw new Error('template_id unavailable');
        }
        const res = await request('POST', `/api/meal-plans/${planId}/templates/load`, {
            body: {
                user_id: USER_ID,
                template_id: templateId
            }
        });
        requireStatus(res, [200], 'Load template');
        return `template_id=${templateId}`;
    });

    await runStep('GET /api/meal-plans/recipes/:recipeId/nutrition', async () => {
        const res = await request('GET', `/api/meal-plans/recipes/${RECIPE_ID}/nutrition`);
        requireStatus(res, [200, 404], 'Recipe nutrition');
        return `status=${res.status}`;
    });

    await withPlan('GET /api/meal-plans/:planId/nutrition', async () => {
        const res = await request('GET', `/api/meal-plans/${planId}/nutrition`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Weekly nutrition');
        return `has_weekly_totals=${Boolean(res.body?.weekly_totals)}`;
    });

    await withPlan('DELETE /api/meal-plans/:planId/meals', async () => {
        const res = await request('DELETE', `/api/meal-plans/${planId}/meals`, {
            body: {
                user_id: USER_ID,
                day_of_week: 'Tuesday',
                meal_type: 'lunch'
            }
        });
        requireStatus(res, [200], 'Remove meal slot');
        return 'removed Tuesday lunch';
    });

    await runStep('DELETE /api/meal-plans/templates/:templateId', async () => {
        if (!templateId) {
            throw new Error('template_id unavailable');
        }
        const res = await request('DELETE', `/api/meal-plans/templates/${templateId}`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Delete template');
        return `template_id=${templateId}`;
    });

    await withPlan('DELETE /api/meal-plans/:planId', async () => {
        const res = await request('DELETE', `/api/meal-plans/${planId}`, {
            query: { user_id: USER_ID }
        });
        requireStatus(res, [200], 'Clear meal plan');
        return `plan_id=${planId}`;
    });

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    console.log('--------------------------------------');
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
};

main().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
