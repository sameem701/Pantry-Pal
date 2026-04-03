-- ============================================================
--  PANTRYPAL – COMPLETE LOGIC  (Functions & Procedures)
--  PostgreSQL / Supabase
--
--  CHANGES vs original:
--   §2.2  upsert_pantry_item  → new p_storage_location param + validation
--   §2.4  get_user_pantry     → returns storage_location, grouped by it
--   §3.1  create_recipe       → new p_status param;
--                               p_dietary_tag_ids now actually inserted;
--                               stats row seeded by trigger (removed manual insert)
--   §3.2  update_recipe       → new p_status param;
--                               dietary tags replaced on update
--   §3.4  get_recipe_details  → returns status and dietary_tags
--   §4.1  search_recipes_by_pantry  → filters published only
--   §4.2  browse_recipes      → filters published only; my_recipes flag
--   §5.1  toggle_favourite    → INSERT INTO recipe_stats guard (belt+suspenders)
--   §11.1 get_user_dashboard  → returns draft count separately
--
--  SECTIONS
--   1.  User Management         (1.1 – 1.11)
--   2.  Pantry Management       (2.1 – 2.5)
--   3.  Recipe Management       (3.1 – 3.4)
--   4.  Recipe Search           (4.1 – 4.2)
--   5.  Favourites & Reviews    (5.1 – 5.5)
--   6.  Interactive Cooking     (6.1 – 6.4)
--   7.  Meal Planning           (7.1 – 7.7)
--   8.  Shopping List           (8.1 – 8.3)
--   9.  Plan Templates          (9.1 – 9.3)
--   10. Nutrition               (10.1 – 10.2)
--   11. Dashboard               (11.1)
-- ============================================================


-- ============================================================
--  SECTION 1: USER MANAGEMENT
-- ============================================================

-- 1.1  Register step-1: store temp record + verification code
CREATE OR REPLACE FUNCTION register_user_temp(
    p_email             VARCHAR(255),
    p_password_hash     VARCHAR(255),
    p_verification_code VARCHAR(6)
)
RETURNS JSON AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_users WHERE email = p_email) THEN
        RETURN json_build_object('success', false, 'message', 'Email already registered');
    END IF;

    INSERT INTO temp_users (email, password_hash, verification_code, created_at)
    VALUES (p_email, p_password_hash, p_verification_code, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO UPDATE
        SET password_hash     = EXCLUDED.password_hash,
            verification_code = EXCLUDED.verification_code,
            created_at        = CURRENT_TIMESTAMP;

    RETURN json_build_object('success', true, 'message', 'Verification code sent');
END;
$$ LANGUAGE plpgsql;


-- 1.2  Verify email & promote temp record to real user
CREATE OR REPLACE FUNCTION verify_and_create_user(
    p_email VARCHAR(255),
    p_code  VARCHAR(6)
)
RETURNS JSON AS $$
DECLARE
    v_temp temp_users%ROWTYPE;
    v_uid  INTEGER;
BEGIN
    SELECT * INTO v_temp FROM temp_users WHERE email = p_email;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'message', 'No pending registration for this email');
    END IF;

    IF v_temp.created_at < NOW() - INTERVAL '15 minutes' THEN
        DELETE FROM temp_users WHERE email = p_email;
        RETURN json_build_object('success', false, 'message', 'Verification code expired');
    END IF;

    IF v_temp.verification_code <> p_code THEN
        RETURN json_build_object('success', false, 'message', 'Invalid verification code');
    END IF;

    INSERT INTO app_users (email, password_hash)
    VALUES (v_temp.email, v_temp.password_hash)
    RETURNING user_id INTO v_uid;

    DELETE FROM temp_users WHERE email = p_email;

    RETURN json_build_object(
        'success', true,
        'message', 'Account created successfully',
        'user_id', v_uid,
        'email',   p_email
    );
END;
$$ LANGUAGE plpgsql;


