#!/usr/bin/env bash
# Deploy notesplus (E05-E08, v6.1.2) to nextcloud.internal on server.lan.
# Run from the repo root on the dev box (has the built js/ and ssh to server.lan).
# Idempotent: re-run safely. Honors the version-keyed cachebuster (info.xml bumped to 6.1.2).
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

echo "==> 1/5 packaging app from $REPO"
tar --exclude=node_modules --exclude='js/*.map' \
    -czf /tmp/notesplus.tar.gz \
    appinfo lib templates js img l10n package*.json webpack.config.js composer.json
ls -la /tmp/notesplus.tar.gz

echo "==> 2/5 scp to server.lan"
scp -o ConnectTimeout=20 /tmp/notesplus.tar.gz server.lan:/tmp/

echo "==> 3/5 unpack + swap into the nextcloud container"
ssh -o ConnectTimeout=20 -o ServerAliveInterval=8 server.lan '
  set -e
  rm -rf /tmp/notesplus && mkdir /tmp/notesplus
  tar xzf /tmp/notesplus.tar.gz -C /tmp/notesplus
  docker exec nextcloud rm -rf /var/www/html/custom_apps/notesplus
  docker cp /tmp/notesplus nextcloud:/var/www/html/custom_apps/notesplus
  docker exec nextcloud chown -R www-data:www-data /var/www/html/custom_apps/notesplus
  echo FILES-DEPLOYED
'

echo "==> 4/5 occ upgrade (detached, survives VPN drop)"
ssh -o ConnectTimeout=20 -o ServerAliveInterval=8 server.lan \
  'docker exec -d -u www-data nextcloud php occ upgrade'

echo "==> 5/5 polling occ status until maintenance:false (up to ~3 min)"
for i in $(seq 1 36); do
  sleep 5
  OUT=$(ssh -o ConnectTimeout=20 -o ServerAliveInterval=8 server.lan \
    'docker exec -u www-data nextcloud php occ status 2>/dev/null' || true)
  echo "$OUT" | grep -E "maintenance|needsDb|versionstring" || true
  if echo "$OUT" | grep -q "maintenance: false"; then
    echo "==> instance is UP"
    ssh -o ConnectTimeout=20 server.lan \
      'docker exec -u www-data nextcloud php occ app:list 2>/dev/null | grep -i notesplus' || true
    exit 0
  fi
  echo "   ...still upgrading (attempt $i)"
done

echo "!! did not confirm maintenance:false in time — check manually:"
echo "   ssh server.lan 'docker exec -u www-data nextcloud php occ status'"
echo "   if stuck on but needsDbUpgrade:false ->"
echo "   ssh server.lan 'docker exec -u www-data nextcloud php occ maintenance:mode --off'"
exit 1
