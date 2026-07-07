# Multi-stage build for the EFDA KPI Dashboard (Next.js 16, standalone output).
# NEXT_PUBLIC_* values are inlined into the client bundle at build time — override
# per environment with kaniko/docker --build-arg. Defaults target EAII staging.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_STS_AUTHORITY=https://dev.id.eris.efda.gov.et
ARG NEXT_PUBLIC_CLIENT_ID=eris-portal-spa
ARG NEXT_PUBLIC_CLIENT_ROOT=https://kpi.stage.eaii.efda.gov.et
ARG NEXT_PUBLIC_REDIRECT_URI=https://kpi.stage.eaii.efda.gov.et/auth-callback?to=signin
ARG NEXT_PUBLIC_SILENT_REDIRECT_URI=https://kpi.stage.eaii.efda.gov.et/assets/silent-callback.html
ARG NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=https://kpi.stage.eaii.efda.gov.et
ARG NEXT_PUBLIC_CLIENT_SCOPE="openid profile"
ARG NEXT_PUBLIC_RESPONSE_TYPE=code
ARG NEXT_PUBLIC_API_ROOT=https://api.feature.eris.efda.gov.et/api

ENV NEXT_PUBLIC_STS_AUTHORITY=$NEXT_PUBLIC_STS_AUTHORITY \
    NEXT_PUBLIC_CLIENT_ID=$NEXT_PUBLIC_CLIENT_ID \
    NEXT_PUBLIC_CLIENT_ROOT=$NEXT_PUBLIC_CLIENT_ROOT \
    NEXT_PUBLIC_REDIRECT_URI=$NEXT_PUBLIC_REDIRECT_URI \
    NEXT_PUBLIC_SILENT_REDIRECT_URI=$NEXT_PUBLIC_SILENT_REDIRECT_URI \
    NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=$NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI \
    NEXT_PUBLIC_CLIENT_SCOPE=$NEXT_PUBLIC_CLIENT_SCOPE \
    NEXT_PUBLIC_RESPONSE_TYPE=$NEXT_PUBLIC_RESPONSE_TYPE \
    NEXT_PUBLIC_API_ROOT=$NEXT_PUBLIC_API_ROOT \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
