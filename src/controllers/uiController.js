const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

const serveFile = (res, fileName) => {
  const filePath = path.join(publicDir, fileName);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath);
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    'Content-Length': body.length
  });
  res.end(body);
  return true;
};

const serveUi = (req, res, pathName) => {
  if (req.method !== 'GET') {
    return false;
  }

  if (pathName === '/' || pathName === '/index.html') {
    return serveFile(res, 'index.html');
  }

  if (pathName === '/styles.css') {
    return serveFile(res, 'styles.css');
  }

  if (pathName === '/app.js') {
    return serveFile(res, 'app.js');
  }

  return false;
};

module.exports = { serveUi };
