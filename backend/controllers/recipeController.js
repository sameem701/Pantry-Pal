const pool = require('../config/db');
const query = (text, params = []) => pool.query(text, params);

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

const searchRecipesByPantry = async (userId, { cuisineIds = null, difficulty = null, maxMissing = null } = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const numericMaxMissing = maxMissing !== null && maxMissing !== undefined && Number.isFinite(Number(maxMissing))
    ? Number(maxMissing)
    : null;
  const query = `
        SELECT search_recipes_by_pantry($1::INTEGER, $2::INTEGER[], $3::VARCHAR, $4::INTEGER, $5::INTEGER, $6::INTEGER) AS result
    `;
  const { rows } = await pool.query(query, [
    userId,
    toIntegerArray(cuisineIds),
    difficulty || null,
    numericMaxMissing,
    limit,
    offset
  ]);
  return rows[0].result;
};

const browseRecipes = async (userId, filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const {
    searchTerm = null,
    cuisineIds = null,
    difficulty = null,
    creatorId = null
  } = filters;
  const numericCreatorId = creatorId !== null && creatorId !== undefined && Number.isFinite(Number(creatorId))
    ? Number(creatorId)
    : null;

  const query = `
        SELECT browse_recipes($1::INTEGER, $2::VARCHAR, $3::INTEGER[], $4::VARCHAR, $5::INTEGER, $6::INTEGER, $7::INTEGER) AS result
    `;
  const { rows } = await pool.query(query, [
    userId,
    searchTerm,
    toIntegerArray(cuisineIds),
    difficulty || null,
    numericCreatorId,
    limit,
    offset
  ]);
  return rows[0].result;
};

const getRecipeDetails = async (recipeId, userId = null) => {
  const query = `
        SELECT get_recipe_details($1, $2) AS result
    `;
  const { rows } = await pool.query(query, [recipeId, userId]);
  return rows[0].result;
};

const getAllCuisines = async () => {
  const query = 'SELECT get_all_cuisines() AS result';
  const { rows } = await pool.query(query);
  return rows[0].result;
};

const getAllDietaryPreferences = async () => {
  const query = `
        SELECT get_all_dietary_preferences() AS result
    `;
  const { rows } = await pool.query(query);
  return rows[0].result;
};

const toggleFavourite = async (userId, recipeId) => {
  const { rows } = await pool.query(
    'SELECT toggle_favourite($1, $2) AS result',
    [userId, recipeId]
  );
  return rows[0].result;
};

const getUserFavourites = async (userId) => {
  const { rows } = await pool.query(
    'SELECT get_user_favourites($1) AS result',
    [userId]
  );
  return rows[0].result;
};

const upsertReview = async (userId, recipeId, rating, reviewText = null) => {
  const { rows } = await pool.query(
    'SELECT upsert_review($1, $2, $3, $4) AS result',
    [userId, recipeId, rating, reviewText]
  );
  return rows[0].result;
};

const deleteReview = async (userId, recipeId) => {
  const { rows } = await pool.query(
    'SELECT delete_review($1, $2) AS result',
    [userId, recipeId]
  );
  return rows[0].result;
};

const getRecipeReviews = async (recipeId) => {
  const { rows } = await pool.query(
    'SELECT get_recipe_reviews($1) AS result',
    [recipeId]
  );
  return rows[0].result;
};

const startCookingSession = async (userId, recipeId) => {
  const { rows } = await pool.query(
    'SELECT start_cooking_session($1, $2) AS result',
    [userId, recipeId]
  );
  return rows[0].result;
};

const updateCookingStep = async (sessionId, userId, stepNumber) => {
  const { rows } = await pool.query(
    'SELECT update_cooking_step($1, $2, $3) AS result',
    [sessionId, userId, stepNumber]
  );
  return rows[0].result;
};

const completeCookingSession = async (sessionId, userId) => {
  const { rows } = await pool.query(
    'SELECT complete_cooking_session($1, $2) AS result',
    [sessionId, userId]
  );
  return rows[0].result;
};

const getCookingSession = async (sessionId, userId) => {
  const { rows } = await pool.query(
    'SELECT get_cooking_session($1, $2) AS result',
    [sessionId, userId]
  );
  return rows[0].result;
};

