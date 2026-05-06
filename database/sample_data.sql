-- ============================================================
--  PANTRYPAL – COMPREHENSIVE SAMPLE DATA
--  Run AFTER schema.sql (which creates tables) and logic.sql
--
--  5 real-feeling users, 10 recipes (9 published + 1 draft),
--  ingredients, instructions, cuisines, dietary tags,
--  nutrition, reviews, favourites, pantry items, meal plans.
-- ============================================================


-- ============================================================
--  1. USERS
--  password_hash stores plain text here (testing only)
-- ============================================================
INSERT INTO app_users (email, display_name, password_hash, skill_level, created_at) VALUES
('sarah.chen@gmail.com',    'SarahC',    '12345678', 'Intermediate', '2025-11-15 09:23:00'),
('james.patel@hotmail.com', 'JamesPatel', '12345678', 'Beginner',    '2025-12-02 14:11:00'),
('emma.wilson@outlook.com', 'EmmaW',     '12345678', 'Advanced',    '2025-10-20 08:45:00'),
('miguel.torres@gmail.com', 'MiguelT',   '12345678', 'Intermediate','2026-01-08 17:30:00'),
('priya.sharma@yahoo.com',  'PriyaS',    '12345678', 'Advanced',    '2025-09-05 11:00:00');
-- Resulting user_ids: 1=SarahC  2=JamesPatel  3=EmmaW  4=MiguelT  5=PriyaS


-- ============================================================
--  2. USER CUISINE PREFERENCES
--  Cuisine IDs: Italian=1 Mexican=2 Chinese=3 Indian=4
--               Japanese=5 Thai=6 French=7 Greek=8
--               Spanish=9 American=10 Mediterranean=11
--               Middle Eastern=12
-- ============================================================
INSERT INTO user_cuisine_preference (user_id, cuisine_id) VALUES
-- Sarah: Italian, American, Mediterranean
(1, 1), (1, 10), (1, 11),
-- James: Japanese, Thai, Chinese
(2, 5), (2, 6),  (2, 3),
-- Emma: Italian, French, Greek
(3, 1), (3, 7),  (3, 8),
-- Miguel: Mexican, American, Spanish
(4, 2), (4, 10), (4, 9),
-- Priya: Indian, Middle Eastern, Mediterranean
(5, 4), (5, 12), (5, 11);


-- ============================================================
--  3. USER DIETARY PREFERENCES
-- ============================================================
INSERT INTO user_preference (user_id, preference_id) VALUES
(3, 6),   -- Emma: Nut-free
(2, 9);   -- James: Shellfish-free


-- ============================================================
--  4. RECIPES
--  Trigger auto-creates recipe_stats row (all zeros) on insert
-- ============================================================
INSERT INTO recipes (user_id, title, difficulty, cooking_time_min, status, created_at) VALUES
(3, 'Spaghetti Carbonara',     'Medium', 30, 'published', '2025-11-01 18:30:00'),  -- id 1
(5, 'Chicken Tikka Masala',    'Medium', 45, 'published', '2025-11-10 19:00:00'),  -- id 2
(1, 'Avocado Toast with Eggs', 'Easy',   10, 'published', '2025-11-20 08:30:00'),  -- id 3
(4, 'Classic Beef Burger',     'Easy',   25, 'published', '2025-12-05 12:00:00'),  -- id 4
(2, 'Thai Green Curry',        'Medium', 35, 'published', '2025-12-15 19:30:00'),  -- id 5
(3, 'Greek Salad',             'Easy',   15, 'published', '2026-01-02 13:00:00'),  -- id 6
(4, 'Beef Tacos',              'Easy',   25, 'published', '2026-01-12 18:00:00'),  -- id 7
(5, 'Miso Ramen',              'Hard',   60, 'published', '2026-01-25 20:00:00'),  -- id 8
(1, 'Lemon Herb Salmon',       'Medium', 25, 'published', '2026-02-08 18:00:00'),  -- id 9
(2, 'Chocolate Lava Cake',     'Hard',   30, 'draft',     '2026-03-01 15:00:00'); -- id 10 (draft)


-- ============================================================
--  5. RECIPE CUISINES
-- ============================================================
INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES
(1, 1),         -- Carbonara:        Italian
(2, 4),         -- Tikka Masala:     Indian
(3, 10),        -- Avocado Toast:    American
(4, 10),        -- Beef Burger:      American
(5, 6),         -- Thai Curry:       Thai
(6, 8), (6,11), -- Greek Salad:      Greek + Mediterranean
(7, 2),         -- Beef Tacos:       Mexican
(8, 5),         -- Miso Ramen:       Japanese
(9, 11),(9, 7), -- Lemon Herb Salmon:Mediterranean + French
(10, 7);        -- Chocolate Lava Cake: French


