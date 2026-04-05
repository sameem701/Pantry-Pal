const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const DEFAULT_PASSWORD = 'Test12345!';
const UPDATED_PASSWORD = 'Test12345!!';

const state = {
    users: {},
    recipes: {},
    mealPlans: {},
    shoppingLists: {},
    templates: {},
};

function makeEmail(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function request(method, path, options = {}) {
    const {
        body,
        headers = {},
        responseType = 'json',
        ...directBody
    } = options;

    const payload = body !== undefined
        ? body
        : Object.keys(directBody).length > 0
            ? directBody
            : undefined;

    const requestOptions = {
        method,
        headers: { ...headers },
    };

    if (payload !== undefined) {
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(`${BASE_URL}${path}`, requestOptions);
    const contentType = response.headers.get('content-type') || '';

    let data;
    if (responseType === 'arrayBuffer') {
        data = await response.arrayBuffer();
    } else if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
    };
}

function unwrap(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    if (Array.isArray(data)) {
        return data;
    }

    return data.data ?? data.result ?? data.response ?? data;
}

function extractCode(text) {
    const match = String(text || '').match(/(\d{6})/);
    if (!match) {
        throw new Error(`Could not extract verification/reset code from: ${text}`);
    }
    return match[1];
}

function extractId(value) {
    if (!value || typeof value !== 'object') {
        return null;
    }

    return value.user_id ?? value.userId ?? value.recipe_id ?? value.recipeId ?? value.plan_id ?? value.planId ?? value.list_id ?? value.listId ?? value.template_id ?? value.templateId ?? value.session_id ?? value.sessionId ?? null;
}

function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === 'object' && Array.isArray(value.data)) {
        return value.data;
    }

    return [];
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function step(label, fn) {
    process.stdout.write(`- ${label}... `);
    const value = await fn();
    console.log('ok');
    return value;
}

async function expectStatus(label, response, expected) {
    const statuses = Array.isArray(expected) ? expected : [expected];
    assert(statuses.includes(response.status), `${label}: expected ${statuses.join(' or ')}, got ${response.status}. Body: ${JSON.stringify(response.data)}`);
    return response.data;
}

async function expectSuccess(label, response, expected = 200) {
    const data = await expectStatus(label, response, expected);
    const payload = unwrap(data);
    assert(payload && payload.success !== false, `${label}: expected success, got ${JSON.stringify(data)}`);
    return payload;
}

