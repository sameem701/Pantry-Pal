-- ============================================================
--  PANTRYPAL  ·  sample_data_2.sql
--  Comprehensive seed data — covers every table in the schema:
--
--  NOTE: Reference table seeds (cuisines, dietary_preferences, units)
--        are included below with ON CONFLICT DO NOTHING so this file
--        can be run standalone or on top of an existing schema.sql.
-- ============================================================

-- ============================================================
--  REFERENCE DATA  (safe to re-run — skips duplicates)
-- ============================================================

-- Cuisines (auto-increment id — only insert if table is empty)
INSERT INTO cuisines (cuisine_id, name) VALUES
(1,'Italian'),(2,'Mexican'),(3,'Chinese'),(4,'Indian'),(5,'Japanese'),
(6,'Thai'),(7,'French'),(8,'Greek'),(9,'Spanish'),(10,'American'),
(11,'Mediterranean'),(12,'Middle Eastern'),(13,'Korean'),(14,'Vietnamese'),(15,'Caribbean')
ON CONFLICT (cuisine_id) DO NOTHING;

-- Dietary preferences
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
(11, 'Kosher',        'Religious')
ON CONFLICT (preference_id) DO NOTHING;

-- Units
INSERT INTO units (unit_id, unit_name) VALUES
(1,'grams'),(2,'kg'),(3,'ml'),(4,'liters'),(5,'cups'),
(6,'tablespoons'),(7,'teaspoons'),(8,'count'),(9,'pinch'),(10,'ounces')
ON CONFLICT (unit_id) DO NOTHING;

-- ============================================================
--  PANTRYPAL  ·  sample_data_2.sql
--  Comprehensive seed data — covers every table in the schema:
--    app_users, user_preference, user_cuisine_preference,
--    pantry_items, recipes, recipe_nutrition, recipe_instructions,
--    recipe_ingredients, recipe_cuisines, recipe_dietary_tags,
--    reviews, favourites, cooking_sessions,
--    meal_plans, meal_plan_recipes, saved_plan_templates,
--    shopping_lists, shopping_list_items
--
--  Scenarios covered:
--    • 8 users: beginner, intermediate, advanced; various dietary prefs
--    • 30 published recipes + 3 draft recipes spanning 10 cuisines
--    • Complete nutrition data for every recipe
--    • 3–7 step-by-step instructions per recipe
--    • Ingredients from every category (poultry, meat, fish, shellfish,
--      dairy, grains, vegetables, fruits, legumes, nuts, oils, spices,
--      condiments, sweeteners, soy/plant-based, pork)
--    • Pantry items for all users (fridge/pantry/freezer locations)
--    • Multiple meal plans with full week coverage
--    • Reviews and ratings for most recipes
--    • Favourites, cooking sessions, shopping lists
--    • 3 saved plan templates
--
--  NOTE: Assumes schema.sql has already been run.
--        All ingredient_id/unit_id values match schema.sql seed data.
-- ============================================================

-- ============================================================
--  USERS  (passwords are bcrypt hash of "Password1!")
-- ============================================================
INSERT INTO app_users (user_id, email, password_hash, skill_level, created_at) VALUES
(101, 'alice@example.com',   '$2b$10$ExampleHashAlice1234567890123456789012', 'Beginner',     '2024-11-01 09:00:00'),
(102, 'bob@example.com',     '$2b$10$ExampleHashBob12345678901234567890123', 'Intermediate', '2024-11-05 10:30:00'),
(103, 'cara@example.com',    '$2b$10$ExampleHashCara1234567890123456789012', 'Advanced',     '2024-11-10 08:15:00'),
(104, 'david@example.com',   '$2b$10$ExampleHashDavid123456789012345678901', 'Beginner',     '2024-12-01 12:00:00'),
(105, 'elena@example.com',   '$2b$10$ExampleHashElena123456789012345678901', 'Intermediate', '2024-12-10 16:45:00'),
(106, 'frank@example.com',   '$2b$10$ExampleHashFrank123456789012345678901', 'Advanced',     '2025-01-03 11:00:00'),
(107, 'grace@example.com',   '$2b$10$ExampleHashGrace123456789012345678901', 'Beginner',     '2025-01-15 09:30:00'),
(108, 'henry@example.com',   '$2b$10$ExampleHashHenry123456789012345678901', 'Intermediate', '2025-02-01 14:00:00');

SELECT setval('app_users_user_id_seq', 200);

-- ============================================================
--  USER PREFERENCES
-- ============================================================
INSERT INTO user_preference (user_id, preference_id) VALUES
-- alice: Vegetarian
(101, 1),
-- bob: Gluten-free
(102, 4),
-- cara: no restrictions
-- david: Vegan + Nut-free
(104, 2),(104, 6),
-- elena: Pescatarian + Dairy-free
(105, 3),(105, 5),
-- frank: Halal
(106, 10),
-- grace: Egg-free
(107, 8),
-- henry: Kosher
(108, 11);

-- ============================================================
--  USER CUISINE PREFERENCES
-- ============================================================
INSERT INTO user_cuisine_preference (user_id, cuisine_id) VALUES
(101, 4),(101,11),         -- alice: Indian, Mediterranean
(102, 3),(102, 6),         -- bob:   Chinese, Thai
(103, 1),(103, 7),(103,8), -- cara:  Italian, French, Greek
(104, 4),(104, 13),        -- david: Indian, Korean
(105, 14),(105, 6),        -- elena: Vietnamese, Thai
(106, 12),(106, 10),       -- frank: Middle Eastern, American
(107, 2),(107, 9),         -- grace: Mexican, Spanish
(108, 1),(108, 8);         -- henry: Italian, Greek

-- ============================================================
--  RECIPES  (30 published + 3 draft)
--  Created by various users; cooking_time_min in minutes
-- ============================================================
INSERT INTO recipes (recipe_id, user_id, title, difficulty, cooking_time_min, image_url, status, created_at) VALUES
-- Italian
(1,  103, 'Classic Spaghetti Bolognese',          'Medium', 60,  NULL, 'published', '2024-11-12 10:00:00'),
(2,  103, 'Chicken Parmigiana',                   'Medium', 50,  NULL, 'published', '2024-11-14 11:00:00'),
(3,  103, 'Mushroom Risotto',                     'Hard',   45,  NULL, 'published', '2024-11-15 12:00:00'),
-- Indian
(4,  101, 'Butter Chicken',                       'Medium', 55,  NULL, 'published', '2024-11-20 09:00:00'),
(5,  101, 'Dal Tadka',                            'Easy',   40,  NULL, 'published', '2024-11-22 10:00:00'),
(6,  106, 'Lamb Biryani',                         'Hard',   90,  NULL, 'published', '2024-11-25 08:00:00'),
-- Mexican
(7,  107, 'Beef Tacos',                           'Easy',   30,  NULL, 'published', '2024-12-01 09:00:00'),
(8,  107, 'Chicken Quesadillas',                  'Easy',   25,  NULL, 'published', '2024-12-03 10:00:00'),
(9,  107, 'Vegetarian Black Bean Burrito',        'Easy',   30,  NULL, 'published', '2024-12-05 11:00:00'),
-- Chinese
(10, 102, 'Kung Pao Chicken',                     'Medium', 35,  NULL, 'published', '2024-12-08 09:00:00'),
(11, 102, 'Beef Fried Rice',                      'Easy',   25,  NULL, 'published', '2024-12-10 10:00:00'),
(12, 102, 'Sweet and Sour Pork',                  'Medium', 40,  NULL, 'published', '2024-12-12 11:00:00'),
-- Japanese
(13, 103, 'Salmon Teriyaki',                      'Easy',   30,  NULL, 'published', '2024-12-15 09:00:00'),
(14, 103, 'Chicken Ramen',                        'Hard',   120, NULL, 'published', '2024-12-16 10:00:00'),
(15, 108, 'Tuna Sushi Rolls',                     'Hard',   60,  NULL, 'published', '2024-12-18 11:00:00'),
-- Thai
(16, 105, 'Pad Thai with Shrimp',                 'Medium', 35,  NULL, 'published', '2025-01-05 09:00:00'),
(17, 105, 'Green Chicken Curry',                  'Medium', 45,  NULL, 'published', '2025-01-07 10:00:00'),
(18, 102, 'Tom Yum Soup',                         'Medium', 30,  NULL, 'published', '2025-01-09 11:00:00'),
-- Mediterranean / Greek
(19, 103, 'Greek Salad with Grilled Chicken',     'Easy',   20,  NULL, 'published', '2025-01-12 09:00:00'),
(20, 108, 'Lamb Souvlaki',                        'Medium', 40,  NULL, 'published', '2025-01-14 10:00:00'),
(21, 103, 'Moussaka',                             'Hard',   90,  NULL, 'published', '2025-01-16 11:00:00'),
-- American
(22, 106, 'Classic Beef Burger',                  'Easy',   25,  NULL, 'published', '2025-01-20 09:00:00'),
(23, 106, 'BBQ Chicken Wings',                    'Easy',   50,  NULL, 'published', '2025-01-22 10:00:00'),
(24, 104, 'Veggie Lentil Soup',                   'Easy',   45,  NULL, 'published', '2025-01-25 11:00:00'),
-- Vietnamese / Middle Eastern
(25, 105, 'Vietnamese Pho',                       'Hard',   180, NULL, 'published', '2025-02-01 09:00:00'),
(26, 106, 'Falafel Wrap',                         'Medium', 40,  NULL, 'published', '2025-02-03 10:00:00'),
(27, 106, 'Shakshuka',                            'Easy',   30,  NULL, 'published', '2025-02-05 11:00:00'),
-- High-protein / Carb-rich
(28, 102, 'Grilled Salmon with Quinoa',           'Medium', 35,  NULL, 'published', '2025-02-08 09:00:00'),
(29, 103, 'Protein Pancakes',                     'Easy',   20,  NULL, 'published', '2025-02-10 10:00:00'),
(30, 104, 'Avocado Toast with Poached Eggs',      'Easy',   15,  NULL, 'published', '2025-02-12 11:00:00'),
-- Draft recipes
(31, 101, 'Experimental Tofu Stir-Fry',           'Medium', 30,  NULL, 'draft',     '2025-03-01 09:00:00'),
(32, 107, 'Loaded Nachos (WIP)',                  'Easy',   20,  NULL, 'draft',     '2025-03-05 10:00:00'),
(33, 105, 'Coconut Fish Curry (Draft)',           'Medium', 45,  NULL, 'draft',     '2025-03-10 11:00:00');

SELECT setval('recipes_recipe_id_seq', 100);

