FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN HUSKY=0 npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/the-story-machine/browser /usr/share/nginx/html
EXPOSE 80
