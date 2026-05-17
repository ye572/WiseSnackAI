/**
 * 干货捞捞 — 导出模块
 * 支持 TXT / Markdown 格式导出
 */

function exportNoteAsTXT(note) {
  const q = (typeof safeQuality === 'function') ? safeQuality(note.quality) : 0;
  const lines = [
    `标题：${note.title}`,
    `时间：${formatFullTime(note.createdAt)}`,
    `来源：链接导入`,
    note.sourceUrl ? `原文链接：${note.sourceUrl}` : '',
    `质量评分：${'★'.repeat(q)}${'☆'.repeat(5 - q)}`,
    note.qualityReason ? `评分理由：${note.qualityReason}` : '',
    (Array.isArray(note.tags) && note.tags.length) ? `标签：${note.tags.join('、')}` : '',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '  核心观点',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    note.sections.corePoints || '（暂无）',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '  干货知识点',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    note.sections.knowledge || '（暂无）',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '  个人感悟区',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    note.sections.reflection || '（暂无）',
    '',
    '---',
    `由 干货捞捞 导出 · ${formatFullTime(now())}`,
  ].filter(l => l !== '').join('\n');

  downloadFile(`${sanitizeFilename(note.title)}.txt`, lines, 'text/plain');
}

function exportNoteAsMarkdown(note) {
  const q = (typeof safeQuality === 'function') ? safeQuality(note.quality) : 0;
  const stars = '★'.repeat(q) + '☆'.repeat(5 - q);

  const lines = [
    `# ${note.title}`,
    '',
    `> 创建时间：${formatFullTime(note.createdAt)}  `,
    `> 来源：链接导入  `,
    `> 质量评分：${stars}  `,
    (Array.isArray(note.tags) && note.tags.length) ? `> 标签：${note.tags.map(t => '`' + t + '`').join(' ')}  ` : '',
    note.qualityReason ? `> ${note.qualityReason}  ` : '',
    note.sourceUrl ? `> 原文链接：[${note.sourceUrl}](${note.sourceUrl})  ` : '',
    '',
    '---',
    '',
    '## 核心观点',
    '',
    note.sections.corePoints || '（暂无）',
    '',
    '## 干货知识点',
    '',
    note.sections.knowledge || '（暂无）',
    '',
    '## 个人感悟区',
    '',
    note.sections.reflection || '（暂无）',
    '',
    '---',
    '',
    `*由 [干货捞捞] 导出 · ${formatFullTime(now())}*`,
  ].join('\n');

  downloadFile(`${sanitizeFilename(note.title)}.md`, lines, 'text/markdown');
}

// ==================== BULK EXPORT ====================

function exportAllAsJSON() {
  const data = exportAllData();
  const json = JSON.stringify(data, null, 2);
  downloadFile(`干货捞捞_备份_${formatDate(now())}.json`, json, 'application/json');
}

function importFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const success = importAllData(e.target.result);
    if (success) {
      refreshCards();
      refreshDashboard();
      refreshTagFilter();
      showToast('数据导入成功！', 'success');
    } else {
      showToast('数据格式错误，导入失败', 'error');
    }
  };
  reader.onerror = () => {
    showToast('文件读取失败', 'error');
  };
  reader.readAsText(file);
}

// ==================== HELPERS ====================

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100) || '未命名笔记';
}

function formatFullTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
