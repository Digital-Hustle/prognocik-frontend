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
ARG VITE_SITE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# Сертификат для локального HTTPS (https://localhost:8443). Самоподписанный: браузер
# попросит подтверждение один раз, зато Secure/HttpOnly-куки Gateway работают без внешнего proxy.
# SAN обязателен: браузеры не доверяют CN без subjectAltName. На проде сертификат выдаёт
# reverse proxy (Caddy/LetsEncrypt), этот — только для локального запуска.
# openssl нужен только на build-стадии, в runtime-образ он не попадает.
RUN apk add --no-cache openssl \
 && mkdir -p /etc/ssl/local \
 && openssl req -x509 -newkey rsa:2048 -nodes -days 825 -sha256 \
      -subj "/CN=prognocik-local" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
      -keyout /etc/ssl/local/prognocik-local.key \
      -out /etc/ssl/local/prognocik-local.crt

# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# Адрес Gateway внутри сети и DNS-резолвер (127.0.0.11 — встроенный DNS Docker)
ENV GATEWAY_URL=http://gateway:5001 \
    DNS_RESOLVER=127.0.0.11 \
    MAX_UPLOAD=110m \
    TLS_CERT_FILE=/etc/ssl/local/prognocik-local.crt \
    TLS_KEY_FILE=/etc/ssl/local/prognocik-local.key
COPY --from=build /app/dist /usr/share/nginx/html
# Шаблон обрабатывается штатным envsubst образа: подставятся только объявленные переменные окружения
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# Сертификат отдельным слоем: на проде можно подменить своим volume-ом без пересборки.
# --chown=nginx: nginx в unprivileged-образе читает ключи только если они принадлежат ему.
COPY --from=build --chown=101:101 /etc/ssl/local/prognocik-local.crt /etc/ssl/local/prognocik-local.crt
COPY --from=build --chown=101:101 /etc/ssl/local/prognocik-local.key /etc/ssl/local/prognocik-local.key
EXPOSE 8080 8443
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