-- ============================================================
--  RECIPE NUTRITION  (all 33 recipes)
-- ============================================================
INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g) VALUES
(1,  650,  38.0, 72.0, 22.0),
(2,  720,  52.0, 45.0, 28.0),
(3,  480,  14.0, 68.0, 16.0),
(4,  680,  42.0, 28.0, 38.0),
(5,  380,  22.0, 58.0,  6.0),
(6,  820,  48.0, 85.0, 24.0),
(7,  520,  32.0, 38.0, 22.0),
(8,  580,  38.0, 42.0, 20.0),
(9,  460,  18.0, 68.0, 12.0),
(10, 580,  40.0, 32.0, 28.0),
(11, 540,  22.0, 74.0, 14.0),
(12, 620,  38.0, 48.0, 26.0),
(13, 480,  42.0, 24.0, 20.0),
(14, 720,  48.0, 78.0, 18.0),
(15, 380,  28.0, 52.0,  8.0),
(16, 560,  32.0, 64.0, 18.0),
(17, 620,  38.0, 32.0, 32.0),
(18, 280,  18.0, 22.0, 12.0),
(19, 420,  48.0, 12.0, 18.0),
(20, 680,  52.0, 18.0, 36.0),
(21, 780,  42.0, 58.0, 38.0),
(22, 820,  48.0, 52.0, 42.0),
(23, 680,  48.0, 12.0, 42.0),
(24, 320,  16.0, 52.0,  6.0),
(25, 420,  28.0, 52.0, 10.0),
(26, 480,  16.0, 68.0, 14.0),
(27, 280,  16.0, 18.0, 16.0),
(28, 520,  52.0, 32.0, 20.0),
(29, 380,  28.0, 42.0, 12.0),
(30, 340,  18.0, 32.0, 16.0),
(31, 340,  22.0, 36.0, 12.0),
(32, 580,  18.0, 62.0, 28.0),
(33, 480,  30.0, 28.0, 26.0);
-- ============================================================
--  RECIPE INSTRUCTIONS
--  step_number is 1-indexed per recipe
-- ============================================================
INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES
-- 1: Classic Spaghetti Bolognese
(1,1,'Heat olive oil in a large pan over medium heat. Add diced onion, carrot, and celery; cook for 8 minutes until softened.'),
(1,2,'Add minced garlic and cook for 1 minute. Add ground beef and cook, breaking it up, until browned all over.'),
(1,3,'Pour in red wine and let it reduce by half. Add crushed tomatoes, tomato paste, and a pinch of sugar.'),
(1,4,'Reduce heat to low and simmer for 30 minutes, stirring occasionally. Season with salt, pepper, and fresh basil.'),
(1,5,'Cook spaghetti in salted boiling water until al dente. Drain and toss with the bolognese sauce. Serve with parmesan.'),
-- 2: Chicken Parmigiana
(2,1,'Pound chicken breasts to 1 cm thickness. Season with salt and pepper.'),
(2,2,'Dredge chicken in flour, dip in beaten egg, then coat with panko breadcrumbs.'),
(2,3,'Fry in hot olive oil for 3 minutes per side until golden. Transfer to a baking dish.'),
(2,4,'Top each piece with marinara sauce and sliced mozzarella. Bake at 200 C for 15 minutes until cheese is bubbling.'),
(2,5,'Serve over spaghetti or with a green salad. Garnish with fresh basil.'),
-- 3: Mushroom Risotto
(3,1,'Warm 1.5 L vegetable stock in a saucepan and keep at a gentle simmer.'),
(3,2,'Saute diced shallots in butter and olive oil for 5 minutes. Add sliced mushrooms and cook until golden.'),
(3,3,'Add arborio rice and stir for 2 minutes until edges turn translucent. Pour in white wine and stir until absorbed.'),
(3,4,'Add stock one ladle at a time, stirring constantly and waiting until each addition is absorbed (about 18 minutes total).'),
(3,5,'Remove from heat. Stir in cold butter and grated parmesan. Season generously. Rest for 2 minutes before serving.'),
-- 4: Butter Chicken
(4,1,'Marinate chicken pieces in yogurt, lemon juice, cumin, turmeric, garam masala, and chili powder for at least 1 hour.'),
(4,2,'Grill or pan-fry marinated chicken until charred and cooked through. Set aside.'),
(4,3,'Melt butter in a deep pan. Saute onion until golden, then add garlic paste and ginger paste. Cook for 2 minutes.'),
(4,4,'Add canned tomatoes, cream, and kasuri methi. Simmer for 15 minutes until sauce thickens.'),
(4,5,'Add the chicken pieces, stir to coat, and simmer for 10 minutes. Adjust seasoning and garnish with cream and coriander.'),
-- 5: Dal Tadka
(5,1,'Rinse red lentils (masoor dal) until water runs clear. Boil in 3 cups water with turmeric and salt for 20 minutes until soft.'),
(5,2,'Mash lentils lightly with a spoon. Add more water if too thick.'),
(5,3,'Heat ghee in a small pan (tadka pan). Add cumin seeds and let them splutter.'),
(5,4,'Add chopped onion, garlic, green chili, and tomatoes. Cook until tomatoes break down.'),
(5,5,'Pour the tadka over the cooked dal. Stir in garam masala. Garnish with coriander and serve with basmati rice or naan.'),
-- 6: Lamb Biryani
(6,1,'Marinate lamb pieces in yogurt, biryani masala, ginger-garlic paste, and food-grade saffron for 2 hours.'),
(6,2,'Parboil basmati rice until 70% cooked. Drain and set aside.'),
(6,3,'Fry sliced onions until deeply golden (birista). Set aside. In the same oil cook marinated lamb for 10 minutes.'),
(6,4,'Layer: half the rice on the lamb, sprinkle fried onions, mint, and a few saffron strands. Top with remaining rice.'),
(6,5,'Seal the pot with a tight lid or dough. Cook on very low heat (dum) for 25 minutes. Rest for 10 minutes before serving.'),
-- 7: Beef Tacos
(7,1,'Season ground beef with cumin, chili powder, garlic powder, and smoked paprika.'),
(7,2,'Cook beef in a hot skillet over medium-high heat until browned. Drain excess fat.'),
(7,3,'Warm corn tortillas in a dry skillet or directly over a gas flame.'),
(7,4,'Fill tortillas with seasoned beef. Top with shredded lettuce, diced tomato, cheese, sour cream, and salsa.'),
-- 8: Chicken Quesadillas
(8,1,'Season chicken breasts and cook in a pan for 6-7 minutes per side. Rest, then slice thinly.'),
(8,2,'Place a large flour tortilla in a hot skillet. Top half with chicken slices, black beans, corn, and grated cheddar.'),
(8,3,'Fold tortilla and cook 2-3 minutes per side until golden and cheese is melted.'),
(8,4,'Slice into wedges and serve with guacamole and salsa.'),
-- 9: Vegetarian Black Bean Burrito
(9,1,'Saute diced onion and bell pepper in olive oil for 5 minutes. Add garlic and cumin; cook 1 minute.'),
(9,2,'Add canned black beans and smashed. Season with salt, chili powder, and lime juice. Cook for 5 minutes.'),
(9,3,'Warm flour tortillas. Spread with the bean mixture. Add cooked rice, diced tomatoes, and sliced avocado.'),
(9,4,'Roll tightly into burritos and serve with hot sauce.'),
-- 10: Kung Pao Chicken
(10,1,'Marinate diced chicken in soy sauce, rice wine, and cornstarch for 15 minutes.'),
(10,2,'Make sauce: mix soy sauce, black vinegar, sugar, and cornstarch with water. Set aside.'),
(10,3,'Stir-fry dried red chilies and Sichuan peppercorns in hot oil for 30 seconds. Add chicken and cook until browned.'),
(10,4,'Add diced zucchini and celery; stir-fry 2 minutes. Pour in sauce and toss to coat.'),
(10,5,'Add roasted peanuts and spring onions. Toss quickly and serve over steamed rice.'),
-- 11: Beef Fried Rice
(11,1,'Cook jasmine rice the day before and refrigerate (day-old rice is best for frying).'),
(11,2,'Fry thin strips of beef with garlic and ginger in high-heat oil until cooked. Remove from wok.'),
(11,3,'Scramble eggs in the wok, then add rice and toss constantly over high heat.'),
(11,4,'Return beef to wok. Add soy sauce, sesame oil, and oyster sauce. Toss to combine.'),
(11,5,'Garnish with sliced spring onions and sesame seeds. Serve immediately.'),
-- 12: Sweet and Sour Pork
(12,1,'Cut pork shoulder into cubes. Coat in a mixture of cornstarch, egg, and salt.'),
(12,2,'Deep-fry pork until golden and crispy. Drain on paper towels.'),
(12,3,'Make sweet and sour sauce: combine ketchup, rice vinegar, pineapple juice, sugar, and cornstarch.'),
(12,4,'Stir-fry bell peppers, onion, and pineapple chunks for 2 minutes. Add sauce and bring to a boil.'),
(12,5,'Add fried pork and toss to coat. Serve immediately over steamed rice.'),
-- 13: Salmon Teriyaki
(13,1,'Pat salmon fillets dry. Season lightly with salt.'),
(13,2,'Make teriyaki sauce: mix soy sauce, mirin, sake, and sugar in a small pan. Simmer until slightly thickened.'),
(13,3,'Pan-sear salmon skin-side down for 4 minutes. Flip and cook 2 more minutes.'),
(13,4,'Pour teriyaki sauce over the salmon in the pan and let it caramelise for 1 minute.'),
(13,5,'Serve over steamed rice with steamed broccoli. Garnish with sesame seeds and sliced spring onions.'),
-- 14: Chicken Ramen
(14,1,'Make broth: simmer chicken carcass with kombu, ginger, garlic, and spring onions for 2 hours. Strain.'),
(14,2,'Season broth with soy sauce, mirin, and sesame oil (shoyu tare). Taste and adjust.'),
(14,3,'Poach chicken thighs gently in the broth for 18 minutes. Rest and slice.'),
(14,4,'Cook fresh ramen noodles according to package directions. Drain.'),
(14,5,'Soft-boil eggs for 6.5 minutes, peel, and marinate in soy sauce, mirin, and water for 30 minutes.'),
(14,6,'Assemble bowls: noodles in broth, topped with chicken, halved egg, nori, bamboo shoots, and spring onions.'),
-- 15: Tuna Sushi Rolls
(15,1,'Cook sushi rice, then season with a mixture of rice vinegar, sugar, and salt while still warm. Fan to cool.'),
(15,2,'Lay a nori sheet on a bamboo mat, shiny side down. Spread an even thin layer of sushi rice over two-thirds of the nori.'),
(15,3,'Place sliced sashimi-grade tuna and sliced avocado along the near edge of the rice.'),
(15,4,'Roll tightly away from you using the mat, pressing gently. Seal the edge with a dab of water.'),
(15,5,'Cut into 8 pieces using a wet, sharp knife. Serve with soy sauce, pickled ginger, and wasabi.'),
-- 16: Pad Thai with Shrimp
(16,1,'Soak flat rice noodles in room-temperature water for 30 minutes until pliable. Drain.'),
(16,2,'Make pad thai sauce: mix tamarind paste, fish sauce, palm sugar, and a splash of water.'),
(16,3,'Stir-fry shrimp in oil until pink. Push to the side; scramble two eggs in the centre.'),
(16,4,'Add noodles and pour over the sauce. Toss everything together over high heat for 2 minutes.'),
(16,5,'Stir in bean sprouts and spring onions. Serve topped with crushed peanuts, lime wedge, and dried chili flakes.'),
-- 17: Green Chicken Curry
(17,1,'Fry green curry paste in coconut oil for 2 minutes until fragrant.'),
(17,2,'Add sliced chicken breast and cook until opaque.'),
(17,3,'Pour in coconut milk and bring to a gentle simmer.'),
(17,4,'Add Thai eggplant, baby corn, and kaffir lime leaves. Simmer for 10 minutes.'),
(17,5,'Season with fish sauce and palm sugar. Garnish with Thai basil and serve with jasmine rice.'),
-- 18: Tom Yum Soup
(18,1,'Bring 1.5 L chicken or vegetable stock to a boil. Add lemongrass, galangal, and kaffir lime leaves. Simmer 5 minutes.'),
(18,2,'Add mushrooms and shrimp or chicken. Cook until protein is just done.'),
(18,3,'Remove from heat. Add fish sauce, lime juice, and chili paste (nam prik pao). Adjust sweet/sour/spicy balance.'),
(18,4,'Serve in bowls garnished with fresh coriander and sliced red chili.'),
-- 19: Greek Salad with Grilled Chicken
(19,1,'Marinate chicken in lemon juice, oregano, garlic, and olive oil for 30 minutes.'),
(19,2,'Grill or pan-fry chicken for 5-6 minutes per side until cooked through. Rest and slice.'),
(19,3,'Combine chopped cucumber, tomatoes, red onion, Kalamata olives, and feta cheese in a bowl.'),
(19,4,'Dress with extra-virgin olive oil, red wine vinegar, dried oregano, salt, and pepper. Toss gently.'),
(19,5,'Top salad with sliced chicken and serve with warm pita bread.'),
-- 20: Lamb Souvlaki
(20,1,'Cut lamb leg into 3 cm cubes. Marinate in olive oil, lemon juice, garlic, oregano, and thyme for 2 hours.'),
(20,2,'Thread lamb onto metal skewers, alternating with pieces of red pepper and red onion.'),
(20,3,'Grill over high heat for 12-15 minutes, turning regularly, until slightly charred and cooked medium.'),
(20,4,'Make tzatziki: grate cucumber, squeeze out water, mix with Greek yogurt, garlic, dill, and lemon juice.'),
(20,5,'Serve souvlaki in warm pita with tzatziki, sliced tomatoes, and red onion.'),
-- 21: Moussaka
(21,1,'Slice eggplants and salt them for 30 minutes to draw out moisture. Pat dry and brush with olive oil. Grill until golden.'),
(21,2,'Brown ground lamb with onion, garlic, cinnamon, allspice, and red wine. Add crushed tomatoes and simmer 20 minutes.'),
(21,3,'Make bechamel sauce: melt butter, whisk in flour, gradually add hot milk, stir until thick. Season with nutmeg.'),
(21,4,'Layer in a deep baking dish: potato slices, eggplant, meat sauce, remaining eggplant, then bechamel.'),
(21,5,'Sprinkle with grated kefalotyri or parmesan. Bake at 180 C for 45 minutes until top is golden. Rest 20 minutes.'),
-- 22: Classic Beef Burger
(22,1,'Mix ground beef with Worcestershire sauce, garlic powder, onion powder, salt, and pepper. Form into patties.'),
(22,2,'Cook patties on a very hot grill or cast-iron pan for 3-4 minutes per side for medium.'),
(22,3,'Toast brioche buns on the grill.'),
(22,4,'Build: bottom bun, lettuce, tomato, patty, American cheese (added 1 min before end), pickles, mustard, ketchup, bun.'),
-- 23: BBQ Chicken Wings
(23,1,'Pat chicken wings dry. Toss with baking powder, salt, pepper, garlic powder, and smoked paprika.'),
(23,2,'Place wings on a rack over a baking sheet. Bake at 220 C for 20 minutes, flip, and bake 20 more minutes.'),
(23,3,'Make BBQ glaze: simmer ketchup, brown sugar, apple cider vinegar, Worcestershire sauce, and smoked paprika.'),
(23,4,'Toss baked wings in the hot BBQ glaze. Serve with celery sticks and blue cheese dip.'),
-- 24: Veggie Lentil Soup
(24,1,'Saute diced onion, carrot, and celery in olive oil for 8 minutes.'),
(24,2,'Add garlic, cumin, coriander, smoked paprika, and turmeric; cook for 1 minute.'),
(24,3,'Add rinsed red lentils, canned tomatoes, and 1.5 L vegetable stock. Bring to a boil.'),
(24,4,'Reduce heat and simmer 25 minutes until lentils are completely soft.'),
(24,5,'Blend half the soup for a creamier texture. Season with lemon juice, salt, and pepper.'),
-- 25: Vietnamese Pho
(25,1,'Char ginger and onion directly over a gas flame until blackened. Rinse and set aside.'),
(25,2,'Blanch beef bones in boiling water for 10 minutes. Drain and rinse to remove impurities.'),
(25,3,'Simmer bones with charred ginger, onion, star anise, cloves, and cinnamon for 3 hours. Skim regularly.'),
(25,4,'Season broth with fish sauce, sugar, and salt. Strain through a fine sieve.'),
(25,5,'Cook pho noodles. Slice beef thinly (raw eye of round or brisket).'),
(25,6,'Assemble: noodles in bowls, ladle hot broth over raw beef to cook it. Top with bean sprouts, Thai basil, and lime.'),
-- 26: Falafel Wrap
(26,1,'Soak dried chickpeas overnight. Drain and blitz in food processor with onion, garlic, parsley, cumin, and coriander.'),
(26,2,'Season mixture and form into balls or patties. Refrigerate for 30 minutes to firm up.'),
(26,3,'Deep-fry falafel at 180 C for 4 minutes until dark golden and crispy. Or pan-fry for a lighter option.'),
(26,4,'Make tahini sauce: whisk tahini with lemon juice, garlic, and cold water until smooth and pourable.'),
(26,5,'Fill warm flatbread with falafel, sliced tomatoes, cucumber, pickles, and drizzle with tahini sauce.'),
-- 27: Shakshuka
(27,1,'Saute diced onion and red bell pepper in olive oil for 6 minutes. Add garlic, cumin, smoked paprika, and chili flakes.'),
(27,2,'Add crushed canned tomatoes and simmer for 10 minutes until sauce thickens. Season with salt and pepper.'),
(27,3,'Make 4-6 wells in the sauce using a spoon. Crack an egg into each well.'),
(27,4,'Cover and cook on medium-low for 6-8 minutes until whites are set but yolks still runny.'),
(27,5,'Scatter crumbled feta and fresh parsley over the top. Serve with crusty bread.'),
-- 28: Grilled Salmon with Quinoa
(28,1,'Rinse quinoa and cook in vegetable stock (2:1 liquid to quinoa) for 15 minutes until fluffy.'),
(28,2,'Season salmon fillets with lemon zest, garlic, olive oil, and fresh dill.'),
(28,3,'Grill salmon on a hot oiled grill for 4 minutes per side.'),
(28,4,'Toss cooked quinoa with diced cucumber, cherry tomatoes, parsley, and lemon juice.'),
(28,5,'Serve salmon on the quinoa salad. Drizzle with extra olive oil.'),
-- 29: Protein Pancakes
(29,1,'Blend rolled oats until they form a fine flour. Add Greek yogurt, eggs, vanilla, baking powder, and protein powder.'),
(29,2,'Mix until smooth batter forms. Let rest 5 minutes.'),
(29,3,'Cook on a non-stick pan over medium heat: pour small circles, cook until bubbles form (2 min), flip and cook 1 more min.'),
(29,4,'Serve topped with fresh berries, a drizzle of honey, and a dollop of Greek yogurt.'),
-- 30: Avocado Toast with Poached Eggs
(30,1,'Bring a shallow pan of water with a splash of white vinegar to a gentle simmer.'),
(30,2,'Crack eggs into small cups. Swirl water and gently drop eggs in. Poach for 3 minutes. Remove with a slotted spoon.'),
(30,3,'Toast sourdough slices. Mash avocado with lemon juice, salt, pepper, and chili flakes.'),
(30,4,'Spread avocado on toast. Top with poached eggs. Garnish with microgreens or dukkah.');
-- ============================================================
--  RECIPE INGREDIENTS
--  ingredient_id reference (from schema seed data):
--    1=Chicken breast, 2=Ground chicken, 3=Chicken thighs,
--    4=Chicken wings, 5=Whole chicken, 11=Ground beef, 12=Beef steak,
--    13=Beef ribs, 14=Lamb chops, 15=Lamb mince, 16=Lamb shoulder,
--    21=Salmon, 22=Tuna, 23=Cod, 25=Trout,
--    31=Shrimp/Prawns, 32=Crab, 33=Lobster, 35=Scallops,
--    41=Whole milk, 42=Cheddar cheese, 43=Mozzarella, 44=Parmesan,
--    45=Greek yogurt, 46=Butter, 47=Eggs, 48=Cream,
--    56=White rice, 57=Brown rice, 58=Basmati rice, 59=Arborio rice,
--    60=Spaghetti, 61=Penne, 62=Fettuccine, 63=Bread, 64=Sourdough,
--    65=Flour tortilla, 66=Corn tortilla, 67=Naan, 68=Flatbread,
--    69=Quinoa, 70=Rolled oats,
--    71=Broccoli, 72=Carrots, 73=Spinach, 74=Bell peppers,
--    75=Onions, 76=Garlic, 77=Tomatoes, 78=Cucumber, 79=Avocado,
--    80=Mushrooms, 81=Eggplant, 82=Zucchini, 83=Celery,
--    84=Potatoes, 85=Sweet potatoes,
--    91=Apples, 93=Lemons, 95=Limes, 97=Strawberries,
--    111=Chickpeas, 112=Black beans, 113=Lentils, 114=Red lentils,
--    121=Peanuts, 122=Almonds, 124=Sesame seeds, 126=Tahini,
--    131=Olive oil, 132=Vegetable oil, 133=Coconut oil,
--    141=Salt, 142=Black pepper, 143=Cumin, 144=Turmeric,
--    145=Paprika, 146=Chili powder, 147=Coriander, 148=Garam masala,
--    149=Cinnamon, 150=Oregano, 151=Thyme, 152=Rosemary, 153=Basil,
--    154=Ginger, 155=Saffron,
--    156=Soy sauce, 157=Ketchup, 158=Mustard, 159=Hot sauce,
--    160=Oyster sauce, 161=Fish sauce, 162=Vinegar, 163=Worcestershire,
--    166=Sugar, 167=Brown sugar, 168=Honey, 169=Maple syrup,
--    171=All-purpose flour, 172=Baking powder, 173=Baking soda,
--    186=Tofu, 187=Tempeh, 188=Edamame, 189=Soy milk, 190=Miso,
--    196=Pork belly, 197=Pork shoulder, 198=Bacon, 199=Ham, 200=Sausage
--  unit_id: 1=g, 2=kg, 3=ml, 4=L, 5=tsp, 6=tbsp, 7=cup, 8=piece, 9=slice, 10=clove
-- ============================================================
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
-- 1: Spaghetti Bolognese
(1, 60, 400, 'g'),
(1, 11, 500, 'g'),
(1, 75, 1, 'piece'),
(1, 72, 1, 'piece'),
(1, 83, 1, 'piece'),
(1, 76, 3, 'clove'),
(1, 77, 400, 'ml'),
(1, 131, 2, 'tbsp'),
(1, 44, 50, 'g'),
-- 2: Chicken Parmigiana
(2, 1, 600, 'g'),
(2, 43, 150, 'g'),
(2, 44, 40, 'g'),
(2, 47, 2, 'piece'),
(2, 171, 4, 'tbsp'),
(2, 77, 200, 'ml'),
(2, 131, 3, 'tbsp'),
-- 3: Mushroom Risotto
(3, 59, 320, 'g'),
(3, 80, 400, 'g'),
(3, 75, 2, 'piece'),
(3, 76, 2, 'clove'),
(3, 46, 60, 'g'),
(3, 44, 60, 'g'),
(3, 131, 2, 'tbsp'),
-- 4: Butter Chicken
(4, 1, 700, 'g'),
(4, 45, 120, 'ml'),
(4, 77, 400, 'ml'),
(4, 48, 120, 'ml'),
(4, 46, 40, 'g'),
(4, 75, 1, 'piece'),
(4, 76, 4, 'clove'),
(4, 154, 2, 'tsp'),
(4, 148, 2, 'tsp'),
(4, 144, 1, 'tsp'),
-- 5: Dal Tadka
(5, 114, 250, 'g'),
(5, 75, 1, 'piece'),
(5, 77, 2, 'piece'),
(5, 76, 3, 'clove'),
(5, 46, 2, 'tbsp'),
(5, 143, 1, 'tsp'),
(5, 144, 0.5, 'tsp'),
(5, 148, 1, 'tsp'),
-- 6: Lamb Biryani
(6, 16, 800, 'g'),
(6, 58, 400, 'g'),
(6, 45, 200, 'ml'),
(6, 75, 3, 'piece'),
(6, 154, 3, 'tsp'),
(6, 76, 6, 'clove'),
(6, 148, 2, 'tsp'),
(6, 155, 0.25, 'tsp'),
(6, 153, 10, 'g'),
-- 7: Beef Tacos
(7, 11, 500, 'g'),
(7, 66, 8, 'piece'),
(7, 77, 2, 'piece'),
(7, 76, 2, 'clove'),
(7, 143, 2, 'tsp'),
(7, 146, 1, 'tsp'),
(7, 42, 80, 'g'),
-- 8: Chicken Quesadillas
(8, 1, 500, 'g'),
(8, 65, 4, 'piece'),
(8, 112, 200, 'g'),
(8, 42, 120, 'g'),
(8, 74, 1, 'piece'),
-- 9: Vegetarian Black Bean Burrito
(9, 112, 400, 'g'),
(9, 65, 4, 'piece'),
(9, 56, 200, 'g'),
(9, 79, 2, 'piece'),
(9, 74, 1, 'piece'),
(9, 75, 1, 'piece'),
(9, 76, 2, 'clove'),
-- 10: Kung Pao Chicken
(10, 1, 600, 'g'),
(10, 121, 80, 'g'),
(10, 74, 1, 'piece'),
(10, 82, 1, 'piece'),
(10, 76, 3, 'clove'),
(10, 156, 3, 'tbsp'),
(10, 166, 2, 'tsp'),
-- 11: Beef Fried Rice
(11, 12, 300, 'g'),
(11, 56, 400, 'g'),
(11, 47, 3, 'piece'),
(11, 75, 1, 'piece'),
(11, 76, 3, 'clove'),
(11, 156, 3, 'tbsp'),
(11, 160, 1, 'tbsp'),
(11, 124, 1, 'tsp'),
-- 12: Sweet and Sour Pork
(12, 197, 500, 'g'),
(12, 74, 2, 'piece'),
(12, 75, 1, 'piece'),
(12, 157, 4, 'tbsp'),
(12, 162, 3, 'tbsp'),
(12, 166, 3, 'tsp'),
(12, 171, 4, 'tbsp'),
-- 13: Salmon Teriyaki
(13, 21, 600, 'g'),
(13, 156, 4, 'tbsp'),
(13, 166, 2, 'tsp'),
(13, 56, 300, 'g'),
(13, 71, 200, 'g'),
(13, 124, 1, 'tsp'),
-- 14: Chicken Ramen
(14, 3, 600, 'g'),
(14, 47, 4, 'piece'),
(14, 76, 4, 'clove'),
(14, 154, 4, 'tsp'),
(14, 156, 4, 'tbsp'),
(14, 75, 2, 'piece'),
-- 15: Tuna Sushi Rolls
(15, 22, 300, 'g'),
(15, 58, 300, 'g'),
(15, 79, 2, 'piece'),
(15, 162, 3, 'tbsp'),
(15, 166, 2, 'tsp'),
-- 16: Pad Thai with Shrimp
(16, 31, 300, 'g'),
(16, 47, 2, 'piece'),
(16, 121, 50, 'g'),
(16, 161, 3, 'tbsp'),
(16, 166, 2, 'tsp'),
-- 17: Green Chicken Curry
(17, 1, 600, 'g'),
(17, 133, 2, 'tbsp'),
(17, 81, 2, 'piece'),
(17, 161, 2, 'tbsp'),
-- 18: Tom Yum Soup
(18, 31, 200, 'g'),
(18, 80, 150, 'g'),
(18, 161, 2, 'tbsp'),
(18, 95, 2, 'piece'),
(18, 147, 10, 'g'),
-- 19: Greek Salad with Grilled Chicken
(19, 1, 500, 'g'),
(19, 78, 1, 'piece'),
(19, 77, 3, 'piece'),
(19, 43, 100, 'g'),
(19, 131, 3, 'tbsp'),
(19, 150, 1, 'tsp'),
-- 20: Lamb Souvlaki
(20, 16, 600, 'g'),
(20, 131, 4, 'tbsp'),
(20, 93, 2, 'piece'),
(20, 76, 4, 'clove'),
(20, 45, 200, 'ml'),
(20, 78, 1, 'piece'),
(20, 68, 4, 'piece'),
-- 21: Moussaka
(21, 15, 600, 'g'),
(21, 81, 2, 'piece'),
(21, 84, 3, 'piece'),
(21, 75, 1, 'piece'),
(21, 76, 3, 'clove'),
(21, 77, 400, 'ml'),
(21, 41, 600, 'ml'),
(21, 46, 60, 'g'),
(21, 44, 60, 'g'),
(21, 149, 1, 'tsp'),
-- 22: Classic Beef Burger
(22, 11, 600, 'g'),
(22, 42, 4, 'slice'),
(22, 163, 2, 'tsp'),
(22, 77, 1, 'piece'),
(22, 157, 2, 'tbsp'),
(22, 158, 1, 'tbsp'),
-- 23: BBQ Chicken Wings
(23, 4, 1.2, 'kg'),
(23, 157, 4, 'tbsp'),
(23, 167, 3, 'tbsp'),
(23, 162, 2, 'tbsp'),
(23, 163, 1, 'tbsp'),
(23, 145, 2, 'tsp'),
-- 24: Veggie Lentil Soup
(24, 113, 300, 'g'),
(24, 72, 2, 'piece'),
(24, 75, 1, 'piece'),
(24, 83, 2, 'piece'),
(24, 77, 400, 'ml'),
(24, 76, 3, 'clove'),
(24, 144, 1, 'tsp'),
(24, 143, 2, 'tsp'),
-- 25: Vietnamese Pho
(25, 12, 300, 'g'),
(25, 154, 5, 'tsp'),
(25, 75, 1, 'piece'),
(25, 161, 4, 'tbsp'),
(25, 149, 2, 'piece'),
-- 26: Falafel Wrap
(26, 111, 400, 'g'),
(26, 75, 1, 'piece'),
(26, 76, 3, 'clove'),
(26, 147, 20, 'g'),
(26, 126, 4, 'tbsp'),
(26, 68, 4, 'piece'),
(26, 143, 2, 'tsp'),
-- 27: Shakshuka
(27, 47, 6, 'piece'),
(27, 77, 800, 'ml'),
(27, 74, 2, 'piece'),
(27, 75, 1, 'piece'),
(27, 76, 4, 'clove'),
(27, 43, 100, 'g'),
(27, 143, 2, 'tsp'),
(27, 145, 1, 'tsp'),
-- 28: Grilled Salmon with Quinoa
(28, 21, 600, 'g'),
(28, 69, 200, 'g'),
(28, 78, 1, 'piece'),
(28, 77, 2, 'piece'),
(28, 93, 1, 'piece'),
(28, 131, 3, 'tbsp'),
-- 29: Protein Pancakes
(29, 70, 120, 'g'),
(29, 45, 150, 'ml'),
(29, 47, 3, 'piece'),
(29, 172, 1, 'tsp'),
(29, 168, 2, 'tbsp'),
(29, 97, 100, 'g'),
-- 30: Avocado Toast with Poached Eggs
(30, 79, 2, 'piece'),
(30, 47, 4, 'piece'),
(30, 64, 4, 'slice'),
(30, 93, 1, 'piece'),
(30, 146, 0.25, 'tsp');
-- ============================================================
--  RECIPE CUISINES
-- ============================================================
INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES
(1,1),(2,1),(3,1),                -- Italian
(4,4),(5,4),(6,4),                -- Indian
(7,2),(8,2),(9,2),                -- Mexican
(10,3),(11,3),(12,3),             -- Chinese
(13,5),(14,5),(15,5),             -- Japanese
(16,6),(17,6),(18,6),             -- Thai
(19,8),(19,11),(20,8),(21,8),     -- Greek / Mediterranean
(22,10),(23,10),(24,10),          -- American
(25,14),                          -- Vietnamese
(26,12),(27,12),                  -- Middle Eastern
(28,11),(29,10),(30,10);          -- Mediterranean / American

