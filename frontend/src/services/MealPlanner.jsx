import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { addPantryItem, searchIngredients } from '../api/PantryApi';
import {
  createMealPlan, getMealPlan, clearMealPlan,
  upsertMeal, removeMeal,
  suggestMeals, getMissingIngredients,
  savePlanAsTemplate, loadTemplateIntoPlan, listTemplates, deleteTemplate,
} from '../api/MealPlanApi';
import { browseRecipes, listFavourites, toggleFavourite } from '../api/RecipeApi';
import { saveShoppingListLocally } from '../utils/shoppingListStore';
import './MealPlanner.css';

const MEAL_TYPES  = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const TABS        = ['calendar', 'nutrition', 'templates'];
const TAB_LABELS  = { calendar: 'Calendar', nutrition: 'Nutrition', templates: 'Templates' };
const RECIPE_VIEWS       = ['all', 'favourites', 'protein', 'carbs'];
const RECIPE_VIEW_LABELS = { all: 'All', favourites: 'Saved', protein: 'Protein Rich', carbs: 'Carb Rich' };

function today0() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toISO(d) { return d.toISOString().split('T')[0]; }
function toShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function dayName(d) { return d.toLocaleDateString('en-US', { weekday: 'long' }); }
function planKey(d) { return 'pantrypal_plan_' + toISO(d); }
function fmtRange(s) {
  const e = addDays(s, 6);
  return toShort(s) + ' - ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSlotMap(meals) {
  const map = {};
  for (const m of (meals || [])) {
    map[m.day_of_week + '-' + m.meal_type] = {
      title:    m.recipe_title || m.recipe_name || ('Recipe #' + m.recipe_id),
      recipeId: m.recipe_id,
      nutrition: {
        calories: m.calories || 0,
        protein:  m.protein_g || m.protein || 0,
        carbs:    m.carbs_g   || m.carbs   || 0,
        fat:      m.fat_g     || m.fat     || 0,
      },
    };
  }
  return map;
}

function MacroBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="macro-bar-wrap">
      <div className="macro-bar-head">
        <span className="macro-label">{label}</span>
        <span className="macro-value">{value != null ? Math.round(value) : '--'}</span>
      </div>
      <div className="macro-track">
        <div className="macro-fill" style={{ width: pct + '%', background: color }} />
      </div>
    </div>
  );
}

