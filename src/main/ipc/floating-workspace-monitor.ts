import { ipcMain } from 'electron'
import {
  focusFloatingWorkspacePopout,
  getConnectedDisplays,
  getFloatingWorkspacePopoutWindow,
  isFloatingWorkspacePopoutMinimized,
  minimizeFloatingWorkspacePopout,
  moveWindowToDisplay,
  moveWindowToNextDisplay,
  restoreFloatingWorkspacePopout
} from '../window/floating-workspace-display-manager'
import { isTrustedUIRenderer, sendToTrustedUIRenderer } from './ui'

export function registerFloatingWorkspaceMonitorHandlers(): void {
  ipcMain.removeHandler('floatingWorkspace:getDisplays')
  ipcMain.removeHandler('floatingWorkspace:moveToDisplay')
  ipcMain.removeHandler('floatingWorkspace:moveToNextDisplay')
  ipcMain.removeHandler('floatingWorkspace:minimize')
  ipcMain.removeHandler('floatingWorkspace:restore')
  ipcMain.removeHandler('floatingWorkspace:isMinimized')
  ipcMain.removeHandler('floatingWorkspace:focus')

  ipcMain.handle('floatingWorkspace:getDisplays', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return []
    }
    return getConnectedDisplays()
  })

  ipcMain.handle('floatingWorkspace:moveToDisplay', (event, displayId: unknown) => {
    if (!isTrustedUIRenderer(event.sender) || typeof displayId !== 'number') {
      return false
    }
    const popout = getFloatingWorkspacePopoutWindow()
    if (!popout) {
      return false
    }
    return moveWindowToDisplay(popout, displayId)
  })

  ipcMain.handle('floatingWorkspace:moveToNextDisplay', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return false
    }
    const popout = getFloatingWorkspacePopoutWindow()
    if (!popout) {
      return false
    }
    return moveWindowToNextDisplay(popout)
  })

  ipcMain.handle('floatingWorkspace:minimize', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return false
    }
    return minimizeFloatingWorkspacePopout()
  })

  ipcMain.handle('floatingWorkspace:restore', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return false
    }
    return restoreFloatingWorkspacePopout()
  })

  ipcMain.handle('floatingWorkspace:isMinimized', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return false
    }
    return isFloatingWorkspacePopoutMinimized()
  })

  ipcMain.handle('floatingWorkspace:focus', (event) => {
    if (!isTrustedUIRenderer(event.sender)) {
      return false
    }
    return focusFloatingWorkspacePopout()
  })
}

export function broadcastDisplaysChanged(): void {
  const displays = getConnectedDisplays()
  sendToTrustedUIRenderer('floatingWorkspace:displaysChanged', displays)
}
