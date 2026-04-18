import { useState, useEffect, useCallback } from 'react';
import {
  createMealPlan, getMealPlan, clearMealPlan,
  upsertMeal, removeMeal, markMealCooked,
  suggestMeals, getMissingIngredients,
} from '../api/MealPlanApi';
import './MealPlanner.css';

// ── constants ─────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

// ── date helpers ──────────────────────────────────────────────────────────────

/** Get the Sunday of the week containing `date`. */
function getWeekSunday(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // getDay(): 0=Sun
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Add `n` days to a Date, return new Date. */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Format Date → "YYYY-MM-DD" for API. */
function toISO(date) {
  return date.toISOString().split('T')[0];
}

/** Format Date → "Apr 18" for display. */
function toShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format Date → "Apr 13 – 19, 2026". */
function formatWeekRange(sunday) {
  const sat = addDays(sunday, 6);
  const opts = { month: 'short', day: 'numeric' };
  const yearOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${sunday.toLocaleDateString('en-US', opts)} – ${sat.toLocaleDateString('en-US', yearOpts)}`;
}

/** Storage key for a week's planId. */
function planKey(sunday) {
  return `pantrypal_plan_${toISO(sunday)}`;
}

/** Build slot map from API meals array. */
function buildSlotMap(meals = []) {
  const map = {};
  for (const meal of meals) {
    const key = `${meal.day_of_week}-${meal.meal_type}`;
    map[key] = {
      title: meal.recipe_title || meal.recipe_name || `Recipe #${meal.recipe_id}`,
      recipeId: meal.recipe_id,
      cooked: !!meal.is_cooked,
    };
  }
  return map;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function MealPlanner() {
  const userId = Number(localStorage.getItem('pantrypal_user_id')) || 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Which week is being viewed (always a Sunday)
  const [weekSunday, setWeekSunday] = useState(() => getWeekSunday());

  // planId for the currently viewed week (null = no plan yet)
  const [planId, setPlanId] = useState(() => {
    const key = planKey(getWeekSunday());
    const saved = localStorage.getItem(key);
    return saved ? Number(saved) : null;
  });

  const [slotMap, setSlotMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Slot modal
  const [activeSlot, setActiveSlot] = useState(null); // { day, type }
  const [recipeInput, setRecipeInput] = useState('');
  const [modalError, setModalError] = useState('');

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  // Missing ingredients
  const [missing, setMissing] = useState([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState('');
  const [showMissing, setShowMissing] = useState(false);

  // The 7 Date objects for this week
  const weekDays = DAYS.map((_, i) => addDays(weekSunday, i));

  // ── load plan when week changes ───────────────────────────────────────────
  const loadPlan = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      const data = await getMealPlan(id, userId);
      setSlotMap(buildSlotMap(data.meals || data.data || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // When week changes, look up stored planId for that week
    const saved = localStorage.getItem(planKey(weekSunday));
    const id = saved ? Number(saved) : null;
    setPlanId(id);
    setSlotMap({});
    setSuggestions([]);
    setShowMissing(false);
    setError('');
    setStatusMsg('');
    if (id) loadPlan(id);
  }, [weekSunday, loadPlan]);

  // ── week navigation ───────────────────────────────────────────────────────
  function prevWeek() { setWeekSunday((d) => addDays(d, -7)); }
  function nextWeek() { setWeekSunday((d) => addDays(d, 7)); }
  function goToCurrentWeek() { setWeekSunday(getWeekSunday()); }

  // ── create plan for this week ─────────────────────────────────────────────
  async function handleCreate() {
    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      const data = await createMealPlan(userId, toISO(weekSunday));
      const newId = data.plan_id;
      setPlanId(newId);
      localStorage.setItem(planKey(weekSunday), String(newId));
      setSlotMap({});
      setStatusMsg(`Plan created for week of ${formatWeekRange(weekSunday)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── clear entire plan ─────────────────────────────────────────────────────
  async function handleClear() {
    if (!planId) return;
    if (!window.confirm('Clear all meals from this week?')) return;
    setLoading(true);
    setError('');
    try {
      await clearMealPlan(planId, userId);
      setSlotMap({});
      setStatusMsg('Plan cleared.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── slot modal ────────────────────────────────────────────────────────────
  function openSlot(day, type) {
    const existing = slotMap[`${day}-${type}`];
    setActiveSlot({ day, type });
    setRecipeInput(existing ? String(existing.recipeId) : '');
    setModalError('');
  }

  function closeModal() {
    setActiveSlot(null);
    setRecipeInput('');
    setModalError('');
  }

  async function handleUpsert() {
    const recipeId = Number(recipeInput);
    if (!recipeId) { setModalError('Enter a valid numeric Recipe ID.'); return; }
    setLoading(true);
    setModalError('');
    try {
      await upsertMeal(planId, userId, recipeId, activeSlot.day, activeSlot.type);
      setSlotMap((prev) => ({
        ...prev,
        [`${activeSlot.day}-${activeSlot.type}`]: {
          title: `Recipe #${recipeId}`,
          recipeId,
          cooked: false,
        },
      }));
      setStatusMsg(`Saved to ${activeSlot.day} ${activeSlot.type}.`);
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSlot() {
    if (!activeSlot) return;
    setLoading(true);
    setModalError('');
    try {
      await removeMeal(planId, userId, activeSlot.day, activeSlot.type);
      setSlotMap((prev) => {
        const next = { ...prev };
        delete next[`${activeSlot.day}-${activeSlot.type}`];
        return next;
      });
      setStatusMsg(`Removed ${activeSlot.day} ${activeSlot.type}.`);
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCooked(day, type, e) {
    e.stopPropagation();
    setLoading(true);
    try {
      await markMealCooked(planId, userId, day, type);
      setSlotMap((prev) => ({
        ...prev,
        [`${day}-${type}`]: { ...prev[`${day}-${type}`], cooked: true },
      }));
      setStatusMsg(`Marked ${day} ${MEAL_LABELS[type]} as cooked ✓`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── suggestions ───────────────────────────────────────────────────────────
  async function handleSuggest() {
    setSuggestLoading(true);
    setSuggestError('');
    setSuggestions([]);
    try {
      const data = await suggestMeals(planId, userId);
      const list = data.suggestions || data.data || [];
      setSuggestions(list);
      if (!list.length) setSuggestError('No suggestions returned. Ensure pantry has ingredients.');
    } catch (err) {
      setSuggestError(err.message);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function applySuggestion(s) {
    try {
      await upsertMeal(planId, userId, s.recipe_id, s.day_of_week, s.meal_type);
      setSlotMap((prev) => ({
        ...prev,
        [`${s.day_of_week}-${s.meal_type}`]: {
          title: s.recipe_title || `Recipe #${s.recipe_id}`,
          recipeId: s.recipe_id,
          cooked: false,
        },
      }));
      setSuggestions((prev) => prev.filter((x) => x !== s));
    } catch (err) {
      setSuggestError(err.message);
    }
  }

  async function applyAllSuggestions() {
    for (const s of [...suggestions]) await applySuggestion(s);
  }

  // ── missing ingredients ───────────────────────────────────────────────────
  async function handleMissing() {
    setMissingLoading(true);
    setMissingError('');
    setShowMissing(true);
    setMissing([]);
    try {
      const data = await getMissingIngredients(planId, userId);
      setMissing(data.missing || data.data || []);
    } catch (err) {
      setMissingError(err.message);
    } finally {
      setMissingLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  const isCurrentWeek = toISO(weekSunday) === toISO(getWeekSunday());

  return (
    <div className="mp-layout">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside className="mp-sidebar">
        <h2 className="sidebar-title">Recipes</h2>
        <p className="sidebar-hint">
          Recipes from your favourites and pantry matches will appear here once the
          Recipes workflow is connected. For now, use a Recipe ID to add meals.
        </p>

        {planId && (
          <div className="sidebar-quickadd">
            <p className="sidebar-quickadd-label">Quick Add by Recipe ID</p>
            <p className="sidebar-quickadd-sub">Click any calendar slot to assign a recipe.</p>
          </div>
        )}

        {planId && suggestions.length > 0 && (
          <div className="sidebar-suggestions">
            <div className="sidebar-suggestions-header">
              <span>Suggestions</span>
              <button className="btn btn-sm btn-primary" onClick={applyAllSuggestions}>Apply All</button>
            </div>
            <ul className="sidebar-suggest-list">
              {suggestions.map((s, i) => (
                <li key={i} className="sidebar-suggest-item">
                  <div>
                    <span className={`tag tag--${s.meal_type}`}>{s.meal_type}</span>
                    <span className="suggest-day">{s.day_of_week.slice(0, 3)}</span>
                    <span className="suggest-title">{s.recipe_title || `Recipe #${s.recipe_id}`}</span>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => applySuggestion(s)}>+</button>
                </li>
              ))}
            </ul>
            {suggestError && <p className="msg msg-error">{suggestError}</p>}
          </div>
        )}
      </aside>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <main className="mp-main">

        {/* ── Header ── */}
        <div className="mp-header">
          <h1 className="mp-title">Meal Planner</h1>

          <div className="week-nav">
            <button className="week-nav-btn" onClick={prevWeek} title="Previous week">&#8592;</button>
            <div className="week-nav-label">
              <span className="week-range">{formatWeekRange(weekSunday)}</span>
              {!isCurrentWeek && (
                <button className="btn-today" onClick={goToCurrentWeek}>Today</button>
              )}
            </div>
            <button className="week-nav-btn" onClick={nextWeek} title="Next week">&#8594;</button>
          </div>

          {planId && (
            <div className="mp-actions">
              <span className="plan-badge">Plan #{planId}</span>
              <button className="btn btn-suggest" onClick={handleSuggest} disabled={suggestLoading}>
                {suggestLoading ? 'Thinking…' : '✨ Suggest Meals'}
              </button>
              <button className="btn btn-outline" onClick={handleMissing} disabled={missingLoading}>
                🛒 Missing
              </button>
              <button className="btn btn-danger" onClick={handleClear} disabled={loading}>
                Clear Week
              </button>
            </div>
          )}
        </div>

        {/* ── Feedback bar ── */}
        {error && <p className="msg msg-error">{error}</p>}
        {statusMsg && <p className="msg msg-success">{statusMsg}</p>}

        {/* ── No plan — create prompt ── */}
        {!planId && (
          <div className="mp-no-plan">
            <p>No meal plan for <strong>{formatWeekRange(weekSunday)}</strong>.</p>
            <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating…' : '+ Create Plan for This Week'}
            </button>
          </div>
        )}

        {/* ── Calendar grid ── */}
        {planId && (
          <div className="calendar-scroll">
            {loading && <div className="calendar-overlay">Loading…</div>}
            <table className="calendar">
              <thead>
                <tr>
                  <th className="cal-label-col"></th>
                  {weekDays.map((date, i) => {
                    const isToday = toISO(date) === toISO(today);
                    return (
                      <th key={i} className={`cal-day-header${isToday ? ' today' : ''}`}>
                        <span className="day-name">{DAYS[i].slice(0, 3)}</span>
                        <span className="day-date">{toShortDate(date)}</span>
                        {isToday && <span className="today-dot" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((type) => (
                  <tr key={type} className={`cal-row cal-row--${type}`}>
                    <td className="cal-row-label">
                      <span>{MEAL_LABELS[type]}</span>
                    </td>
                    {DAYS.map((day) => {
                      const key = `${day}-${type}`;
                      const slot = slotMap[key];
                      return (
                        <td
                          key={day}
                          className={`cal-slot${slot ? ' has-meal' : ' empty'}${slot?.cooked ? ' cooked' : ''}`}
                          onClick={() => openSlot(day, type)}
                          title={slot ? 'Click to edit or remove' : `Add ${type} for ${day}`}
                        >
                          {slot ? (
                            <div className="slot-content">
                              <span className="slot-title">{slot.title}</span>
                              {slot.cooked
                                ? <span className="cooked-badge">✓ Cooked</span>
                                : (
                                  <button
                                    className="btn-cooked"
                                    onClick={(e) => handleCooked(day, type, e)}
                                    title="Mark as cooked"
                                  >
                                    Mark Cooked
                                  </button>
                                )}
                            </div>
                          ) : (
                            <span className="slot-add">+ Add</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Missing ingredients panel ── */}
        {showMissing && (
          <div className="missing-panel">
            <div className="panel-header">
              <h3>🛒 Missing Ingredients</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowMissing(false)}>✕ Close</button>
            </div>
            {missingLoading && <p className="msg">Checking pantry…</p>}
            {missingError && <p className="msg msg-error">{missingError}</p>}
            {!missingLoading && !missingError && missing.length === 0 && (
              <p className="msg msg-success">✓ You have everything you need!</p>
            )}
            {missing.length > 0 && (
              <ul className="missing-list">
                {missing.map((item, i) => (
                  <li key={i} className="missing-item">
                    <span className="missing-name">{item.ingredient_name}</span>
                    {item.quantity && <span className="missing-qty">{item.quantity}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* ══ SLOT MODAL ═══════════════════════════════════════════════════════ */}
      {activeSlot && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className={`tag tag--${activeSlot.type}`}>{MEAL_LABELS[activeSlot.type]}</span>
              <h2>{activeSlot.day}</h2>
            </div>

            {modalError && <p className="msg msg-error">{modalError}</p>}

            <label htmlFor="recipe-id">Recipe ID</label>
            <input
              id="recipe-id"
              type="number"
              min="1"
              placeholder="e.g. 3"
              value={recipeInput}
              autoFocus
              onChange={(e) => setRecipeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpsert()}
            />
            <p className="modal-hint">Once the Recipes page is done, you'll pick from a list here.</p>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleUpsert} disabled={loading}>
                {loading ? 'Saving…' : slotMap[`${activeSlot.day}-${activeSlot.type}`] ? 'Update' : 'Add Meal'}
              </button>
              {slotMap[`${activeSlot.day}-${activeSlot.type}`] && (
                <button className="btn btn-danger" onClick={handleRemoveSlot} disabled={loading}>
                  Remove
                </button>
              )}
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