-- ============================================================
--  RECIPE DIETARY TAGS
-- ============================================================
INSERT INTO recipe_dietary_tags (recipe_id, preference_id) VALUES
-- Vegetarian recipes
(3,1),(5,1),(9,1),(24,1),(27,1),(29,1),(30,1),
-- Vegan recipes
(9,2),(24,2),(5,2),
-- Pescatarian
(13,3),(15,3),(16,3),(18,3),(28,3),
-- Gluten-free
(5,4),(13,4),(16,4),(19,4),(24,4),(27,4),(28,4),
-- Dairy-free
(5,5),(7,5),(9,5),(10,5),(11,5),(16,5),(17,5),(18,5),(24,5),(25,5),(26,5),
-- Nut-free
(1,6),(2,6),(3,6),(4,6),(6,6),(7,6),(8,6),(12,6),(13,6),(14,6),(15,6),(17,6),(18,6),(19,6),(20,6),(21,6),(22,6),(23,6),(27,6),(28,6),(29,6),(30,6),
-- Halal (all recipes without pork)
(1,10),(2,10),(3,10),(4,10),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(13,10),(14,10),(15,10),(16,10),(17,10),(18,10),(19,10),(20,10),(21,10),(22,10),(23,10),(24,10),(25,10),(26,10),(27,10),(28,10),(29,10),(30,10);

