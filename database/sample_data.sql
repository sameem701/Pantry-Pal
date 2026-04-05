-- ============================================================
--  PANTRYPAL - SAMPLE TEST DATA
--  Populate tables needed for Workflow 3 testing
-- ============================================================

-- Clear existing data so the seed can be rerun safely.
truncate table shopping_list_items cascade;
truncate table shopping_lists cascade;
truncate table saved_plan_templates cascade;
truncate table meal_plan_recipes cascade;
truncate table meal_plans cascade;
truncate table cooking_sessions cascade;
truncate table recipe_dietary_tags cascade;
truncate table recipe_cuisines cascade;
truncate table user_cuisine_preference cascade;
truncate table recipe_ingredients cascade;
truncate table recipe_instructions cascade;
truncate table recipe_nutrition cascade;
truncate table recipe_stats cascade;
truncate table recipes cascade;
truncate table pantry_items cascade;
truncate table preference_food_group cascade;
truncate table user_preference cascade;
truncate table favourites cascade;
truncate table reviews cascade;
truncate table dietary_preferences cascade;
truncate table ingredients cascade;
truncate table cuisines cascade;
truncate table units cascade;
truncate table temp_users cascade;
truncate table app_users cascade;


-- ============================================================
--  TEST USERS
-- ============================================================

insert into ingredients (
   ingredient_id,
   ingredient_name,
   category
) values ( 1,
           'Chicken Breast',
           'Protein' ),( 2,
                         'Beef',
                         'Protein' ),( 3,
                                       'Salmon',
                                       'Protein' ),( 4,
                                                     'Eggs',
                                                     'Dairy' ),( 5,
                                                                 'Milk',
                                                                 'Dairy' ),( 6,
                                                                             'Cheese',
                                                                             'Dairy' ),( 7,
                                                                                         'Flour',
                                                                                         'Pantry' ),( 8,
                                                                                                      'Rice',
                                                                                                      'Grain' ),( 9,
                                                                                                                  'Tomato',
                                                                                                                  'Produce' )
                                                                                                                  ,( 10,
                                                                                                                            'Onion'
                                                                                                                            ,
                                                                                                                            'Produce'
                                                                                                                            )
                                                                                                                            ,
                                                                                                                            (
                                                                                                                            11
                                                                                                                            ,
                                                                                                                                      'Garlic'
                                                                                                                                      ,
                                                                                                                                      'Produce'
                                                                                                                                      )
                                                                                                                                      ,
                                                                                                                                      (
                                                                                                                                      12
                                                                                                                                      ,
                                                                                                                                                'Potato'
                                                                                                                                                ,
                                                                                                                                                'Produce'
                                                                                                                                                )
                                                                                                                                                ,
                                                                                                                                                (
                                                                                                                                                13
                                                                                                                                                ,
                                                                                                                                                          'Carrot'
                                                                                                                                                          ,
                                                                                                                                                          'Produce'
                                                                                                                                                          )
                                                                                                                                                          ,
                                                                                                                                                          (
                                                                                                                                                          14
                                                                                                                                                          ,
                                                                                                                                                                    'Pasta'
                                                                                                                                                                    ,
                                                                                                                                                                    'Grain'
                                                                                                                                                                    )
                                                                                                                                                                    ,
                                                                                                                                                                    (
                                                                                                                                                                    15
                                                                                                                                                                    ,
                                                                                                                                                                            'Bread'
                                                                                                                                                                            ,
                                                                                                                                                                            'Bakery'
                                                                                                                                                                            )
                                                                                                                                                                            ,
                                                                                                                                                                            (
                                                                                                                                                                            16
                                                                                                                                                                            ,
                                                                                                                                                                                     'Lettuce'
                                                                                                                                                                                     ,
                                                                                                                                                                                     'Produce'
                                                                                                                                                                                     )
                                                                                                                                                                                     ,
                                                                                                                                                                                     (
                                                                                                                                                                                     17
                                                                                                                                                                                     ,
                                                                                                                                                                                               'Cucumber'
                                                                                                                                                                                               ,
                                                                                                                                                                                               'Produce'
                                                                                                                                                                                               )
                                                                                                                                                                                               ,
                                                                                                                                                                                               (
                                                                                                                                                                                               18
                                                                                                                                                                                               ,
                                                                                                                                                                                                         'Olive Oil'
                                                                                                                                                                                                         ,
                                                                                                                                                                                                         'Pantry'
                                                                                                                                                                                                         )
                                                                                                                                                                                                         ,
                                                                                                                                                                                                         (
                                                                                                                                                                                                         19
                                                                                                                                                                                                         ,
                                                                                                                                                                                                                  'Butter'
                                                                                                                                                                                                                  ,
                                                                                                                                                                                                                  'Dairy'
                                                                                                                                                                                                                  )
                                                                                                                                                                                                                  ,
                                                                                                                                                                                                                  (
                                                                                                                                                                                                                  20
                                                                                                                                                                                                                  ,
                                                                                                                                                                                                                          'Soy Sauce'
                                                                                                                                                                                                                          ,
                                                                                                                                                                                                                          'Pantry'
                                                                                                                                                                                                                          )
                                                                                                                                                                                                                          ,
                                                                                                                                                                                                                          (
                                                                                                                                                                                                                          21
                                                                                                                                                                                                                          ,
                                                                                                                                                                                                                                   'Salt'
                                                                                                                                                                                                                                   ,
                                                                                                                                                                                                                                   'Pantry'
                                                                                                                                                                                                                                   )
                                                                                                                                                                                                                                   ;

