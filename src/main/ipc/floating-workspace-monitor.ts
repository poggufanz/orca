import { ipcMain } from 'electron'
import {
  getConnectedDisplays,
  getFloatingWorkspacePopoutWindow,
  moveWindowToDisplay,
  moveWindowToNextDisplay
} from '../window/floating-workspace-display-manager'
import { isTrustedUIRenderer, sendToTrustedUIRenderer } from './ui'

export function registerFloatingWorkspaceMonitorHandlers(): void {
  ipcMain.removeHandler('floatingWorkspace:getDisplays')
  ipcMain.removeHandler('floatingWorkspace:moveToDisplay')
  ipcMain.removeHandler('floatingWorkspace:moveToNextDisplay')

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
}

export function broadcastDisplaysChanged(): void {
  const displays = getConnectedDisplays()
  sendToTrustedUIRenderer('floatingWorkspace:displaysChanged', displays)
}
