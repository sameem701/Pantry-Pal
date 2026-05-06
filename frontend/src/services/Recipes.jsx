import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/UserApi';
import { searchCreators } from '../api/UserApi';
import { Search, SlidersHorizontal, X, Utensils, Heart, Check, Clock, User } from 'lucide-react';
import StarRating from '../components/StarRating';
import {
  browseRecipes, searchByPantry, listCuisineOptions, listDietaryOptions, toggleFavourite,
} from '../api/RecipeApi';
import { getPantry } from '../api/PantryApi';
import { getRecentlyCooked } from '../utils/recentlyCookedStore';
import DietaryDropdown from '../components/DietaryDropdown';
import CuisineDropdown from '../components/CuisineDropdown';
import './Recipes.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function Recipes() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();

  // mode: 'pantry' (default) | 'all'
  const [mode,         setMode]         = useState('pantry');
  const [pantryEmpty,  setPantryEmpty]  = useState(false);
  const [filterOpen,   setFilterOpen]   = useState(false);

  // Search dropdown state
  const [searchInput,        setSearchInput]        = useState('');
  const [showSearchDrop,     setShowSearchDrop]     = useState(false);
  const [recipeSuggestions,  setRecipeSuggestions]  = useState([]);
  const [creatorSuggestions, setCreatorSuggestions] = useState([]);
  const searchWrapRef = useRef(null);
  const suggTimer     = useRef(null);

  // Creator filter
  const [creatorId,   setCreatorId]   = useState(null);
  const [creatorName, setCreatorName] = useState('');

  const [difficulty,   setDifficulty]   = useState('');
  const [cuisineIds,    setCuisineIds]    = useState(new Set());
  const [dietary,      setDietary]      = useState(new Set());
  const [sortBy,       setSortBy]       = useState('rating'); // 'rating' | 'newest'
  const [filtersReady, setFiltersReady] = useState(false);

  // Pending filter state inside modal (only applied on Apply)
  const [pendingDifficulty, setPendingDifficulty] = useState('');
  const [pendingCuisineIds, setPendingCuisineIds] = useState(new Set());
  const [pendingDietary,    setPendingDietary]     = useState(new Set());

  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [dietaryOptions, setDietaryOptions] = useState([]);

  const [recipes,       setRecipes]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [recentlyCooked, setRecentlyCooked] = useState([]);

  const location = useLocation();

  // Load recently cooked from localStorage on mount + when page gains focus
  useEffect(() => {
    const load = () => setRecentlyCooked(getRecentlyCooked());
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  // Read creator filter from navigation state (set by RecipeDetail when clicking creator)
  useEffect(() => {
    if (location.state?.creatorId) {
      setCreatorId(location.state.creatorId);
      setCreatorName(location.state.creatorName || '');
      setMode('all');
      // Clear the state so refreshing the page doesn't re-apply it
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggestion fetching as user types in the search box
  useEffect(() => {
    clearTimeout(suggTimer.current);
    if (!searchInput.trim()) {
      setRecipeSuggestions([]);
      setCreatorSuggestions([]);
      setShowSearchDrop(false);
      return;
    }
    suggTimer.current = setTimeout(async () => {
      try {
        const [recipeData, creatorData] = await Promise.all([
          browseRecipes({ userId, q: searchInput.trim(), page: 1, limit: 5 }),
          searchCreators(searchInput.trim()),
        ]);
        const rList = recipeData?.recipes ?? recipeData?.data ?? recipeData?.items ?? [];
        setRecipeSuggestions(Array.isArray(rList) ? rList.slice(0, 5) : []);
        const cList = creatorData?.creators ?? [];
        setCreatorSuggestions(Array.isArray(cList) ? cList.slice(0, 5) : []);
        setShowSearchDrop(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(suggTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Close dropdown when clicking outside the search wrap
  useEffect(() => {
    function handleOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSearchDrop(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Load options + pre-fill from profile
  useEffect(() => {
    Promise.all([listCuisineOptions(), listDietaryOptions()])
      .then(([cData, dData]) => {
        const cuisines = cData?.cuisines ?? cData?.data ?? cData ?? [];
        const cuisineNorm = Array.isArray(cuisines)
          ? cuisines.map(x => ({ id: x.cuisine_id ?? x.id, name: x.name ?? x }))
          : [];
        setCuisineOptions(cuisineNorm);
        const diet = dData?.dietary_preferences ?? dData?.data ?? dData ?? [];
        const dietNorm = Array.isArray(diet)
          ? diet.map(x => ({ id: x.preference_id ?? x.id, name: x.preference_name ?? x.name ?? x }))
          : [];
        setDietaryOptions(dietNorm);
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
            if (mapped) { setDifficulty(mapped); setPendingDifficulty(mapped); }
          }
          if (Array.isArray(profile.dietary_preferences) && profile.dietary_preferences.length > 0) {
            const ids = profile.dietary_preferences
              .map(p => p.preference_id ?? p.id)
              .filter(id => id != null)
              .map(Number)
              .filter(Number.isFinite);
            if (ids.length > 0) { setDietary(new Set(ids)); setPendingDietary(new Set(ids)); }
          }        })
        .catch(() => {})
        .finally(() => setFiltersReady(true));
    } else {
      setFiltersReady(true);
    }
  }, [userId]);

  // Reload when mode, filters, sort, or creator filter changes
  useEffect(() => {
    if (!filtersReady) return;
    setPage(1);
    fetchRecipes(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, mode, difficulty, creatorId, Array.from(cuisineIds).sort().join(','), Array.from(dietary).sort().join(','), sortBy]);

  async function fetchRecipes(p = page, reset = false) {
    setLoading(true);
    setError('');
    try {
      let list = [];
      if (mode === 'pantry') {
        // Check if pantry is empty first (only on initial load / reset)
        if (reset) {
          try {
            const pantryData = await getPantry(userId);
            const pantryItems = pantryData?.items ?? pantryData?.data ?? pantryData;
            setPantryEmpty(Array.isArray(pantryItems) && pantryItems.length === 0);
          } catch { setPantryEmpty(false); }
        }
        const data = await searchByPantry({
          userId,
          difficulty: difficulty || undefined,
          cuisineIds:    cuisineIds.size > 0 ? [...cuisineIds] : undefined,
          preferenceIds: dietary.size > 0 ? [...dietary] : undefined,
          page: p,
          limit: 20,
        });
        const raw = data?.recipes ?? data?.data ?? data?.items ?? data;
        list = Array.isArray(raw) ? raw : [];
        // Sort by missing count ascending (0 missing first)
        list = [...list].sort((a, b) => {
          const ma = a.missing_count ?? a.missing_ingredients_count ?? 999;
          const mb = b.missing_count ?? b.missing_ingredients_count ?? 999;
          return ma - mb;
        });
      } else {
        const data = await browseRecipes({
          userId,
          difficulty:    difficulty || undefined,
          cuisineIds:    cuisineIds.size > 0 ? [...cuisineIds] : undefined,
          preferenceIds: dietary.size > 0 ? [...dietary] : undefined,
          sortBy,
          page: p,
          limit: 20,
          creatorId:     creatorId  || undefined,
        });
        const raw = data?.recipes ?? data?.data ?? data?.items ?? data;
        list = Array.isArray(raw) ? raw : [];
      }
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

  function openFilterModal() {
    setPendingDifficulty(difficulty);
    setPendingCuisineIds(new Set(cuisineIds));
    setPendingDietary(new Set(dietary));
    setFilterOpen(true);
  }

  function applyFilters() {
    setDifficulty(pendingDifficulty);
    setCuisineIds(new Set(pendingCuisineIds));
    setDietary(new Set(pendingDietary));
    setFilterOpen(false);
  }

  function clearFiltersInModal() {
    setPendingDifficulty('');
    setPendingCuisineIds(new Set());
    setPendingDietary(new Set());
  }

  function clearAllFilters() {
    setSearchInput('');
    setCreatorId(null);
    setCreatorName('');
    setDifficulty('');
    setCuisineIds(new Set());
    setDietary(new Set());
    setPendingDifficulty('');
    setPendingCuisineIds(new Set());
    setPendingDietary(new Set());
  }

  function handleSelectCreator(c) {
    setCreatorId(c.user_id);
    setCreatorName(c.display_name);
    setSearchInput('');
    setShowSearchDrop(false);
    setMode('all');
    setPage(1);
  }

  function handleSelectRecipe(r) {
    navigate(`/recipes/${r.recipe_id}`);
    setSearchInput('');
    setShowSearchDrop(false);
  }

  function clearCreatorFilter() {
    setCreatorId(null);
    setCreatorName('');
  }

  function handleCreatorClick(name, id) {
    setCreatorId(id);
    setCreatorName(name);
    setMode('all');
    setPage(1);
  }

  const hasActiveFilters = difficulty || cuisineIds.size > 0 || dietary.size > 0 || !!creatorId;

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
      {/* ── Recently Cooked strip ──────────────────────────────────── */}
      {recentlyCooked.length > 0 && (
        <div className="recently-cooked-strip">
          <span className="rc-label">Recently cooked</span>
          <div className="rc-scroll">
            {recentlyCooked.map(r => (
              <button
                key={r.recipeId}
                className="rc-chip"
                onClick={() => navigate(`/recipes/${r.recipeId}`)}
                title={r.title}
              >
                {r.imageUrl
                  ? <img src={r.imageUrl} alt="" className="rc-chip-img" />
                  : <span className="rc-chip-icon">🍽</span>
                }
                <span className="rc-chip-name">{r.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="recipes-header">
        <div className="recipes-title-sort-row">
          <h1 className="recipes-title">Recipes</h1>
          <div className="recipes-sort-group">
            <span className="sort-label">Sort by</span>
            <button
              className={'sort-btn' + (sortBy === 'rating' ? ' active' : '')}
              onClick={() => setSortBy('rating')}
            >Top Rated</button>
            <button
              className={'sort-btn' + (sortBy === 'newest' ? ' active' : '')}
              onClick={() => setSortBy('newest')}
            >Newest</button>
          </div>
        </div>

        {/* Controls row */}
        <div className="recipes-controls-row">
          {/* Mode toggle */}
          <div className="mode-toggle">
            <button
              className={'mode-btn' + (mode === 'pantry' ? ' active' : '')}
              onClick={() => { setMode('pantry'); setPage(1); }}
            >Pantry</button>
            <button
              className={'mode-btn' + (mode === 'all' ? ' active' : '')}
              onClick={() => { setMode('all'); setPage(1); }}
            >All Recipes</button>
          </div>

          {/* Search */}
          <div className="recipes-search-wrap" ref={searchWrapRef}>
            <span className="search-icon"><Search size={15} /></span>
            <input
              className="recipes-search"
              type="text"
              placeholder="Search recipes or creators…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={() => {
                if (searchInput.trim() && (recipeSuggestions.length > 0 || creatorSuggestions.length > 0)) {
                  setShowSearchDrop(true);
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
              autoComplete="off"
            />
            {searchInput && (
              <button className="search-clear" onClick={() => { setSearchInput(''); setShowSearchDrop(false); }}><X size={14} /></button>
            )}
            {showSearchDrop && (recipeSuggestions.length > 0 || creatorSuggestions.length > 0) && (
              <div className="search-dropdown">
                {creatorSuggestions.length > 0 && (
                  <div className="search-drop-section">
                    <span className="search-drop-label">Creators</span>
                    {creatorSuggestions.map(c => (
                      <button key={c.user_id} className="search-drop-item search-drop-creator"
                        onMouseDown={() => handleSelectCreator(c)}>
                        <User size={13} /> {c.display_name}
                      </button>
                    ))}
                  </div>
                )}
                {recipeSuggestions.length > 0 && (
                  <div className="search-drop-section">
                    <span className="search-drop-label">Recipes</span>
                    {recipeSuggestions.map(r => (
                      <button key={r.recipe_id} className="search-drop-item search-drop-recipe"
                        onMouseDown={() => handleSelectRecipe(r)}>
                        <Utensils size={13} /> {r.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Creator filter chip */}
          {creatorName && (
            <div className="creator-filter-chip">
              By: <strong>{creatorName}</strong>
              <button className="creator-chip-clear" onClick={clearCreatorFilter}><X size={12} /></button>
            </div>
          )}

          {/* Clear filters (only when active) */}
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearAllFilters}>Clear Filters</button>
          )}

          {/* Filters button */}
          <button
            className={'btn-filters' + (hasActiveFilters ? ' has-active' : '')}
            onClick={openFilterModal}
          >
            <SlidersHorizontal size={14} /> Filters{hasActiveFilters ? ' •' : ''}
          </button>
        </div>
      </div>

      {/* ── Filter Modal ───────────────────────────────────────────── */}
      {filterOpen && (
        <div className="filter-overlay" onClick={() => setFilterOpen(false)}>
          <div className="filter-modal" onClick={e => e.stopPropagation()}>
            <div className="filter-modal-head">
              <span className="filter-modal-title">Filters</span>
              <div className="filter-modal-head-actions">
                <button className="btn-filter-clear-all" onClick={clearFiltersInModal}>Clear All</button>
                <button className="btn-filter-close" onClick={() => setFilterOpen(false)}>&times;</button>
              </div>
            </div>

            <div className="filter-modal-body">
              <label className="filter-label">
                Skill Level
                <select value={pendingDifficulty} onChange={e => setPendingDifficulty(e.target.value)}>
                  <option value="">Any</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <div className="filter-label">
                <span className="filter-label-text">Cuisine</span>
                <CuisineDropdown
                  options={cuisineOptions}
                  value={pendingCuisineIds}
                  onChange={setPendingCuisineIds}
                  placeholder="All Cuisines"
                />
              </div>

              <div className="filter-label">
                <span className="filter-label-text">Dietary</span>
                <DietaryDropdown
                  options={dietaryOptions}
                  value={pendingDietary}
                  onChange={setPendingDietary}
                  placeholder="No Filter"
                />
              </div>
            </div>

            <div className="filter-modal-foot">
              <button className="btn-filter-apply" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="recipes-error">{error}</p>}

      {!loading && recipes.length === 0 && !error && (
        <div className="recipes-empty">
          {mode === 'pantry' && pantryEmpty ? (
            <>
              Your pantry is empty.{' '}
              <button className="link-btn" onClick={() => navigate('/pantry')}>
                Add ingredients to your pantry
              </button>{' '}
              to see matching recipes.
            </>
          ) : mode === 'pantry' ? (
            'No recipes match your pantry and filters. Try adjusting your filters.'
          ) : (
            'No recipes match the selected filters.'
          )}
        </div>
      )}

      <div className="recipe-grid">
        {recipes.map(recipe => (
          <RecipeCard
            key={recipe.recipe_id}
            recipe={recipe}
            pantryMode={mode === 'pantry'}
            onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
            onFavourite={e => handleFavourite(e, recipe.recipe_id)}
            onCreatorClick={r => handleCreatorClick(r.creator_display_name, r.creator_id)}
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

export function RecipeCard({ recipe, onClick, onFavourite, pantryMode = false, onCreatorClick = null }) {
  const matchPct     = recipe.match_percentage ?? recipe.match_percent ?? null;
  // DB returns 'missing_ingredients'; fall back to other naming variants
  const missingCount = recipe.missing_ingredients ?? recipe.missing_count ?? recipe.missing_ingredients_count ?? null;

  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.image_url ? (
        <div className="card-img-wrap">
          <img src={recipe.image_url} alt={recipe.title} className="card-img" loading="lazy" />
        </div>
      ) : (
        <div className="card-img-placeholder"><Utensils size={32} /></div>
      )}

      <div className="card-body">
        <div className="card-top">
          <h3 className="card-title">{recipe.title}</h3>
          <button
            className={`fav-btn${recipe.is_favourite ? ' faved' : ''}`}
            onClick={onFavourite}
            title={recipe.is_favourite ? 'Remove favourite' : 'Add to favourites'}
          >
            <Heart size={16} fill={recipe.is_favourite ? 'currentColor' : 'none'} />
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
            <span className="badge badge-time"><Clock size={11} /> {recipe.prep_time_minutes}m</span>
          )}
        </div>

        {/* Pantry match indicator */}
        {pantryMode && missingCount !== null && (
          missingCount === 0 ? (
            <p className="pantry-all-present"><Check size={12} /> All ingredients present</p>
          ) : (
            <p className="pantry-missing"><X size={12} /> {missingCount} ingredient{missingCount > 1 ? 's' : ''} missing</p>
          )
        )}

        {/* Match bar (non-pantry mode) */}
        {!pantryMode && matchPct !== null && (
          <div className="match-bar-wrap">
            <div className="match-bar">
              <div className="match-fill" style={{ width: `${matchPct}%` }} />
            </div>
            <span className="match-label">{Math.round(matchPct)}% match</span>
          </div>
        )}

        {recipe.average_rating > 0 && (
          <div className="card-rating">
            <StarRating rating={Number(recipe.average_rating)} size={13} />
            <span className="rating-num">{Number(recipe.average_rating).toFixed(1)}</span>
          </div>
        )}

        {recipe.creator_display_name && (
          <button
            className="card-creator"
            onClick={e => { e.stopPropagation(); onCreatorClick && onCreatorClick(recipe); }}
            title={`View ${recipe.creator_display_name}'s recipes`}
          >
            {recipe.creator_display_name}
          </button>
        )}
      </div>
    </div>
  );
}