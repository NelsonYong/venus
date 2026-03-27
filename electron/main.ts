import { app, BrowserWindow, shell } from 'electron'
import { ChildProcess, fork, execFile } from 'child_process'
import * as path from 'path'
import * as net from 'net'
import * as fs from 'fs'
import * as http from 'http'

const isDev = process.env.NODE_ENV !== 'production'
const DEV_PORT = 3353
const DEV_URL = `http://localhost:${DEV_PORT}`

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null
let serverPort: number = DEV_PORT

// ── Helpers ──────────────────────────────────────────────────────────────────

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        srv.close(() => reject(new Error('Could not find free port')))
      }
    })
    srv.on('error', reject)
  })
}

function waitForServer(port: number, timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not become ready within ${timeoutMs}ms`))
        } else {
          setTimeout(check, 500)
        }
        res.resume()
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not become ready within ${timeoutMs}ms`))
        } else {
          setTimeout(check, 500)
        }
      })
      req.end()
    }
    check()
  })
}

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {}
  if (!fs.existsSync(envPath)) return env
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

// ── Production server ────────────────────────────────────────────────────────

async function startProductionServer(): Promise<number> {
  const port = await findFreePort()
  const resourcesPath = process.resourcesPath
  const serverJs = path.join(resourcesPath, 'standalone', 'server.js')

  if (!fs.existsSync(serverJs)) {
    throw new Error(`Standalone server not found at ${serverJs}`)
  }

  // Load .env from resources
  const envFile = loadEnvFile(path.join(resourcesPath, '.env'))

  // Prisma engine path
  const prismaEnginePath = path.join(resourcesPath, 'prisma-engine', 'libquery_engine-darwin-arm64.dylib.node')

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...envFile,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
  }

  if (fs.existsSync(prismaEnginePath)) {
    env.PRISMA_QUERY_ENGINE_LIBRARY = prismaEnginePath
  }

  serverProcess = fork(serverJs, [], {
    cwd: path.join(resourcesPath, 'standalone'),
    env,
    stdio: 'pipe',
  })

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[server] ${data.toString().trim()}`)
  })

  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[server] ${data.toString().trim()}`)
  })

  serverProcess.on('exit', (code) => {
    console.log(`[server] exited with code ${code}`)
    serverProcess = null
  })

  await waitForServer(port)
  return port
}

// ── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Venus',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`)

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    if (isDev) {
      serverPort = DEV_PORT
    } else {
      console.log('[electron] Starting production server...')
      serverPort = await startProductionServer()
      console.log(`[electron] Server ready on port ${serverPort}`)
    }
    createWindow()
  } catch (error) {
    console.error('[electron] Failed to start:', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('[electron] Shutting down server...')
    serverProcess.kill('SIGTERM')
    // Force kill after 5 seconds
    const timer = setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL')
      }
    }, 5000)
    serverProcess.on('exit', () => clearTimeout(timer))
  }
})
