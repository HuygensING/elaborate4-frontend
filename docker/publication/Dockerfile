FROM node:slim AS builder

COPY . /work

WORKDIR /work

RUN npm install && ./dist.sh

FROM nginx:1.17.5-alpine

COPY docker/publication/nginx.conf /nginx_conf/nginx.conf
COPY public/publication /usr/share/nginx/html

CMD ["nginx", "-c", "/nginx_conf/nginx.conf", "-g", "daemon off;"]