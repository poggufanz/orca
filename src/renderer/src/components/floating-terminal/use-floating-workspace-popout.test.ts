/** @vitest-environment happy-dom */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFloatingWorkspacePopout } from './use-floating-workspace-popout'
import type { WorkspaceDisplayInfo } from '../../../../shared/floating-workspace-display'

const mockDisplays: WorkspaceDisplayInfo[] = [
  {
    id: 1,
    label: 'Display 1',
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1,
    isPrimary: true
  },
  {
    id: 2,
    label: 'Display 2',
    bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
    workArea: { x: 1920, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1,
    isPrimary: false
  }
]

describe('useFloatingWorkspacePopout', () => {
  let mockWindowOpen: ReturnType<typeof vi.fn>
  let mockPopup: {
    document: {
      title: string
      head: { appendChild: ReturnType<typeof vi.fn> }
      documentElement: { className: string; style: { cssText: string } }
      body: { className: string; appendChild: ReturnType<typeof vi.fn> }
      getElementById: ReturnType<typeof vi.fn>
      createElement: ReturnType<typeof vi.fn>
    }
    closed: boolean
    close: ReturnType<typeof vi.fn>
    focus: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }
  let displayChangeListener: ((displays: WorkspaceDisplayInfo[]) => void) | null = null

  beforeEach(() => {
    displayChangeListener = null
    const mockContainer = document.createElement('div')
    mockContainer.id = 'floating-workspace-portal-root'

    mockPopup = {
      document: {
        title: '',
        head: { appendChild: vi.fn() },
        documentElement: { className: '', style: { cssText: '' } },
        body: { className: '', appendChild: vi.fn() },
        getElementById: vi.fn(() => null),
        createElement: vi.fn(() => mockContainer)
      },
      closed: false,
      close: vi.fn(function (this: typeof mockPopup) {
        this.closed = true
      }),
      focus: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    mockWindowOpen = vi.fn(() => mockPopup)
    window.open = mockWindowOpen as unknown as typeof window.open

    window.api = {
      ...window.api,
      floatingWorkspace: {
        getDisplays: vi.fn().mockResolvedValue(mockDisplays),
        moveToDisplay: vi.fn().mockResolvedValue(true),
        moveToNextDisplay: vi.fn().mockResolvedValue(true),
        onDisplaysChanged: vi.fn((cb) => {
          displayChangeListener = cb
          return () => {
            displayChangeListener = null
          }
        })
      }
    } as unknown as typeof window.api
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates connected displays on mount and handles updates', async () => {
    const { result } = renderHook(() => useFloatingWorkspacePopout())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.displays).toEqual(mockDisplays)

    const updatedDisplays: WorkspaceDisplayInfo[] = [mockDisplays[0]]
    act(() => {
      displayChangeListener?.(updatedDisplays)
    })

    expect(result.current.displays).toEqual(updatedDisplays)
  })

  it('opens a popout window and sets isDetached when detach is called', async () => {
    const { result } = renderHook(() => useFloatingWorkspacePopout())

    act(() => {
      result.current.detach()
    })

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'about:blank#floating-workspace',
      'orca-floating-workspace',
      'width=960,height=640'
    )
    expect(result.current.isDetached).toBe(true)
    expect(result.current.portalContainer).toBeTruthy()
  })

  it('closes popout and restores state when dock is called', async () => {
    const { result } = renderHook(() => useFloatingWorkspacePopout())

    act(() => {
      result.current.detach()
    })
    expect(result.current.isDetached).toBe(true)

    act(() => {
      result.current.dock()
    })

    expect(mockPopup.close).toHaveBeenCalled()
    expect(result.current.isDetached).toBe(false)
    expect(result.current.portalContainer).toBeNull()
  })

  it('routes moveToNextDisplay to detach on second monitor when not yet detached', async () => {
    const { result } = renderHook(() => useFloatingWorkspacePopout())

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.moveToNextDisplay()
    })

    expect(mockWindowOpen).toHaveBeenCalled()
    expect(result.current.isDetached).toBe(true)
  })

  it('routes moveToNextDisplay to IPC when already detached', async () => {
    const { result } = renderHook(() => useFloatingWorkspacePopout())

    act(() => {
      result.current.detach()
    })

    act(() => {
      result.current.moveToNextDisplay()
    })

    expect(window.api.floatingWorkspace.moveToNextDisplay).toHaveBeenCalled()
  })
})
