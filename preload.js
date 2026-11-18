const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chronosElectron', {
  isElectron: true,
  sendStateUpdate: (state) => ipcRenderer.send('chronos:state-update', state),
  onStateUpdate: (callback) => {
    ipcRenderer.on('chronos:state-update', (_event, state) => callback(state));
  },
  toggleOverlay: (forceState) => ipcRenderer.send('chronos:toggle-overlay', forceState),
  setClickThrough: (ignore) => ipcRenderer.send('chronos:set-click-through', ignore),
  getOverlayStatus: () => ipcRenderer.invoke('chronos:get-overlay-status'),
  onOverlayStatus: (callback) => {
    ipcRenderer.on('chronos:overlay-status', (_event, status) => callback(status));
  }
});

