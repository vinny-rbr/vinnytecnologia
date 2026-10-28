# Site vinnytecnologia.com.br (vitrine, painel admin, TVs, demo, mesas): estático no nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY *.html *.png *.svg /usr/share/nginx/html/
COPY site /usr/share/nginx/html/site
EXPOSE 80