async function main() {
    console.log(`Running PantryPal endpoint suite against ${BASE_URL}`);

    const health = await step('health check', async () => request('GET', '/api/health'));
    await expectStatus('health check', health, 200);

    const dietaryOptions = await step('load dietary options', async () => request('GET', '/api/users/preferences/dietary'));
    const cuisinesOptions = await step('load cuisine options', async () => request('GET', '/api/users/preferences/cuisines'));
    const ingredientsAll = await step('load ingredient catalog', async () => request('GET', '/api/pantry/ingredients/all'));

    const dietaryData = unwrap(dietaryOptions.data);
    const cuisineData = unwrap(cuisinesOptions.data);
    const ingredientData = unwrap(ingredientsAll.data);
    assert(Array.isArray(dietaryData.data || dietaryData), 'Dietary preferences endpoint did not return list data');
    assert(Array.isArray(cuisineData.data || cuisineData), 'Cuisine options endpoint did not return list data');
    assert(Array.isArray(ingredientData.data || ingredientData), 'Ingredients endpoint did not return list data');

    const userA = {
        email: makeEmail('runner-a'),
        password: DEFAULT_PASSWORD,
        updatedPassword: UPDATED_PASSWORD,
    };
    const userB = {
        email: makeEmail('runner-b'),
        password: DEFAULT_PASSWORD,
    };

    const registeredA = await step('register user A', async () => request('POST', '/api/users/register', {
        email: userA.email,
        password: userA.password,
        password_confirm: userA.password,
    }));
    const registerAData = await expectSuccess('register user A', registeredA, 201);
    userA.verificationCode = extractCode(registerAData.note);

    const verifiedA = await step('verify user A', async () => request('POST', '/api/users/verify', {
        email: userA.email,
        code: userA.verificationCode,
    }));
    const verifyAData = await expectSuccess('verify user A', verifiedA, [200, 201]);
    userA.id = extractId(verifyAData);
    assert(userA.id, 'Could not extract user A id');

    const loginA = await step('login user A', async () => request('POST', '/api/users/login', {
        email: userA.email,
        password: userA.password,
    }));
    await expectSuccess('login user A', loginA, 200);

    const profileA = await step('fetch user A profile', async () => request('GET', `/api/users/${userA.id}`));
    await expectSuccess('fetch user A profile', profileA, 200);

    const updateA = await step('update user A profile', async () => request('PUT', `/api/users/${userA.id}`, {
        skill_level: 'Advanced',
        dietary_preferences: [1, 4],
        cuisine_preferences: [1, 3],
    }));
    await expectSuccess('update user A profile', updateA, 200);

    const forgotA = await step('request password reset for user A', async () => request('POST', '/api/users/forgot-password', {
        email: userA.email,
    }));
    const forgotAData = await expectSuccess('request password reset for user A', forgotA, 200);
    const resetCode = extractCode(forgotAData.note);

    const resetA = await step('reset user A password', async () => request('POST', '/api/users/reset-password', {
        email: userA.email,
        code: resetCode,
        new_password: userA.updatedPassword,
        new_password_confirm: userA.updatedPassword,
    }));
    await expectSuccess('reset user A password', resetA, 200);

    const reloginA = await step('re-login user A with new password', async () => request('POST', '/api/users/login', {
        email: userA.email,
        password: userA.updatedPassword,
    }));
    await expectSuccess('re-login user A with new password', reloginA, 200);

    const registeredB = await step('register user B', async () => request('POST', '/api/users/register', {
        email: userB.email,
        password: userB.password,
        password_confirm: userB.password,
    }));
    const registerBData = await expectSuccess('register user B', registeredB, 201);
    userB.verificationCode = extractCode(registerBData.note);

    const verifiedB = await step('verify user B', async () => request('POST', '/api/users/verify', {
        email: userB.email,
        code: userB.verificationCode,
    }));
    const verifyBData = await expectSuccess('verify user B', verifiedB, [200, 201]);
    userB.id = extractId(verifyBData);
    assert(userB.id, 'Could not extract user B id');

    const loginB = await step('login user B', async () => request('POST', '/api/users/login', {
        email: userB.email,
        password: userB.password,
    }));
    await expectSuccess('login user B', loginB, 200);

    const pantrySeed = [
        { ingredient_id: 8, quantity: 2, unit: 'cups', storage_location: 'Pantry' },
        { ingredient_id: 9, quantity: 4, unit: 'count', storage_location: 'Fridge' },
        { ingredient_id: 10, quantity: 3, unit: 'count', storage_location: 'Pantry' },
        { ingredient_id: 11, quantity: 2, unit: 'cloves', storage_location: 'Pantry' },
        { ingredient_id: 18, quantity: 1, unit: 'tbsp', storage_location: 'Pantry' },
    ];

    for (const item of pantrySeed) {
        await step(`add pantry item ${item.ingredient_id}`, async () => request('POST', '/api/pantry', {
            user_id: userA.id,
            ...item,
        }).then((response) => expectSuccess(`add pantry item ${item.ingredient_id}`, response, [200, 201])));
    }

    const pantryView = await step('view pantry for user A', async () => request('GET', `/api/pantry/${userA.id}`));
    await expectSuccess('view pantry for user A', pantryView, 200);

    const pantryUpdate = await step('update pantry item', async () => request('PUT', `/api/pantry/${userA.id}/8`, {
        quantity: 3,
        unit: 'cups',
        storage_location: 'Pantry',
    }));
    await expectSuccess('update pantry item', pantryUpdate, 200);

    const pantryDelete = await step('delete pantry item', async () => request('DELETE', `/api/pantry/${userA.id}/9`));
    await expectSuccess('delete pantry item', pantryDelete, 200);

    const ingredientSearch = await step('search ingredients', async () => request('GET', '/api/pantry/ingredients/search?q=on'));
    await expectSuccess('search ingredients', ingredientSearch, 200);

    const compliantIngredients = [
        { ingredient_id: 8, quantity: 200, unit: 'grams' },
        { ingredient_id: 9, quantity: 2, unit: 'count' },
        { ingredient_id: 10, quantity: 1, unit: 'count' },
        { ingredient_id: 11, quantity: 2, unit: 'cloves' },
        { ingredient_id: 18, quantity: 1, unit: 'tbsp' },
        { ingredient_id: 21, quantity: 1, unit: 'tsp' },
    ];

    const createRecipePayload = (ownerId, title, status = 'published', cuisineIds = [1], dietaryTagIds = [1], ingredients = compliantIngredients) => ({
        userId: ownerId,
        title,
        description: `${title} description`,
        difficulty: 'Easy',
        cookingTime: 20,
        imageUrl: null,
        status,
        ingredients,
        instructions: [
            { step_number: 1, instruction_text: 'Prep the ingredients.' },
            { step_number: 2, instruction_text: 'Cook the base and sauce.' },
            { step_number: 3, instruction_text: 'Finish and serve.' },
        ],
        cuisineIds,
        dietaryTagIds,
        nutrition: {
            calories: 320,
            protein_g: 11,
            carbs_g: 55,
            fat_g: 7,
        },
    });

    const createUserARecipe = await step('create published recipe for user A', async () => request('POST', '/api/recipes', createRecipePayload(userA.id, 'Runner A Rice Bowl', 'published', [1], [1])));
    const createdUserARecipe = await expectSuccess('create published recipe for user A', createUserARecipe, [200, 201]);
    const userARecipeId = extractId(createdUserARecipe);
    assert(userARecipeId, 'Could not extract user A recipe id');
    state.recipes.userA = userARecipeId;

    const createUserADraft = await step('create draft recipe for user A', async () => request('POST', '/api/recipes', createRecipePayload(userA.id, 'Runner A Draft', 'draft', [1], [1])));
    const createdDraftRecipe = await expectSuccess('create draft recipe for user A', createUserADraft, [200, 201]);
    const draftRecipeId = extractId(createdDraftRecipe);
    assert(draftRecipeId, 'Could not extract draft recipe id');
    state.recipes.draft = draftRecipeId;

    const createUserBRecipe = await step('create published recipe for user B', async () => request('POST', '/api/recipes', createRecipePayload(userB.id, 'Runner B Veggie Stir Fry', 'published', [3], [1])));
    const createdUserBRecipe = await expectSuccess('create published recipe for user B', createUserBRecipe, [200, 201]);
    const userBRecipeId = extractId(createdUserBRecipe);
    assert(userBRecipeId, 'Could not extract user B recipe id');
    state.recipes.userB = userBRecipeId;

    const recipeList = await step('list published recipes', async () => request('GET', `/api/recipes?user_id=${userA.id}`));
    const recipeListData = await expectSuccess('list published recipes', recipeList, 200);
    const listedRecipes = asArray(recipeListData);
    const listedRecipeIds = listedRecipes.map((recipe) => String(recipe.recipe_id ?? recipe.recipeId ?? '')).filter(Boolean);
    assert(listedRecipeIds.includes(String(userARecipeId)), 'User A published recipe missing from recipe list');
    assert(listedRecipeIds.includes(String(userBRecipeId)), 'User B published recipe missing from recipe list');
    assert(!listedRecipeIds.includes(String(draftRecipeId)), 'Draft recipe unexpectedly visible in recipe list');

    const browse = await step('browse recipes', async () => request('GET', `/api/recipes/browse?user_id=${userA.id}&difficulty=Easy&cuisine_ids=1&page=1&limit=20`));
    await expectSuccess('browse recipes', browse, 200);

    const pantrySearch = await step('search recipes by pantry', async () => request('GET', `/api/recipes/search-by-pantry/${userA.id}?page=1&limit=10&cuisine_ids=1&difficulty=Easy&max_missing=3`));
    await expectSuccess('search recipes by pantry', pantrySearch, 200);

    const cuisineOptionsRecipes = await step('load recipe cuisine options', async () => request('GET', '/api/recipes/options/cuisines'));
    await expectSuccess('load recipe cuisine options', cuisineOptionsRecipes, 200);

    const dietaryOptionsRecipes = await step('load recipe dietary options', async () => request('GET', '/api/recipes/options/dietary-preferences'));
    await expectSuccess('load recipe dietary options', dietaryOptionsRecipes, 200);

    const recipeDetails = await step('get recipe details', async () => request('GET', `/api/recipes/${userARecipeId}?user_id=${userA.id}`));
    await expectSuccess('get recipe details', recipeDetails, 200);

    const recipeUpdate = await step('update own recipe', async () => request('PUT', `/api/recipes/${userARecipeId}`, {
        userId: userA.id,
        title: 'Runner A Pasta Updated',
        description: 'Updated description',
        difficulty: 'Medium',
        cookingTime: 25,
        status: 'published',
        ingredients: createRecipePayload(userA.id, 'tmp').ingredients,
        instructions: createRecipePayload(userA.id, 'tmp').instructions,
        cuisineIds: [1, 8],
        dietaryTagIds: [1],
        nutrition: { calories: 350, protein_g: 12, carbs_g: 58, fat_g: 8 },
    }));
    await expectSuccess('update own recipe', recipeUpdate, 200);

    const forbiddenUpdate = await step('reject cross-user recipe update', async () => request('PUT', `/api/recipes/${userARecipeId}`, {
        userId: userB.id,
        title: 'Should Fail',
        description: 'Should fail',
        difficulty: 'Easy',
        cookingTime: 15,
        status: 'published',
        ingredients: createRecipePayload(userB.id, 'tmp').ingredients,
        instructions: createRecipePayload(userB.id, 'tmp').instructions,
        cuisineIds: [3],
        dietaryTagIds: [1],
    }));
    assert(forbiddenUpdate.status >= 400, `Expected cross-user update to fail, got ${forbiddenUpdate.status}`);

    const favouriteOn = await step('toggle favourite on', async () => request('POST', `/api/recipes/${userBRecipeId}/favourite`, {
        user_id: userA.id,
    }));
    await expectSuccess('toggle favourite on', favouriteOn, 200);

    const favouritesList = await step('list favourites', async () => request('GET', `/api/recipes/favourites/${userA.id}`));
    const favouritesPayload = await expectSuccess('list favourites', favouritesList, 200);
    const favouritesArray = Array.isArray(favouritesPayload.data) ? favouritesPayload.data : favouritesPayload;
    assert(favouritesArray.some((recipe) => recipe.recipe_id === userBRecipeId), 'Favourite recipe missing from favourites list');

    const favouriteOff = await step('toggle favourite off', async () => request('POST', `/api/recipes/${userBRecipeId}/favourite`, {
        user_id: userA.id,
    }));
    await expectSuccess('toggle favourite off', favouriteOff, 200);

    const reviewUpsert = await step('upsert review', async () => request('POST', `/api/recipes/${userBRecipeId}/reviews`, {
        user_id: userA.id,
        rating: 4,
        review_text: 'Solid test recipe',
    }));
    await expectSuccess('upsert review', reviewUpsert, 200);

    const reviewUpdate = await step('update review via upsert', async () => request('POST', `/api/recipes/${userBRecipeId}/reviews`, {
        user_id: userA.id,
        rating: 5,
        review_text: 'Updated review',
    }));
    await expectSuccess('update review via upsert', reviewUpdate, 200);

    const recipeReviews = await step('list recipe reviews', async () => request('GET', `/api/recipes/${userBRecipeId}/reviews`));
    const recipeReviewsPayload = await expectSuccess('list recipe reviews', recipeReviews, 200);
    const recipeReviewsArray = Array.isArray(recipeReviewsPayload.data) ? recipeReviewsPayload.data : recipeReviewsPayload;
    assert(recipeReviewsArray.some((review) => String(review.review_text || '').includes('Updated review')), 'Updated review not found in recipe reviews list');

    const reviewDelete = await step('delete review', async () => request('DELETE', `/api/recipes/${userBRecipeId}/reviews`, {
        body: { user_id: userA.id },
    }));
    await expectSuccess('delete review', reviewDelete, 200);

    const cookingStart = await step('start cooking session', async () => request('POST', `/api/recipes/${userBRecipeId}/cooking-sessions`, {
        user_id: userA.id,
    }));
    const cookingStartPayload = await expectSuccess('start cooking session', cookingStart, 200);
    const sessionId = extractId(cookingStartPayload);
    assert(sessionId, 'Could not extract cooking session id');
    state.cookingSessionId = sessionId;

    const cookingGet = await step('get cooking session', async () => request('GET', `/api/recipes/cooking-sessions/${sessionId}?user_id=${userA.id}`));
    await expectSuccess('get cooking session', cookingGet, 200);

    const cookingStep = await step('update cooking step', async () => request('PATCH', `/api/recipes/cooking-sessions/${sessionId}/step`, {
        user_id: userA.id,
        step_number: 2,
    }));
    await expectSuccess('update cooking step', cookingStep, 200);

    const cookingComplete = await step('complete cooking session', async () => request('PATCH', `/api/recipes/cooking-sessions/${sessionId}/complete`, {
        user_id: userA.id,
    }));
    await expectSuccess('complete cooking session', cookingComplete, 200);

    const mealPlanCreate = await step('create meal plan', async () => request('POST', '/api/meal-plans', {
        user_id: userA.id,
        week_start: new Date().toISOString().slice(0, 10),
        name: 'Endpoint Test Plan',
    }));
    const mealPlanPayload = await expectSuccess('create meal plan', mealPlanCreate, 200);
    const planId = extractId(mealPlanPayload);
    assert(planId, 'Could not extract meal plan id');
    state.mealPlans.primary = planId;

    const addMealOne = await step('add meal to plan', async () => request('POST', `/api/meal-plans/${planId}/meals`, {
        user_id: userA.id,
        recipe_id: userARecipeId,
        day_of_week: 'Monday',
        meal_type: 'lunch',
    }));
    await expectSuccess('add meal to plan', addMealOne, 200);

    const addMealTwo = await step('add second meal to plan', async () => request('POST', `/api/meal-plans/${planId}/meals`, {
        user_id: userA.id,
        recipe_id: userBRecipeId,
        day_of_week: 'Tuesday',
        meal_type: 'dinner',
    }));
    await expectSuccess('add second meal to plan', addMealTwo, 200);

    const mealPlanView = await step('view meal plan', async () => request('GET', `/api/meal-plans/${planId}?user_id=${userA.id}`));
    await expectSuccess('view meal plan', mealPlanView, 200);

    const suggestions = await step('get weekly suggestions', async () => request('POST', `/api/meal-plans/${planId}/suggestions`, {
        user_id: userA.id,
        days: 7,
    }));
    await expectSuccess('get weekly suggestions', suggestions, 200);

    const missingIngredients = await step('get missing ingredients', async () => request('GET', `/api/meal-plans/${planId}/missing-ingredients?user_id=${userA.id}`));
    await expectSuccess('get missing ingredients', missingIngredients, 200);

    const shoppingListSave = await step('save AI shopping list', async () => request('POST', `/api/meal-plans/${planId}/shopping-list`, {
        user_id: userA.id,
        items: [
            { name: 'Tomato', quantity: '2', category: 'Produce' },
            { name: 'Onion', quantity: '1', category: 'Produce' },
            { name: 'Olive Oil', quantity: '1 bottle', category: 'Pantry' },
        ],
    }));
    const shoppingListPayload = await expectSuccess('save AI shopping list', shoppingListSave, 200);
    const listId = extractId(shoppingListPayload);
    assert(listId, 'Could not extract shopping list id');
    state.shoppingLists.primary = listId;

    const shoppingListText = await step('get shopping list text', async () => request('GET', `/api/meal-plans/${planId}/shopping-list/text?user_id=${userA.id}`));
    await expectSuccess('get shopping list text', shoppingListText, 200);

    const shoppingListPdf = await step('export shopping list pdf', async () => request('GET', `/api/meal-plans/${planId}/shopping-list/export/pdf?user_id=${userA.id}`, { responseType: 'arrayBuffer' }));
    await expectStatus('export shopping list pdf', shoppingListPdf, 200);
    assert((shoppingListPdf.headers.get('content-type') || '').includes('application/pdf'), 'Shopping list PDF endpoint did not return a PDF content type');

    const toggleShopping = await step('toggle shopping item', async () => request('PATCH', `/api/meal-plans/shopping-list/${listId}/toggle`, {
        user_id: userA.id,
        ingredient_name: 'Tomato',
    }));
    await expectSuccess('toggle shopping item', toggleShopping, 200);

    const markCooked = await step('mark meal cooked', async () => request('PATCH', `/api/meal-plans/${planId}/meals/cooked`, {
        user_id: userA.id,
        day_of_week: 'Monday',
        meal_type: 'lunch',
    }));
    await expectSuccess('mark meal cooked', markCooked, 200);

    const recipeNutrition = await step('get recipe nutrition', async () => request('GET', `/api/meal-plans/recipes/${userARecipeId}/nutrition`));
    await expectSuccess('get recipe nutrition', recipeNutrition, 200);

    const weeklyNutrition = await step('get weekly nutrition', async () => request('GET', `/api/meal-plans/${planId}/nutrition?user_id=${userA.id}`));
    await expectSuccess('get weekly nutrition', weeklyNutrition, 200);

    const saveTemplate = await step('save plan as template', async () => request('POST', `/api/meal-plans/${planId}/templates`, {
        user_id: userA.id,
        name: 'Endpoint Test Template',
    }));
    const templatePayload = await expectSuccess('save plan as template', saveTemplate, 200);
    const templateId = extractId(templatePayload);
    assert(templateId, 'Could not extract template id');
    state.templates.primary = templateId;

    const listTemplates = await step('list templates', async () => request('GET', `/api/meal-plans/templates?user_id=${userA.id}`));
    await expectSuccess('list templates', listTemplates, 200);

    const secondaryPlan = await step('create secondary meal plan', async () => request('POST', '/api/meal-plans', {
        user_id: userA.id,
        week_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        name: 'Endpoint Test Plan 2',
    }));
    const secondaryPlanPayload = await expectSuccess('create secondary meal plan', secondaryPlan, 200);
    const secondaryPlanId = extractId(secondaryPlanPayload);
    assert(secondaryPlanId, 'Could not extract secondary meal plan id');
    state.mealPlans.secondary = secondaryPlanId;

    const loadTemplate = await step('load template into plan', async () => request('POST', `/api/meal-plans/${secondaryPlanId}/templates/load`, {
        user_id: userA.id,
        template_id: templateId,
    }));
    await expectSuccess('load template into plan', loadTemplate, 200);

    const deleteTemplate = await step('delete template', async () => request('DELETE', `/api/meal-plans/templates/${templateId}?user_id=${userA.id}`));
    await expectSuccess('delete template', deleteTemplate, 200);

    const removeMeal = await step('remove meal from plan', async () => request('DELETE', `/api/meal-plans/${secondaryPlanId}/meals`, {
        body: {
            user_id: userA.id,
            day_of_week: 'Monday',
            meal_type: 'lunch',
        },
    }));
    await expectSuccess('remove meal from plan', removeMeal, 200);

    const clearPlan = await step('clear meal plan', async () => request('DELETE', `/api/meal-plans/${planId}?user_id=${userA.id}`));
    await expectSuccess('clear meal plan', clearPlan, 200);

    const forbiddenDelete = await step('reject cross-user recipe delete', async () => request('DELETE', `/api/recipes/${userARecipeId}`, {
        body: { userId: userB.id },
    }));
    assert(forbiddenDelete.status >= 400, `Expected cross-user delete to fail, got ${forbiddenDelete.status}`);

    const deleteOwnDraft = await step('delete own draft recipe', async () => request('DELETE', `/api/recipes/${draftRecipeId}`, {
        body: { userId: userA.id },
    }));
    await expectSuccess('delete own draft recipe', deleteOwnDraft, 200);

    console.log('\nAll endpoint tests completed successfully.');
}

main().catch((error) => {
    console.error('\nEndpoint test run failed:');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
