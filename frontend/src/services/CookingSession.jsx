import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  startCookingSession,
  getCookingSession,
  updateCookingStep,
  completeCookingSession,
  getRecipeDetails,
} from '../api/RecipeApi';
import { saveShoppingListLocally } from '../utils/shoppingListStore';
import './CookingSession.css';

export default function CookingSession() {
  const { id: recipeId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const userId = user?.user_id;

  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [completing, setCompleting] = useState(false);

  // Missing ingredients modal
  const [showMissingModal,    setShowMissingModal]    = useState(false);
  const [missingIngredients,  setMissingIngredients]  = useState([]);

  // Completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Start or resume session on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError('');
      try {
        // 1. Check for missing pantry ingredients
        const recipeData = await getRecipeDetails(recipeId, userId);
        const recipeObj  = recipeData?.recipe ?? recipeData?.data ?? recipeData;
        const ingredients = Array.isArray(recipeObj?.ingredients) ? recipeObj.ingredients : [];
        const missing = ingredients.filter(i => i.in_pantry === false || i.in_pantry === 0);

        if (missing.length > 0 && !cancelled) {
          setMissingIngredients(missing);
          setShowMissingModal(true);
          setLoading(false);
          return; // wait for user choice
        }

        await startSession(cancelled);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to start cooking session');
        if (!cancelled) setLoading(false);
      }
    }

    async function startSession(cancelled) {
      try {
        const startRes = await startCookingSession(recipeId, userId);
        if (!startRes?.session_id) throw new Error(startRes?.message || 'Could not start session');
        const data = await getCookingSession(startRes.session_id, userId);
        if (!cancelled) setSession(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to start cooking session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (userId && recipeId) init();
    return () => { cancelled = true; };
  }, [recipeId, userId]);

  const steps = session?.steps ?? [];
  const current = session?.current_step ?? 1;
  const total   = session?.total_steps  ?? steps.length;

  const currentStep = steps.find(s => s.step_number === current) ?? steps[current - 1];

  const goToStep = useCallback(async (n) => {
    if (!session?.session_id) return;
    try {
      const res = await updateCookingStep(session.session_id, userId, n);
      if (res?.success) {
        setSession(prev => ({ ...prev, current_step: n }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to update step', 'error');
    }
  }, [session, userId, addToast]);

  // Called when user clicks "Complete Cooking" — shows confirmation modal
  function handleComplete() {
    setShowCompletionModal(true);
  }

  // "Yes, Update Pantry"
  async function handleConfirmComplete() {
    if (!session?.session_id) return;
    setShowCompletionModal(false);
    setCompleting(true);
    try {
      await completeCookingSession(session.session_id, userId);
      addToast('Pantry updated!', 'success');
      navigate(`/recipes/${recipeId}?completed=1`);
    } catch (err) {
      addToast(err.message || 'Failed to complete session', 'error');
    } finally {
      setCompleting(false);
    }
  }

  // "Cancel" on completion modal — go back without updating pantry
  function handleCancelComplete() {
    setShowCompletionModal(false);
    navigate(`/recipes/${recipeId}?completed=1`);
  }

  // From missing modal — generate shopping list then let user decide
  async function handleGenerateMissingList() {
    try {
      saveShoppingListLocally(missingIngredients.map(i => ({
        ingredient_name: i.ingredient_name || i.name || '',
        quantity: i.quantity || '',
        unit: i.unit || '',
        ingredient_id: i.ingredient_id || null,
        is_checked: true,
      })), 'Cooking Session');
      addToast('Shopping list saved — you can still start cooking.', 'success');
    } catch {
      addToast('Failed to save shopping list', 'error');
    }
  }

  // "Start Anyway" from missing modal
  async function handleStartAnyway() {
    setShowMissingModal(false);
    setLoading(true);
    try {
      const startRes = await startCookingSession(recipeId, userId);
      if (!startRes?.session_id) throw new Error(startRes?.message || 'Could not start session');
      const data = await getCookingSession(startRes.session_id, userId);
      setSession(data);
    } catch (err) {
      setError(err.message || 'Failed to start cooking session');
    } finally {
      setLoading(false);
    }
  }

  // Missing ingredients modal (shown before session starts)
  if (showMissingModal) return (
    <div className="cook-shell">
      <div className="modal-overlay">
        <div className="cook-missing-modal">
          <h2 className="cook-missing-title">Missing Ingredients</h2>
          <p className="cook-missing-sub">You don't have all the ingredients in your pantry.</p>
          <ul className="cook-missing-list">
            {missingIngredients.map((ing, i) => (
              <li key={i}>
                {ing.quantity && <span className="ing-qty">{ing.quantity} {ing.unit}</span>}
                <span className="ing-name">{ing.ingredient_name || ing.name}</span>
              </li>
            ))}
          </ul>
          <div className="cook-modal-actions">
            <button className="btn-ghost-sm" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-secondary-sm" onClick={handleGenerateMissingList}>Generate Shopping List</button>
            <button className="cook-btn cook-btn-complete" onClick={handleStartAnyway}>Start Anyway</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="cook-shell">
      <div className="cook-loading">Starting cooking session…</div>
    </div>
  );

  if (error) return (
    <div className="cook-shell">
      <div className="cook-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );

  const isLast = current === total;

  return (
    <div className="cook-shell">
      {/* Header */}
      <div className="cook-header">
        <button className="cook-back" onClick={() => navigate(`/recipes/${recipeId}`)}>
          ← Back to Recipe
        </button>
        <span className="cook-recipe-title">{session?.recipe_title}</span>
        <span className="cook-step-counter">{current} / {total}</span>
      </div>

      {/* Progress dots */}
      <div className="cook-progress-row">
        <div className="cook-progress-track">
          <div
            className="cook-progress-fill"
            style={{ width: `${((current - 1) / Math.max(total - 1, 1)) * 100}%` }}
          />
          {steps.map((s, i) => (
            <button
              key={s.step_number}
              className={`cook-dot ${s.step_number === current ? 'active' : s.step_number < current ? 'done' : ''}`}
              style={{ left: `${(i / Math.max(total - 1, 1)) * 100}%` }}
              onClick={() => goToStep(s.step_number)}
              title={`Step ${s.step_number}`}
            />
          ))}
        </div>
      </div>

      {/* Step card */}
      <div className="cook-card">
        <div className="cook-step-number">Step {current}</div>
        <p className="cook-instruction">
          {currentStep?.instruction_text ?? '—'}
        </p>
      </div>

      {/* Navigation */}
      <div className="cook-nav">
        <button
          className="cook-btn cook-btn-prev"
          disabled={current <= 1}
          onClick={() => goToStep(current - 1)}
        >
          ← Previous
        </button>

        {isLast ? (
          <button
            className="cook-btn cook-btn-complete"
            disabled={completing}
            onClick={handleComplete}
          >
            {completing ? 'Completing…' : '✓ Complete Cooking'}
          </button>
        ) : (
          <button
            className="cook-btn cook-btn-next"
            onClick={() => goToStep(current + 1)}
          >
            Next →
          </button>
        )}
      </div>

      {/* Completion modal */}
      {showCompletionModal && (
        <div className="modal-overlay">
          <div className="cook-completion-modal">
            <h2 className="cook-completion-title">Cooking Complete!</h2>
            <p className="cook-completion-sub">
              Would you like to update your pantry by removing or reducing the quantities of used ingredients?
            </p>
            <div className="cook-modal-actions">
              <button className="btn-ghost-sm" onClick={handleCancelComplete}>Cancel</button>
              <button className="cook-btn cook-btn-complete" onClick={handleConfirmComplete} disabled={completing}>
                {completing ? 'Updating…' : 'Yes, Update Pantry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All steps list (collapsed) */}
      <details className="cook-steps-list">
        <summary>All steps ({total})</summary>
        <ol>
          {steps.map(s => (
            <li
              key={s.step_number}
              className={s.step_number === current ? 'active' : s.step_number < current ? 'done' : ''}
              onClick={() => goToStep(s.step_number)}
            >
              <span className="step-num">{s.step_number}</span>
              <span>{s.instruction_text}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
