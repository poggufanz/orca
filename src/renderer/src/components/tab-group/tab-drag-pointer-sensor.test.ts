// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabDragPointerSensor } from './tab-drag-pointer-sensor'

describe('TabDragPointerSensor', () => {
  let target: HTMLElement

  beforeEach(() => {
    target = document.createElement('div')
    document.body.appendChild(target)
  })

  afterEach(() => {
    target.remove()
    vi.clearAllMocks()
  })

  function createSensor(options = { distance: 12 }) {
    const onStart = vi.fn()
    const onMove = vi.fn()
    const onEnd = vi.fn()
    const onCancel = vi.fn()
    const onPending = vi.fn()
    const onAbort = vi.fn()

    const event = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      button: 0,
      buttons: 1
    })
    Object.defineProperty(event, 'target', { value: target })

    const props = {
      active: 'tab-1',
      activeNode: null,
      event,
      options: {
        activationConstraint: { distance: options.distance }
      },
      onStart,
      onMove,
      onEnd,
      onCancel,
      onPending,
      onAbort
    }

    const sensor = new TabDragPointerSensor(
      props as unknown as ConstructorParameters<typeof TabDragPointerSensor>[0]
    )
    return { sensor, onStart, onMove, onEnd, onCancel, onPending, onAbort }
  }

  it('cancels immediately when pointer moves with no mouse button pressed', () => {
    const { onAbort, onStart } = createSensor()

    // Mouse moved back into window without button held (buttons: 0)
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 200,
        clientY: 200,
        buttons: 0
      })
    )

    expect(onAbort).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('cancels immediately when window receives blur', () => {
    const { onAbort, onStart } = createSensor()

    window.dispatchEvent(new Event('blur'))

    expect(onAbort).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('cancels immediately when document visibility changes to hidden', () => {
    const { onAbort, onStart } = createSensor()

    document.dispatchEvent(new Event('visibilitychange'))

    expect(onAbort).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('cancels on blur when active in an auxiliary popout window', () => {
    const popoutDoc = document.implementation.createHTMLDocument('Popout')
    const popoutWin = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
    Object.defineProperty(popoutDoc, 'defaultView', { value: popoutWin })

    const popoutTarget = popoutDoc.createElement('div')
    popoutDoc.body.appendChild(popoutTarget)

    const onAbort = vi.fn()
    const onStart = vi.fn()
    const event = new PointerEvent('pointerdown', {
      clientX: 50,
      clientY: 50,
      isPrimary: true,
      button: 0,
      buttons: 1
    })
    Object.defineProperty(event, 'target', { value: popoutTarget })

    const props = {
      active: 'tab-popout',
      activeNode: null,
      event,
      options: {
        activationConstraint: { distance: 12 }
      },
      onStart,
      onMove: vi.fn(),
      onEnd: vi.fn(),
      onCancel: vi.fn(),
      onPending: vi.fn(),
      onAbort
    }

    new TabDragPointerSensor(
      props as unknown as ConstructorParameters<typeof TabDragPointerSensor>[0]
    )

    // Verify blur was attached to popout window
    expect(popoutWin.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function), undefined)

    // Trigger blur handler directly from popout window listener registration
    const blurCall = popoutWin.addEventListener.mock.calls.find(([event]) => event === 'blur')
    expect(blurCall).toBeDefined()
    blurCall?.[1](new Event('blur'))

    expect(onAbort).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })
})
