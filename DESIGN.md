---
version: beta
name: WiseSnack · 干货捞捞
description: 轻量化 AI 碎片知识整理工具，视觉基调"暖调纸本"——低饱和暖奶油底色 + 纸纹纹理 + 行草手写标题 + 圆润无衬线正文，亲和温润如一本好笔记本。单一蜂蜜琥珀强调色贯穿交互节点，卡片异形圆角（左上锐利、其余圆润），SVG 噪点纹理铺底，交错入场动画赋予手作感。字体选用 Caveat (Hero 手写) + Fredoka (标题) + Nunito (正文)，彻底避开 Inter / Roboto 等 AI 套版字族。
---

colors:
  # 暖调灰棕 —— 替代 stone，低饱和、有温度
  warm-50:  "#fdfaf5"   # 页底色（暖奶油，非纯白）
  warm-100: "#f8f4ed"   # 浅表面
  warm-200: "#eee7db"   # 分割线 / hover 背景
  warm-300: "#ddd1c0"   # 边框强调
  warm-400: "#b8a898"   # 弱化文字
  warm-500: "#8c7b6e"   # 正文灰
  warm-600: "#6b5d52"   # 次要标题
  warm-700: "#4a3f35"   # 主文字
  warm-800: "#3d3226"   # 标题
  warm-900: "#2d2318"   # 最深（极少用）

  # 蜂蜜琥珀 —— 替代 amber，低饱和、温润不刺眼
  honey-50:  "#fef8f0"   # 浅蜂蜜底
  honey-100: "#fdf0e0"   # 标签底
  honey-200: "#fbdfbc"   # 分割条
  honey-300: "#f5c48c"   # 装饰元素
  honey-400: "#e8a860"   # 主强调色（按钮、星级、链接）
  honey-500: "#d4913e"   # hover/active
  honey-600: "#b8782a"   # 深蜂蜜（标签文字）

  # 语义色
  error:      "#dc2626"
  error-hover:"#b91c1c"
  legal-link: "#6366f1"

  # 基础
  canvas:     "#fdfaf5"   # 页底 = warm-50
  white:      "#ffffff"   # 卡片/导航浮层
  scrim:      "#000000"   # 遮罩（50% opacity）

typography:
  # Hero 主标题
  hero:
    fontFamily: "'Caveat', cursive"
    fontSize: "36px~60px (4xl~6xl)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "wide"
    wordSpacing: "0.12em"

  # 模块标题（导航、卡片标题、弹窗标题）
  heading:
    fontFamily: "'Fredoka', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px~18px"
    fontWeight: 500~600
    lineHeight: 1.35

  # 正文
  body:
    fontFamily: "'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "13px~16px"
    fontWeight: 400
    lineHeight: 1.55

  # 小字 / 元信息
  caption:
    fontFamily: "'Nunito', sans-serif"
    fontSize: "11px~13px"
    fontWeight: 400~500
    lineHeight: 1.4

rounded:
  card:     "4px 18px 18px 18px"   # 异形圆角：左上锐利，其余圆润
  button:   12px
  pill:     9999px
  modal:    16px
  input:    12px

spacing:
  xs:   4px
  sm:   8px
  md:   12px
  base: 16px
  lg:   24px
  xl:   32px
  xxl:  48px
  section: 64px

shadows:
  card-hover: "0 8px 32px rgba(61,50,38,0.06), 0 1px 0 rgba(0,0,0,0.04)"

textures:
  paper-noise:
    type: "SVG feTurbulence (fractalNoise)"
    opacity: 0.03
    placement: "body::before, fixed, inset-0"

animations:
  card-reveal:
    property: "opacity + translateY + scale"
    from: "opacity:0, translateY(24px), scale(0.98)"
    to:   "opacity:1, translateY(0), scale(1)"
    duration: 0.5s
    easing: ease
    stagger: 0.05s per card

  hero-float:
    property: "translateY"
    range: "0 → -6px → 0"
    duration: 5s
    easing: ease-in-out
    iteration: infinite

  card-hover:
    property: "transform + border-color + box-shadow"
    lift: -2px
    border: "rgba(232,168,96,0.2)"
    duration: 0.3s

components:
  # Hero 主标题
  hero-title:
    font: "{typography.hero}"
    color: "{colors.warm-800} / brand-gradient"
    treatment: "Wise 实色深棕 + Snack 蜂蜜渐变 (honey-400 → honey-600)"
    decoration: "hero-glow 背景柔光 (radial-gradient, honey-400 20% → transparent 70%)"

  # 知识卡片
  note-card:
    background: "#fffdf9"
    border: "1px solid rgba(0,0,0,0.05)"
    borderRadius: "{rounded.card}"
    accent: "左上角 40px 琥珀渐变装饰线 (::before)"
    hover:
      transform: "translateY(-2px)"
      borderColor: "rgba(232,168,96,0.2)"
      shadow: "{shadows.card-hover}"
      accentWidth: "40px → 60px"

  # 主按钮
  button-primary:
    background: "{colors.honey-400}"
    textColor: "#ffffff"
    borderRadius: "{rounded.button}"
    fontWeight: 500
    hover: "{colors.honey-500}"

  # 星级
  star:
    filled: "{colors.honey-400}"
    empty: "{colors.warm-200}"

  # 标签
  tag:
    background: "{colors.honey-100}"
    textColor: "{colors.honey-600}"
    borderRadius: "{rounded.pill}"
    fontSize: "10px"
    fontWeight: 500

  # 输入框
  input:
    background: "{colors.warm-100}"
    border: "1px solid {colors.warm-200}"
    borderRadius: "{rounded.input}"
    focusBorder: "{colors.honey-400}"
    focusRing: "3px rgba(232,168,96,0.12)"

  # 页面分区线
  section-divider:
    width: 48px
    height: 3px
    background: "linear-gradient(90deg, {colors.honey-400}, {colors.honey-500})"

design-principles:
  - "避开 AI 套版字体：不用 Inter / Roboto / Arial / Space Grotesk"
  - "卡片不是白方块：异形圆角 + 装饰线 + 暖白底"
  - "底色有纹理：SVG 噪点模拟纸纹，不是纯色"
  - "动效有手作感：交错入场、轻柔浮动，不是僵硬的 fade-in"
  - "暖调低饱和全系统：文字 warm 系棕灰，强调 honey 系蜂蜜琥珀"
  - "字号克制：Hero 最大 6xl，正文 13~16px，不靠大字压阵"

responsive:
  mobile:  "< 640px — 导航汉堡菜单、卡片 1 列、弹窗全屏底部弹出"
  tablet:  "640~1024px — 导航展开、卡片 2 列、仪表盘 4 列"
  desktop: "1024~1440px — 卡片 3~4 列、内容区 1280px 居中"
  wide:    "> 1440px — 内容区 1400px 上限"
