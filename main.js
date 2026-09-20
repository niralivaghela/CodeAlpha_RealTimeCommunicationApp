const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  Notification,
  Tray,
  Menu,
  shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let splashWindow = null;
let tray = null;
const SERVER_PORT = process.env.PORT || 5000;
const VITE_PORT = 5173;

// Protocol registration for deep links: nexora://meeting/NX-XXXX-XX
const PROTOCOL_NAME = 'nexora';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      // Check for deep link in arguments
      const deepLinkUrl = commandLine.find((arg) => arg.startsWith(`${PROTOCOL_NAME}://`));
      if (deepLinkUrl) {
        handleDeepLink(deepLinkUrl);
      }
    }
  });
}

function handleDeepLink(url) {
  try {
    // URL format: nexora://meeting/NX-XXXX-XX
    const match = url.match(/meeting\/([a-zA-Z0-9-]+)/i);
    if (match && match[1] && mainWindow) {
      const meetingId = match[1].toUpperCase();
      mainWindow.webContents.send('deep-link-meeting', meetingId);
    }
  } catch (err) {
    console.warn('Failed to parse deep link:', err.message);
  }
}

// Window state file path
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch (e) {}
  return { width: 1440, height: 900 };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMax = mainWindow.isMaximized();
    if (!isMax) {
      const bounds = mainWindow.getBounds();
      fs.writeFileSync(stateFilePath, JSON.stringify(bounds), 'utf8');
    }
  } catch (e) {}
}

function isPortActive(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #f8fafc;
            user-select: none;
          }
          .card {
            background: rgba(10, 15, 29, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 28px;
            padding: 36px 44px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2);
            width: 360px;
          }
          .logo {
            width: 72px;
            height: 72px;
            margin: 0 auto 16px;
            border-radius: 20px;
            background: linear-gradient(135deg, #06b6d4, #6366f1, #a855f7);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: 900;
            color: white;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
          }
          h1 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 1.5px;
            background: linear-gradient(90deg, #ffffff, #818cf8, #38bdf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
          }
          p {
            margin: 6px 0 20px;
            color: #94a3b8;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .spinner {
            width: 24px;
            height: 24px;
            margin: 0 auto;
            border: 2.5px solid rgba(99, 102, 241, 0.2);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">N</div>
          <h1>NEXORA CONNECT</h1>
          <p>Connect. Collaborate. Communicate.</p>
          <div class="spinner"></div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
}

async function createMainWindow() {
  const savedState = loadWindowState();

  const iconPath = fs.existsSync(path.join(__dirname, 'build', 'icon.ico'))
    ? path.join(__dirname, 'build', 'icon.ico')
    : path.join(__dirname, 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: savedState.width || 1440,
    height: savedState.height || 900,
    x: savedState.x,
    y: savedState.y,
    minWidth: 1100,
    minHeight: 700,
    frame: false, // Frameless custom window chrome
    backgroundColor: '#020617',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
    },
  });

  // Determine target URL: Vite dev server or production built files / Express server
  const isViteUp = await isPortActive(VITE_PORT);
  const targetUrl = isViteUp
    ? `http://localhost:${VITE_PORT}`
    : `http://localhost:${SERVER_PORT}`;

  try {
    await mainWindow.loadURL(targetUrl);
  } catch (err) {
    console.warn('Initial load retry:', err.message);
    setTimeout(() => {
      mainWindow.loadURL(targetUrl);
    }, 1500);
  }

  // Once renderer is ready, close splash and show main window
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();

      // Check deep link from startup argv
      const deepLinkUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL_NAME}://`));
      if (deepLinkUrl) {
        handleDeepLink(deepLinkUrl);
      }
    }, 800);
  });

  // Track maximize state
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  mainWindow.on('close', (e) => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native Window Controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Desktop Capturer for Screen Sharing
ipcMain.handle('get-desktop-sources', async (event, options = {}) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: options.types || ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  } catch (err) {
    console.error('get-desktop-sources error:', err);
    return [];
  }
});

// Native Desktop Notifications
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, 'build', 'icon.png');
    new Notification({
      title: title || 'Nexora Connect',
      body: body || '',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
    }).show();
  }
});

ipcMain.on('open-external', (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

function createSystemTray() {
  try {
    const trayIconPath = fs.existsSync(path.join(__dirname, 'build', 'icon.png'))
      ? path.join(__dirname, 'build', 'icon.png')
      : path.join(__dirname, 'build', 'icon.ico');

    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Nexora Connect',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      {
        label: 'New Meeting',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-new-meeting');
          }
        },
      },
      {
        label: 'Join Meeting',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-join-meeting');
          }
        },
      },
      {
        label: 'Settings',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-settings');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Nexora Connect - Connect. Collaborate. Communicate.');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('System tray init note:', err.message);
  }
}

// Application Lifecycle
app.whenReady().then(async () => {
  createSplashWindow();
  await createMainWindow();
  createSystemTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
