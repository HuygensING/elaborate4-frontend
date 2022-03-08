# BoschDoc

## Development
1. `npm start`

## Production
1. edit `.env` for /draft or /edition subdir
2. `npm run dist`
3. cd ../..
4. `docker run -d -p "80:80" -v $PWD/docker/boschdoc/nginx.conf:/etc/nginx/nginx.conf -v $PWD/public/boschdoc:/usr/share/nginx/html nginx:alpine nginx -g 'daemon off;'`
5. go to http://localhost/draft

## .env example
```
PUBLIC_PATH=/draft
BACKEND_DATA_URL=https://...
BACKEND_API_URL=https://...
```
