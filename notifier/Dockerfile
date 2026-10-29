FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY lib.mjs index.mjs ./
ENV NODE_ENV=production TZ=Europe/Madrid NODE_OPTIONS=--max-old-space-size=96
CMD ["node", "index.mjs"]