-- ============================================================
--  RECIPE STATS
-- ============================================================
INSERT INTO recipe_stats (recipe_id, favourite_count, average_rating, total_reviews) VALUES
(1,  24, 4.5, 18),
(2,  19, 4.3, 15),
(3,  31, 4.8, 22),
(4,  42, 4.7, 35),
(5,  15, 4.2, 12),
(6,  28, 4.6, 20),
(7,  36, 4.4, 28),
(8,  22, 4.1, 16),
(9,  18, 4.3, 14),
(10, 27, 4.5, 21),
(11, 14, 3.9, 10),
(12, 20, 4.2, 16),
(13, 33, 4.6, 26),
(14, 25, 4.4, 19),
(15, 17, 4.0, 12),
(16, 38, 4.7, 30),
(17, 29, 4.5, 22),
(18, 16, 4.1, 11),
(19, 21, 4.3, 16),
(20, 18, 4.2, 13),
(21, 14, 4.4, 10),
(22, 30, 4.3, 24),
(23, 26, 4.5, 20),
(24, 12, 4.0,  9),
(25, 23, 4.6, 17),
(26, 19, 4.4, 14),
(27, 34, 4.7, 27),
(28, 28, 4.5, 21),
(29, 22, 4.2, 17),
(30, 40, 4.8, 32),
(31,  0, 0.0,  0),
(32,  0, 0.0,  0),
(33,  0, 0.0,  0)
ON CONFLICT (recipe_id) DO UPDATE SET
  favourite_count = EXCLUDED.favourite_count,
  average_rating  = EXCLUDED.average_rating,
  total_reviews   = EXCLUDED.total_reviews;

