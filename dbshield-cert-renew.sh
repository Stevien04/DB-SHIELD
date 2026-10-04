#!/bin/sh
set -eu
docker run --rm -v /opt/dbshield/tls:/etc/letsencrypt -v /opt/dbshield/releases/20261003-current/frontend-live:/webroot certbot/certbot:v5.4.0 renew --quiet
cd /opt/dbshield/releases/20261003-current
docker compose -f compose.yml exec -T frontend nginx -s reload
