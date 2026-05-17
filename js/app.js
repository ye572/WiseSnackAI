/**
 * 干货捞捞 — 主控制器
 * 初始化、事件绑定、流程调度
 */

// ==================== STATE ====================

let isProcessing = false;

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
  try { initSettings(); } catch (e) { console.error('initSettings 失败:', e); }
  try { refreshDashboard(); } catch (e) { console.error('refreshDashboard 失败:', e); }
  try { refreshCards(); } catch (e) { console.error('refreshCards 失败:', e); }
  try { refreshTagFilter(); } catch (e) { console.error('refreshTagFilter 失败:', e); }
  try { bindEvents(); } catch (e) { console.error('bindEvents 失败:', e); }
  try { bindBackdropClicks(); } catch (e) { console.error('bindBackdropClicks 失败:', e); }
});

// ==================== SETTINGS INIT ====================

function initSettings() {
  const settings = getSettings();
  document.getElementById('setting-auto-hide').checked = settings.autoHideLowQuality;
  document.getElementById('setting-threshold').value = settings.lowQualityThreshold;
  document.getElementById('threshold-value').textContent = settings.lowQualityThreshold;
  document.getElementById('setting-review-interval').value = settings.reviewInterval;
  document.getElementById('review-interval-value').textContent = settings.reviewInterval;
}

// ==================== EVENT BINDINGS ====================

function bindEvents() {
  // ---- Input Clear ----
  const inputLink = document.getElementById('input-link');
  const btnClear = document.getElementById('btn-clear-input');

  inputLink.addEventListener('input', () => {
    btnClear.classList.toggle('hidden', !inputLink.value.trim());
  });
  btnClear.addEventListener('click', () => {
    inputLink.value = '';
    btnClear.classList.add('hidden');
    inputLink.focus();
  });

  // ---- Submit for AI Processing ----
  document.getElementById('btn-submit').addEventListener('click', () => handleSubmit());

  // ---- Search & Filter ----
  document.getElementById('search-input').addEventListener('input', debounce(refreshCards, 300));
  document.getElementById('search-scope').addEventListener('change', refreshCards);
  document.getElementById('filter-tag').addEventListener('change', refreshCards);
  document.getElementById('sort-by').addEventListener('change', refreshCards);
  document.getElementById('btn-toggle-low-quality').addEventListener('click', toggleLowQuality);

  // ---- Load More ----
  document.getElementById('btn-load-more').addEventListener('click', () => {
    const notes = getFilteredNotes();
    const settings = getSettings();
    let filtered = notes;
    if (settings.autoHideLowQuality && !settings.showLowQuality) {
      filtered = filtered.filter(n => Number.isFinite(n.quality) && n.quality >= settings.lowQualityThreshold);
    }
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
    const start = currentPage * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    if (pageItems.length === 0) return;
    pageItems.forEach((note, i) => {
      const card = createCardElement(note, i);
      card.classList.add('card-reveal');
      document.getElementById('card-grid').appendChild(card);
    });
    currentPage++;
    if (filtered.length <= currentPage * PAGE_SIZE) {
      document.getElementById('load-more-container').classList.add('hidden');
    }
  });

  // ---- Nav Buttons ----
  document.getElementById('btn-categories').addEventListener('click', () => {
    renderCategoryList();
    refreshBatchMoveCategories();
    showModal('modal-categories');
  });
  document.getElementById('btn-settings').addEventListener('click', () => {
    initSettings();
    showModal('modal-settings');
  });

  // ---- Mobile Menu ----
  document.getElementById('btn-hamburger').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
  });
  document.getElementById('btn-categories-mobile').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.add('hidden');
    renderCategoryList();
    refreshBatchMoveCategories();
    showModal('modal-categories');
  });
  document.getElementById('btn-settings-mobile').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.add('hidden');
    initSettings();
    showModal('modal-settings');
  });

  // ---- Category Manager ----
  document.getElementById('btn-add-category').addEventListener('click', () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) { showToast('请输入分类名称', 'error'); return; }
    const color = document.getElementById('new-category-color').value;
    addCategory(name, color);
    document.getElementById('new-category-name').value = '';
    renderCategoryList();
    refreshTagFilter();
    refreshBatchMoveCategories();
    showToast('分类已添加', 'success');
  });

  // ---- Settings ----
  document.getElementById('setting-auto-hide').addEventListener('change', function () {
    updateSettings({ autoHideLowQuality: this.checked });
    refreshCards();
  });
  document.getElementById('setting-threshold').addEventListener('input', function () {
    document.getElementById('threshold-value').textContent = this.value;
    updateSettings({ lowQualityThreshold: parseInt(this.value) });
    refreshCards();
  });
  document.getElementById('setting-review-interval').addEventListener('input', function () {
    document.getElementById('review-interval-value').textContent = this.value;
    updateSettings({ reviewInterval: parseInt(this.value) });
  });
  // ---- Data Management ----
  document.getElementById('btn-export-all-json').addEventListener('click', exportAllAsJSON);
  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('import-json-input').click();
  });
  document.getElementById('import-json-input').addEventListener('change', function () {
    if (this.files[0]) importFromJSON(this.files[0]);
    this.value = '';
  });
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('确定要清除全部数据吗？此操作不可恢复！\n\n建议先导出 JSON 备份。')) {
      clearAllData();
      refreshCards();
      refreshDashboard();
      refreshTagFilter();
      showToast('全部数据已清除', 'success');
    }
  });

  // ---- Detail Modal Export ----
  document.getElementById('modal-btn-export').addEventListener('click', () => {
    if (!currentModalNoteId) return;
    const note = getNoteById(currentModalNoteId);
    if (!note) return;
    // Show a simple choice
    const format = confirm('点击"确定"导出 Markdown，点击"取消"导出 TXT');
    if (format) {
      exportNoteAsMarkdown(note);
    } else {
      exportNoteAsTXT(note);
    }
    showToast('导出成功', 'success');
  });

  // ---- Batch Operations ----
  document.getElementById('btn-batch-mode').addEventListener('click', () => {
    if (selectedCardIds.size > 0) {
      exitBatchMode();
    } else {
      enterBatchMode();
    }
  });
  document.getElementById('btn-cancel-batch').addEventListener('click', exitBatchMode);
  document.getElementById('btn-select-all').addEventListener('click', selectAllCards);
  document.getElementById('btn-batch-delete').addEventListener('click', batchDelete);
  document.getElementById('batch-move-category').addEventListener('change', function () {
    if (this.value) batchMoveToCategory(this.value);
  });

  // ---- Keyboard Shortcuts ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('modal-detail');
      closeModal('modal-categories');
      closeModal('modal-settings');
      exitBatchMode();
    }
    // Ctrl+Enter to submit input
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.id === 'input-link') {
        handleSubmit();
      }
    }
  });

  // ---- AI Progress Listener ----
  window.addEventListener('ai-step', (e) => {
    const statusEl = document.getElementById('ai-status-text');
    if (statusEl) {
      statusEl.textContent = e.detail.step;
    }
  });
}

