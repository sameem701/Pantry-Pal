-- PantryPal PostgreSQL Schema for Supabase
-- Drop existing tables if they exist
DROP TABLE IF EXISTS temp_users CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favourites CASCADE;
DROP TABLE IF EXISTS user_preference CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipe_stats CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS pantry_items CASCADE;
DROP TABLE IF EXISTS preference_food_group CASCADE;
DROP TABLE IF EXISTS dietary_preferences CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- Create app_users table
CREATE TABLE app_users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    skill_level VARCHAR(20) DEFAULT 'Beginner',
    CONSTRAINT check_skill_level CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    reset_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create temp_users table (for registration verification)
CREATE TABLE temp_users (
    email VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Create dietary_preferences table
CREATE TABLE dietary_preferences (
    preference_id INTEGER PRIMARY KEY,
    preference_name VARCHAR(255) NOT NULL,
    preference_type VARCHAR(20) NOT NULL
);

-- Create ingredients table
CREATE TABLE ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50)
);

-- Create units table
CREATE TABLE units (
    unit_id INTEGER PRIMARY KEY,
    unit_name VARCHAR(50) NOT NULL
);

-- Create preference_food_group table
CREATE TABLE preference_food_group (
    preference_id INTEGER NOT NULL REFERENCES dietary_preferences(preference_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    allowed SMALLINT DEFAULT 1,
    PRIMARY KEY (preference_id, ingredient_id)
);

-- Create pantry_items table
CREATE TABLE pantry_items (
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) DEFAULT 0,  
    unit VARCHAR(20),                   
    PRIMARY KEY (user_id, ingredient_id)
);

-- Create recipes table
CREATE TABLE recipes (
    recipe_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    cooking_time_min INTEGER NOT NULL,
    CONSTRAINT check_difficulty CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE recipe_nutrition (
    recipe_id INTEGER PRIMARY KEY REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    calories INTEGER,
    protein_g DECIMAL(5,2),
    carbs_g DECIMAL(5,2),
    fat_g DECIMAL(5,2)
);


CREATE TABLE recipe_instructions (
    instruction_id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, step_number)
);


CREATE TABLE cooking_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,  -- Track which step they're on
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe_ingredients table
CREATE TABLE recipe_ingredients (
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit VARCHAR(255),
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Create recipe_stats table
CREATE TABLE recipe_stats (
    recipe_id INTEGER PRIMARY KEY REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    favourite_count INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0,
    total_reviews INTEGER DEFAULT 0
);

-- Create reviews table
CREATE TABLE reviews (
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    rating NUMERIC NOT NULL CHECK (rating >= 0 AND rating <= 5),
    review_text VARCHAR(255),
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

-- Create favourites table
CREATE TABLE favourites (
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, recipe_id)
);

-- Create user_preference table
CREATE TABLE user_preference (
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    preference_id INTEGER NOT NULL REFERENCES dietary_preferences(preference_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, preference_id)
);


CREATE TABLE cuisines (
    cuisine_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Bridge table for user's preferred cuisines (Workflow 1)
CREATE TABLE user_cuisine_preference (
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(cuisine_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, cuisine_id)
);

-- 3. Bridge table for recipe cuisines 
CREATE TABLE recipe_cuisines (
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(cuisine_id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, cuisine_id)
);



-- Workflow 3

-- Active meal plans (auto-delete after week ends)
CREATE TABLE meal_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start)
);

-- Active meal slots
CREATE TABLE meal_plan_recipes (
    plan_id INTEGER NOT NULL REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id),
    day_of_week VARCHAR(10) NOT NULL,
     is_cooked BOOLEAN DEFAULT FALSE,
    meal_type VARCHAR(10) NOT NULL,
    PRIMARY KEY (plan_id, day_of_week, meal_type)
);

