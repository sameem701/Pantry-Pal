require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool, closePool } = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION suggest_meals_for_dates(
          p_user_id   INTEGER,
          p_start     DATE,
          p_days      INTEGER DEFAULT 7
      )
      RETURNS JSON AS $$
      DECLARE v_result JSON;
      BEGIN
          IF p_days IS NULL OR p_days < 1 THEN p_days := 7; END IF;

          WITH already_planned AS (
              SELECT DISTINCT recipe_id
              FROM daily_meals
              WHERE user_id = p_user_id
                AND date BETWEEN p_start AND (p_start + 6)
          ),
          candidate_recipes AS (
              SELECT
                  r.recipe_id, r.title, r.difficulty, r.cooking_time_min, r.image_url,
                  rs.average_rating,
                  COUNT(ri.ingredient_id)                            AS total_ingredients,
                  COUNT(pi.ingredient_id)                            AS matched,
                  COUNT(ri.ingredient_id) - COUNT(pi.ingredient_id) AS missing,
                  COALESCE((
                      SELECT c.name FROM recipe_cuisines rc
                      JOIN cuisines c ON c.cuisine_id = rc.cuisine_id
                      WHERE rc.recipe_id = r.recipe_id ORDER BY c.name LIMIT 1
                  ), 'Uncategorized') AS primary_cuisine
              FROM recipes r
              JOIN recipe_stats rs       ON rs.recipe_id = r.recipe_id
              JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
              LEFT JOIN pantry_items pi  ON pi.ingredient_id = ri.ingredient_id AND pi.user_id = p_user_id
              WHERE r.status = 'published'
                AND r.recipe_id NOT IN (SELECT recipe_id FROM already_planned)
                AND NOT EXISTS (
                    SELECT 1 FROM recipe_ingredients ri2
                    JOIN preference_food_group pfg ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
                    JOIN user_preference up ON up.preference_id = pfg.preference_id AND up.user_id = p_user_id
                    WHERE ri2.recipe_id = r.recipe_id
                )
              GROUP BY r.recipe_id, r.title, r.difficulty, r.cooking_time_min, r.image_url, rs.average_rating
          ),
          globally_ranked AS (
              SELECT *,
                  ROW_NUMBER() OVER (
                      ORDER BY missing ASC, average_rating DESC,
                               md5(recipe_id::TEXT || p_start::TEXT),
                               recipe_id
                  ) AS global_rank
              FROM candidate_recipes
          ),
          opt1 AS (SELECT * FROM globally_ranked WHERE global_rank BETWEEN 1 AND 3),
          opt2 AS (SELECT * FROM globally_ranked WHERE global_rank BETWEEN 4 AND 6),
          opt3 AS (SELECT * FROM globally_ranked WHERE global_rank BETWEEN 7 AND 9),
          combined AS (
              SELECT 1 AS option_idx, recipe_id, title, difficulty, cooking_time_min, image_url,
                     average_rating, total_ingredients, matched, missing, primary_cuisine, global_rank AS option_rank,
                     CASE WHEN total_ingredients = 0 THEN 0
                          ELSE ROUND((matched::NUMERIC / total_ingredients) * 100, 1) END AS match_percent
              FROM opt1
              UNION ALL
              SELECT 2, recipe_id, title, difficulty, cooking_time_min, image_url,
                     average_rating, total_ingredients, matched, missing, primary_cuisine, global_rank - 3,
                     CASE WHEN total_ingredients = 0 THEN 0
                          ELSE ROUND((matched::NUMERIC / total_ingredients) * 100, 1) END
              FROM opt2
              UNION ALL
              SELECT 3, recipe_id, title, difficulty, cooking_time_min, image_url,
                     average_rating, total_ingredients, matched, missing, primary_cuisine, global_rank - 6,
                     CASE WHEN total_ingredients = 0 THEN 0
                          ELSE ROUND((matched::NUMERIC / total_ingredients) * 100, 1) END
              FROM opt3
          ),
          option_seed AS (SELECT generate_series(1, 3) AS option_idx),
          option_lists AS (
              SELECT os.option_idx,
                  COALESCE(json_agg(json_build_object(
                      'recipe_id', c.recipe_id, 'title', c.title, 'difficulty', c.difficulty,
                      'cooking_time_min', c.cooking_time_min, 'image_url', c.image_url,
                      'average_rating', c.average_rating, 'total_ingredients', c.total_ingredients,
                      'matched', c.matched, 'missing', c.missing,
                      'primary_cuisine', c.primary_cuisine, 'match_percent', c.match_percent
                  ) ORDER BY c.option_rank) FILTER (WHERE c.recipe_id IS NOT NULL), '[]'::JSON) AS meals
              FROM option_seed os LEFT JOIN combined c ON c.option_idx = os.option_idx
              GROUP BY os.option_idx
          )
          SELECT json_agg(json_build_object('option_number', option_idx, 'meals', meals) ORDER BY option_idx)
          INTO v_result FROM option_lists;

          RETURN json_build_object('success', true, 'mode', 'three_options',
              'days_requested', p_days, 'data', COALESCE(v_result, '[]'::JSON));
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ suggest_meals_for_dates updated: 3 distinct recipes per option, planned meals excluded');
  } finally {
    client.release();
    await closePool();
  }
})();
