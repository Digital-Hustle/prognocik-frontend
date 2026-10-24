// ЕДИНСТВЕННЫЙ источник дизайн-токенов ПрогноCIка (как ADR-033 в «Проходной»).
// Из него генерируются src/app/styles/theme.css (Tailwind 4 @theme) и таблицы в docs/DESIGN.md:
// `npm run gen:tokens`. Руками theme.css не правим. Motion берёт значения отсюда через ./motion.ts.
//
// Визуальный язык — со слайдов кейса Банка Центр-инвест: глубокий «лесной» зелёный (обложка), фирменный зелёный
// точек графика, кислотный лайм как акцент (кольцо на точке разрыва), тёплая «бумага» #F2F3EE вместо белого фона.
// Шрифты: Unbounded — заголовки и суммы (широкий гротеск, как «Контакты» на слайде), Onest — интерфейс.
// Только синтаксис, который стирается при strip-types: никаких enum/namespace/импортов.

/** Шкалы (сырые цвета). В компонентах НЕ используются — только через semantic. */
export const palette = {
	white: "#FFFFFF",
	black: "#06130D",
	forest: {
		950: "#0A1D15",
		900: "#0F2A20",
		850: "#123123",
		800: "#173B2B",
		700: "#1E4A36",
		600: "#2A5E46",
		400: "#5F7A6B",
		300: "#9FB2A6",
		100: "#EEF3EC",
	},
	green: {
		800: "#0F6430",
		700: "#127235",
		650: "#157F39",
		600: "#178A3E",
		500: "#21A24A",
		400: "#3DBE66",
		300: "#7FD89B",
		100: "#DDF2E3",
		50: "#EEF8F1",
	},
	lime: { 700: "#7E9A12", 600: "#A8CC1F", 500: "#CDF23A", 400: "#DBF66E", 100: "#F4FBD3" },
	paper: { 25: "#FBFBF8", 50: "#F8F9F4", 100: "#F2F3EE", 150: "#ECEEE6", 200: "#E3E6DC", 300: "#CFD5C7" },
	ink: { 900: "#14241B", 700: "#33443A", 600: "#5A695F", 400: "#8A968D" },
	red: { 900: "#3A1714", 800: "#A8281F", 700: "#C2362F", 400: "#FF8A7A", 300: "#FFB4A8", 100: "#FCE9E6" },
	amber: { 900: "#3A2A0E", 800: "#8A4F00", 700: "#9A5A00", 300: "#F2BE5C", 100: "#FFF2D9" },
	blue: { 900: "#16253D", 800: "#1F5FBF", 400: "#8AB4F8", 100: "#E7EFFC" },
	/** Мастер-цвета кейса Центр-инвест: иллюстрации, фон, графики */
	ci: { forest: "#0F2A20", green: "#21A24A", moss: "#2E6B4C", lime: "#CDF23A", paper: "#F2F3EE" },
} as const;

const p = palette;

/**
 * Семантические цвета → CSS-переменные `--<name>` и классы `bg-<name>`, `text-<name>` и т. д.
 * Пара `x` / `x-foreground` проверяется генератором на контраст WCAG (≥ 4.5:1).
 * Статусы — триадой: `-soft` (тинт-фон), `-soft-foreground` (текст на нём), `-border`.
 */
