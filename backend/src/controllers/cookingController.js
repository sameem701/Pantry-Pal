const { pool, query } = require('../db');

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

const getSession = async (id, userId) => {
  const sessionId = toNumber(id);
  const ownerId = toNumber(userId);

  if (sessionId === null || ownerId === null) {
    throw new Error('session id and userId are required');
  }

  const sessionResult = await query(
    `
      SELECT
        cs.session_id,
        cs.user_id,
        cs.recipe_id,
        cs.current_step,
        cs.is_completed,
        cs.started_at,
        r.title AS recipe_title,
        r.description,
        r.difficulty,
        r.cooking_time_min,
        r.image_url
      FROM cooking_sessions cs
      JOIN recipes r ON r.recipe_id = cs.recipe_id
      WHERE cs.session_id = $1 AND cs.user_id = $2
    `,
    [sessionId, ownerId]
  );

  if (sessionResult.rowCount === 0) {
    throw new Error('Session not found');
  }

  const stepsResult = await query(
    `
      SELECT COALESCE(json_agg(json_build_object(
        'step_number', step_number,
        'instruction_text', instruction_text
      ) ORDER BY step_number), '[]'::json) AS items
      FROM recipe_instructions
      WHERE recipe_id = $1
    `,
    [sessionResult.rows[0].recipe_id]
  );

  return {
    ...sessionResult.rows[0],
    steps: stepsResult.rows[0]?.items ?? [],
  };
};

const startSession = async (data) => {
  const userId = toNumber(data.userId ?? data.user_id);
  const recipeId = toNumber(data.recipeId ?? data.recipe_id);

  if (userId === null || recipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  const recipeExists = await query('SELECT 1 FROM recipes WHERE recipe_id = $1', [recipeId]);
  if (recipeExists.rowCount === 0) {
    throw new Error('Recipe not found');
  }

  const existing = await query(
    `
      SELECT session_id
      FROM cooking_sessions
      WHERE user_id = $1 AND recipe_id = $2 AND is_completed = FALSE
      LIMIT 1
    `,
    [userId, recipeId]
  );

  if (existing.rowCount > 0) {
    return getSession(existing.rows[0].session_id, userId);
  }

  const created = await query(
    `
      INSERT INTO cooking_sessions (user_id, recipe_id, current_step)
      VALUES ($1, $2, 1)
      RETURNING session_id
    `,
    [userId, recipeId]
  );

  return getSession(created.rows[0].session_id, userId);
};

const updateStep = async (id, currentStep, userId) => {
  const sessionId = toNumber(id);
  const ownerId = toNumber(userId);
  const stepNumber = toNumber(currentStep);

  if (sessionId === null || ownerId === null || stepNumber === null) {
    throw new Error('session id, userId, and currentStep are required');
  }

  const sessionLookup = await query(
    `SELECT recipe_id FROM cooking_sessions WHERE session_id = $1 AND user_id = $2 AND is_completed = FALSE`,
    [sessionId, ownerId]
  );

  if (sessionLookup.rowCount === 0) {
    throw new Error('Session not found or already completed');
  }

  const recipeId = sessionLookup.rows[0].recipe_id;
  const totalStepsResult = await query('SELECT COUNT(*)::int AS total_steps FROM recipe_instructions WHERE recipe_id = $1', [recipeId]);
  const totalSteps = totalStepsResult.rows[0]?.total_steps ?? 0;

  if (stepNumber < 1 || stepNumber > totalSteps) {
    throw new Error(`Step must be between 1 and ${totalSteps}`);
  }

  await query(
    `UPDATE cooking_sessions SET current_step = $3 WHERE session_id = $1 AND user_id = $2 AND is_completed = FALSE`,
    [sessionId, ownerId, stepNumber]
  );

  return getSession(sessionId, ownerId);
};

const completeSession = async (id, userId) => {
  const sessionId = toNumber(id);
  const ownerId = toNumber(userId);

  if (sessionId === null || ownerId === null) {
    throw new Error('session id and userId are required');
  }

  return withTransaction(async (client) => {
    const sessionResult = await client.query(
      `
        SELECT recipe_id
        FROM cooking_sessions
        WHERE session_id = $1 AND user_id = $2 AND is_completed = FALSE
      `,
      [sessionId, ownerId]
    );

    if (sessionResult.rowCount === 0) {
      throw new Error('Session not found or already completed');
    }

    const recipeId = sessionResult.rows[0].recipe_id;

    await client.query(
      `
        UPDATE cooking_sessions
        SET is_completed = TRUE
        WHERE session_id = $1 AND user_id = $2
      `,
      [sessionId, ownerId]
    );

    await client.query(
      `
        UPDATE pantry_items pi
        SET quantity = GREATEST(0, pi.quantity - ri.quantity)
        FROM recipe_ingredients ri
        WHERE pi.user_id = $1
          AND pi.ingredient_id = ri.ingredient_id
          AND ri.recipe_id = $2
      `,
      [ownerId, recipeId]
    );

    return getSession(sessionId, ownerId);
  });
};

module.exports = { startSession, getSession, updateStep, completeSession };