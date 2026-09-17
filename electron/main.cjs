const { app, BrowserWindow, shell, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const http = require('http')
const os = require('os')

let db
let mainWindow
let manualUpdateCheck = false
let mobileServer
let mobileAccessUrl = ''

function getLocalIpv4() {
  const interfaces = os.networkInterfaces()
  const physical = Object.entries(interfaces).filter(([name]) => !/(virtual|vethernet|vmware|virtualbox|docker|wsl|tailscale|loopback)/i.test(name))
  for (const [, entries] of physical) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')) return entry.address
    }
  }
  for (const entries of Object.values(interfaces)) {
    const fallback = (entries || []).find(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
    if (fallback) return fallback.address
  }
  return '127.0.0.1'
}

function initializeMobileAccess() {
  const distPath = path.resolve(__dirname, '..', 'dist')
  const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' }
  mobileServer = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); return response.end() }
    let relativePath = 'index.html'
    try { relativePath = decodeURIComponent((request.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html' }
    catch { response.writeHead(400); return response.end() }
    let filePath = path.resolve(distPath, relativePath)
    if (!filePath.startsWith(distPath + path.sep) && filePath !== path.join(distPath, 'index.html')) { response.writeHead(403); return response.end() }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(distPath, 'index.html')
    fs.readFile(filePath, (error, content) => {
      if (error) { response.writeHead(404); return response.end('No encontrado') }
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
      if (request.method === 'HEAD') return response.end()
      response.end(content)
    })
  })
  mobileServer.on('error', error => console.error('No se pudo iniciar el acceso móvil:', error.message))
  mobileServer.listen(4173, '0.0.0.0', () => { mobileAccessUrl = `http://${getLocalIpv4()}:4173` })
  ipcMain.handle('mobile:get-access', () => ({ url: mobileAccessUrl, local: true }))
}

function sendUpdateStatus(status, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', { status, ...payload })
  }
}

function initializeUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking', { manual: manualUpdateCheck }))
  autoUpdater.on('update-available', info => {
    sendUpdateStatus('available', {
      version: info.version,
      releaseName: info.releaseName || `Versión ${info.version}`,
      releaseDate: info.releaseDate,
    })
    manualUpdateCheck = false
  })
  autoUpdater.on('update-not-available', info => {
    sendUpdateStatus('not-available', { version: info.version, manual: manualUpdateCheck })
    manualUpdateCheck = false
  })
  autoUpdater.on('download-progress', progress => sendUpdateStatus('downloading', {
    percent: Math.round(progress.percent),
    transferred: progress.transferred,
    total: progress.total,
  }))
  autoUpdater.on('update-downloaded', info => sendUpdateStatus('downloaded', { version: info.version }))
  autoUpdater.on('error', error => {
    sendUpdateStatus('error', { message: error.message, manual: manualUpdateCheck })
    manualUpdateCheck = false
  })

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) return { development: true, version: app.getVersion() }
    manualUpdateCheck = true
    await autoUpdater.checkForUpdates()
    return { development: false, version: app.getVersion() }
  })
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(false, true))
  ipcMain.handle('update:version', () => app.getVersion())
}

function initializeDatabase() {
  try {
    const { DatabaseSync } = require('node:sqlite')
    db = new DatabaseSync(path.join(app.getPath('userData'), 'ferdel-gestion.db'))
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY,
        state_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        user_name TEXT NOT NULL DEFAULT 'Ana Torres',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    ipcMain.handle('db:load', (_, key) => {
      const row = db.prepare('SELECT state_value FROM app_state WHERE state_key = ?').get(key)
      return row ? JSON.parse(row.state_value) : null
    })
    ipcMain.handle('db:save', (_, key, value) => {
      db.prepare(`INSERT INTO app_state (state_key, state_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = CURRENT_TIMESTAMP`).run(key, JSON.stringify(value))
      db.prepare('INSERT INTO audit_log (action, entity) VALUES (?, ?)').run('ACTUALIZAR', key)
      return true
    })
  } catch (error) {
    console.error('No se pudo iniciar SQLite:', error)
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#f4f7fb',
    title: 'FERDEL Gestión',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow = win

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.once('did-finish-load', () => {
    sendUpdateStatus('ready', { version: app.getVersion() })
    if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 8000)
  })
}

app.whenReady().then(() => {
  initializeDatabase()
  initializeUpdater()
  initializeMobileAccess()
  createWindow()
  if (app.isPackaged) setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), 6 * 60 * 60 * 1000)
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
app.on('before-quit', () => mobileServer?.close())
