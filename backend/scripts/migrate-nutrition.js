require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool, closePool } = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION get_nutrition_for_range(
          p_user_id INTEGER,
          p_start   DATE,
          p_end     DATE
      )
      RETURNS JSON AS $$
      DECLARE
          v_totals RECORD;
          v_daily  JSON;
      BEGIN
          SELECT json_agg(json_build_object(
              'date',      date,
              'calories',  total_calories,
              'protein_g', total_protein,
              'carbs_g',   total_carbs,
              'fat_g',     total_fat
          ) ORDER BY date)
          INTO v_daily
          FROM (
              SELECT date,
                  SUM(calories)  AS total_calories,
                  SUM(protein_g) AS total_protein,
                  SUM(carbs_g)   AS total_carbs,
                  SUM(fat_g)     AS total_fat
              FROM (
                  -- Meal-planner planned meals
                  SELECT dm.date,
                      rn.calories, rn.protein_g, rn.carbs_g, rn.fat_g
                  FROM daily_meals dm
                  JOIN recipe_nutrition rn ON rn.recipe_id = dm.recipe_id
                  WHERE dm.user_id = p_user_id AND dm.date BETWEEN p_start AND p_end
                  UNION ALL
                  -- Standalone cooking-session logs (not already in meal planner)
                  SELECT nl.log_date AS date,
                      nl.calories, nl.protein_g, nl.carbs_g, nl.fat_g
                  FROM nutrition_log nl
                  WHERE nl.user_id = p_user_id
                    AND nl.log_date BETWEEN p_start AND p_end
                    AND NOT EXISTS (
                        SELECT 1 FROM daily_meals dm2
                        WHERE dm2.user_id = p_user_id
                          AND dm2.recipe_id = nl.recipe_id
                          AND dm2.date = nl.log_date
                    )
              ) AS all_entries
              GROUP BY date
          ) AS daily_totals;

          SELECT
              COALESCE(SUM(calories), 0)  AS total_calories,
              COALESCE(SUM(protein_g), 0) AS total_protein,
              COALESCE(SUM(carbs_g), 0)   AS total_carbs,
              COALESCE(SUM(fat_g), 0)     AS total_fat
          INTO v_totals
          FROM (
              SELECT rn.calories, rn.protein_g, rn.carbs_g, rn.fat_g
              FROM daily_meals dm
              JOIN recipe_nutrition rn ON rn.recipe_id = dm.recipe_id
              WHERE dm.user_id = p_user_id AND dm.date BETWEEN p_start AND p_end
              UNION ALL
              SELECT nl.calories, nl.protein_g, nl.carbs_g, nl.fat_g
              FROM nutrition_log nl
              WHERE nl.user_id = p_user_id
                AND nl.log_date BETWEEN p_start AND p_end
                AND NOT EXISTS (
                    SELECT 1 FROM daily_meals dm2
                    WHERE dm2.user_id = p_user_id
                      AND dm2.recipe_id = nl.recipe_id
                      AND dm2.date = nl.log_date
                )
          ) AS all_totals;

          RETURN json_build_object('success', true,
              'totals', json_build_object(
                  'calories', v_totals.total_calories, 'protein_g', v_totals.total_protein,
                  'carbs_g', v_totals.total_carbs, 'fat_g', v_totals.total_fat),
              'daily_breakdown', COALESCE(v_daily, '[]'::JSON));
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ get_nutrition_for_range updated: now includes standalone cooking-session logs');
  } finally {
    client.release();
    await closePool();
  }
})();