-- Templates (permanent)
CREATE TABLE saved_plan_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id),
    name VARCHAR(100) NOT NULL,
    meal_data JSON NOT NULL,  -- Full copy of the plan structure
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Shopping list container
CREATE TABLE shopping_lists (
    list_id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping list items
CREATE TABLE shopping_list_items (
    list_id INTEGER NOT NULL REFERENCES shopping_lists(list_id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity VARCHAR(50),
    category VARCHAR(50),
    is_checked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (list_id, ingredient_name)
);

-- Indexes for performance

-- Create indexes for better performance
CREATE INDEX idx_pantry_items_user ON pantry_items(user_id);
CREATE INDEX idx_pantry_items_ingredient ON pantry_items(ingredient_id);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_recipe ON reviews(recipe_id);
CREATE INDEX idx_favourites_user ON favourites(user_id);
CREATE INDEX idx_favourites_recipe ON favourites(recipe_id);
CREATE INDEX idx_user_preference_user ON user_preference(user_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_user_cuisine_user ON user_cuisine_preference(user_id);
CREATE INDEX idx_user_cuisine_cuisine ON user_cuisine_preference(cuisine_id);
CREATE INDEX idx_recipe_cuisines_recipe ON recipe_cuisines(recipe_id);
CREATE INDEX idx_recipe_cuisines_cuisine ON recipe_cuisines(cuisine_id);


-- Insert cuisines
INSERT INTO cuisines (name) VALUES
('Italian'),
('Mexican'),
('Chinese'),
('Indian'),
('Japanese'),
('Thai'),
('French'),
('Greek'),
('Spanish'),
('American'),
('Mediterranean'),
('Middle Eastern'),
('Korean'),
('Vietnamese'),
('Caribbean');

-- Insert sample data for dietary preferences
INSERT INTO dietary_preferences (preference_id, preference_name, preference_type) VALUES
(1, 'Vegetarian', 'Restrictions'),
(2, 'Vegan', 'Restrictions'),
(3, 'Pescatarian', 'Restrictions'),
(4, 'Gluten-free', 'Allergies'),
(5, 'Dairy-free', 'Allergies'),
(6, 'Nut-free', 'Allergies'),
(7, 'Soy-free', 'Allergies'),
(8, 'Egg-free', 'Allergies'),
(9, 'Shellfish-free', 'Allergies'),
(10, 'Halal', 'Religious'),
(11, 'Kosher', 'Religious');

-- Insert sample data for units
INSERT INTO units (unit_id, unit_name) VALUES
(1, 'grams'),
(2, 'kg'),
(3, 'ml'),
(4, 'liters'),
(5, 'cups'),
(6, 'tablespoons'),
(7, 'teaspoons'),
(8, 'count'),
(9, 'pinch'),
(10, 'ounces');

-- Insert sample data for ingredients
INSERT INTO ingredients (ingredient_name, category) VALUES
('Chicken Breast', 'Poultry'),
('Beef Steak', 'Meat'),
('Salmon', 'Fish'),
('Eggs', 'Eggs'),
('Milk', 'Dairy'),
('Cheese', 'Dairy'),
('Flour', 'Grains'),
('Rice', 'Grains'),
('Tomato', 'Vegetable'),
('Onion', 'Vegetable'),
('Garlic', 'Vegetable'),
('Potato', 'Vegetable'),
('Carrot', 'Vegetable'),
('Apple', 'Fruit'),
('Banana', 'Fruit'),
('Almonds', 'Nuts'),
('Peanuts', 'Nuts'),
('Olive Oil', 'Oils'),
('Butter', 'Dairy'),
('Sugar', 'Sweets'),
('Salt', 'Spices'),
('Black Pepper', 'Spices');

-- Insert preference food group restrictions
INSERT INTO preference_food_group (preference_id, ingredient_id, allowed) VALUES
-- Vegetarian (no meat, poultry, fish)
(1, 1, 0), (1, 2, 0), (1, 3, 0),
-- Vegan (no animal products)
(2, 1, 0), (2, 2, 0), (2, 3, 0), (2, 4, 0), (2, 5, 0), (2, 6, 0), (2, 19, 0),
-- Pescatarian (no meat, poultry)
(3, 1, 0), (3, 2, 0),
-- Dairy-free
(5, 5, 0), (5, 6, 0), (5, 19, 0),
-- Nut-free
(6, 16, 0), (6, 17, 0),
-- Egg-free
(8, 4, 0);

-- Insert sample users (passwords are plaintext in this example - should be hashed in production)
INSERT INTO app_users (email, password_hash, reset_code) VALUES
('john@example.com', 'pass123', NULL),
('jane@example.com', 'pass456', NULL),
('mike@example.com', 'pass789', NULL),
('lisa@example.com', 'pass101', NULL),
('tom@example.com', 'pass202', NULL);

-- Insert sample recipes
INSERT INTO recipes (user_id, title, cooking_time_min, instructions) VALUES
(1, 'Vegetable Stir Fry', 20, 'Heat oil in a wok. Add vegetables and stir fry for 10 minutes.'),
(2, 'Vegan Salad', 15, 'Chop all vegetables. Mix with dressing.'),
(3, 'Grilled Chicken', 30, 'Season chicken. Grill for 15 minutes each side.'),
(4, 'Rice Pilaf', 25, 'Sauté onions. Add rice and water. Cook until done.'),
(5, 'Baked Salmon', 35, 'Season salmon. Bake at 350°F for 25 minutes.');

-- Insert recipe ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
-- Vegetable Stir Fry
(1, 9, 2, 'pieces'), (1, 10, 1, 'piece'), (1, 11, 3, 'cloves'), (1, 12, 2, 'pieces'), (1, 13, 1, 'piece'),
-- Vegan Salad
(2, 9, 1, 'piece'), (2, 14, 1, 'piece'), (2, 15, 2, 'pieces'),
-- Grilled Chicken
(3, 1, 2, 'pieces'), (3, 10, 1, 'piece'), (3, 11, 2, 'cloves'),
-- Rice Pilaf
(4, 8, 1, 'cup'), (4, 10, 1, 'piece'), (4, 18, 2, 'tablespoons'),
-- Baked Salmon
(5, 3, 1, 'piece'), (5, 11, 2, 'cloves'), (5, 18, 1, 'tablespoon');

-- Insert sample pantry items
INSERT INTO pantry_items (user_id, ingredient_id) VALUES
(1, 9), (1, 10), (1, 11),
(2, 14), (2, 15),
(3, 1), (3, 7),
(4, 8), (4, 9),
(5, 3), (5, 12);

-- Insert sample user preferences
INSERT INTO user_preference (user_id, preference_id) VALUES
(2, 2),  -- Jane is vegan
(3, 5),  -- Mike is dairy-free
(4, 6),  -- Lisa is nut-free
(5, 10); -- Tom follows halal

-- Insert sample reviews
INSERT INTO reviews (user_id, recipe_id, rating, review_text, review_date) VALUES
(1, 2, 4.5, 'Great vegan recipe!', '2024-12-01'),
(2, 1, 4, 'Tasty and healthy', '2024-12-02'),
(3, 5, 5, 'Perfect salmon recipe', '2024-12-03'),
(4, 3, 3.5, 'Good but needs more seasoning', '2024-12-04'),
(5, 4, 4.5, 'Excellent rice dish', '2024-12-05');

-- Insert sample favourites
INSERT INTO favourites (user_id, recipe_id) VALUES
(1, 4), (1, 5),
(2, 1), (2, 4),
(3, 5),
(4, 3),
(5, 4);
