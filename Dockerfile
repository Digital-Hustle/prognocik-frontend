# syntax=docker/dockerfile:1.7
# ПрогноCIк — фронтенд. Два этапа: сборка статики (Node) и раздача через nginx без root.

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# Пусто = запросы идут на тот же origin, а /api проксирует nginx (рекомендуется: куки HttpOnly + CSRF)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# Адрес Gateway внутри сети и DNS-резолвер (127.0.0.11 — встроенный DNS Docker)
ENV GATEWAY_URL=http://gateway:5001 \
    DNS_RESOLVER=127.0.0.11 \
    MAX_UPLOAD=110m
COPY --from=build /app/dist /usr/share/nginx/html
# Шаблон обрабатывается штатным envsubst образа: подставятся только объявленные переменные окружения
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
