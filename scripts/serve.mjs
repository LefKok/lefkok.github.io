import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if(url.pathname === '/__qa/mobile') {
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      res.end('<!doctype html><html><head><title>Mobile layout QA</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#ddd;display:flex;justify-content:center"><iframe title="390 pixel mobile preview" src="/" style="width:390px;height:844px;border:0;flex-shrink:0"></iframe></body></html>'); return;
    }
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if(filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const target = (await stat(filename)).isDirectory() ? path.join(filename,'index.html') : filename;
    const body = await readFile(target);
    res.writeHead(200, {'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}); res.end(body);
  } catch {res.writeHead(404, {'Content-Type':'text/plain'});res.end('Not found');}
}).listen(4173,'127.0.0.1',() => console.log('Local: http://127.0.0.1:4173'));