export const semantic = {
	light: {
		background: p.paper[100],
		foreground: p.ink[900],
		card: p.white,
		"card-foreground": p.ink[900],
		popover: p.white,
		"popover-foreground": p.ink[900],
		surface: p.paper[150], // дорожка сегментов, вторичные кнопки, утопленные блоки
		"surface-foreground": p.ink[900],
		"surface-hover": p.paper[200],
		muted: p.paper[50], // ховер строк, фон внутри карточек
		"muted-foreground": p.ink[600],
		"subtle-foreground": p.ink[400], // только иконки и неважные подписи
		border: p.paper[200],
		"border-strong": p.paper[300],
		input: p.paper[300],
		ring: p.green[500],
		primary: p.green[650],
		"primary-foreground": p.white,
		"primary-hover": p.green[700],
		brand: p.green[500], // фирменный зелёный: иконки, точки, крупный текст, графики
		lime: p.lime[500], // акцент: точка разрыва, «CI» в логотипе, выделение
		"lime-foreground": p.forest[900],
		hero: p.forest[900], // тёмные плитки-герои как обложка кейса
		"hero-foreground": p.paper[100],
		"hero-muted": p.forest[300],
		accent: p.green[50], // активный пункт, выделение
		"accent-foreground": p.green[700],
		success: p.green[500],
		"success-soft": p.green[100],
		"success-soft-foreground": p.green[800],
		"success-border": p.green[300],
		warning: p.amber[700],
		"warning-soft": p.amber[100],
		"warning-soft-foreground": p.amber[800],
		"warning-border": p.amber[300],
		danger: p.red[700],
		"danger-foreground": p.white,
		"danger-soft": p.red[100],
		"danger-soft-foreground": p.red[800],
		"danger-border": p.red[300],
		info: p.blue[800],
		"info-soft": p.blue[100],
		"info-soft-foreground": p.blue[800],
		"info-border": p.blue[400],
		inverse: p.forest[900],
		"inverse-foreground": p.paper[100],
		overlay: "rgb(15 42 32 / 0.42)",
		"chart-actual": p.ink[900],
		"chart-forecast": p.green[500],
		"chart-band": "rgb(33 162 74 / 0.16)",
		"chart-in": p.green[500],
		"chart-out": p.red[700],
		"chart-plan": p.ink[400],
		"chart-grid": p.paper[200],
		"chart-buffer": p.amber[700],
		"chart-lime": p.lime[600],
	},
	dark: {
		background: p.forest[950],
		foreground: p.forest[100],
		card: p.forest[900],
		"card-foreground": p.forest[100],
		popover: p.forest[850],
		"popover-foreground": p.forest[100],
		surface: p.forest[850],
		"surface-foreground": p.forest[100],
		"surface-hover": p.forest[800],
		muted: "#0D241B",
		"muted-foreground": p.forest[300],
		"subtle-foreground": p.forest[400],
		border: p.forest[800],
		"border-strong": p.forest[700],
		input: p.forest[700],
		ring: p.green[400],
		primary: p.green[400],
		"primary-foreground": p.black,
		"primary-hover": p.green[300],
		brand: p.green[400],
		lime: p.lime[500],
		"lime-foreground": p.forest[900],
		hero: p.forest[850],
		"hero-foreground": p.forest[100],
		"hero-muted": p.forest[300],
		accent: p.forest[800],
		"accent-foreground": p.green[300],
		success: p.green[400],
		"success-soft": "#133A24",
		"success-soft-foreground": p.green[300],
		"success-border": p.green[800],
		warning: p.amber[300],
		"warning-soft": p.amber[900],
		"warning-soft-foreground": p.amber[300],
		"warning-border": p.amber[800],
		danger: p.red[400],
		"danger-foreground": p.black,
		"danger-soft": p.red[900],
		"danger-soft-foreground": p.red[300],
		"danger-border": p.red[800],
		info: p.blue[400],
		"info-soft": p.blue[900],
		"info-soft-foreground": p.blue[400],
		"info-border": p.blue[800],
		inverse: p.forest[100],
		"inverse-foreground": p.forest[900],
		overlay: "rgb(0 0 0 / 0.6)",
		"chart-actual": p.forest[100],
		"chart-forecast": p.green[400],
		"chart-band": "rgb(61 190 102 / 0.18)",
		"chart-in": p.green[400],
		"chart-out": p.red[400],
		"chart-plan": p.forest[400],
		"chart-grid": p.forest[800],
		"chart-buffer": p.amber[300],
		"chart-lime": p.lime[500],
	},
} as const;

/** Пары с контрастом < 4.5:1, допустимые только для крупного текста. Сейчас таких нет. */
export const contrastLargeTextOnly = {} as const;