-- ============================================================
--  6. RECIPE DIETARY TAGS
--  Preference IDs: 1=Vegetarian  4=Gluten-free  5=Dairy-free
--                  6=Nut-free  8=Egg-free  9=Shellfish-free
-- ============================================================
INSERT INTO recipe_dietary_tags (recipe_id, preference_id) VALUES
-- Avocado Toast: Vegetarian, Dairy-free, Nut-free, Shellfish-free
(3, 1), (3, 5), (3, 6), (3, 9),
-- Greek Salad: Vegetarian, Gluten-free, Nut-free, Egg-free
(6, 1), (6, 4), (6, 6), (6, 8),
-- Thai Curry: Dairy-free, Nut-free, Egg-free
(5, 5), (5, 6), (5, 8),
-- Beef Tacos: Gluten-free, Dairy-free, Nut-free, Egg-free
(7, 4), (7, 5), (7, 6), (7, 8),
-- Lemon Herb Salmon: Gluten-free, Dairy-free, Nut-free, Egg-free
(9, 4), (9, 5), (9, 6), (9, 8),
-- Miso Ramen: Dairy-free, Nut-free
(8, 5), (8, 6);


-- ============================================================
--  7. RECIPE INGREDIENTS
-- ============================================================
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES

-- ── Recipe 1: Spaghetti Carbonara ────────────────────────────
(1,  64, 400.00, 'grams'),        -- Spaghetti
(1, 216, 200.00, 'grams'),        -- Bacon
(1,  41,   4.00, 'count'),        -- Eggs
(1,  47, 100.00, 'grams'),        -- Parmesan Cheese
(1,  74,   2.00, 'count'),        -- Garlic
(1, 149,   1.00, 'pinch'),        -- Salt
(1, 150,   1.00, 'pinch'),        -- Black Pepper
(1, 141,   2.00, 'tablespoons'),  -- Olive Oil

-- ── Recipe 2: Chicken Tikka Masala ───────────────────────────
(2,   1, 600.00, 'grams'),        -- Chicken Breast
(2,  50, 150.00, 'grams'),        -- Greek Yogurt
(2,  71,   4.00, 'count'),        -- Tomato
(2,  72,   2.00, 'count'),        -- Onion
(2,  74,   4.00, 'count'),        -- Garlic
(2, 171,  30.00, 'grams'),        -- Ginger
(2, 151,   2.00, 'teaspoons'),    -- Cumin
(2, 152,   2.00, 'teaspoons'),    -- Coriander Powder
(2, 153,   1.00, 'teaspoons'),    -- Turmeric
(2, 175,   2.00, 'teaspoons'),    -- Garam Masala
(2,  53, 100.00, 'ml'),           -- Heavy Cream
(2, 141,   3.00, 'tablespoons'),  -- Olive Oil

-- ── Recipe 3: Avocado Toast with Eggs ────────────────────────
(3, 107,   2.00, 'count'),        -- Avocado
(3,  41,   2.00, 'count'),        -- Eggs
(3, 103,   1.00, 'count'),        -- Lemon
(3, 149,   1.00, 'pinch'),        -- Salt
(3, 150,   1.00, 'pinch'),        -- Black Pepper
(3, 174,   1.00, 'pinch'),        -- Chili Flakes
(3, 141,   1.00, 'tablespoons'),  -- Olive Oil

-- ── Recipe 4: Classic Beef Burger ────────────────────────────
(4,  12, 500.00, 'grams'),        -- Ground Beef
(4,  72,   1.00, 'count'),        -- Onion
(4,  74,   2.00, 'count'),        -- Garlic
(4,  41,   1.00, 'count'),        -- Eggs
(4,  67,  50.00, 'grams'),        -- Bread Crumbs
(4, 154,   1.00, 'teaspoons'),    -- Paprika
(4,  45, 100.00, 'grams'),        -- Cheddar Cheese
(4, 149,   1.00, 'pinch'),        -- Salt
(4, 150,   1.00, 'pinch'),        -- Black Pepper

-- ── Recipe 5: Thai Green Curry ───────────────────────────────
(5,   1, 500.00, 'grams'),        -- Chicken Breast
(5, 204, 400.00, 'ml'),           -- Coconut Milk
(5, 203, 200.00, 'ml'),           -- Vegetable Stock
(5,  83,   1.00, 'count'),        -- Bell Pepper (Red)
(5,  86,   2.00, 'count'),        -- Zucchini
(5,  74,   3.00, 'count'),        -- Garlic
(5, 171,  20.00, 'grams'),        -- Ginger
(5, 176,   2.00, 'tablespoons'),  -- Soy Sauce
(5, 104,   2.00, 'count'),        -- Lime
(5, 168,  30.00, 'grams'),        -- Cilantro
(5, 144,   1.00, 'tablespoons'),  -- Sesame Oil
(5, 149,   1.00, 'pinch'),        -- Salt

-- ── Recipe 6: Greek Salad ─────────────────────────────────────
(6, 100, 250.00, 'grams'),        -- Cherry Tomatoes
(6,  92,   1.00, 'count'),        -- Cucumber
(6,  73,   0.50, 'count'),        -- Red Onion
(6, 234, 100.00, 'grams'),        -- Olives
(6,  48, 150.00, 'grams'),        -- Feta Cheese
(6, 141,   4.00, 'tablespoons'),  -- Olive Oil
(6, 188,   2.00, 'tablespoons'),  -- Balsamic Vinegar
(6, 163,   1.00, 'teaspoons'),    -- Oregano
(6, 149,   1.00, 'pinch'),        -- Salt
(6, 150,   1.00, 'pinch'),        -- Black Pepper

