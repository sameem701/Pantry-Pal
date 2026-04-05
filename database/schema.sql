
-- ============================================================
--  PANTRYPAL – COMPLETE SCHEMA
--  PostgreSQL / Supabase
--
--  CHANGES vs original:
--   1. pantry_items        → added storage_location (Fridge/Pantry/Freezer)
--   2. recipes             → added status ('published'|'draft')
--   3. recipe_ingredients  → quantity INTEGER → DECIMAL(10,2)
--   4. recipe_dietary_tags → already existed in schema v2, now fully wired in logic
--   5. recipe_stats        → auto-seeded via AFTER INSERT trigger on recipes
--   6. meal_plan_recipes   → CHECK constraints on day_of_week and meal_type
--   7. DROP list extended to cover all tables in correct dependency order
-- ============================================================


-- ============================================================
--  DROP (reverse-dependency order)
-- ============================================================
DROP TABLE IF EXISTS shopping_list_items     CASCADE;
DROP TABLE IF EXISTS shopping_lists          CASCADE;
DROP TABLE IF EXISTS saved_plan_templates    CASCADE;
DROP TABLE IF EXISTS meal_plan_recipes       CASCADE;
DROP TABLE IF EXISTS meal_plans              CASCADE;
DROP TABLE IF EXISTS recipe_dietary_tags     CASCADE;
DROP TABLE IF EXISTS recipe_cuisines         CASCADE;
DROP TABLE IF EXISTS user_cuisine_preference CASCADE;
DROP TABLE IF EXISTS cuisines                CASCADE;
DROP TABLE IF EXISTS cooking_sessions        CASCADE;
DROP TABLE IF EXISTS recipe_nutrition        CASCADE;
DROP TABLE IF EXISTS recipe_instructions     CASCADE;
DROP TABLE IF EXISTS recipe_ingredients      CASCADE;
DROP TABLE IF EXISTS recipe_stats            CASCADE;
DROP TABLE IF EXISTS recipes                 CASCADE;
DROP TABLE IF EXISTS pantry_items            CASCADE;
DROP TABLE IF EXISTS preference_food_group   CASCADE;
DROP TABLE IF EXISTS user_preference         CASCADE;
DROP TABLE IF EXISTS favourites              CASCADE;
DROP TABLE IF EXISTS reviews                 CASCADE;
DROP TABLE IF EXISTS dietary_preferences     CASCADE;
DROP TABLE IF EXISTS ingredients             CASCADE;
DROP TABLE IF EXISTS units                   CASCADE;
DROP TABLE IF EXISTS temp_users              CASCADE;
DROP TABLE IF EXISTS app_users               CASCADE;

DROP FUNCTION IF EXISTS trg_seed_recipe_stats() CASCADE;


-- ============================================================
--  CORE USER TABLES
-- ============================================================

