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

const searchRecipesByPantry = async (userId, { cuisineIds = null, difficulty = null, maxMissing = null } = {}, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const numericMaxMissing = maxMissing !== null && maxMissing !== undefined && Number.isFinite(Number(maxMissing))
        ? Number(maxMissing)
        : null;
    const query = `
        SELECT search_recipes_by_pantry($1, $2, $3, $4, $5, $6) AS result
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
        SELECT browse_recipes($1, $2, $3, $4, $5, $6, $7) AS result
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
  const userId = toNumber(filters.userId ?? filters.user_id ?? filters.viewerId);
  const searchTerm = filters.searchTerm ?? filters.search ?? filters.q ?? filters.query ?? null;
  const cuisineIds = toIntArray(filters.cuisineIds ?? filters.cuisine_ids ?? filters.cuisines);
  const difficulty = filters.difficulty ?? null;
  const creatorId = toNumber(filters.creatorId ?? filters.creator_id);
  const limit = toNumber(filters.limit ?? 20) ?? 20;
  const offset = toNumber(filters.offset ?? 0) ?? 0;
  const tag = filters.tag ?? filters.dietaryTag ?? filters.dietary_tag ?? null;

  const conditions = ["r.status = 'published'"];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (searchTerm) {
    const placeholder = addParam(searchTerm);
    conditions.push(`(r.title ILIKE '%' || ${placeholder} || '%' OR COALESCE(r.description, '') ILIKE '%' || ${placeholder} || '%')`);
  }

  if (difficulty) {
    const placeholder = addParam(difficulty);
    conditions.push(`r.difficulty = ${placeholder}`);
  }

  if (creatorId !== null) {
    const placeholder = addParam(creatorId);
    conditions.push(`r.user_id = ${placeholder}`);
  }

  if (cuisineIds.length > 0) {
    const placeholder = addParam(cuisineIds);
    conditions.push(`EXISTS (
      SELECT 1
      FROM recipe_cuisines rcu
      WHERE rcu.recipe_id = r.recipe_id
        AND rcu.cuisine_id = ANY(${placeholder}::int[])
    )`);
  }

  if (userId !== null) {
    const placeholder = addParam(userId);
    conditions.push(`NOT EXISTS (
      SELECT 1
      FROM recipe_ingredients ri2
      JOIN preference_food_group pfg
        ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
      JOIN user_preference up
        ON up.preference_id = pfg.preference_id AND up.user_id = ${placeholder}
      WHERE ri2.recipe_id = r.recipe_id
    )`);
  }

  if (tag !== null && tag !== undefined && tag !== '') {
    const placeholder = addParam(tag);
    conditions.push(`EXISTS (
      SELECT 1
      FROM recipe_dietary_tags rdt
      JOIN dietary_preferences dp ON dp.preference_id = rdt.preference_id
      WHERE rdt.recipe_id = r.recipe_id
        AND (
          dp.preference_name ILIKE '%' || ${placeholder} || '%'
          OR (
            ${placeholder} ~ '^[0-9]+$'
            AND dp.preference_id = ${placeholder}::int
          )
        )
    )`);
  }

  const limitPlaceholder = addParam(limit);
  const offsetPlaceholder = addParam(offset);

  const sql = `
    SELECT
      r.recipe_id,
      r.title,
      r.description,
      r.difficulty,
      r.cooking_time_min,
      r.image_url,
      r.user_id AS creator_id,
      COALESCE(rs.average_rating, 0) AS average_rating,
      COALESCE(rs.total_reviews, 0) AS total_reviews,
      COALESCE(rs.favourite_count, 0) AS favourite_count
    FROM recipes r
    LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rs.average_rating DESC NULLS LAST, rs.total_reviews DESC NULLS LAST, r.created_at DESC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  const { rows } = await query(sql, params);
  return rows;
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

  return withTransaction(async (client) => {
    const insertResult = await client.query(
      `
        INSERT INTO recipes (user_id, title, description, difficulty, cooking_time_min, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING recipe_id
      `,
      [
        payload.userId,
        payload.title,
        payload.description,
        payload.difficulty,
        payload.cookingTime,
        payload.imageUrl,
        payload.status,
      ]
    );

    const recipeId = insertResult.rows[0].recipe_id;

    for (const ingredient of payload.ingredients) {
      const ingredientId = toNumber(ingredient.ingredient_id ?? ingredient.ingredientId ?? ingredient.id);
      if (ingredientId === null) {
        throw new Error('ingredient_id is required for each ingredient');
      }

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
        [recipeId, ingredientId, ingredient.quantity, ingredient.unit ?? null]
      );
    }

    for (const step of payload.instructions) {
      await client.query(
        `INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES ($1, $2, $3)`,
        [recipeId, step.step_number ?? step.stepNumber, step.instruction_text ?? step.instructionText]
      );
    }

    for (const cuisineId of payload.cuisineIds) {
      await client.query(
        `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [recipeId, cuisineId]
      );
    }

    for (const tagId of payload.dietaryTagIds) {
      await client.query(
        `INSERT INTO recipe_dietary_tags (recipe_id, preference_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [recipeId, tagId]
      );
    }

    if (payload.nutrition) {
      await client.query(
        `
          INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (recipe_id) DO UPDATE SET
            calories = EXCLUDED.calories,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g
        `,
        [
          recipeId,
          payload.nutrition.calories ?? null,
          payload.nutrition.protein_g ?? null,
          payload.nutrition.carbs_g ?? null,
          payload.nutrition.fat_g ?? null,
        ]
      );
    }

    return getRecipeById(recipeId, payload.userId);
  });
};

