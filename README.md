# ПрогноCIк — фронтенд

Сервис финансового прогнозирования для малого бизнеса. Кейс Банка Центр-инвест, хакатон «Осень 2026».
Прогноз остатка на счёте по дням минимум на 30 дней вперёд, риск кассового разрыва (дата, сумма, вероятность),
объяснение причин и действия, регулярные платежи, планы (счета, налоги, обещания клиентов), план-факт и
проверка качества модели.

Фронт работает **только с реальным API** Gateway (`hack-2026-back`): никаких моков и выдуманных данных.
Контракты сверены с контроллерами и DTO бэкенда и с [`docs/FRONTEND_API_GUIDE.md`](docs/FRONTEND_API_GUIDE.md).

## Запуск

```bash
npm ci
cp .env.example .env.local   # VITE_GATEWAY_PROXY — адрес Gateway (по умолчанию https://localhost:5001)
npm run dev                  # http://localhost:3000, /api проксируется на Gateway (same-origin cookies)
```

| Команда | Что делает |
|---|---|
| `npm run build` | `tsc -b` + продакшен-сборка в `dist/` |
| `npm run check` | typecheck + ESLint + проверка актуальности темы |
| `npm run fix` | ESLint `--fix` + Prettier |
| `npm run gen:tokens` | пересобрать `theme.css` и `docs/DESIGN.md` из `tokens.ts` (+ контраст WCAG) |
| `npm run fsd` | линтер Feature-Sliced Design из скилла `frontend-fsd` |

В проде `VITE_API_URL` пустой (фронт и Gateway на одном origin) или адрес Gateway с настроенным CORS.

## Стек

React 19 · TypeScript strict · Vite 8 · Redux Toolkit + RTK Query · React Router 7 · Tailwind 4 (токены
через `@theme`) · motion (`motion/react`) · ogl (WebGL-фон) · recharts · lucide.

## Архитектура

Feature-Sliced Design, как в [WINNER-hackathon-2025-frontend](https://github.com/MelevaTe/WINNER-hackathon-2025-frontend):
слайсы в PascalCase, `index.ts` — публичный API, store с `reducerManager` и `DynamicModuleLoader`,
серверные данные — RTK Query (`rtkApi.injectEndpoints`), границы слоёв проверяет `eslint-plugin-boundaries`.

```
src/
├─ app/        провайдеры (Store, Router с guard'ами, ErrorBoundary), стили и тема
├─ pages/      экраны: Auth, Onboarding, Forecast, Import, Operations, Recurring, Plans, PlanFact, Quality, Settings, Profile
├─ widgets/    Navbar, ForecastChart, ForecastOverview, AlertsPanel (+GapDetails), PaymentsTable, PlanFactChart, BacktestReport, HistoryHeatmap, ImportReport …
├─ features/   AuthByEmail, UploadStatement, ChangePaymentCategory, DetectRecurring, EditExpectedPayment, AllocatePayment,
│              RunForecast, RunBacktest, WhatIfScenario, AcknowledgeAlert, EditForecastSettings, ConfirmCompleteness, SetBalanceAnchor …
├─ entities/   User, Workspace, Company, Payment, AccountHistory, Import, Recurring, ExpectedPayment, Forecast, Backtest, Job, PlanFact, ForecastSettings
└─ shared/     api (Gateway-клиент), config (tokens, motion), ui-кит, lib
```

### Работа с Gateway (`shared/api`)

- Токены — HttpOnly cookies, `credentials: "include"`; в `localStorage` только тема и выбранный счёт.
- `X-CSRF-Token` из `GET /auth/csrf` на все изменяющие запросы; при `CSRF_INVALID` — новый токен и один повтор.
- `401` на GET → один `refresh` и один повтор чтения; изменяющие запросы автоматически не повторяются.
- `Idempotency-Key`: новый UUID на операцию, тот же — при повторе с тем же телом (`useIdempotencyKey`).
- `If-Match: "<version>"` на редактирование; при `409` данные перечитываются.
- Ошибки `application/problem+json`: ветвление по `code`, пользователю — `detail`.
- Фоновые расчёты (прогноз, backtest, поиск регулярностей): `POST …-jobs` → опрос `GET /jobs/{id}` раз в 800 мс
  (`useJobWatcher`) → инвалидация dashboard/списков. Пока бэк сам пересчитывает (AUTO), dashboard опрашивается.

### Честность данных в интерфейсе

- `MISSING`-день — «нет данных», а не ноль; линия факта рвётся.
- `riskEstimate.probability = null` — «недостаточно данных», не 0%. Вероятность переводится в % только при показе.
- Факт и прогноз — разные серии, граница — дата среза; зона P10–P90 рисуется отдельно от точечного прогноза.
- Устаревший прогноз (`STALE`) остаётся на экране с пометкой, новый расчёт идёт отдельно.
- «Что если» — явно подписанная клиентская оценка поверх серверного прогноза (сдвиг дневных компонент),
  внеплановый расход можно сохранить настоящим планом.

## Дизайн

Цвета — со слайдов кейса Центр-инвеста: «лесной» `#0F2A20`, фирменный зелёный `#21A24A`, лайм `#CDF23A`
(кольцо на точке разрыва), «бумага» `#F2F3EE`. Шрифты Unbounded (заголовки, суммы) и Onest (интерфейс).
Компоненты и движение перенесены из `proxodnaya-sandbox`: пружины `motion`, WebGL-шейдер Aurora, анимированные
счётчики, ячейки кода, перетекающая подсветка сегментов, шторки на телефоне. Подробно — [`docs/DESIGN.md`](docs/DESIGN.md).

## Скиллы для агентов

В `.agents/skills` (симлинк `.claude/skills`) — фронтовые скиллы из `sber-hack`: `frontend-fsd`, `design-taste-frontend`,
`frontend-design`, `animate`, `improve-animations`, `review-animations`, `find-animation-opportunities`,
`emil-design-eng`, `webapp-testing`, `verification-before-completion`, `systematic-debugging`. Правила — [`AGENTS.md`](AGENTS.md).
