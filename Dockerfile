# Torre Vertical — imagen de producción
FROM node:22-alpine

WORKDIR /app

# Primero las dependencias, para aprovechar la caché de capas de Docker:
# si no cambia package.json, este paso no se repite en cada despliegue.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./
COPY index.html ./

# No corremos como root dentro del contenedor
USER node

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
