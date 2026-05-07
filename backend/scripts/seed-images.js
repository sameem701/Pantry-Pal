require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool, closePool } = require('../config/database');

const imageUpdates = [
  ['/uploads/recipe-spaghetti-carbonara.jpg',  1],
  ['/uploads/recipe-chicken-tikka-masala.jpg', 2],
  ['/uploads/recipe-avocado-toast.jpg',        3],
  ['/uploads/recipe-classic-beef-burger.jpg',  4],
  ['/uploads/recipe-thai-green-curry.jpg',     5],
  ['/uploads/recipe-greek-salad.jpg',          6],
  ['/uploads/recipe-beef-tacos.jpg',           7],
  ['/uploads/recipe-miso-ramen.jpg',           8],
  ['/uploads/recipe-lemon-herb-salmon.jpg',    9],
  ['/uploads/recipe-chocolate-lava-cake.jpg',  10],
];

const descriptionUpdates = [
  ['A timeless Roman classic featuring al dente spaghetti tossed in a rich, velvety sauce. The creamy texture is achieved authentically using only beaten eggs, Pecorino Romano cheese, and pasta water. Crispy pancetta adds a savory, salty crunch, finished with a generous dusting of freshly cracked black pepper.', 1],
  ['Tender, marinated chunks of chicken are fire-roasted to perfection before being simmered in a vibrant curry. The luscious tomato-based sauce is heavily spiced, creamy, and infused with earthy garam masala. A delicate swirl of fresh cream and a garnish of vibrant cilantro perfectly balance the mild, warming heat.', 2],
  ['A modern brunch staple built upon a thick, toasted slice of rustic artisan sourdough bread. Generously layered with freshly smashed, seasoned avocado mixed with a hint of citrus and chili flakes. Crowned with a perfectly poached egg that releases a rich, golden yolk, binding the fresh flavors together.', 3],
  ['A quintessential comfort food masterpiece featuring a thick, juicy, perfectly seared ground beef patty. Blanket-melted sharp cheddar cheese drapes over the hot beef, paired with crisp lettuce and ripe tomatoes. Tucked between a buttery, toasted brioche bun and layered with a savory, tangy house signature sauce.', 4],
  ['A fragrant, aromatic Southeast Asian delicacy boasting a vibrant, emerald-green coconut milk broth. Infused with a harmonious blend of spicy green chilies, lemongrass, galangal, and fresh Thai basil. Packed with tender chicken, crisp bamboo shoots, and green bell peppers for a satisfying, complex bite.', 5],
  ['A crisp, refreshing Mediterranean classic that celebrates the vibrant flavors of fresh, raw produce. Tossed with juicy cherry tomatoes, crunchy cucumbers, thinly sliced red onions, and briny Kalamata olives. Topped with a generous slab of tangy feta cheese and lightly dressed in premium extra virgin olive oil.', 6],
  ['A beloved Mexican street food favorite served in warm, lightly charred soft corn tortillas. Filled with savory, heavily seasoned ground beef infused with cumin, chili powder, and aromatic garlic. Brightened by a topping of fresh pico de gallo, crumbled cotija cheese, and a zesty squeeze of lime juice.', 7],
  ['A soul-warming bowl of Japanese comfort food anchored by a deeply savory, umami-rich fermented soybean broth. Filled with perfectly chewy, alkaline wheat noodles that beautifully hold the complex, hearty liquid. Topped with melt-in-your-mouth slices of chashu pork, a soft-boiled jammy egg, and crisp fresh scallions.', 8],
  ['An elegant, health-conscious dish highlighting a thick, flaky fillet of premium, fresh Atlantic salmon. Pan-seared to achieve a crispy, golden-brown skin while maintaining a tender, moist, and buttery interior. Bathed in a bright, fragrant pan sauce made from freshly squeezed lemon juice, garlic, and chopped dill.', 9],
  ['A decadent, show-stopping dessert featuring a delicate, spongy dark chocolate cake exterior. Breaking the surface reveals a hidden center of warm, glossy, molten chocolate that beautifully oozes onto the plate. The intense, rich cocoa flavor is perfectly offset by a light dusting of powdered sugar and fresh tart berries.', 10],
];

