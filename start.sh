#!/bin/sh
# Starts the YouTube MCP server and exposes it over Streamable HTTP.
# The MCP endpoint lives at /<MCP_SECRET>/mcp so only someone with the full URL can use your quota.
set -e

if [ -z "$YOUTUBE_API_KEY" ]; then
  echo "YOUTUBE_API_KEY is not set." >&2
  exit 1
fi

if [ -z "$MCP_SECRET" ] || [ ${#MCP_SECRET} -lt 16 ]; then
  echo "MCP_SECRET must be set and at least 16 characters long." >&2
  exit 1
fi

PORT="${PORT:-8000}"
BIN="$(dirname "$0")/node_modules/.bin"

exec "$BIN/supergateway" \
  --stdio "$BIN/zubeid-youtube-mcp-server" \
  --outputTransport streamableHttp \
  --port "$PORT" \
  --streamableHttpPath "/$MCP_SECRET/mcp" \
  --healthEndpoint /healthz \
  --logLevel info