-- ── Recipe 7: Beef Tacos ──────────────────────────────────────
(7,  12, 400.00, 'grams'),        -- Ground Beef
(7, 245,   8.00, 'count'),        -- Tortillas (Corn)
(7,  71,   2.00, 'count'),        -- Tomato
(7,  72,   1.00, 'count'),        -- Onion
(7,  74,   2.00, 'count'),        -- Garlic
(7, 156,   2.00, 'teaspoons'),    -- Chili Powder
(7, 151,   1.00, 'teaspoons'),    -- Cumin
(7, 168,  20.00, 'grams'),        -- Cilantro
(7, 104,   1.00, 'count'),        -- Lime
(7, 141,   2.00, 'tablespoons'),  -- Olive Oil
(7, 149,   1.00, 'pinch'),        -- Salt

-- ── Recipe 8: Miso Ramen ──────────────────────────────────────
(8, 236, 300.00, 'grams'),        -- Ramen Noodles
(8, 213,   4.00, 'tablespoons'),  -- Miso Paste
(8, 203,   1.00, 'liters'),       -- Vegetable Stock
(8,  41,   2.00, 'count'),        -- Eggs
(8,  99,   4.00, 'count'),        -- Spring Onion
(8,  98,   2.00, 'count'),        -- Bok Choy
(8, 144,   2.00, 'tablespoons'),  -- Sesame Oil
(8, 176,   3.00, 'tablespoons'),  -- Soy Sauce
(8, 134,   2.00, 'tablespoons'),  -- Sesame Seeds
(8, 171,  20.00, 'grams'),        -- Ginger
(8,  74,   3.00, 'count'),        -- Garlic

-- ── Recipe 9: Lemon Herb Salmon ───────────────────────────────
(9,  21, 600.00, 'grams'),        -- Salmon
(9, 103,   2.00, 'count'),        -- Lemon
(9, 165,  10.00, 'grams'),        -- Rosemary
(9, 164,  10.00, 'grams'),        -- Thyme
(9, 141,   3.00, 'tablespoons'),  -- Olive Oil
(9,  74,   3.00, 'count'),        -- Garlic
(9,  95, 300.00, 'grams'),        -- Asparagus
(9, 149,   1.00, 'pinch'),        -- Salt
(9, 150,   1.00, 'pinch'),        -- Black Pepper

-- ── Recipe 10: Chocolate Lava Cake (draft) ────────────────────
(10, 196, 150.00, 'grams'),       -- Dark Chocolate
(10,  52, 100.00, 'grams'),       -- Butter
(10,  41,   4.00, 'count'),       -- Eggs
(10, 189,  80.00, 'grams'),       -- Sugar
(10,  56,  40.00, 'grams'),       -- All-Purpose Flour
(10, 198,   1.00, 'teaspoons'),   -- Vanilla Extract
(10, 191,  20.00, 'grams');       -- Powdered Sugar


-- ============================================================
--  8. RECIPE INSTRUCTIONS
-- ============================================================
INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text) VALUES

-- ── Recipe 1: Spaghetti Carbonara ────────────────────────────
(1, 1, 'Bring a large pot of well-salted water to a boil. Cook the spaghetti until al dente according to packet instructions.'),
(1, 2, 'While the pasta cooks, slice the bacon into small strips. Heat olive oil in a large frying pan over medium heat and fry the bacon until golden and crispy. Add the garlic and cook for 1 more minute, then remove the pan from the heat.'),
(1, 3, 'In a bowl, whisk together the eggs and finely grated Parmesan. Season very generously with black pepper.'),
(1, 4, 'Reserve a large mug of pasta cooking water before draining the spaghetti.'),
(1, 5, 'Add the hot drained pasta straight to the bacon pan (still off the heat). Toss well to coat in the fat. Quickly pour in the egg and Parmesan mixture, tossing constantly and adding splashes of pasta water until a glossy, creamy sauce forms. Work fast – the residual heat cooks the eggs.'),
(1, 6, 'Serve immediately in warm bowls with extra grated Parmesan and a generous crack of black pepper.'),

-- ── Recipe 2: Chicken Tikka Masala ───────────────────────────
(2, 1, 'Cut the chicken into bite-sized pieces. Mix with Greek yogurt, turmeric, half the cumin, half the ginger, and a pinch of salt. Cover and marinate for at least 30 minutes, or overnight in the fridge for best results.'),
(2, 2, 'Heat a grill pan or heavy frying pan to high heat. Cook the marinated chicken in batches until slightly charred and cooked through, about 4–5 minutes per side. Set aside.'),
(2, 3, 'In a large pan, heat olive oil over medium heat. Sauté the finely chopped onion until golden and soft, about 8–10 minutes. Add the remaining garlic and ginger and cook for 2 minutes.'),
(2, 4, 'Stir in the remaining cumin, coriander powder, and garam masala. Cook for 1 minute until fragrant. Add the blended tomatoes and simmer on medium-low for 10 minutes, stirring occasionally, until the sauce thickens and the oil begins to separate.'),
(2, 5, 'Pour in the heavy cream and stir well. Add the chargrilled chicken pieces and simmer gently for a further 10 minutes.'),
(2, 6, 'Taste and adjust seasoning with salt. Serve with basmati rice or warm naan, garnished with fresh cilantro.'),

