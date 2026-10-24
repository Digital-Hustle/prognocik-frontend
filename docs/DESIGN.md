# Дизайн-система ПрогноCIка

Источник значений — `src/shared/config/tokens.ts`. После правки: `npm run gen:tokens` (пересобирает
`src/app/styles/theme.css` и таблицы ниже, проверяет контраст WCAG ≥ 4.5:1).

Язык — со слайдов кейса Банка Центр-инвест: «лесной» тёмно-зелёный, фирменный зелёный, лайм как акцент разрыва, тёплая
«бумага». Анимации — только `motion/react` (пружины из `shared/config/motion.ts`), фон — WebGL Aurora (ogl).

<!-- tokens:begin -->
<!-- Сгенерировано gen-tokens.mjs из tokens.ts. Правь tokens.ts и запускай `npm run gen:tokens`. -->

#### Семантические цвета

| Токен | Класс | Светлая | Тёмная | Контраст с -foreground (свет / тём.) |
|---|---|---|---|---|
| `background` | `bg-background` / `text-background` | `#F2F3EE` | `#0A1D15` |  |
| `foreground` | `bg-foreground` / `text-foreground` | `#14241B` | `#EEF3EC` |  |
| `card` | `bg-card` / `text-card` | `#FFFFFF` | `#0F2A20` | 16.18 / 13.60 |
| `popover` | `bg-popover` / `text-popover` | `#FFFFFF` | `#123123` | 16.18 / 12.53 |
| `surface` | `bg-surface` / `text-surface` | `#ECEEE6` | `#123123` | 13.82 / 12.53 |
| `surface-hover` | `bg-surface-hover` / `text-surface-hover` | `#E3E6DC` | `#173B2B` |  |
| `muted` | `bg-muted` / `text-muted` | `#F8F9F4` | `#0D241B` | 5.48 / 7.31 |
| `border` | `bg-border` / `text-border` | `#E3E6DC` | `#173B2B` |  |
| `border-strong` | `bg-border-strong` / `text-border-strong` | `#CFD5C7` | `#1E4A36` |  |
| `input` | `bg-input` / `text-input` | `#CFD5C7` | `#1E4A36` |  |
| `ring` | `bg-ring` / `text-ring` | `#21A24A` | `#3DBE66` |  |
| `primary` | `bg-primary` / `text-primary` | `#157F39` | `#3DBE66` | 5.09 / 7.91 |
| `primary-hover` | `bg-primary-hover` / `text-primary-hover` | `#127235` | `#7FD89B` |  |
| `brand` | `bg-brand` / `text-brand` | `#21A24A` | `#3DBE66` |  |
| `lime` | `bg-lime` / `text-lime` | `#CDF23A` | `#CDF23A` | 11.92 / 11.92 |
| `hero` | `bg-hero` / `text-hero` | `#0F2A20` | `#123123` | 13.72 / 12.53 |
| `hero-muted` | `bg-hero-muted` / `text-hero-muted` | `#9FB2A6` | `#9FB2A6` |  |
| `accent` | `bg-accent` / `text-accent` | `#EEF8F1` | `#173B2B` | 5.55 / 7.19 |
| `success` | `bg-success` / `text-success` | `#21A24A` | `#3DBE66` |  |
| `success-soft` | `bg-success-soft` / `text-success-soft` | `#DDF2E3` | `#133A24` | 6.20 / 7.36 |
| `success-border` | `bg-success-border` / `text-success-border` | `#7FD89B` | `#0F6430` |  |
| `warning` | `bg-warning` / `text-warning` | `#9A5A00` | `#F2BE5C` |  |
| `warning-soft` | `bg-warning-soft` / `text-warning-soft` | `#FFF2D9` | `#3A2A0E` | 5.93 / 8.10 |
| `warning-border` | `bg-warning-border` / `text-warning-border` | `#F2BE5C` | `#8A4F00` |  |
| `danger` | `bg-danger` / `text-danger` | `#C2362F` | `#FF8A7A` | 5.44 / 8.28 |
| `danger-soft` | `bg-danger-soft` / `text-danger-soft` | `#FCE9E6` | `#3A1714` | 6.00 / 9.41 |
| `danger-border` | `bg-danger-border` / `text-danger-border` | `#FFB4A8` | `#A8281F` |  |
| `info` | `bg-info` / `text-info` | `#1F5FBF` | `#8AB4F8` |  |
| `info-soft` | `bg-info-soft` / `text-info-soft` | `#E7EFFC` | `#16253D` | 5.26 / 7.29 |
| `info-border` | `bg-info-border` / `text-info-border` | `#8AB4F8` | `#1F5FBF` |  |
| `inverse` | `bg-inverse` / `text-inverse` | `#0F2A20` | `#EEF3EC` | 13.72 / 13.60 |
| `overlay` | `bg-overlay` / `text-overlay` | `rgb(15 42 32 / 0.42)` | `rgb(0 0 0 / 0.6)` |  |
| `chart-actual` | `bg-chart-actual` / `text-chart-actual` | `#14241B` | `#EEF3EC` |  |
| `chart-forecast` | `bg-chart-forecast` / `text-chart-forecast` | `#21A24A` | `#3DBE66` |  |
| `chart-band` | `bg-chart-band` / `text-chart-band` | `rgb(33 162 74 / 0.16)` | `rgb(61 190 102 / 0.18)` |  |
| `chart-in` | `bg-chart-in` / `text-chart-in` | `#21A24A` | `#3DBE66` |  |
| `chart-out` | `bg-chart-out` / `text-chart-out` | `#C2362F` | `#FF8A7A` |  |
| `chart-plan` | `bg-chart-plan` / `text-chart-plan` | `#8A968D` | `#5F7A6B` |  |
| `chart-grid` | `bg-chart-grid` / `text-chart-grid` | `#E3E6DC` | `#173B2B` |  |
| `chart-buffer` | `bg-chart-buffer` / `text-chart-buffer` | `#9A5A00` | `#F2BE5C` |  |
| `chart-lime` | `bg-chart-lime` / `text-chart-lime` | `#A8CC1F` | `#CDF23A` |  |