insert into cuisines (
   cuisine_id,
   name
) values ( 1,
           'Italian' ),( 2,
                         'Mexican' ),( 3,
                                       'Chinese' ),( 4,
                                                     'Indian' ),( 5,
                                                                  'Thai' ),( 6,
                                                                             'Japanese' ),( 7,
                                                                                            'American' ),( 8,
                                                                                                           'Greek' ),( 9,
                                                                                                                       'Mediterranean'
                                                                                                                       ),( 10
                                                                                                                       ,
                                                                                                                                       'French'
                                                                                                                                       )
                                                                                                                                       ,
                                                                                                                                       (
                                                                                                                                       11
                                                                                                                                       ,
                                                                                                                                                'Lebanese'
                                                                                                                                                )
                                                                                                                                                ;

insert into dietary_preferences (
   preference_id,
   preference_name,
   preference_type
) values ( 1,
           'Vegetarian',
           'Restrictions' ),( 2,
                              'Vegan',
                              'Restrictions' ),( 3,
                                                 'Dairy-Free',
                                                 'Restrictions' ),( 4,
                                                                    'Gluten-Free',
                                                                    'Restrictions' );

insert into preference_food_group (
   preference_id,
   ingredient_id,
   allowed
) values ( 1,
           1,
           0 ),( 1,
                 2,
                 0 ),( 1,
                       3,
                       0 ),( 2,
                             1,
                             0 ),( 2,
                                   2,
                                   0 ),( 2,
                                         3,
                                         0 ),( 2,
                                               4,
                                               0 ),( 2,
                                                     5,
                                                     0 ),( 2,
                                                           6,
                                                           0 ),( 2,
                                                                 19,
                                                                 0 ),( 3,
                                                                       5,
                                                                       0 ),( 3,
                                                                             6,
                                                                             0 ),( 3,
                                                                                   19,
                                                                                   0 ),( 4,
                                                                                         7,
                                                                                         0 ),( 4,
                                                                                               14,
                                                                                               0 ),( 4,
                                                                                                     15,
                                                                                                     0 );

insert into app_users (
   email,
   password_hash,
   skill_level
) values ( 'john@example.com',
           'hashed_password_123',
           'Beginner' ),( 'sarah@example.com',
                          'hashed_password_456',
                          'Intermediate' ),( 'mike@example.com',
                                             'hashed_password_789',
                                             'Advanced' ),( 'emma@example.com',
                                                            'hashed_password_101',
                                                            'Beginner' );

-- Note: user_id 1 = john@example.com, user_id 2 = sarah@example.com, etc.


-- ============================================================
--  RECIPES (Published recipes for testing)
-- ============================================================

