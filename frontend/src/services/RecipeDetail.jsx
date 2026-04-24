import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getRecipeDetails, toggleFavourite, getReviews, upsertReview, deleteReview } from '../api/RecipeApi';
import ConfirmModal from '../components/ConfirmModal';
import './RecipeDetail.css';

export default function RecipeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const userId = user?.user_id;
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const justCompleted = new URLSearchParams(location.search).get('completed') === '1';

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favLoading, setFavLoading] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getRecipeDetails(id, userId);
        const r = data?.recipe ?? data?.data ?? data;
        setRecipe(r && typeof r === 'object' && !Array.isArray(r) ? r : null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    loadReviews();
  }, [id, userId]);

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const data = await getReviews(id);
      const list = Array.isArray(data) ? data : (data?.reviews ?? data?.data ?? []);
      setReviews(Array.isArray(list) ? list : []);
      const mine = Array.isArray(list) ? list.find(r => String(r.user_id) === String(userId)) : null;
      if (mine) {
        setMyRating(mine.rating ?? 0);
        setMyReviewText(mine.review_text ?? '');
      }
    } catch {}
    setReviewsLoading(false);
  }

  const myExistingReview = reviews.find(r => String(r.user_id) === String(userId));

  async function handleFavourite() {
    setFavLoading(true);
    try {
      await toggleFavourite(id, userId);
      setRecipe((prev) => ({ ...prev, is_favourite: !prev.is_favourite }));
    } catch {}
    setFavLoading(false);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!myRating) { addToast('Please select a star rating.', 'warning'); return; }
    setSubmittingReview(true);
    try {
      await upsertReview(id, userId, myRating, myReviewText);
      addToast(myExistingReview ? 'Review updated!' : 'Review submitted!', 'success');
      await loadReviews();
    } catch (err) {
      addToast(err.message || 'Failed to submit review.', 'error');
    }
    setSubmittingReview(false);
  }

  async function handleDeleteReview() {
    setConfirmDeleteReview(false);
    try {
      await deleteReview(id, userId);
      setMyRating(0);
      setMyReviewText('');
      addToast('Review deleted.', 'success');
      await loadReviews();
    } catch (err) {
      addToast(err.message || 'Failed to delete review.', 'error');
    }
  }

  if (loading) return <div className="rd-loading">Loading recipe…</div>;
  if (error) return <div className="rd-error">{error}</div>;
  if (!recipe) return null;

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps
    : Array.isArray(recipe.instructions) ? recipe.instructions : [];
  const dietaryTags = Array.isArray(recipe.dietary_tags) ? recipe.dietary_tags : [];

  return (
    <div className="rd-page">
      <button className="rd-back" onClick={() => navigate(-1)}>← Back</button>

      <div className="rd-hero">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} className="rd-hero-img" />
          : <div className="rd-hero-placeholder">🍽️</div>
        }
        <div className="rd-hero-overlay">
          <div className="rd-meta-badges">
            {recipe.cuisine_name && <span className="badge badge-cuisine">{recipe.cuisine_name}</span>}
            {recipe.difficulty && (
              <span className={`badge badge-diff badge-${recipe.difficulty.toLowerCase()}`}>
                {recipe.difficulty}
              </span>
            )}
            {recipe.prep_time_minutes && (
              <span className="badge badge-time">⏱ {recipe.prep_time_minutes}m prep</span>
            )}
            {recipe.cook_time_minutes && (
              <span className="badge badge-time">🔥 {recipe.cook_time_minutes}m cook</span>
            )}
          </div>
          <h1 className="rd-title">{recipe.title}</h1>
          {recipe.description && <p className="rd-desc">{recipe.description}</p>}
          <div className="rd-actions">
            <button
              className={`fav-btn-lg${recipe.is_favourite ? ' faved' : ''}`}
              onClick={handleFavourite}
              disabled={favLoading}
            >
              {recipe.is_favourite ? '♥ Saved' : '♡ Save'}
            </button>
            <button
              className="cook-btn"
              onClick={() => navigate(`/cook/${id}`)}
            >
              👨‍🍳 Start Cooking
            </button>
          </div>
        </div>
      </div>

      <div className="rd-body">

        {/* Ingredients */}
        <div className="rd-section">
          <h2 className="rd-section-title">Ingredients</h2>
          {ingredients.length === 0
            ? <p className="rd-none">No ingredients listed.</p>
            : (
              <ul className="rd-ingredients">
                {ingredients.map((ing, i) => {
                  const available = ing.in_pantry ?? ing.is_available ?? true;
                  return (
                    <li key={i} className={`rd-ing${available ? ' available' : ' missing'}`}>
                      <span className="ing-dot">{available ? '✓' : '✗'}</span>
                      <span className="ing-text">
                        {ing.quantity && <strong>{ing.quantity} {ing.unit} </strong>}
                        {ing.name || ing.ingredient_name}
                      </span>
                      {!available && <span className="ing-missing-label">missing</span>}
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>

        {/* Instructions */}
        <div className="rd-section">
          <h2 className="rd-section-title">Instructions</h2>
          {steps.length === 0
            ? <p className="rd-none">No instructions available.</p>
            : (
              <ol className="rd-steps">
                {steps.map((step, i) => (
                  <li key={i} className="rd-step">
                    <span className="step-num">{i + 1}</span>
                    <span className="step-text">{step.instruction_text || step.instruction || step.description || ''}</span>
                    {step.duration_minutes && (
                      <span className="step-timer">⏱ {step.duration_minutes}m</span>
                    )}
                  </li>
                ))}
              </ol>
            )
          }
        </div>

        {/* Dietary tags */}
        {dietaryTags.length > 0 && (
          <div className="rd-section">
            <h2 className="rd-section-title">Dietary Info</h2>
            <div className="rd-tags">
              {dietaryTags.map((t, i) => (
                <span key={i} className="diet-tag">{typeof t === 'string' ? t : t.name || t.label || t.preference_name || ''}</span>
              ))}
            </div>
          </div>
        )}

        {/* Rating summary */}
        {typeof recipe.average_rating === 'number' && recipe.average_rating > 0 && (
          <div className="rd-section rd-rating-section">
            <span className="rd-stars">{'★'.repeat(Math.round(recipe.average_rating))}{'☆'.repeat(5 - Math.round(recipe.average_rating))}</span>
            <span className="rd-rating-num">{Number(recipe.average_rating).toFixed(1)} / 5</span>
            {recipe.review_count > 0 && <span className="rd-review-count">({recipe.review_count} reviews)</span>}
          </div>
        )}

        {/* Reviews section */}
        <div className="rd-section rd-reviews-section">
          <h2 className="rd-section-title">Reviews</h2>

          {/* Post-cooking prompt */}
          {justCompleted && !myExistingReview && (
            <div className="rd-cooking-done">
              🎉 Great job! How was the recipe? Leave a review below.
            </div>
          )}

          {/* Write / edit review form */}
          {userId && (
            <form className="rd-review-form" onSubmit={handleSubmitReview}>
              <p className="rd-review-form-label">
                {myExistingReview ? 'Your Review (click stars to update)' : 'Write a Review'}
              </p>
              <div className="rd-star-row">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`rd-star-btn${myRating >= n ? ' filled' : ''}`}
                    onClick={() => setMyRating(n)}
                    aria-label={`${n} star`}
                  >
                    {myRating >= n ? '★' : '☆'}
                  </button>
                ))}
                {myRating > 0 && <span className="rd-star-label">{myRating}/5</span>}
              </div>
              <textarea
                className="form-input rd-review-textarea"
                placeholder="Share your thoughts… (optional)"
                value={myReviewText}
                onChange={e => setMyReviewText(e.target.value)}
                rows={3}
              />
              <div className="rd-review-form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingReview || !myRating}
                >
                  {submittingReview ? 'Saving…' : myExistingReview ? 'Update Review' : 'Submit Review'}
                </button>
                {myExistingReview && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setConfirmDeleteReview(true)}
                  >
                    Delete Review
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Reviews list */}
          {reviewsLoading
            ? <p className="rd-none">Loading reviews…</p>
            : reviews.length === 0
              ? <p className="rd-none">No reviews yet. Be the first!</p>
              : (
                <ul className="rd-reviews-list">
                  {reviews.map((rev, i) => (
                    <li key={i} className="rd-review-item">
                      <div className="rd-review-header">
                        <span className="rd-review-user">{rev.username || rev.display_name || `User ${rev.user_id}`}</span>
                        <span className="rd-review-stars">{'★'.repeat(rev.rating ?? 0)}{'☆'.repeat(5 - (rev.rating ?? 0))}</span>
                        {rev.created_at && (
                          <span className="rd-review-date">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {rev.review_text && <p className="rd-review-text">{rev.review_text}</p>}
                    </li>
                  ))}
                </ul>
              )
          }
        </div>
      </div>

      {confirmDeleteReview && (
        <ConfirmModal
          title="Delete Review"
          message="Are you sure you want to delete your review? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteReview}
          onCancel={() => setConfirmDeleteReview(false)}
        />
      )}
    </div>
  );
}
