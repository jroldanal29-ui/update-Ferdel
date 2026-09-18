const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ferdelDesktop', {
  platform: process.platform,
  version: '1.2.1',
  database: {
    load: (key) => ipcRenderer.invoke('db:load', key),
    save: (key, value) => ipcRenderer.invoke('db:save', key, value),
  },
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getVersion: () => ipcRenderer.invoke('update:version'),
    onStatus: (callback) => {
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('update:status', listener)
      return () => ipcRenderer.removeListener('update:status', listener)
    },
  },
  mobile: {
    getAccess: () => ipcRenderer.invoke('mobile:get-access'),
  },
})