-- ── Recipe 3: Avocado Toast with Eggs ────────────────────────
(3, 1, 'Halve and stone the avocados. Scoop the flesh into a bowl.'),
(3, 2, 'Mash the avocado well with a fork. Stir in fresh lemon juice, salt and black pepper. Taste and adjust – it should be bright and well-seasoned.'),
(3, 3, 'Toast your bread to your liking – a good thick slice of sourdough works brilliantly.'),
(3, 4, 'Heat olive oil in a non-stick frying pan over medium heat. Crack in the eggs and fry to your preference. Sunny side up with a runny yolk is the classic choice here.'),
(3, 5, 'Spread the avocado generously over the warm toast. Slide the fried egg on top. Finish with a pinch of chili flakes and a final squeeze of lemon.'),

-- ── Recipe 4: Classic Beef Burger ────────────────────────────
(4, 1, 'Finely dice the onion and mince the garlic. Combine with ground beef, egg, breadcrumbs, paprika, salt and black pepper in a large bowl. Mix until just combined – do not overwork the meat.'),
(4, 2, 'Divide into 4 equal portions and shape into patties about 2cm thick. Press a small indent into the centre of each with your thumb (this stops them puffing up). Refrigerate for 15 minutes.'),
(4, 3, 'Heat a griddle pan, cast iron skillet, or barbecue to high heat. Cook the patties for 4–5 minutes per side for medium doneness. Do not press them down.'),
(4, 4, 'Lay a slice of cheddar on each patty in the final minute of cooking. Cover loosely with foil or a lid to help the cheese melt.'),
(4, 5, 'Toast the buns lightly. Build your burger with your favourite toppings – lettuce, tomato, pickles and a good burger sauce all work beautifully. Serve straight away.'),

-- ── Recipe 5: Thai Green Curry ───────────────────────────────
(5, 1, 'Blend the garlic, ginger, and a generous handful of cilantro with 2 tablespoons of water into a coarse paste.'),
(5, 2, 'Heat sesame oil in a wok or large deep pan over medium-high heat. Add the paste and stir-fry for 2 minutes until fragrant.'),
(5, 3, 'Add the chicken strips and cook, stirring frequently, for 3–4 minutes until sealed and lightly coloured on all sides.'),
(5, 4, 'Pour in the coconut milk and vegetable stock. Add the sliced bell pepper and zucchini. Bring to a gentle simmer.'),
(5, 5, 'Cook for 15 minutes until the chicken is cooked through and the vegetables are tender but still have a little bite.'),
(5, 6, 'Season with soy sauce and the juice of the limes. Taste and adjust. Serve over steamed jasmine rice, scattered with the remaining fresh cilantro.'),

-- ── Recipe 6: Greek Salad ─────────────────────────────────────
(6, 1, 'Halve the cherry tomatoes and place in a large serving bowl.'),
(6, 2, 'Cut the cucumber in half lengthways, scoop out the seeds with a spoon, and dice into chunky pieces. Thinly slice the red onion into half moons.'),
(6, 3, 'Add the cucumber, red onion, and olives to the bowl. Crumble the feta cheese generously over the top.'),
(6, 4, 'Whisk together the olive oil, balsamic vinegar, dried oregano, salt and black pepper until combined.'),
(6, 5, 'Pour the dressing over the salad. Give it a very gentle toss to avoid breaking up the feta too much. Serve immediately.'),

-- ── Recipe 7: Beef Tacos ──────────────────────────────────────
(7, 1, 'Heat olive oil in a large frying pan over medium heat. Finely chop the onion and garlic, and sauté for about 5 minutes until softened and lightly golden.'),
(7, 2, 'Add the ground beef, breaking it up with a wooden spoon. Cook for 8–10 minutes, stirring occasionally, until well browned and any excess liquid has evaporated.'),
(7, 3, 'Stir in the chili powder, cumin and salt. Cook for 2 more minutes. Taste and adjust the seasoning.'),
(7, 4, 'Meanwhile, dice the tomatoes and roughly chop the cilantro. Toss together in a bowl with a good squeeze of lime juice and a pinch of salt to make a quick fresh salsa.'),
(7, 5, 'Warm the corn tortillas in a dry frying pan for about 30 seconds per side, or directly over a gas flame for a light char.'),
(7, 6, 'Fill each tortilla with the seasoned beef and spoon over the tomato salsa. Serve with extra lime wedges on the side.'),

-- ── Recipe 8: Miso Ramen ──────────────────────────────────────
(8, 1, 'Bring a small pot of water to a rolling boil. Gently lower in the eggs and cook for exactly 7 minutes. Transfer to a bowl of iced water to cool. Peel and marinate in soy sauce for at least 20 minutes.'),
(8, 2, 'Heat sesame oil in a large saucepan over medium heat. Add the grated ginger and minced garlic. Cook for 1–2 minutes until fragrant.'),
(8, 3, 'Pour in the vegetable stock and bring to a gentle simmer. Ladle about half a cup of the hot broth into a separate bowl and whisk in the miso paste until fully dissolved. Return the miso mixture to the pot and stir. Do not allow the broth to boil vigorously after adding miso.'),
(8, 4, 'Add the remaining soy sauce to the broth. Taste and adjust the seasoning – it should be deeply savoury.'),
(8, 5, 'Cook the ramen noodles in a separate pot of boiling water according to packet instructions. Drain and divide between two large bowls.'),
(8, 6, 'Add the bok choy halves to the simmering broth and blanch for 2 minutes until just wilted.'),
(8, 7, 'Ladle the hot broth and bok choy over the noodles. Halve the marinated eggs and place on top. Finish with sliced spring onion and a sprinkle of sesame seeds.'),

