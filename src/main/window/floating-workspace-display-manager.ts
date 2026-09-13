import { type BrowserWindow, screen } from 'electron'
import {
  calculateTargetDisplayBounds,
  findNextDisplay,
  type WorkspaceDisplayInfo
} from '../../shared/floating-workspace-display'

let floatingWorkspacePopoutWindow: BrowserWindow | null = null

export function getFloatingWorkspacePopoutWindow(): BrowserWindow | null {
  return floatingWorkspacePopoutWindow &&
    !floatingWorkspacePopoutWindow.isDestroyed() &&
    !floatingWorkspacePopoutWindow.webContents.isDestroyed()
    ? floatingWorkspacePopoutWindow
    : null
}

export function setFloatingWorkspacePopoutWindow(window: BrowserWindow | null): void {
  floatingWorkspacePopoutWindow = window
}

export function closeFloatingWorkspacePopout(): void {
  if (floatingWorkspacePopoutWindow && !floatingWorkspacePopoutWindow.isDestroyed()) {
    floatingWorkspacePopoutWindow.close()
  }
  floatingWorkspacePopoutWindow = null
}

export function getConnectedDisplays(): WorkspaceDisplayInfo[] {
  try {
    const primary = screen.getPrimaryDisplay()
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label || (d.id === primary.id ? 'Primary Display' : `Display ${d.id}`),
      bounds: { ...d.bounds },
      workArea: { ...d.workArea },
      isPrimary: d.id === primary.id,
      scaleFactor: d.scaleFactor
    }))
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
  window.setBounds(newBounds)
  return true
}
