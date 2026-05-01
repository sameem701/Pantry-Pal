import { useState, useEffect, useRef } from 'react';
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

  const [lists,          setLists]          = useState([]);
  const [openId,         setOpenId]         = useState(null);
  const [addingIdx,      setAddingIdx]      = useState(null);
  const [pantryNames,    setPantryNames]    = useState(new Set());
  const [confirmMarkAll, setConfirmMarkAll] = useState(null);
  const [cascadeBumps,   setCascadeBumps]   = useState({}); // { [listId]: { count, key } }
  const pendingRef      = useRef({});
  const bumpKeyRef      = useRef(0);
  const openIdRef       = useRef(null);     // mirrors openId for use inside async callbacks
  const pantryNamesRef  = useRef(new Set());
  const deferredBumps   = useRef({});       // bumps to show after the open card closes

  function changeOpenId(id) {
    const closing = openIdRef.current;
    openIdRef.current = id;
    setOpenId(id);
    // When minimising, show any bumps that were deferred while a card was open
    if (!id || id !== closing) {
      const toShow = deferredBumps.current;
      deferredBumps.current = {};
      if (Object.keys(toShow).length) {
        const bumps = {};
        for (const [lid, count] of Object.entries(toShow))
          bumps[lid] = { count, key: ++bumpKeyRef.current };
        setCascadeBumps(bumps);
        setTimeout(() => setCascadeBumps({}), 3900);
      }
    }
  }

  // Load lists and pantry on mount so we can auto-check items already owned
  useEffect(() => {
    setLists(getSavedLists());
  }, []);

  useEffect(() => {
    if (!userId) return;
    import('../api/PantryApi').then(({ getPantry }) => {
      getPantry(userId)
        .then(data => {
          const items = Array.isArray(data?.items) ? data.items
                      : Array.isArray(data?.data)  ? data.data
                      : Array.isArray(data)        ? data : [];
          const names = new Set(items.map(i =>
            (i.ingredient_name || i.name || '').toLowerCase().trim()
          ));
          setPantryNames(names);
          cascadeCheck(Array.from(names));
        })
        .catch(() => {});
    });
  }, [userId]);

  function handleDelete(listId) {
    setLists(clearList(listId));
    if (openId === listId) changeOpenId(null);
  }

  // ── cascade-check: auto-check matching items across all lists, show +N badge
  function cascadeCheck(addedNamesArray) {
    const addedSet = new Set(addedNamesArray.map(n => (n || '').toLowerCase().trim()).filter(Boolean));
    if (!addedSet.size) return;
    setLists(prev => {
      const rawBumps = {};
      const next = prev.map(list => {
        let bumped = 0;
        const items = list.items.map(item => {
          if (item.is_checked) return item;
          const nm = (item.ingredient_name || item.name || '').toLowerCase().trim();
          if (addedSet.has(nm)) { bumped++; return { ...item, is_checked: true }; }
          return item;
        });
        if (bumped > 0) rawBumps[list.id] = bumped;
        return bumped > 0 ? { ...list, items } : list;
      });
      if (Object.keys(rawBumps).length > 0) {
        requestAnimationFrame(() => {
          const immediate = {};
          for (const [id, count] of Object.entries(rawBumps)) {
            if (openIdRef.current === id) {
              // card is open/expanded — defer until it closes
              deferredBumps.current[id] = (deferredBumps.current[id] || 0) + count;
            } else {
              immediate[id] = { count, key: ++bumpKeyRef.current };
            }
          }
          if (Object.keys(immediate).length) {
            setCascadeBumps(immediate);
            setTimeout(() => setCascadeBumps({}), 3900);
          }
        });
      }
      return next;
    });
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

  // Once checked (added to pantry) an item cannot be unchecked
  async function handleToggle(listId, idx) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const item = list.items[idx];
    if (item.is_checked) return; // already in pantry — can't uncheck

    const key = `${listId}_${idx}`;
    // If already pending (undo timer running), ignore double-click
    if (pendingRef.current[key]) return;

    // Optimistically check in UI
    setLists(toggleListItem(listId, idx));

    // Start 4s timer — fires if user doesn't undo
    const tid = setTimeout(async () => {
      delete pendingRef.current[key];
      setAddingIdx({ listId, idx });
      try {
        await resolveAndAdd(item);
        cascadeCheck([item.ingredient_name || item.name]);
      } catch (err) {
        addToast(err.message || 'Could not add to pantry', 'warning');
        // revert check on failure
        setLists(prev => prev.map(l => l.id !== listId ? l : {
          ...l,
          items: l.items.map((it, i) => i === idx ? { ...it, is_checked: false } : it),
        }));
      } finally {
        setAddingIdx(null);
      }
    }, 4000);

    pendingRef.current[key] = { tid, item };

    addToast(
      (item.ingredient_name || item.name) + ' will be added to pantry',
      'info',
      {
        label: 'Undo',
        onClick: () => {
          const p = pendingRef.current[key];
          if (!p) return;
          clearTimeout(p.tid);
          delete pendingRef.current[key];
          setLists(prev => prev.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.map((it, i) => i === idx ? { ...it, is_checked: false } : it),
          }));
        },
      }
    );
  }

  function handleRemoveAll(listId) {
    setLists(clearList(listId));
    if (openId === listId) changeOpenId(null);
    addToast('Shopping list removed.', 'success');
  }

  async function handleMarkAll(listId) {
    setConfirmMarkAll(null);
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const unchecked = list.items.map((item, idx) => ({ item, idx })).filter(({ item }) => !item.is_checked);
    if (!unchecked.length) { addToast('All items already checked!', 'success'); return; }
    // Mark all as checked in UI immediately
    setLists(prev => prev.map(l => l.id !== listId ? l : {
      ...l,
      items: l.items.map(it => ({ ...it, is_checked: true })),
    }));
    let added = 0, failed = 0;
    const addedNames = [];
    for (const { item } of unchecked) {
      try { await resolveAndAdd(item); added++; addedNames.push(item.ingredient_name || item.name); }
      catch { failed++; }
    }
    if (added > 0) {
      addToast(added + ' item' + (added !== 1 ? 's' : '') + ' added to pantry!', 'success');
      cascadeCheck(addedNames);
    }
    if (failed > 0) addToast(failed + ' item' + (failed !== 1 ? 's' : '') + ' could not be added.', 'warning');
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

  const totalItems   = lists.reduce((a, l) => a + l.items.length, 0);
  const incompleteLists = lists.filter(l => l.items.some(i => !i.is_checked));
  const completeLists   = lists.filter(l => l.items.every(i => i.is_checked));

  function renderCard(list) {
    const unchecked = list.items.filter(i => !i.is_checked);
    const checked   = list.items.filter(i =>  i.is_checked);
    const isOpen    = openId === list.id;
    return (
            <div key={list.id} className={'sl-paper-wrap' + (isOpen ? ' sl-wrap--open' : '')}>
              {cascadeBumps[list.id] != null && (
                <div className="sl-cascade-bump" key={cascadeBumps[list.id].key}>
                  +{cascadeBumps[list.id].count}
                </div>
              )}
              <div className={'sl-paper' + (isOpen ? ' sl-paper--open' : '')}>

              {/* ── collapsed face ───────────────────────────────────────── */}
              <div className="sl-paper-face" onClick={() => changeOpenId(isOpen ? null : list.id)}>
                <div className="sl-paper-pin" />
                <div className="sl-paper-face-top">
                  <span className="sl-paper-source">{list.source}</span>
                  {isOpen && (
                    <div className="sl-face-top-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="sl-delete-btn"
                        title="Delete list"
                        onClick={() => handleRemoveAll(list.id)}
                      >
                        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1Z" fill="currentColor"/>
                          <path d="M2 4h12v1H3.5l.847 8.47A1 1 0 0 0 5.34 14h5.32a1 1 0 0 0 .993-.53L12.5 5H14V4H2Z" fill="currentColor"/>
                          <rect x="6.5" y="6.5" width="1" height="5" rx="0.5" fill="currentColor"/>
                          <rect x="8.5" y="6.5" width="1" height="5" rx="0.5" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        className="sl-minimize-btn"
                        title="Minimise"
                        onClick={e => { e.stopPropagation(); changeOpenId(null); }}
                      >&#8722;</button>
                    </div>
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

                {/* card-face quick actions */}
                {!isOpen && (
                  <div className="sl-face-actions" onClick={e => e.stopPropagation()}>
                    {unchecked.length > 0 && (
                      <button
                        className="sl-face-btn sl-face-check"
                        onClick={() => setConfirmMarkAll(list.id)}
                        title="Mark all as checked"
                      >&#10003; Mark All</button>
                    )}
                    <button
                      className="sl-face-btn sl-face-danger"
                      onClick={() => handleRemoveAll(list.id)}
                      title="Delete list"
                    >
                      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
                        <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1Z" fill="currentColor"/>
                        <path d="M2 4h12v1H3.5l.847 8.47A1 1 0 0 0 5.34 14h5.32a1 1 0 0 0 .993-.53L12.5 5H14V4H2Z" fill="currentColor"/>
                        <rect x="6.5" y="6.5" width="1" height="5" rx="0.5" fill="currentColor"/>
                        <rect x="8.5" y="6.5" width="1" height="5" rx="0.5" fill="currentColor"/>
                      </svg>
                      Delete
                    </button>
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
                    {list.items.some(i => !i.is_checked) && (
                      <button
                        className="sl-tool-btn sl-tool-check"
                        onClick={() => setConfirmMarkAll(list.id)}
                        title="Mark all as checked"
                      >&#10003; Mark All</button>
                    )}
                  </div>
                  <p className="sl-check-hint">&#10003; Checking an item automatically adds it to your pantry.</p>

                  <div className="sl-expanded-items">
                    {list.items.map((item, idx) => {
                      const isAdding = addingIdx && addingIdx.listId === list.id && addingIdx.idx === idx;
                      return (
                        <div key={idx} className={'sl-exp-item' + (item.is_checked ? ' checked' : '') + (isAdding ? ' adding' : '')}>
                          <button
                            className={'sl-exp-check' + (item.is_checked ? ' ticked' : '')}
                            onClick={() => handleToggle(list.id, idx)}
                            title={item.is_checked ? 'Already in pantry' : 'Check — adds to pantry'}
                            disabled={isAdding || item.is_checked}
                          >
                            {isAdding ? '\u2026' : item.is_checked ? '\u2713' : ''}
                          </button>
                          <span className="sl-exp-name">{item.ingredient_name || item.name}</span>
                          {item.quantity && (
                            <span className="sl-exp-qty">{item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            </div>
    );
  }

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

      {incompleteLists.length > 0 && (
        <div className="sl-paper-grid">
          {incompleteLists.map(list => renderCard(list))}
        </div>
      )}

      {completeLists.length > 0 && (
        <>
          <h2 className="sl-section-heading">Completed</h2>
          <div className="sl-paper-grid sl-grid-completed">
            {completeLists.map(list => renderCard(list))}
          </div>
        </>
      )}

      {/* ── Mark All confirm modal ─────────────────────────────────────── */}
      {confirmMarkAll && (() => {
        const list = lists.find(l => l.id === confirmMarkAll);
        const count = list ? list.items.filter(i => !i.is_checked).length : 0;
        return (
          <div className="confirm-overlay" onClick={() => setConfirmMarkAll(null)}>
            <div className="sl-confirm-modal" onClick={e => e.stopPropagation()}>
              <p className="sl-confirm-title">Mark all as checked?</p>
              <p className="sl-confirm-body">
                This will mark <strong>{count} item{count !== 1 ? 's' : ''}</strong> as checked
                and add them all to your pantry. This can't be undone.
              </p>
              <div className="sl-confirm-actions">
                <button className="sl-confirm-cancel" onClick={() => setConfirmMarkAll(null)}>Cancel</button>
                <button className="sl-confirm-ok" onClick={() => handleMarkAll(confirmMarkAll)}>
                  &#10003; Mark All
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}