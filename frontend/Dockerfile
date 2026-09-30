# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN VITE_API_URL=/api/v1 npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configurar SPA routing para React Router y Reverse Proxy transparente para el backend
RUN echo 'server { listen 80; \
    location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } \
    location /api/v1/ { proxy_pass http://backend:8080; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
