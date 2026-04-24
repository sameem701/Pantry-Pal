import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listFavourites, toggleFavourite } from '../api/RecipeApi';
import './Recipes.css';

export default function Favourites() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    listFavourites(userId)
      .then(data => {
        const raw = data?.recipes ?? data?.favourites ?? data?.data ?? data;
        setRecipes(Array.isArray(raw) ? raw : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleUnfavourite(e, recipeId) {
    e.stopPropagation();
    try {
      await toggleFavourite(recipeId, userId);
      setRecipes(prev => prev.filter(r => r.recipe_id !== recipeId));
    } catch {}
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <h1 className="recipes-title">Favourites</h1>
      </div>

      {error && <p className="recipes-error">{error}</p>}

      {loading && (
        <div className="recipes-loading">
          {[...Array(4)].map((_, i) => <div key={i} className="recipe-skeleton" />)}
        </div>
      )}

      {!loading && recipes.length === 0 && !error && (
        <div className="recipes-empty">
          <p>No saved recipes yet.</p>
          <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => navigate('/recipes')}>
            Browse Recipes
          </button>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <MiniCard
              key={recipe.recipe_id}
              recipe={{ ...recipe, is_favourite: true }}
              onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
              onFavourite={e => handleUnfavourite(e, recipe.recipe_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniCard({ recipe, onClick, onFavourite }) {
  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.image_url
        ? <div className="card-img-wrap"><img src={recipe.image_url} alt={recipe.title} className="card-img" loading="lazy" /></div>
        : <div className="card-img-placeholder">🍽️</div>
      }
      <div className="card-body">
        <div className="card-top">
          <h3 className="card-title">{recipe.title}</h3>
          <button className="fav-btn faved" onClick={onFavourite} title="Remove from favourites">♥</button>
        </div>
        <div className="card-meta">
          {recipe.cuisine_name && <span className="badge badge-cuisine">{recipe.cuisine_name}</span>}
          {recipe.difficulty && <span className={`badge badge-diff badge-${recipe.difficulty.toLowerCase()}`}>{recipe.difficulty}</span>}
          {recipe.prep_time_minutes && <span className="badge badge-time">⏱ {recipe.prep_time_minutes}m</span>}
        </div>
        {recipe.average_rating > 0 && (
          <div className="card-rating">
            {'★'.repeat(Math.round(recipe.average_rating))}{'☆'.repeat(5 - Math.round(recipe.average_rating))}
            <span className="rating-num">{Number(recipe.average_rating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