const searchByPantry = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 10, cuisine_ids, cuisine_id, difficulty, max_missing } = req.query;

    if (!user_id || Number.isNaN(Number(user_id))) {
      return res.status(400).json({ success: false, message: 'Valid user_id is required' });
    }

    if (Number.isNaN(Number(page)) || Number.isNaN(Number(limit))) {
      return res.status(400).json({
        success: false,
        message: 'page and limit must be valid numbers'
      });
    }

    const result = await searchRecipesByPantry(
      Number(user_id),
      {
        cuisineIds: cuisine_ids || cuisine_id || null,
        difficulty: difficulty || null,
        maxMissing: max_missing
      },
      Number(page),
      Number(limit)
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Search recipes by pantry error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const browse = async (req, res) => {
  try {
    const {
      user_id,
      difficulty,
      cuisine_ids,
      cuisine_id,
      creator_id,
      search_term,
      q,
      page = 1,
      limit = 10
    } = req.query;

    if (!user_id || Number.isNaN(Number(user_id))) {
      return res.status(400).json({
        success: false,
        message: 'user_id query parameter is required'
      });
    }

    if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'difficulty must be: Easy, Medium, or Hard'
      });
    }

    if (Number.isNaN(Number(page)) || Number.isNaN(Number(limit))) {
      return res.status(400).json({
        success: false,
        message: 'page and limit must be valid numbers'
      });
    }

    const result = await browseRecipes(
      Number(user_id),
      {
        searchTerm: search_term || q || null,
        cuisineIds: cuisine_ids || cuisine_id || null,
        difficulty: difficulty || null,
        creatorId: creator_id || null
      },
      Number(page),
      Number(limit)
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Browse recipes error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getDetails = async (req, res) => {
  try {
    const { recipe_id } = req.params;
    const { user_id } = req.query;

    if (!recipe_id || Number.isNaN(Number(recipe_id))) {
      return res.status(400).json({ success: false, message: 'Valid recipe_id is required' });
    }

    const result = await getRecipeDetails(Number(recipe_id), user_id ? Number(user_id) : null);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Get recipe details error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const listCuisineOptions = async (req, res) => {
  try {
    const result = await getAllCuisines();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Get cuisines error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const listDietaryOptions = async (req, res) => {
  try {
    const result = await getAllDietaryPreferences();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Get dietary preferences error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toIntArray = (value) => {
  if (value == null || value === '') {
    return [];
  }

  const list = Array.isArray(value) ? value : String(value).split(',');
  return list
    .map((item) => {
      if (item && typeof item === 'object') {
        return toNumber(item.preference_id ?? item.cuisine_id ?? item.ingredient_id ?? item.id ?? item.value);
      }

      return toNumber(item);
    })
    .filter((item) => item !== null);
};

const parseJsonValue = (value, fallback) => {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const withTransaction = async (handler) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const normalizeRecipePayload = (data = {}) => {
  const userId = toNumber(data.userId ?? data.authorId ?? data.user_id);
  const title = data.title;
  const description = data.description ?? data.recipeDescription ?? null;
  const difficulty = data.difficulty ?? 'Medium';
  const cookingTime = toNumber(data.cookingTime ?? data.cookTime ?? data.cooking_time_min ?? 30) ?? 30;
  const imageUrl = data.imageUrl ?? data.image_url ?? null;
  const status = data.status ?? (data.isDraft ? 'draft' : 'published');
  const ingredients = parseJsonValue(data.ingredients, []);
  const instructions = parseJsonValue(data.instructions, []);
  const cuisineIds = toIntArray(data.cuisineIds ?? data.cuisine_ids ?? data.cuisines);
  const dietaryTagIds = toIntArray(data.dietaryTagIds ?? data.dietaryTags ?? data.dietary_tag_ids);
  const nutrition = parseJsonValue(data.nutrition, null);

  return {
    userId,
    title,
    description,
    difficulty,
    cookingTime,
    imageUrl,
    status,
    ingredients,
    instructions,
    cuisineIds,
    dietaryTagIds,
    nutrition,
  };
};

const getAllRecipes = async (filters = {}) => {
  const result = await browseRecipes(
    toNumber(filters.userId ?? filters.user_id ?? filters.viewerId),
    {
      searchTerm: filters.searchTerm ?? filters.search ?? filters.q ?? filters.query ?? null,
      cuisineIds: filters.cuisineIds ?? filters.cuisine_ids ?? filters.cuisines,
      difficulty: filters.difficulty ?? null,
      creatorId: filters.creatorId ?? filters.creator_id ?? null
    },
    toNumber(filters.page ?? 1) ?? 1,
    toNumber(filters.limit ?? 20) ?? 20
  );

  if (!result?.success) {
    throw new Error(result?.message || 'Unable to fetch recipes');
  }

  return result.data || [];
};

const getRecipeById = async (id, userId = null) => {
  const recipeId = toNumber(id);
  const viewerId = toNumber(userId);

  const recipeResult = await query(
    `
      SELECT
        r.recipe_id,
        r.user_id AS creator_id,
        r.title,
        r.description,
        r.difficulty,
        r.cooking_time_min AS cooking_time,
        r.image_url,
        r.status,
        r.created_at,
        COALESCE(rs.average_rating, 0) AS average_rating,
        COALESCE(rs.total_reviews, 0) AS total_reviews,
        COALESCE(rs.favourite_count, 0) AS favourite_count
      FROM recipes r
      LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
      WHERE r.recipe_id = $1
    `,
    [recipeId]
  );

  if (recipeResult.rowCount === 0) {
    return null;
  }

  const ingredientsResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'ingredient_id', i.ingredient_id,
        'ingredient_name', i.ingredient_name,
        'category', i.category,
        'required_qty', ri.quantity,
        'unit', ri.unit,
        'in_pantry', (pi.ingredient_id IS NOT NULL),
        'pantry_qty', pi.quantity,
        'pantry_unit', pi.unit
      ) ORDER BY i.ingredient_name), '[]'::json) AS items
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
      LEFT JOIN pantry_items pi
        ON pi.ingredient_id = ri.ingredient_id
       AND pi.user_id = $2
      WHERE ri.recipe_id = $1
    `,
    [recipeId, viewerId]
  );

  const instructionsResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'step_number', step_number,
        'instruction_text', instruction_text
      ) ORDER BY step_number), '[]'::json) AS items
      FROM recipe_instructions
      WHERE recipe_id = $1
    `,
    [recipeId]
  );

  const cuisinesResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'cuisine_id', c.cuisine_id,
        'name', c.name
      ) ORDER BY c.name), '[]'::json) AS items
      FROM recipe_cuisines rc
      JOIN cuisines c ON c.cuisine_id = rc.cuisine_id
      WHERE rc.recipe_id = $1
    `,
    [recipeId]
  );

  const tagsResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'preference_id', dp.preference_id,
        'preference_name', dp.preference_name,
        'preference_type', dp.preference_type
      ) ORDER BY dp.preference_type, dp.preference_name), '[]'::json) AS items
      FROM recipe_dietary_tags rdt
      JOIN dietary_preferences dp ON dp.preference_id = rdt.preference_id
      WHERE rdt.recipe_id = $1
    `,
    [recipeId]
  );

  const nutritionResult = await query(
    `
      SELECT json_build_object(
        'calories', calories,
        'protein_g', protein_g,
        'carbs_g', carbs_g,
        'fat_g', fat_g
      ) AS item
      FROM recipe_nutrition
      WHERE recipe_id = $1
    `,
    [recipeId]
  );

  const reviewsResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'user_id', r.user_id,
        'email', u.email,
        'rating', r.rating,
        'review_text', r.review_text,
        'review_date', r.review_date
      ) ORDER BY r.review_date DESC), '[]'::json) AS items
      FROM reviews r
      JOIN app_users u ON u.user_id = r.user_id
      WHERE r.recipe_id = $1
    `,
    [recipeId]
  );

  let isFavourite = false;
  if (viewerId !== null) {
    const favResult = await query(
      'SELECT EXISTS (SELECT 1 FROM favourites WHERE user_id = $1 AND recipe_id = $2) AS is_favourite',
      [viewerId, recipeId]
    );
    isFavourite = Boolean(favResult.rows[0]?.is_favourite);
  }

  const recipe = recipeResult.rows[0];
  return {
    ...recipe,
    ingredients: ingredientsResult.rows[0]?.items ?? [],
    instructions: instructionsResult.rows[0]?.items ?? [],
    cuisines: cuisinesResult.rows[0]?.items ?? [],
    dietary_tags: tagsResult.rows[0]?.items ?? [],
    nutrition: nutritionResult.rows[0]?.item ?? null,
    reviews: reviewsResult.rows[0]?.items ?? [],
    is_favourite: isFavourite,
  };
};

const createRecipe = async (data) => {
  const payload = normalizeRecipePayload(data);

  if (payload.userId === null) {
    throw new Error('userId is required');
  }

  const ingredients = payload.ingredients.map((ingredient) => ({
    ingredient_id: toNumber(ingredient.ingredient_id ?? ingredient.ingredientId ?? ingredient.id),
    quantity: ingredient.quantity,
    unit: ingredient.unit ?? null
  }));

  const instructions = payload.instructions.map((step, index) => ({
    step_number: toNumber(step.step_number ?? step.stepNumber ?? (index + 1)),
    instruction_text: step.instruction_text ?? step.instructionText ?? ''
  }));

  const { rows } = await pool.query(
    `SELECT create_recipe($1, $2, $3, $4, $5, $6, $7::json, $8::json, $9, $10, $11::json) AS result`,
    [
      payload.userId,
      payload.title,
      payload.difficulty,
      payload.cookingTime,
      payload.imageUrl,
      payload.status,
      JSON.stringify(ingredients),
      JSON.stringify(instructions),
      payload.cuisineIds,
      payload.dietaryTagIds,
      payload.nutrition ? JSON.stringify(payload.nutrition) : null
    ]
  );

  const response = rows[0].result;
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to create recipe');
  }

  const details = await getRecipeDetails(response.recipe_id, payload.userId);
  return details?.success ? details : response;
};

const updateRecipe = async (id, data) => {
  const payload = normalizeRecipePayload(data);

  if (payload.userId === null) {
    throw new Error('userId is required');
  }

  const recipeId = toNumber(id);

  const ingredients = payload.ingredients.map((ingredient) => ({
    ingredient_id: toNumber(ingredient.ingredient_id ?? ingredient.ingredientId ?? ingredient.id),
    quantity: ingredient.quantity,
    unit: ingredient.unit ?? null
  }));

  const instructions = payload.instructions.map((step, index) => ({
    step_number: toNumber(step.step_number ?? step.stepNumber ?? (index + 1)),
    instruction_text: step.instruction_text ?? step.instructionText ?? ''
  }));

  const { rows } = await pool.query(
    `SELECT update_recipe($1, $2, $3, $4, $5, $6, $7, $8::json, $9::json, $10, $11, $12::json) AS result`,
    [
      recipeId,
      payload.userId,
      payload.title,
      payload.difficulty,
      payload.cookingTime,
      payload.imageUrl,
      payload.status,
      JSON.stringify(ingredients),
      JSON.stringify(instructions),
      payload.cuisineIds,
      payload.dietaryTagIds,
      payload.nutrition ? JSON.stringify(payload.nutrition) : null
    ]
  );

  const response = rows[0].result;
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to update recipe');
  }

  const details = await getRecipeDetails(recipeId, payload.userId);
  return details?.success ? details : response;
};

const deleteRecipe = async (id, userId) => {
  const ownerId = toNumber(userId);
  const recipeId = toNumber(id);

  if (ownerId === null) {
    throw new Error('userId is required');
  }

  const { rows } = await pool.query(
    'SELECT delete_recipe($1, $2) AS result',
    [recipeId, ownerId]
  );

  const response = rows[0].result;
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete recipe');
  }

  return response;
};

const toggleFavouriteHandler = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipe_id);
    const userId = Number(req.body.user_id ?? req.query.user_id);

    if (!recipeId || !userId) {
      return res.status(400).json({ success: false, message: 'recipe_id and user_id are required' });
    }

    const result = await toggleFavourite(userId, recipeId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listFavourites = async (req, res) => {
  try {
    const userId = Number(req.params.user_id ?? req.query.user_id);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const result = await getUserFavourites(userId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const upsertReviewHandler = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipe_id);
    const userId = Number(req.body.user_id);
    const rating = Number(req.body.rating);
    const reviewText = req.body.review_text ?? null;

    if (!recipeId || !userId || Number.isNaN(rating)) {
      return res.status(400).json({ success: false, message: 'recipe_id, user_id, and rating are required' });
    }

    const result = await upsertReview(userId, recipeId, rating, reviewText);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReviewHandler = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipe_id);
    const userId = Number(req.body.user_id ?? req.query.user_id);

    if (!recipeId || !userId) {
      return res.status(400).json({ success: false, message: 'recipe_id and user_id are required' });
    }

    const result = await deleteReview(userId, recipeId);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listRecipeReviewsHandler = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipe_id);
    if (!recipeId) {
      return res.status(400).json({ success: false, message: 'recipe_id is required' });
    }

    const result = await getRecipeReviews(recipeId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const startCookingSessionHandler = async (req, res) => {
  try {
    const recipeId = Number(req.params.recipe_id);
    const userId = Number(req.body.user_id ?? req.query.user_id);

    if (!recipeId || !userId) {
      return res.status(400).json({ success: false, message: 'recipe_id and user_id are required' });
    }

    const result = await startCookingSession(userId, recipeId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCookingStepHandler = async (req, res) => {
  try {
    const sessionId = Number(req.params.session_id);
    const userId = Number(req.body.user_id ?? req.query.user_id);
    const stepNumber = Number(req.body.step_number);

    if (!sessionId || !userId || !stepNumber) {
      return res.status(400).json({ success: false, message: 'session_id, user_id, and step_number are required' });
    }

    const result = await updateCookingStep(sessionId, userId, stepNumber);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const completeCookingSessionHandler = async (req, res) => {
  try {
    const sessionId = Number(req.params.session_id);
    const userId = Number(req.body.user_id ?? req.query.user_id);

    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, message: 'session_id and user_id are required' });
    }

    const result = await completeCookingSession(sessionId, userId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCookingSessionHandler = async (req, res) => {
  try {
    const sessionId = Number(req.params.session_id);
    const userId = Number(req.query.user_id);

    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, message: 'session_id param and user_id query are required' });
    }

    const result = await getCookingSession(sessionId, userId);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const recipes = await getAllRecipes(req.query);
    return res.status(200).json({ success: true, data: recipes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const recipe = await createRecipe(req.body);
    return res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const recipe = await updateRecipe(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: recipe });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    await deleteRecipe(
      Number(req.params.id),
      req.body.userId ?? req.body.authorId ?? req.query.userId
    );
    return res.status(200).json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// POST /api/nutrition/log  { user_id, recipe_id }
const logNutritionHandler = async (req, res) => {
  try {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) {
      return res.status(400).json({ success: false, message: 'user_id and recipe_id are required' });
    }
    const { rows } = await pool.query(
      'SELECT log_nutrition_entry($1, $2) AS result',
      [user_id, recipe_id]
    );
    const result = rows[0].result;
    if (!result.success) return res.status(400).json(result);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/nutrition/log/:user_id?date=YYYY-MM-DD
const getDailyNutritionLogHandler = async (req, res) => {
  try {
    const { user_id } = req.params;
    const date = req.query.date || null;
    const { rows } = await pool.query(
      'SELECT get_daily_nutrition_log($1, $2) AS result',
      [user_id, date]
    );
    const result = rows[0].result;
    if (!result.success) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  searchRecipesByPantry,
  browseRecipes,
  getRecipeDetails,
  getAllCuisines,
  getAllDietaryPreferences,
  searchByPantry,
  browse,
  getDetails,
  listCuisineOptions,
  listDietaryOptions,
  toggleFavourite,
  getUserFavourites,
  upsertReview,
  deleteReview,
  getRecipeReviews,
  startCookingSession,
  updateCookingStep,
  completeCookingSession,
  getCookingSession,
  getAll,
  create,
  update,
  remove,
  toggleFavouriteHandler,
  listFavourites,
  upsertReviewHandler,
  deleteReviewHandler,
  listRecipeReviewsHandler,
  startCookingSessionHandler,
  updateCookingStepHandler,
  completeCookingSessionHandler,
  getCookingSessionHandler,
  logNutritionHandler,
  getDailyNutritionLogHandler
};