-- ============================================================
--  REVIEWS  (2-4 reviews per popular recipe)
-- ============================================================
INSERT INTO reviews (recipe_id, user_id, rating, review_text, review_date) VALUES
-- Recipe 1: Spaghetti Bolognese
(1, 102, 5, 'Absolutely incredible! Best bolognese I have ever made at home.', '2024-12-10 10:00:00'),
(1, 105, 4, 'Very tasty. I added a splash of milk at the end which made it even richer.', '2024-12-15 11:00:00'),
(1, 107, 4, 'Great recipe. Took a while but totally worth it.', '2025-01-02 09:00:00'),
-- Recipe 3: Mushroom Risotto
(3, 102, 5, 'The key is patience and good stock. This recipe delivers.', '2024-12-20 12:00:00'),
(3, 106, 5, 'Made this for a dinner party and everyone asked for the recipe!', '2025-01-05 14:00:00'),
(3, 105, 4, 'Excellent. I used a mix of porcini and oyster mushrooms.', '2025-01-10 16:00:00'),
-- Recipe 4: Butter Chicken
(4, 102, 5, 'Better than the restaurant. The marinating step is essential.', '2024-12-18 10:00:00'),
(4, 106, 5, 'My whole family loved this. Will be on regular rotation.', '2024-12-22 12:00:00'),
(4, 108, 4, 'Rich and flavorful. Reduced the cream slightly for a lighter version.', '2025-01-08 11:00:00'),
-- Recipe 7: Beef Tacos
(7, 103, 5, 'Quick, easy, and delicious. Perfect weeknight meal.', '2024-12-10 19:00:00'),
(7, 105, 4, 'The spice mix is spot on. Added some pickled onions for extra tang.', '2024-12-20 20:00:00'),
-- Recipe 13: Salmon Teriyaki
(13, 101, 5, 'So easy and so good! The sauce is perfectly balanced.', '2025-01-08 18:00:00'),
(13, 104, 4, 'Lovely recipe. I let the sauce reduce a bit more for extra glaze.', '2025-01-15 19:00:00'),
(13, 107, 5, 'This has become my go-to weeknight salmon dish.', '2025-01-22 18:30:00'),
-- Recipe 16: Pad Thai
(16, 103, 5, 'Spot on! Finally a homemade pad thai that tastes authentic.', '2025-01-10 19:00:00'),
(16, 108, 5, 'The tamarind paste is the secret. Do not skip it.', '2025-01-18 20:00:00'),
(16, 101, 4, 'Great recipe. I added extra bean sprouts.', '2025-01-25 19:30:00'),
-- Recipe 27: Shakshuka
(27, 101, 5, 'Perfect brunch dish! Spicy, savory, and so satisfying.', '2025-02-10 10:30:00'),
(27, 104, 5, 'I make this every Sunday now. It is that good.', '2025-02-12 11:00:00'),
(27, 102, 4, 'Lovely recipe. Added halloumi on top instead of feta.', '2025-02-15 12:00:00'),
-- Recipe 30: Avocado Toast
(30, 101, 5, 'Simple perfection. My favourite quick breakfast.', '2025-02-14 08:30:00'),
(30, 107, 5, 'The poached eggs take practice but totally worth it.', '2025-02-16 09:00:00'),
(30, 104, 5, 'Added smoked salmon on top. Absolutely decadent.', '2025-02-18 08:45:00');

-- ============================================================
--  FAVOURITES
-- ============================================================
INSERT INTO favourites (user_id, recipe_id) VALUES
(101,  4),
(101,  5),
(101, 13),
(101, 27),
(101, 30),
(102,  1),
(102, 10),
(102, 16),
(102, 28),
(103,  3),
(103,  2),
(103, 14),
(103, 19),
(104, 24),
(104, 30),
(104, 27),
(105, 16),
(105, 17),
(105, 13),
(106,  6),
(106, 22),
(106, 26),
(107,  7),
(107,  8),
(107, 30),
(108, 15),
(108, 20),
(108,  3);
-- ============================================================
--  PANTRY ITEMS  (for 6 users; covers fridge/pantry/freezer)
-- ============================================================
INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, storage_location) VALUES
-- alice (101) — vegetarian pantry
(101, 47, 12, 'piece', 'Fridge'),
(101, 45, 500, 'ml', 'Fridge'),
(101, 43, 250, 'g', 'Fridge'),
(101, 77, 6, 'piece', 'Fridge'),
(101, 78, 2, 'piece', 'Fridge'),
(101, 79, 3, 'piece', 'Fridge'),
(101, 75, 3, 'piece', 'Pantry'),
(101, 76, 2, 'piece', 'Pantry'),
(101, 114, 500, 'g', 'Pantry'),
(101, 131, 500, 'ml', 'Pantry'),
(101, 141, 200, 'g', 'Pantry'),
(101, 142, 50, 'g', 'Pantry'),
(101, 143, 30, 'g', 'Pantry'),
(101, 144, 20, 'g', 'Pantry'),
-- bob (102) — gluten-free pantry
(102, 1, 600, 'g', 'Fridge'),
(102, 47, 6, 'piece', 'Fridge'),
(102, 21, 400, 'g', 'Freezer'),
(102, 56, 1000, 'g', 'Pantry'),
(102, 131, 500, 'ml', 'Pantry'),
(102, 76, 3, 'piece', 'Pantry'),
(102, 156, 250, 'ml', 'Pantry'),
(102, 124, 50, 'g', 'Pantry'),
(102, 72, 4, 'piece', 'Fridge'),
(102, 71, 300, 'g', 'Fridge'),
-- cara (103) — no restrictions, advanced cook
(103, 11, 500, 'g', 'Fridge'),
(103, 1, 800, 'g', 'Freezer'),
(103, 3, 600, 'g', 'Freezer'),
(103, 44, 200, 'g', 'Fridge'),
(103, 43, 200, 'g', 'Fridge'),
(103, 48, 300, 'ml', 'Fridge'),
(103, 46, 250, 'g', 'Fridge'),
(103, 60, 500, 'g', 'Pantry'),
(103, 59, 500, 'g', 'Pantry'),
(103, 131, 1000, 'ml', 'Pantry'),
-- david (104) — vegan, nut-free
(104, 114, 1000, 'g', 'Pantry'),
(104, 111, 500, 'g', 'Pantry'),
(104, 112, 400, 'g', 'Pantry'),
(104, 69, 500, 'g', 'Pantry'),
(104, 56, 1000, 'g', 'Pantry'),
(104, 79, 4, 'piece', 'Fridge'),
(104, 77, 6, 'piece', 'Fridge'),
(104, 73, 200, 'g', 'Fridge'),
(104, 131, 500, 'ml', 'Pantry'),
(104, 147, 20, 'g', 'Pantry'),
-- elena (105) — pescatarian, dairy-free
(105, 21, 600, 'g', 'Freezer'),
(105, 31, 400, 'g', 'Freezer'),
(105, 22, 300, 'g', 'Freezer'),
(105, 161, 200, 'ml', 'Pantry'),
(105, 156, 250, 'ml', 'Pantry'),
(105, 133, 300, 'ml', 'Pantry'),
(105, 95, 4, 'piece', 'Fridge'),
(105, 76, 3, 'piece', 'Pantry'),
-- frank (106) — halal, advanced
(106, 1, 800, 'g', 'Freezer'),
(106, 16, 1000, 'g', 'Freezer'),
(106, 4, 1200, 'g', 'Fridge'),
(106, 111, 500, 'g', 'Pantry'),
(106, 126, 300, 'ml', 'Pantry'),
(106, 143, 30, 'g', 'Pantry'),
(106, 148, 30, 'g', 'Pantry'),
(106, 58, 1000, 'g', 'Pantry'),
(106, 131, 500, 'ml', 'Pantry');

-- ============================================================
--  COOKING SESSIONS
-- ============================================================
INSERT INTO cooking_sessions (user_id, recipe_id, started_at, is_completed) VALUES
-- completed sessions
(101, 5, '2025-01-15 18:00:00', TRUE),
(101, 13, '2025-01-22 19:00:00', TRUE),
(102, 1, '2025-01-20 18:30:00', TRUE),
(102, 10, '2025-01-28 19:00:00', TRUE),
(103, 3, '2025-01-30 18:00:00', TRUE),
(103, 21, '2025-02-05 16:00:00', TRUE),
(104, 24, '2025-02-08 18:00:00', TRUE),
(105, 16, '2025-02-10 19:00:00', TRUE),
(106, 6, '2025-02-15 14:00:00', TRUE),
(107, 30, '2025-02-18 08:30:00', TRUE),
(108, 15, '2025-02-20 18:00:00', TRUE),
-- in-progress (no completed_at)
(101, 27, '2025-04-10 09:00:00', FALSE),
(102, 28, '2025-04-10 19:00:00', FALSE);

