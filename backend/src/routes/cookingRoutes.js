const express = require('express');
const router = express.Router();
const svc = require('../controllers/cookingController');

router.post('/start', async (req, res) => {
  try {
    const session = await svc.startSession(req.body);
    res.status(201).json({ success: true, data: session });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.query.userId ?? req.body.userId;
    const session = await svc.getSession(Number(req.params.id), userId);
    res.json({ success: true, data: session });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/step', async (req, res) => {
  try {
    const session = await svc.updateStep(Number(req.params.id), req.body.currentStep, req.body.userId);
    res.json({ success: true, data: session });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const session = await svc.completeSession(Number(req.params.id), req.body.userId);
    res.json({ success: true, data: session });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;