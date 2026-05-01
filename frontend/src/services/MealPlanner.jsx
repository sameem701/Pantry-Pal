import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { searchIngredients } from '../api/PantryApi';
import {
  createMealPlan, getMealPlan, clearMealPlan,
  upsertMeal, removeMeal, markMealCooked,
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
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// Groups template meals by day and builds an ordered slot array spanning min→max used day.
function buildTmplArrangement(meals) {
  const groups = {};
  for (const m of (meals || [])) {
    if (!groups[m.day_of_week]) groups[m.day_of_week] = [];
    groups[m.day_of_week].push(m);
  }
  const usedDays = Object.keys(groups);
  if (!usedDays.length) return [];
  const indices = usedDays.map(d => DAY_ORDER.indexOf(d)).filter(i => i >= 0);
  const minIdx  = Math.min(...indices);
  const maxIdx  = Math.max(...indices);
  const slots = [];
  for (let i = minIdx; i <= maxIdx; i++) {
    const day = DAY_ORDER[i];
    slots.push(groups[day] ? { day, meals: groups[day] } : null);
  }
  return slots;
}
function toISO(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function dayName(d) { return d.toLocaleDateString('en-US', { weekday: 'long' }); }
function planKey(d) { return 'pantrypal_plan_' + toISO(d); }
function fmtRange(s) {
  const e = addDays(s, 6);
  return toShort(s) + ' - ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// planWeekStart can be any day — meals are placed by matching day name within the 7-day window
function buildSlotMap(meals, planWeekStart, planId) {
  // Build a lookup: day name -> date, for each of the 7 days in this plan's window
  const dayToDate = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(planWeekStart, i);
    dayToDate[dayName(d)] = d;
  }
  const map = {};
  for (const m of (meals || [])) {
    const slotDate = dayToDate[m.day_of_week];
    if (!slotDate) continue;
    const iso = toISO(slotDate);
    map[iso + '-' + m.meal_type] = {
      title:     m.recipe_title || m.recipe_name || ('Recipe #' + m.recipe_id),
      recipeId:  m.recipe_id,
      isCooked:  m.is_cooked || false,
      dayOfWeek: m.day_of_week,
      planId:    planId || null,
      nutrition: {
        calories: m.calories   || 0,
        protein:  m.protein_g  || m.protein || 0,
        carbs:    m.carbs_g    || m.carbs   || 0,
        fat:      m.fat_g      || m.fat     || 0,
      },
    };
  }
  return map;
}

/* SVG donut chart: slices = [{pct, color, label}], pcts should sum to ~100 */
function DonutChart({ slices, centerLabel, centerSub }) {
  const R            = 46;
  const STROKE       = 13;
  const SIZE         = 120;
  const CX = SIZE / 2, CY = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const hasData = slices.some(s => s.pct > 0.5);
  let accumulated = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* background ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0ebe5" strokeWidth={STROKE} />
      {hasData && slices.filter(s => s.pct > 0.5).map((s, i) => {
        const dash       = (s.pct / 100) * circumference;
        const dashoffset = circumference * 0.25 - accumulated;
        accumulated += dash;
        return (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
          />
        );
      })}
      {centerLabel != null && (
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="14" fontWeight="700"
              fill="#1a1a2e" fontFamily="sans-serif">
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text x={CX} y={CY + 19} textAnchor="middle" fontSize="9" fill="#888"
              fontFamily="sans-serif">
          {centerSub}
        </text>
      )}
    </svg>
  );
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

  const [planId,         setPlanId]         = useState(null);
  const [planId2,        setPlanId2]        = useState(null); // overflow week plan
  const planCacheRef = useRef({});           // { isoMonday: planId } – stale-closure-safe
  const [reloadTrigger,  setReloadTrigger]  = useState(0);   // force reload after template apply
  const [slotMap,        setSlotMap]        = useState({});
  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState('calendar');
  const [isDirty,      setIsDirty]      = useState(false);   // unsaved calendar changes
  const [pendingTab,   setPendingTab]   = useState(null);    // tab clicked while dirty
  const [nutViewDate,  setNutViewDate]  = useState(() => today0()); // nutrition date nav

  const [dragOver,     setDragOver]     = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [suggestionOptions, setSuggestionOptions] = useState([]); // [{option_number, meals:[]}]
  const [activeSuggOption,  setActiveSuggOption]  = useState(0);  // index into suggestionOptions
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

  // ── click-to-assign (double-click to select, click slot to place) ────────
  const [selectedRecipe, setSelectedRecipe] = useState(null); // { recipeId, title, nutrition }

  // ── load template modal ──────────────────────────────────────────────────
  const [loadTmplModal,       setLoadTmplModal]       = useState(null); // { template_id, name }
  const [loadTmplWeekStart,   setLoadTmplWeekStart]   = useState('');
  const [loadTmplWorking,     setLoadTmplWorking]     = useState(false);
  const [loadTmplExisting,    setLoadTmplExisting]    = useState(false);
  const [loadTmplConflictDays, setLoadTmplConflictDays] = useState([]); // days with conflicts

  // ── view template modal ──────────────────────────────────────────────────
  const [viewTmplModal, setViewTmplModal] = useState(null); // { name, meals: [...] }

  // ── week-nudge: shown once after the user creates their first meal in a new plan ──
  const [showWeekNudge, setShowWeekNudge] = useState(false);

  // ── template load arrangement (drag-and-drop day reorder) ────────────────
  const [tmplArrangement, setTmplArrangement] = useState([]); // [{ day, meals }|null]
  const [tmplDragIdx,     setTmplDragIdx]     = useState(null);

  // ── plan tracking ─────────────────────────────────────────────────────────
  // startISO = first visible day; endISO = last visible day (startDate + 6)
  // Any plan whose [week_start, week_start+6] overlaps [startISO, endISO] is loaded.
  const startISO = toISO(startDate);
  const endISO   = toISO(addDays(startDate, 6));

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSlotMap({});
    setSuggestions([]);
    setPlanId(null);
    setPlanId2(null);
    planCacheRef.current = {};
    setLoading(true);

    (async () => {
      const merged   = {};
      let newPlanId  = null;
      let newPlanId2 = null;

      // Scan localStorage for all plans overlapping [startISO, endISO]
      const overlapping = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith('pantrypal_plan_')) continue;
        const iso = k.replace('pantrypal_plan_', '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
        const planEndISO = toISO(addDays(new Date(iso + 'T00:00:00'), 6));
        if (iso <= endISO && planEndISO >= startISO) {
          overlapping.push({ weekStartISO: iso, storedId: Number(localStorage.getItem(k)) });
        }
      }
      overlapping.sort((a, b) => a.weekStartISO.localeCompare(b.weekStartISO));

      for (const { weekStartISO, storedId } of overlapping) {
        if (cancelled) break;
        try {
          const data = await getMealPlan(storedId, userId);
          if (!cancelled) {
            const ws = data.week_start
              ? new Date(data.week_start + 'T00:00:00')
              : new Date(weekStartISO + 'T00:00:00');
            Object.assign(merged, buildSlotMap(data.meals || data.data || [], ws, storedId));
            planCacheRef.current[weekStartISO] = storedId;
            if (!newPlanId)        { newPlanId  = storedId; }
            else if (!newPlanId2)  { newPlanId2 = storedId; }
          }
        } catch { localStorage.removeItem('pantrypal_plan_' + weekStartISO); }
      }

      if (!cancelled) {
        setPlanId(newPlanId);
        setPlanId2(newPlanId2);
        setSlotMap(merged);
        setLoading(false);
      }
    })();

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
  // ±1 day: shift view freely
  // << / >> : jump to previous / next meal plan start (any day)
  function getStoredPlanStarts() {
    const starts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pantrypal_plan_')) {
        const iso = k.replace('pantrypal_plan_', '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) starts.push(iso);
      }
    }
    return starts.sort();
  }

  const allPlanStarts  = getStoredPlanStarts();
  const nextPlanStart  = allPlanStarts.find(s => s > endISO)            || null;
  const prevPlanStart  = [...allPlanStarts].reverse().find(s => s < startISO) || null;

  function nav(days) {
    setStartDate(d => addDays(d, days));
    setActiveTab('calendar');
    setIsDirty(false);
    setShowWeekNudge(false);
  }

  function navToPlan(isoMonday) {
    if (!isoMonday) return;
    setStartDate(new Date(isoMonday + 'T00:00:00'));
    setActiveTab('calendar');
    setIsDirty(false);
    setShowWeekNudge(false);
  }

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
          for (const [, pid] of Object.entries(planCacheRef.current)) {
            await clearMealPlan(pid, userId);
          }
          setSlotMap({});
          addToast('Week cleared.', 'success');
        } catch (err) {
          addToast(err.message || 'Failed to clear', 'error');
        } finally { setLoading(false); }
      },
    });
  }

  // ── lazy plan creation: get/create the plan covering a specific date ───────────
  // If an existing cached plan covers the date, returns its ID.
  // Otherwise creates a new plan with week_start = startDate (the current view start).
  async function getOrCreatePlanForDate(date) {
    const dateISO = toISO(date || startDate);
    // Check if any cached plan already covers this date
    for (const [wsISO, pid] of Object.entries(planCacheRef.current)) {
      const planEndISO = toISO(addDays(new Date(wsISO + 'T00:00:00'), 6));
      if (dateISO >= wsISO && dateISO <= planEndISO) return pid;
    }
    // No existing plan covers this date — create one with week_start = startDate
    const weekStartISO = startISO;
    const created = await createMealPlan(userId, weekStartISO);
    const newId   = created.plan_id;
    localStorage.setItem(planKey(startDate), String(newId));
    planCacheRef.current[weekStartISO] = newId;
    setPlanId(newId);
    setShowWeekNudge(true);
    return newId;
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

  // date: the actual Date object of the slot being dragged from
  function handleSlotDragStart(e, date, day, type) {
    const key  = toISO(date) + '-' + type;
    const slot = slotMap[key];
    if (!slot) return;
    e.dataTransfer.setData('application/json', JSON.stringify({
      recipeId:      slot.recipeId,
      title:         slot.title,
      nutrition:     slot.nutrition || {},
      sourceKey:     key,       // ISO-date key for slotMap lookup
      sourceDayName: day,       // day name ("Monday" etc.) for DB operations
      sourceType:    type,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  // date: the actual Date object of the drop target
  async function handleDrop(e, day, type, date) {
    e.preventDefault();
    setDragOver(null);
    try {
      const data       = JSON.parse(e.dataTransfer.getData('application/json'));
      const targetKey  = toISO(date) + '-' + type;
      const existing   = slotMap[targetKey];
      const targetPid  = await getOrCreatePlanForDate(date);
      const sourcePid  = data.sourceKey ? (slotMap[data.sourceKey]?.planId || targetPid) : targetPid;

      if (existing && data.sourceKey && data.sourceKey !== targetKey) {
        // Swap: put existing into source slot, dragged recipe into target
        const srcDay     = data.sourceDayName || day;
        const srcType    = data.sourceType    || type;
        const existPid   = existing.planId || targetPid;
        await upsertMeal(sourcePid, userId, existing.recipeId, srcDay, srcType);
        await upsertMeal(existPid,  userId, data.recipeId, day, type);
        setSlotMap(prev => ({
          ...prev,
          [data.sourceKey]: { ...existing, dayOfWeek: srcDay, planId: sourcePid },
          [targetKey]:      { title: data.title, recipeId: data.recipeId, isCooked: false, dayOfWeek: day, planId: existPid, nutrition: data.nutrition || {} },
        }));
        addToast('Meals swapped!', 'success');
      } else {
        await upsertMeal(targetPid, userId, data.recipeId, day, type);
        if (data.sourceKey && data.sourceKey !== targetKey) {
          const srcDay  = data.sourceDayName || day;
          const srcType = data.sourceType    || type;
          await removeMeal(sourcePid, userId, srcDay, srcType);
          setSlotMap(prev => {
            const n = { ...prev };
            delete n[data.sourceKey];
            n[targetKey] = { title: data.title, recipeId: data.recipeId, isCooked: false, dayOfWeek: day, planId: targetPid, nutrition: data.nutrition || {} };
            return n;
          });
        } else {
          setSlotMap(prev => ({
            ...prev,
            [targetKey]: { title: data.title, recipeId: data.recipeId, isCooked: false, dayOfWeek: day, planId: targetPid, nutrition: data.nutrition || {} },
          }));
        }
        addToast('Added to ' + (MEAL_LABELS[type] || type), 'success');
        setIsDirty(true);
      }
    } catch (err) {
      addToast(err.message || 'Failed to add meal', 'error');
    }
  }

  async function handleRemove(date, day, type, e) {
    e && e.stopPropagation();
    const key  = toISO(date) + '-' + type;
    const slot = slotMap[key];
    const pid  = slot?.planId || planId;
    if (!pid) return;
    try {
      await removeMeal(pid, userId, day, type);
      setSlotMap(prev => { const n = { ...prev }; delete n[key]; return n; });
      setIsDirty(true);
    } catch (err) {
      addToast(err.message || 'Failed to remove', 'error');
    }
  }

  // ── suggestions ────────────────────────────────────────────────────────────
  async function handleSuggest() {
    setSuggestLoading(true);
    setSuggestions([]);
    setSuggestionOptions([]);
    setActiveSuggOption(0);
    try {
      const pid = await getOrCreatePlanForDate(startDate);
      const data = await suggestMeals(pid, userId, 3);
      // API returns { data: [ { option_number, meals: [...] }, ... ] }
      const optionData = Array.isArray(data?.data) ? data.data
                       : Array.isArray(data?.suggestions) ? data.suggestions
                       : Array.isArray(data) ? data : [];
      if (optionData.length > 0 && Array.isArray(optionData[0]?.meals)) {
        // Nested: [{option_number: 1, meals: [...]}, {option_number: 2, meals: [...]}, ...]
        setSuggestionOptions(optionData);
        setSuggestions(optionData[0]?.meals || []);
      } else {
        // Flat list — wrap as single option
        const flat = optionData;
        setSuggestionOptions([{ option_number: 1, meals: flat }]);
        setSuggestions(flat);
      }
      if (!optionData.length) addToast('No suggestions available at the moment.', 'info');
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
    // Find the date in the current 7-day view that matches this day name
    const slotDate = Array.from({length: 7}, (_, i) => addDays(startDate, i)).find(d => dayName(d) === day)
                     || startDate;
    const slotIso  = toISO(slotDate);
    try {
      const pid = await getOrCreatePlanForDate(slotDate);
      await upsertMeal(pid, userId, s.recipe_id, day, type);
      setSlotMap(prev => ({
        ...prev,
        [slotIso + '-' + type]: { title, recipeId: s.recipe_id, isCooked: false, dayOfWeek: day, planId: pid, nutrition: {} },
      }));
      setSuggestions(prev => prev.filter(x => x !== s));
      // Also remove from the active option
      setSuggestionOptions(prev => prev.map((opt, idx) =>
        idx === activeSuggOption
          ? { ...opt, meals: opt.meals.filter(x => x !== s) }
          : opt
      ));
      setIsDirty(true);
    } catch (err) {
      addToast(err.message || 'Failed to apply', 'error');
      throw err;
    }
  }

  async function handleApplyAllToDay(date) {
    if (!applyAllMode || !suggestions.length) return;
    setApplyAllMode(false);
    const day = dayName(date);
    const toApply = suggestions.slice(0, MEAL_TYPES.length).map((s, i) => ({
      ...s, day_of_week: day, meal_type: MEAL_TYPES[i],
    }));
    let successCount = 0;
    for (const s of toApply) {
      try { await applySuggestion(s); successCount++; }
      catch { /* error already toasted inside applySuggestion */ }
    }
    if (successCount > 0)
      addToast(successCount + ' suggestion' + (successCount !== 1 ? 's' : '') + ' applied to ' + day + '!', 'success');
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

  async function handleSlotClick(date, day, type, e) {
    e && e.stopPropagation();
    if (!selectedRecipe) return;
    const key = toISO(date) + '-' + type;
    try {
      const pid = await getOrCreatePlanForDate(date);
      await upsertMeal(pid, userId, selectedRecipe.recipeId, day, type);
      setSlotMap(prev => ({
        ...prev,
        [key]: { title: selectedRecipe.title, recipeId: selectedRecipe.recipeId, isCooked: false, dayOfWeek: day, planId: pid, nutrition: selectedRecipe.nutrition || {} },
      }));
      addToast('Added to ' + (MEAL_LABELS[type] || type), 'success');
      setIsDirty(true);
      setSelectedRecipe(null);
    } catch (err) {
      addToast(err.message || 'Failed to add meal', 'error');
    }
  }

  // ── mark meal as cooked ──────────────────────────────────────────────────
  async function handleMarkCooked(date, day, type, e) {
    e && e.stopPropagation();
    const key  = toISO(date) + '-' + type;
    const slot = slotMap[key];
    const pid  = slot?.planId || planId;
    if (!pid) return;
    try {
      await markMealCooked(pid, userId, day, type);
      setSlotMap(prev => ({
        ...prev,
        [key]: { ...prev[key], isCooked: true },
      }));
      addToast('Meal marked as cooked! Pantry updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to mark as cooked', 'error');
    }
  }

  // ── shopping modal ─────────────────────────────────────────────────────────
  async function openShopModal() {
    const activePlanId = planId || planId2;
    if (!activePlanId) return;
    setShopModal(true);
    setShopLoading(true);
    setShopItems([]);
    try {
      const data  = await getMissingIngredients(activePlanId, userId);
      const items = Array.isArray(data?.missing) ? data.missing
                  : Array.isArray(data?.data)    ? data.data
                  : Array.isArray(data)          ? data : [];
      setShopItems(items.map(i => ({
        ingredient_name: i.ingredient_name || i.name || '',
        // raw_breakdown shows total needed (e.g. "2 cups + 340 g"); pantry_display shows what user has
        quantity:       i.raw_breakdown || i.quantity || '',
        pantry_display: i.pantry_display || '',
        ingredient_id:  i.ingredient_id || null,
        is_checked: false,   // starts unchecked — user selects items they need to buy
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

  // ── nutrition (computed from slotMap) ──────────────────────────────────────
  function computeNutrition() {
    const days = weekDays.map(date => {
      const day    = dayName(date);
      const iso    = toISO(date);
      const isPast = iso < todayIso;
      const meals  = MEAL_TYPES
        .map(type => { const s = slotMap[iso + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {} } : null; })
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

  function handleGoToExistingPlan() {
    if (!loadTmplWeekStart) return;
    const d = new Date(loadTmplWeekStart + 'T00:00:00');
    setLoadTmplModal(null);
    setTmplArrangement([]);
    setActiveTab('calendar');
    setStartDate(d);
  }

  async function handleRemoveConflictingPlans() {
    if (!loadTmplWeekStart) return;
    setLoadTmplWorking(true);
    try {
      // loadTmplWeekStart is always a Monday — there is exactly one plan to clear
      const d      = new Date(loadTmplWeekStart + 'T00:00:00');
      const stored = localStorage.getItem(planKey(d));
      if (stored) {
        await clearMealPlan(Number(stored), userId);
      }
      setLoadTmplExisting(false);
      setLoadTmplConflictDays([]);
      addToast('Existing plan cleared. You can now apply the template.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to clear existing plan', 'error');
    } finally {
      setLoadTmplWorking(false);
    }
  }

  async function handleLoadTemplate(templateId, name) {
    const tmpl = templates.find(t => t.template_id === templateId);
    const meals = tmpl?.meals || [];
    setTmplArrangement(buildTmplArrangement(meals));
    // Default to today — template can start from any day the user picks.
    const defaultStart = toISO(today0());
    setLoadTmplWeekStart(defaultStart);
    const existingPlan = !!localStorage.getItem(planKey(today0()));
    setLoadTmplConflictDays([]);
    setLoadTmplExisting(existingPlan && Object.keys(slotMap).length > 0);
    setLoadTmplModal({ template_id: templateId, name });
  }

  function handleLoadTmplDateChange(iso) {
    if (!iso) { setLoadTmplWeekStart(''); return; }
    setLoadTmplWeekStart(iso);
    const d = new Date(iso + 'T00:00:00');
    const existingPlan = !!localStorage.getItem(planKey(d));
    setLoadTmplConflictDays([]);
    setLoadTmplExisting(existingPlan);
  }

  async function confirmLoadTemplate() {
    if (!loadTmplModal || !loadTmplWeekStart) return;
    setLoadTmplWorking(true);
    try {
      // week_start = the chosen date (any day the user picked)
      const chosenDate = new Date(loadTmplWeekStart + 'T00:00:00');
      const created    = await createMealPlan(userId, loadTmplWeekStart);
      const pid        = created.plan_id;
      localStorage.setItem(planKey(chosenDate), String(pid));
      planCacheRef.current[loadTmplWeekStart] = pid;

      // Each slot at index i maps to chosenDate + i; use the actual day name for that date
      for (let i = 0; i < tmplArrangement.length; i++) {
        const slot = tmplArrangement[i];
        if (!slot) continue;
        const slotDate = addDays(chosenDate, i);
        const dow      = dayName(slotDate);
        for (const meal of slot.meals) {
          await upsertMeal(pid, userId, meal.recipe_id, dow, meal.meal_type);
        }
      }

      const name = loadTmplModal.name;
      setLoadTmplModal(null);
      setTmplArrangement([]);
      setActiveTab('calendar');
      setStartDate(chosenDate);
      setReloadTrigger(t => t + 1);
      addToast('Template "' + name + '" applied starting ' + toShort(chosenDate) + '!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to load template', 'error');
    } finally {
      setLoadTmplWorking(false);
    }
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
    <div className={'mp-shell' + (applyAllMode ? ' apply-all-mode' : '') + (selectedRecipe ? ' click-assign-mode' : '')}>

      {/* Header */}
      <div className="mp-page-header">
        <div className="mp-page-title-row">
          <h1 className="mp-page-title">Plan &amp; Nutrition</h1>

          <div className="mp-date-nav">
            <div className="mp-nav-group">
              <button
                className="mp-nav-outer"
                onClick={() => navToPlan(prevPlanStart)}
                disabled={!prevPlanStart}
                title={prevPlanStart ? 'Previous meal plan (' + prevPlanStart + ')' : 'No earlier meal plans'}
              >&laquo;</button>
              <button className="mp-nav-inner" onClick={() => nav(-1)} title="Back 1 day">&lsaquo;</button>
            </div>

            <div className="week-nav-center">
              <span className="week-range">{fmtRange(startDate)}</span>
              {toISO(startDate) !== todayIso && (
                <button className="btn-today" onClick={() => setStartDate(today0())}>Today</button>
              )}
            </div>

            <div className="mp-nav-group">
              <button className="mp-nav-inner" onClick={() => nav(1)}  title="Forward 1 day">&rsaquo;</button>
              <button
                className="mp-nav-outer"
                onClick={() => navToPlan(nextPlanStart)}
                disabled={!nextPlanStart}
                title={nextPlanStart ? 'Next meal plan (' + nextPlanStart + ')' : 'No upcoming meal plans'}
              >&raquo;</button>
            </div>
          </div>
        </div>

        <div className="mp-toolbar">
          <button className="btn-suggest" onClick={handleSuggest} disabled={suggestLoading}>
            {suggestLoading ? 'Loading...' : 'Suggest Meals'}
          </button>
          {(planId || planId2) && (
            <>
              <button className="btn-primary-sm" onClick={openShopModal}>
                Shopping List
              </button>
              {isDirty && (
                <button className="btn-save-plan" onClick={handleSavePlan}>Save Plan</button>
              )}
              <button className="btn-danger-sm" onClick={confirmClear}>Clear Week</button>
            </>
          )}
        </div>
        {planId && activeTab === 'calendar' && <div className="mp-save-tmpl-row">
          <input
            className="mp-save-tmpl-input"
            placeholder="Save this week as a template..."
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
          />
          <button className="btn-ghost-sm" onClick={handleSaveTemplate} disabled={savingTemplate}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </button>
        </div>}

        {!(planId || planId2) && !loading && (
          <p className="mp-past-note">
            {toISO(addDays(startDate, 6)) < todayIso
              ? 'This is a past week with no saved meal plan.'
              : 'No plan yet for this week — drop or select a recipe to start one.'}
          </p>
        )}
      </div>

      {/* Week nudge banner — shown once when a new plan is first started */}
      {showWeekNudge && (
        <div className="week-nudge-banner">
          <span className="week-nudge-icon">📅</span>
          <div className="week-nudge-text">
            <strong>Plan started for {fmtRange(startDate)}</strong>
            <span>The highlighted days are all part of this week&rsquo;s plan &mdash; try to fill in all 7 days for the best meal prep experience!</span>
          </div>
          <button className="week-nudge-close" onClick={() => setShowWeekNudge(false)} title="Dismiss">×</button>
        </div>
      )}

      {/* Apply-all banner */}
      {applyAllMode && (
        <div className="apply-all-banner">
          Click on a day column in the calendar to apply all suggestions to that day.
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

      {/* Tabs — always visible so calendar shows even before a plan is created */}
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
                      onClick={() => {
                        setActiveSuggOption(idx);
                        setSuggestions(suggestionOptions[idx]?.meals || []);
                      }}
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
                      {s.day_of_week && <span className="chip-day">{s.day_of_week.slice(0,3)} · {MEAL_LABELS[s.meal_type] || s.meal_type}</span>}
                      <button
                        className="chip-apply"
                        title="Select to place in calendar"
                        onClick={() => handleRecipeSelect(s)}
                      >+</button>
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
                    const iso     = toISO(date);
                    const isPast  = iso < todayIso;
                    const dayMon  = toISO(date);
                    // Show a plan-start dot on whichever column is the start of a loaded plan
                    const isPlanStart = iso in planCacheRef.current;
                    return (
                      <th
                        key={i}
                        className={
                          'cal-day-header' +
                          ((planId || planId2) ? ' col-in-plan' : '') +
                          (iso === todayIso ? ' today' : '') +
                          (isPast ? ' past' : '') +
                          (applyAllMode && !isPast ? ' apply-target' : '')
                        }
                        onClick={() => applyAllMode && !isPast && handleApplyAllToDay(date)}
                        style={applyAllMode && !isPast ? { cursor: 'pointer' } : undefined}
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
                      const day     = dayName(date);
                      const iso     = toISO(date);
                      const key     = iso + '-' + type;
                      const slot    = slotMap[key];
                      const isPast  = iso < todayIso;
                      const isOver  = dragOver === key;
                      return (
                        <td
                          key={di}
                          className={[
                            'cal-slot',
                            (planId || planId2) ? 'col-in-plan' : '',
                            slot   ? 'has-meal' : 'empty',
                            isPast ? 'past-slot' : '',
                            isOver && !isPast ? 'drag-over' : '',
                            selectedRecipe && !isPast ? 'click-target' : '',
                          ].filter(Boolean).join(' ')}
                          onDragOver={e => { if (!isPast) { e.preventDefault(); setDragOver(key); } }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={e => { if (!isPast) handleDrop(e, day, type, date); }}
                          onClick={e => { if (selectedRecipe && !isPast) handleSlotClick(date, day, type, e); }}
                          style={selectedRecipe && !isPast ? { cursor: 'crosshair' } : undefined}
                        >
                          {slot ? (
                            <div
                              className={'slot-content' + (slot.isCooked ? ' slot-cooked' : '')}
                              draggable={!isPast && !slot.isCooked}
                              onDragStart={!isPast && !slot.isCooked ? e => handleSlotDragStart(e, date, day, type) : undefined}
                            >
                              {slot.isCooked && <span className="slot-cooked-badge">&#10003; Cooked</span>}
                              <span className="slot-title">{slot.title}</span>
                              {!isPast && !slot.isCooked && (
                                <div className="slot-actions">
                                  <button className="btn-cook-slot" title="Mark as cooked" onClick={e => handleMarkCooked(date, day, type, e)}>Cook</button>
                                  <button className="btn-remove-slot" title="Remove" onClick={e => handleRemove(date, day, type, e)}>×</button>
                                </div>
                              )}
                            </div>
                          ) : !isPast ? (
                            <span className="slot-drop-hint">{selectedRecipe ? 'Click to place' : 'Drop here'}</span>
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
            Drag recipes into the calendar, or <strong>double-click</strong> a recipe to select it then click a slot to place it.
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
        </div>
      )}

      {/* ── NUTRITION TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (() => {
        // ── helpers ────────────────────────────────────────────────────────────
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

        // ── data: cooked vs full plan ──────────────────────────────────────────
        const allSlots    = Object.values(slotMap);
        const cookedSlots = allSlots.filter(s => s.isCooked);
        const cookedTotal = sumNut(cookedSlots);
        const planTotal   = sumNut(allSlots);
        const cookedSlices = buildSlices(cookedTotal);
        const planSlices   = buildSlices(planTotal);

        const hasPlanData   = allSlots.length > 0 && planTotal.calories > 0;
        const hasCookedData = cookedSlots.length > 0 && cookedTotal.calories > 0;

        // ── per-day breakdown (current week's plan) ────────────────────────────
        const nutTodayIso = toISO(today0());
        const nutDays = weekDays.map(date => {
          const day  = dayName(date);
          const iso  = toISO(date);
          const meals = MEAL_TYPES
            .map(type => { const s = slotMap[iso + '-' + type]; return s ? { type, title: s.title, nutrition: s.nutrition || {}, isCooked: s.isCooked } : null; })
            .filter(Boolean);
          const total = sumNut(meals.map(m => ({ nutrition: m.nutrition })));
          return { date, day, iso, isToday: iso === nutTodayIso, isPast: iso < nutTodayIso, meals, total };
        });

        return (
          <div className="mp-tab-content">

            {/* ── Two donut charts ─────────────────────────────────────────── */}
            <div className="nut-dual-row">

              {/* Chart 1 — Cooked so far */}
              <div className="nut-chart-card">
                <div className="nut-chart-header">
                  <h3 className="nut-chart-title">Cooked So Far</h3>
                  <span className="nut-chart-sub">{cookedSlots.length} meal{cookedSlots.length !== 1 ? 's' : ''} cooked this week</span>
                </div>
                <DonutChart
                  slices={cookedSlices}
                  centerLabel={hasCookedData ? Math.round(cookedTotal.calories) : '–'}
                  centerSub="kcal"
                />
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

              {/* Chart 2 — Full week plan */}
              <div className="nut-chart-card">
                <div className="nut-chart-header">
                  <h3 className="nut-chart-title">This Week&rsquo;s Plan</h3>
                  <span className="nut-chart-sub">{allSlots.length} meal{allSlots.length !== 1 ? 's' : ''} planned</span>
                </div>
                <DonutChart
                  slices={planSlices}
                  centerLabel={hasPlanData ? Math.round(planTotal.calories) : '–'}
                  centerSub="kcal"
                />
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
                  <p className="nut-chart-empty">
                    {planId ? 'Add recipes with nutrition data to your plan' : 'No plan for this week yet'}
                  </p>
                )}
              </div>
            </div>

            {/* ── Per-day breakdown ─────────────────────────────────────────── */}
            {(allSlots.length > 0) && (
              <>
                <h3 className="nut-day-section-title">Daily Breakdown</h3>
                <div className="nut-days">
                  {nutDays.map(d => (
                    <div
                      key={d.iso}
                      className={[
                        'nut-day-row',
                        !d.meals.length ? 'nut-day-empty' : '',
                        d.isToday ? 'nut-day-today' : '',
                        d.isPast && !d.meals.length ? 'nut-day-missed' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="nut-day-head">
                        <span className="nut-day-name">{d.day.slice(0, 3)} {toShort(d.date)}</span>
                        {d.meals.length > 0 ? (
                          <span className="nut-day-cal">
                            {d.total.calories > 0 ? Math.round(d.total.calories) + ' kcal' : 'No calorie data'}
                          </span>
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

            {!planId && (
              <div className="empty-state" style={{ marginTop: 24 }}>
                <p className="empty-state-title">No plan this week</p>
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
                  <button className="btn-primary-sm" onClick={() => handleLoadTemplate(t.template_id, t.name)}>Load</button>
                  <button className="btn-danger-sm" onClick={() => confirmDeleteTemplate(t.template_id, t.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOAD TEMPLATE MODAL ─────────────────────────────────────────────── */}
      {loadTmplModal && (
        <div className="modal-overlay" onClick={() => !loadTmplWorking && setLoadTmplModal(null)}>
          <div className="shop-modal tmpl-load-modal" onClick={e => e.stopPropagation()}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">Load: {loadTmplModal.name}</h2>
              <button className="mp-modal-close" onClick={() => setLoadTmplModal(null)} disabled={loadTmplWorking}>×</button>
            </div>

            {/* Date picker row */}
            <div className="tmpl-load-date-row">
              <label className="shop-modal-sub" style={{ display: 'block', marginBottom: 6 }}>
                Starting date (template fills 7 days from this date)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  className="form-input"
                  value={loadTmplWeekStart}
                  onChange={e => handleLoadTmplDateChange(e.target.value)}
                  style={{ flex: 1 }}
                />
                {loadTmplWeekStart !== toISO(today0()) && (
                  <button className="btn-today" onClick={() => handleLoadTmplDateChange(toISO(today0()))}>Today</button>
                )}
              </div>
              {loadTmplWeekStart && (
                <p className="shop-modal-sub" style={{ marginTop: 6 }}>
                  Fills: <strong>
                    {toShort(new Date(loadTmplWeekStart + 'T00:00:00'))} &ndash; {
                      toShort(addDays(new Date(loadTmplWeekStart + 'T00:00:00'), 6))
                    }, {new Date(loadTmplWeekStart + 'T00:00:00').getFullYear()}
                  </strong>
                </p>
              )}
              {loadTmplExisting && (
                <div className="tmpl-conflict-box" style={{ marginTop: 8 }}>
                  <span className="tmpl-conflict-msg">⚠️ A meal plan already exists for some of these days.</span>
                  <div className="tmpl-conflict-actions">
                    <button className="btn-ghost-sm" onClick={handleGoToExistingPlan} disabled={loadTmplWorking}>
                      Go to existing plan
                    </button>
                    <button className="btn-danger-sm" onClick={handleRemoveConflictingPlans} disabled={loadTmplWorking}>
                      Remove existing plan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Day arrangement */}
            {tmplArrangement.length > 0 && (
              <>
                <p className="tmpl-arrange-hint">
                  Drag days to reorder. The date for each slot updates automatically.
                </p>
                <div className="tmpl-arrange-list">
                  {tmplArrangement.map((slot, idx) => {
                    // Show actual date: chosenDate + slot index (positional)
                    const slotDate = loadTmplWeekStart && slot
                      ? addDays(new Date(loadTmplWeekStart + 'T00:00:00'), idx)
                      : loadTmplWeekStart
                        ? addDays(new Date(loadTmplWeekStart + 'T00:00:00'), idx)
                        : null;
                    return (
                      <div
                        key={idx}
                        className={`tmpl-slot${tmplDragIdx === idx ? ' tmpl-slot--dragging' : ''}`}
                        draggable
                        onDragStart={() => setTmplDragIdx(idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (tmplDragIdx === null || tmplDragIdx === idx) { setTmplDragIdx(null); return; }
                          const arr = [...tmplArrangement];
                          [arr[tmplDragIdx], arr[idx]] = [arr[idx], arr[tmplDragIdx]];
                          setTmplArrangement(arr);
                          setTmplDragIdx(null);
                        }}
                        onDragEnd={() => setTmplDragIdx(null)}
                      >
                        <div className="tmpl-slot-handle">⠿</div>
                        <div className="tmpl-slot-date-col">
                          {slotDate && (
                            <>
                              <span className="tmpl-slot-dow">{slotDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className="tmpl-slot-mday">{toShort(slotDate)}</span>
                            </>
                          )}
                        </div>
                        <div className="tmpl-slot-body">
                          {slot ? (
                            slot.meals.map((m, mi) => (
                              <div key={mi} className="tmpl-slot-meal">
                                <span className={`nut-meal-tag nut-meal-tag--${m.meal_type}`}>
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
              </>
            )}
            {tmplArrangement.length === 0 && (
              <p className="shop-modal-sub" style={{ padding: '8px 0 12px' }}>This template has no meals.</p>
            )}

            <div className="shop-modal-footer">
              <button className="btn-ghost-sm" onClick={() => setLoadTmplModal(null)} disabled={loadTmplWorking}>Cancel</button>
              <button
                className="btn-primary-sm"
                onClick={confirmLoadTemplate}
                disabled={loadTmplWorking || !loadTmplWeekStart || tmplArrangement.length === 0 || loadTmplExisting}
                title={loadTmplExisting ? 'Resolve the existing plan conflict first' : undefined}
              >
                {loadTmplWorking ? 'Applying...' : 'Apply to Week'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW TEMPLATE MODAL ─────────────────────────────────────────────── */}
      {viewTmplModal && (
        <div className="modal-overlay" onClick={() => setViewTmplModal(null)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="shop-modal-head">
              <h2 className="shop-modal-title">{viewTmplModal.name}</h2>
              <button className="mp-modal-close" onClick={() => setViewTmplModal(null)}>x</button>
            </div>
            {viewTmplModal.meals.length === 0 ? (
              <p className="shop-modal-sub" style={{ padding: '16px 0' }}>This template has no meals.</p>
            ) : (
              <div className="view-tmpl-body">
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                  const dayMeals = viewTmplModal.meals.filter(m => m.day_of_week === day);
                  if (!dayMeals.length) return null;
                  return (
                    <div key={day} className="view-tmpl-day">
                      <div className="view-tmpl-day-name">{day}</div>
                      {dayMeals.map((m, i) => (
                        <div key={i} className="view-tmpl-meal">
                          <span className={'nut-meal-tag nut-meal-tag--' + m.meal_type}>
                            {MEAL_LABELS[m.meal_type] || m.meal_type}
                          </span>
                          <span className="view-tmpl-recipe">{m.recipe_title || ('Recipe #' + m.recipe_id)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
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
              <button className="mp-modal-close" onClick={() => setShopModal(false)}>x</button>
            </div>
            <p className="shop-modal-sub">
              Select the ingredients you need to buy, then generate your shopping list.
              Items already in your pantry are pre-checked.
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
          cancelLabel={confirmAction.cancelLabel || 'Cancel'}
          onConfirm={confirmAction.onConfirm}
          onCancel={confirmAction.onCancel || (() => setConfirmAction(null))}
        />
      )}
    </div>
  );
}