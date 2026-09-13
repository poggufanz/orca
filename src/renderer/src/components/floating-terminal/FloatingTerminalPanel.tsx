import { createPortal } from 'react-dom'
import { PopoutPortalContainerContext } from './popout-portal-container-context'
import { renderFloatingTerminalPanelSurface } from './FloatingTerminalPanelSurface'
import type { FloatingTerminalPanelProps } from './floating-terminal-panel-types'
import { useFloatingTerminalPanelController } from './use-floating-terminal-panel-controller'

export { FloatingTerminalToggleButton } from './FloatingTerminalToggleButton'
export { clearReportedFloatingFocusCache } from './floating-terminal-focus-reporting'

export function FloatingTerminalPanel(props: FloatingTerminalPanelProps): React.JSX.Element | null {
  const surface = useFloatingTerminalPanelController(props)
  if (surface.isDetached) {
    if (!surface.portalContainer) {
      return null
    }
    return createPortal(
      <PopoutPortalContainerContext.Provider value={surface.portalContainer}>
        {renderFloatingTerminalPanelSurface(surface)}
      </PopoutPortalContainerContext.Provider>,
      surface.portalContainer
    )
  }
  return renderFloatingTerminalPanelSurface(surface)
}