-- ── Recipe 9: Lemon Herb Salmon ───────────────────────────────
(9, 1, 'Preheat your oven to 200°C (fan 180°C). Line a large baking tray with parchment paper.'),
(9, 2, 'Finely zest one lemon and juice both. Mince the garlic. Strip the rosemary and thyme leaves from their stems and finely chop.'),
(9, 3, 'Mix together the olive oil, lemon zest, lemon juice, garlic, rosemary, thyme, salt and black pepper to create a herb oil.'),
(9, 4, 'Place the salmon fillets skin-side down on the baking tray. Spoon the herb oil evenly over each fillet. Arrange the asparagus spears in a single layer around the salmon and drizzle any remaining herb oil over them.'),
(9, 5, 'Bake for 15–18 minutes until the salmon is opaque and flakes easily with a fork. The asparagus should be tender with slightly caramelised tips.'),
(9, 6, 'Serve immediately with the remaining lemon slices on the side.'),

-- ── Recipe 10: Chocolate Lava Cake (draft) ────────────────────
(10, 1, 'Preheat oven to 200°C (fan 180°C). Generously butter six ramekins and dust with a little cocoa powder or flour, tapping out any excess.'),
(10, 2, 'Break the dark chocolate into pieces and combine with the butter in a heatproof bowl set over a pan of barely simmering water. Stir occasionally until fully melted and smooth. Remove from heat and allow to cool for 5 minutes.'),
(10, 3, 'In a large bowl, whisk the eggs and sugar together until pale, thick and slightly increased in volume, about 2–3 minutes. Stir in the vanilla extract.'),
(10, 4, 'Gently fold the chocolate mixture into the egg mixture until combined. Sift in the flour and fold carefully until just incorporated – do not overmix.'),
(10, 5, 'Divide the batter evenly between the prepared ramekins. At this point they can be covered and refrigerated for up to 24 hours.'),
(10, 6, 'Bake for exactly 10–12 minutes – the edges should be set and pulling away slightly from the sides, but the centre should still have a distinct wobble. Do not overbake or you will lose the molten centre.'),
(10, 7, 'Run a palette knife around the edges. Place a serving plate on top of each ramekin and carefully invert. Dust with powdered sugar and serve immediately.');


-- ============================================================
--  9. RECIPE NUTRITION  (per serving, approximate values)
-- ============================================================
INSERT INTO recipe_nutrition (recipe_id, calories, protein_g, carbs_g, fat_g) VALUES
(1,  650,  28.00,  72.00, 28.00),  -- Spaghetti Carbonara
(2,  480,  38.00,  22.00, 26.00),  -- Chicken Tikka Masala
(3,  320,  12.00,  28.00, 18.00),  -- Avocado Toast with Eggs
(4,  550,  35.00,  28.00, 32.00),  -- Classic Beef Burger
(5,  420,  30.00,  18.00, 26.00),  -- Thai Green Curry
(6,  220,   8.00,  14.00, 16.00),  -- Greek Salad
(7,  480,  28.00,  32.00, 24.00),  -- Beef Tacos
(8,  520,  22.00,  62.00, 18.00),  -- Miso Ramen
(9,  380,  38.00,   8.00, 22.00),  -- Lemon Herb Salmon
(10, 480,   8.00,  52.00, 28.00);  -- Chocolate Lava Cake


-- ============================================================
--  10. REVIEWS
--  Rule: no user reviews their own recipe
--  Recipe 10 is a draft so no reviews
--
--  Columns: (user_id, recipe_id, rating, review_text)
-- ============================================================
INSERT INTO reviews (user_id, recipe_id, rating, review_text, review_date) VALUES

-- Recipe 1: Spaghetti Carbonara (by Emma/3) — reviewed by 1,2,4,5
(1, 1, 5, 'Absolutely perfect. The texture was exactly right – glossy and creamy without a hint of scrambled egg. Made it twice in one week.', '2025-11-15 20:10:00'),
(2, 1, 4, 'Really enjoyed this. I added extra garlic which worked brilliantly. The pasta water trick is genuinely the key – do not skip it.', '2025-11-18 19:45:00'),
(4, 1, 5, 'Best carbonara I''ve ever made at home. Simple ingredient list, incredible result. This is now my go-to pasta dish.', '2025-11-22 21:00:00'),
(5, 1, 4, 'Rich, creamy and deeply satisfying. I swapped the bacon for pancetta and it was outstanding. A new household favourite.', '2025-12-01 19:30:00'),

-- Recipe 2: Chicken Tikka Masala (by Priya/5) — reviewed by 1,2,3
(1, 2, 5, 'Rich, fragrant and full of flavour. The overnight marinade makes a real difference – the chicken was incredibly tender and juicy.', '2025-11-25 20:00:00'),
(2, 2, 4, 'Tastes exactly like a good restaurant tikka. The cream at the end brings everything together beautifully. Will make regularly.', '2025-11-28 19:15:00'),
(3, 2, 4, 'Spot-on spice balance. I doubled the garam masala for extra depth and it was perfect. My new go-to curry recipe.', '2025-12-03 18:50:00'),

