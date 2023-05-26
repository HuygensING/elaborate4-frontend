FROM node:slim AS builder
COPY . /work
COPY apps/boschdoc/.env /work/apps/boschdoc/.env
WORKDIR /work
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm install && ./scripts/boschdoc-dist.sh

FROM nginx:1.17.5-alpine

COPY docker/boschdoc/nginx.conf /nginx_conf/nginx.conf
COPY --from=builder /work/public/boschdoc /usr/share/nginx/html

CMD ["nginx", "-c", "/nginx_conf/nginx.conf", "-g", "daemon off;"]