-- 1.3  Login
CREATE OR REPLACE FUNCTION login_user(
    p_email         VARCHAR(255),
    p_password_hash VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE v_user app_users%ROWTYPE;
BEGIN
    SELECT * INTO v_user
    FROM app_users
    WHERE email = p_email AND password_hash = p_password_hash;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid email or password');
    END IF;

    RETURN json_build_object(
        'success',     true,
        'message',     'Login successful',
        'user_id',     v_user.user_id,
        'email',       v_user.email,
        'skill_level', v_user.skill_level
    );
END;
$$ LANGUAGE plpgsql;


-- 1.4  Request password reset (stores 6-digit code on the user row)
CREATE OR REPLACE FUNCTION request_password_reset(
    p_email VARCHAR(255),
    p_code  VARCHAR(6)
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE email = p_email) THEN
        RETURN json_build_object('success', false, 'message', 'Email not found');
    END IF;

    UPDATE app_users SET reset_code = p_code WHERE email = p_email;

    RETURN json_build_object('success', true, 'message', 'Reset code sent');
END;
$$ LANGUAGE plpgsql;


-- 1.5  Reset password
CREATE OR REPLACE FUNCTION reset_password(
    p_email             VARCHAR(255),
    p_code              VARCHAR(6),
    p_new_password_hash VARCHAR(255)
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM app_users WHERE email = p_email AND reset_code = p_code
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired reset code');
    END IF;

    UPDATE app_users
    SET password_hash = p_new_password_hash,
        reset_code    = NULL
    WHERE email = p_email;

    RETURN json_build_object('success', true, 'message', 'Password reset successful');
END;
$$ LANGUAGE plpgsql;


-- 1.6  Get full user profile (with dietary preferences and cuisine preferences)
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_user     app_users%ROWTYPE;
    v_prefs    JSON;
    v_cuisines JSON;
BEGIN
    SELECT * INTO v_user FROM app_users WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    SELECT json_agg(json_build_object(
        'preference_id',   dp.preference_id,
        'preference_name', dp.preference_name,
        'preference_type', dp.preference_type
    )) INTO v_prefs
    FROM user_preference up
    JOIN dietary_preferences dp ON dp.preference_id = up.preference_id
    WHERE up.user_id = p_user_id;

    SELECT json_agg(json_build_object(
        'cuisine_id', c.cuisine_id,
        'name',       c.name
    )) INTO v_cuisines
    FROM user_cuisine_preference ucp
    JOIN cuisines c ON c.cuisine_id = ucp.cuisine_id
    WHERE ucp.user_id = p_user_id;

    RETURN json_build_object(
        'success',             true,
        'user_id',             v_user.user_id,
        'email',               v_user.email,
        'skill_level',         v_user.skill_level,
        'created_at',          v_user.created_at,
        'dietary_preferences', COALESCE(v_prefs,    '[]'::JSON),
        'preferred_cuisines',  COALESCE(v_cuisines, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- 1.7  Update user profile skill level
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id     INTEGER,
    p_skill_level VARCHAR(20)
)
RETURNS JSON AS $$
BEGIN
    IF p_skill_level NOT IN ('Beginner','Intermediate','Advanced') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid skill level');
    END IF;

    UPDATE app_users SET skill_level = p_skill_level WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Profile updated');
END;
$$ LANGUAGE plpgsql;


-- 1.8  Set dietary preferences (full replace)
CREATE OR REPLACE FUNCTION set_dietary_preferences(
    p_user_id        INTEGER,
    p_preference_ids INTEGER[]
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    DELETE FROM user_preference WHERE user_id = p_user_id;

    INSERT INTO user_preference (user_id, preference_id)
    SELECT p_user_id, unnest(p_preference_ids)
    ON CONFLICT DO NOTHING;

    RETURN json_build_object('success', true, 'message', 'Dietary preferences updated');
END;
$$ LANGUAGE plpgsql;


-- 1.9  Set cuisine preferences (full replace)
CREATE OR REPLACE FUNCTION set_cuisine_preferences(
    p_user_id     INTEGER,
    p_cuisine_ids INTEGER[]
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    DELETE FROM user_cuisine_preference WHERE user_id = p_user_id;

    INSERT INTO user_cuisine_preference (user_id, cuisine_id)
    SELECT p_user_id, unnest(p_cuisine_ids)
    ON CONFLICT DO NOTHING;

    RETURN json_build_object('success', true, 'message', 'Cuisine preferences updated');
END;
$$ LANGUAGE plpgsql;


-- 1.10  Get all dietary preferences (for UI dropdowns)
CREATE OR REPLACE FUNCTION get_all_dietary_preferences()
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'preference_id',   preference_id,
        'preference_name', preference_name,
        'preference_type', preference_type
    ) ORDER BY preference_type, preference_name)
    INTO v_result
    FROM dietary_preferences;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 1.11  Get all cuisines (for UI dropdowns)
CREATE OR REPLACE FUNCTION get_all_cuisines()
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object('cuisine_id', cuisine_id, 'name', name) ORDER BY name)
    INTO v_result
    FROM cuisines;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;






-- ============================================================
--  SECTION 2: PANTRY MANAGEMENT
-- ============================================================

-- 2.1  Search ingredients from master ingredient list
CREATE OR REPLACE FUNCTION search_ingredients(p_query VARCHAR(255))
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'ingredient_id',   ingredient_id,
        'ingredient_name', ingredient_name,
        'category',        category
    ) ORDER BY ingredient_name)
    INTO v_result
    FROM ingredients
    WHERE ingredient_name ILIKE '%' || p_query || '%';

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 2.2  Add / update a pantry item
--      FIX: new p_storage_location param (Fridge / Pantry / Freezer)
CREATE OR REPLACE FUNCTION insert_update_pantry_item(
    p_user_id          INTEGER,
    p_ingredient_id    INTEGER,
    p_quantity         DECIMAL(10,2),
    p_unit             VARCHAR(20),
    p_storage_location VARCHAR(10) DEFAULT 'Pantry'
)
RETURNS JSON AS $$
BEGIN
    IF p_storage_location NOT IN ('Fridge','Pantry','Freezer') THEN
        RETURN json_build_object('success', false,
            'message', 'Invalid storage location. Use Fridge, Pantry, or Freezer');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ingredients WHERE ingredient_id = p_ingredient_id) THEN
        RETURN json_build_object('success', false, 'message', 'Ingredient not found');
    END IF;

    INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, storage_location)
    VALUES (p_user_id, p_ingredient_id, p_quantity, p_unit, p_storage_location)
    ON CONFLICT (user_id, ingredient_id) DO UPDATE
        SET quantity         = EXCLUDED.quantity,
            unit             = EXCLUDED.unit,
            storage_location = EXCLUDED.storage_location;

    RETURN json_build_object('success', true, 'message', 'Pantry item saved');
END;
$$ LANGUAGE plpgsql;


-- 2.3  Remove a pantry item
CREATE OR REPLACE FUNCTION remove_pantry_item(
    p_user_id       INTEGER,
    p_ingredient_id INTEGER
)
RETURNS JSON AS $$
BEGIN
    DELETE FROM pantry_items
    WHERE user_id = p_user_id AND ingredient_id = p_ingredient_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Pantry item not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Pantry item removed');
END;
$$ LANGUAGE plpgsql;


-- 2.4  Get user pantry
--      FIX: returns storage_location; sorted by storage_location → category → name
CREATE OR REPLACE FUNCTION get_user_pantry(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'ingredient_id',   i.ingredient_id,
        'ingredient_name', i.ingredient_name,
        'category',        i.category,
        'quantity',        pi.quantity,
        'unit',            pi.unit,
        'storage_location', pi.storage_location
    ) ORDER BY pi.storage_location, i.category, i.ingredient_name)
    INTO v_result
    FROM pantry_items pi
    JOIN ingredients i ON i.ingredient_id = pi.ingredient_id
    WHERE pi.user_id = p_user_id;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 2.5  Deduct pantry quantities after cooking a recipe
--      Called internally by complete_cooking_session and mark_meal_cooked.
--      Also exposed as a standalone function for direct calls.
CREATE OR REPLACE FUNCTION deduct_pantry_after_cooking(
    p_user_id   INTEGER,
    p_recipe_id INTEGER
)
RETURNS JSON AS $$
DECLARE v_ing RECORD;
BEGIN
    FOR v_ing IN
        SELECT ingredient_id, quantity AS needed
        FROM recipe_ingredients
        WHERE recipe_id = p_recipe_id
    LOOP
        UPDATE pantry_items
        SET quantity = GREATEST(0, quantity - v_ing.needed)
        WHERE user_id = p_user_id AND ingredient_id = v_ing.ingredient_id;
    END LOOP;

    RETURN json_build_object('success', true, 'message', 'Pantry updated after cooking');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 3: RECIPE MANAGEMENT
-- ============================================================

-- 3.1  Create recipe
--      FIX: p_status added to INSERT
--      FIX: p_dietary_tag_ids now actually inserted into recipe_dietary_tags
--      FIX: manual stats INSERT removed (trigger handles it now)
--      FIX: quantity cast to DECIMAL instead of INTEGER
CREATE OR REPLACE FUNCTION create_recipe(
    p_user_id         INTEGER,
    p_title           VARCHAR(255),
    p_difficulty      VARCHAR(20)   DEFAULT 'Medium',
    p_cooking_time    INTEGER       DEFAULT 30,
    p_image_url       VARCHAR(500)  DEFAULT NULL,
    p_status          VARCHAR(10)   DEFAULT 'published',
    p_ingredients     JSON          DEFAULT '[]',
    -- [{"ingredient_id":1,"quantity":2.5,"unit":"cups"}, ...]
    p_instructions    JSON          DEFAULT '[]',
    -- [{"step_number":1,"instruction_text":"Do this..."}, ...]
    p_cuisine_ids     INTEGER[]     DEFAULT NULL,
    p_dietary_tag_ids INTEGER[]     DEFAULT NULL,
    p_nutrition       JSON          DEFAULT NULL
    -- {"calories":300,"protein_g":20,"carbs_g":30,"fat_g":10}
)
RETURNS JSON AS $$
DECLARE
    v_recipe_id INTEGER;
    v_ing       JSON;
    v_step      JSON;
    v_cid       INTEGER;
    v_tid       INTEGER;
