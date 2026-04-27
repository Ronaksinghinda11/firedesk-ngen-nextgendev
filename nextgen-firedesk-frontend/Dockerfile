# =========================
#      BUILD STAGE
# =========================
FROM node:20-bookworm AS build

# Build-time VITE variable
# allow passing VITE env vars at build time
ARG VITE_INTERNAL_API_PATH
ARG VITE_SOCKET_URL

ENV VITE_INTERNAL_API_PATH=$VITE_INTERNAL_API_PATH
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# 👇 FIX: install React-18 compatible drei BEFORE npm ci
RUN npm install @react-three/fiber@8.15.12 @react-three/drei@9.106.2 --save-exact

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Debug print
# debug: print env vars in build logs
RUN echo ">>> VITE_INTERNAL_API_PATH=$VITE_INTERNAL_API_PATH"
RUN echo ">>> VITE_SOCKET_URL=$VITE_SOCKET_URL"


# Build Vite/React app
RUN npm run build

# =========================
#      RUNTIME STAGE
# =========================
FROM nginx:stable

# Clean default HTML
RUN rm -rf /usr/share/nginx/html/*

# Copy build output to NGINX
COPY --from=build /app/dist /usr/share/nginx/html/

# Copy custom NGINX config (optional)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]