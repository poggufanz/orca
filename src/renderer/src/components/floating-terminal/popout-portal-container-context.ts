import { createContext, useContext } from 'react'

export const PopoutPortalContainerContext = createContext<HTMLElement | null>(null)

export function usePopoutPortalContainer(): HTMLElement | null {
  return useContext(PopoutPortalContainerContext)
}
