#!/bin/sh
# Starts the YouTube MCP server and exposes it over Streamable HTTP.
# The MCP endpoint lives at /<MCP_SECRET with only letters and digits kept>/mcp so only someone with the full URL can use your quota.
set -e

if [ -z "$YOUTUBE_API_KEY" ]; then
  echo "YOUTUBE_API_KEY is not set." >&2
  exit 1
fi

# Keep only letters and digits: characters like + / = break the URL path.
SECRET_PATH="$(printf '%s' "$MCP_SECRET" | tr -cd 'A-Za-z0-9')"

if [ ${#SECRET_PATH} -lt 16 ]; then
  echo "MCP_SECRET must contain at least 16 letters or digits." >&2
  exit 1
fi

PORT="${PORT:-8000}"
BIN="$(dirname "$0")/node_modules/.bin"

exec "$BIN/supergateway" \
  --stdio "$BIN/zubeid-youtube-mcp-server" \
  --outputTransport streamableHttp \
  --port "$PORT" \
  --streamableHttpPath "/$SECRET_PATH/mcp" \
  --healthEndpoint /healthz \
  --logLevel info
