FROM nginx
COPY Area.Search.Web/wwwroot /app
COPY nginx.conf /etc/nginx