export const gradient = {
	/** Фирменный градиент: зелёный → лайм (полосы прогресса, акценты) */
	brand: `linear-gradient(110deg, ${p.green[600]} 0%, ${p.green[500]} 50%, ${p.lime[600]} 100%)`,
	/** Глубокий вариант под белый текст */
	"brand-deep": `linear-gradient(125deg, ${p.green[800]} 0%, ${p.green[600]} 50%, ${p.green[500]} 100%)`,
	/** Лаймовая кнопка/бейдж */
	lime: `linear-gradient(120deg, ${p.lime[500]} 0%, ${p.lime[400]} 100%)`,
	/** Плитка-герой — обложка кейса: лес + лаймовый отсвет */
	hero: `radial-gradient(110% 90% at 100% 0%, rgb(205 242 58 / 0.20) 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, rgb(33 162 74 / 0.38) 0%, transparent 60%), linear-gradient(135deg, ${p.forest[900]}, ${p.forest[800]})`,
	/** Блик на плитках */
	sheen: `radial-gradient(90% 70% at 25% 10%, rgb(255 255 255 / 0.40) 0%, rgb(255 255 255 / 0) 60%)`,
	/** Фон страниц: «бумага» с лаймовым и зелёным отсветом */
	page: `radial-gradient(80% 55% at 90% -5%, rgb(205 242 58 / 0.26) 0%, transparent 60%), radial-gradient(70% 50% at -5% 5%, rgb(33 162 74 / 0.14) 0%, transparent 65%), linear-gradient(${p.paper[100]}, ${p.paper[100]})`,
	"page-dark": `radial-gradient(80% 55% at 90% -5%, rgb(205 242 58 / 0.08) 0%, transparent 60%), radial-gradient(70% 50% at -5% 5%, rgb(33 162 74 / 0.20) 0%, transparent 65%), linear-gradient(${p.forest[950]}, ${p.forest[950]})`,
	/** Мягкое свечение героя */
	glow: `radial-gradient(60% 50% at 50% 0%, rgb(205 242 58 / 0.25) 0%, rgb(33 162 74 / 0.10) 45%, transparent 75%)`,
	"glow-dark": `radial-gradient(60% 50% at 50% 0%, rgb(205 242 58 / 0.10) 0%, rgb(33 162 74 / 0.10) 45%, transparent 75%)`,
} as const;

export const font = {
	sans: `"Onest", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
	display: `"Unbounded", "Onest", system-ui, sans-serif`,
	mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`,
} as const;

/** Шрифты с Google Fonts (кириллица у обоих). */
export const fontImports = [
	"https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap",
] as const;

/** Типографика (px). Заголовки — Unbounded 600 с трекингом −0.03em. */
export const text = {
	xs: { size: 12, lineHeight: 16, role: "подписи, бейджи, оси графиков" },
	sm: { size: 14, lineHeight: 20, role: "основной текст интерфейса, ячейки, кнопки" },
	base: { size: 16, lineHeight: 24, role: "текст телефона, инпуты (на мобиле ≥16, иначе iOS зумит)" },
	lg: { size: 18, lineHeight: 26, role: "лид, заголовок карточки" },
	xl: { size: 22, lineHeight: 28, role: "заголовок секции" },
	"2xl": { size: 26, lineHeight: 32, role: "заголовок страницы на мобиле, крупные суммы" },
	"3xl": { size: 32, lineHeight: 40, role: "заголовок страницы, KPI" },
	"4xl": { size: 42, lineHeight: 50, role: "герой на мобиле, главный остаток" },
	"5xl": { size: 56, lineHeight: 62, role: "герой экрана входа" },
	"6xl": { size: 72, lineHeight: 76, role: "герой на больших экранах" },
} as const;

export const fontWeight = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

/** Сетка 4 px. Tailwind: --spacing = 4px, поэтому p-4 = 16px. */
export const spacingBase = 4;
/** Разрешённые шаги для p/m/gap/space/inset (проверяет fsd-check, правило spacing-scale). */
export const spacingSteps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24] as const;

/** Высоты контролов → h-control-md и т. п. Цель касания ≥ 44 px (md) на телефоне. */
export const control = { xs: 32, sm: 36, md: 44, lg: 52, xl: 64 } as const;

/** Радиусы (px). Все скругления — суперэллипс (corner-shape: squircle), поэтому крупнее привычных. */
export const radius = { "2xs": 6, xs: 10, sm: 14, md: 18, lg: 26, xl: 34, "2xl": 44, "3xl": 56 } as const;

export const cornerShape = "squircle" as const;

