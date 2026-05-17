"""
干货捞捞 · WiseSnack — 后端服务
通义千问 (DashScope) AI 集成
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

# ---- 加载 .env ----
load_dotenv(Path(__file__).parent / ".env")

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
DASHSCOPE_MODEL = os.getenv("DASHSCOPE_MODEL", "qwen-plus")
PORT = int(os.getenv("PORT", "8000"))

# ---- 日志 ----
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wisesnack")

# ---- FastAPI ----
app = FastAPI(title="WiseSnack API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 通义千问客户端 ----
_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not DASHSCOPE_API_KEY:
            raise HTTPException(status_code=500, detail="API Key 未配置，请在 .env 中设置")
        _client = OpenAI(
            api_key=DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
    return _client


# ---- 模型定义 ----

class ProcessRequest(BaseModel):
    rawText: str
    sourceUrl: str = ""


class ProcessResponse(BaseModel):
    title: str
    content: str
    sections: dict
    quality: int
    qualityReason: str
    tags: list[str]



# ---- 提示词 ----

SYSTEM_PROMPT = """你是一个专业的知识整理助手，帮助用户将碎片化信息提炼为结构化、易阅读的笔记。

你的任务：
1. 过滤广告、求关注、营销话术等无价值内容
2. 将内容整理为三大板块，每板块使用清晰的结构化格式
3. 评估内容质量（1-5星）
4. 推荐1-3个分类标签

## 三板块格式要求（重要）

### corePoints（核心观点）
用编号列表，每条**加粗关键句**，格式如下：
1. **关键句** — 补充说明（如需要）
2. **关键句** — 补充说明
提取1-3条核心观点，每条15-30字。

### knowledge（干货知识点）
用短横线列表，每条包含一个具体可操作的知识点，**关键词加粗**，格式如下：
- **概念名称**：一句话解释，点明用途或原理
- **方法/技巧**：具体操作步骤
提取2-5个知识点，每条一行。

### reflection（个人感悟）
用行动导向的格式，帮助用户思考和应用：
- 💡 **启发**：一句话描述启发点
- 🎯 **行动建议**：具体可做的事情

## 输出格式
严格输出 JSON（不要 markdown 代码块）：

{
  "title": "提炼的标题（15字以内）",
  "content": "精简正文（100字以内，保留核心信息）",
  "sections": {
    "corePoints": "1. **观点一** — 说明\\n2. **观点二** — 说明",
    "knowledge": "- **概念**：解释\\n- **方法**：步骤",
    "reflection": "💡 **启发**：一句话\\n🎯 **行动**：具体建议"
  },
  "quality": 4,
  "qualityReason": "打分理由（20字）",
  "tags": ["标签1", "标签2"]
}

## 质量评分
1星=纯广告无价值 | 2星=废话多 | 3星=一般 | 4星=实用干货 | 5星=深度好文

## 标签
从以下选1-3个：AI & 人工智能、编程开发、产品设计、商业思维、效率工具、学习方法、认知提升、职场成长、生活健康、财经投资、其他

严格输出 JSON。"""



# ---- 路由 ----

@app.get("/api/health")
def health():
    backend_configured = bool(DASHSCOPE_API_KEY)
    return {
        "status": "ok",
        "model": DASHSCOPE_MODEL,
        "apiKeyConfigured": backend_configured,
        "hint": "OK" if backend_configured else "请设置 API Key（.env 或前端传入）",
    }


@app.post("/api/process", response_model=ProcessResponse)
async def process_text(req: ProcessRequest):
    """AI 处理原始文本，返回结构化笔记"""

    if not req.rawText.strip():
        raise HTTPException(status_code=400, detail="输入内容为空")

    trimmed = req.rawText.strip()[:6000]
    logger.info(f"处理请求，文本长度: {len(trimmed)}")

    try:
        ai = get_client()
        response = ai.chat.completions.create(
            model=DASHSCOPE_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"请整理以下内容：\n\n{trimmed}"},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        result_text = response.choices[0].message.content.strip()
        logger.info(f"AI 返回长度: {len(result_text)}")

        parsed = json.loads(result_text)

        return ProcessResponse(
            title=parsed.get("title", "未命名笔记"),
            content=parsed.get("content", trimmed),
            sections=parsed.get("sections", {}),
            quality=max(1, min(5, int(parsed.get("quality", 3)))),
            qualityReason=parsed.get("qualityReason", ""),
            tags=parsed.get("tags", ["其他"])[:3],
        )

    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析失败: {result_text[:200] if 'result_text' in dir() else 'N/A'}")
        raise HTTPException(status_code=500, detail=f"AI 返回格式异常，请重试")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"AI 处理失败: {str(e)}")



# ---- 启动 ----

if __name__ == "__main__":
    import uvicorn
    logger.info(f"启动 WiseSnack 后端 → http://localhost:{PORT}")
    logger.info(f"模型: {DASHSCOPE_MODEL}")
    logger.info(f"API Key 已配置: {'是' if DASHSCOPE_API_KEY else '否 — 请编辑 .env 文件'}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
