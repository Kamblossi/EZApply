import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import * as url from 'url';

const isDev = !app.isPackaged;

function createWindow() {
  const iconPath = isDev 
    ? path.join(__dirname, '../../assets/favicon.ico')
    : path.join(__dirname, '../assets/favicon.ico');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Configure session security
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:*;"
        ],
      },
    });
  });

  if (isDev) {
    // DEV: load from Vite dev server
    const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log('Loading from:', devServerUrl);
    win.loadURL(devServerUrl);
    win.webContents.openDevTools();
  } else {
    // PROD: load from built index.html
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
