#!/bin/zsh
# Usage: run3-send.sh desktop|phone NNN < body.js   (reads the command body from stdin, waits for the .out)
mode=$1; n=$2
dir=$(dirname "$0")/run3-cmd-$mode
cat > "$dir/$n.js.tmp" && mv "$dir/$n.js.tmp" "$dir/$n.js"
for i in $(seq 1 1400); do
  if [ -f "$dir/$n.js.out" ]; then cat "$dir/$n.js.out"; echo; exit 0; fi
  sleep 0.25
done
echo "TIMEOUT waiting for $n"; exit 1
