import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDailyNutritionLog } from '../api/NutritionApi';
import { getPantry } from '../api/PantryApi';
import { createMealPlan, getMealPlan } from '../api/MealPlanApi';
import { getRecentlyCooked } from '../utils/recentlyCookedStore';
import './Dashboard.css';

// ── helpers ───────────────────────────────────────────────────────────────────
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MEAL_ORDER = ['breakfast','lunch','dinner'];

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function planKey(d) { return 'pantrypal_plan_' + toISO(d); }

/** Rough daily targets (configurable in future) */
const TARGETS = { calories: 2000, protein_g: 50, carbs_g: 260, fat_g: 65 };

/** SVG ring for a single macro */
function MacroRing({ label, value, target, color, unit = '' }) {
  const pct = Math.min((value / target) * 100, 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="db-macro-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-subtle,#e8e4df)" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-heading,#1a1a2e)">
          {value}
        </text>
      </svg>
      <span className="db-macro-label">{label}</span>
      <span className="db-macro-sub">{unit ? `${value}${unit} / ${target}${unit}` : `${value} / ${target}`}</span>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.user_id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayName = DAYS[today.getDay()];
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── state ─────────────────────────────────────────────────────────────────
  const [nutrition,     setNutrition]     = useState(null);
  const [todayMeals,    setTodayMeals]    = useState([]);
  const [pantryCount,   setPantryCount]   = useState(null);
  const [lowItems,      setLowItems]      = useState(0);
  const [recentCooked,  setRecentCooked]  = useState([]);
  const [planId,        setPlanId]        = useState(null);

  // ── fetch nutrition log ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    getDailyNutritionLog(userId)
      .then(res => { if (res?.success) setNutrition(res.totals); })
      .catch(() => {});
  }, [userId]);

  // ── fetch today's meal plan ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const monday = getMonday(today);
    const saved  = localStorage.getItem(planKey(monday));
    const storedId = saved ? Number(saved) : null;

    async function load(id) {
      try {
        const data = await getMealPlan(id, userId);
        const meals = data.meals || data.data || [];
        setPlanId(id);
        setTodayMeals(meals.filter(m => m.day_of_week === todayName));
      } catch { setTodayMeals([]); }
    }

    if (storedId) {
      load(storedId);
    } else {
      // Try creating/getting this week's plan
      createMealPlan(userId, toISO(monday))
        .then(res => {
          if (res?.plan_id) {
            localStorage.setItem(planKey(monday), String(res.plan_id));
            return load(res.plan_id);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── fetch pantry ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    getPantry(userId)
      .then(res => {
        const items = res?.pantry_items ?? res?.items ?? res?.data ?? [];
        setPantryCount(Array.isArray(items) ? items.length : 0);
        setLowItems(Array.isArray(items) ? items.filter(i => Number(i.quantity) < 2).length : 0);
      })
      .catch(() => {});
  }, [userId]);

  // ── recently cooked ──────────────────────────────────────────────────────
  useEffect(() => {
    setRecentCooked(getRecentlyCooked());
  }, []);

  // ── derived ──────────────────────────────────────────────────────────────
  const totals = nutrition ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  // Current meal slot: breakfast before noon, lunch before 5 pm, dinner otherwise
  const hour = new Date().getHours();
  const currentSlot = hour < 12 ? 'breakfast' : hour < 17 ? 'lunch' : 'dinner';

  const sortedMeals = [...todayMeals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  const firstName = (user?.first_name || user?.email || 'there').split(' ')[0];
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="db-page">

      {/* ── Greeting header ── */}
      <header className="db-header">
        <div>
          <h1 className="db-greeting">{greeting}, {firstName} 👋</h1>
          <p className="db-date">{dateLabel}</p>
        </div>
        <button className="db-cook-shortcut" onClick={() => navigate('/recipes?mode=pantry')}>
          🍳 What can I cook today?
        </button>
      </header>

      <div className="db-grid">

        {/* ── Today's Nutrition ── */}
        <section className="db-card db-card-nutrition">
          <h2 className="db-card-title">Today's Nutrition</h2>
          <div className="db-macro-rings">
            <MacroRing label="Calories" value={Math.round(totals.calories)} target={TARGETS.calories} color="#4caf50" />
            <MacroRing label="Protein"  value={Math.round(totals.protein_g)} target={TARGETS.protein_g} color="#2196f3" unit="g" />
            <MacroRing label="Carbs"    value={Math.round(totals.carbs_g)}   target={TARGETS.carbs_g}   color="#ff9800" unit="g" />
            <MacroRing label="Fat"      value={Math.round(totals.fat_g)}     target={TARGETS.fat_g}     color="#e91e63" unit="g" />
          </div>
          {totals.calories === 0 && (
            <p className="db-empty-hint">Cook a recipe to log your first meal today.</p>
          )}
        </section>

        {/* ── Today's Meal Plan ── */}
        <section className="db-card db-card-meals">
          <div className="db-card-head">
            <h2 className="db-card-title">Today's Plan</h2>
            <button className="db-link" onClick={() => navigate('/meal-plan')}>View full plan →</button>
          </div>
          {sortedMeals.length === 0 ? (
            <p className="db-empty-hint">No meals planned for today. <button className="db-link-inline" onClick={() => navigate('/meal-plan')}>Add some →</button></p>
          ) : (
            <ul className="db-meal-list">
              {sortedMeals.map(meal => (
                <li
                  key={meal.meal_type}
                  className={`db-meal-item ${meal.meal_type === currentSlot ? 'db-meal-current' : ''}`}
                >
                  {meal.meal_type === currentSlot && <span className="db-meal-arrow">▶</span>}
                  <div className="db-meal-info">
                    <span className="db-meal-type">{meal.meal_type}</span>
                    <span className="db-meal-title">{meal.recipe_title || meal.title || '—'}</span>
                  </div>
                  {meal.meal_type === currentSlot && meal.recipe_id && (
                    <button
                      className="db-start-btn"
                      onClick={() => navigate(`/cook/${meal.recipe_id}`)}
                    >
                      Start Cooking
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Pantry Health ── */}
        <section className="db-card db-card-pantry">
          <h2 className="db-card-title">Pantry Health</h2>
          {pantryCount === null ? (
            <div className="db-loading-sm">Loading…</div>
          ) : (
            <>
              <div className="db-pantry-stat">
                <span className="db-pantry-count">{pantryCount}</span>
                <span className="db-pantry-label">items stocked</span>
              </div>
              {lowItems > 0 && (
                <p className="db-pantry-warning">⚠️ {lowItems} item{lowItems > 1 ? 's' : ''} running low</p>
              )}
              <button className="db-link db-pantry-link" onClick={() => navigate('/pantry')}>
                Manage pantry →
              </button>
            </>
          )}
        </section>

        {/* ── Recently Cooked ── */}
        {recentCooked.length > 0 && (
          <section className="db-card db-card-recent">
            <h2 className="db-card-title">Recently Cooked</h2>
            <div className="db-rc-scroll">
              {recentCooked.map(r => (
                <button
                  key={r.recipeId}
                  className="db-rc-chip"
                  onClick={() => navigate(`/recipes/${r.recipeId}`)}
                >
                  {r.imageUrl ? (
                    <img className="db-rc-img" src={r.imageUrl} alt={r.title} />
                  ) : (
                    <span className="db-rc-icon">🍽️</span>
                  )}
                  <span className="db-rc-name">{r.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