BEGIN
    -- Validate enums
    IF p_difficulty NOT IN ('Easy','Medium','Hard') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid difficulty. Use Easy, Medium, or Hard');
    END IF;

    IF p_status NOT IN ('published','draft') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid status. Use published or draft');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Insert recipe (stats row auto-created by trigger)
    INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, image_url, status)
    VALUES (p_user_id, p_title, p_difficulty, p_cooking_time, p_image_url, p_status)
    RETURNING recipe_id INTO v_recipe_id;

    -- Ingredients
    FOR v_ing IN SELECT * FROM json_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
        VALUES (
            v_recipe_id,
            (v_ing->>'ingredient_id')::INTEGER,
            (v_ing->>'quantity')::DECIMAL,   -- FIX: was ::INTEGER
            v_ing->>'unit'
        );
    END LOOP;

    -- Instructions
    FOR v_step IN SELECT * FROM json_array_elements(p_instructions)
    LOOP
        INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text)
        VALUES (
            v_recipe_id,
            (v_step->>'step_number')::INTEGER,
            v_step->>'instruction_text'
        );
    END LOOP;

    -- Cuisine tags
    IF p_cuisine_ids IS NOT NULL THEN
        FOREACH v_cid IN ARRAY p_cuisine_ids LOOP
            INSERT INTO recipe_cuisines (recipe_id, cuisine_id)
            VALUES (v_recipe_id, v_cid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- FIX: Dietary tags (was declared but never inserted in original)
    IF p_dietary_tag_ids IS NOT NULL THEN
        FOREACH v_tid IN ARRAY p_dietary_tag_ids LOOP
            INSERT INTO recipe_dietary_tags (recipe_id, preference_id)
            VALUES (v_recipe_id, v_tid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Nutrition
    IF p_nutrition IS NOT NULL THEN
        INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
        VALUES (
            v_recipe_id,
            (p_nutrition->>'calories')::INTEGER,
            (p_nutrition->>'protein_g')::DECIMAL,
            (p_nutrition->>'carbs_g')::DECIMAL,
            (p_nutrition->>'fat_g')::DECIMAL
        );
    END IF;

    RETURN json_build_object(
        'success',   true,
        'message',   'Recipe created',
        'recipe_id', v_recipe_id
    );
END;
$$ LANGUAGE plpgsql;


-- 3.2  Update recipe (owner only)
--      FIX: p_status added; dietary tags replaced on update
CREATE OR REPLACE FUNCTION update_recipe(
    p_recipe_id       INTEGER,
    p_user_id         INTEGER,
    p_title           VARCHAR(255),
    p_difficulty      VARCHAR(20)  DEFAULT 'Medium',
    p_cooking_time    INTEGER      DEFAULT 30,
    p_image_url       VARCHAR(500) DEFAULT NULL,
    p_status          VARCHAR(10)  DEFAULT 'published',
    p_ingredients     JSON         DEFAULT '[]',
    p_instructions    JSON         DEFAULT '[]',
    p_cuisine_ids     INTEGER[]    DEFAULT NULL,
    p_dietary_tag_ids INTEGER[]    DEFAULT NULL,
    p_nutrition       JSON         DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_ing  JSON;
    v_step JSON;
    v_cid  INTEGER;
    v_tid  INTEGER;
BEGIN
    -- Ownership check
    IF NOT EXISTS (
        SELECT 1 FROM recipes WHERE recipe_id = p_recipe_id AND user_id = p_user_id
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found or access denied');
    END IF;

    IF p_difficulty NOT IN ('Easy','Medium','Hard') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid difficulty');
    END IF;

    IF p_status NOT IN ('published','draft') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid status');
    END IF;

    -- Update core fields
    UPDATE recipes
    SET title            = p_title,
        difficulty       = p_difficulty,
        cooking_time_min = p_cooking_time,
        image_url        = p_image_url,
        status           = p_status
    WHERE recipe_id = p_recipe_id;

    -- Replace ingredients
    DELETE FROM recipe_ingredients WHERE recipe_id = p_recipe_id;
    FOR v_ing IN SELECT * FROM json_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
        VALUES (
            p_recipe_id,
            (v_ing->>'ingredient_id')::INTEGER,
            (v_ing->>'quantity')::DECIMAL,   -- FIX: was ::INTEGER
            v_ing->>'unit'
        );
    END LOOP;

    -- Replace instructions
    DELETE FROM recipe_instructions WHERE recipe_id = p_recipe_id;
    FOR v_step IN SELECT * FROM json_array_elements(p_instructions)
    LOOP
        INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text)
        VALUES (
            p_recipe_id,
            (v_step->>'step_number')::INTEGER,
            v_step->>'instruction_text'
        );
    END LOOP;

    -- Replace cuisine tags
    DELETE FROM recipe_cuisines WHERE recipe_id = p_recipe_id;
    IF p_cuisine_ids IS NOT NULL THEN
        FOREACH v_cid IN ARRAY p_cuisine_ids LOOP
            INSERT INTO recipe_cuisines (recipe_id, cuisine_id)
            VALUES (p_recipe_id, v_cid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- FIX: Replace dietary tags
    DELETE FROM recipe_dietary_tags WHERE recipe_id = p_recipe_id;
    IF p_dietary_tag_ids IS NOT NULL THEN
        FOREACH v_tid IN ARRAY p_dietary_tag_ids LOOP
            INSERT INTO recipe_dietary_tags (recipe_id, preference_id)
            VALUES (p_recipe_id, v_tid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Upsert nutrition
    IF p_nutrition IS NOT NULL THEN
        INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
        VALUES (
            p_recipe_id,
            (p_nutrition->>'calories')::INTEGER,
            (p_nutrition->>'protein_g')::DECIMAL,
            (p_nutrition->>'carbs_g')::DECIMAL,
            (p_nutrition->>'fat_g')::DECIMAL
        )
        ON CONFLICT (recipe_id) DO UPDATE
            SET calories  = EXCLUDED.calories,
                protein_g = EXCLUDED.protein_g,
                carbs_g   = EXCLUDED.carbs_g,
                fat_g     = EXCLUDED.fat_g;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Recipe updated');
END;
$$ LANGUAGE plpgsql;


-- 3.3  Delete recipe (owner only)
CREATE OR REPLACE FUNCTION delete_recipe(p_recipe_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
BEGIN
    DELETE FROM recipes WHERE recipe_id = p_recipe_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found or access denied');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Recipe deleted');
END;
$$ LANGUAGE plpgsql;


-- 3.4  Get full recipe details
--      FIX: returns status and dietary_tags
--      p_user_id is optional – pass NULL when unauthenticated
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
    SELECT r.*, rs.favourite_count, rs.average_rating, rs.total_reviews
    INTO v_recipe
    FROM recipes r
    LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
    WHERE r.recipe_id = p_recipe_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found');
    END IF;

    -- Ingredients with pantry availability highlighted
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

    -- Step-by-step instructions
    SELECT json_agg(json_build_object(
        'step_number',      step_number,
        'instruction_text', instruction_text
    ) ORDER BY step_number)
    INTO v_steps
    FROM recipe_instructions
    WHERE recipe_id = p_recipe_id;

    -- Cuisine tags
    SELECT json_agg(json_build_object('cuisine_id', c.cuisine_id, 'name', c.name))
    INTO v_cuisines
    FROM recipe_cuisines rc
    JOIN cuisines c ON c.cuisine_id = rc.cuisine_id
    WHERE rc.recipe_id = p_recipe_id;

    -- FIX: Dietary tags (was missing from original get_recipe_details)
    SELECT json_agg(json_build_object(
        'preference_id',   dp.preference_id,
        'preference_name', dp.preference_name,
        'preference_type', dp.preference_type
    ))
    INTO v_dietary_tags
    FROM recipe_dietary_tags rdt
    JOIN dietary_preferences dp ON dp.preference_id = rdt.preference_id
    WHERE rdt.recipe_id = p_recipe_id;

    -- Nutrition
    SELECT json_build_object(
        'calories',  calories,
        'protein_g', protein_g,
        'carbs_g',   carbs_g,
        'fat_g',     fat_g
    ) INTO v_nutrition
    FROM recipe_nutrition
    WHERE recipe_id = p_recipe_id;

    -- Is favourite flag
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
        'difficulty',     v_recipe.difficulty,
        'cooking_time',   v_recipe.cooking_time_min,
        'image_url',      v_recipe.image_url,
        'status',         v_recipe.status,          -- FIX: added
        'created_at',     v_recipe.created_at,
        'creator_id',     v_recipe.user_id,
        'stats', json_build_object(
            'average_rating',  v_recipe.average_rating,
            'total_reviews',   v_recipe.total_reviews,
            'favourite_count', v_recipe.favourite_count
        ),
        'ingredients',    COALESCE(v_ingredients,  '[]'::JSON),
        'instructions',   COALESCE(v_steps,        '[]'::JSON),
        'cuisines',       COALESCE(v_cuisines,     '[]'::JSON),
        'dietary_tags',   COALESCE(v_dietary_tags, '[]'::JSON),  -- FIX: added
        'nutrition',      v_nutrition,
        'is_favourite',   v_is_fav
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
--  SECTION 4: RECIPE SEARCH & FILTERING
-- ============================================================

-- 4.1  Search recipes by pantry ingredients with filters
--      FIX: only searches 'published' recipes
--      FIX: cuisine filter uses INNER JOIN when filter is active to avoid
--           duplicate rows from LEFT JOIN + ANY() combination
CREATE OR REPLACE FUNCTION search_recipes_by_pantry(
    p_user_id     INTEGER,
    p_cuisine_ids INTEGER[]   DEFAULT NULL,
    p_difficulty  VARCHAR(20) DEFAULT NULL,
    p_max_missing INTEGER     DEFAULT NULL,
    p_limit       INTEGER     DEFAULT 20,
    p_offset      INTEGER     DEFAULT 0
)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO v_result FROM (
        SELECT
            r.recipe_id,
            r.title,
            r.difficulty,
            r.cooking_time_min,
            r.image_url,
            rs.average_rating,
            rs.total_reviews,
            COUNT(ri.ingredient_id)                              AS total_ingredients,
            COUNT(pi.ingredient_id)                              AS matched_ingredients,
            COUNT(ri.ingredient_id) - COUNT(pi.ingredient_id)   AS missing_ingredients
        FROM recipes r
        JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
        LEFT JOIN pantry_items pi
            ON pi.ingredient_id = ri.ingredient_id AND pi.user_id = p_user_id
        WHERE
            r.status = 'published'
            AND (p_difficulty IS NULL OR r.difficulty = p_difficulty)
            -- Cuisine filter: only keep recipe if it has at least one matching cuisine
            AND (
                p_cuisine_ids IS NULL
                OR EXISTS (
                    SELECT 1 FROM recipe_cuisines rcu
                    WHERE rcu.recipe_id = r.recipe_id
                      AND rcu.cuisine_id = ANY(p_cuisine_ids)
                )
            )
            -- Dietary restriction filter: exclude recipes with forbidden ingredients
            AND NOT EXISTS (
                SELECT 1
                FROM recipe_ingredients ri2
                JOIN preference_food_group pfg
                    ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
                JOIN user_preference up
                    ON up.preference_id = pfg.preference_id AND up.user_id = p_user_id
                WHERE ri2.recipe_id = r.recipe_id
            )
        GROUP BY r.recipe_id, r.title, r.difficulty,
                 r.cooking_time_min, r.image_url, rs.average_rating, rs.total_reviews
        HAVING
            p_max_missing IS NULL OR
            (COUNT(ri.ingredient_id) - COUNT(pi.ingredient_id)) <= p_max_missing
        ORDER BY missing_ingredients ASC, rs.average_rating DESC
        LIMIT p_limit OFFSET p_offset
    ) t;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 4.2  Browse / search all community recipes with filters
--      FIX: only returns 'published' recipes by default
--      FIX: cuisine filter uses EXISTS to avoid duplicate rows
CREATE OR REPLACE FUNCTION browse_recipes(
    p_user_id     INTEGER     DEFAULT NULL,
    p_search_term VARCHAR(255) DEFAULT NULL,
    p_cuisine_ids INTEGER[]   DEFAULT NULL,
    p_difficulty  VARCHAR(20) DEFAULT NULL,
    p_creator_id  INTEGER     DEFAULT NULL,
    p_limit       INTEGER     DEFAULT 20,
    p_offset      INTEGER     DEFAULT 0
)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO v_result FROM (
        SELECT
            r.recipe_id,
            r.title,
            r.difficulty,
            r.cooking_time_min,
            r.image_url,
            r.user_id       AS creator_id,
            rs.average_rating,
            rs.total_reviews,
            rs.favourite_count
        FROM recipes r
        JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
        WHERE
            r.status = 'published'
            AND (p_search_term IS NULL OR r.title ILIKE '%' || p_search_term || '%')
            AND (p_difficulty  IS NULL OR r.difficulty = p_difficulty)
            AND (p_creator_id  IS NULL OR r.user_id = p_creator_id)
            AND (
                p_cuisine_ids IS NULL
                OR EXISTS (
                    SELECT 1 FROM recipe_cuisines rcu
                    WHERE rcu.recipe_id = r.recipe_id
                      AND rcu.cuisine_id = ANY(p_cuisine_ids)
                )
            )
            -- Respect dietary restrictions when a user is provided
            AND (
                p_user_id IS NULL
                OR NOT EXISTS (
                    SELECT 1
                    FROM recipe_ingredients ri2
                    JOIN preference_food_group pfg
                        ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
                    JOIN user_preference up
                        ON up.preference_id = pfg.preference_id AND up.user_id = p_user_id
                    WHERE ri2.recipe_id = r.recipe_id
                )
            )
        ORDER BY rs.average_rating DESC, rs.total_reviews DESC
        LIMIT p_limit OFFSET p_offset
    ) t;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 5: FAVOURITES & REVIEWS
-- ============================================================

-- 5.1  Toggle favourite on/off
--      FIX: INSERT INTO recipe_stats guard added (belt-and-suspenders
--           in case trigger missed on older rows)
CREATE OR REPLACE FUNCTION toggle_favourite(p_user_id INTEGER, p_recipe_id INTEGER)
RETURNS JSON AS $$
DECLARE v_exists BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE recipe_id = p_recipe_id) THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found');
    END IF;

    -- Ensure stats row exists
    INSERT INTO recipe_stats (recipe_id) VALUES (p_recipe_id) ON CONFLICT DO NOTHING;

    SELECT EXISTS (
        SELECT 1 FROM favourites WHERE user_id = p_user_id AND recipe_id = p_recipe_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM favourites WHERE user_id = p_user_id AND recipe_id = p_recipe_id;
        UPDATE recipe_stats
        SET favourite_count = GREATEST(0, favourite_count - 1)
        WHERE recipe_id = p_recipe_id;
        RETURN json_build_object('success', true, 'favourited', false,
            'message', 'Removed from favourites');
    ELSE
        INSERT INTO favourites (user_id, recipe_id) VALUES (p_user_id, p_recipe_id);
        UPDATE recipe_stats
        SET favourite_count = favourite_count + 1
        WHERE recipe_id = p_recipe_id;
        RETURN json_build_object('success', true, 'favourited', true,
            'message', 'Added to favourites');
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 5.2  Get all favourites for a user
CREATE OR REPLACE FUNCTION get_user_favourites(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'recipe_id',      r.recipe_id,
        'title',          r.title,
        'difficulty',     r.difficulty,
        'cooking_time',   r.cooking_time_min,
        'image_url',      r.image_url,
        'average_rating', rs.average_rating
    ) ORDER BY r.title)
    INTO v_result
    FROM favourites f
    JOIN recipes r ON r.recipe_id = f.recipe_id
    LEFT JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
    WHERE f.user_id = p_user_id;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 5.3  Submit or update a review (upsert)
CREATE OR REPLACE FUNCTION upsert_review(
    p_user_id     INTEGER,
    p_recipe_id   INTEGER,
    p_rating      NUMERIC,
    p_review_text VARCHAR(255)
)
RETURNS JSON AS $$
BEGIN
    IF p_rating < 0 OR p_rating > 5 THEN
        RETURN json_build_object('success', false, 'message', 'Rating must be between 0 and 5');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM recipes WHERE recipe_id = p_recipe_id) THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found');
    END IF;

    INSERT INTO reviews (user_id, recipe_id, rating, review_text, review_date)
    VALUES (p_user_id, p_recipe_id, p_rating, p_review_text, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, recipe_id) DO UPDATE
        SET rating      = EXCLUDED.rating,
            review_text = EXCLUDED.review_text,
            review_date = CURRENT_TIMESTAMP;

    -- Recalculate stats atomically
    UPDATE recipe_stats
    SET average_rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE recipe_id = p_recipe_id),
        total_reviews  = (SELECT COUNT(*)              FROM reviews WHERE recipe_id = p_recipe_id)
    WHERE recipe_id = p_recipe_id;

    RETURN json_build_object('success', true, 'message', 'Review submitted');
END;
$$ LANGUAGE plpgsql;


-- 5.4  Delete own review
CREATE OR REPLACE FUNCTION delete_review(p_user_id INTEGER, p_recipe_id INTEGER)
RETURNS JSON AS $$
BEGIN
    DELETE FROM reviews WHERE user_id = p_user_id AND recipe_id = p_recipe_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Review not found');
    END IF;

    -- Recalculate stats
    UPDATE recipe_stats
    SET average_rating = COALESCE(
            (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE recipe_id = p_recipe_id), 0),
        total_reviews  = (SELECT COUNT(*) FROM reviews WHERE recipe_id = p_recipe_id)
    WHERE recipe_id = p_recipe_id;

    RETURN json_build_object('success', true, 'message', 'Review deleted');
END;
$$ LANGUAGE plpgsql;


-- 5.5  Get all reviews for a recipe
CREATE OR REPLACE FUNCTION get_recipe_reviews(p_recipe_id INTEGER)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'user_id',     r.user_id,
        'email',       u.email,
        'rating',      r.rating,
        'review_text', r.review_text,
        'review_date', r.review_date
    ) ORDER BY r.review_date DESC)
    INTO v_result
    FROM reviews r
    JOIN app_users u ON u.user_id = r.user_id
    WHERE r.recipe_id = p_recipe_id;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;










