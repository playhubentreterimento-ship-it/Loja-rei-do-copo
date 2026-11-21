const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DEFAULT_PASSWORD = 'troque-esta-senha';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

if (ADMIN_PASSWORD === DEFAULT_PASSWORD) {
  console.warn('\x1b[33m[AVISO] Senha de administrador padrão em uso ("troque-esta-senha"). Defina ADMIN_PASSWORD em produção!\x1b[0m');
}

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const STORE_FILE = path.join(PUBLIC_DIR, 'data', 'store.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8'
};

function readBody(req, limitBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Corpo da requisição excede o limite de 12 MB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(Buffer.concat(chunks).toString('utf8'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function verifyAuth(req, res) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_PASSWORD) {
    sendJson(res, 401, { erro: 'Senha incorreta' });
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API Routes
  if (pathname === '/api/store') {
    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(STORE_FILE)) {
          return sendJson(res, 404, { erro: 'Arquivo store.json não encontrado' });
        }
        const data = fs.readFileSync(STORE_FILE, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
      } catch (err) {
        sendJson(res, 500, { erro: 'Erro ao ler a loja: ' + err.message });
      }
      return;
    }

    if (req.method === 'POST') {
      if (!verifyAuth(req, res)) return;
      try {
        const bodyStr = await readBody(req);
        const data = JSON.parse(bodyStr);

        if (!Array.isArray(data.products) || typeof data.whatsapp !== 'string') {
          return sendJson(res, 400, { erro: 'Formato inválido: products deve ser lista e whatsapp deve ser texto.' });
        }

        fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 1), 'utf8');
        return sendJson(res, 200, { ok: true, mensagem: 'Dados atualizados com sucesso.' });
      } catch (err) {
        return sendJson(res, 500, { erro: 'Erro ao salvar store.json: ' + err.message });
      }
    }

    return sendJson(res, 405, { erro: 'Método não permitido' });
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    if (!verifyAuth(req, res)) return;
    try {
      const bodyStr = await readBody(req);
      const { data } = JSON.parse(bodyStr);

      const match = typeof data === 'string' && data.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/s);
      if (!match) {
        return sendJson(res, 400, { erro: 'Formato de imagem inválido. Aceitos: webp, png, jpeg em Base64.' });
      }

      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const filename = `u${Date.now()}.${ext}`;
      const uploadDir = path.join(PUBLIC_DIR, 'img', 'products');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      return sendJson(res, 200, { path: `img/products/${filename}` });
    } catch (err) {
      return sendJson(res, 500, { erro: 'Erro no envio da imagem: ' + err.message });
    }
  }

  // Static files handling
  let relativePath = pathname;
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  } else if (relativePath === '/admin') {
    relativePath = '/admin.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  // Path Traversal Security Protection
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    // Long-term cache for immutable assets (frames and product images)
    const isAsset = relativePath.startsWith('/frames/') || relativePath.startsWith('/img/');
    const cacheControl = isAsset
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stats.size,
      'Cache-Control': cacheControl
    });

    const stream = fs.createReadStream(safePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[32m[SUCESSO] Servidor rodando em http://localhost:${PORT}\x1b[0m`);
});
