/**
 * 干货捞捞 — 数据存储层
 * LocalStorage CRUD 封装，管理 notes / categories / settings
 */

const STORE_KEYS = {
  notes: 'ghll_notes',
  categories: 'ghll_categories',
  settings: 'ghll_settings',
};

// ==================== HELPERS ====================

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

function now() {
  return Date.now();
}

function safeQuality(q) {
  if (typeof q === 'string') {
    const parsed = parseFloat(q);
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(5, Math.round(parsed)));
  }
  if (!Number.isFinite(q)) return 3;
  return Math.max(1, Math.min(5, Math.round(q)));
}

function sanitizeNote(n) {
  if (!n || typeof n !== 'object') return null;
  return {
    id: n.id || uid(),
    title: typeof n.title === 'string' ? n.title : '未命名笔记',
    content: typeof n.content === 'string' ? n.content : '',
    sections: {
      corePoints: typeof n.sections?.corePoints === 'string' ? n.sections.corePoints : '',
      knowledge: typeof n.sections?.knowledge === 'string' ? n.sections.knowledge : '',
      reflection: typeof n.sections?.reflection === 'string' ? n.sections.reflection : '',
    },
    source: n.source || 'link',
    sourceUrl: typeof n.sourceUrl === 'string' ? n.sourceUrl : '',
    platform: typeof n.platform === 'string' ? n.platform : '网页链接',
    quality: safeQuality(n.quality),
    qualityReason: typeof n.qualityReason === 'string' ? n.qualityReason : '',
    tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [],
    isPinned: Boolean(n.isPinned),
    isFavorited: Boolean(n.isFavorited),
    isHidden: Boolean(n.isHidden),
    createdAt: Number.isFinite(n.createdAt) ? n.createdAt : now(),
    updatedAt: Number.isFinite(n.updatedAt) ? n.updatedAt : now(),
    viewCount: Number.isFinite(n.viewCount) ? n.viewCount : 0,
    lastViewedAt: Number.isFinite(n.lastViewedAt) ? n.lastViewedAt : null,
    nextReviewAt: Number.isFinite(n.nextReviewAt) ? n.nextReviewAt : (now() + 3 * 24 * 60 * 60 * 1000),
  };
}

// ==================== NOTES ====================

function getNotes() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEYS.notes));
    if (!Array.isArray(raw)) return [];
    let needsSave = false;
    const sanitized = raw.map(n => {
      const s = sanitizeNote(n);
      if (!s) { needsSave = true; return null; }
      if (s.quality !== safeQuality(n.quality) || s.createdAt !== n.createdAt) {
        needsSave = true;
      }
      return s;
    }).filter(Boolean);
    if (needsSave) {
      saveNotes(sanitized);
    }
    return sanitized;
  } catch (e) {
    return [];
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(STORE_KEYS.notes, JSON.stringify(notes));
  } catch (e) {
    console.error('保存笔记失败，storage 可能已满:', e);
    showToast('保存失败，存储空间不足', 'error');
  }
}

function getNoteById(id) {
  return getNotes().find(n => n.id === id) || null;
}

function addNote(data) {
  const notes = getNotes();
  const note = {
    id: uid(),
    title: data.title || '未命名笔记',
    content: data.content || '',
    sections: {
      corePoints: data.sections?.corePoints || '',
      knowledge: data.sections?.knowledge || '',
      reflection: data.sections?.reflection || '',
    },
    source: data.source || 'link',
    sourceUrl: data.sourceUrl || '',
    platform: data.platform || '网页链接',
    quality: safeQuality(data.quality),
    qualityReason: data.qualityReason || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    isPinned: false,
    isFavorited: false,
    isHidden: false,
    createdAt: now(),
    updatedAt: now(),
    viewCount: 0,
    lastViewedAt: null,
    nextReviewAt: now() + 3 * 24 * 60 * 60 * 1000, // 3天后复习
  };
  notes.unshift(note);
  saveNotes(notes);
  return note;
}

function updateNote(id, updates) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return null;
  // Strip undefined values to prevent overwriting existing data with undefined
  const clean = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  if ('quality' in clean) {
    clean.quality = safeQuality(clean.quality);
  }
  notes[idx] = { ...notes[idx], ...clean, updatedAt: now() };
  saveNotes(notes);
  return notes[idx];
}

function deleteNote(id) {
  const notes = getNotes().filter(n => n.id !== id);
  saveNotes(notes);
}

function deleteNotes(ids) {
  const idSet = new Set(ids);
  const notes = getNotes().filter(n => !idSet.has(n.id));
  saveNotes(notes);
}

function recordView(id) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  notes[idx].viewCount = (notes[idx].viewCount || 0) + 1;
  notes[idx].lastViewedAt = now();
  saveNotes(notes);
}

// ==================== CATEGORIES ====================

const DEFAULT_CATEGORIES = [
  { id: 'cat-ai', name: 'AI & 技术', color: '#f59e0b' },
  { id: 'cat-design', name: '设计 & 创作', color: '#6366f1' },
  { id: 'cat-life', name: '生活 & 成长', color: '#10b981' },
  { id: 'cat-business', name: '商业 & 职场', color: '#3b82f6' },
  { id: 'cat-other', name: '其他', color: '#78716c' },
];

function getCategories() {
  try {
    const data = localStorage.getItem(STORE_KEYS.categories);
    return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(categories) {
  try {
    localStorage.setItem(STORE_KEYS.categories, JSON.stringify(categories));
  } catch (e) {
    console.error('保存分类失败:', e);
  }
}

function addCategory(name, color) {
  const categories = getCategories();
  const cat = { id: 'cat-' + uid(), name, color: color || '#f59e0b' };
  categories.push(cat);
  saveCategories(categories);
  return cat;
}

function updateCategory(id, updates) {
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  categories[idx] = { ...categories[idx], ...updates };
  saveCategories(categories);
  return categories[idx];
}

function deleteCategory(id) {
  const categories = getCategories().filter(c => c.id !== id);
  saveCategories(categories);
}

// ==================== SETTINGS ====================

const DEFAULT_SETTINGS = {
  autoHideLowQuality: false,
  lowQualityThreshold: 3,
  reviewInterval: 3, // 天
  showLowQuality: false, // 是否显示低质内容
  // AI 后端配置
  useRealAI: true,
  serverUrl: 'http://wisesnackai-production.up.railway.app',
};

function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORE_KEYS.settings)) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORE_KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

function updateSettings(updates) {
  const settings = getSettings();
  const merged = { ...settings, ...updates };
  saveSettings(merged);
  return merged;
}

// ==================== BULK EXPORT / IMPORT ====================

function exportAllData() {
  return {
    version: 1,
    exportedAt: now(),
    notes: getNotes(),
    categories: getCategories(),
    settings: getSettings(),
  };
}

function importAllData(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data.notes || !data.categories || !data.settings) {
      throw new Error('数据格式不正确');
    }
    saveNotes(data.notes);
    saveCategories(data.categories);
    saveSettings(data.settings);
    return true;
  } catch (e) {
    return false;
  }
}

function clearAllData() {
  localStorage.removeItem(STORE_KEYS.notes);
  localStorage.removeItem(STORE_KEYS.categories);
  localStorage.removeItem(STORE_KEYS.settings);
}