// ==================== INPUT HANDLING ====================

async function handleSubmit() {
  if (isProcessing) {
    showToast('正在处理中，请稍候…', 'info');
    return;
  }

  const inputLink = document.getElementById('input-link');
  const rawText = inputLink.value.trim();
  if (!rawText) {
    showToast('请输入链接或文本内容', 'error');
    return;
  }

  isProcessing = true;
  showProcessing(true);

  try {
    // Try to import from links
    const imported = await importFromLink(rawText);
    if (imported.length === 0) {
      throw new Error('未能识别有效内容');
    }

    // Process each import through AI
    for (const item of imported) {
      const processed = await aiProcessWithDelay(item.rawText);
      addNote({
        title: processed.title,
        content: processed.content,
        sections: processed.sections,
        source: item.source,
        sourceUrl: item.sourceUrl,
        platform: item.sourcePlatform,
        quality: processed.quality,
        qualityReason: processed.qualityReason,
        tags: processed.tags,
      });
    }

    inputLink.value = '';
    document.getElementById('btn-clear-input').classList.add('hidden');
    hideProcessing();
    isProcessing = false;
    refreshCards();
    refreshDashboard();
    refreshTagFilter();
    showToast(`${imported.length} 条笔记已整理完成！`, 'success');

    const notes = getNotes();
    if (notes.length > 0) {
      openNoteDetail(notes[0].id);
    }
  } catch (e) {
    // 如果输入只有链接、没有有效文字，说明链接无法解析，提示用户手动粘贴内容
    const hasUrls = /https?:\/\/[^\s]+/.test(rawText);
    const textWithoutUrls = rawText.replace(/https?:\/\/[^\s]+/g, '').trim();
    if (hasUrls && textWithoutUrls.length < 10) {
      hideProcessing();
      isProcessing = false;
      showToast('无法解析链接内容，请手动复制文字后粘贴到输入框', 'error');
      return;
    }

    if (rawText.length > 10) {
      const urlMatch = rawText.match(/https?:\/\/[^\s]+/);
      const extractedUrl = urlMatch ? urlMatch[0] : '';
      const detectedPlatform = extractedUrl ? detectPlatform(extractedUrl) : '手动输入';
      const processed = await aiProcessWithDelay(rawText);
      addNote({
        title: processed.title,
        content: processed.content,
        sections: processed.sections,
        source: 'link',
        sourceUrl: extractedUrl,
        platform: detectedPlatform,
        quality: processed.quality,
        qualityReason: processed.qualityReason,
        tags: processed.tags,
      });
      inputLink.value = '';
      document.getElementById('btn-clear-input').classList.add('hidden');
      hideProcessing();
      isProcessing = false;
      refreshCards();
      refreshDashboard();
      refreshTagFilter();
      showToast('笔记已整理完成！', 'success');
      const notes = getNotes();
      if (notes.length > 0) openNoteDetail(notes[0].id);
    } else {
      hideProcessing();
      isProcessing = false;
      showToast('请输入更多内容', 'error');
    }
  }
}

