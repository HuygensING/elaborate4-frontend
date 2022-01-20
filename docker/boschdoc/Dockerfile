FROM node:slim AS builder
COPY . /work
WORKDIR /work
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm install && ./dist.sh

FROM nginx:1.17.5-alpine

COPY docker/boschdoc/nginx.conf /nginx_conf/nginx.conf
COPY --from=builder /work/public/boschdoc /usr/share/nginx/html

CMD ["nginx", "-c", "/nginx_conf/nginx.conf", "-g", "daemon off;"]