import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Vite plugin para simular una API de guardado en el entorno de desarrollo
const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/topology' && req.method === 'GET') {
        const filePath = path.resolve(process.cwd(), 'src/mock/topology.json')
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(filePath))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not found' }))
        }
      } else if (req.url === '/api/topology' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          const dirPath = path.resolve(process.cwd(), 'src/mock')
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
          }
          const filePath = path.resolve(dirPath, 'topology.json')
          fs.writeFileSync(filePath, body)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        })
      } else if (req.url === '/api/staff' && req.method === 'GET') {
        const filePath = path.resolve(process.cwd(), 'src/mock/staff.json')
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(filePath))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not found' }))
        }
      } else if (req.url === '/api/staff' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          const dirPath = path.resolve(process.cwd(), 'src/mock')
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
          }
          const filePath = path.resolve(dirPath, 'staff.json')
          fs.writeFileSync(filePath, body)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        })
      } else if (req.url === '/api/history' && req.method === 'GET') {
        const filePath = path.resolve(process.cwd(), 'src/mock/history.json')
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(filePath))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not found' }))
        }
      } else if (req.url === '/api/history' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          const dirPath = path.resolve(process.cwd(), 'src/mock')
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
          }
          const filePath = path.resolve(dirPath, 'history.json')
          fs.writeFileSync(filePath, body)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        })
      } else {
        next()
      }
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
