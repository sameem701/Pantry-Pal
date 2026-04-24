import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getPantry, addPantryItem, updatePantryItem,
  deletePantryItem, searchIngredients,
} from '../api/PantryApi';
import './Pantry.css';

const STORAGE_LOCATIONS = ['Fridge', 'Pantry', 'Freezer'];
const LOCATION_ICONS = { Fridge: '❄️', Pantry: '🗄️', Freezer: '🧊' };

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'bunch', 'can', 'pkg'];

export default function Pantry() {
  const { user } = useAuth();
  const userId = user?.user_id;

  const [pantry, setPantry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search / add area
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Add form state
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [addUnit, setAddUnit] = useState('g');
  const [addLocation, setAddLocation] = useState('Pantry');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit modal
  const [editItem, setEditItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Filter
  const [filterLocation, setFilterLocation] = useState('All');

  useEffect(() => {
    loadPantry();
  }, [userId]);

  async function loadPantry() {
    setLoading(true);
    setError('');
    try {
      const data = await getPantry(userId);
      const items = data?.pantry ?? data?.data ?? data?.items ?? data;
      setPantry(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Ingredient search with debounce
  useEffect(() => {
    if (!query || !query.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchIngredients(query);
        const results = data?.ingredients ?? data?.data ?? data?.items ?? data;
        setSearchResults(Array.isArray(results) ? results : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function selectIngredient(ing) {
    setSelectedIngredient(ing);
    setQuery(ing.ingredient_name || ing.name);
    setShowDropdown(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedIngredient) { setAddError('Search and select an ingredient first.'); return; }
    if (!addQuantity) { setAddError('Enter a quantity.'); return; }
    setAdding(true);
    setAddError('');
    try {
      await addPantryItem(userId, selectedIngredient.ingredient_id, parseFloat(addQuantity), addUnit, addLocation);
      setQuery('');
      setSelectedIngredient(null);
      setAddQuantity('');
      setAddUnit('g');
      setAddLocation('Pantry');
      await loadPantry();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  function openEdit(item) {
    setEditItem(item);
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit || 'g');
    setEditLocation(item.storage_location || 'Pantry');
    setEditError('');
  }

  async function handleEditSave() {
    setEditSaving(true);
    setEditError('');
    try {
      await updatePantryItem(userId, editItem.ingredient_id, parseFloat(editQuantity), editUnit, editLocation);
      setEditItem(null);
      await loadPantry();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(ingredientId) {
    if (!window.confirm('Remove this ingredient from your pantry?')) return;
    try {
      await deletePantryItem(userId, ingredientId);
      setPantry((prev) => prev.filter((i) => i.ingredient_id !== ingredientId));
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = filterLocation === 'All'
    ? pantry
    : pantry.filter((i) => i.storage_location === filterLocation);

  const grouped = STORAGE_LOCATIONS.reduce((acc, loc) => {
    acc[loc] = filtered.filter((i) => i.storage_location === loc);
    return acc;
  }, {});
  if (filterLocation === 'All') {
    const uncategorized = filtered.filter((i) => !STORAGE_LOCATIONS.includes(i.storage_location));
    if (uncategorized.length) grouped['Other'] = uncategorized;
  }

  const totalItems = pantry.length;

  return (
    <div className="pantry-page">

      {/* ── Add ingredient panel ── */}
      <div className="pantry-add-panel">
        <h2 className="add-panel-title">Add to Pantry</h2>

        {addError && <p className="pantry-error">{addError}</p>}

        <form onSubmit={handleAdd} className="add-form">
          {/* Ingredient search */}
          <div className="search-field" ref={searchRef}>
            <label>Ingredient</label>
            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Search ingredient…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIngredient(null); }}
                onFocus={() => searchResults.length && setShowDropdown(true)}
                autoComplete="off"
              />
              {searching && <span className="search-spinner">⟳</span>}
            </div>
            {showDropdown && searchResults.length > 0 && (
              <ul className="search-dropdown">
                {searchResults.map((ing) => (
                  <li key={ing.ingredient_id} onClick={() => selectIngredient(ing)}>
                    <span className="ing-name">{ing.ingredient_name || ing.name}</span>
                    {ing.category && <span className="ing-cat">{ing.category}</span>}
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && searchResults.length === 0 && !searching && query?.trim() && (
              <div className="search-empty">No ingredients found</div>
            )}
          </div>

          {/* Quantity + unit */}
          <div className="add-row">
            <div className="add-field">
              <label>Qty</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
              />
            </div>
            <div className="add-field">
              <label>Unit</label>
              <select value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Storage location */}
          <div className="add-field">
            <label>Storage</label>
            <div className="location-buttons">
              {STORAGE_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`loc-btn${addLocation === loc ? ' active' : ''}`}
                  onClick={() => setAddLocation(loc)}
                >
                  {LOCATION_ICONS[loc]} {loc}
                </button>
              ))}
            </div>
          </div>

          <button className="add-btn" type="submit" disabled={adding || !selectedIngredient}>
            {adding ? 'Adding…' : '+ Add to Pantry'}
          </button>
        </form>
      </div>

      {/* ── Pantry list ── */}
      <div className="pantry-list-area">
        <div className="pantry-list-header">
          <h2 className="pantry-list-title">
            My Pantry
            <span className="pantry-count">{totalItems} items</span>
          </h2>
          <div className="filter-tabs">
            {['All', ...STORAGE_LOCATIONS].map((loc) => (
              <button
                key={loc}
                className={`filter-tab${filterLocation === loc ? ' active' : ''}`}
                onClick={() => setFilterLocation(loc)}
              >
                {LOCATION_ICONS[loc] || '📋'} {loc}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="pantry-error">{error}</p>}

        {loading ? (
          <div className="pantry-loading">Loading pantry…</div>
        ) : totalItems === 0 ? (
          <div className="pantry-empty">
            <p>🥦 Your pantry is empty.</p>
            <p>Search for an ingredient on the left to get started.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([loc, items]) =>
            items.length === 0 ? null : (
              <div key={loc} className="pantry-group">
                <h3 className="pantry-group-label">
                  {LOCATION_ICONS[loc] || '📋'} {loc}
                  <span className="group-count">{items.length}</span>
                </h3>
                <div className="pantry-grid">
                  {items.map((item) => (
                    <div key={item.ingredient_id} className="pantry-item">
                      <div className="pantry-item-info">
                        <span className="pantry-item-name">{item.ingredient_name || item.name}</span>
                        <span className="pantry-item-qty">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="pantry-item-actions">
                        <button className="item-btn edit" onClick={() => openEdit(item)} title="Edit">✏️</button>
                        <button className="item-btn del" onClick={() => handleDelete(item.ingredient_id)} title="Remove">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* ── Edit modal ── */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit: {editItem.name || editItem.ingredient_name}</h2>
            {editError && <p className="pantry-error">{editError}</p>}
            <label>Quantity</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              autoFocus
            />
            <label>Unit</label>
            <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
            <label>Storage</label>
            <div className="location-buttons">
              {STORAGE_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`loc-btn${editLocation === loc ? ' active' : ''}`}
                  onClick={() => setEditLocation(loc)}
                >
                  {LOCATION_ICONS[loc]} {loc}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