-- ============================================================
--  DAILY MEALS  (per-user, per-date, per-meal-type)
--  Week A = 2025-03-31 Mon..Fri   Week B = 2025-04-07 Mon..Wed
-- ============================================================
INSERT INTO daily_meals (user_id, date, meal_type, recipe_id) VALUES
-- alice (101) — week of 2025-03-31 (vegetarian-friendly)
(101, '2025-03-31', 'breakfast', 30),
(101, '2025-03-31', 'lunch',      5),
(101, '2025-03-31', 'dinner',    27),
(101, '2025-04-01', 'breakfast', 29),
(101, '2025-04-01', 'lunch',      9),
(101, '2025-04-01', 'dinner',     3),
(101, '2025-04-02', 'breakfast', 30),
(101, '2025-04-02', 'lunch',     24),
(101, '2025-04-02', 'dinner',    27),
(101, '2025-04-03', 'lunch',      5),
(101, '2025-04-03', 'dinner',     9),
(101, '2025-04-04', 'dinner',     3),
-- bob (102) — week of 2025-03-31 (gluten-free focus)
(102, '2025-03-31', 'breakfast', 30),
(102, '2025-03-31', 'lunch',     13),
(102, '2025-03-31', 'dinner',    10),
(102, '2025-04-01', 'breakfast', 29),
(102, '2025-04-01', 'lunch',     19),
(102, '2025-04-01', 'dinner',     1),
(102, '2025-04-02', 'breakfast', 30),
(102, '2025-04-02', 'lunch',     28),
(102, '2025-04-02', 'dinner',    13),
(102, '2025-04-03', 'breakfast', 29),
(102, '2025-04-03', 'lunch',     19),
(102, '2025-04-03', 'dinner',    16),
(102, '2025-04-04', 'breakfast', 30),
(102, '2025-04-04', 'lunch',     28),
(102, '2025-04-04', 'dinner',    10),
-- cara (103) — week of 2025-03-31 (full variety)
(103, '2025-03-31', 'breakfast', 29),
(103, '2025-03-31', 'lunch',      3),
(103, '2025-03-31', 'dinner',     1),
(103, '2025-04-01', 'breakfast', 30),
(103, '2025-04-01', 'lunch',      2),
(103, '2025-04-01', 'dinner',    21),
(103, '2025-04-02', 'breakfast', 29),
(103, '2025-04-02', 'lunch',      3),
(103, '2025-04-02', 'dinner',    14),
(103, '2025-04-03', 'breakfast', 30),
(103, '2025-04-03', 'lunch',     19),
(103, '2025-04-03', 'dinner',    20),
(103, '2025-04-04', 'breakfast', 30),
(103, '2025-04-04', 'lunch',      2),
(103, '2025-04-04', 'dinner',     6),
(103, '2025-04-05', 'breakfast', 29),
(103, '2025-04-05', 'lunch',     19),
(103, '2025-04-05', 'dinner',     3),
-- elena (105) — week of 2025-03-31 (pescatarian)
(105, '2025-03-31', 'breakfast', 30),
(105, '2025-03-31', 'lunch',     13),
(105, '2025-03-31', 'dinner',    16),
(105, '2025-04-01', 'breakfast', 29),
(105, '2025-04-01', 'lunch',     28),
(105, '2025-04-01', 'dinner',    18),
(105, '2025-04-02', 'breakfast', 30),
(105, '2025-04-02', 'lunch',     13),
(105, '2025-04-02', 'dinner',    25),
(105, '2025-04-03', 'breakfast', 29),
(105, '2025-04-03', 'lunch',     28),
(105, '2025-04-03', 'dinner',    16),
-- alice (101) — week of 2025-04-07
(101, '2025-04-07', 'breakfast', 30),
(101, '2025-04-07', 'lunch',     27),
(101, '2025-04-07', 'dinner',     5),
(101, '2025-04-08', 'breakfast', 29),
(101, '2025-04-08', 'lunch',      9),
(101, '2025-04-08', 'dinner',     3),
(101, '2025-04-09', 'breakfast', 30),
(101, '2025-04-09', 'lunch',     24),
(101, '2025-04-09', 'dinner',    27),
-- bob (102) — week of 2025-04-07
(102, '2025-04-07', 'breakfast', 30),
(102, '2025-04-07', 'lunch',     13),
(102, '2025-04-07', 'dinner',    16),
(102, '2025-04-08', 'breakfast', 29),
(102, '2025-04-08', 'lunch',     28),
(102, '2025-04-08', 'dinner',    10);

-- ============================================================
--  SAVED PLAN TEMPLATES
-- ============================================================
INSERT INTO saved_plan_templates (user_id, name, meal_data, created_at) VALUES
(103, 'Italian Week',
  '{"Monday":{"breakfast":null,"lunch":{"recipe_id":3,"title":"Mushroom Risotto"},"dinner":{"recipe_id":1,"title":"Classic Spaghetti Bolognese"}},"Tuesday":{"breakfast":{"recipe_id":29,"title":"Protein Pancakes"},"lunch":{"recipe_id":2,"title":"Chicken Parmigiana"},"dinner":{"recipe_id":3,"title":"Mushroom Risotto"}},"Wednesday":{"breakfast":null,"lunch":null,"dinner":{"recipe_id":21,"title":"Moussaka"}}}'::json,
  '2025-02-01 10:00:00'),
(105, 'Pescatarian Power Week',
  '{"Monday":{"breakfast":{"recipe_id":30,"title":"Avocado Toast with Poached Eggs"},"lunch":{"recipe_id":28,"title":"Grilled Salmon with Quinoa"},"dinner":{"recipe_id":16,"title":"Pad Thai with Shrimp"}},"Tuesday":{"breakfast":{"recipe_id":29,"title":"Protein Pancakes"},"lunch":{"recipe_id":13,"title":"Salmon Teriyaki"},"dinner":{"recipe_id":18,"title":"Tom Yum Soup"}},"Wednesday":{"breakfast":{"recipe_id":30,"title":"Avocado Toast with Poached Eggs"},"lunch":{"recipe_id":28,"title":"Grilled Salmon with Quinoa"},"dinner":{"recipe_id":25,"title":"Vietnamese Pho"}}}'::json,
  '2025-02-05 11:00:00'),
(106, 'Middle Eastern & Global Mix',
  '{"Sunday":{"breakfast":{"recipe_id":27,"title":"Shakshuka"},"lunch":{"recipe_id":26,"title":"Falafel Wrap"},"dinner":{"recipe_id":6,"title":"Lamb Biryani"}},"Monday":{"breakfast":null,"lunch":{"recipe_id":26,"title":"Falafel Wrap"},"dinner":{"recipe_id":4,"title":"Butter Chicken"}},"Friday":{"breakfast":{"recipe_id":27,"title":"Shakshuka"},"lunch":null,"dinner":{"recipe_id":22,"title":"Classic Beef Burger"}}}'::json,
  '2025-02-10 12:00:00');

SELECT setval('saved_plan_templates_template_id_seq', 10);

-- ============================================================
--  SHOPPING LISTS
-- ============================================================
INSERT INTO shopping_lists (list_id, user_id, name, generated_at) VALUES
(1, 101, 'Week of Mar 31', '2025-03-28 10:00:00'),
(2, 102, 'Week of Mar 31', '2025-03-28 11:00:00'),
(3, 103, 'Week of Mar 31', '2025-03-29 09:00:00'),
(4, 105, 'Week of Mar 31', '2025-04-01 18:00:00'),
(5, 101, 'Week of Apr 07', '2025-04-04 15:00:00');

SELECT setval('shopping_lists_list_id_seq', 20);

-- ============================================================
--  SHOPPING LIST ITEMS
-- ============================================================
INSERT INTO shopping_list_items (list_id, ingredient_name, quantity, is_checked) VALUES
-- List 1: alice weekly veg
(1, 'Tomatoes', '6 piece', false),
(1, 'Cucumber', '2 piece', false),
(1, 'Avocado', '4 piece', false),
(1, 'Eggs', '12 piece', true),
(1, 'Greek Yogurt', '500 ml', true),
(1, 'Red Lentils', '500 g', false),
(1, 'Onions', '1000 g', true),
(1, 'Garlic', '3 piece', false),
(1, 'Sourdough Bread', '1 piece', false),
(1, 'Lemons', '4 piece', false),
-- List 2: bob meal plan
(2, 'Chicken Breast', '1.5 kg', false),
(2, 'Salmon', '600 g', false),
(2, 'White Rice', '1 kg', true),
(2, 'Quinoa', '400 g', false),
(2, 'Broccoli', '400 g', false),
(2, 'Soy Sauce', '250 ml', true),
(2, 'Garlic', '3 piece', false),
(2, 'Olive Oil', '500 ml', true),
(2, 'Lemons', '2 piece', false),
(2, 'Sesame Seeds', '50 g', false),
-- List 3: cara dinner party
(3, 'Ground Beef', '800 g', false),
(3, 'Spaghetti', '500 g', true),
(3, 'Canned Tomatoes', '800 ml', true),
(3, 'Parmesan', '100 g', false),
(3, 'Onions', '2 piece', true),
(3, 'Garlic', '4 clove', false),
(3, 'Celery', '2 piece', false),
(3, 'Carrots', '2 piece', false),
-- List 4: elena pad thai
(4, 'Shrimp', '400 g', false),
(4, 'Fish Sauce', '200 ml', false),
(4, 'Peanuts', '100 g', false),
(4, 'Limes', '3 piece', false),
(4, 'Eggs', '4 piece', true),
-- List 5: frank bbq weekend
(5, 'Chicken Wings', '2 kg', false),
(5, 'Ground Beef', '1.2 kg', false),
(5, 'Ketchup', '400 ml', true),
(5, 'Brown Sugar', '200 g', false),
(5, 'Worcestershire', '150 ml', true),
(5, 'Smoked Paprika', '30 g', false),
(5, 'Burger Buns', '8 piece', false),
(5, 'Cheddar Cheese', '200 g', false);

-- ============================================================
--  END OF SAMPLE DATA
-- ============================================================


-- ============================================================
--  EXTENDED DATA  (comprehensive coverage for all 8 users)
--  Adds: reviews for all 33 recipes, extra favourites,
--        pantry for users 107+108, extra cooking sessions,
--        meal plans 7-10 (frank/grace/henry/david full weeks),
--        5 new plan templates, shopping lists 6-9 + items,
--        updated recipe_stats to match
-- ============================================================

