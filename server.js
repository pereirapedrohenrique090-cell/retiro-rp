import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash, timingSafeEqual } from 'node:crypto'

const dir = resolve(process.env.DATA_DIR || 'data')
const password = process.env.APP_PASSWORD
const username = process.env.APP_EMAIL?.trim() || 'fazenda'
if (process.env.RENDER && (!password || !process.env.DATA_DIR)) throw Error('Configure APP_PASSWORD e DATA_DIR.')
mkdirSync(dir, { recursive: true })
const filename = resolve(dir, 'registros.json')
const digest = value => createHash('sha256').update(value).digest()
const assets = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'], '/bovino.jpg': ['bovino.jpg','image/jpeg'] }
createServer(async (req,res) => {
  const send = (status, body, type='application/json') => {
    res.writeHead(status, {'Content-Type':type.startsWith('image/')?type:type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'"})
    res.end(body)
  }
  const path = req.url.split('?')[0]
  if (path === '/health') return send(200,'{"ok":true}')
  if (password && !timingSafeEqual(digest(req.headers.authorization || ''),digest('Basic '+Buffer.from(username+':'+password).toString('base64')))) {
    res.setHeader('WWW-Authenticate','Basic realm="Retiro RP", charset="UTF-8"')
    return send(401,'Acesso restrito','text/plain')
  }
  try {
    if (req.method === 'GET' && assets[path]) {
      const [file,type] = assets[path]
      return send(200,readFileSync(new URL(file,import.meta.url)),type)
    }
    if (path === '/api/registros') {
      const read = () => {
        try { return JSON.parse(readFileSync(filename,'utf8')) }
        catch (error) { if (error.code === 'ENOENT') return {version:0,data:null}; throw error }
      }
      if (req.method === 'GET') return send(200,JSON.stringify(read()))
      if (req.method === 'PUT') {
        if (req.headers['content-type'] !== 'application/json' || req.headers['sec-fetch-site'] === 'cross-site') return send(415,'{}')
        let body = ''
        for await (const chunk of req) {
          body += chunk
          if (body.length > 1_000_000) return send(413,'{}')
        }
        let input
        try { input = JSON.parse(body) } catch { return send(400,'{}') }
        if (!input?.data || !['animals','weights','pastures','feeds','expenses'].every(key => Array.isArray(input.data[key])) || !input.data.sale) return send(400,'{}')
        const current = read()
        if (input.version !== current.version) return send(409,'{}')
        const next = {version:current.version+1,data:input.data}
        writeFileSync(filename+'.tmp',JSON.stringify(next))
        renameSync(filename+'.tmp',filename)
        return send(200,JSON.stringify(next))
      }
    }
    return send(404,'{}')
  } catch (error) {
    console.error(error.message)
    return send(500,'{}')
  }
}).listen(Number(process.env.PORT || 3001),process.env.RENDER ? '0.0.0.0' : '127.0.0.1')

