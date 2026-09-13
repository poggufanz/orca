import { type BrowserWindow, screen } from 'electron'
import {
  calculateTargetDisplayBounds,
  type WorkspaceDisplayInfo
} from '../../shared/floating-workspace-display'

let lastKnownBounds: Electron.Rectangle | null = null
let lastKnownDisplayId: number | null = null
let wasMaximizedBeforeMinimize = false
let isRestoring = false
let restoreTimeoutId: NodeJS.Timeout | null = null

export function resetPopoutRestoreState(): void {
  lastKnownBounds = null
  lastKnownDisplayId = null
  wasMaximizedBeforeMinimize = false
  isRestoring = false
  if (restoreTimeoutId) {
    clearTimeout(restoreTimeoutId)
    restoreTimeoutId = null
  }
}

export function setPopoutDisplayTarget(
  displayId: number,
  bounds: Electron.Rectangle,
  isMaximized: boolean
): void {
  lastKnownDisplayId = displayId
  lastKnownBounds = bounds
  wasMaximizedBeforeMinimize = isMaximized
}

export function getLastKnownDisplayId(): number | null {
  return lastKnownDisplayId
}

export function isPopoutRestoring(): boolean {
  return isRestoring
}

export function getPopoutCurrentDisplayId(window: BrowserWindow): number | null {
  try {
    const isMin = typeof window.isMinimized === 'function' ? window.isMinimized() : false
    if (isMin || isRestoring) {
      return lastKnownDisplayId
    }
    if (typeof window.getBounds !== 'function') {
      return lastKnownDisplayId
    }
    const bounds = window.getBounds()
    if (bounds.x <= -10000 || bounds.y <= -10000) {
      return lastKnownDisplayId
    }
    return screen.getDisplayMatching(bounds).id
  } catch {
    return lastKnownDisplayId
  }
}

export function repositionPopoutToDisplay(
  window: BrowserWindow,
  displays: readonly WorkspaceDisplayInfo[]
): void {
  if (window.isDestroyed() || typeof window.getBounds !== 'function') {
    isRestoring = false
    return
  }
  const currentBounds = window.getBounds()
  if (currentBounds.x <= -10000 || currentBounds.y <= -10000) {
    return
  }

  const targetDisplay =
    (lastKnownDisplayId != null ? displays.find((d) => d.id === lastKnownDisplayId) : null) ??
    displays.find((d) => !d.isPrimary) ??
    displays[0]

  if (!targetDisplay) {
    isRestoring = false
    return
  }

  let currentDisplayId: number | null = null
  try {
    currentDisplayId = screen.getDisplayMatching(currentBounds).id
  } catch {
    // ignore
  }

  const isWrongDisplay = currentDisplayId !== targetDisplay.id
  const isCurrentlyMax = typeof window.isMaximized === 'function' ? window.isMaximized() : false
  const shouldBeMax = wasMaximizedBeforeMinimize || isCurrentlyMax

  if (shouldBeMax) {
    if (isWrongDisplay) {
      if (typeof window.unmaximize === 'function') {
        window.unmaximize()
      }
      const targetBounds = calculateTargetDisplayBounds(targetDisplay)
      if (typeof window.setBounds === 'function') {
        window.setBounds(targetBounds)
      }
      if (typeof window.maximize === 'function') {
        window.maximize()
      }
    }
  } else {
    let lastBoundsDisplayId: number | null = null
    if (lastKnownBounds) {
      try {
        lastBoundsDisplayId = screen.getDisplayMatching(lastKnownBounds).id
      } catch {
        // ignore
      }
    }
    const bounds =
      lastKnownBounds && lastBoundsDisplayId === targetDisplay.id
        ? lastKnownBounds
        : calculateTargetDisplayBounds(targetDisplay, {
            currentBounds: lastKnownBounds ?? undefined
          })
    if (isWrongDisplay || lastKnownBounds) {
      if (typeof window.setBounds === 'function') {
        window.setBounds(bounds)
      }
    }
  }
}

