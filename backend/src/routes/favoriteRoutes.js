const express = require('express');
const router = express.Router();
const svc = require('../controllers/favoriteController');

router.get('/user/:userId', async (req, res) => {
  try {
    const favs = await svc.getFavorites(Number(req.params.userId));
    res.json({ success: true, data: favs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const fav = await svc.addFavorite(req.body);
    res.status(201).json({ success: true, data: fav });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/', async (req, res) => {
  try {
    const { userId, recipeId } = req.body;
    await svc.removeFavorite(Number(userId), Number(recipeId));
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;