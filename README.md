eLaborate (frontend)
===================

[![Project Status: Inactive – The project has reached a stable, usable state but is no longer being actively developed; support/maintenance will be provided as time allows.](https://www.repostatus.org/badges/latest/inactive.svg)](https://www.repostatus.org/#inactive)

## eLaborate

### What is eLaborate?

eLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users.
eLaborate is developed by [Huygens ING](http://www.huygens.knaw.nl/).

This repository contains the frontend for the work environment (/apps/work-environment), which communicates with the [backend](https://github.com/HuygensING/elaborate4-backend) and the frontend for the publication (/apps/publication).

### Install

```
$ git clone https://github.com/HuygensING/elaborate4-frontend.git
$ npm install
```
### Publication development

1. Run the backend locally: `docker run -p 4002:8080 -d brambdocker/hattem-edition`
2. `npm start`

## BoschDoc

### Development
1. `npm start`

### Production
1. cd ./apps/boschdoc
2. edit `.env` for /draft or /edition subdir
3. `npm run dist`
4. cd ../..
5. `docker run -d -p "80:80" -v $PWD/apps/boschdoc/nginx.conf:/etc/nginx/nginx.conf -v $PWD/public/boschdoc:/usr/share/nginx/html nginx:alpine nginx -g 'daemon off;'`
6. go to http://localhost/draft

### .env example
```
PUBLIC_PATH=/draft
BACKEND_DATA_URL=https://...
BACKEND_API_URL=https://...
```
