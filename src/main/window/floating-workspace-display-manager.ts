import { BrowserWindow, screen } from 'electron'
import {
  calculateTargetDisplayBounds,
  findNextDisplay,
  type WorkspaceDisplayInfo
} from '../../shared/floating-workspace-display'

let floatingWorkspacePopoutWindow: BrowserWindow | null = null
let lastKnownBounds: Electron.Rectangle | null = null
let activeIdentifyWindows: BrowserWindow[] = []

export function getFloatingWorkspacePopoutWindow(): BrowserWindow | null {
  return floatingWorkspacePopoutWindow &&
    !floatingWorkspacePopoutWindow.isDestroyed() &&
    !floatingWorkspacePopoutWindow.webContents.isDestroyed()
    ? floatingWorkspacePopoutWindow
    : null
}

export function setFloatingWorkspacePopoutWindow(window: BrowserWindow | null): void {
  floatingWorkspacePopoutWindow = window
  if (window && !window.isDestroyed()) {
    try {
      if (typeof window.getBounds === 'function') {
        lastKnownBounds = window.getBounds()
      }
    } catch {
      // noop
    }
    if (typeof window.on === 'function') {
      const updateBounds = (): void => {
        if (!window.isDestroyed() && !window.isMinimized() && !window.isMaximized()) {
          lastKnownBounds = window.getBounds()
        }
      }
      window.on('moved', updateBounds)
      window.on('resize', updateBounds)
      window.on('restore', () => {
        if (!window.isDestroyed() && lastKnownBounds && !window.isMaximized()) {
          window.setBounds(lastKnownBounds)
        }
      })
    }
  } else {
    lastKnownBounds = null
  }
}

export function closeFloatingWorkspacePopout(): void {
  if (floatingWorkspacePopoutWindow && !floatingWorkspacePopoutWindow.isDestroyed()) {
    floatingWorkspacePopoutWindow.close()
  }
  floatingWorkspacePopoutWindow = null
  lastKnownBounds = null
}

export function minimizeFloatingWorkspacePopout(): boolean {
  const win = getFloatingWorkspacePopoutWindow()
  if (win && !win.isDestroyed()) {
    win.minimize()
    return true
  }
  return false
}

export function restoreFloatingWorkspacePopout(): boolean {
  const win = getFloatingWorkspacePopoutWindow()
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) {
      win.restore()
    }
    if (lastKnownBounds && !win.isMaximized()) {
      win.setBounds(lastKnownBounds)
    }
    win.focus()
    return true
  }
  return false
}

export function isFloatingWorkspacePopoutMinimized(): boolean {
  const win = getFloatingWorkspacePopoutWindow()
  if (win && !win.isDestroyed()) {
    return win.isMinimized()
  }
  return false
}

export function focusFloatingWorkspacePopout(): boolean {
  const win = getFloatingWorkspacePopoutWindow()
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) {
      win.restore()
    }
    win.focus()
    return true
  }
  return false
}

export function getCurrentDisplayId(): number | null {
  const win = getFloatingWorkspacePopoutWindow()
  if (win && !win.isDestroyed()) {
    try {
      const bounds = lastKnownBounds ?? win.getBounds()
      const display = screen.getDisplayMatching(bounds)
      return display.id
    } catch {
      return null
    }
  }
  return null
}

export function getConnectedDisplays(): WorkspaceDisplayInfo[] {
  try {
    const primary = screen.getPrimaryDisplay()
    return screen.getAllDisplays().map((d, index) => {
      const displayNumber = index + 1
      const isPrimary = d.id === primary.id
      const label =
        d.label || (isPrimary ? `Monitor ${displayNumber} (Primary)` : `Monitor ${displayNumber}`)
      return {
        id: d.id,
        label,
        bounds: { ...d.bounds },
        workArea: { ...d.workArea },
        isPrimary,
        scaleFactor: d.scaleFactor
      }
    })
  } catch (err) {
    console.warn('[floating-workspace] Failed to get displays:', err)
    return []
  }
}

export function moveWindowToDisplay(window: BrowserWindow, targetDisplayId: number): boolean {
  if (window.isDestroyed()) {
    return false
  }
  const displays = getConnectedDisplays()
  const target = displays.find((d) => d.id === targetDisplayId)
  if (!target) {
    return false
  }
  const currentBounds = window.getBounds()
  const newBounds = calculateTargetDisplayBounds(target, { currentBounds })
  lastKnownBounds = newBounds
  window.setBounds(newBounds)
  return true
}

export function moveWindowToNextDisplay(window: BrowserWindow): boolean {
  if (window.isDestroyed()) {
    return false
  }
  const displays = getConnectedDisplays()
  if (displays.length <= 1) {
    return false
  }
  const currentBounds = window.getBounds()
  const currentDisplay = screen.getDisplayMatching(currentBounds)
  const nextDisplay = findNextDisplay(displays, currentDisplay.id)
  if (!nextDisplay) {
    return false
  }
  const newBounds = calculateTargetDisplayBounds(nextDisplay, { currentBounds })
  lastKnownBounds = newBounds
  window.setBounds(newBounds)
  return true
}

export function closeIdentifyWindows(): void {
  for (const win of activeIdentifyWindows) {
    if (!win.isDestroyed()) {
      win.close()
    }
  }
  activeIdentifyWindows = []
}

export function identifyDisplays(): boolean {
  if (process.env.ORCA_BACKGROUND_LAUNCH === '1') {
    return true
  }
  closeIdentifyWindows()

  try {
    const allDisplays = screen.getAllDisplays()
    const primary = screen.getPrimaryDisplay()

    allDisplays.forEach((display, index) => {
      const displayNumber = index + 1
      const isPrimary = display.id === primary.id
      const label =
        display.label ||
        (isPrimary ? `Monitor ${displayNumber} (Primary)` : `Monitor ${displayNumber}`)
      const resolution = `${display.bounds.width}×${display.bounds.height}`

      const width = 260
      const height = 180
      const x = Math.round(display.bounds.x + (display.bounds.width - width) / 2)
      const y = Math.round(display.bounds.y + (display.bounds.height - height) / 2)

      const overlay = new BrowserWindow({
        x,
        y,
        width,
        height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        movable: false,
        show: false,
        hasShadow: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      })

      if (typeof overlay.setIgnoreMouseEvents === 'function') {
        overlay.setIgnoreMouseEvents(true)
      }

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  body {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    background: rgba(22, 22, 26, 0.92);
    border: 1.5px solid rgba(255, 255, 255, 0.22);
    border-radius: 18px;
    color: #ffffff;
    width: 240px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  }
  .number {
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    color: #38bdf8;
    margin-bottom: 8px;
  }
  .label {
    font-size: 14px;
    font-weight: 600;
    color: #f8fafc;
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
  .info {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="number">${displayNumber}</div>
    <div class="label">${label}</div>
    <div class="info">${resolution}</div>
  </div>
</body>
</html>`

      if (typeof overlay.loadURL === 'function') {
        void overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      }
      if (typeof overlay.once === 'function') {
        overlay.once('ready-to-show', () => {
          if (!overlay.isDestroyed()) {
            overlay.showInactive()
          }
        })
      }

      activeIdentifyWindows.push(overlay)
    })

    setTimeout(() => {
      closeIdentifyWindows()
    }, 2500)

    return true
  } catch (err) {
    console.warn('[floating-workspace] Failed to identify displays:', err)
    return false
  }
}