export function restorePopoutWindow(
  window: BrowserWindow,
  displays: readonly WorkspaceDisplayInfo[]
): boolean {
  isRestoring = true
  const isMin = typeof window.isMinimized === 'function' ? window.isMinimized() : false
  if (isMin && typeof window.restore === 'function') {
    window.restore()
  }
  const targetDisplay =
    (lastKnownDisplayId != null ? displays.find((d) => d.id === lastKnownDisplayId) : null) ??
    displays.find((d) => !d.isPrimary) ??
    displays[0]

  if (targetDisplay) {
    const isCurrentlyMax = typeof window.isMaximized === 'function' ? window.isMaximized() : false
    const shouldBeMax = wasMaximizedBeforeMinimize || isCurrentlyMax
    if (shouldBeMax) {
      if (typeof window.unmaximize === 'function') {
        window.unmaximize()
      }
      if (typeof window.setBounds === 'function') {
        window.setBounds(calculateTargetDisplayBounds(targetDisplay))
      }
      if (typeof window.maximize === 'function') {
        window.maximize()
      }
    } else if (lastKnownBounds) {
      if (typeof window.setBounds === 'function') {
        window.setBounds(lastKnownBounds)
      }
    } else if (typeof window.setBounds === 'function') {
      window.setBounds(calculateTargetDisplayBounds(targetDisplay))
    }
  }
  if (typeof window.focus === 'function') {
    window.focus()
  }
  setTimeout(() => {
    isRestoring = false
  }, 200)
  return true
}

export function recordPopoutMinimize(window: BrowserWindow): void {
  const isMax = typeof window.isMaximized === 'function' ? window.isMaximized() : false
  if (isMax) {
    wasMaximizedBeforeMinimize = true
  }
  try {
    if (typeof window.getBounds === 'function') {
      const bounds = window.getBounds()
      if (bounds.x > -10000 && bounds.y > -10000) {
        lastKnownDisplayId = screen.getDisplayMatching(bounds).id
      }
    }
  } catch {
    // ignore
  }
}

export function installPopoutRestoreTracking(
  window: BrowserWindow,
  getDisplays: () => readonly WorkspaceDisplayInfo[]
): void {
  try {
    if (typeof window.getBounds === 'function') {
      const bounds = window.getBounds()
      if (bounds.x > -10000 && bounds.y > -10000) {
        lastKnownBounds = bounds
        lastKnownDisplayId = screen.getDisplayMatching(bounds).id
      }
    }
  } catch {
    // noop
  }

  if (typeof window.on !== 'function') {
    return
  }

  const updateState = (): void => {
    if (isRestoring || window.isDestroyed()) {
      return
    }
    const isMin = typeof window.isMinimized === 'function' ? window.isMinimized() : false
    if (isMin) {
      return
    }
    if (typeof window.getBounds !== 'function') {
      return
    }
    const bounds = window.getBounds()
    if (bounds.x <= -10000 || bounds.y <= -10000) {
      return
    }
    const isMax = typeof window.isMaximized === 'function' ? window.isMaximized() : false
    wasMaximizedBeforeMinimize = isMax
    try {
      lastKnownDisplayId = screen.getDisplayMatching(bounds).id
    } catch {
      // ignore
    }
    if (!isMax) {
      lastKnownBounds = bounds
    }
  }

  window.on('moved', updateState)
  window.on('resize', updateState)
  window.on('minimize', () => {
    if (!window.isDestroyed()) {
      recordPopoutMinimize(window)
    }
  })

  window.on('restore', () => {
    isRestoring = true
    repositionPopoutToDisplay(window, getDisplays())
    if (restoreTimeoutId) {
      clearTimeout(restoreTimeoutId)
    }
    restoreTimeoutId = setTimeout(() => {
      repositionPopoutToDisplay(window, getDisplays())
      setTimeout(() => {
        repositionPopoutToDisplay(window, getDisplays())
        isRestoring = false
        updateState()
      }, 150)
    }, 60)
  })
}
