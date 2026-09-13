import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkspaceDisplayInfo } from '../../../../shared/floating-workspace-display'

export function useFloatingWorkspacePopout() {
  const [isDetached, setIsDetached] = useState(false)
  const [displays, setDisplays] = useState<WorkspaceDisplayInfo[]>([])
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [popupWindow, setPopupWindow] = useState<Window | null>(null)
  const popupRef = useRef<Window | null>(null)

  useEffect(() => {
    let active = true
    void window.api?.floatingWorkspace?.getDisplays?.().then((result) => {
      if (active && Array.isArray(result)) {
        setDisplays(result)
      }
    })

    const unsubscribe = window.api?.floatingWorkspace?.onDisplaysChanged?.((updated) => {
      if (active && Array.isArray(updated)) {
        setDisplays(updated)
      }
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  const dock = useCallback((): void => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
    setPopupWindow(null)
    setPortalContainer(null)
    setIsDetached(false)
  }, [])

  const detach = useCallback((targetDisplayId?: number): void => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus()
      if (typeof targetDisplayId === 'number') {
        void window.api?.floatingWorkspace?.moveToDisplay?.(targetDisplayId)
      }
      return
    }

    if (typeof window === 'undefined' || typeof window.open !== 'function') {
      return
    }

    const popup = window.open(
      'about:blank#floating-workspace',
      'orca-floating-workspace',
      'width=960,height=640'
    )

    if (!popup) {
      console.warn('[floating-workspace] Failed to open popout window')
      return
    }

    popupRef.current = popup

    try {
      popup.document.title = 'Orca - Floating Workspace'

      // Copy stylesheet and style tags
      for (const sheet of Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))) {
        popup.document.head.appendChild(sheet.cloneNode(true))
      }

      popup.document.documentElement.className = document.documentElement.className
      popup.document.documentElement.style.cssText = document.documentElement.style.cssText
      popup.document.body.className =
        'm-0 p-0 overflow-hidden bg-background text-foreground h-screen w-screen'

      let container = popup.document.getElementById('floating-workspace-portal-root')
      if (!container) {
        container = popup.document.createElement('div')
        container.id = 'floating-workspace-portal-root'
        container.className = 'h-full w-full'
        popup.document.body.appendChild(container)
      }

      setPortalContainer(container)
      setIsDetached(true)
      setPopupWindow(popup)

      if (typeof targetDisplayId === 'number') {
        setTimeout(() => {
          void window.api?.floatingWorkspace?.moveToDisplay?.(targetDisplayId)
        }, 50)
      }
    } catch (err) {
      console.warn('[floating-workspace] Error setting up popout document:', err)
      setIsDetached(false)
      setPortalContainer(null)
      setPopupWindow(null)
      popupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!popupWindow) {
      return
    }

    const handleUnload = (): void => {
      setIsDetached(false)
      setPortalContainer(null)
      setPopupWindow(null)
      popupRef.current = null
    }
    popupWindow.addEventListener('beforeunload', handleUnload)

    const observer = new MutationObserver(() => {
      if (!popupWindow.closed) {
        popupWindow.document.documentElement.className = document.documentElement.className
        popupWindow.document.documentElement.style.cssText = document.documentElement.style.cssText
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    })

    return () => {
      try {
        popupWindow.removeEventListener('beforeunload', handleUnload)
      } catch {
        // window may already be closed
      }
      observer.disconnect()
      if (!popupWindow.closed) {
        popupWindow.close()
      }
    }
  }, [popupWindow])

  const moveToNextDisplay = useCallback((): void => {
    if (!isDetached) {
      const nextDisplay = displays.find((d) => !d.isPrimary) ?? displays[0]
      detach(nextDisplay?.id)
      return
    }
    void window.api?.floatingWorkspace?.moveToNextDisplay?.()
  }, [detach, displays, isDetached])

  const moveToDisplay = useCallback(
    (displayId: number): void => {
      if (!isDetached) {
        detach(displayId)
        return
      }
      void window.api?.floatingWorkspace?.moveToDisplay?.(displayId)
    },
    [detach, isDetached]
  )

  const minimize = useCallback((): void => {
    void window.api?.floatingWorkspace?.minimize?.()
  }, [])

  const restore = useCallback((): void => {
    void window.api?.floatingWorkspace?.restore?.()
  }, [])

  const focus = useCallback((): void => {
    void window.api?.floatingWorkspace?.focus?.()
  }, [])

  return {
    isDetached,
    displays,
    portalContainer,
    detach,
    dock,
    moveToNextDisplay,
    moveToDisplay,
    minimize,
    restore,
    focus
  }
}
