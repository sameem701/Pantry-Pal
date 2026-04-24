import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/UserApi';
import {
  browseRecipes, listCuisineOptions, listDietaryOptions, toggleFavourite,
} from '../api/RecipeApi';
import './Recipes.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'rating',   label: 'Top Rated' },
  { value: 'newest',   label: 'Newest' },
];

export default function Recipes() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();

  const [query,        setQuery]        = useState('');
  const [difficulty,   setDifficulty]   = useState('');
  const [cuisineId,    setCuisineId]    = useState('');
  const [dietary,      setDietary]      = useState('');
  const [sortBy,       setSortBy]       = useState('trending');
  const [filtersReady, setFiltersReady] = useState(false);

  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [dietaryOptions, setDietaryOptions] = useState([]);

  const [recipes,  setRecipes]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  const searchTimer = useRef(null);

  // Load options + pre-fill from profile
  useEffect(() => {
    Promise.all([listCuisineOptions(), listDietaryOptions()])
      .then(([cData, dData]) => {
        const cuisines = cData?.cuisines ?? cData?.data ?? cData ?? [];
        setCuisineOptions(Array.isArray(cuisines) ? cuisines : []);
        const dietary = dData?.dietary_preferences ?? dData?.data ?? dData ?? [];
        setDietaryOptions(Array.isArray(dietary) ? dietary : []);
      })
      .catch(() => { setCuisineOptions([]); setDietaryOptions([]); });

    if (userId) {
      getProfile(userId)
        .then(data => {
          const profile = data?.user ?? data?.data ?? data;
          if (!profile) return;
          if (profile.skill_level) {
            const map = { beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard' };
            const mapped = map[profile.skill_level.toLowerCase()] ?? '';
            if (mapped) setDifficulty(mapped);
          }
          if (Array.isArray(profile.dietary_preferences) && profile.dietary_preferences.length > 0) {
            const pref = profile.dietary_preferences[0];
            const name = pref.preference_name || pref.name || '';
            if (name) setDietary(name);
          }
        })
        .catch(() => {})
        .finally(() => setFiltersReady(true));
    } else {
      setFiltersReady(true);
    }
  }, [userId]);

  // Reload on filter changes (after profile pre-fill completes)
  useEffect(() => {
    if (!filtersReady) return;
    setPage(1);
    fetchRecipes(1, true);
  }, [filtersReady, difficulty, cuisineId, dietary, sortBy]);

  // Debounce text search
  useEffect(() => {
    if (!filtersReady) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchRecipes(1, true);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  async function fetchRecipes(p = page, reset = false) {
    setLoading(true);
    setError('');
    try {
      const data = await browseRecipes({
        userId,
        q:               query      || undefined,
        difficulty:      difficulty || undefined,
        cuisineId:       cuisineId  || undefined,
        dietaryPreference: dietary  || undefined,
        sortBy,
        page: p,
        limit: 20,
      });
      const raw  = data?.recipes ?? data?.data ?? data?.items ?? data;
      const list = Array.isArray(raw) ? raw : [];
      setRecipes(prev => reset ? list : [...prev, ...list]);
      setHasMore(list.length >= 20);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchRecipes(next, false);
  }

  function clearFilters() {
    setQuery('');
    setDifficulty('');
    setCuisineId('');
    setDietary('');
    setSortBy('trending');
  }

  const hasActive = query || difficulty || cuisineId || dietary || sortBy !== 'trending';

  async function handleFavourite(e, recipeId) {
    e.stopPropagation();
    try {
      await toggleFavourite(recipeId, userId);
      setRecipes(prev =>
        prev.map(r => r.recipe_id === recipeId ? { ...r, is_favourite: !r.is_favourite } : r)
      );
    } catch {}
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <div className="recipes-title-row">
          <h1 className="recipes-title">All Recipes</h1>
        </div>

        {/* Search bar */}
        <div className="recipes-search-row">
          <div className="recipes-search-wrap">
            <span className="search-icon">{String.fromCodePoint(0x1F50D)}</span>
            <input
              className="recipes-search"
              type="text"
              placeholder="Search recipes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')}>&times;</button>
            )}
          </div>
          {hasActive && (
            <button className="btn-clear-filters" onClick={clearFilters}>Clear All Filters</button>
          )}
        </div>

        {/* Filter panel */}
        <div className="filters">
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="">Skill Level (Any)</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={cuisineId} onChange={e => setCuisineId(e.target.value)}>
            <option value="">All Cuisines</option>
            {cuisineOptions.map(c => (
              <option key={c.cuisine_id ?? c.id ?? c.name} value={c.cuisine_id ?? c.id ?? ''}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={dietary} onChange={e => setDietary(e.target.value)}>
            <option value="">No Dietary Filter</option>
            {dietaryOptions.map(d => (
              <option key={d.preference_id ?? d.id ?? d.preference_name ?? d.name} value={d.preference_name ?? d.name ?? d}>
                {d.preference_name ?? d.name ?? d}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="recipes-error">{error}</p>}

      {!loading && recipes.length === 0 && !error && (
        <div className="recipes-empty">
          No recipes match the selected filters.
        </div>
      )}

      <div className="recipe-grid">
        {recipes.map(recipe => (
          <RecipeCard
            key={recipe.recipe_id}
            recipe={recipe}
            onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
            onFavourite={e => handleFavourite(e, recipe.recipe_id)}
          />
        ))}
      </div>

      {loading && (
        <div className="recipes-loading">
          {[...Array(6)].map((_, i) => <div key={i} className="recipe-skeleton" />)}
        </div>
      )}

      {hasMore && !loading && (
        <div className="load-more-wrap">
          <button className="load-more-btn" onClick={loadMore}>Load More</button>
        </div>
      )}
    </div>
  );
}

export function RecipeCard({ recipe, onClick, onFavourite }) {
  const matchPct      = recipe.match_percentage ?? recipe.match_percent ?? null;
  const missingCount  = recipe.missing_count ?? recipe.missing_ingredients_count ?? null;

  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.image_url ? (
        <div className="card-img-wrap">
          <img src={recipe.image_url} alt={recipe.title} className="card-img" loading="lazy" />
        </div>
      ) : (
        <div className="card-img-placeholder">{String.fromCodePoint(0x1F37D)}</div>
      )}

      <div className="card-body">
        <div className="card-top">
          <h3 className="card-title">{recipe.title}</h3>
          <button
            className={`fav-btn${recipe.is_favourite ? ' faved' : ''}`}
            onClick={onFavourite}
            title={recipe.is_favourite ? 'Remove favourite' : 'Add to favourites'}
          >
            {recipe.is_favourite ? '\u2665' : '\u2661'}
          </button>
        </div>

        <div className="card-meta">
          {recipe.cuisine_name && <span className="badge badge-cuisine">{recipe.cuisine_name}</span>}
          {recipe.difficulty && (
            <span className={`badge badge-diff badge-${recipe.difficulty.toLowerCase()}`}>
              {recipe.difficulty}
            </span>
          )}
          {recipe.prep_time_minutes && (
            <span className="badge badge-time">{String.fromCodePoint(0x23F1)} {recipe.prep_time_minutes}m</span>
          )}
        </div>

        {matchPct !== null && (
          <div className="match-bar-wrap">
            <div className="match-bar">
              <div className="match-fill" style={{ width: `${matchPct}%` }} />
            </div>
            <span className="match-label">{Math.round(matchPct)}% match</span>
          </div>
        )}

        {missingCount === 0 && <p className="can-make">&#10003; You can make this!</p>}
        {missingCount !== null && missingCount > 0 && (
          <p className="missing-note">Missing {missingCount} ingredient{missingCount > 1 ? 's' : ''}</p>
        )}

        {recipe.average_rating > 0 && (
          <div className="card-rating">
            {'\u2605'.repeat(Math.round(recipe.average_rating))}{'\u2606'.repeat(5 - Math.round(recipe.average_rating))}
            <span className="rating-num">{Number(recipe.average_rating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}