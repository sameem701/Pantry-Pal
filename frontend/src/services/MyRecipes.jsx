import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAllRecipes, deleteRecipe } from '../api/RecipeApi';
import ConfirmModal from '../components/ConfirmModal';
import { Pencil, Trash2, Utensils, Clock, Heart, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import StarRating from '../components/StarRating';
import './Recipes.css';

export default function MyRecipes() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [recipes,       setRecipes]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { recipeId, title }
  const [showDrafts,    setShowDrafts]    = useState(true);

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
        <div className="my-recipes-title-row">
          <h1 className="recipes-title">My Recipes</h1>
          {!loading && recipes.length > 0 && (
            <button className="btn-primary" onClick={() => navigate('/create-recipe')}>
              <Plus size={14} /> Create Recipe
            </button>
          )}
        </div>
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

      {!loading && (() => {
        const published = recipes.filter(r => r.status !== 'draft');
        const drafts    = recipes.filter(r => r.status === 'draft');

        function renderCard(recipe, isDraft = false) {
          return (
            <div
              key={recipe.recipe_id}
              className={'recipe-card' + (isDraft ? ' recipe-card--draft' : '')}
              onClick={() => navigate(isDraft ? `/recipes/${recipe.recipe_id}/edit` : `/recipes/${recipe.recipe_id}`)}
              title={isDraft ? 'Draft — click to continue editing' : undefined}
            >
              {recipe.image_url
                ? <div className="card-img-wrap"><img src={recipe.image_url} alt={recipe.title} className="card-img" loading="lazy" /></div>
                : <div className="card-img-placeholder"><Utensils size={36} /></div>
              }
              {isDraft && <span className="recipe-draft-badge">Draft</span>}
              <div className="card-body">
                <div className="card-top">
                  <h3 className="card-title">{recipe.title}</h3>
                  <div className="my-recipe-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => navigate(`/recipes/${recipe.recipe_id}/edit`)}
                    ><Pencil size={14} /></button>
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Delete"
                      onClick={() => setConfirmDelete({ recipeId: recipe.recipe_id, title: recipe.title })}
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="card-meta">
                  {recipe.cuisine_name && <span className="badge badge-cuisine">{recipe.cuisine_name}</span>}
                  {recipe.difficulty && <span className={`badge badge-diff badge-${recipe.difficulty.toLowerCase()}`}>{recipe.difficulty}</span>}
                  {(recipe.cooking_time || recipe.prep_time_minutes) && (
                    <span className="badge badge-time"><Clock size={11} /> {recipe.cooking_time || recipe.prep_time_minutes}m</span>
                  )}
                </div>
                {!isDraft && recipe.average_rating > 0 && (
                  <div className="card-rating">
                    <StarRating rating={Number(recipe.average_rating)} size={13} />
                    <span className="rating-num">{Number(recipe.average_rating).toFixed(1)}</span>
                  </div>
                )}
                {!isDraft && recipe.save_count != null && (
                  <p className="saved-count"><Heart size={11} fill="currentColor" /> {recipe.save_count} save{recipe.save_count !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          );
        }

        return (
          <>
            {published.length > 0 && (
              <div className="recipe-grid">
                {published.map(r => renderCard(r, false))}
              </div>
            )}

            {drafts.length > 0 && (
              <div className="my-recipes-drafts-section">
                <button
                  className="my-recipes-drafts-toggle"
                  onClick={() => setShowDrafts(v => !v)}
                >
                  <span>Drafts</span>
                  <span className="my-recipes-drafts-count">{drafts.length}</span>
                  <span className="my-recipes-drafts-chevron">{showDrafts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
                </button>
                {showDrafts && (
                  <div className="recipe-grid recipe-grid--drafts">
                    {drafts.map(r => renderCard(r, true))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

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