-- Recipe 1: Spaghetti Carbonara (Italian)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 1,
           'Spaghetti Carbonara',
           'Easy',
           20,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 1,
           450,
           18.5,
           52.0,
           15.3 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 1,
           1,
           'Bring a large pot of salted water to boil' ),( 1,
                                                           2,
                                                           'Cook spaghetti according to package directions until al dente' ),
                                                           ( 1,
                                                                                                                           3,
                                                                                                                           'Meanwhile, cut bacon into small pieces and cook in a pan until crispy'
                                                                                                                           ),
                                                                                                                           ( 1
                                                                                                                           ,
                                                                                                                                                                                                   4
                                                                                                                                                                                                   ,
                                                                                                                                                                                                   'In a bowl, whisk together eggs, cheese, and black pepper'
                                                                                                                                                                                                   )
                                                                                                                                                                                                   ,
                                                                                                                                                                                                   (
                                                                                                                                                                                                   1
                                                                                                                                                                                                   ,
                                                                                                                                                                                                                                                              5
                                                                                                                                                                                                                                                              ,
                                                                                                                                                                                                                                                              'Drain pasta, reserving 1 cup of pasta water'
                                                                                                                                                                                                                                                              )
                                                                                                                                                                                                                                                              ,
                                                                                                                                                                                                                                                              (
                                                                                                                                                                                                                                                              1
                                                                                                                                                                                                                                                              ,
                                                                                                                                                                                                                                                                                                            6
                                                                                                                                                                                                                                                                                                            ,
                                                                                                                                                                                                                                                                                                            'Add hot pasta to bacon and fat, remove from heat'
                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                            ,
                                                                                                                                                                                                                                                                                                            (
                                                                                                                                                                                                                                                                                                            1
                                                                                                                                                                                                                                                                                                            ,
                                                                                                                                                                                                                                                                                                                                                               7
                                                                                                                                                                                                                                                                                                                                                               ,
                                                                                                                                                                                                                                                                                                                                                               'Pour egg mixture over pasta while tossing constantly'
                                                                                                                                                                                                                                                                                                                                                               )
                                                                                                                                                                                                                                                                                                                                                               ,
                                                                                                                                                                                                                                                                                                                                                               (
                                                                                                                                                                                                                                                                                                                                                               1
                                                                                                                                                                                                                                                                                                                                                               ,
                                                                                                                                                                                                                                                                                                                                                                                                                      8
                                                                                                                                                                                                                                                                                                                                                                                                                      ,
                                                                                                                                                                                                                                                                                                                                                                                                                      'Add pasta water as needed to achieve creamy sauce'
                                                                                                                                                                                                                                                                                                                                                                                                                      )
                                                                                                                                                                                                                                                                                                                                                                                                                      ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 1,
           8,
           400,
           'grams' ),      -- Rice (using as pasta placeholder)
           ( 1,
                       4,
                       4,
                       'count' ),        -- Eggs
                       ( 1,
                                   6,
                                   100,
                                   'grams' ),      -- Cheese
                                   ( 1,
                                               21,
                                               2,
                                               'teaspoons' ),   -- Black Pepper
                                               ( 1,
                                                               18,
                                                               2,
                                                               'tablespoons' ); -- Olive Oil

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 1,
           1 ); -- Italian

-- Recipe 2: Chicken Stir Fry (Asian)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 1,
           'Chicken Stir Fry',
           'Medium',
           25,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 2,
           380,
           42.0,
           28.0,
           8.5 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 2,
           1,
           'Slice chicken breast into thin strips' ),( 2,
                                                       2,
                                                       'Heat oil in a wok or large skillet over high heat' ),( 2,
                                                                                                               3,
                                                                                                               'Stir-fry chicken until cooked through, about 6-8 minutes'
                                                                                                               ),( 2,
                                                                                                                                                                          4
                                                                                                                                                                          ,
                                                                                                                                                                          'Add chopped vegetables (onion, carrot, garlic)'
                                                                                                                                                                          )
                                                                                                                                                                          ,
                                                                                                                                                                          (
                                                                                                                                                                          2
                                                                                                                                                                          ,
                                                                                                                                                                                                                           5
                                                                                                                                                                                                                           ,
                                                                                                                                                                                                                           'Cook until vegetables are tender-crisp'
                                                                                                                                                                                                                           )
                                                                                                                                                                                                                           ,
                                                                                                                                                                                                                           (
                                                                                                                                                                                                                           2
                                                                                                                                                                                                                           ,
                                                                                                                                                                                                                                                                    6
                                                                                                                                                                                                                                                                    ,
                                                                                                                                                                                                                                                                    'Add soy sauce and ginger'
                                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                                    ,
                                                                                                                                                                                                                                                                    (
                                                                                                                                                                                                                                                                    2
                                                                                                                                                                                                                                                                    ,
                                                                                                                                                                                                                                                                                               7
                                                                                                                                                                                                                                                                                               ,
                                                                                                                                                                                                                                                                                               'Toss everything together and serve over rice'
                                                                                                                                                                                                                                                                                               )
                                                                                                                                                                                                                                                                                               ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 2,
           1,
           500,
           'grams' ),      -- Chicken Breast
           ( 2,
                       10,
                       2,
                       'count' ),       -- Onion
                       ( 2,
                                   13,
                                   1,
                                   'count' ),       -- Carrot
                                   ( 2,
                                               11,
                                               3,
                                               'teaspoons' ),   -- Garlic
                                               ( 2,
                                                               18,
                                                               3,
                                                               'tablespoons' ); -- Olive Oil

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 2,
           3 ); -- Chinese