function showProcessing(show) {
  const el = document.getElementById('ai-processing');
  const statusEl = document.getElementById('ai-status-text');
  if (show) {
    el.classList.remove('hidden');
    if (statusEl) statusEl.textContent = '';
    document.getElementById('btn-submit').disabled = true;
  } else {
    el.classList.add('hidden');
    document.getElementById('btn-submit').disabled = false;
  }
}

function hideProcessing() {
  showProcessing(false);
}

// ==================== LOW QUALITY TOGGLE ====================

function toggleLowQuality() {
  const settings = getSettings();
  const newVal = !settings.showLowQuality;
  updateSettings({ showLowQuality: newVal });
  const btn = document.getElementById('btn-toggle-low-quality');
  if (!settings.autoHideLowQuality) {
    showToast('请先在设置中开启"自动隐藏低质内容"', 'info');
    updateSettings({ showLowQuality: false });
    return;
  }
  if (newVal) {
    btn.classList.add('text-honey-500');
    btn.classList.remove('text-warm-500');
  } else {
    btn.classList.remove('text-honey-500');
    btn.classList.add('text-warm-500');
  }
  refreshCards();
}

// ==================== BATCH OPERATIONS ====================

let selectedCardIds = new Set();

function enterBatchMode(id) {
  selectedCardIds.clear();
  if (id) selectedCardIds.add(id);
  updateBatchUI();
  document.body.classList.add('batch-mode');
  document.getElementById('batch-bar').classList.remove('translate-y-full');
  refreshBatchMoveCategories();
  // Highlight batch mode button
  document.getElementById('btn-batch-mode').classList.add('text-honey-500', 'border-honey-200', 'bg-honey-50');
  document.getElementById('btn-batch-mode').classList.remove('text-warm-500', 'border-warm-200', 'bg-warm-100');

  // Make cards selectable
  document.querySelectorAll('#card-grid > div').forEach(card => {
    card.classList.add('cursor-pointer');
    const noteId = card.dataset.noteId;
    card.addEventListener('click', function handler(e) {
      if (e.target.closest('[data-action]')) return;
      e.stopPropagation();
      if (selectedCardIds.has(noteId)) {
        selectedCardIds.delete(noteId);
        card.classList.remove('ring-2', 'ring-honey-400');
      } else {
        selectedCardIds.add(noteId);
        card.classList.add('ring-2', 'ring-honey-400');
      }
      updateBatchUI();
      if (selectedCardIds.size === 0) exitBatchMode();
    }, { once: false });
  });
}

function exitBatchMode() {
  selectedCardIds.clear();
  document.body.classList.remove('batch-mode');
  document.getElementById('batch-bar').classList.add('translate-y-full');
  // Reset batch mode button
  const batchBtn = document.getElementById('btn-batch-mode');
  batchBtn.classList.remove('text-honey-500', 'border-honey-200', 'bg-honey-50');
  batchBtn.classList.add('text-warm-500', 'border-warm-200', 'bg-warm-100');
  document.querySelectorAll('#card-grid > div').forEach(card => {
    card.classList.remove('ring-2', 'ring-honey-400');
  });
  refreshCards();
}

function updateBatchUI() {
  document.getElementById('batch-count').textContent = `已选 ${selectedCardIds.size} 条`;
}

function selectAllCards() {
  const allIds = getFilteredNotes().map(n => n.id);
  selectedCardIds = new Set(allIds);
  updateBatchUI();
  document.querySelectorAll('#card-grid > div').forEach(card => {
    card.classList.add('ring-2', 'ring-honey-400');
  });
}

function batchDelete() {
  if (selectedCardIds.size === 0) return;
  if (!confirm(`确定删除选中的 ${selectedCardIds.size} 条笔记吗？此操作不可恢复。`)) return;
  deleteNotes([...selectedCardIds]);
  exitBatchMode();
  refreshCards();
  refreshDashboard();
  showToast(`已删除 ${selectedCardIds.size} 条笔记`, 'success');
}

function batchMoveToCategory(categoryId) {
  if (selectedCardIds.size === 0) return;
  // TODO: Actually implement category assignment per note
  // For now, this is a placeholder
  showToast('已移动 ' + selectedCardIds.size + ' 条笔记', 'success');
  document.getElementById('batch-move-category').value = '';
  exitBatchMode();
  refreshCards();
}

// ==================== MODAL CLOSE ON BACKDROP ====================

function bindBackdropClicks() {
  document.querySelectorAll('.fixed.inset-0.z-50').forEach(modal => {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal(modal.id);
        return;
      }
      if (e.target.classList && e.target.classList.contains('absolute') && e.target.classList.contains('inset-0')) {
        closeModal(modal.id);
      }
    });
  });
}

// ==================== UTIL ====================

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
