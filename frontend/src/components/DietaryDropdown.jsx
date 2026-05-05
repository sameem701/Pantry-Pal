import { useRef, useState, useEffect } from 'react';
import './DietaryDropdown.css';

/**
 * DietaryDropdown
 * Props:
 *   options      – array of { id, name }
 *   value        – Set of selected IDs
 *   onChange     – (newSet) => void
 *   placeholder  – string shown when nothing selected
 */
export default function DietaryDropdown({ options = [], value = new Set(), onChange, placeholder = 'Any' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function toggle(id) {
    const next = new Set(value);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  const selectedOptions = options.filter(o => value.has(o.id));
  // Show first 2 chips; indicate remainder with +N
  const visibleChips = selectedOptions.slice(0, 2);
  const extraCount   = selectedOptions.length - visibleChips.length;

  return (
    <div className="dietary-dd" ref={ref}>
      <button
        type="button"
        className={'dietary-dd-trigger' + (open ? ' open' : '') + (value.size > 0 ? ' has-value' : '')}
        onClick={() => setOpen(o => !o)}
      >
        <span className="dietary-dd-content">
          {visibleChips.length === 0 ? (
            <span className="dietary-dd-placeholder">{placeholder}</span>
          ) : (
            <>
              {visibleChips.map(opt => (
                <span
                  key={opt.id}
                  className="dietary-chip"
                  onClick={e => { e.stopPropagation(); toggle(opt.id); }}
                  title={`Remove ${opt.name}`}
                >
                  {opt.name} <span className="dietary-chip-x">×</span>
                </span>
              ))}
              {extraCount > 0 && (
                <span className="dietary-dd-more">+{extraCount}</span>
              )}
            </>
          )}
        </span>
        <span className="dietary-dd-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="dietary-dd-menu">
          {options.length === 0 && (
            <div className="dietary-dd-empty">No options available</div>
          )}
          {options.map(o => {
            const sel = value.has(o.id);
            return (
              <div
                key={o.id}
                className={'dietary-dd-option' + (sel ? ' selected' : '')}
                onClick={() => toggle(o.id)}
              >
                <span className={'dietary-dd-swatch' + (sel ? ' checked' : '')} />
                <span className="dietary-dd-opt-name">{o.name}</span>
                {sel && <span className="dietary-dd-check">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
