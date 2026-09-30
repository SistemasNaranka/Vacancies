FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Primero solo las dependencias: si no cambian, Docker reutiliza este paso y el build es más rápido
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

# Carpeta temporal de PDFs, con permiso de escritura para el usuario node
RUN mkdir -p uploads && chown node:node uploads
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]