# ---------------------------------------------------------------------------
#	Orion CRM — Back-end (Express + Prisma + SQLite)
#
# Deux stages :
#   build   : image complète de Node, toutes les dépendances, compilation TS
#   runtime : image minimale, dépendances de production seulement, code compilé
#
# ⚠ PRÉREQUIS : déplacer "prisma" de devDependencies vers dependencies dans
#   package.json. Le CLI est nécessaire au démarrage du conteneur pour
#   appliquer les migrations (`prisma migrate deploy`). C'est un choix à
#   assumer et à documenter en §3.1.
# ---------------------------------------------------------------------------

###############################################################################
# STAGE 1 — build
###############################################################################
FROM node:26-slim AS build

#Openssl est nécessaire pour Prisma (voir §3.1)
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV DATABASE_URL="file:/app/data/orion.db"

COPY package*.json ./

RUN npm ci

# Le schéma est nécessaire avant la génération du client Prisma
COPY prisma ./prisma

RUN npx prisma generate

# Puis seulement les sources : elles changent à chaque commit, donc elles
# arrivent en dernier pour ne pas invalider les couches précédentes.
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

###############################################################################
# STAGE 2 — runtime
###############################################################################
FROM node:26-slim AS runtime

#Openssl est nécessaire pour Prisma (voir §3.1)
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL="file:/app/data/orion.db"

# --- Dépendances de production uniquement ---
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma


RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]