export default function MealPlanner() {
  const { user }     = useAuth();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const userId       = user?.user_id;

  const [startDate,    setStartDate]    = useState(() => today0());
  const todayIso  = toISO(today0());
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const [planId,       setPlanId]       = useState(null);
  const [slotMap,      setSlotMap]      = useState({});
  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState('calendar');
  const [isDirty,      setIsDirty]      = useState(false);   // unsaved calendar changes
  const [pendingTab,   setPendingTab]   = useState(null);    // tab clicked while dirty
  const [nutViewDate,  setNutViewDate]  = useState(() => today0()); // nutrition date nav

  const [dragOver,     setDragOver]     = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [suggestions,    setSuggestions]    = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [applyAllMode,   setApplyAllMode]   = useState(false);

  const [recipeList,    setRecipeList]    = useState([]);
  const [recipeSearch,  setRecipeSearch]  = useState('');
  const [recipeView,    setRecipeView]    = useState('all');
  const [recipeLoading, setRecipeLoading] = useState(false);
  const recipeTimer = useRef(null);

  const [shopModal,      setShopModal]      = useState(false);
  const [shopItems,      setShopItems]      = useState([]);
  const [shopLoading,    setShopLoading]    = useState(false);
  const [shopGenerating, setShopGenerating] = useState(false);

  const [templates,        setTemplates]        = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateName,     setTemplateName]     = useState('');
  const [savingTemplate,   setSavingTemplate]   = useState(false);

  // ── load / auto-create plan on date change ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSlotMap({});
    setSuggestions([]);
    setLoading(true);

    (async () => {
      const saved = localStorage.getItem(planKey(startDate));
      const id    = saved ? Number(saved) : null;

      if (id) {
        setPlanId(id);
        try {
          const data = await getMealPlan(id, userId);
          if (!cancelled) setSlotMap(buildSlotMap(data.meals || data.data || []));
        } catch (err) {
          if (!cancelled) addToast(err.message || 'Failed to load plan', 'error');
        }
      } else {
        // Only auto-create for current or future windows
        const isPastWindow = toISO(addDays(startDate, 6)) < todayIso;
        if (!isPastWindow) {
          try {
            const data  = await createMealPlan(userId, toISO(startDate));
            const newId = data.plan_id;
            if (!cancelled) {
              setPlanId(newId);
              localStorage.setItem(planKey(startDate), String(newId));
            }
          } catch (err) {
            if (!cancelled) addToast(err.message || 'Failed to create plan', 'error');
          }
        } else {
          if (!cancelled) setPlanId(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, userId]);

  // ── load recipe list ───────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(recipeTimer.current);
    recipeTimer.current = setTimeout(async () => {
      setRecipeLoading(true);
      try {
        let list = [];
        if (recipeView === 'favourites') {
          const data = await listFavourites(userId);
          const raw  = data?.recipes ?? data?.favourites ?? data?.data ?? data;
          list = Array.isArray(raw) ? raw : [];
        } else {
          const data = await browseRecipes({ userId, q: recipeSearch || undefined, sortBy: 'trending', limit: 50 });
          const raw  = data?.recipes ?? data?.data ?? data?.items ?? data;
          list = Array.isArray(raw) ? raw : [];
        }
        if (recipeView === 'protein') {
          list = [...list].sort((a, b) =>
            (b.nutrition?.protein_g || b.protein_g || 0) - (a.nutrition?.protein_g || a.protein_g || 0));
        } else if (recipeView === 'carbs') {
          list = [...list].sort((a, b) =>
            (b.nutrition?.carbs_g || b.carbs_g || 0) - (a.nutrition?.carbs_g || a.carbs_g || 0));
        }
        setRecipeList(list);
      } catch {
        setRecipeList([]);
      } finally {
        setRecipeLoading(false);
      }
    }, 400);
    return () => clearTimeout(recipeTimer.current);
  }, [userId, recipeView, recipeSearch]);

  // ── navigation ─────────────────────────────────────────────────────────────
  function nav(days) { setStartDate(d => addDays(d, days)); setActiveTab('calendar'); setIsDirty(false); }

  // ── tab switch with unsaved-changes guard ──────────────────────────────────
  function handleTabClick(tab) {
    if (tab === activeTab) return;
    if (isDirty && activeTab === 'calendar') {
      setPendingTab(tab);
      setConfirmAction({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to the calendar. Save before switching, or discard them?',
        confirmLabel: 'Save & Switch',
        cancelLabel:  'Discard & Switch',
        onConfirm: () => {
          setConfirmAction(null);
          setIsDirty(false);
          addToast('Plan saved.', 'success');
          setActiveTab(tab);
          setPendingTab(null);
        },
        onCancel: () => {
          setConfirmAction(null);
          setIsDirty(false);
          setActiveTab(tab);
          setPendingTab(null);
        },
      });
    } else {
      setActiveTab(tab);
    }
  }

  // ── save current plan ──────────────────────────────────────────────────────
  function handleSavePlan() {
    setIsDirty(false);
    addToast('Plan saved!', 'success');
  }

  // ── nutrition view navigation ─────────────────────────────────────────────
  function nutNav(days) { setNutViewDate(d => addDays(d, days)); }

  // ── clear plan (only current week) ─────────────────────────────────────────
  function confirmClear() {
    setConfirmAction({
      title: 'Clear Week',
      message: 'Remove all meals from this week only? Other weeks are unaffected.',
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          await clearMealPlan(planId, userId);
          setSlotMap({});
          addToast('Week cleared.', 'success');
        } catch (err) {
          addToast(err.message || 'Failed to clear', 'error');
        } finally { setLoading(false); }
      },
    });
  }

  // ── drag from recipe list ──────────────────────────────────────────────────
  function handleDragStart(e, recipe, sourceKey) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      recipeId:  recipe.recipe_id,
      title:     recipe.title,
      nutrition: {
        calories: recipe.nutrition?.calories || recipe.calories || 0,
        protein:  recipe.nutrition?.protein_g || recipe.protein_g || 0,
        carbs:    recipe.nutrition?.carbs_g   || recipe.carbs_g   || 0,
        fat:      recipe.nutrition?.fat_g     || recipe.fat_g     || 0,
      },
      sourceKey: sourceKey || null,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleSlotDragStart(e, day, type) {
    const slot = slotMap[day + '-' + type];
    if (!slot) return;
    handleDragStart(e, { recipe_id: slot.recipeId, title: slot.title, ...slot.nutrition }, day + '-' + type);
  }

  async function handleDrop(e, day, type) {
    e.preventDefault();
    setDragOver(null);
    if (!planId) { addToast('No plan for this week.', 'info'); return; }
    try {
      const data       = JSON.parse(e.dataTransfer.getData('application/json'));
      const targetKey  = day + '-' + type;
      const existing   = slotMap[targetKey];

      if (existing && data.sourceKey && data.sourceKey !== targetKey) {
        // Swap: put existing into source, dragged into target
        const parts   = data.sourceKey.split('-');
        const srcType = parts.pop();
        const srcDay  = parts.join('-');
        await upsertMeal(planId, userId, existing.recipeId, srcDay, srcType);
        await upsertMeal(planId, userId, data.recipeId, day, type);
        setSlotMap(prev => ({
          ...prev,
          [data.sourceKey]: { ...existing },
          [targetKey]:      { title: data.title, recipeId: data.recipeId, nutrition: data.nutrition || {} },
        }));
        addToast('Meals swapped!', 'success');
      } else {
        await upsertMeal(planId, userId, data.recipeId, day, type);
        if (data.sourceKey && data.sourceKey !== targetKey) {
          const parts   = data.sourceKey.split('-');
          const srcType = parts.pop();
          const srcDay  = parts.join('-');
          await removeMeal(planId, userId, srcDay, srcType);
          setSlotMap(prev => {
            const n = { ...prev };
            delete n[data.sourceKey];
            n[targetKey] = { title: data.title, recipeId: data.recipeId, nutrition: data.nutrition || {} };
            return n;
          });
        } else {
          setSlotMap(prev => ({
            ...prev,
            [targetKey]: { title: data.title, recipeId: data.recipeId, nutrition: data.nutrition || {} },
          }));
        }
        addToast('Added to ' + (MEAL_LABELS[type] || type), 'success');
        setIsDirty(true);
      }
    } catch (err) {
      addToast(err.message || 'Failed to add meal', 'error');
    }
  }

  async function handleRemove(day, type, e) {
    e && e.stopPropagation();
    try {
      await removeMeal(planId, userId, day, type);
      setSlotMap(prev => { const n = { ...prev }; delete n[day + '-' + type]; return n; });
      setIsDirty(true);
    } catch (err) {
      addToast(err.message || 'Failed to remove', 'error');
    }
  }

  // ── suggestions ────────────────────────────────────────────────────────────
  async function handleSuggest() {
    if (!planId) return;
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const data = await suggestMeals(planId, userId);
      const list = Array.isArray(data?.suggestions) ? data.suggestions
                 : Array.isArray(data?.data)         ? data.data
                 : Array.isArray(data)               ? data : [];
      setSuggestions(list);
      if (!list.length) addToast('No suggestions - add more pantry items.', 'info');
    } catch (err) {
      addToast(err.message || 'Suggestions failed', 'error');
    } finally {
      setSuggestLoading(false);
    }
  }

  async function applySuggestion(s) {
    const day   = s.day_of_week;
    const type  = s.meal_type;
    const title = s.recipe_title || s.title || ('Recipe #' + s.recipe_id);
    try {
      await upsertMeal(planId, userId, s.recipe_id, day, type);
      setSlotMap(prev => ({
        ...prev,
        [day + '-' + type]: { title, recipeId: s.recipe_id, nutrition: {} },
      }));
      setSuggestions(prev => prev.filter(x => x !== s));
    } catch (err) {
      addToast(err.message || 'Failed to apply', 'error');
    }
  }

  async function handleApplyAllToDay(date) {
    if (!applyAllMode || !suggestions.length) return;
    setApplyAllMode(false);
    const day = dayName(date);
    const toApply = suggestions.slice(0, MEAL_TYPES.length).map((s, i) => ({
      ...s, day_of_week: day, meal_type: MEAL_TYPES[i],
    }));
    for (const s of toApply) await applySuggestion(s);
    addToast('Suggestions applied to ' + day + '!', 'success');
  }

  // ── shopping modal ─────────────────────────────────────────────────────────
  async function openShopModal() {
    if (!planId) return;
    setShopModal(true);
    setShopLoading(true);
    setShopItems([]);
    try {
      const data  = await getMissingIngredients(planId, userId);
      const items = Array.isArray(data?.missing) ? data.missing
                  : Array.isArray(data?.data)    ? data.data
                  : Array.isArray(data)          ? data : [];
      setShopItems(items.map(i => ({
        ingredient_name: i.ingredient_name || i.name || '',
        quantity:        i.quantity || '',
        unit:            i.unit    || '',
        ingredient_id:   i.ingredient_id || null,
        is_checked: true,
        adding:     false,
      })));
    } catch (err) {
      addToast(err.message || 'Failed to load ingredients', 'error');
    } finally {
      setShopLoading(false);
    }
  }

  function toggleShopItem(idx) {
    setShopItems(prev => prev.map((it, i) => i === idx ? { ...it, is_checked: !it.is_checked } : it));
  }

  async function addShopItemToPantry(idx) {
    const item = shopItems[idx];
    setShopItems(prev => prev.map((it, i) => i === idx ? { ...it, adding: true } : it));
    try {
      let ingId = item.ingredient_id;
      if (!ingId && item.ingredient_name) {
        const res   = await searchIngredients(item.ingredient_name);
        const found = Array.isArray(res?.data) ? res.data[0] : Array.isArray(res) ? res[0] : null;
        ingId = found?.ingredient_id || null;
      }
      if (!ingId) {
        addToast('Could not find "' + item.ingredient_name + '" in ingredient list.', 'warning');
        setShopItems(prev => prev.map((it, i) => i === idx ? { ...it, adding: false } : it));
        return;
      }
      await addPantryItem(userId, ingId, item.quantity || 1, item.unit || '', null);
      addToast(item.ingredient_name + ' added to pantry.', 'success');
      setShopItems(prev => prev.map((it, i) => i === idx ? { ...it, is_checked: false, adding: false } : it));
    } catch (err) {
      addToast(err.message || 'Failed to add to pantry', 'error');
      setShopItems(prev => prev.map((it, i) => i === idx ? { ...it, adding: false } : it));
    }
  }

  async function generateShoppingList() {
    const checked = shopItems.filter(i => i.is_checked);
    if (!checked.length) { addToast('No items selected.', 'warning'); return; }
    setShopGenerating(true);
    try {
      saveShoppingListLocally(checked, 'Meal Plan');
      addToast('Shopping list saved!', 'success');
      setShopModal(false);
      navigate('/shopping-list');
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally { setShopGenerating(false); }
  }

  // ── nutrition (computed from slotMap) ──────────────────────────────────────
  function computeNutrition() {
    const days = weekDays.map(date => {
      const day    = dayName(date);
      const iso    = toISO(date);
      const isPast = iso < todayIso;
      const meals  = MEAL_TYPES
        .map(type => { const s = slotMap[day + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {} } : null; })
        .filter(Boolean);
      const hasMeals = meals.length > 0;
      const total = meals.reduce((a, m) => ({
        calories: a.calories + (m.nutrition.calories || 0),
        protein:  a.protein  + (m.nutrition.protein  || 0),
        carbs:    a.carbs    + (m.nutrition.carbs     || 0),
        fat:      a.fat      + (m.nutrition.fat       || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      return { date, day, iso, isPast, isToday: iso === todayIso, meals, hasMeals, total };
    });
    const active  = days.filter(d => d.hasMeals);
    const missed  = days.filter(d => d.isPast && !d.hasMeals);
    const wTotal  = active.reduce((a, d) => ({
      calories: a.calories + d.total.calories,
      protein:  a.protein  + d.total.protein,
      carbs:    a.carbs    + d.total.carbs,
      fat:      a.fat      + d.total.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const avg = active.length > 0 ? {
      calories: wTotal.calories / active.length,
      protein:  wTotal.protein  / active.length,
      carbs:    wTotal.carbs    / active.length,
      fat:      wTotal.fat      / active.length,
    } : null;
    return { days, active, missed, wTotal, avg };
  }

  // ── templates ──────────────────────────────────────────────────────────────
  async function loadTemplates() {
    setTemplatesLoading(true);
    try {
      const data = await listTemplates(userId);
      setTemplates(Array.isArray(data?.templates) ? data.templates : Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      addToast(err.message || 'Failed to load templates', 'error');
    } finally { setTemplatesLoading(false); }
  }

  useEffect(() => { if (activeTab === 'templates') loadTemplates(); }, [activeTab]);

  async function handleSaveTemplate() {
    if (!templateName.trim()) { addToast('Enter a template name', 'error'); return; }
    setSavingTemplate(true);
    try {
      await savePlanAsTemplate(planId, userId, templateName.trim());
      addToast('Template saved!', 'success');
      setTemplateName('');
      loadTemplates();
    } catch (err) {
      addToast(err.message || 'Failed to save template', 'error');
    } finally { setSavingTemplate(false); }
  }

  async function handleLoadTemplate(templateId) {
    setConfirmAction({
      title: 'Load Template',
      message: 'This will replace all current meals. Continue?',
      confirmLabel: 'Load',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await loadTemplateIntoPlan(planId, userId, templateId);
          const data = await getMealPlan(planId, userId);
          setSlotMap(buildSlotMap(data.meals || data.data || []));
          setActiveTab('calendar');
          addToast('Template loaded!', 'success');
        } catch (err) {
          addToast(err.message || 'Failed to load template', 'error');
        }
      },
    });
  }

  function confirmDeleteTemplate(templateId, name) {
    setConfirmAction({
      title: 'Delete Template',
      message: 'Delete "' + name + '"? This cannot be undone.',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await deleteTemplate(templateId, userId);
          addToast('Template deleted.', 'success');
          loadTemplates();
        } catch (err) {
          addToast(err.message || 'Failed to delete', 'error');
        }
      },
    });
  }

  async function handleFavourite(e, recipeId) {
    e.stopPropagation();
    try {
      await toggleFavourite(recipeId, userId);
      setRecipeList(prev => prev.map(r =>
        r.recipe_id === recipeId ? { ...r, is_favourite: !r.is_favourite } : r
      ));
    } catch {}
  }

  const nut     = computeNutrition();
  const hasNut  = nut.active.length > 0 && nut.wTotal.calories > 0;

  return (
    <div className={'mp-shell' + (applyAllMode ? ' apply-all-mode' : '')}>

      {/* Header */}
      <div className="mp-page-header">
        <div className="mp-page-title-row">
          <h1 className="mp-page-title">Plan &amp; Nutrition</h1>

          <div className="mp-date-nav">
            {/* Two-level navigation: outer = 7 days, inner = 1 day */}
            <div className="mp-nav-group">
              <button className="mp-nav-outer" onClick={() => nav(-7)} title="Back 7 days">&laquo;</button>
              <button className="mp-nav-inner" onClick={() => nav(-1)} title="Back 1 day">&lsaquo;</button>
            </div>

            <div className="week-nav-center">
              <span className="week-range">{fmtRange(startDate)}</span>
              {toISO(startDate) !== todayIso && (
                <button className="btn-today" onClick={() => setStartDate(today0())}>Today</button>
              )}
              {planId && <span className="plan-badge">Plan #{planId}</span>}
            </div>

            <div className="mp-nav-group">
              <button className="mp-nav-inner" onClick={() => nav(1)}  title="Forward 1 day">&rsaquo;</button>
              <button className="mp-nav-outer" onClick={() => nav(7)}  title="Forward 7 days">&raquo;</button>
            </div>
          </div>
        </div>

        {planId && (
          <div className="mp-toolbar">
            <button className="btn-suggest" onClick={handleSuggest} disabled={suggestLoading}>
              {suggestLoading ? 'Loading...' : 'Suggest Meals'}
            </button>
            <button className="btn-primary-sm" onClick={openShopModal}>
              Shopping List
            </button>
            {isDirty && (
              <button className="btn-save-plan" onClick={handleSavePlan}>Save Plan</button>
            )}
            <button className="btn-danger-sm" onClick={confirmClear}>Clear Week</button>
          </div>
        )}

        {!planId && !loading && toISO(addDays(startDate, 6)) < todayIso && (
          <p className="mp-past-note">This is a past week with no saved meal plan.</p>
        )}
      </div>

      {/* Apply-all banner */}
      {applyAllMode && (
        <div className="apply-all-banner">
          Click on a day column in the calendar to apply all suggestions to that day.
          <button className="apply-all-cancel" onClick={() => setApplyAllMode(false)}>Cancel</button>
        </div>
      )}

      {/* Tabs */}
      {planId && (
        <div className="mp-tabs">
          {TABS.map(t => (
            <button key={t} className={'mp-tab' + (activeTab === t ? ' active' : '')} onClick={() => handleTabClick(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* ── CALENDAR TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="mp-tab-content">

          {/* Suggestions strip */}
          {suggestions.length > 0 && (
            <div className="suggestions-strip">
              <div className="suggestions-strip-head">
                <span className="suggestions-strip-title">Meal Suggestions</span>
                <button className="btn-sm-accent" onClick={() => setApplyAllMode(true)}>Apply All</button>
              </div>
              <div className="suggestions-chips">
                {suggestions.map((s, i) => {
                  const title = s.recipe_title || s.title || ('Recipe #' + s.recipe_id);
                  const day   = s.day_of_week ? s.day_of_week.slice(0, 3) : '---';
                  return (
                    <div key={i} className="suggestion-chip">
                      <span className={'meal-badge meal-badge--' + s.meal_type}>{s.meal_type}</span>
                      <span className="chip-day">{day}</span>
                      <span className="chip-title">{title}</span>
                      <button className="chip-apply" onClick={() => applySuggestion(s)}>+</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="calendar-scroll">
            {loading && <div className="calendar-loading">Loading...</div>}
            <table className="calendar">
              <thead>
                <tr>
                  <th className="cal-label-col" />
                  {weekDays.map((date, i) => {
                    const iso    = toISO(date);
                    const isPast = iso < todayIso;
                    return (
                      <th
                        key={i}
                        className={
                          'cal-day-header' +
                          (iso === todayIso ? ' today' : '') +
                          (isPast ? ' past' : '') +
                          (applyAllMode && !isPast ? ' apply-target' : '')
                        }
                        onClick={() => applyAllMode && !isPast && handleApplyAllToDay(date)}
                        style={applyAllMode && !isPast ? { cursor: 'pointer' } : undefined}
                      >
                        <span className="day-name">{dayName(date).slice(0, 3)}</span>
                        <span className="day-date">{toShort(date)}</span>
                        {iso === todayIso && <span className="today-dot" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(type => (
                  <tr key={type} className={'cal-row cal-row--' + type}>
                    <td className="cal-row-label">{MEAL_LABELS[type]}</td>
                    {weekDays.map((date, di) => {
                      const day    = dayName(date);
                      const key    = day + '-' + type;
                      const slot   = slotMap[key];
                      const iso    = toISO(date);
                      const isPast = iso < todayIso;
                      const isOver = dragOver === key;
                      return (
                        <td
                          key={di}
                          className={[
                            'cal-slot',
                            slot   ? 'has-meal' : 'empty',
                            isPast ? 'past-slot' : '',
                            isOver && !isPast ? 'drag-over' : '',
                          ].filter(Boolean).join(' ')}
                          onDragOver={e => { if (!isPast) { e.preventDefault(); setDragOver(key); } }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={e => { if (!isPast) handleDrop(e, day, type); }}
                        >
                          {slot ? (
                            <div
                              className="slot-content"
                              draggable={!isPast}
                              onDragStart={!isPast ? e => handleSlotDragStart(e, day, type) : undefined}
                            >
                              <span className="slot-title">{slot.title}</span>
                              {!isPast && (
                                <button className="btn-remove-slot" title="Remove" onClick={e => handleRemove(day, type, e)}>x</button>
                              )}
                            </div>
                          ) : !isPast ? (
                            <span className="slot-drop-hint">Drop here</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mp-drag-hint">
            Drag recipes from the list below into the calendar. Drag between slots to swap meals.
          </p>

          {/* Recipe list */}
          <div className="mp-recipe-list-section">
            <div className="mp-recipe-list-header">
              <input
                className="mp-recipe-search"
                type="text"
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
              />
              <div className="mp-recipe-toggles">
                {RECIPE_VIEWS.map(v => (
                  <button
                    key={v}
                    className={'mp-toggle-btn' + (recipeView === v ? ' active' : '')}
                    onClick={() => setRecipeView(v)}
                  >
                    {RECIPE_VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            {recipeLoading && <p className="mp-recipe-loading">Loading recipes...</p>}
            {!recipeLoading && recipeList.length === 0 && (
              <p className="mp-recipe-empty">No recipes found.</p>
            )}

            <div className="mp-recipe-list">
              {recipeList.map(recipe => {
                const p   = recipe.nutrition?.protein_g || recipe.protein_g;
                const c   = recipe.nutrition?.carbs_g   || recipe.carbs_g;
                const cal = recipe.nutrition?.calories  || recipe.calories;
                return (
                  <div
                    key={recipe.recipe_id}
                    className="mp-recipe-card"
                    draggable
                    onDragStart={e => handleDragStart(e, recipe, null)}
                  >
                    <span className="mp-drag-handle">&#x2630;</span>
                    <div className="mp-recipe-card-info">
                      <span className="mp-recipe-title">{recipe.title}</span>
                      <div className="mp-recipe-meta">
                        {recipe.difficulty && (
                          <span className={'badge badge-diff badge-' + recipe.difficulty.toLowerCase()}>{recipe.difficulty}</span>
                        )}
                        {recipeView === 'protein' && p  && <span className="mp-macro-tag">{Math.round(p)}g prot</span>}
                        {recipeView === 'carbs'   && c  && <span className="mp-macro-tag">{Math.round(c)}g carbs</span>}
                        {cal && <span className="mp-macro-tag">{Math.round(cal)} kcal</span>}
                      </div>
                    </div>
                    <button
                      className={'fav-btn' + (recipe.is_favourite ? ' faved' : '')}
                      onClick={e => handleFavourite(e, recipe.recipe_id)}
                      title={recipe.is_favourite ? 'Unsave' : 'Save'}
                    >
                      {recipe.is_favourite ? '\u2665' : '\u2661'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── NUTRITION TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (() => {
        // nutrition tab has its own week navigation (nutViewDate)
        const nutStart    = (() => { const d = new Date(nutViewDate); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
        const nutWeekDays = Array.from({ length: 7 }, (_, i) => addDays(nutStart, i));
        const nutTodayIso = toISO(today0());

        // build a slotMap that works across any week: when nutViewDate === startDate week, use live slotMap
        // otherwise build from planKey localStorage (best effort)
        const isSameWeek = toISO(nutStart) === toISO(startDate);
        const nutSlotMap = isSameWeek ? slotMap : {};

        const nutDays = nutWeekDays.map(date => {
          const day     = dayName(date);
          const iso     = toISO(date);
          const isPast  = iso < nutTodayIso;
          const meals   = MEAL_TYPES
            .map(type => { const s = nutSlotMap[day + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {} } : null; })
            .filter(Boolean);
          const hasMeals = meals.length > 0;
          const total    = meals.reduce((a, m) => ({
            calories: a.calories + (m.nutrition.calories || 0),
            protein:  a.protein  + (m.nutrition.protein  || 0),
            carbs:    a.carbs    + (m.nutrition.carbs     || 0),
            fat:      a.fat      + (m.nutrition.fat       || 0),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
          return { date, day, iso, isPast, isToday: iso === nutTodayIso, meals, hasMeals, total };
        });

        const nutActive = nutDays.filter(d => d.hasMeals);
        const nutMissed = nutDays.filter(d => d.isPast && !d.hasMeals);
        const nutWTotal = nutActive.reduce((a, d) => ({
          calories: a.calories + d.total.calories,
          protein:  a.protein  + d.total.protein,
          carbs:    a.carbs    + d.total.carbs,
          fat:      a.fat      + d.total.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        const nutAvg = nutActive.length > 0 ? {
          calories: nutWTotal.calories / nutActive.length,
          protein:  nutWTotal.protein  / nutActive.length,
          carbs:    nutWTotal.carbs    / nutActive.length,
          fat:      nutWTotal.fat      / nutActive.length,
        } : null;
        const hasNutData = nutActive.length > 0 && nutWTotal.calories > 0;

        // pie chart data (protein cal = *4, carbs = *4, fat = *9, other = remainder)
        const proteinCal = nutWTotal.protein * 4;
        const carbsCal   = nutWTotal.carbs   * 4;
        const fatCal     = nutWTotal.fat     * 9;
        const otherCal   = Math.max(0, nutWTotal.calories - proteinCal - carbsCal - fatCal);
        const pieTotal   = proteinCal + carbsCal + fatCal + otherCal || 1;
        const pieSlices  = [
          { label: 'Protein', value: proteinCal, color: '#4caf8c', pct: Math.round((proteinCal / pieTotal) * 100) },
          { label: 'Carbs',   value: carbsCal,   color: '#5a4fcf', pct: Math.round((carbsCal   / pieTotal) * 100) },
          { label: 'Fat',     value: fatCal,     color: '#e8a050', pct: Math.round((fatCal     / pieTotal) * 100) },
          { label: 'Other',   value: otherCal,   color: '#ccc',    pct: Math.round((otherCal   / pieTotal) * 100) },
        ];
        // Build conic-gradient for pie
        let acc = 0;
        const conicParts = pieSlices.map(s => {
          const start = acc;
          acc += (s.value / pieTotal) * 360;
          return s.color + ' ' + start.toFixed(1) + 'deg ' + acc.toFixed(1) + 'deg';
        });
        const conicGradient = 'conic-gradient(' + conicParts.join(', ') + ')';

        return (
          <div className="mp-tab-content">
            {/* Navigation row */}
            <div className="nut-nav-row">
              <button className="mp-nav-outer" onClick={() => nutNav(-7)} title="Previous week">&laquo;</button>
              <button className="mp-nav-inner" onClick={() => nutNav(-1)} title="Previous day">&lsaquo;</button>
              <span className="nut-week-label">{fmtRange(nutStart)}</span>
              <button className="mp-nav-inner" onClick={() => nutNav(1)}  title="Next day">&rsaquo;</button>
              <button className="mp-nav-outer" onClick={() => nutNav(7)}  title="Next week">&raquo;</button>
              {toISO(nutStart) !== toISO(startDate) && (
                <button className="btn-today" onClick={() => setNutViewDate(today0())}>Current Week</button>
              )}
            </div>

            {nutMissed.length > 0 && (
              <div className="nut-missed-banner">
                Missed entries: {nutMissed.length} day{nutMissed.length > 1 ? 's' : ''} with no meals
                ({nutMissed.map(d => d.day.slice(0, 3)).join(', ')})
              </div>
            )}

            {/* Per-day breakdown */}
            <div className="nut-days">
              {nutDays.map(d => (
                <div
                  key={d.iso}
                  className={[
                    'nut-day-row',
                    !d.hasMeals ? 'nut-day-empty' : '',
                    d.isToday   ? 'nut-day-today'  : '',
                    d.isPast && !d.hasMeals ? 'nut-day-missed' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="nut-day-head">
                    <span className="nut-day-name">{d.day.slice(0, 3)} {toShort(d.date)}</span>
                    {d.hasMeals ? (
                      <span className="nut-day-cal">
                        {d.total.calories > 0 ? Math.round(d.total.calories) + ' kcal' : 'No calorie data'}
                      </span>
                    ) : (
                      <span className="nut-day-status">{d.isPast ? 'Missed' : 'No meals yet'}</span>
                    )}
                  </div>
                  {d.hasMeals && d.total.calories > 0 && (
                    <div className="nut-day-macros">
                      <span>Protein: {Math.round(d.total.protein)}g</span>
                      <span>Carbs: {Math.round(d.total.carbs)}g</span>
                      <span>Fat: {Math.round(d.total.fat)}g</span>
                    </div>
                  )}
                  {d.hasMeals && (
                    <div className="nut-day-meals">
                      {d.meals.map((m, i) => (
                        <span key={i} className={'nut-meal-tag nut-meal-tag--' + m.type}>{m.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Weekly summary */}
            {hasNutData ? (
              <div className="nutrition-cards">
                <p className="nut-summary-note">
                  Totals from {nutActive.length} day{nutActive.length !== 1 ? 's' : ''} with meals
                  {nutMissed.length > 0 ? ', ' + nutMissed.length + ' missed' : ''}
                </p>
                <div className="nutrition-card nutrition-card--calories">
                  <span className="nutrition-card-value">{Math.round(nutWTotal.calories)}</span>
                  <span className="nutrition-card-label">kcal total</span>
                </div>
                <div className="nutrition-card nutrition-card--protein">
                  <span className="nutrition-card-value">{Math.round(nutWTotal.protein)}g</span>
                  <span className="nutrition-card-label">Protein</span>
                </div>
                <div className="nutrition-card nutrition-card--carbs">
                  <span className="nutrition-card-value">{Math.round(nutWTotal.carbs)}g</span>
                  <span className="nutrition-card-label">Carbs</span>
                </div>
                <div className="nutrition-card nutrition-card--fat">
                  <span className="nutrition-card-value">{Math.round(nutWTotal.fat)}g</span>
                  <span className="nutrition-card-label">Fat</span>
                </div>

                {/* Running pie chart */}
                <div className="nut-pie-card">
                  <h3 className="nutrition-bars-title">Macronutrient Split (by calories)</h3>
                  <div className="nut-pie-wrap">
                    <div className="nut-pie" style={{ background: conicGradient }} />
                    <div className="nut-pie-legend">
                      {pieSlices.filter(s => s.pct > 0).map(s => (
                        <div key={s.label} className="nut-pie-item">
                          <span className="nut-pie-dot" style={{ background: s.color }} />
                          <span className="nut-pie-lbl">{s.label}</span>
                          <span className="nut-pie-pct">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {nutAvg && (
                  <div className="nutrition-bars-card">
                    <h3 className="nutrition-bars-title">Daily Average ({nutActive.length} active day{nutActive.length !== 1 ? 's' : ''})</h3>
                    <MacroBar label="Calories"    value={nutAvg.calories} max={2200} color="#e8622a" />
                    <MacroBar label="Protein (g)" value={nutAvg.protein}  max={150}  color="#4caf8c" />
                    <MacroBar label="Carbs (g)"   value={nutAvg.carbs}    max={275}  color="#5a4fcf" />
                    <MacroBar label="Fat (g)"     value={nutAvg.fat}      max={75}   color="#e8a050" />
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">No nutrition data for this week</p>
                <p className="empty-state-body">
                  {isSameWeek
                    ? 'Add recipes to your plan. Make sure recipes have nutrition values filled in.'
                    : 'This week has no saved meal plan data to compute nutrition from.'}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TEMPLATES TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="mp-tab-content">
          {planId && (
            <div className="templates-save-card">
              <h2 className="tab-section-title">Save Current Plan as Template</h2>
              <div className="templates-save-row">
                <input
                  className="form-input"
                  placeholder="Template name..."
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                />
                <button className="btn-primary-sm" onClick={handleSaveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
          <div className="templates-list-section">
            <h3 className="templates-list-title">Saved Templates</h3>
            {templatesLoading && <p className="tab-section-sub">Loading...</p>}
            {!templatesLoading && templates.length === 0 && (
              <div className="empty-state">
                <p className="empty-state-title">No templates yet</p>
                <p className="empty-state-body">Save your current plan as a template to reuse it later.</p>
              </div>
            )}
            {templates.map(t => (
              <div key={t.template_id} className="template-row">
                <div className="template-row-info">
                  <span className="template-name">{t.name}</span>
                  {t.created_at && <span className="template-date">{new Date(t.created_at).toLocaleDateString()}</span>}
                </div>
                <div className="template-row-actions">
                  {planId && <button className="btn-primary-sm" onClick={() => handleLoadTemplate(t.template_id)}>Load</button>}
                  <button className="btn-danger-sm" onClick={() => confirmDeleteTemplate(t.template_id, t.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SHOPPING MODAL ───────────────────────────────────────────────────── */}
      {shopModal && (
        <div className="modal-overlay" onClick={() => setShopModal(false)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">Generate Shopping List</h2>
              <button className="mp-modal-close" onClick={() => setShopModal(false)}>x</button>
            </div>
            <p className="shop-modal-sub">
              Select ingredients to add to your shopping list. Deselect items you already have.
            </p>

            {shopLoading && <p className="shop-modal-loading">Loading missing ingredients...</p>}
            {!shopLoading && shopItems.length === 0 && (
              <p className="shop-modal-empty">Your pantry covers everything in this plan!</p>
            )}

            {shopItems.length > 0 && (
              <div className="shop-modal-items">
                {shopItems.map((item, idx) => (
                  <div key={idx} className={'shop-modal-item' + (!item.is_checked ? ' unchecked' : '')}>
                    <label className="shop-modal-check" onClick={() => toggleShopItem(idx)}>
                      <div className={'sl-checkbox' + (item.is_checked ? ' ticked' : '')}>
                        {item.is_checked && '\u2713'}
                      </div>
                      <span className="shop-item-name">{item.ingredient_name}</span>
                      {item.quantity && <span className="shop-item-qty">{item.quantity} {item.unit}</span>}
                    </label>
                    <button
                      className="btn-add-pantry"
                      disabled={item.adding}
                      onClick={() => addShopItemToPantry(idx)}
                    >
                      {item.adding ? '...' : '+ Pantry'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {shopItems.length > 0 && (
              <div className="shop-modal-footer">
                <span className="shop-selected-count">
                  {shopItems.filter(i => i.is_checked).length} item{shopItems.filter(i => i.is_checked).length !== 1 ? 's' : ''} selected
                </span>
                <button className="btn-ghost-sm" onClick={() => setShopModal(false)}>Cancel</button>
                <button
                  className="btn-primary-sm"
                  onClick={generateShoppingList}
                  disabled={shopGenerating || !shopItems.some(i => i.is_checked)}
                >
                  {shopGenerating ? 'Saving...' : 'Generate Shopping List'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel || 'Confirm'}
          cancelLabel={confirmAction.cancelLabel || 'Cancel'}
          onConfirm={confirmAction.onConfirm}
          onCancel={confirmAction.onCancel || (() => setConfirmAction(null))}
        />
      )}
    </div>
  );
}