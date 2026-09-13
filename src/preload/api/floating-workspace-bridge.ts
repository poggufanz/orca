import { ipcRenderer } from 'electron'
import type { FloatingWorkspaceApi } from './floating-workspace-api'
import type { WorkspaceDisplayInfo } from '../../shared/floating-workspace-display'

export const floatingWorkspaceApi: FloatingWorkspaceApi = {
  getDisplays: (): Promise<WorkspaceDisplayInfo[]> =>
    ipcRenderer.invoke('floatingWorkspace:getDisplays'),
  moveToDisplay: (displayId: number): Promise<boolean> =>
    ipcRenderer.invoke('floatingWorkspace:moveToDisplay', displayId),
  moveToNextDisplay: (): Promise<boolean> =>
    ipcRenderer.invoke('floatingWorkspace:moveToNextDisplay'),
  onDisplaysChanged: (callback: (displays: WorkspaceDisplayInfo[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, displays: WorkspaceDisplayInfo[]) =>
      callback(displays)
    ipcRenderer.on('floatingWorkspace:displaysChanged', listener)
    return () => ipcRenderer.removeListener('floatingWorkspace:displaysChanged', listener)
  },
  minimize: (): Promise<boolean> => ipcRenderer.invoke('floatingWorkspace:minimize'),
  restore: (): Promise<boolean> => ipcRenderer.invoke('floatingWorkspace:restore'),
  isMinimized: (): Promise<boolean> => ipcRenderer.invoke('floatingWorkspace:isMinimized'),
  focus: (): Promise<boolean> => ipcRenderer.invoke('floatingWorkspace:focus')
}