-- ============================================================
--  SECTION 6: INTERACTIVE COOKING MODE
-- ============================================================

-- 6.1  Start (or resume) a cooking session
CREATE OR REPLACE FUNCTION start_cooking_session(p_user_id INTEGER, p_recipe_id INTEGER)
RETURNS JSON AS $$
DECLARE v_session_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE recipe_id = p_recipe_id) THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found');
    END IF;

    -- Resume existing incomplete session if one exists
    SELECT session_id INTO v_session_id
    FROM cooking_sessions
    WHERE user_id = p_user_id AND recipe_id = p_recipe_id AND is_completed = FALSE
    LIMIT 1;

    IF FOUND THEN
        RETURN json_build_object(
            'success',    true,
            'session_id', v_session_id,
            'message',    'Resuming existing session'
        );
    END IF;

    INSERT INTO cooking_sessions (user_id, recipe_id, current_step)
    VALUES (p_user_id, p_recipe_id, 1)
    RETURNING session_id INTO v_session_id;

    RETURN json_build_object(
        'success',    true,
        'session_id', v_session_id,
        'message',    'Cooking session started'
    );
END;
$$ LANGUAGE plpgsql;


-- 6.2  Navigate to a specific step
CREATE OR REPLACE FUNCTION update_cooking_step(
    p_session_id  INTEGER,
    p_user_id     INTEGER,
    p_step_number INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_recipe_id   INTEGER;
    v_total_steps INTEGER;
BEGIN
    SELECT recipe_id INTO v_recipe_id
    FROM cooking_sessions
    WHERE session_id = p_session_id AND user_id = p_user_id AND is_completed = FALSE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found or already completed');
    END IF;

    SELECT COUNT(*) INTO v_total_steps
    FROM recipe_instructions
    WHERE recipe_id = v_recipe_id;

    IF p_step_number < 1 OR p_step_number > v_total_steps THEN
        RETURN json_build_object('success', false,
            'message', format('Step must be between 1 and %s', v_total_steps));
    END IF;

    UPDATE cooking_sessions
    SET current_step = p_step_number
    WHERE session_id = p_session_id AND user_id = p_user_id;

    RETURN json_build_object(
        'success',      true,
        'current_step', p_step_number,
        'total_steps',  v_total_steps
    );
END;
$$ LANGUAGE plpgsql;


-- 6.3  Mark cooking session as complete and deduct pantry
CREATE OR REPLACE FUNCTION complete_cooking_session(
    p_session_id INTEGER,
    p_user_id    INTEGER
)
RETURNS JSON AS $$
DECLARE v_recipe_id INTEGER;
BEGIN
    SELECT recipe_id INTO v_recipe_id
    FROM cooking_sessions
    WHERE session_id = p_session_id AND user_id = p_user_id AND is_completed = FALSE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'message', 'Session not found or already completed');
    END IF;

    UPDATE cooking_sessions
    SET is_completed = TRUE
    WHERE session_id = p_session_id;

    PERFORM deduct_pantry_after_cooking(p_user_id, v_recipe_id);

    RETURN json_build_object('success', true, 'message', 'Cooking completed! Pantry updated.');