-- Recipe 3: Greek Salad (Mediterranean)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 2,
           'Greek Salad',
           'Easy',
           10,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 3,
           210,
           8.5,
           16.0,
           12.0 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 3,
           1,
           'Dice tomatoes into bite-sized pieces' ),( 3,
                                                      2,
                                                      'Cut cucumber into chunks' ),( 3,
                                                                                     3,
                                                                                     'Slice red onion thinly' ),( 3,
                                                                                                                  4,
                                                                                                                  'Combine all vegetables in a large bowl'
                                                                                                                  ),( 3,
                                                                                                                                                           5
                                                                                                                                                           ,
                                                                                                                                                           'Add olives and crumbled feta cheese'
                                                                                                                                                           )
                                                                                                                                                           ,
                                                                                                                                                           (
                                                                                                                                                           3
                                                                                                                                                           ,
                                                                                                                                                                                                 6
                                                                                                                                                                                                 ,
                                                                                                                                                                                                 'Dress with olive oil and lemon juice'
                                                                                                                                                                                                 )
                                                                                                                                                                                                 ,
                                                                                                                                                                                                 (
                                                                                                                                                                                                 3
                                                                                                                                                                                                 ,
                                                                                                                                                                                                                                        7
                                                                                                                                                                                                                                        ,
                                                                                                                                                                                                                                        'Season with salt and pepper, toss gently'
                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                        ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 3,
           9,
           3,
           'count' ),        -- Tomato
           ( 3,
                       10,
                       1,
                       'count' ),       -- Onion
                       ( 3,
                                   6,
                                   200,
                                   'grams' ),      -- Cheese (feta)
                                   ( 3,
                                               18,
                                               3,
                                               'tablespoons' ), -- Olive Oil
                                               ( 3,
                                                                 21,
                                                                 1,
                                                                 'teaspoon' );    -- Salt

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 3,
           8 ); -- Greek

-- Recipe 4: Beef Tacos (Mexican)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 2,
           'Beef Tacos',
           'Easy',
           15,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 4,
           320,
           28.0,
           22.0,
           10.5 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 4,
           1,
           'Brown ground beef in a large skillet over medium-high heat' ),( 4,
                                                                            2,
                                                                            'Drain excess fat from the beef' ),( 4,
                                                                                                                 3,
                                                                                                                 'Add taco seasoning and water'
                                                                                                                 ),( 4,
                                                                                                                                                4
                                                                                                                                                ,
                                                                                                                                                'Simmer for 5 minutes'
                                                                                                                                                )
                                                                                                                                                ,
                                                                                                                                                (
                                                                                                                                                4
                                                                                                                                                ,
                                                                                                                                                                       5
                                                                                                                                                                       ,
                                                                                                                                                                       'Warm tortillas in a dry skillet'
                                                                                                                                                                       )
                                                                                                                                                                       ,
                                                                                                                                                                       (
                                                                                                                                                                       4
                                                                                                                                                                       ,
                                                                                                                                                                                                         6
                                                                                                                                                                                                         ,
                                                                                                                                                                                                         'Fill tortillas with seasoned beef'
                                                                                                                                                                                                         )
                                                                                                                                                                                                         ,
                                                                                                                                                                                                         (
                                                                                                                                                                                                         4
                                                                                                                                                                                                         ,
                                                                                                                                                                                                                                             7
                                                                                                                                                                                                                                             ,
                                                                                                                                                                                                                                             'Top with tomato, onion, and cheese'
                                                                                                                                                                                                                                             )
                                                                                                                                                                                                                                             ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 4,
           2,
           500,
           'grams' ),      -- Beef Steak (ground)
           ( 4,
                       9,
                       2,
                       'count' ),        -- Tomato
                       ( 4,
                                   10,
                                   1,
                                   'count' ),       -- Onion
                                   ( 4,
                                               6,
                                               100,
                                               'grams' ),      -- Cheese
                                               ( 4,
                                                           18,
                                                           2,
                                                           'tablespoons' ); -- Olive Oil

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 4,
           2 ); -- Mexican

