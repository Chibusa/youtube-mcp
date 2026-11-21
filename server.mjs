// Single-process YouTube MCP server for Claude.
// Runs zubeid-youtube-mcp-server's built-in Streamable HTTP mode on a private local port,
// and exposes it publicly only at /<secret>/mcp, plus /healthz for uptime checks.
import http from 'node:http';

const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY2 || process.env.YOUTUBE_API_KEY3;
if (!apiKey) {
  console.error('YOUTUBE_API_KEY is not set.');
  process.exit(1);
}

// Keep only letters and digits: characters like + / = break the URL path.
const secretPath = (process.env.MCP_SECRET || '').replace(/[^A-Za-z0-9]/g, '');
if (secretPath.length < 16) {
  console.error('MCP_SECRET must contain at least 16 letters or digits.');
  process.exit(1);
}

const publicPort = Number(process.env.PORT || 8000);
const innerPort = publicPort === 8088 ? 8089 : 8088;

process.env.MCP_TRANSPORT = 'http';
process.env.MCP_HOST = '127.0.0.1';
process.env.MCP_PORT = String(innerPort);

const { startMcpServer } = await import('zubeid-youtube-mcp-server/dist/server.js');
await startMcpServer();

const mcpPath = `/${secretPath}/mcp`;

const server = http.createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];

  if (path === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (path !== mcpPath) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Stateless server: no server-initiated stream, so refuse GET instead of holding a connection open.
  if (req.method === 'GET') {
    res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }));
    return;
  }

  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: innerPort,
      method: req.method,
      path: '/mcp',
      headers: { ...req.headers, host: `127.0.0.1:${innerPort}` },
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    console.error('Upstream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream unavailable' }));
    } else {
      res.end();
    }
  });

  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
});

server.listen(publicPort, '0.0.0.0', () => {
  console.error(`Public endpoint ready on port ${publicPort} (path hidden), health at /healthz`);
});
