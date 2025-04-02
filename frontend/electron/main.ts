import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  // Get the screen dimensions

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "cpuScheduler-icon.ico"),
    width: 1400, // Default width of the window
    height: 800,
    minWidth: 1200, // Minimum width of the window
    minHeight: 800, // Minimum height of the window
    resizable: false, // Allow window resizing
    frame: false, // Remove default window frame
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Center the window
  win.center();
  win.webContents.openDevTools();
  // Remove the application menu bar
  Menu.setApplicationMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Add this after your BrowserWindow creation code

  // Listen for window maximize/unmaximize events
  win.on("maximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: true });
  });

  win.on("unmaximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: false });
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Set up IPC handlers for window controls
ipcMain.on("window-minimize", () => {
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (win) win.close();
});

ipcMain.handle("window-is-maximized", () => {
  if (win) return win.isMaximized();
  return false;
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
