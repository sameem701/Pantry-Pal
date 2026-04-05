const express = require('express');
const router = express.Router();
const svc = require('../controllers/reviewController');

router.get('/recipe/:recipeId', async (req, res) => {
  try {
    const reviews = await svc.getReviewsForRecipe(Number(req.params.recipeId));
    res.json({ success: true, data: reviews });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const review = await svc.createReview(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/user/:userId/recipe/:recipeId', async (req, res) => {
  try {
    const review = await svc.updateReview(req.params.userId, req.params.recipeId, req.body);
    res.json({ success: true, data: review });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const review = await svc.updateReview(req.body.userId, req.body.recipeId ?? req.params.id, req.body);
    res.json({ success: true, data: review });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/user/:userId/recipe/:recipeId', async (req, res) => {
  try {
    await svc.deleteReview(req.params.userId, req.params.recipeId);
    res.json({ success: true, message: 'Review deleted' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await svc.deleteReview(req.body.userId, req.body.recipeId ?? req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;