-- Recipe 3: Avocado Toast with Eggs (by Sarah/1) — reviewed by 2,3,5
(2, 3, 5, 'Simple and absolutely satisfying for brunch. The lemon in the avocado mash makes all the difference. Brilliant.', '2025-12-05 09:30:00'),
(3, 3, 4, 'Great base recipe. I topped mine with some smoked salmon and capers which took it to another level.', '2025-12-08 10:15:00'),
(5, 3, 5, 'Quick, healthy and genuinely delicious. I make this every single weekend morning now. Perfect every time.', '2025-12-12 09:45:00'),

-- Recipe 4: Classic Beef Burger (by Miguel/4) — reviewed by 1,2,3
(1, 4, 4, 'Juicy and packed with flavour. The whole family loved it. I served it with homemade coleslaw and it was a real winner.', '2025-12-18 13:00:00'),
(2, 4, 4, 'Solid reliable recipe. I added some jalapeños and a chipotle mayo – worked perfectly. Definitely a keeper.', '2025-12-22 13:30:00'),
(3, 4, 5, 'Best homemade burger I''ve had. The breadcrumbs are a game-changer for texture. Way better than I expected.', '2025-12-28 12:45:00'),

-- Recipe 5: Thai Green Curry (by James/2) — reviewed by 1,4,5
(1, 5, 4, 'Lovely fragrant curry with just the right heat level. The coconut milk keeps it beautifully creamy without being heavy.', '2026-01-02 20:00:00'),
(4, 5, 3, 'Good flavour but I personally love it much spicier. Added three times the chili and it was much more my style.', '2026-01-05 19:45:00'),
(5, 5, 5, 'The flavours are so authentic – it genuinely reminded me of the curries I had in Bangkok. Outstanding home recipe.', '2026-01-08 20:30:00'),

-- Recipe 6: Greek Salad (by Emma/3) — reviewed by 1,2,5
(1, 6, 5, 'So fresh and vibrant. I added some grilled chicken on top and it made a perfect light dinner. Will be a summer staple.', '2026-01-10 13:15:00'),
(2, 6, 4, 'Clean, light and tasty. I used red wine vinegar instead of balsamic which was more authentic and worked brilliantly.', '2026-01-14 12:50:00'),
(5, 6, 5, 'Exactly what a Greek salad should be. The quality of the feta really matters here – buy a good one and you''ll thank yourself.', '2026-01-18 13:05:00'),

-- Recipe 7: Beef Tacos (by Miguel/4) — reviewed by 2,3,5
(2, 7, 5, 'Street taco vibes at home – this is brilliant. I laid out all the toppings and everyone built their own. Big hit at dinner.', '2026-01-20 19:30:00'),
(3, 7, 4, 'Made these for a casual dinner party and they were a huge hit. So easy to scale up and everyone loved the fresh salsa.', '2026-01-24 19:45:00'),
(5, 7, 4, 'Tasty and easy to put together on a weeknight. The spice blend is just right. Great for a quick midweek dinner.', '2026-01-28 18:55:00'),

-- Recipe 8: Miso Ramen (by Priya/5) — reviewed by 1,3,4
(1, 8, 5, 'Restaurant-quality ramen at home. The miso broth is just magical – deep, savoury and warming. Worth every minute of effort.', '2026-02-02 21:00:00'),
(3, 8, 4, 'Takes a bit of time but every single step is worth it. I added firm tofu and extra bok choy. Absolutely fantastic.', '2026-02-06 20:30:00'),
(4, 8, 4, 'Had never made ramen from scratch before. Turned out incredible. The soy-marinated egg is an absolute must – do not skip it.', '2026-02-10 20:45:00'),

-- Recipe 9: Lemon Herb Salmon (by Sarah/1) — reviewed by 2,4,5
(2, 9, 4, 'Perfectly cooked salmon – clean, fresh flavours that really let the fish speak for itself. Elegant and simple.', '2026-02-15 19:30:00'),
(4, 9, 5, 'Simple elegance on a plate. This is now my go-to salmon recipe. The asparagus roasted alongside is a genius touch.', '2026-02-19 19:15:00'),
(5, 9, 5, 'The lemon and herbs are a perfect match with the salmon. Healthy, quick and absolutely delicious. Already made it three times.', '2026-02-23 19:45:00');


-- ============================================================
--  11. FAVOURITES  (user_id, recipe_id)
-- ============================================================
INSERT INTO favourites (user_id, recipe_id) VALUES
-- Carbonara (1) — faved by Sarah, James, Miguel, Priya
(1, 1), (2, 1), (4, 1), (5, 1),
-- Tikka Masala (2) — faved by Sarah, Emma, James
(1, 2), (3, 2), (2, 2),
-- Avocado Toast (3) — faved by Emma, Priya
(3, 3), (5, 3),
-- Beef Burger (4) — faved by Emma, James
(3, 4), (2, 4),
-- Thai Curry (5) — faved by Sarah, Priya
(1, 5), (5, 5),
-- Greek Salad (6) — faved by Sarah, James, Priya
(1, 6), (2, 6), (5, 6),
-- Beef Tacos (7) — faved by James, Emma
(2, 7), (3, 7),
-- Miso Ramen (8) — faved by Sarah, Miguel
(1, 8), (4, 8),
-- Lemon Herb Salmon (9) — faved by James, Miguel, Priya
(2, 9), (4, 9), (5, 9);


