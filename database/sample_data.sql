-- ============================================================
--  PANTRYPAL - SAMPLE TEST DATA
--  Populate tables needed for Workflow 3 testing
-- ============================================================

-- Clear existing data if needed (tables drop in dependency order)
-- TRUNCATE TABLE shopping_list_items CASCADE;
-- TRUNCATE TABLE shopping_lists CASCADE;
-- TRUNCATE TABLE meal_plan_recipes CASCADE;
-- TRUNCATE TABLE meal_plans CASCADE;
-- TRUNCATE TABLE pantry_items CASCADE;
-- TRUNCATE TABLE recipe_dietary_tags CASCADE;
-- TRUNCATE TABLE recipe_cuisines CASCADE;
-- TRUNCATE TABLE recipe_ingredients CASCADE;
-- TRUNCATE TABLE recipe_instructions CASCADE;
-- TRUNCATE TABLE recipe_nutrition CASCADE;
-- TRUNCATE TABLE recipes CASCADE;
-- TRUNCATE TABLE favourites CASCADE;
-- TRUNCATE TABLE reviews CASCADE;
-- TRUNCATE TABLE user_cuisine_preference CASCADE;
-- TRUNCATE TABLE user_preference CASCADE;
-- TRUNCATE TABLE app_users CASCADE;


-- ============================================================
--  TEST USERS
-- ============================================================

INSERT INTO app_users (email, password_hash, skill_level) VALUES
('john@example.com', 'hashed_password_123', 'Beginner'),
('sarah@example.com', 'hashed_password_456', 'Intermediate'),
('mike@example.com', 'hashed_password_789', 'Advanced'),
('emma@example.com', 'hashed_password_101', 'Beginner');

-- Note: user_id 1 = john@example.com, user_id 2 = sarah@example.com, etc.


-- ============================================================
--  RECIPES (Published recipes for testing)
-- ============================================================

-- Recipe 1: Spaghetti Carbonara (Italian)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status) 
VALUES (1, 'Spaghetti Carbonara', 'Easy', 20, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (1, 450, 18.5, 52.0, 15.3);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(1, 1, 'Bring a large pot of salted water to boil'),
(1, 2, 'Cook spaghetti according to package directions until al dente'),
(1, 3, 'Meanwhile, cut bacon into small pieces and cook in a pan until crispy'),
(1, 4, 'In a bowl, whisk together eggs, cheese, and black pepper'),
(1, 5, 'Drain pasta, reserving 1 cup of pasta water'),
(1, 6, 'Add hot pasta to bacon and fat, remove from heat'),
(1, 7, 'Pour egg mixture over pasta while tossing constantly'),
(1, 8, 'Add pasta water as needed to achieve creamy sauce');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(1, 8, 400, 'grams'),      -- Rice (using as pasta placeholder)
(1, 4, 4, 'count'),        -- Eggs
(1, 6, 100, 'grams'),      -- Cheese
(1, 21, 2, 'teaspoons'),   -- Black Pepper
(1, 18, 2, 'tablespoons'); -- Olive Oil

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (1, 1); -- Italian

-- Recipe 2: Chicken Stir Fry (Asian)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status)
VALUES (1, 'Chicken Stir Fry', 'Medium', 25, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (2, 380, 42.0, 28.0, 8.5);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(2, 1, 'Slice chicken breast into thin strips'),
(2, 2, 'Heat oil in a wok or large skillet over high heat'),
(2, 3, 'Stir-fry chicken until cooked through, about 6-8 minutes'),
(2, 4, 'Add chopped vegetables (onion, carrot, garlic)'),
(2, 5, 'Cook until vegetables are tender-crisp'),
(2, 6, 'Add soy sauce and ginger'),
(2, 7, 'Toss everything together and serve over rice');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(1, 1, 500, 'grams'),      -- Chicken Breast
(2, 10, 2, 'count'),       -- Onion
(2, 13, 1, 'count'),       -- Carrot
(2, 11, 3, 'teaspoons'),   -- Garlic
(2, 18, 3, 'tablespoons'); -- Olive Oil

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (2, 3); -- Chinese

-- Recipe 3: Greek Salad (Mediterranean)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status)
VALUES (2, 'Greek Salad', 'Easy', 10, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (3, 210, 8.5, 16.0, 12.0);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(3, 1, 'Dice tomatoes into bite-sized pieces'),
(3, 2, 'Cut cucumber into chunks'),
(3, 3, 'Slice red onion thinly'),
(3, 4, 'Combine all vegetables in a large bowl'),
(3, 5, 'Add olives and crumbled feta cheese'),
(3, 6, 'Dress with olive oil and lemon juice'),
(3, 7, 'Season with salt and pepper, toss gently');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(3, 9, 3, 'count'),        -- Tomato
(3, 10, 1, 'count'),       -- Onion
(3, 6, 200, 'grams'),      -- Cheese (feta)
(3, 18, 3, 'tablespoons'), -- Olive Oil
(3, 21, 1, 'teaspoon');    -- Salt

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (3, 8); -- Greek

-- Recipe 4: Beef Tacos (Mexican)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status)
VALUES (2, 'Beef Tacos', 'Easy', 15, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (4, 320, 28.0, 22.0, 10.5);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(4, 1, 'Brown ground beef in a large skillet over medium-high heat'),
(4, 2, 'Drain excess fat from the beef'),
(4, 3, 'Add taco seasoning and water'),
(4, 4, 'Simmer for 5 minutes'),
(4, 5, 'Warm tortillas in a dry skillet'),
(4, 6, 'Fill tortillas with seasoned beef'),
(4, 7, 'Top with tomato, onion, and cheese');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(4, 2, 500, 'grams'),      -- Beef Steak (ground)
(4, 9, 2, 'count'),        -- Tomato
(4, 10, 1, 'count'),       -- Onion
(4, 6, 100, 'grams'),      -- Cheese
(4, 18, 2, 'tablespoons'); -- Olive Oil

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (4, 2); -- Mexican

-- Recipe 5: Salmon with Vegetables (Mediterranean)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status)
VALUES (3, 'Baked Salmon with Vegetables', 'Medium', 30, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (5, 480, 45.0, 18.0, 20.0);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(5, 1, 'Preheat oven to 400°F (200°C)'),
(5, 2, 'Place salmon fillets on a baking sheet'),
(5, 3, 'Arrange diced vegetables (carrot, potato) around salmon'),
(5, 4, 'Drizzle with olive oil and season with salt and pepper'),
(5, 5, 'Bake for 20-25 minutes until salmon is cooked through'),
(5, 6, 'Squeeze fresh lemon juice over everything before serving');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(5, 3, 400, 'grams'),      -- Salmon
(5, 13, 1, 'count'),       -- Carrot
(5, 12, 2, 'count'),       -- Potato
(5, 18, 3, 'tablespoons'), -- Olive Oil
(5, 21, 1, 'teaspoon');    -- Salt

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (5, 11); -- Mediterranean

-- Recipe 6: Vegetable Curry (Indian - Vegetarian)
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status)
VALUES (3, 'Vegetable Curry', 'Medium', 35, 'published');

INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g)
VALUES (6, 280, 10.0, 32.0, 12.0);

INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
(6, 1, 'Heat oil in a large pot'),
(6, 2, 'Sauté onion and garlic until fragrant'),
(6, 3, 'Add curry powder and cook for 1 minute'),
(6, 4, 'Add cubed potatoes, carrots, and tomatoes'),
(6, 5, 'Pour in coconut milk and vegetable broth'),
(6, 6, 'Simmer until vegetables are tender, about 20 minutes'),
(6, 7, 'Season with salt and serve with rice');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(6, 12, 3, 'count'),       -- Potato
(6, 13, 2, 'count'),       -- Carrot
(6, 9, 2, 'count'),        -- Tomato
(6, 10, 1, 'count'),       -- Onion
(6, 11, 3, 'teaspoons'),   -- Garlic
(6, 18, 2, 'tablespoons'); -- Olive Oil

INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES (6, 4); -- Indian
INSERT INTO recipe_dietary_tags (recipe_id, preference_id) VALUES (6, 1); -- Vegetarian


-- ============================================================
--  USER PANTRY (Sample inventory for testing)
-- ============================================================

INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, storage_location) VALUES
(1, 1, 2.0, 'kg', 'Fridge'),      -- Chicken Breast
(1, 4, 12.0, 'count', 'Fridge'),  -- Eggs
(1, 5, 1.0, 'liters', 'Fridge'),  -- Milk
(1, 6, 500.0, 'grams', 'Fridge'), -- Cheese
(1, 7, 1.0, 'kg', 'Pantry'),      -- Flour
(1, 8, 2.0, 'kg', 'Pantry'),      -- Rice
(1, 9, 3.0, 'count', 'Fridge'),   -- Tomato
(1, 10, 2.0, 'count', 'Pantry'),  -- Onion
(1, 11, 1.0, 'count', 'Pantry'),  -- Garlic
(1, 12, 2.0, 'kg', 'Pantry'),     -- Potato
(1, 13, 1.0, 'kg', 'Fridge'),     -- Carrot
(1, 18, 500.0, 'ml', 'Pantry'),   -- Olive Oil
(1, 21, 100.0, 'grams', 'Pantry'),-- Salt
(2, 1, 1.5, 'kg', 'Fridge'),      -- Chicken Breast
(2, 3, 800.0, 'grams', 'Fridge'), -- Salmon
(2, 8, 1.0, 'kg', 'Pantry'),      -- Rice
(2, 18, 250.0, 'ml', 'Pantry');   -- Olive Oil


-- ============================================================
--  USER PREFERENCES (Sample user dietary preferences)
-- ============================================================

INSERT INTO user_preference (user_id, preference_id) VALUES
(2, 1),  -- Sarah: Vegetarian
(3, 4);  -- Mike: Gluten-free

INSERT INTO user_cuisine_preference (user_id, cuisine_id) VALUES
(1, 1),  -- John: Italian
(1, 3),  -- John: Chinese
(2, 8),  -- Sarah: Greek
(2, 4),  -- Sarah: Indian
(3, 11); -- Mike: Mediterranean


-- ============================================================
--  REVIEWS & RATINGS
-- ============================================================

INSERT INTO reviews (user_id, recipe_id, rating, review_text) VALUES
(1, 1, 5, 'Best carbonara I ever made!'),
(1, 2, 4, 'Great weekday dinner'),
(2, 3, 5, 'Perfect light lunch'),
(2, 6, 5, 'Delicious and vegetarian friendly'),
(3, 4, 4, 'Quick and satisfying'),
(3, 5, 5, 'Restaurant quality at home');

-- Update recipe_stats via the reviews (this happens if you have update triggers)
-- Or manually update recipe_stats after inserting reviews


-- ============================================================
--  FAVOURITES
-- ============================================================

INSERT INTO favourites (user_id, recipe_id) VALUES
(1, 1),  -- John loves Carbonara
(1, 2),  -- John loves Stir Fry
(2, 3),  -- Sarah loves Greek Salad
(2, 6),  -- Sarah loves Vegetable Curry
(3, 5);  -- Mike loves Baked Salmon
