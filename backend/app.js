const express = require('express');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// TODO: Add routes here

module.exports = app;