-- Recipe 5: Salmon with Vegetables (Mediterranean)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 3,
           'Baked Salmon with Vegetables',
           'Medium',
           30,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 5,
           480,
           45.0,
           18.0,
           20.0 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 5,
           1,
           'Preheat oven to 400°F (200°C)' ),( 5,
                                               2,
                                               'Place salmon fillets on a baking sheet' ),( 5,
                                                                                            3,
                                                                                            'Arrange diced vegetables (carrot, potato) around salmon'
                                                                                            ),( 5,
                                                                                                                                                      4
                                                                                                                                                      ,
                                                                                                                                                      'Drizzle with olive oil and season with salt and pepper'
                                                                                                                                                      )
                                                                                                                                                      ,
                                                                                                                                                      (
                                                                                                                                                      5
                                                                                                                                                      ,
                                                                                                                                                                                                               5
                                                                                                                                                                                                               ,
                                                                                                                                                                                                               'Bake for 20-25 minutes until salmon is cooked through'
                                                                                                                                                                                                               )
                                                                                                                                                                                                               ,
                                                                                                                                                                                                               (
                                                                                                                                                                                                               5
                                                                                                                                                                                                               ,
                                                                                                                                                                                                                                                                       6
                                                                                                                                                                                                                                                                       ,
                                                                                                                                                                                                                                                                       'Squeeze fresh lemon juice over everything before serving'
                                                                                                                                                                                                                                                                       )
                                                                                                                                                                                                                                                                       ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 5,
           3,
           400,
           'grams' ),      -- Salmon
           ( 5,
                       13,
                       1,
                       'count' ),       -- Carrot
                       ( 5,
                                   12,
                                   2,
                                   'count' ),       -- Potato
                                   ( 5,
                                               18,
                                               3,
                                               'tablespoons' ), -- Olive Oil
                                               ( 5,
                                                                 21,
                                                                 1,
                                                                 'teaspoon' );    -- Salt

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 5,
           11 ); -- Mediterranean

-- Recipe 6: Vegetable Curry (Indian - Vegetarian)
insert into recipes (
   user_id,
   title,
   difficulty,
   cooking_time_min,
   status
) values ( 3,
           'Vegetable Curry',
           'Medium',
           35,
           'published' );

insert into recipe_nutrition (
   recipe_id,
   calories,
   protein_g,
   carbs_g,
   fat_g
) values ( 6,
           280,
           10.0,
           32.0,
           12.0 );

insert into recipe_instructions (
   recipe_id,
   step_number,
   instruction_text
) values ( 6,
           1,
           'Heat oil in a large pot' ),( 6,
                                         2,
                                         'Sauté onion and garlic until fragrant' ),( 6,
                                                                                     3,
                                                                                     'Add curry powder and cook for 1 minute'
                                                                                     ),( 6,
                                                                                                                              4
                                                                                                                              ,
                                                                                                                              'Add cubed potatoes, carrots, and tomatoes'
                                                                                                                              )
                                                                                                                              ,
                                                                                                                              (
                                                                                                                              6
                                                                                                                              ,
                                                                                                                                                                          5
                                                                                                                                                                          ,
                                                                                                                                                                          'Pour in coconut milk and vegetable broth'
                                                                                                                                                                          )
                                                                                                                                                                          ,
                                                                                                                                                                          (
                                                                                                                                                                          6
                                                                                                                                                                          ,
                                                                                                                                                                                                                     6
                                                                                                                                                                                                                     ,
                                                                                                                                                                                                                     'Simmer until vegetables are tender, about 20 minutes'
                                                                                                                                                                                                                     )
                                                                                                                                                                                                                     ,
                                                                                                                                                                                                                     (
                                                                                                                                                                                                                     6
                                                                                                                                                                                                                     ,
                                                                                                                                                                                                                                                                            7
                                                                                                                                                                                                                                                                            ,
                                                                                                                                                                                                                                                                            'Season with salt and serve with rice'
                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                            ;

insert into recipe_ingredients (
   recipe_id,
   ingredient_id,
   quantity,
   unit
) values ( 6,
           12,
           3,
           'count' ),       -- Potato
           ( 6,
                       13,
                       2,
                       'count' ),       -- Carrot
                       ( 6,
                                   9,
                                   2,
                                   'count' ),        -- Tomato
                                   ( 6,
                                               10,
                                               1,
                                               'count' ),       -- Onion
                                               ( 6,
                                                           11,
                                                           3,
                                                           'teaspoons' ),   -- Garlic
                                                           ( 6,
                                                                           18,
                                                                           2,
                                                                           'tablespoons' ); -- Olive Oil

insert into recipe_cuisines (
   recipe_id,
   cuisine_id
) values ( 6,
           4 ); -- Indian
insert into recipe_dietary_tags (
   recipe_id,
   preference_id
) values ( 6,
           1 ); -- Vegetarian


-- ============================================================
--  USER PANTRY (Sample inventory for testing)
-- ============================================================

insert into pantry_items (
   user_id,
   ingredient_id,
   quantity,
   unit,
   storage_location
) values ( 1,
           1,
           2.0,
           'kg',
           'Fridge' ),      -- Chicken Breast
           ( 1,
                        4,
                        12.0,
                        'count',
                        'Fridge' ),  -- Eggs
                        ( 1,
                                     5,
                                     1.0,
                                     'liters',
                                     'Fridge' ),  -- Milk
                                     ( 1,
                                                  6,
                                                  500.0,
                                                  'grams',
                                                  'Fridge' ), -- Cheese
                                                  ( 1,
                                                               7,
                                                               1.0,
                                                               'kg',
                                                               'Pantry' ),      -- Flour
                                                               ( 1,
                                                                            8,
                                                                            2.0,
                                                                            'kg',
                                                                            'Pantry' ),      -- Rice
                                                                            ( 1,
                                                                                         9,
                                                                                         3.0,
                                                                                         'count',
                                                                                         'Fridge' ),   -- Tomato
                                                                                         ( 1,
                                                                                                      10,
                                                                                                      2.0,
                                                                                                      'count',
                                                                                                      'Pantry' ),  -- Onion
                                                                                                      ( 1,
                                                                                                                   11,
                                                                                                                   1.0,
                                                                                                                   'count',
                                                                                                                   'Pantry' )
                                                                                                                   ,  -- Garlic
                                                                                                                   ( 1,
                                                                                                                            12
                                                                                                                            ,
                                                                                                                            2.0
                                                                                                                            ,
                                                                                                                            'kg'
                                                                                                                            ,
                                                                                                                            'Pantry'
                                                                                                                            )
                                                                                                                            ,     -- Potato
                                                                                                                            (
                                                                                                                            1
                                                                                                                            ,
                                                                                                                                     13
                                                                                                                                     ,
                                                                                                                                     1.0
                                                                                                                                     ,
                                                                                                                                     'kg'
                                                                                                                                     ,
                                                                                                                                     'Fridge'
                                                                                                                                     )
                                                                                                                                     ,     -- Carrot
                                                                                                                                     
                                                                                                                                     (
                                                                                                                                     1
                                                                                                                                     ,
                                                                                                                                              18
                                                                                                                                              ,
                                                                                                                                              500.0
                                                                                                                                              ,
                                                                                                                                              'ml'
                                                                                                                                              ,
                                                                                                                                              'Pantry'
                                                                                                                                              )
                                                                                                                                              ,   -- Olive Oil
                                                                                                                                              
                                                                                                                                              (
                                                                                                                                              1
                                                                                                                                              ,
                                                                                                                                                       21
                                                                                                                                                       ,
                                                                                                                                                       100.0
                                                                                                                                                       ,
                                                                                                                                                       'grams'
                                                                                                                                                       ,
                                                                                                                                                       'Pantry'
                                                                                                                                                       )
                                                                                                                                                       ,-- Salt
                                                                                                                                                       
                                                                                                                                                       (
                                                                                                                                                       2
                                                                                                                                                       ,
                                                                                                                                                                1
                                                                                                                                                                ,
                                                                                                                                                                1.5
                                                                                                                                                                ,
                                                                                                                                                                'kg'
                                                                                                                                                                ,
                                                                                                                                                                'Fridge'
                                                                                                                                                                )
                                                                                                                                                                ,      -- Chicken Breast
                                                                                                                                                                
                                                                                                                                                                (
                                                                                                                                                                2
                                                                                                                                                                ,
                                                                                                                                                                         3
                                                                                                                                                                         ,
                                                                                                                                                                         800.0
                                                                                                                                                                         ,
                                                                                                                                                                         'grams'
                                                                                                                                                                         ,
                                                                                                                                                                         'Fridge'
                                                                                                                                                                         )
                                                                                                                                                                         , -- Salmon
                                                                                                                                                                         
                                                                                                                                                                         (
                                                                                                                                                                         2
                                                                                                                                                                         ,
                                                                                                                                                                                  8
                                                                                                                                                                                  ,
                                                                                                                                                                                  1.0
                                                                                                                                                                                  ,
                                                                                                                                                                                  'kg'
                                                                                                                                                                                  ,
                                                                                                                                                                                  'Pantry'
                                                                                                                                                                                  )
                                                                                                                                                                                  ,      -- Rice
                                                                                                                                                                                  
                                                                                                                                                                                  (
                                                                                                                                                                                  2
                                                                                                                                                                                  ,
                                                                                                                                                                                           18
                                                                                                                                                                                           ,
                                                                                                                                                                                           250.0
                                                                                                                                                                                           ,
                                                                                                                                                                                           'ml'
                                                                                                                                                                                           ,
                                                                                                                                                                                           'Pantry'
                                                                                                                                                                                           )
                                                                                                                                                                                           ;   -- Olive Oil


-- ============================================================
--  USER PREFERENCES (Sample user dietary preferences)
-- ============================================================

insert into user_preference (
   user_id,
   preference_id
) values ( 2,
           1 ),  -- Sarah: Vegetarian
           ( 3,
                 4 );  -- Mike: Gluten-free

insert into user_cuisine_preference (
   user_id,
   cuisine_id
) values ( 1,
           1 ),  -- John: Italian
           ( 1,
                 3 ),  -- John: Chinese
                 ( 2,
                       8 ),  -- Sarah: Greek
                       ( 2,
                             4 ),  -- Sarah: Indian
                             ( 3,
                                   11 ); -- Mike: Mediterranean


-- ============================================================
--  REVIEWS & RATINGS
-- ============================================================

insert into reviews (
   user_id,
   recipe_id,
   rating,
   review_text
) values ( 1,
           1,
           5,
           'Best carbonara I ever made!' ),( 1,
                                             2,
                                             4,
                                             'Great weekday dinner' ),( 2,
                                                                        3,
                                                                        5,
                                                                        'Perfect light lunch' ),( 2,
                                                                                                  6,
                                                                                                  5,
                                                                                                  'Delicious and vegetarian friendly'
                                                                                                  ),( 3,
                                                                                                                                      4
                                                                                                                                      ,
                                                                                                                                      4
                                                                                                                                      ,
                                                                                                                                      'Quick and satisfying'
                                                                                                                                      )
                                                                                                                                      ,
                                                                                                                                      (
                                                                                                                                      3
                                                                                                                                      ,
                                                                                                                                                             5
                                                                                                                                                             ,
                                                                                                                                                             5
                                                                                                                                                             ,
                                                                                                                                                             'Restaurant quality at home'
                                                                                                                                                             )
                                                                                                                                                             ;

-- Update recipe_stats via the reviews (this happens if you have update triggers)
-- Or manually update recipe_stats after inserting reviews


-- ============================================================
--  FAVOURITES
-- ============================================================

insert into favourites (
   user_id,
   recipe_id
) values ( 1,
           1 ),  -- John loves Carbonara
           ( 1,
                 2 ),  -- John loves Stir Fry
                 ( 2,
                       3 ),  -- Sarah loves Greek Salad
                       ( 2,
                             6 ),  -- Sarah loves Vegetable Curry
                             ( 3,
                                   5 );  -- Mike loves Baked Salmon