const updateRecipe = async (id, data) => {
  const payload = normalizeRecipePayload(data);

  if (payload.userId === null) {
    throw new Error('userId is required');
  }

  const recipeId = toNumber(id);

  return withTransaction(async (client) => {
    const ownershipResult = await client.query('SELECT 1 FROM recipes WHERE recipe_id = $1 AND user_id = $2', [recipeId, payload.userId]);

    if (ownershipResult.rowCount === 0) {
      throw new Error('Recipe not found or access denied');
    }

    await client.query(
      `
        UPDATE recipes
        SET title = $1,
            description = $2,
            difficulty = $3,
            cooking_time_min = $4,
            image_url = $5,
            status = $6
        WHERE recipe_id = $7
      `,
      [
        payload.title,
        payload.description,
        payload.difficulty,
        payload.cookingTime,
        payload.imageUrl,
        payload.status,
        recipeId,
      ]
    );

    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    await client.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [recipeId]);
    await client.query('DELETE FROM recipe_cuisines WHERE recipe_id = $1', [recipeId]);
    await client.query('DELETE FROM recipe_dietary_tags WHERE recipe_id = $1', [recipeId]);

    for (const ingredient of payload.ingredients) {
      const ingredientId = toNumber(ingredient.ingredient_id ?? ingredient.ingredientId ?? ingredient.id);
      if (ingredientId === null) {
        throw new Error('ingredient_id is required for each ingredient');
      }

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
        [recipeId, ingredientId, ingredient.quantity, ingredient.unit ?? null]
      );
    }

    for (const step of payload.instructions) {
      await client.query(
        `INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES ($1, $2, $3)`,
        [recipeId, step.step_number ?? step.stepNumber, step.instruction_text ?? step.instructionText]
      );
    }

    for (const cuisineId of payload.cuisineIds) {
      await client.query(
        `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [recipeId, cuisineId]
      );
    }

    for (const tagId of payload.dietaryTagIds) {
      await client.query(
        `INSERT INTO recipe_dietary_tags (recipe_id, preference_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [recipeId, tagId]
      );
    }

    if (payload.nutrition) {
      await client.query(
        `
          INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (recipe_id) DO UPDATE SET
            calories = EXCLUDED.calories,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g
        `,
        [
          recipeId,
          payload.nutrition.calories ?? null,
          payload.nutrition.protein_g ?? null,
          payload.nutrition.carbs_g ?? null,
          payload.nutrition.fat_g ?? null,
        ]
      );
    } else {
      await client.query('DELETE FROM recipe_nutrition WHERE recipe_id = $1', [recipeId]);
    }

    return getRecipeById(recipeId, payload.userId);
  });
};

const deleteRecipe = async (id, userId) => {
  const ownerId = toNumber(userId);
  const recipeId = toNumber(id);

  if (ownerId === null) {
    throw new Error('userId is required');
  }

  const result = await query(
    'DELETE FROM recipes WHERE recipe_id = $1 AND user_id = $2 RETURNING recipe_id',
    [recipeId, ownerId]
  );

  if (result.rowCount === 0) {
    throw new Error('Recipe not found or access denied');
  }

  return { success: true, message: 'Recipe deleted' };
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
  listDietaryOptions
 };