-- ============================================================
--  ADDITIONAL REVIEWS  (covers previously unreviewed recipes)
-- ============================================================
INSERT INTO reviews (recipe_id, user_id, rating, review_text, review_date) VALUES
-- Recipe 2: Chicken Parmigiana
(2, 101, 4, 'The crispy coating was perfect. Great family meal.', '2025-01-10 18:00:00'),
(2, 104, 5, 'Kids absolutely loved it. Will definitely make again.', '2025-01-18 19:00:00'),
-- Recipe 5: Dal Tadka
(5, 102, 5, 'Such a comforting dish. The tadka at the end makes all the difference.', '2025-01-12 20:00:00'),
(5, 103, 4, 'Authentic tasting and easy to make. Added extra cumin.', '2025-01-20 18:30:00'),
-- Recipe 6: Lamb Biryani
(6, 101, 5, 'Worth every minute of effort. The dum cooking is essential.', '2025-01-15 20:00:00'),
(6, 105, 4, 'Aromatic and delicious. Used a pressure cooker to speed things up.', '2025-01-22 19:00:00'),
-- Recipe 8: Chicken Quesadillas
(8, 101, 4, 'Quick weeknight winner. Added jalapeños for heat.', '2025-01-08 19:00:00'),
(8, 106, 4, 'Simple and satisfying. The whole family loved these.', '2025-01-25 18:00:00'),
-- Recipe 9: Vegetarian Black Bean Burrito
(9, 106, 5, 'Filling and full of flavor. A go-to for meatless Mondays.', '2025-01-10 20:00:00'),
(9, 108, 4, 'Great texture from the black beans. Very satisfying.', '2025-02-01 19:30:00'),
-- Recipe 10: Kung Pao Chicken
(10, 103, 5, 'The Sichuan peppercorn is the secret. Absolutely delicious.', '2025-01-15 19:00:00'),
(10, 105, 4, 'Bold and spicy. I reduced the chili slightly for my taste.', '2025-01-28 19:30:00'),
-- Recipe 11: Beef Fried Rice
(11, 101, 4, 'Great use of leftover rice. Quick, easy, and delicious.', '2025-01-18 20:00:00'),
(11, 107, 5, 'Perfect takeaway-style fried rice you can make at home.', '2025-02-02 19:00:00'),
-- Recipe 12: Sweet and Sour Pork
(12, 103, 4, 'The sauce is spot on — sweet, tangy, and beautifully glossy.', '2025-01-22 19:30:00'),
-- Recipe 14: Chicken Ramen
(14, 101, 5, 'Incredible depth of flavor. Totally worth the long cook time.', '2025-02-05 20:00:00'),
(14, 104, 4, 'The broth is everything. Rich, warming, and deeply satisfying.', '2025-02-15 19:00:00'),
-- Recipe 15: Tuna Sushi Rolls
(15, 103, 4, 'Good technique guide. Needed a few practice attempts to roll properly.', '2025-01-25 18:00:00'),
(15, 106, 5, 'Outstanding results! Almost as good as my favourite restaurant.', '2025-02-08 19:30:00'),
-- Recipe 17: Green Chicken Curry
(17, 101, 5, 'Fragrant and creamy. Used full-fat coconut milk for best results.', '2025-02-02 19:00:00'),
(17, 107, 4, 'Lovely curry. Made it slightly milder for the whole family.', '2025-02-12 18:30:00'),
-- Recipe 18: Tom Yum Soup
(18, 101, 4, 'Hot and sour perfection. A great starter for any Thai meal.', '2025-02-06 20:00:00'),
(18, 104, 5, 'Love the lemongrass aroma. So refreshing and full of depth.', '2025-02-20 19:00:00'),
-- Recipe 19: Greek Salad with Grilled Chicken
(19, 102, 4, 'Fresh and light. The perfect dish for a warm summer evening.', '2025-02-08 12:30:00'),
(19, 107, 5, 'The quality feta makes this dish. I will make it every week.', '2025-02-20 13:00:00'),
-- Recipe 20: Lamb Souvlaki
(20, 103, 5, 'Best souvlaki I have ever made at home. The marinade is key.', '2025-02-10 19:00:00'),
(20, 101, 4, 'Juicy and incredibly flavorful. Outstanding served with warm pita.', '2025-02-22 18:30:00'),
-- Recipe 21: Moussaka
(21, 101, 5, 'A labor of love but absolutely worth it. Impressive dinner party dish.', '2025-02-12 20:00:00'),
(21, 108, 4, 'Rich, hearty, and deeply comforting. The bechamel layer is wonderful.', '2025-02-25 19:30:00'),
-- Recipe 22: Classic Beef Burger
(22, 102, 5, 'Perfect patty. The smash burger technique is the only way to go.', '2025-02-14 19:30:00'),
(22, 105, 4, 'Juicy and incredibly tasty. I added caramelised onions on top.', '2025-02-28 18:30:00'),
-- Recipe 23: BBQ Chicken Wings
(23, 102, 5, 'Sticky, crispy, and perfectly seasoned. My new go-to wings recipe.', '2025-02-16 20:00:00'),
(23, 104, 4, 'Great crispy texture from the baking and broiling method.', '2025-03-01 19:00:00'),
-- Recipe 24: Veggie Lentil Soup
(24, 102, 4, 'Warming and nutritious. The perfect comforting winter dinner.', '2025-02-18 19:30:00'),
(24, 106, 5, 'Simple and deeply satisfying. Added extra cumin for warmth.', '2025-03-05 18:30:00'),
-- Recipe 25: Vietnamese Pho
(25, 102, 5, 'The broth took hours but the result is truly spectacular.', '2025-02-20 20:00:00'),
(25, 106, 4, 'Authentic flavors. This will become a regular in our household.', '2025-03-08 19:00:00'),
-- Recipe 26: Falafel Wrap
(26, 102, 4, 'Perfectly crispy falafel with a great tahini sauce.', '2025-02-22 12:30:00'),
(26, 108, 5, 'So delicious! The herb and spice mixture is absolutely perfect.', '2025-03-12 13:00:00'),
-- Recipe 28: Grilled Salmon with Quinoa
(28, 103, 5, 'Clean and nutritious. The honey-lemon glaze is extraordinary.', '2025-02-25 19:00:00'),
(28, 107, 4, 'Light, fresh, and satisfying. Excellent for weekly meal prep.', '2025-03-05 18:30:00'),
-- Recipe 29: Protein Pancakes
(29, 103, 4, 'Surprisingly filling and great tasting. I top with Greek yogurt.', '2025-02-28 09:00:00'),
(29, 106, 5, 'Perfect post-workout breakfast. High protein and delicious.', '2025-03-10 08:30:00');

-- ============================================================
--  ADDITIONAL FAVOURITES
-- ============================================================
INSERT INTO favourites (user_id, recipe_id) VALUES
(101,  3),(101, 24),
(102,  3),(102, 22),(102,  6),
(103,  1),(103,  6),(103, 28),
(104,  5),(104,  9),
(105, 28),(105, 25),(105, 18),
(106,  4),(106, 23),
(107,  9),(107, 17),(107, 22),
(108,  1),(108, 14),(108, 21),(108, 26);

-- ============================================================
--  ADDITIONAL PANTRY ITEMS  (users 107 and 108)
-- ============================================================
INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, storage_location) VALUES
-- grace (107) — Mexican/Spanish, Egg-free
(107,  71, 500.00, 'g',     'Fridge'),
(107, 107,   3.00, 'piece', 'Fridge'),
(107, 104,   6.00, 'piece', 'Fridge'),
(107, 119, 400.00, 'g',     'Pantry'),
(107, 244,  10.00, 'piece', 'Pantry'),
(107,  45, 200.00, 'g',     'Fridge'),
(107, 141, 200.00, 'ml',    'Pantry'),
(107, 168,  20.00, 'g',     'Pantry'),
(107,  74,   2.00, 'piece', 'Pantry'),
(107, 156,  10.00, 'g',     'Pantry'),
-- henry (108) — Kosher, Japanese/Italian
(108,  60, 1000.00, 'g',    'Pantry'),
(108,  21,  400.00, 'g',    'Freezer'),
(108,  41,   12.00, 'piece','Fridge'),
(108,  47,   50.00, 'g',    'Fridge'),
(108,  64,  500.00, 'g',    'Pantry'),
(108, 176,  250.00, 'ml',   'Pantry'),
(108, 141,  200.00, 'ml',   'Pantry'),
(108,  74,    3.00, 'piece','Pantry'),
(108,  72,    2.00, 'piece','Fridge'),
(108,  80,  200.00, 'g',    'Fridge');

-- ============================================================
--  ADDITIONAL COOKING SESSIONS
-- ============================================================
INSERT INTO cooking_sessions (user_id, recipe_id, started_at, is_completed) VALUES
(101,  4, '2025-02-20 18:30:00', TRUE),
(101, 17, '2025-03-10 19:00:00', TRUE),
(102,  3, '2025-02-25 18:00:00', TRUE),
(103, 14, '2025-03-01 17:00:00', TRUE),
(104,  5, '2025-02-28 18:30:00', TRUE),
(104, 26, '2025-03-15 19:00:00', TRUE),
(105, 17, '2025-03-05 19:30:00', TRUE),
(105, 28, '2025-03-12 18:00:00', TRUE),
(106, 27, '2025-03-08 09:00:00', TRUE),
(106, 22, '2025-03-20 18:00:00', TRUE),
(107,  7, '2025-03-10 18:30:00', TRUE),
(107,  9, '2025-03-18 19:00:00', TRUE),
(108, 20, '2025-03-15 18:00:00', TRUE),
(108, 26, '2025-03-22 12:30:00', TRUE),
-- in-progress
(103, 28, '2025-04-20 18:00:00', FALSE),
(106, 23, '2025-04-21 17:30:00', FALSE);

-- ============================================================
--  ADDITIONAL DAILY MEALS  (week of 2025-04-14)
-- ============================================================
INSERT INTO daily_meals (user_id, date, meal_type, recipe_id) VALUES
-- frank (106, Halal) — week of 2025-04-14
(106, '2025-04-14', 'breakfast', 29),
(106, '2025-04-14', 'lunch',     26),
(106, '2025-04-14', 'dinner',     4),
(106, '2025-04-15', 'breakfast', 30),
(106, '2025-04-15', 'lunch',      5),
(106, '2025-04-15', 'dinner',     6),
(106, '2025-04-16', 'breakfast', 29),
(106, '2025-04-16', 'lunch',     24),
(106, '2025-04-16', 'dinner',    17),
(106, '2025-04-17', 'breakfast', 30),
(106, '2025-04-17', 'lunch',     26),
(106, '2025-04-17', 'dinner',    10),
(106, '2025-04-18', 'breakfast', 29),
(106, '2025-04-18', 'lunch',     19),
(106, '2025-04-18', 'dinner',    13),
(106, '2025-04-19', 'breakfast', 30),
(106, '2025-04-19', 'lunch',     28),
(106, '2025-04-19', 'dinner',    27),
(106, '2025-04-20', 'breakfast', 29),
(106, '2025-04-20', 'lunch',      5),
(106, '2025-04-20', 'dinner',     4),
-- grace (107, Egg-free) — week of 2025-04-14
(107, '2025-04-14', 'breakfast',  9),
(107, '2025-04-14', 'lunch',      7),
(107, '2025-04-14', 'dinner',     1),
(107, '2025-04-15', 'breakfast',  9),
(107, '2025-04-15', 'lunch',     10),
(107, '2025-04-15', 'dinner',    16),
(107, '2025-04-16', 'breakfast',  9),
(107, '2025-04-16', 'lunch',      7),
(107, '2025-04-16', 'dinner',    17),
(107, '2025-04-17', 'breakfast',  8),
(107, '2025-04-17', 'lunch',     24),
(107, '2025-04-17', 'dinner',    18),
(107, '2025-04-18', 'breakfast',  8),
(107, '2025-04-18', 'lunch',     26),
(107, '2025-04-18', 'dinner',    22),
(107, '2025-04-19', 'breakfast',  9),
(107, '2025-04-19', 'lunch',      7),
(107, '2025-04-19', 'dinner',    10),
-- henry (108, Kosher) — week of 2025-04-14
(108, '2025-04-14', 'breakfast', 29),
(108, '2025-04-14', 'lunch',     13),
(108, '2025-04-14', 'dinner',    21),
(108, '2025-04-15', 'breakfast', 30),
(108, '2025-04-15', 'lunch',     28),
(108, '2025-04-15', 'dinner',     1),
(108, '2025-04-16', 'breakfast', 29),
(108, '2025-04-16', 'lunch',      3),
(108, '2025-04-16', 'dinner',    14),
(108, '2025-04-17', 'breakfast', 30),
(108, '2025-04-17', 'lunch',     13),
(108, '2025-04-17', 'dinner',    19),
(108, '2025-04-18', 'breakfast', 29),
(108, '2025-04-18', 'lunch',     26),
(108, '2025-04-18', 'dinner',    21),
-- david (104, Vegan + Nut-free) — week of 2025-04-14
(104, '2025-04-14', 'breakfast',  9),
(104, '2025-04-14', 'lunch',     24),
(104, '2025-04-14', 'dinner',     5),
(104, '2025-04-15', 'breakfast',  9),
(104, '2025-04-15', 'lunch',     26),
(104, '2025-04-15', 'dinner',    24),
(104, '2025-04-16', 'breakfast',  9),
(104, '2025-04-16', 'lunch',      5),
(104, '2025-04-16', 'dinner',    24),
(104, '2025-04-17', 'lunch',     24),
(104, '2025-04-17', 'dinner',    26),
(104, '2025-04-18', 'breakfast',  9),
(104, '2025-04-18', 'lunch',      5),
(104, '2025-04-19', 'lunch',      9),
(104, '2025-04-19', 'dinner',    24);