-- ============================================================
--  12. UPDATE recipe_stats
--  Trigger sets everything to 0; recalculate from actual data.
--  (user_id, recipe_id, rating) → avg and count per recipe
--
--  Recipe 1:  (5+4+5+4)/4 = 4.50  count=4  favs=4
--  Recipe 2:  (5+4+4)/3   = 4.33  count=3  favs=3
--  Recipe 3:  (5+4+5)/3   = 4.67  count=3  favs=2
--  Recipe 4:  (4+4+5)/3   = 4.33  count=3  favs=2
--  Recipe 5:  (4+3+5)/3   = 4.00  count=3  favs=2
--  Recipe 6:  (5+4+5)/3   = 4.67  count=3  favs=3
--  Recipe 7:  (5+4+4)/3   = 4.33  count=3  favs=2
--  Recipe 8:  (5+4+4)/3   = 4.33  count=3  favs=2
--  Recipe 9:  (4+5+5)/3   = 4.67  count=3  favs=3
--  Recipe 10: draft 0 reviews      count=0  favs=0
-- ============================================================
UPDATE recipe_stats SET average_rating = 4.50, total_reviews = 4, favourite_count = 4 WHERE recipe_id = 1;
UPDATE recipe_stats SET average_rating = 4.33, total_reviews = 3, favourite_count = 3 WHERE recipe_id = 2;
UPDATE recipe_stats SET average_rating = 4.67, total_reviews = 3, favourite_count = 2 WHERE recipe_id = 3;
UPDATE recipe_stats SET average_rating = 4.33, total_reviews = 3, favourite_count = 2 WHERE recipe_id = 4;
UPDATE recipe_stats SET average_rating = 4.00, total_reviews = 3, favourite_count = 2 WHERE recipe_id = 5;
UPDATE recipe_stats SET average_rating = 4.67, total_reviews = 3, favourite_count = 3 WHERE recipe_id = 6;
UPDATE recipe_stats SET average_rating = 4.33, total_reviews = 3, favourite_count = 2 WHERE recipe_id = 7;
UPDATE recipe_stats SET average_rating = 4.33, total_reviews = 3, favourite_count = 2 WHERE recipe_id = 8;
UPDATE recipe_stats SET average_rating = 4.67, total_reviews = 3, favourite_count = 3 WHERE recipe_id = 9;


-- ============================================================
--  13. PANTRY ITEMS
--  Each user has a realistic fridge/freezer/pantry matching
--  their cooking style and the recipes they create/make.
--  Columns: (user_id, ingredient_id, quantity, unit, storage_location)
-- ============================================================
INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, storage_location) VALUES

-- ── SarahC (1) – makes salmon and avocado toast ──────────────
(1, 107, 3.00,  'count',        'Fridge'),   -- Avocado
(1,  41, 6.00,  'count',        'Fridge'),   -- Eggs
(1,  21, 400.00,'grams',        'Freezer'),  -- Salmon
(1, 103, 4.00,  'count',        'Fridge'),   -- Lemon
(1,  47, 150.00,'grams',        'Fridge'),   -- Parmesan Cheese
(1, 165, 20.00, 'grams',        'Fridge'),   -- Rosemary
(1, 164, 15.00, 'grams',        'Fridge'),   -- Thyme
(1,  95, 250.00,'grams',        'Fridge'),   -- Asparagus
(1, 141, 500.00,'ml',           'Pantry'),   -- Olive Oil
(1,  74,   5.00,'count',        'Pantry'),   -- Garlic
(1, 149, 500.00,'grams',        'Pantry'),   -- Salt
(1, 150,  50.00,'grams',        'Pantry'),   -- Black Pepper
(1, 174,  20.00,'grams',        'Pantry'),   -- Chili Flakes

-- ── JamesPatel (2) – Japanese/Thai focus ─────────────────────
(2,   1, 500.00,'grams',        'Fridge'),   -- Chicken Breast
(2, 171, 100.00,'grams',        'Fridge'),   -- Ginger
(2,  99,   6.00,'count',        'Fridge'),   -- Spring Onion
(2,  98,   2.00,'count',        'Fridge'),   -- Bok Choy
(2, 213, 150.00,'grams',        'Fridge'),   -- Miso Paste
(2, 204, 400.00,'ml',           'Pantry'),   -- Coconut Milk
(2, 236, 200.00,'grams',        'Pantry'),   -- Ramen Noodles
(2, 176, 250.00,'ml',           'Pantry'),   -- Soy Sauce
(2, 144, 100.00,'ml',           'Pantry'),   -- Sesame Oil
(2,  74,   3.00,'count',        'Pantry'),   -- Garlic
(2, 203, 500.00,'ml',           'Pantry'),   -- Vegetable Stock
(2, 134,  50.00,'grams',        'Pantry'),   -- Sesame Seeds
(2, 104,   3.00,'count',        'Fridge'),   -- Lime

-- ── EmmaW (3) – Italian/Greek focus ──────────────────────────
(3,  64, 500.00,'grams',        'Pantry'),   -- Spaghetti
(3,  47, 200.00,'grams',        'Fridge'),   -- Parmesan Cheese
(3,  41,   8.00,'count',        'Fridge'),   -- Eggs
(3, 216, 200.00,'grams',        'Fridge'),   -- Bacon
(3, 100, 300.00,'grams',        'Fridge'),   -- Cherry Tomatoes
(3,  92,   2.00,'count',        'Fridge'),   -- Cucumber
(3,  48, 150.00,'grams',        'Fridge'),   -- Feta Cheese
(3,  73,   1.00,'count',        'Fridge'),   -- Red Onion
(3, 234, 200.00,'grams',        'Pantry'),   -- Olives
(3, 141, 750.00,'ml',           'Pantry'),   -- Olive Oil
(3,  74,   4.00,'count',        'Pantry'),   -- Garlic
(3, 163,  15.00,'grams',        'Pantry'),   -- Oregano
(3, 149, 500.00,'grams',        'Pantry'),   -- Salt
(3, 150,  50.00,'grams',        'Pantry'),   -- Black Pepper