Пары `x-foreground` — цвет текста/иконок на фоне `x`. Исключения по контрасту (только крупный текст):


#### Шкалы (только для токенов, не в className)

| Шкала | Значения |
|---|---|
| white | `#FFFFFF` |
| black | `#06130D` |
| forest | 100 `#EEF3EC`, 300 `#9FB2A6`, 400 `#5F7A6B`, 600 `#2A5E46`, 700 `#1E4A36`, 800 `#173B2B`, 850 `#123123`, 900 `#0F2A20`, 950 `#0A1D15` |
| green | 50 `#EEF8F1`, 100 `#DDF2E3`, 300 `#7FD89B`, 400 `#3DBE66`, 500 `#21A24A`, 600 `#178A3E`, 650 `#157F39`, 700 `#127235`, 800 `#0F6430` |
| lime | 100 `#F4FBD3`, 400 `#DBF66E`, 500 `#CDF23A`, 600 `#A8CC1F`, 700 `#7E9A12` |
| paper | 25 `#FBFBF8`, 50 `#F8F9F4`, 100 `#F2F3EE`, 150 `#ECEEE6`, 200 `#E3E6DC`, 300 `#CFD5C7` |
| ink | 400 `#8A968D`, 600 `#5A695F`, 700 `#33443A`, 900 `#14241B` |
| red | 100 `#FCE9E6`, 300 `#FFB4A8`, 400 `#FF8A7A`, 700 `#C2362F`, 800 `#A8281F`, 900 `#3A1714` |
| amber | 100 `#FFF2D9`, 300 `#F2BE5C`, 700 `#9A5A00`, 800 `#8A4F00`, 900 `#3A2A0E` |
| blue | 100 `#E7EFFC`, 400 `#8AB4F8`, 800 `#1F5FBF`, 900 `#16253D` |
| ci | forest `#0F2A20`, green `#21A24A`, moss `#2E6B4C`, lime `#CDF23A`, paper `#F2F3EE` |

#### Типографика (дефолтные размеры Tailwind выключены)