export const shadow = {
	light: {
		xs: "0 1px 2px rgb(15 42 32 / 0.06)",
		card: "0 1px 2px rgb(15 42 32 / 0.04), 0 12px 30px -14px rgb(15 42 32 / 0.18)",
		float: "0 2px 6px rgb(15 42 32 / 0.05), 0 18px 44px -18px rgb(15 42 32 / 0.30)",
		pop: "0 4px 12px rgb(15 42 32 / 0.06), 0 32px 72px -24px rgb(15 42 32 / 0.38)",
		glow: "0 12px 30px -8px rgb(33 162 74 / 0.45)",
		lime: "0 10px 28px -8px rgb(168 204 31 / 0.55)",
	},
	dark: {
		xs: "0 0 0 1px rgb(255 255 255 / 0.04)",
		card: "inset 0 0 0 1px rgb(255 255 255 / 0.05)",
		float: "inset 0 0 0 1px rgb(255 255 255 / 0.06), 0 16px 40px -16px rgb(0 0 0 / 0.7)",
		pop: "inset 0 0 0 1px rgb(255 255 255 / 0.07), 0 28px 64px -16px rgb(0 0 0 / 0.8)",
		glow: "0 12px 34px -8px rgb(61 190 102 / 0.4)",
		lime: "0 10px 28px -8px rgb(205 242 58 / 0.35)",
	},
} as const;

/** Слои по оси Z → классы z-dropdown, z-modal … */
export const zIndex = {
	base: 0,
	raised: 1,
	sticky: 10,
	nav: 20,
	overlay: 50,
	modal: 60,
	dropdown: 65,
	toast: 70,
} as const;

/** Движение. Всё живое — пружины с отскоком; твины только для цвета/прозрачности и таймеров. */
export const motion = {
	ease: {
		out: [0.22, 1, 0.36, 1],
		in: [0.4, 0, 1, 1],
		inOut: [0.65, 0, 0.35, 1],
		linear: [0, 0, 1, 1],
	},
	duration: {
		instant: 0.12,
		fast: 0.2,
		base: 0.3,
		slow: 0.45,
		draw: 0.42, // прорисовка галочки/линии по контуру (pathLength)
		loop: 2.4, // зацикленные подсказки
	},
	spring: {
		press: { type: "spring", stiffness: 520, damping: 22, mass: 0.6 }, // нажатие: лёгкий отскок
		snappy: { type: "spring", bounce: 0.28, visualDuration: 0.32 }, // индикаторы сегментов, поповеры
		soft: { type: "spring", bounce: 0.22, visualDuration: 0.5 }, // появление карточек, layout
		pop: { type: "spring", bounce: 0.45, visualDuration: 0.45 }, // успех, бейдж
		sheet: { type: "spring", bounce: 0.16, visualDuration: 0.42 }, // шторка, модалка
		page: { type: "spring", bounce: 0.18, visualDuration: 0.45 }, // смена страницы
		bar: { type: "spring", bounce: 0.3, visualDuration: 0.7 }, // полосы прогресса, столбики
		hover: { type: "spring", bounce: 0, visualDuration: 0.35 }, // наведение без дрожи
		glide: { type: "spring", bounce: 0.12, visualDuration: 0.4 }, // перетекание подсветки, высота
		counter: { stiffness: 110, damping: 13, mass: 0.9 }, // useSpring для счётчиков: заметный перелёт
	},
	stagger: { step: 0.045, max: 0.3 },
	/** Живой фон (Aurora): скорость течения шума и доля пикселей рендера */
	aurora: { speed: 0.05, resolution: 0.5 },
	header: { shrinkAt: 24 },
	distance: { enter: 14, exit: 8, lift: 4, slide: 28 },
	scale: { hover: 1.015, zoom: 1.04, tap: 0.96, popIn: 0.94, popOut: 0.98 },
	/** Свайп шторки вниз: порог смещения (px) и скорости (px/с) */
	swipe: { offset: 96, velocity: 500 },
	toast: { durationMs: 3600, errorDurationMs: 6000 },
	/** Опрос фоновых расчётов: гайд бэка — раз в 500–1000 мс; дашборд — пока идут автопересчёты */
	poll: { jobMs: 800, dashboardMs: 3000 },
} as const;

/** Ссылка на CSS-переменную для мест, где нужен цвет строкой (recharts, SVG). */
export const cssVar = (name: keyof typeof semantic.light) => `var(--${name})` as const;

export type SemanticColor = keyof typeof semantic.light;
