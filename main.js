const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let masterWindow = null;
let overlayWindow = null;
let isOverlayVisible = true;
let isClickThrough = false;

function createWindows() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // 1. Janela do Painel de Controle do Mestre (Módulo 1)
  masterWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 940,
    minHeight: 680,
    title: 'Chronos RPG — Painel de Controle do Mestre',
    backgroundColor: '#090910',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Garante que o relógio nunca atrase em background
    }
  });

  masterWindow.loadFile(path.join(__dirname, 'src', 'master.html'));

  // 2. Janela do Overlay Flutuante da Mesa (Módulo 2) - Sem bordas de janela e 100% transparente no fundo
  const overlayWidth = 460;
  const overlayHeight = 350;
  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.round((width - overlayWidth) / 2),
    y: 28,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  overlayWindow.setMenuBarVisibility(false);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, 'src', 'overlay.html'));

  masterWindow.on('closed', () => {
    masterWindow = null;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function toggleOverlayVisibility(forceState) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  isOverlayVisible = typeof forceState === 'boolean' ? forceState : !isOverlayVisible;

  if (isOverlayVisible) {
    overlayWindow.showInactive();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    overlayWindow.hide();
  }

  // Notifica ambas as janelas sobre o estado da janela de overlay
  const payload = { visible: isOverlayVisible, clickThrough: isClickThrough };
  if (masterWindow && !masterWindow.isDestroyed()) {
    masterWindow.webContents.send('chronos:overlay-status', payload);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('chronos:overlay-status', payload);
  }
}

function setOverlayClickThrough(ignoreMouse) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  isClickThrough = Boolean(ignoreMouse);
  overlayWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });

  const payload = { visible: isOverlayVisible, clickThrough: isClickThrough };
  if (masterWindow && !masterWindow.isDestroyed()) {
    masterWindow.webContents.send('chronos:overlay-status', payload);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('chronos:overlay-status', payload);
  }
}

app.whenReady().then(() => {
  createWindows();

  // Atalho Global Principal (Especificação: Ctrl + Shift + T)
  const registered = globalShortcut.register('CommandOrControl+Shift+T', () => {
    toggleOverlayVisibility();
  });

  if (!registered) {
    console.warn('Não foi possível registrar o atalho global Ctrl+Shift+T');
  }

  // Atalho Global Secundário para travar/destravar clique no Overlay (Ctrl + Shift + Y)
  globalShortcut.register('CommandOrControl+Shift+Y', () => {
    setOverlayClickThrough(!isClickThrough);
  });

  // Comunicação IPC entre Mestre e Overlay
  ipcMain.on('chronos:state-update', (event, state) => {
    if (overlayWindow && !overlayWindow.isDestroyed() && event.sender !== overlayWindow.webContents) {
      overlayWindow.webContents.send('chronos:state-update', state);
    }
    if (masterWindow && !masterWindow.isDestroyed() && event.sender !== masterWindow.webContents) {
      masterWindow.webContents.send('chronos:state-update', state);
    }
  });

  ipcMain.on('chronos:toggle-overlay', (event, forceState) => {
    toggleOverlayVisibility(forceState);
  });

  ipcMain.on('chronos:set-click-through', (event, ignore) => {
    setOverlayClickThrough(ignore);
  });

  ipcMain.handle('chronos:get-overlay-status', () => {
    return {
      visible: isOverlayVisible,
      clickThrough: isClickThrough,
      isElectron: true
    };
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

