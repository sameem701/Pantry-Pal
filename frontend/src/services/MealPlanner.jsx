import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  getMealsForRange, upsertMeal, removeMeal, clearMealsForDate, markMealCooked,
  suggestMeals, getMissingIngredients,
  saveTemplate, listTemplates, deleteTemplate,
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
function toISO(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function dayName(d) { return d.toLocaleDateString('en-US', { weekday: 'long' }); }
function fmtRange(s) {
  const e = addDays(s, 6);
  return toShort(s) + ' \u2013 ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build slotMap from the flat meals array returned by get_meals_for_range */
function buildSlotMapFromMeals(meals) {
  const map = {};
  for (const m of (meals || [])) {
    const key = m.date + '-' + m.meal_type;
    map[key] = {
      title:    m.recipe_title || m.recipe_name || ('Recipe #' + m.recipe_id),
      recipeId: m.recipe_id,
      isCooked: m.is_cooked || false,
      nutrition: {
        calories: m.calories  || 0,
        protein:  m.protein_g || m.protein || 0,
        carbs:    m.carbs_g   || m.carbs   || 0,
        fat:      m.fat_g     || m.fat     || 0,
      },
    };
  }
  return map;
}

/* SVG donut chart */
function DonutChart({ slices, centerLabel, centerSub }) {
  const R = 46, STROKE = 13, SIZE = 120;
  const CX = SIZE / 2, CY = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const hasData = slices.some(s => s.pct > 0.5);
  let accumulated = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0ebe5" strokeWidth={STROKE} />
      {hasData && slices.filter(s => s.pct > 0.5).map((s, i) => {
        const dash       = (s.pct / 100) * circumference;
        const dashoffset = circumference * 0.25 - accumulated;
        accumulated += dash;
        return (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={dashoffset} strokeLinecap="butt" />
        );
      })}
      {centerLabel != null && (
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="14" fontWeight="700"
          fill="#1a1a2e" fontFamily="sans-serif">{centerLabel}</text>
      )}
      {centerSub && (
        <text x={CX} y={CY + 19} textAnchor="middle" fontSize="9" fill="#888"
          fontFamily="sans-serif">{centerSub}</text>
      )}
    </svg>
  );
}

export default function MealPlanner() {
  const { user }     = useAuth();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const userId       = user?.user_id;

  const [startDate,     setStartDate]     = useState(() => today0());
  const todayIso = toISO(today0());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const startISO = toISO(startDate);
  const endISO   = toISO(addDays(startDate, 6));

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [slotMap,       setSlotMap]       = useState({});
  const [loading,       setLoading]       = useState(false);
  const [activeTab,     setActiveTab]     = useState('calendar');
  const [dragOver,      setDragOver]      = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // ── clear mode ─────────────────────────────────────────────────────────────
  const [clearMode,     setClearMode]     = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());

  // ── suggestions ────────────────────────────────────────────────────────────
  const [suggestionOptions, setSuggestionOptions] = useState([]);
  const [activeSuggOption,  setActiveSuggOption]  = useState(0);
  const [suggestions,       setSuggestions]       = useState([]);
  const [suggestLoading,    setSuggestLoading]    = useState(false);
  const [applyAllMode,      setApplyAllMode]      = useState(false);

  // ── click-to-assign ────────────────────────────────────────────────────────
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // ── recipes ────────────────────────────────────────────────────────────────
  const [recipeList,    setRecipeList]    = useState([]);
  const [recipeSearch,  setRecipeSearch]  = useState('');
  const [recipeView,    setRecipeView]    = useState('all');
  const [recipeLoading, setRecipeLoading] = useState(false);
  const recipeTimer = useRef(null);

  // ── shopping ───────────────────────────────────────────────────────────────
  const [shopModal,      setShopModal]      = useState(false);
  const [shopItems,      setShopItems]      = useState([]);
  const [shopLoading,    setShopLoading]    = useState(false);
  const [shopGenerating, setShopGenerating] = useState(false);

  // ── templates ──────────────────────────────────────────────────────────────
  const [templates,        setTemplates]        = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // save template modal
  const [saveTmplModal,     setSaveTmplModal]     = useState(false);
  const [saveTmplName,      setSaveTmplName]      = useState('');
  const [saveTmplDays,      setSaveTmplDays]      = useState(new Set());
  const [savingTemplate,    setSavingTemplate]    = useState(false);
  const saveTmplDragRef     = useRef({ active: false, start: null, end: null });
  const [saveTmplDragRange, setSaveTmplDragRange] = useState(null); // {lo,hi} while dragging
  // chip swap order: array of original day indices, e.g. [0,1,2,3,4,5,6]
  const [saveTmplOrder,     setSaveTmplOrder]     = useState([]);
  const saveTmplSwapRef     = useRef({ active: false, dragIdx: null }); // dragIdx = index in saveTmplOrder

  // load template modal
  const [loadTmplModal,       setLoadTmplModal]       = useState(null);
  const [loadTmplStartDate,   setLoadTmplStartDate]   = useState('');
  const [loadTmplWorking,     setLoadTmplWorking]     = useState(false);
  const [loadTmplConflicts,   setLoadTmplConflicts]   = useState(new Set());
  const [loadTmplArrangement, setLoadTmplArrangement] = useState([]);
  const [loadTmplDragIdx,     setLoadTmplDragIdx]     = useState(null);

  // view template modal
  const [viewTmplModal, setViewTmplModal] = useState(null);

  // ── load meals ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSlotMap({});
    setSuggestions([]);
    setLoading(true);
    getMealsForRange(userId, startISO, endISO)
      .then(data => {
        if (cancelled) return;
        const meals = Array.isArray(data?.meals) ? data.meals
                    : Array.isArray(data?.data)  ? data.data
                    : Array.isArray(data)        ? data : [];
        setSlotMap(buildSlotMapFromMeals(meals));
      })
      .catch(() => { if (!cancelled) setSlotMap({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, reloadTrigger, userId]);

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
  function nav(days) {
    setStartDate(d => addDays(d, days));
    setActiveTab('calendar');
    setClearMode(false);
    setSelectedSlots(new Set());
  }

  function handleTabClick(tab) {
    if (tab === activeTab) return;
    setClearMode(false);
    setSelectedSlots(new Set());
    setActiveTab(tab);
  }

  // ── nutrition ──────────────────────────────────────────────────────────────
  function computeNutrition() {
    const days = weekDays.map(date => {
      const iso    = toISO(date);
      const isPast = iso < todayIso;
      const meals  = MEAL_TYPES
        .map(type => { const s = slotMap[iso + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {}, isCooked: s.isCooked } : null; })
        .filter(Boolean);
      const hasMeals = meals.length > 0;
      const total = meals.reduce((a, m) => ({
        calories: a.calories + (m.nutrition.calories || 0),
        protein:  a.protein  + (m.nutrition.protein  || 0),
        carbs:    a.carbs    + (m.nutrition.carbs     || 0),
        fat:      a.fat      + (m.nutrition.fat       || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      return { date, iso, isPast, isToday: iso === todayIso, meals, hasMeals, total };
    });
    const active = days.filter(d => d.hasMeals);
    const wTotal = active.reduce((a, d) => ({
      calories: a.calories + d.total.calories,
      protein:  a.protein  + d.total.protein,
      carbs:    a.carbs    + d.total.carbs,
      fat:      a.fat      + d.total.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return { days, active, wTotal };
  }

  // ── clear mode ─────────────────────────────────────────────────────────────
  function toggleSlotSelection(key) {
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleDaySelection(dateISO) {
    const keys = MEAL_TYPES.map(t => dateISO + '-' + t);
    const allSelected = keys.every(k => selectedSlots.has(k));
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (allSelected) { keys.forEach(k => next.delete(k)); }
      else             { keys.forEach(k => next.add(k)); }
      return next;
    });
  }

  async function handleClearSelected() {
    if (!selectedSlots.size) return;
    const slotsByDate = {};
    for (const key of selectedSlots) {
      const lastDash = key.lastIndexOf('-');
      const date     = key.slice(0, lastDash);
      const mealType = key.slice(lastDash + 1);
      if (!slotsByDate[date]) slotsByDate[date] = [];
      slotsByDate[date].push({ key, mealType });
    }
    try {
      for (const [date, entries] of Object.entries(slotsByDate)) {
        if (entries.length === MEAL_TYPES.length) {
          await clearMealsForDate(userId, date);
        } else {
          for (const { mealType } of entries) await removeMeal(userId, date, mealType);
        }
      }
      setSlotMap(prev => {
        const next = { ...prev };
        for (const key of selectedSlots) delete next[key];
        return next;
      });
      const count = selectedSlots.size;
      setSelectedSlots(new Set());
      setClearMode(false);
      addToast('Cleared ' + count + ' slot' + (count !== 1 ? 's' : '') + '.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to clear', 'error');
    }
  }

  // ── drag ───────────────────────────────────────────────────────────────────
  function handleDragStart(e, recipe, sourceKey) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      recipeId:  recipe.recipe_id,
      title:     recipe.title || recipe.recipe_title || ('Recipe #' + recipe.recipe_id),
      nutrition: {
        calories: recipe.nutrition?.calories  || recipe.calories  || 0,
        protein:  recipe.nutrition?.protein_g || recipe.protein_g || 0,
        carbs:    recipe.nutrition?.carbs_g   || recipe.carbs_g   || 0,
        fat:      recipe.nutrition?.fat_g     || recipe.fat_g     || 0,
      },
      sourceKey: sourceKey || null,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleSlotDragStart(e, dateISO, type) {
    const key  = dateISO + '-' + type;
    const slot = slotMap[key];
    if (!slot) return;
    e.dataTransfer.setData('application/json', JSON.stringify({
      recipeId:  slot.recipeId,
      title:     slot.title,
      nutrition: slot.nutrition || {},
      sourceKey: key,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e, dateISO, type) {
    e.preventDefault();
    setDragOver(null);
    try {
      const data      = JSON.parse(e.dataTransfer.getData('application/json'));
      const targetKey = dateISO + '-' + type;
      const existing  = slotMap[targetKey];

      if (existing && data.sourceKey && data.sourceKey !== targetKey) {
        // Swap
        const lastDash   = data.sourceKey.lastIndexOf('-');
        const srcDate    = data.sourceKey.slice(0, lastDash);
        const srcType    = data.sourceKey.slice(lastDash + 1);
        await upsertMeal(userId, srcDate, srcType, existing.recipeId);
        await upsertMeal(userId, dateISO, type, data.recipeId);
        setSlotMap(prev => ({
          ...prev,
          [data.sourceKey]: { ...existing },
          [targetKey]:      { title: data.title, recipeId: data.recipeId, isCooked: false, nutrition: data.nutrition || {} },
        }));
        addToast('Meals swapped!', 'success');
      } else {
        await upsertMeal(userId, dateISO, type, data.recipeId);
        if (data.sourceKey && data.sourceKey !== targetKey) {
          const lastDash = data.sourceKey.lastIndexOf('-');
          const srcDate  = data.sourceKey.slice(0, lastDash);
          const srcType  = data.sourceKey.slice(lastDash + 1);
          await removeMeal(userId, srcDate, srcType);
          setSlotMap(prev => {
            const n = { ...prev };
            delete n[data.sourceKey];
            n[targetKey] = { title: data.title, recipeId: data.recipeId, isCooked: false, nutrition: data.nutrition || {} };
            return n;
          });
        } else {
          setSlotMap(prev => ({
            ...prev,
            [targetKey]: { title: data.title, recipeId: data.recipeId, isCooked: false, nutrition: data.nutrition || {} },
          }));
        }
        addToast('Added to ' + (MEAL_LABELS[type] || type), 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to add meal', 'error');
    }
  }

  async function handleRemove(dateISO, type, e) {
    e && e.stopPropagation();
    const key = dateISO + '-' + type;
    try {
      await removeMeal(userId, dateISO, type);
      setSlotMap(prev => { const n = { ...prev }; delete n[key]; return n; });
    } catch (err) {
      addToast(err.message || 'Failed to remove', 'error');
    }
  }

  async function handleMarkCooked(dateISO, type, e) {
    e && e.stopPropagation();
    const key = dateISO + '-' + type;
    try {
      await markMealCooked(userId, dateISO, type);
      setSlotMap(prev => ({ ...prev, [key]: { ...prev[key], isCooked: true } }));
      addToast('Meal marked as cooked! Pantry updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to mark as cooked', 'error');
    }
  }

  // ── click-to-assign ────────────────────────────────────────────────────────
  function handleRecipeSelect(recipe) {
    setSelectedRecipe({
      recipeId:  recipe.recipe_id,
      title:     recipe.title || recipe.recipe_title || ('Recipe #' + recipe.recipe_id),
      nutrition: {
        calories: recipe.nutrition?.calories  || recipe.calories  || 0,
        protein:  recipe.nutrition?.protein_g || recipe.protein_g || 0,
        carbs:    recipe.nutrition?.carbs_g   || recipe.carbs_g   || 0,
        fat:      recipe.nutrition?.fat_g     || recipe.fat_g     || 0,
      },
    });
  }

  async function handleSlotClick(dateISO, type, e) {
    e && e.stopPropagation();
    if (clearMode) { toggleSlotSelection(dateISO + '-' + type); return; }
    if (!selectedRecipe) return;
    const key = dateISO + '-' + type;
    try {
      await upsertMeal(userId, dateISO, type, selectedRecipe.recipeId);
      setSlotMap(prev => ({
        ...prev,
        [key]: { title: selectedRecipe.title, recipeId: selectedRecipe.recipeId, isCooked: false, nutrition: selectedRecipe.nutrition || {} },
      }));
      addToast('Added to ' + (MEAL_LABELS[type] || type), 'success');
      setSelectedRecipe(null);
    } catch (err) {
      addToast(err.message || 'Failed to add meal', 'error');
    }
  }

  // ── suggestions ────────────────────────────────────────────────────────────
  async function handleSuggest() {
    setSuggestLoading(true);
    setSuggestions([]);
    setSuggestionOptions([]);
    setActiveSuggOption(0);
    try {
      const data = await suggestMeals(userId, startISO, 7);
      const optionData = Array.isArray(data?.data)        ? data.data
                       : Array.isArray(data?.suggestions) ? data.suggestions
                       : Array.isArray(data)              ? data : [];
      if (optionData.length > 0 && Array.isArray(optionData[0]?.meals)) {
        setSuggestionOptions(optionData);
        setSuggestions(optionData[0]?.meals || []);
      } else {
        setSuggestionOptions([{ option_number: 1, meals: optionData }]);
        setSuggestions(optionData);
      }
      if (!optionData.length) addToast('No suggestions available at the moment.', 'info');
    } catch (err) {
      addToast(err.message || 'Suggestions failed', 'error');
    } finally {
      setSuggestLoading(false);
    }
  }

  async function applySuggestion(s) {
    const type  = s.meal_type;
    const title = s.recipe_title || s.title || ('Recipe #' + s.recipe_id);
    const slotDate = weekDays.find(d => dayName(d) === s.day_of_week) || startDate;
    const slotISO  = toISO(slotDate);
    try {
      await upsertMeal(userId, slotISO, type, s.recipe_id);
      setSlotMap(prev => ({
        ...prev,
        [slotISO + '-' + type]: { title, recipeId: s.recipe_id, isCooked: false, nutrition: {} },
      }));
      setSuggestions(prev => prev.filter(x => x !== s));
      setSuggestionOptions(prev => prev.map((opt, idx) =>
        idx === activeSuggOption ? { ...opt, meals: opt.meals.filter(x => x !== s) } : opt
      ));
    } catch (err) {
      addToast(err.message || 'Failed to apply', 'error');
      throw err;
    }
  }

  async function handleApplyAllToDay(date) {
    if (!applyAllMode || !suggestions.length) return;
    setApplyAllMode(false);
    const toApply = suggestions.slice(0, MEAL_TYPES.length).map((s, i) => ({
      ...s, day_of_week: dayName(date), meal_type: MEAL_TYPES[i],
    }));
    let ok = 0;
    for (const s of toApply) {
      try { await applySuggestion(s); ok++; }
      catch {}
    }
    if (ok > 0) addToast(ok + ' suggestion' + (ok !== 1 ? 's' : '') + ' applied!', 'success');
  }

  // ── shopping ───────────────────────────────────────────────────────────────
  async function openShopModal() {
    setShopModal(true);
    setShopLoading(true);
    setShopItems([]);
    try {
      const data  = await getMissingIngredients(userId, startISO, endISO);
      const items = Array.isArray(data?.missing) ? data.missing
                  : Array.isArray(data?.data)    ? data.data
                  : Array.isArray(data)          ? data : [];
      setShopItems(items.map(i => ({
        ingredient_name: i.ingredient_name || i.name || '',
        quantity:        i.raw_breakdown   || i.quantity || '',
        pantry_display:  i.pantry_display  || '',
        ingredient_id:   i.ingredient_id   || null,
        is_checked: false,
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

  // ── templates ──────────────────────────────────────────────────────────────
  async function loadTemplates() {
    setTemplatesLoading(true);
    try {
      const data = await listTemplates(userId);
      setTemplates(
        Array.isArray(data?.templates) ? data.templates :
        Array.isArray(data?.data)      ? data.data : []
      );
    } catch (err) {
      addToast(err.message || 'Failed to load templates', 'error');
    } finally { setTemplatesLoading(false); }
  }

  useEffect(() => { if (activeTab === 'templates') loadTemplates(); }, [activeTab]);

  // Day-chip interaction for save template modal (range-drag, swap)
  useEffect(() => {
    if (!saveTmplModal) { setSaveTmplDragRange(null); return; }

    function onUp(e) {
      // ── finish chip swap ──────────────────────────────────────────────────
      if (saveTmplSwapRef.current.active) {
        saveTmplSwapRef.current = { active: false, dragIdx: null };
        return;
      }

      // ── finish range-drag ─────────────────────────────────────────────────
      if (!saveTmplDragRef.current.active) return;
      const { start, end } = saveTmplDragRef.current;
      saveTmplDragRef.current = { active: false, start: null, end: null };
      setSaveTmplDragRange(null);
      if (start === null) return;
      const lo = Math.min(start, end ?? start);
      const hi = Math.max(start, end ?? start);
      if (lo === hi) {
        // single tap — toggle that chip
        setSaveTmplDays(prev => {
          const next = new Set(prev);
          const dayIdx = saveTmplOrder[lo];
          if (next.has(dayIdx)) next.delete(dayIdx); else next.add(dayIdx);
          return next;
        });
      } else {
        // range drag — select exactly that span
        const nd = new Set();
        for (let i = lo; i <= hi; i++) nd.add(saveTmplOrder[i]);
        setSaveTmplDays(nd);
      }
    }

    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveTmplModal, saveTmplOrder]);

  // Save template modal
  function openSaveTemplateModal() {
    setSaveTmplName('');
    const preSelected = new Set();
    weekDays.forEach((date, i) => {
      const iso = toISO(date);
      if (MEAL_TYPES.some(t => slotMap[iso + '-' + t])) preSelected.add(i);
    });
    setSaveTmplDays(preSelected);
    setSaveTmplOrder([0, 1, 2, 3, 4, 5, 6]);
    setSaveTmplModal(true);
  }

  function toggleSaveTmplDay(idx) {
    setSaveTmplDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function handleSaveTemplate() {
    if (!saveTmplName.trim()) { addToast('Enter a template name', 'error'); return; }
    if (!saveTmplDays.size)   { addToast('Select at least one day', 'error'); return; }
    // Use chip display order (saveTmplOrder) to determine template day indices
    const orderedSelected = saveTmplOrder.filter(dayViewIdx => saveTmplDays.has(dayViewIdx));
    const mealData = [];
    orderedSelected.forEach((dayViewIdx, tmplIdx) => {
      const iso = toISO(weekDays[dayViewIdx]);
      MEAL_TYPES.forEach(mealType => {
        const slot = slotMap[iso + '-' + mealType];
        if (slot) mealData.push({ day_index: tmplIdx, meal_type: mealType, recipe_id: slot.recipeId });
      });
    });
    if (!mealData.length) { addToast('No meals on the selected days', 'error'); return; }
    setSavingTemplate(true);
    try {
      await saveTemplate(userId, saveTmplName.trim(), mealData);
      addToast('Template saved!', 'success');
      setSaveTmplModal(false);
      setSaveTmplName('');
      if (activeTab === 'templates') loadTemplates();
    } catch (err) {
      addToast(err.message || 'Failed to save template', 'error');
    } finally { setSavingTemplate(false); }
  }

  // Load template modal
  function computeLoadConflicts(startIso, arrangement) {
    const conflicts = new Set();
    arrangement.forEach((slot, idx) => {
      if (!slot) return;
      const dateISO = toISO(addDays(new Date(startIso + 'T00:00:00'), idx));
      if (slot.meals.some(m => slotMap[dateISO + '-' + m.meal_type])) conflicts.add(dateISO);
    });
    return conflicts;
  }

  function handleLoadTemplate(t) {
    const groups = {};
    for (const m of (t.meals || [])) {
      const idx = m.day_index ?? 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(m);
    }
    const maxIdx = Math.max(-1, ...Object.keys(groups).map(Number));
    const arrangement = Array.from({ length: maxIdx + 1 }, (_, i) =>
      groups[i] ? { day_index: i, meals: groups[i] } : null
    );
    setLoadTmplArrangement(arrangement);
    const defaultStart = toISO(today0());
    setLoadTmplStartDate(defaultStart);
    setLoadTmplConflicts(computeLoadConflicts(defaultStart, arrangement));
    setLoadTmplModal({ template_id: t.template_id, name: t.name });
  }

  function handleLoadTmplDateChange(iso) {
    setLoadTmplStartDate(iso);
    if (iso) setLoadTmplConflicts(computeLoadConflicts(iso, loadTmplArrangement));
    else     setLoadTmplConflicts(new Set());
  }

  async function confirmLoadTemplate() {
    if (!loadTmplModal || !loadTmplStartDate || !loadTmplArrangement.length) return;
    setLoadTmplWorking(true);
    try {
      const chosenDate = new Date(loadTmplStartDate + 'T00:00:00');
      for (let i = 0; i < loadTmplArrangement.length; i++) {
        const slot = loadTmplArrangement[i];
        if (!slot) continue;
        const dateISO = toISO(addDays(chosenDate, i));
        for (const m of slot.meals) {
          await upsertMeal(userId, dateISO, m.meal_type, m.recipe_id);
        }
      }
      const name = loadTmplModal.name;
      setLoadTmplModal(null);
      setLoadTmplArrangement([]);
      setActiveTab('calendar');
      setStartDate(chosenDate);
      setReloadTrigger(t => t + 1);
      addToast('Template "' + name + '" applied!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to load template', 'error');
    } finally { setLoadTmplWorking(false); }
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

  const hasAnyMeals = Object.keys(slotMap).length > 0;

  return (
    <div className={[
      'mp-shell',
      applyAllMode   ? 'apply-all-mode'    : '',
      selectedRecipe ? 'click-assign-mode' : '',
      clearMode      ? 'clear-mode'        : '',
    ].filter(Boolean).join(' ')}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mp-page-header">
        <div className="mp-page-title-row">
          <h1 className="mp-page-title">Plan &amp; Nutrition</h1>

          <div className="mp-date-nav">
            <div className="mp-nav-group">
              <button className="mp-nav-outer" onClick={() => nav(-7)} title="Back 1 week">&laquo;</button>
              <button className="mp-nav-inner" onClick={() => nav(-1)} title="Back 1 day">&lsaquo;</button>
            </div>
            <div className="week-nav-center">
              <span className="week-range">{fmtRange(startDate)}</span>
              {startISO !== todayIso && (
                <button className="btn-today" onClick={() => setStartDate(today0())}>Today</button>
              )}
            </div>
            <div className="mp-nav-group">
              <button className="mp-nav-inner" onClick={() => nav(1)}  title="Forward 1 day">&rsaquo;</button>
              <button className="mp-nav-outer" onClick={() => nav(7)}  title="Forward 1 week">&raquo;</button>
            </div>
          </div>
        </div>

        <div className="mp-toolbar">
          <button className="btn-suggest" onClick={handleSuggest} disabled={suggestLoading}>
            {suggestLoading ? 'Loading...' : 'Suggest Meals'}
          </button>
          {hasAnyMeals && (
            <>
              <button className="btn-primary-sm" onClick={openShopModal}>Shopping List</button>
              <button
                className={'btn-ghost-sm' + (clearMode ? ' active' : '')}
                onClick={() => { setClearMode(m => !m); setSelectedSlots(new Set()); }}
              >
                {clearMode ? 'Cancel Clear' : 'Clear Mode'}
              </button>
            </>
          )}
          {clearMode && selectedSlots.size > 0 && (
            <button className="btn-danger-sm" onClick={handleClearSelected}>
              Clear {selectedSlots.size} slot{selectedSlots.size !== 1 ? 's' : ''}
            </button>
          )}
          {activeTab === 'calendar' && hasAnyMeals && !clearMode && (
            <button className="btn-ghost-sm" onClick={openSaveTemplateModal}>Save as Template</button>
          )}
        </div>
      </div>

      {/* Apply-all banner */}
      {applyAllMode && (
        <div className="apply-all-banner">
          Click on a day column to apply all suggestions to that day.
          <button className="apply-all-cancel" onClick={() => setApplyAllMode(false)}>Cancel</button>
        </div>
      )}

      {/* Selected-recipe banner */}
      {selectedRecipe && !applyAllMode && (
        <div className="selected-recipe-banner">
          <span className="selected-recipe-label">
            &ldquo;{selectedRecipe.title}&rdquo; selected &mdash; click any meal slot to place it
          </span>
          <button className="apply-all-cancel" onClick={() => setSelectedRecipe(null)}>Cancel</button>
        </div>
      )}

      {/* Clear-mode banner */}
      {clearMode && (
        <div className="apply-all-banner">
          Click individual slots to select them, or click a date header to select all 3 slots for that day.
          {selectedSlots.size > 0 && <strong> {selectedSlots.size} selected.</strong>}
          <button className="apply-all-cancel" onClick={() => { setClearMode(false); setSelectedSlots(new Set()); }}>Cancel</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mp-tabs">
        {TABS.map(t => (
          <button key={t} className={'mp-tab' + (activeTab === t ? ' active' : '')} onClick={() => handleTabClick(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── CALENDAR TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="mp-tab-content">

          {/* Suggestions strip */}
          {suggestionOptions.length > 0 && (
            <div className="suggestions-strip">
              <div className="suggestions-strip-head">
                <span className="suggestions-strip-title">Meal Suggestions</span>
                <div className="sugg-option-tabs">
                  {suggestionOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      className={'sugg-option-tab' + (activeSuggOption === idx ? ' active' : '')}
                      onClick={() => { setActiveSuggOption(idx); setSuggestions(suggestionOptions[idx]?.meals || []); }}
                    >
                      Option {opt.option_number ?? (idx + 1)}
                    </button>
                  ))}
                </div>
                <button className="btn-sm-accent" onClick={() => setApplyAllMode(true)}>Apply All</button>
              </div>
              <div className="suggestions-chips">
                {suggestions.map((s, i) => {
                  const title = s.recipe_title || s.title || ('Recipe #' + s.recipe_id);
                  return (
                    <div
                      key={i}
                      className={'suggestion-chip' + (selectedRecipe?.recipeId === s.recipe_id ? ' selected' : '')}
                      onDoubleClick={() => handleRecipeSelect(s)}
                    >
                      <span className="chip-title">{title}</span>
                      {s.day_of_week && <span className="chip-day">{s.day_of_week.slice(0,3)} &middot; {MEAL_LABELS[s.meal_type] || s.meal_type}</span>}
                      <button className="chip-apply" title="Select to place in calendar" onClick={() => handleRecipeSelect(s)}>+</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar grid */}
          <div className="calendar-scroll">
            {loading && <div className="calendar-loading">Loading...</div>}
            <table className="calendar">
              <thead>
                <tr>
                  <th className="cal-label-col" />
                  {weekDays.map((date, i) => {
                    const iso    = toISO(date);
                    const isPast = iso < todayIso;
                    const dayKeys        = MEAL_TYPES.map(t => iso + '-' + t);
                    const allDaySelected = clearMode && dayKeys.every(k => selectedSlots.has(k));
                    return (
                      <th
                        key={i}
                        className={[
                          'cal-day-header',
                          hasAnyMeals     ? 'col-in-plan'      : '',
                          iso === todayIso ? 'today'            : '',
                          isPast          ? 'past'             : '',
                          applyAllMode && !isPast ? 'apply-target'   : '',
                          clearMode       ? 'clear-mode-header' : '',
                          allDaySelected  ? 'day-all-selected'  : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          if (applyAllMode && !isPast) handleApplyAllToDay(date);
                          else if (clearMode)          toggleDaySelection(iso);
                        }}
                        style={(applyAllMode && !isPast) || clearMode ? { cursor: 'pointer' } : undefined}
                      >
                        <span className="day-name">{dayName(date).slice(0, 3)}</span>
                        <span className="day-date">{toShort(date)}</span>
                        {iso === todayIso && <span className="today-arrow">&#9660;</span>}
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
                      const iso    = toISO(date);
                      const key    = iso + '-' + type;
                      const slot   = slotMap[key];
                      const isPast = iso < todayIso;
                      const isOver     = dragOver === key;
                      const isSelected = clearMode && selectedSlots.has(key);
                      return (
                        <td
                          key={di}
                          className={[
                            'cal-slot',
                            hasAnyMeals ? 'col-in-plan' : '',
                            slot   ? 'has-meal'   : 'empty',
                            isPast ? 'past-slot'  : '',
                            isOver && !isPast ? 'drag-over' : '',
                            selectedRecipe && !isPast ? 'click-target' : '',
                            isSelected ? 'slot-clear-selected' : '',
                          ].filter(Boolean).join(' ')}
                          onDragOver={e => { if (!isPast && !clearMode) { e.preventDefault(); setDragOver(key); } }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={e => { if (!isPast && !clearMode) handleDrop(e, iso, type); }}
                          onClick={e => {
                            if (clearMode)                       { toggleSlotSelection(key); return; }
                            if (selectedRecipe && !isPast)       handleSlotClick(iso, type, e);
                          }}
                          style={(selectedRecipe && !isPast) || clearMode ? { cursor: 'crosshair' } : undefined}
                        >
                          {slot ? (
                            <div
                              className={'slot-content' + (slot.isCooked ? ' slot-cooked' : '')}
                              draggable={!isPast && !slot.isCooked && !clearMode}
                              onDragStart={!isPast && !slot.isCooked && !clearMode
                                ? e => handleSlotDragStart(e, iso, type)
                                : undefined}
                            >
                              {slot.isCooked && <span className="slot-cooked-badge">&#10003; Cooked</span>}
                              <span className="slot-title">{slot.title}</span>
                              {!isPast && !slot.isCooked && !clearMode && (
                                <div className="slot-actions">
                                  <button className="btn-cook-slot" title="Mark as cooked" onClick={e => handleMarkCooked(iso, type, e)}>Cook</button>
                                  <button className="btn-remove-slot" title="Remove" onClick={e => handleRemove(iso, type, e)}>&#215;</button>
                                </div>
                              )}
                            </div>
                          ) : !isPast ? (
                            <span className="slot-drop-hint">
                              {clearMode ? '' : selectedRecipe ? 'Click to place' : 'Drop here'}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!clearMode && (
            <p className="mp-drag-hint">
              Drag recipes into the calendar, or <strong>double-click</strong> a recipe to select it then click a slot to place it.
            </p>
          )}

          {/* Recipe list */}
          {!clearMode && (
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
                  const isSelected = selectedRecipe?.recipeId === recipe.recipe_id;
                  return (
                    <div
                      key={recipe.recipe_id}
                      className={'mp-recipe-card' + (isSelected ? ' recipe-selected' : '')}
                      draggable
                      onDragStart={e => handleDragStart(e, recipe, null)}
                      onDoubleClick={() => handleRecipeSelect(recipe)}
                      title="Double-click to select, then click a calendar slot to place"
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
          )}
        </div>
      )}

      {/* ── NUTRITION TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (() => {
        function sumNut(meals) {
          return meals.reduce((a, m) => ({
            calories: a.calories + (m.nutrition?.calories || 0),
            protein:  a.protein  + (m.nutrition?.protein  || 0),
            carbs:    a.carbs    + (m.nutrition?.carbs     || 0),
            fat:      a.fat      + (m.nutrition?.fat       || 0),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
        function buildSlices(totals) {
          const pc = totals.protein * 4;
          const cc = totals.carbs   * 4;
          const fc = totals.fat     * 9;
          const t  = pc + cc + fc || 1;
          return [
            { label: 'Protein', pct: (pc / t) * 100, color: '#4caf8c', grams: Math.round(totals.protein) },
            { label: 'Carbs',   pct: (cc / t) * 100, color: '#5a4fcf', grams: Math.round(totals.carbs)   },
            { label: 'Fat',     pct: (fc / t) * 100, color: '#e8a050', grams: Math.round(totals.fat)     },
          ];
        }
        const allSlots    = Object.values(slotMap);
        const cookedSlots = allSlots.filter(s => s.isCooked);
        const cookedTotal = sumNut(cookedSlots);
        const planTotal   = sumNut(allSlots);
        const cookedSlices = buildSlices(cookedTotal);
        const planSlices   = buildSlices(planTotal);
        const hasPlanData   = allSlots.length > 0 && planTotal.calories > 0;
        const hasCookedData = cookedSlots.length > 0 && cookedTotal.calories > 0;
        const nutDays = weekDays.map(date => {
          const iso  = toISO(date);
          const meals = MEAL_TYPES
            .map(type => { const s = slotMap[iso + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {}, isCooked: s.isCooked } : null; })
            .filter(Boolean);
          const total = sumNut(meals.map(m => ({ nutrition: m.nutrition })));
          return { date, iso, isToday: iso === todayIso, isPast: iso < todayIso, meals, total };
        });
        return (
          <div className="mp-tab-content">
            <div className="nut-dual-row">
              <div className="nut-chart-card">
                <div className="nut-chart-header">
                  <h3 className="nut-chart-title">Cooked So Far</h3>
                  <span className="nut-chart-sub">{cookedSlots.length} meal{cookedSlots.length !== 1 ? 's' : ''} cooked this week</span>
                </div>
                <DonutChart slices={cookedSlices} centerLabel={hasCookedData ? Math.round(cookedTotal.calories) : '\u2013'} centerSub="kcal" />
                {hasCookedData ? (
                  <div className="nut-chart-legend">
                    {cookedSlices.map(s => (
                      <div key={s.label} className="nut-legend-row">
                        <span className="nut-legend-dot" style={{ background: s.color }} />
                        <span className="nut-legend-lbl">{s.label}</span>
                        <span className="nut-legend-val">{s.grams}g</span>
                        <span className="nut-legend-pct">{Math.round(s.pct)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="nut-chart-empty">Mark meals as cooked to track progress</p>
                )}
              </div>
              <div className="nut-chart-card">
                <div className="nut-chart-header">
                  <h3 className="nut-chart-title">This Week&rsquo;s Plan</h3>
                  <span className="nut-chart-sub">{allSlots.length} meal{allSlots.length !== 1 ? 's' : ''} planned</span>
                </div>
                <DonutChart slices={planSlices} centerLabel={hasPlanData ? Math.round(planTotal.calories) : '\u2013'} centerSub="kcal" />
                {hasPlanData ? (
                  <div className="nut-chart-legend">
                    {planSlices.map(s => (
                      <div key={s.label} className="nut-legend-row">
                        <span className="nut-legend-dot" style={{ background: s.color }} />
                        <span className="nut-legend-lbl">{s.label}</span>
                        <span className="nut-legend-val">{s.grams}g</span>
                        <span className="nut-legend-pct">{Math.round(s.pct)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="nut-chart-empty">Add recipes with nutrition data to your plan</p>
                )}
              </div>
            </div>

            {allSlots.length > 0 && (
              <>
                <h3 className="nut-day-section-title">Daily Breakdown</h3>
                <div className="nut-days">
                  {nutDays.map(d => (
                    <div
                      key={d.iso}
                      className={['nut-day-row', !d.meals.length ? 'nut-day-empty' : '', d.isToday ? 'nut-day-today' : '', d.isPast && !d.meals.length ? 'nut-day-missed' : ''].filter(Boolean).join(' ')}
                    >
                      <div className="nut-day-head">
                        <span className="nut-day-name">{dayName(d.date).slice(0,3)} {toShort(d.date)}</span>
                        {d.meals.length > 0 ? (
                          <span className="nut-day-cal">{d.total.calories > 0 ? Math.round(d.total.calories) + ' kcal' : 'No calorie data'}</span>
                        ) : (
                          <span className="nut-day-status">{d.isPast ? 'Missed' : 'No meals yet'}</span>
                        )}
                      </div>
                      {d.meals.length > 0 && d.total.calories > 0 && (
                        <div className="nut-day-macros">
                          <span>P: {Math.round(d.total.protein)}g</span>
                          <span>C: {Math.round(d.total.carbs)}g</span>
                          <span>F: {Math.round(d.total.fat)}g</span>
                        </div>
                      )}
                      {d.meals.length > 0 && (
                        <div className="nut-day-meals">
                          {d.meals.map((m, i) => (
                            <span key={i} className={'nut-meal-tag nut-meal-tag--' + m.type + (m.isCooked ? ' cooked' : '')}>
                              {m.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {allSlots.length === 0 && (
              <div className="empty-state" style={{ marginTop: 24 }}>
                <p className="empty-state-title">No meals this week</p>
                <p className="empty-state-body">Add meals to your calendar to see nutrition data here.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TEMPLATES TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="mp-tab-content">
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
                  {Array.isArray(t.meals) && t.meals.length > 0 && (
                    <span className="template-meal-count">{t.meals.length} meal{t.meals.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="template-row-actions">
                  <button className="btn-ghost-sm" onClick={() => setViewTmplModal({ name: t.name, meals: t.meals || [] })}>View</button>
                  <button className="btn-primary-sm" onClick={() => handleLoadTemplate(t)}>Load</button>
                  <button className="btn-danger-sm" onClick={() => confirmDeleteTemplate(t.template_id, t.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVE TEMPLATE MODAL ──────────────────────────────────────────────── */}
      {saveTmplModal && (
        <div className="modal-overlay" onClick={() => !savingTemplate && setSaveTmplModal(false)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()} style={{ width: 'fit-content', minWidth: 420, maxWidth: '94vw' }}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">Save as Template</h2>
              <button className="mp-modal-close" onClick={() => setSaveTmplModal(false)} disabled={savingTemplate}>&#215;</button>
            </div>
            <p className="shop-modal-sub">Choose which days to include. Click to toggle · Drag chip-to-chip to range-select · Drag chip to reorder.</p>
            <input
              className="mp-save-tmpl-input"
              placeholder="Template name..."
              value={saveTmplName}
              onChange={e => setSaveTmplName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              style={{ marginBottom: 8 }}
            />

            {/* Day chip picker */}
            <div className="tmpl-day-picker" style={{ userSelect: 'none' }}>
              {saveTmplOrder.map((dayViewIdx, posIdx) => {
                const date      = weekDays[dayViewIdx];
                const iso       = toISO(date);
                const mealCount = MEAL_TYPES.filter(t => slotMap[iso + '-' + t]).length;
                const inDrag    = saveTmplDragRange && posIdx >= saveTmplDragRange.lo && posIdx <= saveTmplDragRange.hi;
                return (
                  <div
                    key={dayViewIdx}
                    className={[
                      'tmpl-day-chip',
                      saveTmplDays.has(dayViewIdx) ? 'selected' : '',
                      inDrag                        ? 'drag-highlight' : '',
                      mealCount === 0               ? 'no-meals' : '',
                      saveTmplSwapRef.current.dragIdx === posIdx ? 'swapping' : '',
                    ].filter(Boolean).join(' ')}
                    draggable
                    onDragStart={(e => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(posIdx));
                      saveTmplSwapRef.current = { active: true, dragIdx: posIdx };
                    })}
                    onDragOver={(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; })}
                    onDrop={(e => {
                      e.preventDefault();
                      const fromPos = Number(e.dataTransfer.getData('text/plain'));
                      if (fromPos === posIdx) return;
                      setSaveTmplOrder(prev => {
                        const next = [...prev];
                        const [moved] = next.splice(fromPos, 1);
                        next.splice(posIdx, 0, moved);
                        return next;
                      });
                      saveTmplSwapRef.current = { active: false, dragIdx: null };
                    })}
                    onMouseDown={(e => {
                      e.preventDefault();
                      saveTmplDragRef.current = { active: true, start: posIdx, end: posIdx };
                      setSaveTmplDragRange({ lo: posIdx, hi: posIdx });
                    })}
                    onMouseEnter={(() => {
                      if (!saveTmplDragRef.current.active) return;
                      saveTmplDragRef.current.end = posIdx;
                      const lo = Math.min(saveTmplDragRef.current.start, posIdx);
                      const hi = Math.max(saveTmplDragRef.current.start, posIdx);
                      setSaveTmplDragRange({ lo, hi });
                    })}
                  >
                    <span className="tmpl-day-chip-name">{dayName(date).slice(0, 3)}</span>
                    <span className="tmpl-day-chip-date">{toShort(date)}</span>
                    {mealCount > 0 ? (
                      <span className="tmpl-day-chip-count">{mealCount} meal{mealCount !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="tmpl-day-chip-empty">empty</span>
                    )}
                  </div>
                );
              })}

            </div>

            <div className="shop-modal-footer">
              <button className="btn-ghost-sm" onClick={() => setSaveTmplModal(false)} disabled={savingTemplate}>Cancel</button>
              <button className="btn-primary-sm" onClick={handleSaveTemplate} disabled={savingTemplate || !saveTmplDays.size}>
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOAD TEMPLATE MODAL ──────────────────────────────────────────────── */}
      {loadTmplModal && (
        <div className="modal-overlay" onClick={() => !loadTmplWorking && setLoadTmplModal(null)}>
          <div className="shop-modal tmpl-load-modal" onClick={e => e.stopPropagation()}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">Load: {loadTmplModal.name}</h2>
              <button className="mp-modal-close" onClick={() => setLoadTmplModal(null)} disabled={loadTmplWorking}>&#215;</button>
            </div>

            <div className="tmpl-load-date-row">
              <label className="shop-modal-sub" style={{ display: 'block', marginBottom: 6 }}>Starting date</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  className="form-input"
                  value={loadTmplStartDate}
                  onChange={e => handleLoadTmplDateChange(e.target.value)}
                  style={{ flex: 1 }}
                />
                {loadTmplStartDate !== toISO(today0()) && (
                  <button className="btn-today" onClick={() => handleLoadTmplDateChange(toISO(today0()))}>Today</button>
                )}
              </div>
              {loadTmplStartDate && loadTmplArrangement.length > 0 && (
                <p className="shop-modal-sub" style={{ marginTop: 6 }}>
                  Fills: <strong>
                    {toShort(new Date(loadTmplStartDate + 'T00:00:00'))} &ndash; {toShort(addDays(new Date(loadTmplStartDate + 'T00:00:00'), loadTmplArrangement.length - 1))}
                  </strong>
                </p>
              )}
            </div>

            {/* Conflict calendar with drag-to-reorder */}
            {loadTmplStartDate && loadTmplArrangement.length > 0 && (
              <div className="tmpl-conflict-calendar">
                {loadTmplConflicts.size > 0 && (
                  <p className="shop-modal-sub" style={{ marginBottom: 8 }}>
                    <span className="tmpl-conflict-badge" style={{ marginRight: 4 }}>&#9888;</span>
                    {loadTmplConflicts.size} date{loadTmplConflicts.size !== 1 ? 's' : ''} will be overwritten. Drag days to reorder if needed.
                  </p>
                )}
                <div className="tmpl-arrange-list">
                  {loadTmplArrangement.map((slot, idx) => {
                    const dateISO   = loadTmplStartDate ? toISO(addDays(new Date(loadTmplStartDate + 'T00:00:00'), idx)) : null;
                    const slotDate  = dateISO ? new Date(dateISO + 'T00:00:00') : null;
                    const hasConflict = dateISO && loadTmplConflicts.has(dateISO);
                    return (
                      <div
                        key={idx}
                        className={['tmpl-slot', loadTmplDragIdx === idx ? 'tmpl-slot--dragging' : '', hasConflict ? 'tmpl-slot--conflict' : ''].filter(Boolean).join(' ')}
                        draggable
                        onDragStart={() => setLoadTmplDragIdx(idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (loadTmplDragIdx === null || loadTmplDragIdx === idx) { setLoadTmplDragIdx(null); return; }
                          const arr = [...loadTmplArrangement];
                          [arr[loadTmplDragIdx], arr[idx]] = [arr[idx], arr[loadTmplDragIdx]];
                          setLoadTmplArrangement(arr);
                          if (loadTmplStartDate) setLoadTmplConflicts(computeLoadConflicts(loadTmplStartDate, arr));
                          setLoadTmplDragIdx(null);
                        }}
                        onDragEnd={() => setLoadTmplDragIdx(null)}
                      >
                        <div className="tmpl-slot-handle">&#8942;&#8942;</div>
                        <div className="tmpl-slot-date-col">
                          {slotDate && (
                            <>
                              <span className="tmpl-slot-dow">{slotDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className="tmpl-slot-mday">{toShort(slotDate)}</span>
                              {hasConflict && <span className="tmpl-conflict-badge">&#9888;</span>}
                            </>
                          )}
                        </div>
                        <div className="tmpl-slot-body">
                          {slot ? (
                            slot.meals.map((m, mi) => (
                              <div key={mi} className="tmpl-slot-meal">
                                <span className={'nut-meal-tag nut-meal-tag--' + m.meal_type}>
                                  {MEAL_LABELS[m.meal_type] || m.meal_type}
                                </span>
                                <span className="tmpl-slot-recipe">{m.recipe_title || ('Recipe #' + m.recipe_id)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="tmpl-slot-empty">No meals assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {loadTmplArrangement.length === 0 && (
              <p className="shop-modal-sub" style={{ padding: '8px 0 12px' }}>This template has no meals.</p>
            )}

            <div className="shop-modal-footer">
              <button className="btn-ghost-sm" onClick={() => setLoadTmplModal(null)} disabled={loadTmplWorking}>Cancel</button>
              <button
                className="btn-primary-sm"
                onClick={confirmLoadTemplate}
                disabled={loadTmplWorking || !loadTmplStartDate || !loadTmplArrangement.length}
              >
                {loadTmplWorking ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW TEMPLATE MODAL ──────────────────────────────────────────────── */}
      {viewTmplModal && (
        <div className="modal-overlay" onClick={() => setViewTmplModal(null)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">{viewTmplModal.name}</h2>
              <button className="mp-modal-close" onClick={() => setViewTmplModal(null)}>&#215;</button>
            </div>
            {viewTmplModal.meals.length === 0 ? (
              <p className="shop-modal-sub" style={{ padding: '16px 0' }}>This template has no meals.</p>
            ) : (
              <div className="view-tmpl-body">
                {(() => {
                  const groups = {};
                  for (const m of viewTmplModal.meals) {
                    const idx = m.day_index ?? 0;
                    if (!groups[idx]) groups[idx] = [];
                    groups[idx].push(m);
                  }
                  return Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(idx => (
                    <div key={idx} className="view-tmpl-day">
                      <div className="view-tmpl-day-name">Day {Number(idx) + 1}</div>
                      {groups[idx].map((m, i) => (
                        <div key={i} className="view-tmpl-meal">
                          <span className={'nut-meal-tag nut-meal-tag--' + m.meal_type}>{MEAL_LABELS[m.meal_type] || m.meal_type}</span>
                          <span className="view-tmpl-recipe">{m.recipe_title || ('Recipe #' + m.recipe_id)}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
            <div className="shop-modal-footer">
              <button className="btn-primary-sm" onClick={() => setViewTmplModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHOPPING MODAL ───────────────────────────────────────────────────── */}
      {shopModal && (
        <div className="modal-overlay" onClick={() => setShopModal(false)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">Generate Shopping List</h2>
              <button className="mp-modal-close" onClick={() => setShopModal(false)}>&#215;</button>
            </div>
            <p className="shop-modal-sub">
              Select the ingredients you need to buy, then generate your shopping list.
            </p>
            {shopLoading && <p className="shop-modal-loading">Loading missing ingredients...</p>}
            {!shopLoading && shopItems.length === 0 && (
              <p className="shop-modal-empty">Your pantry covers everything in this plan!</p>
            )}
            {shopItems.length > 0 && (
              <div className="shop-modal-items">
                {shopItems.map((item, idx) => (
                  <div key={idx} className={'shop-modal-item' + (item.is_checked ? ' checked' : '')}>
                    <label className="shop-modal-check" onClick={() => toggleShopItem(idx)}>
                      <div className={'sl-checkbox' + (item.is_checked ? ' ticked' : '')}>
                        {item.is_checked && '\u2713'}
                      </div>
                      <span className={'shop-item-name' + (item.is_checked ? ' struck' : '')}>{item.ingredient_name}</span>
                      {item.quantity && <span className="shop-item-qty">Need: {item.quantity}</span>}
                      {item.pantry_display && item.pantry_display !== '0' && <span className="shop-item-have">Have: {item.pantry_display}</span>}
                    </label>
                  </div>
                ))}
              </div>
            )}
            {shopItems.length > 0 && (
              <div className="shop-modal-footer">
                <span className="shop-selected-count">
                  {shopItems.filter(i => i.is_checked).length} / {shopItems.length} selected
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
          cancelLabel={confirmAction.cancelLabel   || 'Cancel'}
          onConfirm={confirmAction.onConfirm}
          onCancel={confirmAction.onCancel || (() => setConfirmAction(null))}
        />
      )}
    </div>
  );
}
