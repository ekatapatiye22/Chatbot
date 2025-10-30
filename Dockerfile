# Use Node LTS, install deps, run as nonroot, serve on 3000
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . ./
EXPOSE 3000
CMD ["node", "server.js"]
