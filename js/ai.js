/**
 * 干货捞捞 — AI 处理引擎
 * 支持规则化处理（本地）和通义千问 API（后端）
 */

// ==================== CONFIG ====================

const AI_CONFIG = {
  // 后端服务地址（默认本地启动）
  serverUrl: 'http://localhost:8000',

  // 规则化模式关键词（作为离线 fallback）
  fillerPatterns: [
    /关注我[，,]\s*每天|点赞收藏|关注不迷路|一键三连|求关注|求点赞|扣1|弹幕|评论区/g,
    /广告|推广|恰饭|带货|限时优惠|点击下方链接|戳下方|点击购买/g,
    /(.)\1{4,}/g,
  ],

  corePointSignals: ['核心', '总结', '关键是', '最重要', '记住', '精髓', '本质', '底层', '归根结底', '一句话'],
  knowledgeSignals: ['知识点', '干货', '技巧', '方法', '步骤', '原理', '数据', '研究表明', '公式', '定义', '流程'],
  reflectionSignals: ['感悟', '启发', '思考', '我觉得', '我想到', '可以尝试', '以后', '结合', '实践'],

  tagLibrary: [
    { name: 'AI & 人工智能', keywords: ['ai', '人工智能', '机器学习', '深度学习', 'gpt', '大模型', 'llm', '算法', '神经网络'] },
    { name: '编程开发', keywords: ['编程', '代码', '开发', '程序员', '前端', '后端', 'python', 'js', 'java', '框架', 'api'] },
    { name: '产品设计', keywords: ['产品', '设计', '交互', 'ui', 'ux', '用户体验', '界面', '原型', 'figma'] },
    { name: '商业思维', keywords: ['商业', '创业', '商业模式', '盈利', '市场', '增长', '营销', '品牌', '融资'] },
    { name: '效率工具', keywords: ['效率', '工具', '插件', '快捷键', '自动化', '工作流', '生产力', '笔记'] },
    { name: '学习方法', keywords: ['学习', '记忆', '阅读', '笔记法', '思维导图', '费曼', '专注', '习惯'] },
    { name: '认知提升', keywords: ['认知', '思维', '逻辑', '批判', '元认知', '决策', '心理', '脑科学'] },
    { name: '职场成长', keywords: ['职场', '管理', '沟通', '领导力', '团队', '面试', '简历', '晋升'] },
    { name: '生活健康', keywords: ['健康', '睡眠', '饮食', '运动', '冥想', '心理', '情绪', '习惯'] },
    { name: '财经投资', keywords: ['投资', '理财', '股票', '基金', '经济', '财务', '被动收入'] },
  ],
};

// ==================== MAIN PROCESSING ====================

/**
 * Process raw text through AI pipeline
 * 优先尝试后端 API，失败时 fallback 到规则化处理
 */
async function aiProcess(rawText, options = {}) {
  try {
    return await callBackendAPI(rawText, options);
  } catch (e) {
    console.warn('后端 AI 不可用，使用本地处理:', e.message);
    showToast('AI 服务不可用，已切换为本地处理', 'info');
  }
  return aiProcessLocal(rawText);
}


// ==================== BACKEND API CALL ====================

