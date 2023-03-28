FROM node:slim AS builder
COPY . /work
WORKDIR /work
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm install && ./scripts/publication-dist.sh

FROM nginx:1.17.5-alpine

# install a8m/envsubst (used in cmd.sh)
RUN apk update &&\
	apk add curl &&\
	curl -L https://github.com/a8m/envsubst/releases/download/v1.2.0/envsubst-`uname -s`-`uname -m` -o envsubst && \
	chmod +x envsubst && \
	mv envsubst /usr/local/bin

COPY docker/publication/nginx.tpl.conf /tmp/nginx.conf.tpl
COPY --from=builder /work/public/publication /usr/share/nginx/html
COPY docker/publication/cmd.sh cmd.sh

CMD "./cmd.sh"