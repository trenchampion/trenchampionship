#!/bin/bash
# Cron, every minute: probe the indexer; after three consecutive failures restart it and log the event.
# systemd already restarts Ponder when the process dies or exceeds MemoryMax; this catches the hung-but-alive case.
STATE=/run/indexer-healthcheck.fails
LOG=/var/log/indexer-healthcheck.log
code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' http://127.0.0.1:42069/health)
if [ "$code" = "200" ]; then
  echo 0 > "$STATE"
  exit 0
fi
fails=$(( $(cat "$STATE" 2>/dev/null || echo 0) + 1 ))
echo "$fails" > "$STATE"
if [ "$fails" -ge 3 ]; then
  echo "$(date -u +%FT%TZ) health=$code after $fails probes: restarting ponder (load $(cut -d' ' -f1-3 /proc/loadavg), free $(free -m | awk '/^Mem:/{print $4}') MB)" >> "$LOG"
  systemctl restart ponder
  echo 0 > "$STATE"
fi
