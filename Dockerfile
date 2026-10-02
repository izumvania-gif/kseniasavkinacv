# Образ для хостинга на Amvera. Сайт статический: nginx отдаёт файлы как есть, сборки нет.
FROM nginx:stable-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY media /usr/share/nginx/html/media
COPY files /usr/share/nginx/html/files

# nginx читает файлы не от root: открываем на чтение то, что пришло с закрытыми правами.
# Трогаем только такие файлы, чтобы не дублировать видео в слое образа.
RUN find /usr/share/nginx/html -type d ! -perm -005 -exec chmod o+rx {} + \
 && find /usr/share/nginx/html -type f ! -perm -004 -exec chmod o+r {} +

EXPOSE 80
