/**
 * 干货捞捞 — UI 渲染层
 * 卡片渲染、弹窗管理、分页、通知
 */

// ==================== STATE ====================

let currentPage = 0;
const PAGE_SIZE = 12;
let currentModalNoteId = null;

// ==================== CARD RENDERING ====================

function renderCards(notes, append = false) {
  const grid = document.getElementById('card-grid');
  const emptyState = document.getElementById('empty-state');
  const loadMore = document.getElementById('load-more-container');

  if (!append) {
    grid.innerHTML = '';
    currentPage = 0;
  }

  const settings = getSettings();
  let filtered = notes;

  // 低质隐藏
  if (settings.autoHideLowQuality && !settings.showLowQuality) {
    filtered = filtered.filter(n => Number.isFinite(n.quality) && n.quality >= settings.lowQualityThreshold);
  }

  // 置顶优先
  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  // 分页
  const start = currentPage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    loadMore.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  pageItems.forEach((note, i) => {
    const card = createCardElement(note, i);
    card.classList.add('card-reveal');
    grid.appendChild(card);
  });

  // Load more
  if (filtered.length > start + PAGE_SIZE) {
    loadMore.classList.remove('hidden');
  } else {
    loadMore.classList.add('hidden');
  }

  currentPage++;
}

function createCardElement(note, index = 0) {
  const card = document.createElement('div');
  card.className = 'note-card p-4 sm:p-5 cursor-pointer relative group';
  card.dataset.noteId = note.id;
  card.style.animationDelay = (index % 12) * 0.05 + 's';

  const timeStr = formatTime(note.createdAt);
  const platform = note.platform || '网页链接';
  const sourceUrl = note.sourceUrl || '';
  const sourceIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>';

  card.innerHTML = `
    <!-- Source badge + actions -->
    <div class="flex items-center justify-between mb-3">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-warm-500 bg-warm-100/80 rounded-full font-noto font-medium tracking-wide">
        <svg class="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">${sourceIcon}</svg>
        ${escapeHtml(platform)}
      </span>
      <div class="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 active:bg-warm-200 transition-colors btn-press ${note.isPinned ? 'text-honey-400' : 'text-warm-400'}" title="置顶" data-action="pin" data-id="${note.id}">
          <svg class="w-4 h-4" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </button>
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 active:bg-warm-200 transition-colors btn-press ${note.isFavorited ? 'text-honey-400' : 'text-warm-400'}" title="收藏" data-action="fav" data-id="${note.id}">
          <svg class="w-4 h-4" fill="${note.isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 active:bg-red-100 text-warm-400 hover:text-red-500 transition-colors btn-press" title="删除" data-action="delete" data-id="${note.id}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Title -->
    <h3 class="text-base sm:text-lg font-fredoka font-semibold text-warm-800 mb-2 line-clamp-2 leading-snug">${escapeHtml(note.title)}</h3>

    <!-- Snippet -->
    <p class="text-sm text-warm-500 line-clamp-2 mb-3 leading-relaxed font-noto">${escapeHtml(note.sections.knowledge || note.content || '暂无摘要')}</p>

    <!-- Bottom: time + stars + tags -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-warm-400 font-noto tracking-wide">${timeStr}</span>
      <div class="flex items-center gap-1.5">
        ${renderStars(note.quality)}
        ${(Array.isArray(note.tags) ? note.tags.slice(0, 2) : []).map(t => `<span class="sticker-tag font-noto tracking-wide text-xs">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>
  `;

  // Click to open detail
  card.addEventListener('click', (e) => {
    // Don't trigger if clicking action buttons
    if (e.target.closest('[data-action]')) return;
    // In batch mode, let batch handler deal with it
    if (document.body.classList.contains('batch-mode')) return;
    openNoteDetail(note.id);
  });

  // Pin button
  card.querySelector('[data-action="pin"]').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(note.id);
  });

  // Favorite button
  card.querySelector('[data-action="fav"]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(note.id);
  });

  // Delete button
  card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNoteConfirm(note.id);
  });

  return card;
}

// ==================== STARS ====================

function renderStars(quality) {
  const q = (Number.isFinite(quality) && quality != null) ? Math.max(0, Math.min(5, Math.round(quality))) : 0;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= q) {
      html += `<svg class="w-4 h-4 star" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    } else {
      html += `<svg class="w-4 h-4 star-empty" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    }
  }
  return html;
}

// ==================== NOTE DETAIL MODAL ====================

function openNoteDetail(id) {
  const note = getNoteById(id);
  if (!note) return;

  currentModalNoteId = id;
  recordView(id);

  document.getElementById('modal-title').textContent = note.title;
  const safeUrl = note.sourceUrl ? note.sourceUrl.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  const linkInfo = note.sourceUrl
    ? ` · <a href="${safeUrl}" target="_blank" rel="noopener" class="text-honey-500 hover:text-honey-600 underline underline-offset-2">🔗 原文链接</a>`
    : '';
  document.getElementById('modal-date').innerHTML = '创建于 ' + formatTime(note.createdAt) + ' · 浏览 ' + (note.viewCount || 0) + ' 次' + linkInfo;
  document.getElementById('modal-core-points').innerHTML = formatStructuredText(note.sections.corePoints || '（暂无）');
  document.getElementById('modal-knowledge').innerHTML = formatStructuredText(note.sections.knowledge || '（暂无）');
  // 个人感悟区始终为可编辑的 textarea
  const reflectionText = note.sections.reflection || '';
  document.getElementById('modal-reflection').innerHTML = `<textarea class="w-full min-h-[120px] p-3 sm:p-4 text-sm sm:text-base border-2 border-blue-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y bg-white font-noto leading-relaxed transition-colors" placeholder="在此记录你的个人感悟…">${escapeHtml(reflectionText)}</textarea>`;
  const reflectionTextarea = document.querySelector('#modal-reflection textarea');
  if (reflectionTextarea) {
    reflectionTextarea.addEventListener('blur', () => {
      if (!currentModalNoteId) return;
      const currentNote = getNoteById(currentModalNoteId);
      if (!currentNote) return;
      const newVal = reflectionTextarea.value;
      if (newVal === (currentNote.sections.reflection || '')) return;
      updateNote(currentModalNoteId, {
        sections: { ...currentNote.sections, reflection: newVal },
      });
      refreshCards();
    });
  }
  document.getElementById('modal-stars').innerHTML = renderStars(note.quality);
  document.getElementById('modal-quality-reason').textContent = note.qualityReason || '';
  document.getElementById('modal-tags').innerHTML = (Array.isArray(note.tags) ? note.tags : []).map(t =>
    `<span class="sticker-tag font-fredoka tracking-wide">${escapeHtml(t)}</span>`
  ).join('');

  // Source icon
  const sourceIcon = document.getElementById('modal-source-icon');
  sourceIcon.innerHTML = '<svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/></svg>';

  showModal('modal-detail');
  refreshDashboard();
}

function closeNoteDetail() {
  closeModal('modal-detail');
  currentModalNoteId = null;
}

function editNote() {
  if (!currentModalNoteId) return;
  const note = getNoteById(currentModalNoteId);
  if (!note) return;

  // 将核心观点和干货知识点变成可编辑 textarea（感悟区已是 textarea，聚焦即可）
  ['modal-core-points', 'modal-knowledge'].forEach(id => {
    const el = document.getElementById(id);
    const text = el.textContent;
    el.innerHTML = `<textarea class="w-full min-h-[80px] p-3 sm:p-4 text-sm sm:text-base border border-warm-200 rounded-xl outline-none focus:border-honey-400 focus:ring-2 focus:ring-honey-100 resize-y">${escapeHtml(text)}</textarea>`;
  });
  const refTextarea = document.querySelector('#modal-reflection textarea');
  if (refTextarea) refTextarea.focus();

  // 换编辑按钮为保存按钮
  const headerActions = document.querySelector('#modal-detail .flex.items-center.gap-2');
  const editBtn = headerActions.querySelector('button');
  if (editBtn && editBtn.textContent === '编辑') {
    editBtn.textContent = '保存';
    editBtn.onclick = saveNoteEdit;
  }
}

function saveNoteEdit() {
  if (!currentModalNoteId) return;

  const corePoints = document.querySelector('#modal-core-points textarea')?.value || '';
  const knowledge = document.querySelector('#modal-knowledge textarea')?.value || '';
  const reflection = document.querySelector('#modal-reflection textarea')?.value || '';

  updateNote(currentModalNoteId, {
    sections: { corePoints, knowledge, reflection },
  });

  // 恢复核心观点和知识点显示
  document.getElementById('modal-core-points').textContent = corePoints;
  document.getElementById('modal-knowledge').textContent = knowledge;
  // 感悟区恢复为 textarea
  document.getElementById('modal-reflection').innerHTML = `<textarea class="w-full min-h-[120px] p-3 sm:p-4 text-sm sm:text-base border-2 border-blue-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y bg-white font-noto leading-relaxed transition-colors" placeholder="在此记录你的个人感悟…">${escapeHtml(reflection)}</textarea>`;
  const refTextarea = document.querySelector('#modal-reflection textarea');
  if (refTextarea) {
    refTextarea.addEventListener('blur', () => {
      if (!currentModalNoteId) return;
      const currentNote = getNoteById(currentModalNoteId);
      if (!currentNote) return;
      const newVal = refTextarea.value;
      if (newVal === (currentNote.sections.reflection || '')) return;
      updateNote(currentModalNoteId, {
        sections: { ...currentNote.sections, reflection: newVal },
      });
      refreshCards();
    });
  }

  // 恢复按钮
  const headerActions = document.querySelector('#modal-detail .flex.items-center.gap-2');
  const saveBtn = headerActions.querySelector('button');
  if (saveBtn && saveBtn.textContent === '保存') {
    saveBtn.textContent = '编辑';
    saveBtn.onclick = editNote;
  }

  refreshCards();
  showToast('笔记已保存', 'success');
}

// ==================== CARD ACTIONS ====================

function togglePin(id) {
  const note = getNoteById(id);
  if (!note) return;
  updateNote(id, { isPinned: !note.isPinned });
  refreshCards();
  showToast(note.isPinned ? '已取消置顶' : '已置顶', 'success');
}

function toggleFavorite(id) {
  const note = getNoteById(id);
  if (!note) return;
  updateNote(id, { isFavorited: !note.isFavorited });
  refreshCards();
  showToast(note.isFavorited ? '已取消收藏' : '已收藏', 'success');
}

function deleteNoteConfirm(id) {
  if (!confirm('确定删除这条笔记吗？此操作不可恢复。')) return;
  deleteNote(id);
  closeNoteDetail();
  refreshCards();
  refreshDashboard();
  showToast('笔记已删除', 'success');
}

// ==================== CARD GRID REFRESH ====================

function refreshCards() {
  const notes = getFilteredNotes();
  renderCards(notes, false);
}

function getFilteredNotes() {
  let notes = getNotes();
  const searchText = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const searchScope = document.getElementById('search-scope')?.value || 'all';
  const filterTag = document.getElementById('filter-tag')?.value || 'all';
  const sortBy = document.getElementById('sort-by')?.value || 'newest';

  // Search
  if (searchText) {
    notes = notes.filter(n => {
      if (searchScope === 'title') {
        return n.title.toLowerCase().includes(searchText);
      }
      return (n.title + ' ' + n.content + ' ' + Object.values(n.sections).join(' '))
        .toLowerCase().includes(searchText);
    });
  }

  // Tag filter
  if (filterTag !== 'all') {
    notes = notes.filter(n => n.tags.includes(filterTag));
  }

  // Sort
  notes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    switch (sortBy) {
      case 'oldest': return a.createdAt - b.createdAt;
      case 'quality': return (b.quality || 0) - (a.quality || 0);
      case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
      default: return b.createdAt - a.createdAt; // newest
    }
  });

  return notes;
}

// ==================== DASHBOARD ====================

function refreshDashboard() {
  const notes = getNotes();
  const nowTs = now();
  const settings = getSettings();
  const interval = settings.reviewInterval * 24 * 60 * 60 * 1000;

  // 待复习：nextReviewAt <= now
  const reviewCount = notes.filter(n => n.nextReviewAt && n.nextReviewAt <= nowTs).length;
  document.getElementById('stat-review').textContent = reviewCount;

  // 总笔记
  document.getElementById('stat-total').textContent = notes.length;

  // 本月新增
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyCount = notes.filter(n => n.createdAt >= monthStart.getTime()).length;
  document.getElementById('stat-monthly').textContent = monthlyCount;

  // 平均质量
  if (notes.length > 0) {
    let total = 0;
    let count = 0;
    for (const n of notes) {
      const q = n.quality;
      if (Number.isFinite(q)) { total += q; count++; }
    }
    if (count > 0) {
      const avg = total / count;
      document.getElementById('stat-avg-quality').textContent = Number.isFinite(avg) ? avg.toFixed(1) : '-';
    } else {
      document.getElementById('stat-avg-quality').textContent = '-';
    }
  } else {
    document.getElementById('stat-avg-quality').textContent = '-';
  }
}

// ==================== MODALS ====================

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

// ==================== TOAST ====================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-warm-100 border-warm-200 text-warm-700 font-noto',
  };
  toast.className = `toast-in px-4 py-2.5 text-sm font-nunito border rounded-xl shadow-sm ${bgColors[type] || bgColors.info}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ==================== CATEGORY LIST RENDERING ====================

function renderCategoryList() {
  const container = document.getElementById('category-list');
  const categories = getCategories();
  container.innerHTML = categories.map(cat => `
    <div class="flex items-center justify-between p-3 bg-warm-100 rounded-xl group">
      <div class="flex items-center gap-3">
        <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${cat.color}"></span>
        <span class="text-sm font-noto text-warm-700 font-medium">${escapeHtml(cat.name)}</span>
      </div>
      <div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onclick="editCategory('${cat.id}')" class="w-8 h-8 flex items-center justify-center text-warm-400 hover:text-honey-500 rounded-full hover:bg-warm-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button onclick="deleteCategoryConfirm('${cat.id}')" class="w-8 h-8 flex items-center justify-center text-warm-400 hover:text-red-500 rounded-full hover:bg-warm-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function editCategory(id) {
  const cat = getCategories().find(c => c.id === id);
  if (!cat) return;
  const name = prompt('编辑分类名称：', cat.name);
  if (name && name.trim()) {
    updateCategory(id, { name: name.trim() });
    renderCategoryList();
    refreshTagFilter();
    showToast('分类已更新', 'success');
  }
}

function deleteCategoryConfirm(id) {
  if (!confirm('确定删除这个分类吗？')) return;
  deleteCategory(id);
  renderCategoryList();
  refreshTagFilter();
  showToast('分类已删除', 'success');
}

// ==================== TAG FILTER UPDATE ====================

function refreshTagFilter() {
  const select = document.getElementById('filter-tag');
  if (!select) return;
  const tags = new Set();
  getNotes().forEach(n => {
    if (Array.isArray(n.tags)) n.tags.forEach(t => tags.add(t));
  });

  select.innerHTML = '<option value="all">全部标签</option>'
    + [...tags].map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

// ==================== BATCH MOVE CATEGORY UPDATE ====================

function refreshBatchMoveCategories() {
  const select = document.getElementById('batch-move-category');
  const categories = getCategories();
  select.innerHTML = '<option value="">移动到分类…</option>'
    + categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

// ==================== UTILITY ====================

function formatStructuredText(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // **text** → <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // newlines → <br>
  html = html.replace(/\n/g, '<br>');
  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前';
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
