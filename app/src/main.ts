import { app, BrowserWindow } from 'electron';
import path from 'path';
import * as url from 'url';

const isDev = !app.isPackaged;

function createWindow() {
  const iconPath = isDev 
    ? path.join(__dirname, '../../assets/favicon.ico')  // 🎨 DEV: from app/src/ to app/assets/
    : path.join(__dirname, '../assets/favicon.ico');     // 🎨 PROD: from built location
  
  console.log('🎨 Using icon path:', iconPath);
  console.log('🎨 Icon exists:', require('fs').existsSync(iconPath));
  
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 🎨 Force set icon after window creation for Windows taskbar
  win.setIcon(iconPath);
  
  if (isDev) {
    // 🧪 DEV: load from Vite dev server (Electron Forge provides the URL)
    const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devServerUrl);
    win.webContents.openDevTools();
  } else {
    // 📦 PROD: load from built index.html
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, '../renderer/index.html'),
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