(async () => {
  const client = await pool.connect();
  try {
    // 1. Add description column if it doesn't exist
    await client.query(`
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    console.log('✓ description column ensured');

    // 2. Update the get_recipe_details function to return description
    await client.query(`
      CREATE OR REPLACE FUNCTION get_recipe_details(
          p_recipe_id INTEGER,
          p_user_id   INTEGER DEFAULT NULL
      )
      RETURNS JSON AS $$
      DECLARE
          v_recipe       RECORD;
          v_ingredients  JSON;
          v_steps        JSON;
          v_cuisines     JSON;
          v_dietary_tags JSON;
          v_nutrition    JSON;
          v_is_fav       BOOLEAN := FALSE;
      BEGIN
          SELECT r.*, rs.favourite_count, rs.average_rating, rs.total_reviews,
                 u.display_name AS creator_display_name
          INTO v_recipe
          FROM recipes r
          LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
          LEFT JOIN app_users u ON u.user_id = r.user_id
          WHERE r.recipe_id = p_recipe_id;

          IF NOT FOUND THEN
              RETURN json_build_object('success', false, 'message', 'Recipe not found');
          END IF;

          SELECT json_agg(json_build_object(
              'ingredient_id',   i.ingredient_id,
              'ingredient_name', i.ingredient_name,
              'category',        i.category,
              'required_qty',    ri.quantity,
              'unit',            ri.unit,
              'in_pantry',       (pi.ingredient_id IS NOT NULL),
              'pantry_qty',      pi.quantity,
              'pantry_unit',     pi.unit
          ) ORDER BY i.ingredient_name)
          INTO v_ingredients
          FROM recipe_ingredients ri
          JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
          LEFT JOIN pantry_items pi
              ON pi.ingredient_id = ri.ingredient_id AND pi.user_id = p_user_id
          WHERE ri.recipe_id = p_recipe_id;

          SELECT json_agg(json_build_object(
              'step_number',      step_number,
              'instruction_text', instruction_text
          ) ORDER BY step_number)
          INTO v_steps
          FROM recipe_instructions
          WHERE recipe_id = p_recipe_id;

          SELECT json_agg(json_build_object('cuisine_id', c.cuisine_id, 'name', c.name))
          INTO v_cuisines
          FROM recipe_cuisines rc
          JOIN cuisines c ON c.cuisine_id = rc.cuisine_id
          WHERE rc.recipe_id = p_recipe_id;

          SELECT json_agg(json_build_object(
              'preference_id',   dp.preference_id,
              'preference_name', dp.preference_name,
              'preference_type', dp.preference_type
          ))
          INTO v_dietary_tags
          FROM recipe_dietary_tags rdt
          JOIN dietary_preferences dp ON dp.preference_id = rdt.preference_id
          WHERE rdt.recipe_id = p_recipe_id;

          SELECT json_build_object(
              'calories',  calories,
              'protein_g', protein_g,
              'carbs_g',   carbs_g,
              'fat_g',     fat_g
          ) INTO v_nutrition
          FROM recipe_nutrition
          WHERE recipe_id = p_recipe_id;

          IF p_user_id IS NOT NULL THEN
              SELECT EXISTS (
                  SELECT 1 FROM favourites
                  WHERE user_id = p_user_id AND recipe_id = p_recipe_id
              ) INTO v_is_fav;
          END IF;

          RETURN json_build_object(
              'success',        true,
              'recipe_id',      v_recipe.recipe_id,
              'title',          v_recipe.title,
              'description',    v_recipe.description,
              'difficulty',     v_recipe.difficulty,
              'cooking_time',   v_recipe.cooking_time_min,
              'image_url',      v_recipe.image_url,
              'status',         v_recipe.status,
              'created_at',     v_recipe.created_at,
              'creator_id',             v_recipe.user_id,
              'creator_display_name',   v_recipe.creator_display_name,
              'stats', json_build_object(
                  'average_rating',  v_recipe.average_rating,
                  'total_reviews',   v_recipe.total_reviews,
                  'favourite_count', v_recipe.favourite_count
              ),
              'ingredients',    COALESCE(v_ingredients,  '[]'::JSON),
              'instructions',   COALESCE(v_steps,        '[]'::JSON),
              'cuisines',       COALESCE(v_cuisines,     '[]'::JSON),
              'dietary_tags',   COALESCE(v_dietary_tags, '[]'::JSON),
              'nutrition',      v_nutrition,
              'is_favourite',   v_is_fav
          );
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ get_recipe_details function updated');

    // 3. Populate descriptions
    for (const [desc, id] of descriptionUpdates) {
      await client.query('UPDATE recipes SET description = $1 WHERE recipe_id = $2', [desc, id]);
      console.log(`✓ recipe_id ${id} description set`);
    }

    // 4. Ensure image_url is set
    for (const [url, id] of imageUpdates) {
      await client.query('UPDATE recipes SET image_url = $1 WHERE recipe_id = $2', [url, id]);
    }
    console.log('✓ image_url values re-confirmed');

    const { rows } = await client.query('SELECT recipe_id, title, image_url, LEFT(description, 60) AS desc FROM recipes ORDER BY recipe_id');
    console.log('\nVerification:');
    rows.forEach(r => console.log(`  [${r.recipe_id}] ${r.title.padEnd(28)} img:${r.image_url ? 'yes' : 'NO '} | ${r.desc || 'NO DESCRIPTION'}`));
  } finally {
    client.release();
    await closePool();
  }
})();