-- ============================================================
--  ADDITIONAL SAVED PLAN TEMPLATES  (now all 8 users covered)
-- ============================================================
INSERT INTO saved_plan_templates (user_id, name, meal_data, created_at) VALUES
(101, 'Vegetarian Week',
  '{"Monday":{"breakfast":{"recipe_id":30,"title":"Avocado Toast with Poached Eggs"},"lunch":{"recipe_id":24,"title":"Veggie Lentil Soup"},"dinner":{"recipe_id":3,"title":"Mushroom Risotto"}},"Tuesday":{"breakfast":{"recipe_id":29,"title":"Protein Pancakes"},"lunch":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"},"dinner":{"recipe_id":27,"title":"Shakshuka"}},"Wednesday":{"breakfast":{"recipe_id":30,"title":"Avocado Toast with Poached Eggs"},"lunch":{"recipe_id":5,"title":"Dal Tadka"},"dinner":{"recipe_id":3,"title":"Mushroom Risotto"}}}'::json,
  '2025-02-20 10:00:00'),
(102, 'Gluten-Free Asian Week',
  '{"Monday":{"breakfast":{"recipe_id":27,"title":"Shakshuka"},"lunch":{"recipe_id":19,"title":"Greek Salad with Grilled Chicken"},"dinner":{"recipe_id":13,"title":"Salmon Teriyaki"}},"Tuesday":{"breakfast":{"recipe_id":27,"title":"Shakshuka"},"lunch":{"recipe_id":24,"title":"Veggie Lentil Soup"},"dinner":{"recipe_id":16,"title":"Pad Thai with Shrimp"}},"Wednesday":{"breakfast":null,"lunch":{"recipe_id":5,"title":"Dal Tadka"},"dinner":{"recipe_id":28,"title":"Grilled Salmon with Quinoa"}}}'::json,
  '2025-02-25 11:00:00'),
(104, 'Vegan Week',
  '{"Monday":{"breakfast":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"},"lunch":{"recipe_id":5,"title":"Dal Tadka"},"dinner":{"recipe_id":24,"title":"Veggie Lentil Soup"}},"Tuesday":{"breakfast":null,"lunch":{"recipe_id":24,"title":"Veggie Lentil Soup"},"dinner":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"}},"Wednesday":{"breakfast":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"},"lunch":null,"dinner":{"recipe_id":5,"title":"Dal Tadka"}}}'::json,
  '2025-03-01 09:00:00'),
(107, 'Mexican Fiesta Week',
  '{"Monday":{"breakfast":null,"lunch":{"recipe_id":7,"title":"Beef Tacos"},"dinner":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"}},"Tuesday":{"breakfast":null,"lunch":{"recipe_id":8,"title":"Chicken Quesadillas"},"dinner":{"recipe_id":7,"title":"Beef Tacos"}},"Wednesday":{"breakfast":null,"lunch":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"},"dinner":{"recipe_id":8,"title":"Chicken Quesadillas"}},"Thursday":{"breakfast":null,"lunch":{"recipe_id":7,"title":"Beef Tacos"},"dinner":{"recipe_id":9,"title":"Vegetarian Black Bean Burrito"}}}'::json,
  '2025-03-05 10:00:00'),
(108, 'Kosher Japanese and Italian Week',
  '{"Monday":{"breakfast":{"recipe_id":29,"title":"Protein Pancakes"},"lunch":{"recipe_id":13,"title":"Salmon Teriyaki"},"dinner":{"recipe_id":1,"title":"Classic Spaghetti Bolognese"}},"Tuesday":{"breakfast":null,"lunch":{"recipe_id":28,"title":"Grilled Salmon with Quinoa"},"dinner":{"recipe_id":21,"title":"Moussaka"}},"Wednesday":{"breakfast":{"recipe_id":29,"title":"Protein Pancakes"},"lunch":{"recipe_id":3,"title":"Mushroom Risotto"},"dinner":{"recipe_id":14,"title":"Chicken Ramen"}}}'::json,
  '2025-03-10 12:00:00');

SELECT setval('saved_plan_templates_template_id_seq', 20);

-- ============================================================
--  NEW SHOPPING LISTS  (week of Apr 14)
-- ============================================================
INSERT INTO shopping_lists (list_id, user_id, name, generated_at) VALUES
(6, 106, 'Week of Apr 14', '2025-04-11 10:30:00'),
(7, 107, 'Week of Apr 14', '2025-04-11 11:30:00'),
(8, 108, 'Week of Apr 14', '2025-04-11 12:30:00'),
(9, 104, 'Week of Apr 14', '2025-04-11 14:30:00');

SELECT setval('shopping_lists_list_id_seq', 30);

-- ============================================================
--  NEW SHOPPING LIST ITEMS
-- ============================================================
INSERT INTO shopping_list_items (list_id, ingredient_name, quantity, is_checked) VALUES
-- List 6: frank halal week (butter chicken, lamb biryani, green curry, falafel)
(6, 'Chicken Breast',        '1.5 kg',   false),
(6, 'Lamb Shoulder',         '800 g',    false),
(6, 'Basmati Rice',          '1 kg',     false),
(6, 'Chickpeas',             '400 g',    false),
(6, 'Onions',                '1 kg',     true),
(6, 'Garlic',                '2 piece',  true),
(6, 'Tomato Paste',          '200 g',    false),
(6, 'Coconut Milk',          '400 ml',   false),
(6, 'Garam Masala',          '30 g',     false),
(6, 'Olive Oil',             '250 ml',   true),
(6, 'Quinoa',                '400 g',    false),
(6, 'Salmon',                '500 g',    false),
-- List 7: grace egg-free week (tacos, pad thai, burrito, curry)
(7, 'Ground Beef',           '800 g',    false),
(7, 'Chicken Breast',        '600 g',    false),
(7, 'Shrimp',                '400 g',    false),
(7, 'Tortillas (Flour)',     '10 piece', false),
(7, 'Black Beans',           '400 g',    true),
(7, 'Bell Pepper (Red)',     '3 piece',  false),
(7, 'Cheddar Cheese',        '200 g',    false),
(7, 'Lime',                  '4 piece',  false),
(7, 'Cilantro',              '30 g',     false),
(7, 'Soy Sauce',             '250 ml',   true),
(7, 'Rice Noodles',          '300 g',    false),
(7, 'Bean Sprouts',          '200 g',    false),
-- List 8: henry kosher week (salmon, sushi, bolognese, moussaka, ramen)
(8, 'Salmon',                '600 g',    false),
(8, 'Tuna',                  '400 g',    false),
(8, 'Ground Beef',           '500 g',    false),
(8, 'Spaghetti',             '500 g',    true),
(8, 'Basmati Rice',          '500 g',    false),
(8, 'Eggs',                  '12 piece', true),
(8, 'Parmesan Cheese',       '100 g',    false),
(8, 'Soy Sauce',             '200 ml',   false),
(8, 'Lemon',                 '4 piece',  false),
(8, 'Spinach',               '200 g',    false),
(8, 'Quinoa',                '300 g',    false),
-- List 9: david vegan week (dal tadka, lentil soup, falafel, burritos)
(9, 'Lentils (Red)',         '600 g',    false),
(9, 'Black Beans',           '800 g',    false),
(9, 'Canned Chickpeas',      '400 g',    false),
(9, 'Onions',                '1 kg',     true),
(9, 'Garlic',                '3 piece',  true),
(9, 'Canned Tomatoes',       '400 g',    false),
(9, 'Cumin',                 '20 g',     false),
(9, 'Tortillas (Corn)',      '10 piece', false),
(9, 'Coconut Milk',          '400 ml',   false),
(9, 'Olive Oil',             '250 ml',   true);

-- ============================================================
--  UPDATE RECIPE STATS  (reflect all added reviews + favourites)
-- ============================================================
UPDATE recipe_stats SET total_reviews = 17, average_rating = 4.4 WHERE recipe_id = 2;
UPDATE recipe_stats SET total_reviews = 14, average_rating = 4.5 WHERE recipe_id = 5;
UPDATE recipe_stats SET total_reviews = 22, average_rating = 4.6 WHERE recipe_id = 6;
UPDATE recipe_stats SET total_reviews = 18, average_rating = 4.2 WHERE recipe_id = 8;
UPDATE recipe_stats SET total_reviews = 16, average_rating = 4.4 WHERE recipe_id = 9;
UPDATE recipe_stats SET total_reviews = 23, average_rating = 4.5 WHERE recipe_id = 10;
UPDATE recipe_stats SET total_reviews = 12, average_rating = 4.2 WHERE recipe_id = 11;
UPDATE recipe_stats SET total_reviews = 17, average_rating = 4.2 WHERE recipe_id = 12;
UPDATE recipe_stats SET total_reviews = 21, average_rating = 4.5 WHERE recipe_id = 14;
UPDATE recipe_stats SET total_reviews = 14, average_rating = 4.3 WHERE recipe_id = 15;
UPDATE recipe_stats SET total_reviews = 24, average_rating = 4.5 WHERE recipe_id = 17;
UPDATE recipe_stats SET total_reviews = 13, average_rating = 4.4 WHERE recipe_id = 18;
UPDATE recipe_stats SET total_reviews = 18, average_rating = 4.4 WHERE recipe_id = 19;
UPDATE recipe_stats SET total_reviews = 15, average_rating = 4.3 WHERE recipe_id = 20;
UPDATE recipe_stats SET total_reviews = 12, average_rating = 4.5 WHERE recipe_id = 21;
UPDATE recipe_stats SET total_reviews = 26, average_rating = 4.4 WHERE recipe_id = 22;
UPDATE recipe_stats SET total_reviews = 22, average_rating = 4.5 WHERE recipe_id = 23;
UPDATE recipe_stats SET total_reviews = 11, average_rating = 4.3 WHERE recipe_id = 24;
UPDATE recipe_stats SET total_reviews = 19, average_rating = 4.6 WHERE recipe_id = 25;
UPDATE recipe_stats SET total_reviews = 16, average_rating = 4.5 WHERE recipe_id = 26;
UPDATE recipe_stats SET total_reviews = 23, average_rating = 4.5 WHERE recipe_id = 28;
UPDATE recipe_stats SET total_reviews = 19, average_rating = 4.4 WHERE recipe_id = 29;
-- Update favourite counts
UPDATE recipe_stats SET favourite_count = favourite_count + 2 WHERE recipe_id IN (3, 1, 6);
UPDATE recipe_stats SET favourite_count = favourite_count + 1
  WHERE recipe_id IN (24, 22, 28, 5, 9, 25, 18, 4, 23, 17, 14, 21, 26);

-- ============================================================
--  END OF EXTENDED DATA
-- ============================================================