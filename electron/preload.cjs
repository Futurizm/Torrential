const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('torrential', {
  isDesktop: true,
  platform: process.platform,
  info: () => ipcRenderer.invoke('torrential:info'),
  revealDownloads: () => ipcRenderer.invoke('torrential:reveal-downloads'),
  /** Оболочка переводит свои нативные диалоги на язык интерфейса. */
  setLocale: (locale) => ipcRenderer.invoke('torrential:set-locale', locale),
})