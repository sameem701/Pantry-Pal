import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAllRecipes, deleteRecipe } from '../api/RecipeApi';
import ConfirmModal from '../components/ConfirmModal';
import './Recipes.css';

export default function MyRecipes() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { recipeId, title }

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getAllRecipes({ userId, creatorId: userId, limit: 100 })
      .then(data => {
        const raw = data?.recipes ?? data?.data ?? data?.items ?? data;
        setRecipes(Array.isArray(raw) ? raw : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const { recipeId } = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteRecipe(recipeId, userId);
      setRecipes(prev => prev.filter(r => r.recipe_id !== recipeId));
      addToast('Recipe deleted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete recipe.', 'error');
    }
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <h1 className="recipes-title">My Recipes</h1>
        {!loading && recipes.length > 0 && (
          <button className="btn-primary" onClick={() => navigate('/create-recipe')}>+ Create Recipe</button>
        )}
      </div>

      {error && <p className="recipes-error">{error}</p>}

      {loading && (
        <div className="recipes-loading">
          {[...Array(4)].map((_, i) => <div key={i} className="recipe-skeleton" />)}
        </div>
      )}

      {!loading && recipes.length === 0 && !error && (
        <div className="recipes-empty">
          <p>You have no recipes yet. Create a recipe to get started.</p>
          <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => navigate('/create-recipe')}>
            + Create Recipe
          </button>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <div
              key={recipe.recipe_id}
              className="recipe-card"
              onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
            >
              {recipe.image_url
                ? <div className="card-img-wrap"><img src={recipe.image_url} alt={recipe.title} className="card-img" loading="lazy" /></div>
                : <div className="card-img-placeholder">{String.fromCodePoint(0x1F37D)}</div>
              }
              <div className="card-body">
                <div className="card-top">
                  <h3 className="card-title">{recipe.title}</h3>
                  <div className="my-recipe-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => navigate(`/recipes/${recipe.recipe_id}/edit`)}
                    >{String.fromCodePoint(0x270F)}</button>
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Delete"
                      onClick={() => setConfirmDelete({ recipeId: recipe.recipe_id, title: recipe.title })}
                    >{String.fromCodePoint(0x1F5D1)}</button>
                  </div>
                </div>
                <div className="card-meta">
                  {recipe.cuisine_name && <span className="badge badge-cuisine">{recipe.cuisine_name}</span>}
                  {recipe.difficulty && <span className={`badge badge-diff badge-${recipe.difficulty.toLowerCase()}`}>{recipe.difficulty}</span>}
                  {(recipe.cooking_time || recipe.prep_time_minutes) && (
                    <span className="badge badge-time">{String.fromCodePoint(0x23F1)} {recipe.cooking_time || recipe.prep_time_minutes}m</span>
                  )}
                </div>
                {recipe.average_rating > 0 && (
                  <div className="card-rating">
                    {'★'.repeat(Math.round(recipe.average_rating))}{'☆'.repeat(5 - Math.round(recipe.average_rating))}
                    <span className="rating-num">{Number(recipe.average_rating).toFixed(1)}</span>
                  </div>
                )}
                {recipe.save_count != null && (
                  <p className="saved-count">{String.fromCodePoint(0x2665)} {recipe.save_count} save{recipe.save_count !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Recipe"
          message={`Delete "${confirmDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
