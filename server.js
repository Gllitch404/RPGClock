const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;
const SRC_DIR = path.join(__dirname, 'src');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/index.html') {
    reqPath = '/master.html';
  }

  const filePath = path.join(SRC_DIR, reqPath);
  if (!filePath.startsWith(SRC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ CHRONOS RPG - Servidor Local Ativo`);
  console.log(`🎮 Painel do Mestre: http://localhost:${PORT}/master.html`);
  console.log(`🌙 Overlay da Mesa:  http://localhost:${PORT}/overlay.html`);
  console.log(`======================================================\n`);
});

