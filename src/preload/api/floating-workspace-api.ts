import type { WorkspaceDisplayInfo } from '../../shared/floating-workspace-display'

export type FloatingWorkspaceApi = {
  getDisplays: () => Promise<WorkspaceDisplayInfo[]>
  moveToDisplay: (displayId: number) => Promise<boolean>
  moveToNextDisplay: () => Promise<boolean>
  onDisplaysChanged: (callback: (displays: WorkspaceDisplayInfo[]) => void) => () => void
  minimize: () => Promise<boolean>
  restore: () => Promise<boolean>
  isMinimized: () => Promise<boolean>
  focus: () => Promise<boolean>
}
