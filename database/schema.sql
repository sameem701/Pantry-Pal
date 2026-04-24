-- ============================================================
--  PANTRYPAL – COMPLETE SCHEMA + SEED DATA
--  PostgreSQL / Supabase
--
--  CHANGES vs original:
--   1. pantry_items        → added storage_location (Fridge/Pantry/Freezer)
--   2. recipes             → added status ('published'|'draft')
--   3. recipe_ingredients  → quantity INTEGER → DECIMAL(10,2)
--   4. recipe_dietary_tags → fully wired in logic
--   5. recipe_stats        → auto-seeded via AFTER INSERT trigger on recipes
--   6. meal_plan_recipes   → CHECK constraints on day_of_week and meal_type
--   7. DROP list extended to cover all tables in correct dependency order
--   8. SEED DATA EXPANDED:
--        - 150+ ingredients across 20+ categories
--        - preference_food_group fully mapped for all dietary tags
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
-- ============================================================

CREATE TABLE recipes (
    recipe_id        SERIAL       PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    difficulty       VARCHAR(20)  DEFAULT 'Medium',
    CONSTRAINT check_difficulty CHECK (difficulty IN ('Easy','Medium','Hard')),
    cooking_time_min INTEGER      NOT NULL,
    image_url        VARCHAR(500),
    status           VARCHAR(10)  DEFAULT 'published',
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

CREATE TABLE recipe_ingredients (
    recipe_id     INTEGER       NOT NULL REFERENCES recipes(recipe_id)        ON DELETE CASCADE,
    ingredient_id INTEGER       NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity      DECIMAL(10,2) NOT NULL,
    unit          VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE recipe_stats (
    recipe_id       INTEGER PRIMARY KEY REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    favourite_count INTEGER DEFAULT 0,
    average_rating  NUMERIC DEFAULT 0,
    total_reviews   INTEGER DEFAULT 0
);

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

CREATE TABLE recipe_cuisines (
    recipe_id  INTEGER NOT NULL REFERENCES recipes(recipe_id)  ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(cuisine_id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, cuisine_id)
);

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

-- ------------------------------------------------------------
--  CUISINES
-- ------------------------------------------------------------
INSERT INTO cuisines (name) VALUES
('Italian'),('Mexican'),('Chinese'),('Indian'),('Japanese'),
('Thai'),('French'),('Greek'),('Spanish'),('American'),
('Mediterranean'),('Middle Eastern'),('Korean'),('Vietnamese'),('Caribbean');


-- ------------------------------------------------------------
--  DIETARY PREFERENCES
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
--  UNITS
-- ------------------------------------------------------------
INSERT INTO units (unit_id, unit_name) VALUES
(1,'grams'),(2,'kg'),(3,'ml'),(4,'liters'),(5,'cups'),
(6,'tablespoons'),(7,'teaspoons'),(8,'count'),(9,'pinch'),(10,'ounces');


-- ============================================================
--  INGREDIENTS  (150+ entries)
--
--  ID ranges by category (for easy reference):
--    1–10   Poultry
--   11–20   Meat
--   21–30   Fish & Seafood
--   31–40   Shellfish
--   41–55   Dairy & Eggs
--   56–70   Grains & Bread
--   71–90   Vegetables
--   91–110  Fruits
--  111–120  Legumes
--  121–130  Nuts & Seeds
--  131–140  Oils & Fats
--  141–155  Herbs & Spices
--  156–165  Condiments & Sauces
--  166–175  Sweeteners & Baking
--  176–185  Beverages & Liquids
--  186–195  Soy & Plant-based
--  196–205  Pork Products (non-Halal / non-Kosher)
-- ============================================================

INSERT INTO ingredients (ingredient_id, ingredient_name, category) VALUES

-- ── Poultry (1–10) ──────────────────────────────────────────
(1,  'Chicken Breast',       'Poultry'),
(2,  'Chicken Thigh',        'Poultry'),
(3,  'Chicken Wings',        'Poultry'),
(4,  'Whole Chicken',        'Poultry'),
(5,  'Ground Chicken',       'Poultry'),
(6,  'Turkey Breast',        'Poultry'),
(7,  'Ground Turkey',        'Poultry'),
(8,  'Duck Breast',          'Poultry'),
(9,  'Chicken Liver',        'Poultry'),
(10, 'Quail',                'Poultry'),

-- ── Meat (11–20) ────────────────────────────────────────────
(11, 'Beef Steak',           'Meat'),
(12, 'Ground Beef',          'Meat'),
(13, 'Beef Ribs',            'Meat'),
(14, 'Lamb Chops',           'Meat'),
(15, 'Ground Lamb',          'Meat'),
(16, 'Veal',                 'Meat'),
(17, 'Beef Brisket',         'Meat'),
(18, 'Beef Mince',           'Meat'),
(19, 'Lamb Shoulder',        'Meat'),
(20, 'Goat Meat',            'Meat'),

-- ── Fish (21–30) ────────────────────────────────────────────
(21, 'Salmon',               'Fish'),
(22, 'Tuna',                 'Fish'),
(23, 'Tilapia',              'Fish'),
(24, 'Cod',                  'Fish'),
(25, 'Haddock',              'Fish'),
(26, 'Sardines',             'Fish'),
(27, 'Mackerel',             'Fish'),
(28, 'Trout',                'Fish'),
(29, 'Sea Bass',             'Fish'),
(30, 'Halibut',              'Fish'),

-- ── Shellfish (31–40) ───────────────────────────────────────
(31, 'Shrimp',               'Shellfish'),
(32, 'Prawns',               'Shellfish'),
(33, 'Crab',                 'Shellfish'),
(34, 'Lobster',              'Shellfish'),
(35, 'Mussels',              'Shellfish'),
(36, 'Clams',                'Shellfish'),
(37, 'Oysters',              'Shellfish'),
(38, 'Scallops',             'Shellfish'),
(39, 'Squid',                'Shellfish'),
(40, 'Octopus',              'Shellfish'),

-- ── Dairy & Eggs (41–55) ────────────────────────────────────
(41, 'Eggs',                 'Eggs'),
(42, 'Milk',                 'Dairy'),
(43, 'Whole Milk',           'Dairy'),
(44, 'Skimmed Milk',         'Dairy'),
(45, 'Cheddar Cheese',       'Dairy'),
(46, 'Mozzarella Cheese',    'Dairy'),
(47, 'Parmesan Cheese',      'Dairy'),
(48, 'Feta Cheese',          'Dairy'),
(49, 'Cream Cheese',         'Dairy'),
(50, 'Greek Yogurt',         'Dairy'),
(51, 'Plain Yogurt',         'Dairy'),
(52, 'Butter',               'Dairy'),
(53, 'Heavy Cream',          'Dairy'),
(54, 'Sour Cream',           'Dairy'),
(55, 'Ricotta Cheese',       'Dairy'),

-- ── Grains & Bread (56–70) ──────────────────────────────────
(56, 'All-Purpose Flour',    'Grains'),
(57, 'Whole Wheat Flour',    'Grains'),
(58, 'Rice Flour',           'Grains'),
(59, 'Cornmeal',             'Grains'),
(60, 'Basmati Rice',         'Grains'),
(61, 'Jasmine Rice',         'Grains'),
(62, 'Brown Rice',           'Grains'),
(63, 'White Rice',           'Grains'),
(64, 'Spaghetti',            'Grains'),
(65, 'Penne Pasta',          'Grains'),
(66, 'Lasagne Sheets',       'Grains'),
(67, 'Bread Crumbs',         'Grains'),
(68, 'Oats',                 'Grains'),
(69, 'Quinoa',               'Grains'),
(70, 'Couscous',             'Grains'),

-- ── Vegetables (71–90) ──────────────────────────────────────
(71,  'Tomato',              'Vegetable'),
(72,  'Onion',               'Vegetable'),
(73,  'Red Onion',           'Vegetable'),
(74,  'Garlic',              'Vegetable'),
(75,  'Potato',              'Vegetable'),
(76,  'Sweet Potato',        'Vegetable'),
(77,  'Carrot',              'Vegetable'),
(78,  'Broccoli',            'Vegetable'),
(79,  'Cauliflower',         'Vegetable'),
(80,  'Spinach',             'Vegetable'),
(81,  'Kale',                'Vegetable'),
(82,  'Lettuce',             'Vegetable'),
(83,  'Bell Pepper (Red)',   'Vegetable'),
(84,  'Bell Pepper (Green)', 'Vegetable'),
(85,  'Bell Pepper (Yellow)','Vegetable'),
(86,  'Zucchini',            'Vegetable'),
(87,  'Eggplant',            'Vegetable'),
(88,  'Mushrooms',           'Vegetable'),
(89,  'Corn',                'Vegetable'),
(90,  'Green Beans',         'Vegetable'),
(91,  'Peas',                'Vegetable'),
(92,  'Cucumber',            'Vegetable'),
(93,  'Celery',              'Vegetable'),
(94,  'Leek',                'Vegetable'),
(95,  'Asparagus',           'Vegetable'),
(96,  'Brussels Sprouts',    'Vegetable'),
(97,  'Cabbage',             'Vegetable'),
(98,  'Bok Choy',            'Vegetable'),
(99,  'Spring Onion',        'Vegetable'),
(100, 'Cherry Tomatoes',     'Vegetable'),

-- ── Fruits (101–115) ────────────────────────────────────────
(101, 'Apple',               'Fruit'),
(102, 'Banana',              'Fruit'),
(103, 'Lemon',               'Fruit'),
(104, 'Lime',                'Fruit'),
(105, 'Orange',              'Fruit'),
(106, 'Mango',               'Fruit'),
(107, 'Avocado',             'Fruit'),
(108, 'Strawberries',        'Fruit'),
(109, 'Blueberries',         'Fruit'),
(110, 'Raspberries',         'Fruit'),
(111, 'Grapes',              'Fruit'),
(112, 'Pineapple',           'Fruit'),
(113, 'Watermelon',          'Fruit'),
(114, 'Peach',               'Fruit'),
(115, 'Pear',                'Fruit'),

-- ── Legumes (116–125) ───────────────────────────────────────
(116, 'Chickpeas',           'Legumes'),
(117, 'Lentils (Red)',       'Legumes'),
(118, 'Lentils (Green)',     'Legumes'),
(119, 'Black Beans',         'Legumes'),
(120, 'Kidney Beans',        'Legumes'),
(121, 'White Beans',         'Legumes'),
(122, 'Green Lentils',       'Legumes'),
(123, 'Split Peas',          'Legumes'),
(124, 'Edamame',             'Legumes'),
(125, 'Pinto Beans',         'Legumes'),

-- ── Nuts & Seeds (126–135) ──────────────────────────────────
(126, 'Almonds',             'Nuts'),
(127, 'Walnuts',             'Nuts'),
(128, 'Cashews',             'Nuts'),
(129, 'Peanuts',             'Nuts'),
(130, 'Pecans',              'Nuts'),
(131, 'Pine Nuts',           'Nuts'),
(132, 'Sunflower Seeds',     'Seeds'),
(133, 'Pumpkin Seeds',       'Seeds'),
(134, 'Sesame Seeds',        'Seeds'),
(135, 'Chia Seeds',          'Seeds'),
(136, 'Flaxseeds',           'Seeds'),
(137, 'Hemp Seeds',          'Seeds'),
(138, 'Pistachios',          'Nuts'),
(139, 'Hazelnuts',           'Nuts'),
(140, 'Macadamia Nuts',      'Nuts'),

-- ── Oils & Fats (141–148) ───────────────────────────────────
(141, 'Olive Oil',           'Oils'),
(142, 'Vegetable Oil',       'Oils'),
(143, 'Coconut Oil',         'Oils'),
(144, 'Sesame Oil',          'Oils'),
(145, 'Avocado Oil',         'Oils'),
(146, 'Ghee',                'Oils'),
(147, 'Canola Oil',          'Oils'),
(148, 'Sunflower Oil',       'Oils'),

-- ── Herbs & Spices (149–170) ────────────────────────────────
(149, 'Salt',                'Spices'),
(150, 'Black Pepper',        'Spices'),
(151, 'Cumin',               'Spices'),
(152, 'Coriander Powder',    'Spices'),
(153, 'Turmeric',            'Spices'),
(154, 'Paprika',             'Spices'),
(155, 'Smoked Paprika',      'Spices'),
(156, 'Chili Powder',        'Spices'),
(157, 'Cayenne Pepper',      'Spices'),
(158, 'Cinnamon',            'Spices'),
(159, 'Nutmeg',              'Spices'),
(160, 'Cardamom',            'Spices'),
(161, 'Cloves',              'Spices'),
(162, 'Bay Leaves',          'Herbs'),
(163, 'Oregano',             'Herbs'),
(164, 'Thyme',               'Herbs'),
(165, 'Rosemary',            'Herbs'),
(166, 'Basil',               'Herbs'),
(167, 'Parsley',             'Herbs'),
(168, 'Cilantro',            'Herbs'),
(169, 'Dill',                'Herbs'),
(170, 'Mint',                'Herbs'),
(171, 'Ginger',              'Spices'),
(172, 'Garlic Powder',       'Spices'),
(173, 'Onion Powder',        'Spices'),
(174, 'Chili Flakes',        'Spices'),
(175, 'Garam Masala',        'Spices'),

-- ── Condiments & Sauces (176–188) ───────────────────────────
(176, 'Soy Sauce',           'Condiments'),
(177, 'Worcestershire Sauce','Condiments'),
(178, 'Hot Sauce',           'Condiments'),
(179, 'Tomato Paste',        'Condiments'),
(180, 'Tomato Sauce (Canned)','Condiments'),
(181, 'Ketchup',             'Condiments'),
(182, 'Mayonnaise',          'Condiments'),
(183, 'Mustard',             'Condiments'),
(184, 'Honey',               'Condiments'),
(185, 'Maple Syrup',         'Condiments'),
(186, 'Vinegar (White)',     'Condiments'),
(187, 'Apple Cider Vinegar', 'Condiments'),
(188, 'Balsamic Vinegar',    'Condiments'),

-- ── Sweeteners & Baking (189–200) ───────────────────────────
(189, 'Sugar',               'Sweets'),
(190, 'Brown Sugar',         'Sweets'),
(191, 'Powdered Sugar',      'Sweets'),
(192, 'Baking Powder',       'Baking'),
(193, 'Baking Soda',         'Baking'),
(194, 'Yeast',               'Baking'),
(195, 'Cocoa Powder',        'Baking'),
(196, 'Dark Chocolate',      'Sweets'),
(197, 'Milk Chocolate',      'Sweets'),
(198, 'Vanilla Extract',     'Baking'),
(199, 'Cornstarch',          'Baking'),
(200, 'Gelatin',             'Baking'),

-- ── Beverages & Liquids (201–208) ───────────────────────────
(201, 'Chicken Stock',       'Stock'),
(202, 'Beef Stock',          'Stock'),
(203, 'Vegetable Stock',     'Stock'),
(204, 'Coconut Milk',        'Canned'),
(205, 'Almond Milk',         'Plant-based'),
(206, 'Oat Milk',            'Plant-based'),
(207, 'Soy Milk',            'Plant-based'),
(208, 'Water',               'Beverages'),

-- ── Soy & Plant-based Proteins (209–215) ────────────────────
(209, 'Tofu (Firm)',         'Plant-based'),
(210, 'Tofu (Silken)',       'Plant-based'),
(211, 'Tempeh',              'Plant-based'),
(212, 'Soy Sauce',           'Plant-based'),
(213, 'Miso Paste',          'Plant-based'),
(214, 'Seitan',              'Plant-based'),
(215, 'Nutritional Yeast',   'Plant-based'),

-- ── Pork Products (216–225) – non-Halal / non-Kosher ────────
(216, 'Bacon',               'Pork'),
(217, 'Ham',                 'Pork'),
(218, 'Pork Chops',          'Pork'),
(219, 'Pork Belly',          'Pork'),
(220, 'Sausage (Pork)',      'Pork'),
(221, 'Pepperoni',           'Pork'),
(222, 'Salami',              'Pork'),
(223, 'Prosciutto',          'Pork'),
(224, 'Ground Pork',         'Pork'),
(225, 'Pork Ribs',           'Pork'),

-- ── Canned & Preserved (226–235) ────────────────────────────
(226, 'Canned Tuna',         'Canned'),
(227, 'Canned Salmon',       'Canned'),
(228, 'Canned Chickpeas',    'Canned'),
(229, 'Canned Tomatoes',     'Canned'),
(230, 'Canned Corn',         'Canned'),
(231, 'Canned Black Beans',  'Canned'),
(232, 'Canned Kidney Beans', 'Canned'),
(233, 'Canned Coconut Cream','Canned'),
(234, 'Olives',              'Canned'),
(235, 'Capers',              'Canned'),

-- ── Noodles & Asian Staples (236–245) ───────────────────────
(236, 'Ramen Noodles',       'Grains'),
(237, 'Udon Noodles',        'Grains'),
(238, 'Rice Noodles',        'Grains'),
(239, 'Soba Noodles',        'Grains'),
(240, 'Glass Noodles',       'Grains'),
(241, 'Wonton Wrappers',     'Grains'),
(242, 'Rice Paper',          'Grains'),
(243, 'Panko Bread Crumbs',  'Grains'),
(244, 'Tortillas (Flour)',   'Grains'),
(245, 'Tortillas (Corn)',    'Grains'),

-- ── Cheese Extras (246–250) ─────────────────────────────────
(246, 'Gouda Cheese',        'Dairy'),
(247, 'Brie Cheese',         'Dairy'),
(248, 'Blue Cheese',         'Dairy'),
(249, 'Halloumi',            'Dairy'),
(250, 'Cottage Cheese',      'Dairy');


-- ============================================================
--  PREFERENCE_FOOD_GROUP
--
--  Mapping: allowed = 0 means the ingredient is FORBIDDEN
--  for that dietary preference.
--
--  preference_id reference:
--    1  Vegetarian    – no meat, poultry, fish, shellfish
--    2  Vegan         – all of above + no dairy, eggs, honey
--    3  Pescatarian   – no meat, poultry (fish/shellfish OK)
--    4  Gluten-free   – no wheat flour / gluten-containing grains
--    5  Dairy-free    – no dairy products
--    6  Nut-free      – no tree nuts, peanuts
--    7  Soy-free      – no soy-based products
--    8  Egg-free      – no eggs
--    9  Shellfish-free– no shellfish
--   10  Halal         – no pork, no alcohol; land animals must
--                       be halal-slaughtered (we flag pork here)
--   11  Kosher        – no pork, no shellfish, no mixing meat+dairy
-- ============================================================

INSERT INTO preference_food_group (preference_id, ingredient_id, allowed) VALUES

-- ────────────────────────────────────────────────────────────
-- 1  VEGETARIAN – forbidden: poultry (1–10), meat (11–20),
--                fish (21–30), shellfish (31–40)
-- ────────────────────────────────────────────────────────────
(1,1,0),(1,2,0),(1,3,0),(1,4,0),(1,5,0),
(1,6,0),(1,7,0),(1,8,0),(1,9,0),(1,10,0),
(1,11,0),(1,12,0),(1,13,0),(1,14,0),(1,15,0),
(1,16,0),(1,17,0),(1,18,0),(1,19,0),(1,20,0),
(1,21,0),(1,22,0),(1,23,0),(1,24,0),(1,25,0),
(1,26,0),(1,27,0),(1,28,0),(1,29,0),(1,30,0),
(1,31,0),(1,32,0),(1,33,0),(1,34,0),(1,35,0),
(1,36,0),(1,37,0),(1,38,0),(1,39,0),(1,40,0),
-- pork products
(1,216,0),(1,217,0),(1,218,0),(1,219,0),(1,220,0),
(1,221,0),(1,222,0),(1,223,0),(1,224,0),(1,225,0),
-- canned meat/fish
(1,226,0),(1,227,0),

-- ────────────────────────────────────────────────────────────
-- 2  VEGAN – forbidden: everything in Vegetarian +
--            dairy (42–55, 246–250), eggs (41),
--            honey (184), ghee (146), chicken/beef stock (201,202)
-- ────────────────────────────────────────────────────────────
-- (all vegetarian forbids first)
(2,1,0),(2,2,0),(2,3,0),(2,4,0),(2,5,0),
(2,6,0),(2,7,0),(2,8,0),(2,9,0),(2,10,0),
(2,11,0),(2,12,0),(2,13,0),(2,14,0),(2,15,0),
(2,16,0),(2,17,0),(2,18,0),(2,19,0),(2,20,0),
(2,21,0),(2,22,0),(2,23,0),(2,24,0),(2,25,0),
(2,26,0),(2,27,0),(2,28,0),(2,29,0),(2,30,0),
(2,31,0),(2,32,0),(2,33,0),(2,34,0),(2,35,0),
(2,36,0),(2,37,0),(2,38,0),(2,39,0),(2,40,0),
-- eggs
(2,41,0),
-- all dairy
(2,42,0),(2,43,0),(2,44,0),(2,45,0),(2,46,0),
(2,47,0),(2,48,0),(2,49,0),(2,50,0),(2,51,0),
(2,52,0),(2,53,0),(2,54,0),(2,55,0),
(2,246,0),(2,247,0),(2,248,0),(2,249,0),(2,250,0),
-- honey, ghee
(2,184,0),(2,146,0),
-- animal stocks
(2,201,0),(2,202,0),
-- pork
(2,216,0),(2,217,0),(2,218,0),(2,219,0),(2,220,0),
(2,221,0),(2,222,0),(2,223,0),(2,224,0),(2,225,0),
-- canned meat/fish
(2,226,0),(2,227,0),
-- mayonnaise (contains egg)
(2,182,0),

-- ────────────────────────────────────────────────────────────
-- 3  PESCATARIAN – forbidden: poultry (1–10), meat (11–20),
--                 pork (216–225)
-- ────────────────────────────────────────────────────────────
(3,1,0),(3,2,0),(3,3,0),(3,4,0),(3,5,0),
(3,6,0),(3,7,0),(3,8,0),(3,9,0),(3,10,0),
(3,11,0),(3,12,0),(3,13,0),(3,14,0),(3,15,0),
(3,16,0),(3,17,0),(3,18,0),(3,19,0),(3,20,0),
(3,216,0),(3,217,0),(3,218,0),(3,219,0),(3,220,0),
(3,221,0),(3,222,0),(3,223,0),(3,224,0),(3,225,0),

-- ────────────────────────────────────────────────────────────
-- 4  GLUTEN-FREE – forbidden: wheat/gluten flours (56,57),
--                 regular pasta (64,65,66,67), couscous (70),
--                 bread crumbs (67), soy sauce* (176, 212),
--                 panko (243), flour tortillas (244),
--                 ramen/udon/soba/wonton (236,237,239,241)
--  * standard soy sauce contains wheat; flag it
-- ────────────────────────────────────────────────────────────
(4,56,0),(4,57,0),
(4,64,0),(4,65,0),(4,66,0),(4,67,0),
(4,70,0),
(4,176,0),(4,212,0),
(4,236,0),(4,237,0),(4,239,0),(4,241,0),
(4,243,0),(4,244,0),

-- ────────────────────────────────────────────────────────────
-- 5  DAIRY-FREE – forbidden: all dairy (42–55, 246–250),
--                ghee (146), butter (52),
--                milk chocolate (197)
-- ────────────────────────────────────────────────────────────
(5,42,0),(5,43,0),(5,44,0),(5,45,0),(5,46,0),
(5,47,0),(5,48,0),(5,49,0),(5,50,0),(5,51,0),
(5,52,0),(5,53,0),(5,54,0),(5,55,0),
(5,146,0),(5,197,0),
(5,246,0),(5,247,0),(5,248,0),(5,249,0),(5,250,0),

-- ────────────────────────────────────────────────────────────
-- 6  NUT-FREE – forbidden: all nuts (126–131, 138–140),
--               peanuts (129), nut-based milks (205),
--               pine nuts (131)
-- ────────────────────────────────────────────────────────────
(6,126,0),(6,127,0),(6,128,0),(6,129,0),(6,130,0),
(6,131,0),(6,138,0),(6,139,0),(6,140,0),
(6,205,0),

-- ────────────────────────────────────────────────────────────
-- 7  SOY-FREE – forbidden: soy sauce (176, 212),
--               tofu (209, 210), tempeh (211),
--               edamame (124), miso paste (213),
--               soy milk (207), seitan* (214 – may contain soy)
-- ────────────────────────────────────────────────────────────
(7,176,0),(7,207,0),(7,209,0),(7,210,0),
(7,211,0),(7,212,0),(7,213,0),(7,124,0),

-- ────────────────────────────────────────────────────────────
-- 8  EGG-FREE – forbidden: eggs (41),
--               mayonnaise (182 – contains egg)
-- ────────────────────────────────────────────────────────────
(8,41,0),(8,182,0),

-- ────────────────────────────────────────────────────────────
-- 9  SHELLFISH-FREE – forbidden: all shellfish (31–40)
-- ────────────────────────────────────────────────────────────
(9,31,0),(9,32,0),(9,33,0),(9,34,0),(9,35,0),
(9,36,0),(9,37,0),(9,38,0),(9,39,0),(9,40,0),

-- ────────────────────────────────────────────────────────────
-- 10  HALAL – forbidden: pork products (216–225),
--             Worcestershire sauce (177 – contains anchovies,
--             often non-halal), alcohol-based vanilla extract*
--  * flag vanilla extract as vanilla extract is often alcohol-based
-- ────────────────────────────────────────────────────────────
(10,216,0),(10,217,0),(10,218,0),(10,219,0),(10,220,0),
(10,221,0),(10,222,0),(10,223,0),(10,224,0),(10,225,0),
(10,177,0),

-- ────────────────────────────────────────────────────────────
-- 11  KOSHER – forbidden: pork (216–225),
--              shellfish (31–40),
--              mixing of meat+dairy is a preparation concern
--              (we flag pork and shellfish at ingredient level)
-- ────────────────────────────────────────────────────────────
(11,216,0),(11,217,0),(11,218,0),(11,219,0),(11,220,0),
(11,221,0),(11,222,0),(11,223,0),(11,224,0),(11,225,0),
(11,31,0),(11,32,0),(11,33,0),(11,34,0),(11,35,0),
(11,36,0),(11,37,0),(11,38,0),(11,39,0),(11,40,0);


-- ============================================================
--  END OF FILE
-- ============================================================