async function callBackendAPI(rawText, options = {}) {
  const settings = getSettings();
  const serverUrl = settings.serverUrl || AI_CONFIG.serverUrl;

  const response = await fetch(`${serverUrl}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText: rawText.trim(),
      sourceUrl: options.sourceUrl || '',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    title: data.title,
    content: data.content,
    sections: data.sections,
    quality: data.quality,
    qualityReason: data.qualityReason,
    tags: data.tags,
  };
}


// ==================== LOCAL RULE-BASED FALLBACK ====================

function aiProcessLocal(rawText) {
  const cleaned = cleanText(rawText);
  const sections = splitIntoSections(cleaned);
  const quality = assessQuality(cleaned, sections);
  const tags = recommendTags(cleaned, sections);

  return {
    title: extractTitle(cleaned),
    content: cleaned,
    sections,
    quality: quality.score,
    qualityReason: quality.reason,
    tags,
  };
}

// ==================== TEXT CLEANING ====================

function cleanText(text) {
  if (!text || !text.trim()) return '';

  let cleaned = text.trim();

  AI_CONFIG.fillerPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  cleaned = cleaned.replace(/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/gmu, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.split('\n').map(l => l.trim()).join('\n');

  return cleaned.trim();
}

// ==================== TITLE EXTRACTION ====================

function extractTitle(text) {
  if (!text) return '未命名笔记';
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '未命名笔记';

  let title = lines[0].trim();
  title = title.replace(/^(#+\s*|【|《|「)/, '').replace(/(】|》|」)$/, '');

  if (title.length > 60) {
    title = title.substring(0, 60) + '…';
  }

  return title || '未命名笔记';
}

// ==================== SECTION SPLITTING ====================

function splitIntoSections(text) {
  const result = { corePoints: '', knowledge: '', reflection: '' };
  if (!text) return result;

  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return result;

  const coreLines = [];
  const knowledgeLines = [];
  const reflectionLines = [];

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const coreScore = AI_CONFIG.corePointSignals.filter(s => lower.includes(s)).length;
    const knowScore = AI_CONFIG.knowledgeSignals.filter(s => lower.includes(s)).length;
    const reflScore = AI_CONFIG.reflectionSignals.filter(s => lower.includes(s)).length;

    if (coreScore > knowScore && coreScore > reflScore) {
      coreLines.push(line);
    } else if (knowScore > coreScore && knowScore > reflScore) {
      knowledgeLines.push(line);
    } else if (reflScore > coreScore && reflScore > knowScore) {
      reflectionLines.push(line);
    } else if (coreScore > 0) {
      coreLines.push(line);
    } else if (knowScore > 0) {
      knowledgeLines.push(line);
    } else {
      knowledgeLines.push(line);
    }
  });

  const total = lines.length;
  if (coreLines.length === 0 && total >= 2) {
    const split = Math.max(1, Math.floor(total * 0.25));
    coreLines.push(...lines.slice(0, split).filter(l => !knowledgeLines.includes(l)));
  }
  if (reflectionLines.length === 0) {
    const split = Math.max(1, Math.floor(total * 0.25));
    const candidates = lines.slice(-split).filter(l => !coreLines.includes(l) && !knowledgeLines.includes(l));
    if (candidates.length > 0) reflectionLines.push(...candidates);
  }

  result.corePoints = coreLines.join('\n') || '（待补充核心观点）';
  result.knowledge = knowledgeLines.join('\n') || '（待补充干货知识点）';
  result.reflection = reflectionLines.join('\n') || '（在此记录你的个人感悟）';

  return result;
}

// ==================== QUALITY ASSESSMENT ====================

function assessQuality(text, sections) {
  let score = 0;
  const reasons = [];

  const len = text.length;
  if (len > 500) { score += 0.75; reasons.push('内容丰富'); }
  else if (len > 200) { score += 0.45; reasons.push('内容适中'); }
  else if (len > 50) { score += 0.15; reasons.push('内容较短'); }
  else { reasons.push('内容过短'); }

  let structureScore = 0;
  if (sections.corePoints && sections.corePoints.length > 20) structureScore += 0.5;
  if (sections.knowledge && sections.knowledge.length > 30) structureScore += 0.5;
  if (sections.reflection && sections.reflection.length > 20) structureScore += 0.25;
  score += structureScore;
  if (structureScore >= 1) reasons.push('结构完整');
  else if (structureScore >= 0.5) reasons.push('结构一般');

  const punctuationCount = (text.match(/[，,。、；;：:！!？?]/g) || []).length;
  const density = len > 0 ? punctuationCount / len : 0;
  if (density > 0.05) { score += 0.6; reasons.push('信息密度高'); }
  else if (density > 0.02) { score += 0.4; reasons.push('信息密度适中'); }
  else { score += 0.1; reasons.push('信息密度低'); }

  const promoSignals = ['关注', '点赞', '收藏', '转发', '加微信', '扫码', '下单', '购买', '优惠', '限时', '私信'];
  const promoCount = promoSignals.filter(s => text.includes(s)).length;
  if (promoCount >= 5) { score += 0; reasons.push('疑似营销内容'); }
  else if (promoCount >= 2) { score += 0.3; reasons.push('含少量推广信息'); }
  else { score += 1; reasons.push('无营销痕迹'); }

  const qualityKeywords = ['原理', '方法论', '底层', '本质', '核心', '数据', '研究', '实践', '案例', '总结', '框架', '模型', '公式', '定义', '步骤'];
  const qualityCount = qualityKeywords.filter(k => text.includes(k)).length;
  if (qualityCount >= 5) { score += 1; reasons.push('干货关键词丰富'); }
  else if (qualityCount >= 2) { score += 0.6; reasons.push('含部分干货'); }
  else { score += 0.2; }

  const stars = Math.max(1, Math.min(5, Math.round(score)));

  let typeHint = '';
  if (stars <= 2) typeHint = '疑似水文/广告';
  else if (stars === 3) typeHint = '一般内容';
  else if (stars === 4) typeHint = '优质干货';
  else typeHint = '深度好文';

  return {
    score: stars,
    reason: reasons.join('；') + '。' + (typeHint ? `综合判定：${typeHint}` : ''),
  };
}

// ==================== TAG RECOMMENDATION ====================

function recommendTags(text, sections) {
  const fullText = (text + ' ' + sections.corePoints + ' ' + sections.knowledge).toLowerCase();
  const scored = AI_CONFIG.tagLibrary.map(tag => {
    const hits = tag.keywords.filter(kw => fullText.includes(kw.toLowerCase()));
    return { name: tag.name, score: hits.length };
  });
  const top = scored.filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (top.length === 0) return ['其他'];
  return top.map(t => t.name);
}

// ==================== PROCESSING WITH PROGRESS ====================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function aiProcessWithDelay(rawText, options = {}) {
  try {
    window.dispatchEvent(new CustomEvent('ai-step', { detail: { step: '正在连接 AI 服务…', progress: 0.1 } }));
    const result = await callBackendAPI(rawText, options);
    window.dispatchEvent(new CustomEvent('ai-step', { detail: { step: '内容已整理完成！', progress: 1 } }));
    return result;
  } catch (e) {
    console.warn('后端 AI 不可用，切换本地处理:', e.message);
    showToast('AI 服务未启动，使用本地处理', 'info');
  }

  const steps = ['正在提取正文内容…', '正在过滤广告和无效信息…', '正在拆解核心观点与干货…', '正在评估内容质量和价值…', '正在推荐分类标签…'];
  for (let i = 0; i < steps.length; i++) {
    await sleep(500);
    window.dispatchEvent(new CustomEvent('ai-step', { detail: { step: steps[i], progress: (i + 1) / steps.length } }));
  }

  return aiProcessLocal(rawText);
}
