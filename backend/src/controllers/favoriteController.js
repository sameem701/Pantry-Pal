const { pool, query } = require('../db');

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getFavorites = async (userId) => {
  const resolvedUserId = toNumber(userId);
  const result = await query(
    `
      SELECT
        r.recipe_id,
        r.title,
        r.description,
        r.difficulty,
        r.cooking_time_min AS cooking_time,
        r.image_url,
        COALESCE(rs.average_rating, 0) AS average_rating,
        COALESCE(rs.total_reviews, 0) AS total_reviews,
        COALESCE(rs.favourite_count, 0) AS favourite_count
      FROM favourites f
      JOIN recipes r ON r.recipe_id = f.recipe_id
      LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
      WHERE f.user_id = $1
      ORDER BY r.title
    `,
    [resolvedUserId]
  );

  return result.rows;
};

const addFavorite = async (data) => {
  const userId = toNumber(data.userId ?? data.user_id);
  const recipeId = toNumber(data.recipeId ?? data.recipe_id);

  if (userId === null || recipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO recipe_stats (recipe_id) VALUES ($1) ON CONFLICT DO NOTHING', [recipeId]);

    const insertResult = await client.query(
      'INSERT INTO favourites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id, recipe_id',
      [userId, recipeId]
    );

    if (insertResult.rowCount > 0) {
      await client.query('UPDATE recipe_stats SET favourite_count = favourite_count + 1 WHERE recipe_id = $1', [recipeId]);
    }

    await client.query('COMMIT');

    return {
      success: true,
      added: insertResult.rowCount > 0,
      userId,
      recipeId,
      message: insertResult.rowCount > 0 ? 'Added to favorites' : 'Already in favorites',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const removeFavorite = async (userId, recipeId) => {
  const resolvedUserId = toNumber(userId);
  const resolvedRecipeId = toNumber(recipeId);

  if (resolvedUserId === null || resolvedRecipeId === null) {
    throw new Error('userId and recipeId are required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleteResult = await client.query(
      'DELETE FROM favourites WHERE user_id = $1 AND recipe_id = $2 RETURNING user_id, recipe_id',
      [resolvedUserId, resolvedRecipeId]
    );

    if (deleteResult.rowCount > 0) {
      await client.query(
        'UPDATE recipe_stats SET favourite_count = GREATEST(0, favourite_count - 1) WHERE recipe_id = $1',
        [resolvedRecipeId]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      removed: deleteResult.rowCount > 0,
      userId: resolvedUserId,
      recipeId: resolvedRecipeId,
      message: deleteResult.rowCount > 0 ? 'Removed from favorites' : 'Favorite not found',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };