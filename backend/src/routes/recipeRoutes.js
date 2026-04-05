const express = require('express');
const router = express.Router();
const svc = require('../controllers/recipeController');

router.get('/', async (req, res) => {
  try {
    const recipes = await svc.getAllRecipes(req.query);
    res.json({ success: true, data: recipes });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await svc.getRecipeById(
      Number(req.params.id),
      req.query.userId ? Number(req.query.userId) : null
    );
    if (!recipe) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: recipe });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const recipe = await svc.createRecipe(req.body);
    res.status(201).json({ success: true, data: recipe });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const recipe = await svc.updateRecipe(Number(req.params.id), req.body);
    res.json({ success: true, data: recipe });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await svc.deleteRecipe(
      Number(req.params.id),
      req.body.userId ?? req.body.authorId ?? req.query.userId
    );
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;