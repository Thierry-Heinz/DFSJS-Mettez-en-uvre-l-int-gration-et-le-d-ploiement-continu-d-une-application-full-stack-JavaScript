# ---------------------------------------------------------------------------
#
#	Orion CRM — Front-end (React + Vite → nginx)
#
# ---------------------------------------------------------------------------

###############################################################################
# STAGE 1 — build
###############################################################################
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json  ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json tailwind.config.js index.html eslint.config.js postcss.config.js vite.config.ts vitest.config.ts ./

COPY ./src  ./src

RUN npm run build

###############################################################################
# STAGE 2 — runtime
###############################################################################
FROM nginx:1.27-alpine AS runtime

# Configuration du serveur : routage SPA, cache des assets, proxy /api
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Seul le résultat du build passe dans l'image finale :
# ni sources, ni node_modules, ni Node lui-même.
COPY --from=build /app/dist /usr/share/nginx/html

# --- Sécurité : nginx en utilisateur non privilégié ---
# Un processus non-root ne peut pas écouter sur un port < 1024 : la conf écoute
# donc sur 8080 (voir nginx.conf) et c'est le compose qui publie 4200 côté hôte.
# nginx doit pouvoir écrire son pid et ses caches.
RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]