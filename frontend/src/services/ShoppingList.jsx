import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, CheckCheck, Loader2, Check, LayoutList, Tag } from 'lucide-react';
import { groupItems } from '../utils/foodGroups';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSavedLists, clearList, toggleListItem, markAllListItems, saveLists } from '../utils/shoppingListStore'; // saveLists still used by handleMarkAll
import { addPantryItem, searchIngredients } from '../api/PantryApi';
import './ShoppingList.css';

export default function ShoppingList() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { addToast } = useToast();
  const userId       = user?.user_id;

  // Initialize directly from localStorage — no flicker, no empty-then-filled render
  const [lists,          setLists]          = useState(() => getSavedLists());
  const [openId,         setOpenId]         = useState(null);
  const [addingIdx,      setAddingIdx]      = useState(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState(null);
  const [groupByFood,    setGroupByFood]    = useState(false);
  const pendingRef = useRef({});

  function changeOpenId(id) {
    setOpenId(id);
  }

  // Load pantry on mount so we can auto-check items already owned
  useEffect(() => {
    // (lists already loaded synchronously from localStorage in useState initializer)
  }, []);

  useEffect(() => {
    if (!userId) return;
    import('../api/PantryApi').then(({ getPantry }) => {
      getPantry(userId).catch(() => {});
    });
  }, [userId]);

  function handleDelete(listId) {
    setLists(clearList(listId));
    if (openId === listId) changeOpenId(null);
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
      } catch (err) {
        addToast(err.message || 'Could not add to pantry', 'warning');
        // revert check on failure and persist the revert
        setLists(prev => {
          const next = prev.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.map((it, i) => i === idx ? { ...it, is_checked: false } : it),
          });
          saveLists(next);
          return next;
        });
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
          setLists(prev => {
            const next = prev.map(l => l.id !== listId ? l : {
              ...l,
              items: l.items.map((it, i) => i === idx ? { ...it, is_checked: false } : it),
            });
            saveLists(next);
            return next;
          });
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
    // Mark all as checked in UI immediately and persist to localStorage
    const markedLists = lists.map(l => l.id !== listId ? l : {
      ...l,
      items: l.items.map(it => ({ ...it, is_checked: true })),
    });
    setLists(markedLists);
    saveLists(markedLists);
    let added = 0, failed = 0;
    const addedNames = [];
    for (const { item } of unchecked) {
      try { await resolveAndAdd(item); added++; addedNames.push(item.ingredient_name || item.name); }
      catch { failed++; }
    }
    if (added > 0) {
      addToast(added + ' item' + (added !== 1 ? 's' : '') + ' added to pantry!', 'success');
    }
    if (failed > 0) addToast(failed + ' item' + (failed !== 1 ? 's' : '') + ' could not be added.', 'warning');
  }

  function buildTextContent(list) {
    const header = list.source + ' - ' + new Date(list.date).toLocaleString();
    const lines  = list.items.map(i =>
      (i.is_checked ? '[x] ' : '[ ] ') +
      (i.ingredient_name || i.name || '') +
      (i.quantity ? '  ' + i.quantity + (i.unit ? ' ' + i.unit : '') : '')
    );
    return header + '\n' + '-'.repeat(40) + '\n' + lines.join('\n') + '\n\n(Check boxes when you have the item)';
  }

  function copyToText(list) {
    navigator.clipboard.writeText(buildTextContent(list))
      .then(() => addToast('List copied to clipboard!', 'success'))
      .catch(() => addToast('Could not copy to clipboard', 'error'));
  }

  function downloadTxt(list) {
    const text = buildTextContent(list);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = (list.source || 'shopping-list').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    addToast('Text file downloaded!', 'success');
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

                {/* preview: show first 3 items then "…and N more" */}
                {!isOpen && (() => {
                  const previewSrc = unchecked.length > 0 ? unchecked : checked;
                  const shown = previewSrc.slice(0, 3);
                  const rest  = previewSrc.length - shown.length;
                  return (
                    <div className="sl-paper-preview">
                      {shown.map((it, i) => (
                        <span key={i} className={'sl-preview-item' + (unchecked.length === 0 ? ' checked' : '')}>
                          {it.ingredient_name || it.name}
                        </span>
                      ))}
                      {rest > 0 && (
                        <span className="sl-preview-more">…and {rest} more</span>
                      )}
                    </div>
                  );
                })()}

                {/* card-face quick actions */}
                {!isOpen && (
                  <div className="sl-face-actions" onClick={e => e.stopPropagation()}>
                    {unchecked.length > 0 && (
                      <button
                        className="sl-face-btn sl-face-check"
                        onClick={() => setConfirmMarkAll(list.id)}
                        title="Mark all as checked"
                      ><CheckCheck size={14} /> Mark All</button>
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

                <span className="sl-paper-toggle">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
              </div>

              {/* ── expanded view ─────────────────────────────────────────── */}
              {isOpen && (
                <div className="sl-paper-expanded">
                  <div className="sl-expanded-toolbar">
                    <button className="sl-tool-btn" onClick={() => copyToText(list)} title="Copy to clipboard">Copy Text</button>
                    <button className="sl-tool-btn" onClick={() => downloadTxt(list)}  title="Download as .txt">Download .txt</button>
                    <button className="sl-tool-btn" onClick={() => downloadPdf(list)}  title="Download as PDF">Download PDF</button>
                    <button
                      className={`sl-tool-btn sl-tool-group${groupByFood ? ' sl-tool-group--on' : ''}`}
                      onClick={() => setGroupByFood(v => !v)}
                      title={groupByFood ? 'Show flat list' : 'Group by food category'}
                    >
                      {groupByFood ? <LayoutList size={13} /> : <Tag size={13} />}
                      {groupByFood ? 'Flat' : 'By Category'}
                    </button>
                    {list.items.some(i => !i.is_checked) && (
                      <>
                        <button
                          className="sl-tool-btn sl-tool-check"
                          onClick={() => setConfirmMarkAll(list.id)}
                          title="Select all and add to pantry"
                        ><CheckCheck size={14} /> Select All</button>
                      </>
                    )}
                  </div>
                  <p className="sl-check-hint">&#10003; Checking an item automatically adds it to your pantry.</p>

                  {groupByFood ? (
                    groupItems(list.items).map(({ group, items: gItems }) => (
                      <div key={group} className="sl-group">
                        <div className="sl-group-label">{group}</div>
                        <div className="sl-expanded-items">
                          {gItems.map(item => {
                            const idx = list.items.indexOf(item);
                            const isAdding = addingIdx && addingIdx.listId === list.id && addingIdx.idx === idx;
                            return (
                              <div key={idx} className={'sl-exp-item' + (item.is_checked ? ' checked' : '') + (isAdding ? ' adding' : '')}>
                                <button
                                  className={'sl-exp-check' + (item.is_checked ? ' ticked' : '')}
                                  onClick={() => handleToggle(list.id, idx)}
                                  title={item.is_checked ? 'Already in pantry' : 'Check — adds to pantry'}
                                  disabled={isAdding || item.is_checked}
                                >
                                  {isAdding ? <Loader2 size={12} className="spin" /> : item.is_checked ? <Check size={12} /> : ''}
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
                    ))
                  ) : (
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
                            {isAdding ? <Loader2 size={12} className="spin" /> : item.is_checked ? <Check size={12} /> : ''}
                          </button>
                          <span className="sl-exp-name">{item.ingredient_name || item.name}</span>
                          {item.quantity && (
                            <span className="sl-exp-qty">{item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}
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