END;
$$ LANGUAGE plpgsql;


-- 6.4  Get full cooking session state (with all steps)
CREATE OR REPLACE FUNCTION get_cooking_session(p_session_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_session RECORD;
    v_steps   JSON;
BEGIN
    SELECT cs.*, r.title AS recipe_title
    INTO v_session
    FROM cooking_sessions cs
    JOIN recipes r ON r.recipe_id = cs.recipe_id
    WHERE cs.session_id = p_session_id AND cs.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;

    SELECT json_agg(json_build_object(
        'step_number',      step_number,
        'instruction_text', instruction_text
    ) ORDER BY step_number)
    INTO v_steps
    FROM recipe_instructions
    WHERE recipe_id = v_session.recipe_id;

    RETURN json_build_object(
        'success',      true,
        'session_id',   v_session.session_id,
        'recipe_id',    v_session.recipe_id,
        'recipe_title', v_session.recipe_title,
        'current_step', v_session.current_step,
        'total_steps',  json_array_length(COALESCE(v_steps, '[]'::JSON)),
        'is_completed', v_session.is_completed,
        'started_at',   v_session.started_at,
        'steps',        COALESCE(v_steps, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 7: MEAL PLANNING
-- ============================================================

-- 7.1  Get existing plan for week or create a new one
CREATE OR REPLACE FUNCTION get_or_create_meal_plan(
    p_user_id    INTEGER,
    p_week_start DATE,
    p_name       VARCHAR(100) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE v_plan_id INTEGER;
BEGIN
    SELECT plan_id INTO v_plan_id
    FROM meal_plans
    WHERE user_id = p_user_id AND week_start = p_week_start;

    IF NOT FOUND THEN
        INSERT INTO meal_plans (user_id, week_start, week_end, name)
        VALUES (
            p_user_id, 
            p_week_start, 
            (p_week_start + INTERVAL '6 days')::DATE,  -- Explicit cast
            p_name
        )
        RETURNING plan_id INTO v_plan_id;
    END IF;

    RETURN json_build_object('success', true, 'plan_id', v_plan_id);
END;
$$ LANGUAGE plpgsql;

-- 7.2  Add (or swap) a recipe into a meal slot
CREATE OR REPLACE FUNCTION add_meal_to_plan(
    p_plan_id     INTEGER,
    p_recipe_id   INTEGER,
    p_day_of_week VARCHAR(10),
    p_meal_type   VARCHAR(10)
)
RETURNS JSON AS $$
BEGIN
    IF p_day_of_week NOT IN ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid day of week');
    END IF;

    IF p_meal_type NOT IN ('breakfast','lunch','dinner') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid meal type');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id) THEN
        RETURN json_build_object('success', false, 'message', 'Meal plan not found');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM recipes WHERE recipe_id = p_recipe_id AND status = 'published') THEN
        RETURN json_build_object('success', false, 'message', 'Recipe not found');
    END IF;

    INSERT INTO meal_plan_recipes (plan_id, recipe_id, day_of_week, meal_type)
    VALUES (p_plan_id, p_recipe_id, p_day_of_week, p_meal_type)
    ON CONFLICT (plan_id, day_of_week, meal_type) DO UPDATE
        SET recipe_id = EXCLUDED.recipe_id,
            is_cooked = FALSE;

    RETURN json_build_object('success', true, 'message', 'Meal added to plan');
END;
$$ LANGUAGE plpgsql;


-- 7.3  Remove a meal from a specific slot
CREATE OR REPLACE FUNCTION remove_meal_from_plan(
    p_plan_id     INTEGER,
    p_day_of_week VARCHAR(10),
    p_meal_type   VARCHAR(10)
)
RETURNS JSON AS $$
BEGIN
    DELETE FROM meal_plan_recipes
    WHERE plan_id = p_plan_id
      AND day_of_week = p_day_of_week
      AND meal_type   = p_meal_type;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Meal slot not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Meal removed');
END;
$$ LANGUAGE plpgsql;


-- 7.4  Clear all meals from a plan (ownership checked)
CREATE OR REPLACE FUNCTION clear_meal_plan(p_plan_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    DELETE FROM meal_plan_recipes WHERE plan_id = p_plan_id;

    RETURN json_build_object('success', true, 'message', 'Meal plan cleared');
END;
$$ LANGUAGE plpgsql;


-- 7.5  Get full weekly meal plan (ordered Sun→Sat, breakfast→dinner)
CREATE OR REPLACE FUNCTION get_meal_plan(p_plan_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_plan  RECORD;
    v_meals JSON;
BEGIN
    SELECT * INTO v_plan
    FROM meal_plans
    WHERE plan_id = p_plan_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    SELECT json_agg(json_build_object(
        'day_of_week',  mpr.day_of_week,
        'meal_type',    mpr.meal_type,
        'is_cooked',    mpr.is_cooked,
        'recipe_id',    r.recipe_id,
        'title',        r.title,
        'difficulty',   r.difficulty,
        'cooking_time', r.cooking_time_min,
        'image_url',    r.image_url
    ) ORDER BY
        CASE mpr.day_of_week
            WHEN 'Sunday'    THEN 0 WHEN 'Monday'   THEN 1 WHEN 'Tuesday'  THEN 2
            WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday'   THEN 5
            WHEN 'Saturday'  THEN 6
        END,
        CASE mpr.meal_type
            WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2
        END
    )
    INTO v_meals
    FROM meal_plan_recipes mpr
    JOIN recipes r ON r.recipe_id = mpr.recipe_id
    WHERE mpr.plan_id = p_plan_id;

    RETURN json_build_object(
        'success',    true,
        'plan_id',    v_plan.plan_id,
        'week_start', v_plan.week_start,
        'week_end',   v_plan.week_end,
        'name',       v_plan.name,
        'meals',      COALESCE(v_meals, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- 7.6  Mark a planned meal as cooked (deducts pantry)
CREATE OR REPLACE FUNCTION mark_meal_cooked(
    p_plan_id     INTEGER,
    p_user_id     INTEGER,
    p_day_of_week VARCHAR(10),
    p_meal_type   VARCHAR(10)
)
RETURNS JSON AS $$
DECLARE v_recipe_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    UPDATE meal_plan_recipes
    SET is_cooked = TRUE
    WHERE plan_id     = p_plan_id
      AND day_of_week = p_day_of_week
      AND meal_type   = p_meal_type
      AND is_cooked   = FALSE          -- idempotent guard
    RETURNING recipe_id INTO v_recipe_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false,
            'message', 'Meal slot not found or already marked as cooked');
    END IF;

    PERFORM deduct_pantry_after_cooking(p_user_id, v_recipe_id);

    RETURN json_build_object('success', true, 'message', 'Meal marked as cooked, pantry updated');
END;
$$ LANGUAGE plpgsql;


-- 7.7  Smart meal suggestions for the week
--      Returns ONE weekly option (up to 7 recipes by default):
--        - published recipes only
--        - excludes recipes already in the selected plan
--        - respects dietary restrictions
--        - avoids cuisine repetition by capping picks per cuisine
CREATE OR REPLACE FUNCTION suggest_meals_for_week(
    p_user_id     INTEGER,
    p_plan_id     INTEGER,
    p_days        INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    IF p_days IS NULL OR p_days < 1 THEN
        p_days := 7;
    END IF;

    WITH candidate_recipes AS (
        SELECT
            r.recipe_id,
            r.title,
            r.difficulty,
            r.cooking_time_min,
            r.image_url,
            rs.average_rating,
            COUNT(ri.ingredient_id)                              AS total_ingredients,
            COUNT(pi.ingredient_id)                              AS matched,
            COUNT(ri.ingredient_id) - COUNT(pi.ingredient_id)   AS missing,
            COALESCE(
                (
                    SELECT c.name
                    FROM recipe_cuisines rc
                    JOIN cuisines c ON c.cuisine_id = rc.cuisine_id
                    WHERE rc.recipe_id = r.recipe_id
                    ORDER BY c.name
                    LIMIT 1
                ),
                'Uncategorized'
            ) AS primary_cuisine
        FROM recipes r
        JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
        LEFT JOIN pantry_items pi
            ON pi.ingredient_id = ri.ingredient_id AND pi.user_id = p_user_id
        WHERE
            r.status = 'published'
            -- Not already planned this week
            r.recipe_id NOT IN (
                SELECT recipe_id FROM meal_plan_recipes WHERE plan_id = p_plan_id
            )
            -- Respect dietary restrictions
            AND NOT EXISTS (
                SELECT 1
                FROM recipe_ingredients ri2
                JOIN preference_food_group pfg
                    ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
                JOIN user_preference up
                    ON up.preference_id = pfg.preference_id AND up.user_id = p_user_id
                WHERE ri2.recipe_id = r.recipe_id
            )
        GROUP BY r.recipe_id, r.title, r.difficulty,
                 r.cooking_time_min, r.image_url, rs.average_rating
    ),
    ranked AS (
        SELECT
            cr.*,
            ROW_NUMBER() OVER (
                PARTITION BY cr.primary_cuisine
                ORDER BY cr.missing ASC, cr.average_rating DESC, cr.recipe_id
            ) AS cuisine_rank
        FROM candidate_recipes cr
    ),
    final_pick AS (
        SELECT
            recipe_id,
            title,
            difficulty,
            cooking_time_min,
            image_url,
            average_rating,
            total_ingredients,
            matched,
            missing,
            primary_cuisine,
            CASE
                WHEN total_ingredients = 0 THEN 0
                ELSE ROUND((matched::NUMERIC / total_ingredients) * 100, 1)
            END AS match_percent
        FROM ranked
        WHERE cuisine_rank <= 2
        ORDER BY 
            missing ASC,
            average_rating DESC
        LIMIT p_days
    )
    SELECT json_agg(row_to_json(final_pick)) INTO v_result
    FROM final_pick;

    RETURN json_build_object(
        'success', true,
        'mode', 'single_week_option',
        'days_requested', p_days,
        'data', COALESCE(v_result, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 8: SHOPPING LIST
-- ============================================================

-- 8.1  Get raw ingredient breakdown for AI normalization
--      No unit aggregation is performed here.
--      Example output for one ingredient:
--      "340 grams + 1 cup + 2 pieces + 100 grams"
CREATE OR REPLACE FUNCTION get_missing_ingredients(
    p_plan_id INTEGER,
    p_user_id INTEGER
)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'ingredient_name', ingredient_name,
        'category', category,
        'raw_breakdown', raw_breakdown,
        'pantry_quantity', pantry_quantity,
        'pantry_unit', pantry_unit,
        'pantry_display', pantry_display,
        'occurrences', occurrences
    ))
    INTO v_result
    FROM (
        SELECT 
            i.ingredient_name,
            i.category,
            STRING_AGG(
                TRIM(to_char(ri.quantity, 'FM999999990.##')) || ' ' || COALESCE(NULLIF(ri.unit, ''), 'unit'),
                ' + '
                ORDER BY ri.recipe_id, ri.ingredient_id
            ) AS raw_breakdown,
            COALESCE(MAX(pi.quantity), 0) AS pantry_quantity,
            COALESCE(MAX(pi.unit), '') AS pantry_unit,
            CASE
                WHEN COALESCE(MAX(pi.quantity), 0) = 0 THEN '0'
                WHEN COALESCE(MAX(pi.unit), '') = '' THEN TRIM(to_char(COALESCE(MAX(pi.quantity), 0), 'FM999999990.##'))
                ELSE TRIM(to_char(COALESCE(MAX(pi.quantity), 0), 'FM999999990.##')) || ' ' || MAX(pi.unit)
            END AS pantry_display,
            COUNT(*) AS occurrences
            
        FROM meal_plan_recipes mpr
        JOIN recipe_ingredients ri ON ri.recipe_id = mpr.recipe_id
        JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
        LEFT JOIN pantry_items pi 
            ON pi.ingredient_id = i.ingredient_id AND pi.user_id = p_user_id
        WHERE mpr.plan_id = p_plan_id AND mpr.is_cooked = FALSE
        GROUP BY i.ingredient_id, i.ingredient_name, i.category
        ORDER BY i.category, i.ingredient_name
    ) missing_items;

    RETURN json_build_object(
        'success', true, 
        'data', COALESCE(v_result, '[]'::JSON),
        'message', 'Raw ingredient breakdown generated for AI normalization'
    );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION save_ai_shopping_list(
    p_plan_id INTEGER,
    p_user_id INTEGER,
    p_items JSON  -- AI-processed items
)
RETURNS JSON AS $$
DECLARE
    v_list_id INTEGER;
    v_item RECORD;
BEGIN
    -- Verify plan ownership
    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    -- Delete old shopping list for this plan
    DELETE FROM shopping_lists WHERE plan_id = p_plan_id;

    -- Create new shopping list
    INSERT INTO shopping_lists (plan_id)
    VALUES (p_plan_id)
    RETURNING list_id INTO v_list_id;

    -- Insert AI-processed items
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO shopping_list_items (
            list_id, 
            ingredient_name, 
            quantity, 
            category, 
            is_checked
        ) VALUES (
            v_list_id,
            v_item->>'name',
            v_item->>'quantity',
            v_item->>'category',
            FALSE
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'list_id', v_list_id,
        'message', 'Shopping list saved successfully'
    );
END;
$$ LANGUAGE plpgsql;


-- 8.3  Toggle a shopping list item checked / unchecked
CREATE OR REPLACE FUNCTION toggle_shopping_item(
    p_list_id         INTEGER,
    p_ingredient_name VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE v_now BOOLEAN;
BEGIN
    UPDATE shopping_list_items
    SET is_checked = NOT is_checked
    WHERE list_id = p_list_id AND ingredient_name = p_ingredient_name
    RETURNING is_checked INTO v_now;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Item not found');
    END IF;

    RETURN json_build_object('success', true, 'is_checked', v_now, 'message', 'Item toggled');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 9: PLAN TEMPLATES
-- ============================================================

-- 9.1  Save current week plan as a reusable template
CREATE OR REPLACE FUNCTION save_plan_as_template(
    p_user_id INTEGER,
    p_plan_id INTEGER,
    p_name    VARCHAR(100)
)
RETURNS JSON AS $$
DECLARE
    v_meal_data JSON;
    v_tmpl_id   INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    SELECT json_agg(json_build_object(
        'day_of_week', day_of_week,
        'meal_type',   meal_type,
        'recipe_id',   recipe_id
    ))
    INTO v_meal_data
    FROM meal_plan_recipes
    WHERE plan_id = p_plan_id;

    IF v_meal_data IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Plan has no meals to save');
    END IF;

    INSERT INTO saved_plan_templates (user_id, name, meal_data)
    VALUES (p_user_id, p_name, v_meal_data)
    RETURNING template_id INTO v_tmpl_id;

    RETURN json_build_object(
        'success',     true,
        'template_id', v_tmpl_id,
        'message',     'Template saved'
    );
END;
$$ LANGUAGE plpgsql;


-- 9.2  Load a template into a meal plan (replaces existing meals)
CREATE OR REPLACE FUNCTION load_template_into_plan(
    p_template_id INTEGER,
    p_user_id     INTEGER,
    p_plan_id     INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_meal_data JSON;
    v_slot      JSON;
BEGIN
    SELECT meal_data INTO v_meal_data
    FROM saved_plan_templates
    WHERE template_id = p_template_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Template not found');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Target plan not found');
    END IF;

    -- Replace all slots in the target plan with the template's slots
    DELETE FROM meal_plan_recipes WHERE plan_id = p_plan_id;

    FOR v_slot IN SELECT * FROM json_array_elements(v_meal_data)
    LOOP
        INSERT INTO meal_plan_recipes (plan_id, recipe_id, day_of_week, meal_type)
        VALUES (
            p_plan_id,
            (v_slot->>'recipe_id')::INTEGER,
            v_slot->>'day_of_week',
            v_slot->>'meal_type'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN json_build_object('success', true, 'message', 'Template applied to plan');
END;
$$ LANGUAGE plpgsql;


-- 9.3  Get all saved templates for a user
CREATE OR REPLACE FUNCTION get_user_templates(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'template_id', template_id,
        'name',        name,
        'created_at',  created_at
    ) ORDER BY created_at DESC)
    INTO v_result
    FROM saved_plan_templates
    WHERE user_id = p_user_id;

    RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql;


-- 9.4  Delete a saved template
CREATE OR REPLACE FUNCTION delete_template(p_template_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
BEGIN
    DELETE FROM saved_plan_templates
    WHERE template_id = p_template_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Template not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Template deleted');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 10: NUTRITION
-- ============================================================

-- 10.1  Get nutrition info for a single recipe
CREATE OR REPLACE FUNCTION get_recipe_nutrition(p_recipe_id INTEGER)
RETURNS JSON AS $$
DECLARE v_n recipe_nutrition%ROWTYPE;
BEGIN
    SELECT * INTO v_n FROM recipe_nutrition WHERE recipe_id = p_recipe_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Nutrition info not available');
    END IF;

    RETURN json_build_object(
        'success',   true,
        'recipe_id', p_recipe_id,
        'calories',  v_n.calories,
        'protein_g', v_n.protein_g,
        'carbs_g',   v_n.carbs_g,
        'fat_g',     v_n.fat_g
    );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_weekly_nutrition(p_plan_id INTEGER, p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_totals RECORD;
    v_daily  JSON;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM meal_plans WHERE plan_id = p_plan_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;

    -- Daily breakdown (fixed)
    SELECT json_agg(json_build_object(
        'day_of_week', day_of_week,
        'calories',    total_calories,
        'protein_g',   total_protein,
        'carbs_g',     total_carbs,
        'fat_g',       total_fat
    ) ORDER BY
        CASE day_of_week
            WHEN 'Sunday'    THEN 0 WHEN 'Monday'   THEN 1 WHEN 'Tuesday'  THEN 2
            WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday'   THEN 5
            WHEN 'Saturday'  THEN 6
        END
    )
    INTO v_daily
    FROM (
        SELECT 
            mpr.day_of_week,
            SUM(rn.calories)  AS total_calories,
            SUM(rn.protein_g) AS total_protein,
            SUM(rn.carbs_g)   AS total_carbs,
            SUM(rn.fat_g)     AS total_fat
        FROM meal_plan_recipes mpr
        JOIN recipe_nutrition rn ON rn.recipe_id = mpr.recipe_id
        WHERE mpr.plan_id = p_plan_id
        GROUP BY mpr.day_of_week
    ) AS daily_totals;

    -- Weekly totals
    SELECT
        COALESCE(SUM(rn.calories), 0)  AS total_calories,
        COALESCE(SUM(rn.protein_g), 0) AS total_protein,
        COALESCE(SUM(rn.carbs_g), 0)   AS total_carbs,
        COALESCE(SUM(rn.fat_g), 0)     AS total_fat
    INTO v_totals
    FROM meal_plan_recipes mpr
    JOIN recipe_nutrition rn ON rn.recipe_id = mpr.recipe_id
    WHERE mpr.plan_id = p_plan_id;

    RETURN json_build_object(
        'success', true,
        'weekly_totals', json_build_object(
            'calories',  v_totals.total_calories,
            'protein_g', v_totals.total_protein,
            'carbs_g',   v_totals.total_carbs,
            'fat_g',     v_totals.total_fat
        ),
        'daily_breakdown', COALESCE(v_daily, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SECTION 11: DASHBOARD
-- ============================================================

-- 11.1  User dashboard summary
--       FIX: draft_count added; top recipes filtered to published only
CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_pantry_count  INTEGER;
    v_recipe_count  INTEGER;
    v_draft_count   INTEGER;
    v_fav_count     INTEGER;
    v_cooked_count  INTEGER;
    v_top_recipes   JSON;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    SELECT COUNT(*) INTO v_pantry_count
    FROM pantry_items WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_recipe_count
    FROM recipes WHERE user_id = p_user_id AND status = 'published';

    SELECT COUNT(*) INTO v_draft_count
    FROM recipes WHERE user_id = p_user_id AND status = 'draft';

    SELECT COUNT(*) INTO v_fav_count
    FROM favourites WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_cooked_count
    FROM cooking_sessions
    WHERE user_id = p_user_id AND is_completed = TRUE;

    -- Top-rated published recipes that respect the user's dietary restrictions
    SELECT json_agg(row_to_json(t)) INTO v_top_recipes FROM (
        SELECT r.recipe_id, r.title, r.image_url, rs.average_rating
        FROM recipes r
        JOIN recipe_stats rs ON rs.recipe_id = r.recipe_id
        WHERE
            r.status = 'published'
            AND NOT EXISTS (
                SELECT 1
                FROM recipe_ingredients ri2
                JOIN preference_food_group pfg
                    ON pfg.ingredient_id = ri2.ingredient_id AND pfg.allowed = 0
                JOIN user_preference up
                    ON up.preference_id = pfg.preference_id AND up.user_id = p_user_id
                WHERE ri2.recipe_id = r.recipe_id
            )
        ORDER BY rs.average_rating DESC
        LIMIT 5
    ) t;

    RETURN json_build_object(
        'success',           true,
        'pantry_items',      v_pantry_count,
        'published_recipes', v_recipe_count,
        'draft_recipes',     v_draft_count,      -- FIX: added
        'favourites',        v_fav_count,
        'meals_cooked',      v_cooked_count,
        'top_rated_recipes', COALESCE(v_top_recipes, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  END OF PANTRYPAL LOGIC
-- ============================================================