import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getRecipeDetails,
  createRecipe,
  updateRecipe,
  listCuisineOptions,
  listDietaryOptions,
} from '../api/RecipeApi';
import { searchIngredients } from '../api/PantryApi';
import './CreateRecipe.css';

// ── ingredient row ────────────────────────────────────────────────────────────
function IngredientRow({ item, index, onChange, onRemove }) {
  const [query, setQuery]       = useState(item.ingredient_name || '');
  const [results, setResults]   = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const debounce = useRef(null);

  function handleQueryChange(val) {
    setQuery(val);
    if (!val.trim()) { setResults([]); setShowDrop(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchIngredients(val);
        const list = Array.isArray(res?.data) ? res.data
                   : Array.isArray(res)        ? res
                   : [];
        setResults(list.slice(0, 8));
        setShowDrop(list.length > 0);
      } catch { setResults([]); }
    }, 280);
  }

  function selectIngredient(ing) {
    setQuery(ing.ingredient_name || ing.name || '');
    setShowDrop(false);
    onChange(index, { ingredient_id: ing.ingredient_id, ingredient_name: ing.ingredient_name || ing.name });
  }

  return (
    <div className="cr-ing-row">
      <div className="cr-ing-search">
        <input
          className="form-input"
          placeholder="Search ingredient…"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => results.length && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 180)}
        />
        {showDrop && (
          <div className="cr-ing-dropdown">
            {results.map(ing => (
              <button
                key={ing.ingredient_id}
                type="button"
                onMouseDown={() => selectIngredient(ing)}
              >
                <span>{ing.ingredient_name || ing.name}</span>
                {ing.category && <small>{ing.category}</small>}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className="form-input cr-ing-qty"
        type="number"
        min="0"
        step="0.25"
        placeholder="Qty"
        value={item.quantity ?? ''}
        onChange={e => onChange(index, { quantity: e.target.value })}
      />
      <input
        className="form-input cr-ing-unit"
        placeholder="Unit"
        value={item.unit ?? ''}
        onChange={e => onChange(index, { unit: e.target.value })}
      />
      <button type="button" className="cr-remove-btn" onClick={() => onRemove(index)}>×</button>
    </div>
  );
}

// ── step row ──────────────────────────────────────────────────────────────────
function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div className="cr-step-row">
      <span className="cr-step-num">{index + 1}</span>
      <textarea
        className="form-textarea cr-step-text"
        placeholder={`Describe step ${index + 1}…`}
        value={step.instruction_text ?? ''}
        onChange={e => onChange(index, e.target.value)}
        rows={2}
      />
      <button type="button" className="cr-remove-btn" onClick={() => onRemove(index)}>×</button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function CreateRecipe() {
  const { id: editId } = useParams();        // present only on /recipes/:id/edit
  const { user }       = useAuth();
  const { addToast }   = useToast();
  const navigate       = useNavigate();
  const userId         = user?.user_id;
  const isEdit         = Boolean(editId);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { addToast('Please select an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    // Use the filename as a hint; actual URL must be hosted externally or you can use data URL
    // For now, set imageUrl to data URL so it shows in the recipe card locally
    const fReader = new FileReader();
    fReader.onload = ev => setImageUrl(ev.target.result);
    fReader.readAsDataURL(file);
  }

  // form state
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [cookingTime, setCookingTime] = useState(30);
  const [imageUrl, setImageUrl]     = useState('');
  const [imagePreview, setImagePreview] = useState('');  // local data URL preview
  const fileInputRef = useRef(null);
  const [status, setStatus]         = useState('published');

  const [ingredients, setIngredients] = useState([{ ingredient_id: null, ingredient_name: '', quantity: '', unit: '' }]);
  const [steps, setSteps]           = useState([{ instruction_text: '' }]);

  const [cuisineIds, setCuisineIds]       = useState([]);
  const [dietaryTagIds, setDietaryTagIds] = useState([]);
  const [calories, setCalories]   = useState('');
  const [proteinG, setProteinG]   = useState('');
  const [carbsG, setCarbsG]       = useState('');
  const [fatG, setFatG]           = useState('');

  const [cuisineOptions, setCuisineOptions]   = useState([]);
  const [dietaryOptions, setDietaryOptions]   = useState([]);

  const [saving, setSaving]   = useState(false);
  const [loadErr, setLoadErr] = useState('');

  // load options + existing recipe (edit mode)
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, dRes] = await Promise.all([listCuisineOptions(), listDietaryOptions()]);
        setCuisineOptions(Array.isArray(cRes?.data) ? cRes.data : []);
        setDietaryOptions(Array.isArray(dRes?.data) ? dRes.data : []);
      } catch { /* options optional */ }
    }

    async function loadRecipe() {
      if (!isEdit) return;
      try {
        const data = await getRecipeDetails(editId, userId);
        const r = data?.recipe ?? data?.data ?? data;
        if (!r) throw new Error('Recipe not found');
        setTitle(r.title ?? '');
        setDescription(r.description ?? '');
        setDifficulty(r.difficulty ?? 'Medium');
        setCookingTime(r.cooking_time ?? r.cooking_time_min ?? 30);
        setImageUrl(r.image_url ?? '');
        setStatus(r.status ?? 'published');
        const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
        setIngredients(ings.length ? ings.map(i => ({
          ingredient_id: i.ingredient_id,
          ingredient_name: i.ingredient_name || '',
          quantity: i.required_qty ?? i.quantity ?? '',
          unit: i.unit ?? '',
        })) : [{ ingredient_id: null, ingredient_name: '', quantity: '', unit: '' }]);
        const ss = Array.isArray(r.steps) ? r.steps : [];
        setSteps(ss.length ? ss.map(s => ({ instruction_text: s.instruction_text || '' }))
                           : [{ instruction_text: '' }]);
        setCuisineIds((r.cuisines ?? []).map(c => c.cuisine_id));
        setDietaryTagIds((r.dietary_tags ?? r.dietary_preferences ?? []).map(t => t.preference_id));
        const n = r.nutrition;
        if (n) {
          setCalories(n.calories ?? '');
          setProteinG(n.protein_g ?? '');
          setCarbsG(n.carbs_g ?? '');
          setFatG(n.fat_g ?? '');
        }
      } catch (err) {
        setLoadErr(err.message || 'Failed to load recipe');
      }
    }

    loadOptions();
    loadRecipe();
  }, [editId, isEdit, userId]);

  // ingredient helpers
  const updateIngredient = useCallback((idx, patch) => {
    setIngredients(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }, []);
  const removeIngredient = useCallback(idx => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }, []);
  const addIngredient = () => {
    setIngredients(prev => [...prev, { ingredient_id: null, ingredient_name: '', quantity: '', unit: '' }]);
  };

  // step helpers
  const updateStep = useCallback((idx, text) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { instruction_text: text } : s));
  }, []);
  const removeStep = useCallback(idx => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, []);
  const addStep = () => setSteps(prev => [...prev, { instruction_text: '' }]);

  function toggleTag(id, list, setList) {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { addToast('Title is required', 'error'); return; }
    if (steps.some(s => !s.instruction_text.trim())) {
      addToast('All steps must have instructions', 'error'); return;
    }

    const payload = {
      userId,
      title: title.trim(),
      description: description.trim() || undefined,
      difficulty,
      cookingTime: Number(cookingTime) || 30,
      imageUrl: imageUrl.trim() || undefined,
      status,
      ingredients: ingredients
        .filter(i => i.ingredient_id)
        .map(i => ({ ingredient_id: i.ingredient_id, quantity: Number(i.quantity) || 0, unit: i.unit })),
      instructions: steps.map((s, i) => ({ step_number: i + 1, instruction_text: s.instruction_text })),
      cuisineIds,
      dietaryTagIds,
      nutrition: (calories || proteinG || carbsG || fatG) ? {
        calories: Number(calories) || 0,
        protein_g: Number(proteinG) || 0,
        carbs_g: Number(carbsG) || 0,
        fat_g: Number(fatG) || 0,
      } : undefined,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateRecipe(editId, payload);
        addToast('Recipe updated!', 'success');
        navigate(`/recipes/${editId}`);
      } else {
        const res = await createRecipe(payload);
        addToast('Recipe created!', 'success');
        navigate(`/recipes/${res?.recipe_id ?? ''}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to save recipe', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loadErr) return (
    <div className="page-wrap">
      <p className="form-error">{loadErr}</p>
      <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );

  return (
    <div className="cr-shell">
      <div className="cr-header">
        <button className="btn-secondary cr-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="page-title">{isEdit ? 'Edit Recipe' : 'Create Recipe'}</h1>
      </div>

      <form className="cr-form" onSubmit={handleSubmit}>
        {/* ── Basic info ── */}
        <section className="cr-section">
          <h2 className="cr-section-title">Basic Info</h2>
          <div className="cr-row-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Title *</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Recipe name" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cooking Time (min)</label>
              <input className="form-input" type="number" min={1} value={cookingTime} onChange={e => setCookingTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Photo (optional)</label>
              <div className="cr-photo-wrap">
                {(imagePreview || imageUrl) && (
                  <div className="cr-photo-preview">
                    <img src={imagePreview || imageUrl} alt="Preview" className="cr-preview-img" />
                    <button type="button" className="cr-remove-photo" onClick={() => { setImageUrl(''); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove</button>
                  </div>
                )}
                <div className="cr-photo-inputs">
                  <div className="cr-photo-upload">
                    <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Upload Photo</button>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                    <span className="cr-photo-hint">JPG, PNG, WebP &mdash; or paste a URL below</span>
                  </div>
                  <input
                    className="form-input"
                    type="url"
                    value={imagePreview ? '' : imageUrl}
                    onChange={e => { setImageUrl(e.target.value); setImagePreview(''); }}
                    placeholder="Or paste image URL: https://..."
                    disabled={!!imagePreview}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ingredients ── */}
        <section className="cr-section">
          <div className="cr-section-head">
            <h2 className="cr-section-title">Ingredients</h2>
            <button type="button" className="btn-secondary cr-add-btn" onClick={addIngredient}>+ Add</button>
          </div>
          <div className="cr-ing-header">
            <span>Ingredient</span><span>Qty</span><span>Unit</span><span />
          </div>
          {ingredients.map((item, i) => (
            <IngredientRow
              key={i}
              item={item}
              index={i}
              onChange={updateIngredient}
              onRemove={removeIngredient}
            />
          ))}
          {ingredients.length === 0 && (
            <p className="cr-empty-hint">No ingredients yet — click "+ Add" to begin.</p>
          )}
        </section>

        {/* ── Steps ── */}
        <section className="cr-section">
          <div className="cr-section-head">
            <h2 className="cr-section-title">Instructions</h2>
            <button type="button" className="btn-secondary cr-add-btn" onClick={addStep}>+ Add Step</button>
          </div>
          {steps.map((step, i) => (
            <StepRow key={i} step={step} index={i} onChange={updateStep} onRemove={removeStep} />
          ))}
          {steps.length === 0 && (
            <p className="cr-empty-hint">No steps yet — click "+ Add Step" to begin.</p>
          )}
        </section>

        {/* ── Tags ── */}
        <section className="cr-section cr-row-2">
          <div>
            <h2 className="cr-section-title">Cuisine</h2>
            <div className="cr-tags">
              {cuisineOptions.map(c => (
                <button
                  type="button"
                  key={c.cuisine_id}
                  className={'cr-tag' + (cuisineIds.includes(c.cuisine_id) ? ' active' : '')}
                  onClick={() => toggleTag(c.cuisine_id, cuisineIds, setCuisineIds)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="cr-section-title">Dietary</h2>
            <div className="cr-tags">
              {dietaryOptions.map(d => (
                <button
                  type="button"
                  key={d.preference_id}
                  className={'cr-tag' + (dietaryTagIds.includes(d.preference_id) ? ' active' : '')}
                  onClick={() => toggleTag(d.preference_id, dietaryTagIds, setDietaryTagIds)}
                >
                  {d.preference_name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Nutrition ── */}
        <section className="cr-section">
          <h2 className="cr-section-title">Nutrition (optional)</h2>
          <div className="cr-row-4">
            {[['Calories', calories, setCalories], ['Protein (g)', proteinG, setProteinG],
              ['Carbs (g)', carbsG, setCarbsG], ['Fat (g)', fatG, setFatG]].map(([label, val, set]) => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" min={0} step="0.1" value={val} onChange={e => set(e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="cr-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
