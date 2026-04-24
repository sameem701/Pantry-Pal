import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, getDietaryOptions, getCuisineOptions } from '../api/UserApi';
import './Profile.css';

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function Profile() {
  const { user, login: refreshUser } = useAuth();
  const userId = user?.user_id;

  const [profile, setProfile] = useState(null);
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [cuisineOptions, setCuisineOptions] = useState([]);

  const [skillLevel, setSkillLevel] = useState('');
  const [selectedDietary, setSelectedDietary] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [profileData, dietary, cuisines] = await Promise.all([
          getProfile(userId),
          getDietaryOptions(),
          getCuisineOptions(),
        ]);
        setProfile(profileData);
        // Backend returns { success, data: [...] }
        setDietaryOptions(Array.isArray(dietary?.data) ? dietary.data : []);
        setCuisineOptions(Array.isArray(cuisines?.data) ? cuisines.data : []);
        setSkillLevel(profileData.skill_level || '');
        // Profile returns dietary_preferences: [{preference_id,...}] and preferred_cuisines: [{cuisine_id,...}]
        // Backend set_dietary_preferences / set_cuisine_preferences take integer ID arrays
        setSelectedDietary(
          Array.isArray(profileData.dietary_preferences)
            ? profileData.dietary_preferences.map((p) => p.preference_id)
            : []
        );
        setSelectedCuisines(
          Array.isArray(profileData.preferred_cuisines)
            ? profileData.preferred_cuisines.map((c) => c.cuisine_id)
            : []
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (userId) load();
  }, [userId]);

  function toggleItem(list, setList, value) {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateProfile(userId, {
        skill_level: skillLevel,
        dietary_preferences: selectedDietary,
        cuisine_preferences: selectedCuisines,
      });
      setSuccess('Profile updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="profile-loading">Loading profile…</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{(profile?.email || 'U')[0].toUpperCase()}</div>
        <h2 className="profile-email">{profile?.email}</h2>
        <p className="profile-joined">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</p>

        {error && <p className="pref-error">{error}</p>}
        {success && <p className="pref-success">{success}</p>}

        <form onSubmit={handleSave} className="profile-form">

          {/* Skill level */}
          <section className="pref-section">
            <h3 className="pref-heading">Cooking Skill Level</h3>
            <div className="skill-buttons">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`skill-btn${skillLevel === level ? ' active' : ''}`}
                  onClick={() => setSkillLevel(level)}
                >
                  {level === 'Beginner' && '🌱 '}
                  {level === 'Intermediate' && '🍳 '}
                  {level === 'Advanced' && '👨‍🍳 '}
                  {level}
                </button>
              ))}
            </div>
          </section>

          {/* Dietary restrictions */}
          <section className="pref-section">
            <h3 className="pref-heading">Dietary Preferences</h3>
            <p className="pref-hint">Select all that apply to you</p>
            <div className="tag-grid">
              {dietaryOptions.map((opt) => {
                // DB field: preference_id, preference_name
                const id = opt.preference_id;
                const label = opt.preference_name || opt.name || String(id);
                const checked = selectedDietary.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`pref-tag${checked ? ' selected' : ''}`}
                    onClick={() => toggleItem(selectedDietary, setSelectedDietary, id)}
                  >
                    {checked ? '✓ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cuisine preferences */}
          <section className="pref-section">
            <h3 className="pref-heading">Favourite Cuisines</h3>
            <p className="pref-hint">Choose cuisines you enjoy cooking</p>
            <div className="tag-grid">
              {cuisineOptions.map((opt) => {
                // DB field: cuisine_id, name
                const id = opt.cuisine_id;
                const label = opt.name || String(id);
                const checked = selectedCuisines.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`pref-tag cuisine${checked ? ' selected' : ''}`}
                    onClick={() => toggleItem(selectedCuisines, setSelectedCuisines, id)}
                  >
                    {checked ? '✓ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          </section>

          <button className="save-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </form>
      </div>
    </div>
  );
}
