import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  focusFloatingWorkspacePopout,
  getConnectedDisplays,
  getFloatingWorkspacePopoutWindow,
  isFloatingWorkspacePopoutMinimized,
  minimizeFloatingWorkspacePopout,
  moveWindowToDisplay,
  moveWindowToNextDisplay,
  restoreFloatingWorkspacePopout,
  setFloatingWorkspacePopoutWindow
} from './floating-workspace-display-manager'

const mockScreen = vi.hoisted(() => ({
  getPrimaryDisplay: vi.fn(),
  getAllDisplays: vi.fn(),
  getDisplayMatching: vi.fn()
}))

vi.mock('electron', () => ({
  screen: mockScreen,
  BrowserWindow: vi.fn()
}))

describe('floating-workspace-display-manager', () => {
  const display1 = {
    id: 1,
    label: 'Primary Display',
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1
  }

  const display2 = {
    id: 2,
    label: 'Secondary Display',
    bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
    workArea: { x: 1920, y: 40, width: 2560, height: 1400 },
    scaleFactor: 1
  }

  beforeEach(() => {
    mockScreen.getPrimaryDisplay.mockReturnValue(display1)
    mockScreen.getAllDisplays.mockReturnValue([display1, display2])
    mockScreen.getDisplayMatching.mockReturnValue(display1)
    setFloatingWorkspacePopoutWindow(null)
  })

  it('tracks popout window reference and drops destroyed windows', () => {
    const mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { isDestroyed: vi.fn(() => false) }
    }
    setFloatingWorkspacePopoutWindow(mockWindow as never)
    expect(getFloatingWorkspacePopoutWindow()).toBe(mockWindow)

    mockWindow.isDestroyed.mockReturnValue(true)
    expect(getFloatingWorkspacePopoutWindow()).toBeNull()
  })

  it('returns connected displays with primary flag', () => {
    const displays = getConnectedDisplays()
    expect(displays).toHaveLength(2)
    expect(displays[0].isPrimary).toBe(true)
    expect(displays[1].isPrimary).toBe(false)
  })

  it('moves window to target display', () => {
    const mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { isDestroyed: vi.fn(() => false) },
      getBounds: vi.fn(() => ({ x: 100, y: 100, width: 900, height: 600 })),
      setBounds: vi.fn()
    }

    const moved = moveWindowToDisplay(mockWindow as never, 2)
    expect(moved).toBe(true)
    expect(mockWindow.setBounds).toHaveBeenCalledWith({
      width: 900,
      height: 600,
      x: 1920 + Math.round((2560 - 900) / 2),
      y: 40 + Math.round((1400 - 600) / 2)
    })
  })

  it('moves window to next display', () => {
    const mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { isDestroyed: vi.fn(() => false) },
      getBounds: vi.fn(() => ({ x: 100, y: 100, width: 900, height: 600 })),
      setBounds: vi.fn()
    }
    mockScreen.getDisplayMatching.mockReturnValue(display1)

    const moved = moveWindowToNextDisplay(mockWindow as never)
    expect(moved).toBe(true)
    expect(mockWindow.setBounds).toHaveBeenCalledWith({
      width: 900,
      height: 600,
      x: 1920 + Math.round((2560 - 900) / 2),
      y: 40 + Math.round((1400 - 600) / 2)
    })
  })

  it('minimizes, restores, checks minimized state, and focuses popout window', () => {
    const mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { isDestroyed: vi.fn(() => false) },
      minimize: vi.fn(),
      restore: vi.fn(),
      focus: vi.fn(),
      isMinimized: vi.fn(() => true)
    }

    setFloatingWorkspacePopoutWindow(mockWindow as never)

    expect(minimizeFloatingWorkspacePopout()).toBe(true)
    expect(mockWindow.minimize).toHaveBeenCalled()

    expect(isFloatingWorkspacePopoutMinimized()).toBe(true)

    expect(restoreFloatingWorkspacePopout()).toBe(true)
    expect(mockWindow.restore).toHaveBeenCalled()
    expect(mockWindow.focus).toHaveBeenCalled()

    mockWindow.isMinimized.mockReturnValue(false)
    expect(focusFloatingWorkspacePopout()).toBe(true)
    expect(mockWindow.focus).toHaveBeenCalledTimes(2)
  })
})