| Класс | Размер / интерлиньяж | Для чего |
|---|---|---|
| `text-xs` | 12 / 16 px | подписи, бейджи, оси графиков |
| `text-sm` | 14 / 20 px | основной текст интерфейса, ячейки, кнопки |
| `text-base` | 16 / 24 px | текст телефона, инпуты (на мобиле ≥16, иначе iOS зумит) |
| `text-lg` | 18 / 26 px | лид, заголовок карточки |
| `text-xl` | 22 / 28 px | заголовок секции |
| `text-2xl` | 26 / 32 px | заголовок страницы на мобиле, крупные суммы |
| `text-3xl` | 32 / 40 px | заголовок страницы, KPI |
| `text-4xl` | 42 / 50 px | герой на мобиле, главный остаток |
| `text-5xl` | 56 / 62 px | герой экрана входа |
| `text-6xl` | 72 / 76 px | герой на больших экранах |

Шрифты: `font-sans` — SB Sans Text (весь UI), `font-display` — SB Sans Display (h1–h3, KPI, вердикт). Начертания: `font-regular` 400, `font-medium` 500, `font-semibold` 600, `font-bold` 700.

#### Отступы, контролы, радиусы, тени, слои

- Сетка 4 px. Для `p-* m-* gap-* space-* inset-*` разрешены шаги: `0` (0 px), `0.5` (2 px), `1` (4 px), `1.5` (6 px), `2` (8 px), `2.5` (10 px), `3` (12 px), `3.5` (14 px), `4` (16 px), `5` (20 px), `6` (24 px), `7` (28 px), `8` (32 px), `10` (40 px), `12` (48 px), `14` (56 px), `16` (64 px), `20` (80 px), `24` (96 px).
- Высота контролов: `h-control-xs` 32, `h-control-sm` 36, `h-control-md` 44, `h-control-lg` 52, `h-control-xl` 64 px.
- Радиусы: `rounded-2xs` 6, `rounded-xs` 10, `rounded-sm` 14, `rounded-md` 18, `rounded-lg` 26, `rounded-xl` 34, `rounded-2xl` 44, `rounded-3xl` 56 px, `rounded-full`.
- Тени: `shadow-xs`, `shadow-card`, `shadow-float`, `shadow-pop`, `shadow-glow`, `shadow-lime` (свои значения в тёмной теме).
- Safe-area телефона: `pt-safe`, `pb-safe`.
- Слои: `z-base` 0, `z-raised` 1, `z-sticky` 10, `z-nav` 20, `z-overlay` 50, `z-modal` 60, `z-dropdown` 65, `z-toast` 70.

#### Движение (motion/react через `@/shared/config/motion`; CSS-переходы — классами)

| Токен | Значение | CSS-класс |
|---|---|---|
| duration.instant | 0.12 с | `duration-instant` |
| duration.fast | 0.2 с | `duration-fast` |
| duration.base | 0.3 с | `duration-base` |
| duration.slow | 0.45 с | `duration-slow` |
| duration.draw | 0.42 с | `duration-draw` |
| duration.loop | 2.4 с | `duration-loop` |
| ease.out | `cubic-bezier(0.22, 1, 0.36, 1)` | `ease-out` |
| ease.in | `cubic-bezier(0.4, 0, 1, 1)` | `ease-in` |
| ease.inOut | `cubic-bezier(0.65, 0, 0.35, 1)` | `ease-in-out` |
| ease.linear | `cubic-bezier(0, 0, 1, 1)` | `ease-linear` |
| spring.press | stiffness 520, damping 22, mass 0.6 | — |
| spring.snappy | bounce 0.28, visualDuration 0.32 | — |
| spring.soft | bounce 0.22, visualDuration 0.5 | — |
| spring.pop | bounce 0.45, visualDuration 0.45 | — |
| spring.sheet | bounce 0.16, visualDuration 0.42 | — |
| spring.page | bounce 0.18, visualDuration 0.45 | — |
| spring.bar | bounce 0.3, visualDuration 0.7 | — |
| spring.hover | bounce 0, visualDuration 0.35 | — |
| spring.glide | bounce 0.12, visualDuration 0.4 | — |
| spring.counter | stiffness 110, damping 13, mass 0.9 | — |
| toast | durationMs 3600, errorDurationMs 6000 | — |
<!-- tokens:end -->
