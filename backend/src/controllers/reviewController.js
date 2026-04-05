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

const getReviewsForRecipe = async (recipeId) => {
  const resolvedRecipeId = toNumber(recipeId);
  const result = await query(
    `
      SELECT
        r.user_id,
        u.email,
        r.rating,
        r.review_text,
        r.review_date
      FROM reviews r
      JOIN app_users u ON u.user_id = r.user_id
      WHERE r.recipe_id = $1
      ORDER BY r.review_date DESC
    `,
    [resolvedRecipeId]
  );

  return result.rows;
};

const createReview = async (data) => {
  const userId = toNumber(data.userId ?? data.user_id);
  const recipeId = toNumber(data.recipeId ?? data.recipe_id);
  const rating = data.rating;
  const reviewText = data.reviewText ?? data.review_text ?? data.comment ?? null;

  if (userId === null || recipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  return withTransaction(async (client) => {
    await client.query('INSERT INTO recipe_stats (recipe_id) VALUES ($1) ON CONFLICT DO NOTHING', [recipeId]);

    await client.query(
      `
        INSERT INTO reviews (user_id, recipe_id, rating, review_text)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, recipe_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          review_text = EXCLUDED.review_text,
          review_date = CURRENT_TIMESTAMP
      `,
      [userId, recipeId, rating, reviewText]
    );

    await client.query(
      `
        UPDATE recipe_stats
        SET average_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE recipe_id = $1), 0),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE recipe_id = $1)
        WHERE recipe_id = $1
      `,
      [recipeId]
    );

    return { success: true, message: 'Review submitted' };
  });
};

const updateReview = async (userId, recipeId, data = {}) => {
  const resolvedUserId = toNumber(userId ?? data.userId ?? data.user_id);
  const resolvedRecipeId = toNumber(recipeId ?? data.recipeId ?? data.recipe_id);
  const rating = data.rating;
  const reviewText = data.reviewText ?? data.review_text ?? data.comment ?? null;

  if (resolvedUserId === null || resolvedRecipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  return createReview({ userId: resolvedUserId, recipeId: resolvedRecipeId, rating, reviewText });
};

const deleteReview = async (userId, recipeId) => {
  const resolvedUserId = toNumber(userId);
  const resolvedRecipeId = toNumber(recipeId);

  if (resolvedUserId === null || resolvedRecipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  return withTransaction(async (client) => {
    const deleteResult = await client.query(
      'DELETE FROM reviews WHERE user_id = $1 AND recipe_id = $2 RETURNING user_id',
      [resolvedUserId, resolvedRecipeId]
    );

    if (deleteResult.rowCount === 0) {
      throw new Error('Review not found');
    }

    await client.query(
      `
        UPDATE recipe_stats
        SET average_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE recipe_id = $1), 0),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE recipe_id = $1)
        WHERE recipe_id = $1
      `,
      [resolvedRecipeId]
    );

    return { success: true, message: 'Review deleted' };
  });
};

module.exports = { getReviewsForRecipe, createReview, updateReview, deleteReview };