CREATE TABLE app_users (
    user_id       SERIAL       PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    skill_level   VARCHAR(20)  DEFAULT 'Beginner',
    CONSTRAINT check_skill_level CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
    reset_code    VARCHAR(6),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Holds unverified registrations; row deleted once user verifies email
CREATE TABLE temp_users (
    email             VARCHAR(255) PRIMARY KEY,
    password_hash     VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6)   NOT NULL,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
--  REFERENCE / LOOKUP TABLES
-- ============================================================

CREATE TABLE dietary_preferences (
    preference_id   INTEGER      PRIMARY KEY,
    preference_name VARCHAR(255) NOT NULL,
    preference_type VARCHAR(20)  NOT NULL  -- 'Restrictions' | 'Allergies' | 'Religious'
);

CREATE TABLE ingredients (
    ingredient_id   SERIAL       PRIMARY KEY,
    ingredient_name VARCHAR(255) NOT NULL,
    category        VARCHAR(50)
);

CREATE TABLE units (
    unit_id   INTEGER     PRIMARY KEY,
    unit_name VARCHAR(50) NOT NULL
);

CREATE TABLE cuisines (
    cuisine_id SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE
);


-- ============================================================
--  USER PREFERENCE TABLES
-- ============================================================

CREATE TABLE user_preference (
    user_id       INTEGER NOT NULL REFERENCES app_users(user_id)                 ON DELETE CASCADE,
    preference_id INTEGER NOT NULL REFERENCES dietary_preferences(preference_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, preference_id)
);

CREATE TABLE user_cuisine_preference (
    user_id    INTEGER NOT NULL REFERENCES app_users(user_id)   ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(cuisine_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, cuisine_id)
);


-- ============================================================
--  DIETARY RESTRICTION → INGREDIENT MAPPING
--  allowed = 0  means the ingredient is FORBIDDEN for that preference
-- ============================================================

CREATE TABLE preference_food_group (
    preference_id INTEGER  NOT NULL REFERENCES dietary_preferences(preference_id) ON DELETE CASCADE,
    ingredient_id INTEGER  NOT NULL REFERENCES ingredients(ingredient_id)         ON DELETE CASCADE,
    allowed       SMALLINT DEFAULT 1,
    PRIMARY KEY (preference_id, ingredient_id)
);


-- ============================================================
--  PANTRY
--  FIX: added storage_location (Fridge / Pantry / Freezer)
-- ============================================================

CREATE TABLE pantry_items (
    user_id          INTEGER       NOT NULL REFERENCES app_users(user_id)        ON DELETE CASCADE,
    ingredient_id    INTEGER       NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity         DECIMAL(10,2) DEFAULT 0,
    unit             VARCHAR(20),
    storage_location VARCHAR(10)   DEFAULT 'Pantry',
    CONSTRAINT check_storage_location
        CHECK (storage_location IN ('Fridge','Pantry','Freezer')),
    PRIMARY KEY (user_id, ingredient_id)
);


-- ============================================================
--  RECIPES
--  FIX: added status ('published' | 'draft')
-- ============================================================

CREATE TABLE recipes (
    recipe_id        SERIAL       PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    difficulty       VARCHAR(20)  DEFAULT 'Medium',
    CONSTRAINT check_difficulty CHECK (difficulty IN ('Easy','Medium','Hard')),
    cooking_time_min INTEGER      NOT NULL,
    image_url        VARCHAR(500),
    status           VARCHAR(10)  DEFAULT 'published',  -- NEW: 'published' | 'draft'
    CONSTRAINT check_status CHECK (status IN ('published','draft')),
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_nutrition (
    recipe_id INTEGER       PRIMARY KEY REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    calories  INTEGER,
    protein_g DECIMAL(5,2),
    carbs_g   DECIMAL(5,2),
    fat_g     DECIMAL(5,2)
);

CREATE TABLE recipe_instructions (
    instruction_id   SERIAL  PRIMARY KEY,
    recipe_id        INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    step_number      INTEGER NOT NULL,
    instruction_text TEXT    NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (recipe_id, step_number)
);

-- FIX: quantity was INTEGER; changed to DECIMAL(10,2) for proper fractional amounts
CREATE TABLE recipe_ingredients (
    recipe_id     INTEGER       NOT NULL REFERENCES recipes(recipe_id)        ON DELETE CASCADE,
    ingredient_id INTEGER       NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity      DECIMAL(10,2) NOT NULL,
    unit          VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Stats row guaranteed by trigger below – inner JOINs in search functions are safe
CREATE TABLE recipe_stats (
    recipe_id       INTEGER PRIMARY KEY REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    favourite_count INTEGER DEFAULT 0,
    average_rating  NUMERIC DEFAULT 0,
    total_reviews   INTEGER DEFAULT 0
);

-- Trigger function: auto-insert stats row whenever a recipe is created
CREATE OR REPLACE FUNCTION trg_seed_recipe_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO recipe_stats (recipe_id)
    VALUES (NEW.recipe_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_recipe_insert
AFTER INSERT ON recipes
FOR EACH ROW EXECUTE FUNCTION trg_seed_recipe_stats();

-- Cuisine tags per recipe
CREATE TABLE recipe_cuisines (
    recipe_id  INTEGER NOT NULL REFERENCES recipes(recipe_id)  ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(cuisine_id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, cuisine_id)
);

-- Dietary tags per recipe (e.g. mark recipe as Vegan, Gluten-free, etc.)
CREATE TABLE recipe_dietary_tags (
    recipe_id     INTEGER NOT NULL REFERENCES recipes(recipe_id)                 ON DELETE CASCADE,
    preference_id INTEGER NOT NULL REFERENCES dietary_preferences(preference_id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, preference_id)
);


-- ============================================================
--  SOCIAL: REVIEWS & FAVOURITES
-- ============================================================

CREATE TABLE reviews (
    user_id     INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id   INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    rating      NUMERIC NOT NULL CHECK (rating >= 0 AND rating <= 5),
    review_text VARCHAR(255),
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE favourites (
    user_id   INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, recipe_id)
);


-- ============================================================
--  INTERACTIVE COOKING
-- ============================================================

CREATE TABLE cooking_sessions (
    session_id   SERIAL  PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id    INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
--  MEAL PLANNING
-- ============================================================

CREATE TABLE meal_plans (
    plan_id    SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES app_users(user_id),
    week_start DATE         NOT NULL,
    week_end   DATE         NOT NULL,
    name       VARCHAR(100),
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, week_start)
);

-- FIX: CHECK constraints on day_of_week and meal_type
CREATE TABLE meal_plan_recipes (
    plan_id     INTEGER     NOT NULL REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
    recipe_id   INTEGER     NOT NULL REFERENCES recipes(recipe_id),
    day_of_week VARCHAR(10) NOT NULL,
    meal_type   VARCHAR(10) NOT NULL,
    is_cooked   BOOLEAN     DEFAULT FALSE,
    PRIMARY KEY (plan_id, day_of_week, meal_type),
    CONSTRAINT check_day_of_week
        CHECK (day_of_week IN ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
    CONSTRAINT check_meal_type
        CHECK (meal_type IN ('breakfast','lunch','dinner'))
);


-- ============================================================
--  PLAN TEMPLATES
-- ============================================================

CREATE TABLE saved_plan_templates (
    template_id SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES app_users(user_id),
    name        VARCHAR(100) NOT NULL,
    meal_data   JSON         NOT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
--  SHOPPING LISTS
-- ============================================================

CREATE TABLE shopping_lists (
    list_id      SERIAL  PRIMARY KEY,
    plan_id      INTEGER NOT NULL REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_list_items (
    list_id         INTEGER      NOT NULL REFERENCES shopping_lists(list_id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity        VARCHAR(50),
    category        VARCHAR(50),
    is_checked      BOOLEAN      DEFAULT FALSE,
    PRIMARY KEY (list_id, ingredient_name)
);


-- ============================================================
--  INDEXES
-- ============================================================

CREATE INDEX idx_pantry_user        ON pantry_items(user_id);
CREATE INDEX idx_pantry_ingredient  ON pantry_items(ingredient_id);
CREATE INDEX idx_pantry_location    ON pantry_items(storage_location);
CREATE INDEX idx_recipes_user       ON recipes(user_id);
CREATE INDEX idx_recipes_status     ON recipes(status);
CREATE INDEX idx_reviews_user       ON reviews(user_id);
CREATE INDEX idx_reviews_recipe     ON reviews(recipe_id);
CREATE INDEX idx_favs_user          ON favourites(user_id);
CREATE INDEX idx_favs_recipe        ON favourites(recipe_id);
CREATE INDEX idx_user_pref_user     ON user_preference(user_id);
CREATE INDEX idx_rec_ing_recipe     ON recipe_ingredients(recipe_id);
CREATE INDEX idx_uc_pref_user       ON user_cuisine_preference(user_id);
CREATE INDEX idx_uc_pref_cuisine    ON user_cuisine_preference(cuisine_id);
CREATE INDEX idx_rec_cuis_recipe    ON recipe_cuisines(recipe_id);
CREATE INDEX idx_rec_cuis_cuisine   ON recipe_cuisines(cuisine_id);
CREATE INDEX idx_rec_dtag_recipe    ON recipe_dietary_tags(recipe_id);
CREATE INDEX idx_cooking_user       ON cooking_sessions(user_id);
CREATE INDEX idx_meal_plan_user     ON meal_plans(user_id);
CREATE INDEX idx_meal_plan_rec      ON meal_plan_recipes(plan_id);


-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO cuisines (name) VALUES
('Italian'),('Mexican'),('Chinese'),('Indian'),('Japanese'),
('Thai'),('French'),('Greek'),('Spanish'),('American'),
('Mediterranean'),('Middle Eastern'),('Korean'),('Vietnamese'),('Caribbean');

INSERT INTO dietary_preferences (preference_id, preference_name, preference_type) VALUES
(1,  'Vegetarian',    'Restrictions'),
(2,  'Vegan',         'Restrictions'),
(3,  'Pescatarian',   'Restrictions'),
(4,  'Gluten-free',   'Allergies'),
(5,  'Dairy-free',    'Allergies'),
(6,  'Nut-free',      'Allergies'),
(7,  'Soy-free',      'Allergies'),
(8,  'Egg-free',      'Allergies'),
(9,  'Shellfish-free','Allergies'),
(10, 'Halal',         'Religious'),
(11, 'Kosher',        'Religious');

INSERT INTO units (unit_id, unit_name) VALUES
(1,'grams'),(2,'kg'),(3,'ml'),(4,'liters'),(5,'cups'),
(6,'tablespoons'),(7,'teaspoons'),(8,'count'),(9,'pinch'),(10,'ounces');

INSERT INTO ingredients (ingredient_name, category) VALUES
('Chicken Breast','Poultry'),('Beef Steak','Meat'),('Salmon','Fish'),
('Eggs','Eggs'),('Milk','Dairy'),('Cheese','Dairy'),
('Flour','Grains'),('Rice','Grains'),
('Tomato','Vegetable'),('Onion','Vegetable'),('Garlic','Vegetable'),
('Potato','Vegetable'),('Carrot','Vegetable'),
('Apple','Fruit'),('Banana','Fruit'),
('Almonds','Nuts'),('Peanuts','Nuts'),
('Olive Oil','Oils'),('Butter','Dairy'),
('Sugar','Sweets'),('Salt','Spices'),('Black Pepper','Spices');

INSERT INTO preference_food_group (preference_id, ingredient_id, allowed) VALUES
-- Vegetarian: no meat, poultry, fish
(1,1,0),(1,2,0),(1,3,0),
-- Vegan: no animal products
(2,1,0),(2,2,0),(2,3,0),(2,4,0),(2,5,0),(2,6,0),(2,19,0),
-- Pescatarian: no meat, poultry
(3,1,0),(3,2,0),
-- Dairy-free
(5,5,0),(5,6,0),(5,19,0),
-- Nut-free
(6,16,0),(6,17,0),
-- Egg-free
(8,4,0);
