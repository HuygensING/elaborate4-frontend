mkdir -p /nginx_conf && \
echo "> substituting environment variables in /tmp/nginx.conf.tpl:" && \
/usr/local/bin/envsubst -no-unset -no-empty -i /tmp/nginx.conf.tpl -o /nginx_conf/nginx.conf && \
echo && \
echo "> testing /nginx_conf/nginx.conf:" && \
nginx -t -c /nginx_conf/nginx.conf && \
echo && \
sed -e "s|BASE_URL = ''|BASE_URL = '$BASE_URL'|" /usr/share/nginx/html/index.html | sed -e "s|\"/static/|\"$BASE_URL/static/|" | sed -e "s|\"/js/|\"$BASE_URL/js/|" > /usr/share/nginx/html/index.html.bak && \
cp /usr/share/nginx/html/index.html.bak /usr/share/nginx/html/index.html && \
echo "> starting nginx:" && \
nginx -c /nginx_conf/nginx.conf -g 'daemon off;'
