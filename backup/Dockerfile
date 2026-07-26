FROM rclone/rclone:latest

USER root
RUN apk add --no-cache sqlite curl

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
