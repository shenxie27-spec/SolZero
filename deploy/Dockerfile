FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY core/package.json core/package.json
COPY server/package.json server/package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY core ./core
COPY server ./server
COPY docs ./docs
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/index.js"]