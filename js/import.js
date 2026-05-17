/**
 * 干货捞捞 — 导入模块
 * 链接内容抓取
 */

// ==================== LINK IMPORT ====================

/**
 * Parse pasted links and try to extract content
 * 由于纯前端限制，跨域链接无法直接抓取，这里做最佳尝试：
 * - 识别链接类型（短视频 / 小红书 / 其他）
 * - 尝试通过 fetch 获取（同源或 CORS 允许时）
 * - 不可获取时提示用户手动粘贴内容
 */
async function importFromLink(urlText) {
  // 提取所有链接
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = urlText.match(urlPattern) || [];
  const textContent = urlText.replace(urlPattern, '').trim();

  const results = [];

  // 如果用户除了链接还粘贴了文本内容，优先使用文本
  if (textContent.length > 50) {
    results.push({
      source: 'link',
      sourceUrl: urls[0] || '',
      sourcePlatform: detectPlatform(urls[0] || ''),
      rawText: textContent,
    });
  }

  // 尝试抓取链接内容
  for (const url of urls) {
    try {
      const content = await fetchUrlContent(url);
      if (content) {
        results.push({
          source: 'link',
          sourceUrl: url,
          sourcePlatform: detectPlatform(url),
          rawText: content,
        });
      }
    } catch (e) {
      // 跨域不可达，跳过
      console.warn('无法抓取链接内容:', url, e.message);
    }
  }

  return results;
}

function detectPlatform(url) {
  if (!url) return '其他';
  const lower = url.toLowerCase();
  if (lower.includes('douyin.com') || lower.includes('tiktok.com') || lower.includes('iesdouyin.com')) return '短视频平台';
  if (lower.includes('xiaohongshu.com') || lower.includes('xhslink.com') || lower.includes('redbook.com')) return '小红书';
  if (lower.includes('bilibili.com') || lower.includes('b23.tv')) return 'B站';
  if (lower.includes('zhihu.com')) return '知乎';
  if (lower.includes('weixin.qq.com') || lower.includes('mp.weixin.qq.com')) return '微信公众号';
  return '网页链接';
}

async function fetchUrlContent(url) {
  // 尝试直接 fetch（仅当目标允许 CORS 时有效）
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'text/html, text/plain' },
    mode: 'cors',
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const html = await response.text();
  // 简单 HTML 到文本的转换
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // 移除 script/style
  tmp.querySelectorAll('script, style, nav, footer, header, aside').forEach(el => el.remove());
  return tmp.textContent.replace(/\s+/g, ' ').trim().substring(0, 5000);
}
