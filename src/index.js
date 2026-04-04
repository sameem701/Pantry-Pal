require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║     🍳 PantryPal Backend Server 🍳     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server started on port ${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  👤 Users:   http://localhost:${PORT}/api/users`);
    console.log(`  🩶 Pantry:  http://localhost:${PORT}/api/pantry`);
    console.log(`  🍽️  Recipes: http://localhost:${PORT}/api/recipes`);
    console.log('');
});