-- ── MiguelT (4) – Mexican/American focus ─────────────────────
(4,  12, 600.00,'grams',        'Fridge'),   -- Ground Beef
(4,  71,   5.00,'count',        'Fridge'),   -- Tomato
(4,  45, 250.00,'grams',        'Fridge'),   -- Cheddar Cheese
(4, 245,  12.00,'count',        'Pantry'),   -- Tortillas (Corn)
(4,  72,   4.00,'count',        'Pantry'),   -- Onion
(4,  74,   5.00,'count',        'Pantry'),   -- Garlic
(4, 156,  50.00,'grams',        'Pantry'),   -- Chili Powder
(4, 151,  30.00,'grams',        'Pantry'),   -- Cumin
(4, 154,  30.00,'grams',        'Pantry'),   -- Paprika
(4, 141, 300.00,'ml',           'Pantry'),   -- Olive Oil
(4, 149, 500.00,'grams',        'Pantry'),   -- Salt
(4, 168,  20.00,'grams',        'Fridge'),   -- Cilantro

-- ── PriyaS (5) – Indian/Mediterranean focus ──────────────────
(5,   1, 600.00,'grams',        'Fridge'),   -- Chicken Breast
(5,  50, 400.00,'grams',        'Fridge'),   -- Greek Yogurt
(5,  71,   5.00,'count',        'Fridge'),   -- Tomato
(5,  53, 200.00,'ml',           'Fridge'),   -- Heavy Cream
(5, 171, 150.00,'grams',        'Fridge'),   -- Ginger
(5,  72,   5.00,'count',        'Pantry'),   -- Onion
(5,  74,   6.00,'count',        'Pantry'),   -- Garlic
(5, 151,  50.00,'grams',        'Pantry'),   -- Cumin
(5, 152,  30.00,'grams',        'Pantry'),   -- Coriander Powder
(5, 153,  20.00,'grams',        'Pantry'),   -- Turmeric
(5, 175,  30.00,'grams',        'Pantry'),   -- Garam Masala
(5, 141, 500.00,'ml',           'Pantry'),   -- Olive Oil
(5, 149, 500.00,'grams',        'Pantry');   -- Salt


-- ============================================================
--  14. DAILY MEALS  (meal planning)
--  PRIMARY KEY: (user_id, date, meal_type)
--  meal_type: 'breakfast' | 'lunch' | 'dinner'
-- ============================================================
INSERT INTO daily_meals (user_id, date, meal_type, recipe_id, is_cooked) VALUES

-- ── SarahC (1) – current week ────────────────────────────────
(1, '2026-05-01', 'breakfast', 3, TRUE),   -- Avocado Toast ✓
(1, '2026-05-01', 'dinner',    9, TRUE),   -- Salmon ✓
(1, '2026-05-02', 'lunch',     6, TRUE),   -- Greek Salad ✓
(1, '2026-05-03', 'dinner',    1, FALSE),  -- Carbonara (planned)
(1, '2026-05-05', 'dinner',    5, FALSE),  -- Thai Curry (planned)

-- ── JamesPatel (2) – current week ────────────────────────────
(2, '2026-05-01', 'dinner',    5, TRUE),   -- Thai Curry ✓
(2, '2026-05-02', 'dinner',    8, TRUE),   -- Miso Ramen ✓
(2, '2026-05-03', 'breakfast', 3, TRUE),   -- Avocado Toast ✓
(2, '2026-05-06', 'lunch',     7, FALSE),  -- Beef Tacos (planned)

-- ── EmmaW (3) – current week ─────────────────────────────────
(3, '2026-05-02', 'dinner',    1, TRUE),   -- Carbonara ✓
(3, '2026-05-04', 'dinner',    2, FALSE),  -- Tikka Masala (planned)
(3, '2026-05-05', 'lunch',     6, TRUE),   -- Greek Salad ✓

-- ── MiguelT (4) – current week ───────────────────────────────
(4, '2026-05-01', 'dinner',    4, TRUE),   -- Beef Burger ✓
(4, '2026-05-03', 'dinner',    7, TRUE),   -- Beef Tacos ✓
(4, '2026-05-04', 'lunch',     6, FALSE),  -- Greek Salad (planned)
(4, '2026-05-06', 'dinner',    2, FALSE),  -- Tikka Masala (planned)

-- ── PriyaS (5) – current week ────────────────────────────────
(5, '2026-05-02', 'dinner',    2, TRUE),   -- Tikka Masala ✓
(5, '2026-05-03', 'lunch',     6, TRUE),   -- Greek Salad ✓
(5, '2026-05-04', 'dinner',    8, FALSE),  -- Miso Ramen (planned)
(5, '2026-05-06', 'dinner',    9, FALSE);  -- Salmon (planned)
