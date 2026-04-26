import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSavedLists, clearList, toggleListItem, markAllListItems } from '../utils/shoppingListStore';
import { addPantryItem, searchIngredients } from '../api/PantryApi';
import './ShoppingList.css';

export default function ShoppingList() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { addToast } = useToast();
  const userId       = user?.user_id;

  const [lists,     setLists]     = useState([]);
  const [openId,    setOpenId]    = useState(null);
  const [addingAll, setAddingAll] = useState(false);   // global "Add All" lock
  const [addingIdx, setAddingIdx] = useState(null);    // { listId, idx }

  useEffect(() => { setLists(getSavedLists()); }, []);

  function handleToggle(listId, idx) {
    setLists(toggleListItem(listId, idx));
  }

  function handleDelete(listId) {
    setLists(clearList(listId));
    if (openId === listId) setOpenId(null);
  }

  // ── resolve ingredient and add to pantry ─────────────────────────────────
  async function resolveAndAdd(item) {
    let ingId = item.ingredient_id || null;
    if (!ingId && (item.ingredient_name || item.name)) {
      const name = item.ingredient_name || item.name;
      const res  = await searchIngredients(name);
      const found = Array.isArray(res?.data) ? res.data[0] : Array.isArray(res) ? res[0] : null;
      ingId = found?.ingredient_id || null;
    }
    if (!ingId) throw new Error('Could not find "' + (item.ingredient_name || item.name) + '" in ingredient list.');
    await addPantryItem(userId, ingId, item.quantity || 1, item.unit || '', null);
  }

  async function handleAddToPantry(listId, idx) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const item = list.items[idx];
    setAddingIdx({ listId, idx });
    try {
      await resolveAndAdd(item);
      addToast((item.ingredient_name || item.name) + ' added to pantry!', 'success');
      setLists(toggleListItem(listId, idx));
    } catch (err) {
      addToast(err.message || 'Failed to add to pantry', 'error');
    } finally {
      setAddingIdx(null);
    }
  }

  async function handleAddAllToPantry(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    setAddingAll(true);
    let added = 0, failed = 0;
    for (const item of list.items) {
      try {
        await resolveAndAdd(item);
        added++;
      } catch { failed++; }
    }
    setAddingAll(false);
    if (added > 0) addToast(added + ' item' + (added !== 1 ? 's' : '') + ' added to pantry!', 'success');
    if (failed > 0) addToast(failed + ' item' + (failed !== 1 ? 's' : '') + ' could not be found.', 'warning');
  }

  function handleMarkAllChecked(listId) {
    setLists(markAllListItems(listId, true));
  }

  function handleRemoveAll(listId) {
    setLists(clearList(listId));
    if (openId === listId) setOpenId(null);
    addToast('Shopping list removed.', 'success');
  }

  function copyToText(list) {
    const header = list.source + ' - ' + new Date(list.date).toLocaleString();
    const lines  = list.items.map(i =>
      (i.is_checked ? '[x] ' : '[ ] ') +
      (i.ingredient_name || i.name || '') +
      (i.quantity ? '  ' + i.quantity + (i.unit ? ' ' + i.unit : '') : '')
    );
    const hint = '\n(Check boxes when you have the item)';
    const text = header + '\n' + '-'.repeat(40) + '\n' + lines.join('\n') + hint;
    navigator.clipboard.writeText(text)
      .then(() => addToast('List copied to clipboard!', 'success'))
      .catch(() => addToast('Could not copy to clipboard', 'error'));
  }

  function downloadPdf(list) {
    const header = list.source + ' - ' + new Date(list.date).toLocaleString();
    const rows   = list.items.map(i =>
      '<tr><td style="width:24px;text-align:center;border:1px solid #ccc">' +
      (i.is_checked ? '&#10003;' : '') +
      '</td><td style="padding:4px 8px;border:1px solid #ccc">' +
      (i.ingredient_name || i.name || '') +
      '</td><td style="padding:4px 8px;border:1px solid #ccc;color:#888">' +
      (i.quantity ? i.quantity + (i.unit ? ' ' + i.unit : '') : '') +
      '</td></tr>'
    ).join('');
    const html = '<!DOCTYPE html><html><head><title>Shopping List</title>' +
      '<style>body{font-family:sans-serif;padding:24px}h2{margin-bottom:8px}' +
      'p.hint{font-size:0.8rem;color:#888;margin-bottom:12px}' +
      'table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px}' +
      'th{background:#f5f5f5;text-align:left}</style>' +
      '</head><body><h2>' + header + '</h2>' +
      '<p class="hint">Tick a box when you have the item.</p>' +
      '<table><thead><tr><th></th><th>Ingredient</th><th>Quantity</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  const totalItems = lists.reduce((a, l) => a + l.items.length, 0);

  return (
    <div className="sl-page">
      <div className="sl-page-header">
        <h1 className="sl-page-title">Shopping Lists</h1>
        {lists.length > 0 && (
          <p className="sl-page-sub">{lists.length} list{lists.length > 1 ? 's' : ''}, {totalItems} items total</p>
        )}
      </div>

      {lists.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No shopping lists yet</p>
          <p className="empty-state-body">
            Go to{' '}
            <button className="link-btn" onClick={() => navigate('/meal-plan')}>Plan &amp; Nutrition</button>
            {' '}and click &ldquo;Shopping List&rdquo; to create one.
          </p>
        </div>
      )}

      <div className="sl-paper-grid">
        {lists.map(list => {
          const unchecked = list.items.filter(i => !i.is_checked);
          const checked   = list.items.filter(i =>  i.is_checked);
          const isOpen    = openId === list.id;

          return (
            <div key={list.id} className={'sl-paper' + (isOpen ? ' sl-paper--open' : '')}>

              {/* ── collapsed face ───────────────────────────────────────── */}
              <div className="sl-paper-face" onClick={() => setOpenId(isOpen ? null : list.id)}>
                <div className="sl-paper-pin" />
                <div className="sl-paper-face-top">
                  <span className="sl-paper-source">{list.source}</span>
                  {isOpen && (
                    <button
                      className="sl-minimize-btn"
                      title="Minimise"
                      onClick={e => { e.stopPropagation(); setOpenId(null); }}
                    >&#8722;</button>
                  )}
                </div>
                <span className="sl-paper-date">
                  {new Date(list.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                {/* remaining count */}
                <div className="sl-paper-count">
                  <span className="sl-count-done">
                    {unchecked.length > 0
                      ? unchecked.length + ' remaining'
                      : 'All done!'}
                  </span>
                  {checked.length > 0 && <span className="sl-count-label">({checked.length} checked)</span>}
                </div>

                {/* preview: show all unchecked items (no "+more" text) */}
                {!isOpen && (
                  <div className="sl-paper-preview">
                    {unchecked.map((it, i) => (
                      <span key={i} className="sl-preview-item">
                        {it.ingredient_name || it.name}
                      </span>
                    ))}
                    {unchecked.length === 0 && checked.map((it, i) => (
                      <span key={i} className="sl-preview-item checked">
                        {it.ingredient_name || it.name}
                      </span>
                    ))}
                  </div>
                )}

                <span className="sl-paper-toggle">{isOpen ? '\u25b2' : '\u25bc'}</span>
              </div>

              {/* ── expanded view ─────────────────────────────────────────── */}
              {isOpen && (
                <div className="sl-paper-expanded">
                  <div className="sl-expanded-toolbar">
                    <button className="sl-tool-btn" onClick={() => copyToText(list)} title="Copy to clipboard">Copy Text</button>
                    <button className="sl-tool-btn" onClick={() => downloadPdf(list)}  title="Download as PDF">Download PDF</button>
                    <button
                      className="sl-tool-btn sl-tool-check"
                      onClick={() => handleMarkAllChecked(list.id)}
                      title="Mark all items as checked"
                    >
                      Mark All Checked
                    </button>
                    <button
                      className="sl-tool-btn sl-tool-pantry"
                      disabled={addingAll}
                      onClick={() => handleAddAllToPantry(list.id)}
                      title="Add all items to pantry"
                    >
                      {addingAll ? 'Adding...' : 'Add All to Pantry'}
                    </button>
                    <button
                      className="sl-tool-btn sl-tool-danger"
                      onClick={() => handleRemoveAll(list.id)}
                      title="Remove this list"
                    >
                      Remove List
                    </button>
                  </div>
                  <p className="sl-check-hint">&#10003; Check off an item when you&rsquo;ve got it.</p>

                  <div className="sl-expanded-items">
                    {list.items.map((item, idx) => {
                      const isAdding = addingIdx && addingIdx.listId === list.id && addingIdx.idx === idx;
                      return (
                        <div key={idx} className={'sl-exp-item' + (item.is_checked ? ' checked' : '')}>
                          <button
                            className={'sl-exp-check' + (item.is_checked ? ' ticked' : '')}
                            onClick={() => handleToggle(list.id, idx)}
                            title="Toggle"
                          >
                            {item.is_checked ? '\u2713' : ''}
                          </button>
                          <span className="sl-exp-name">{item.ingredient_name || item.name}</span>
                          {item.quantity && (
                            <span className="sl-exp-qty">{item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
                          )}
                          {item.is_checked && (
                            <button
                              className="sl-add-pantry-btn"
                              disabled={isAdding || addingAll}
                              onClick={() => handleAddToPantry(list.id, idx)}
                            >
                              {isAdding ? '...' : '+ Pantry'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}