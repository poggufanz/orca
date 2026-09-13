import { describe, expect, it } from 'vitest'
import { isEquivalentBrowserPageUrl } from './browser-url-equivalence'

describe('isEquivalentBrowserPageUrl', () => {
  it('identifies equivalent browser URLs regardless of playback timestamp params', () => {
    expect(
      isEquivalentBrowserPageUrl('https://youtube.com/watch?v=1', 'https://youtube.com/watch?v=1')
    ).toBe(true)
    expect(
      isEquivalentBrowserPageUrl(
        'https://youtube.com/watch?v=1',
        'https://youtube.com/watch?v=1&t=45s'
      )
    ).toBe(true)
    expect(
      isEquivalentBrowserPageUrl(
        'https://youtube.com/watch?v=1&t=10s',
        'https://youtube.com/watch?v=1&t=45s'
      )
    ).toBe(true)
    expect(
      isEquivalentBrowserPageUrl(
        'https://youtube.com/watch?v=1&a=2&t=10s',
        'https://youtube.com/watch?t=45s&a=2&v=1'
      )
    ).toBe(true)
    expect(
      isEquivalentBrowserPageUrl('https://youtube.com/watch?v=1', 'https://youtube.com/watch?v=2')
    ).toBe(false)
    expect(
      isEquivalentBrowserPageUrl('https://youtube.com/watch?v=1', 'https://vimeo.com/watch?v=1')
    ).toBe(false)
    expect(isEquivalentBrowserPageUrl(null, null)).toBe(true)
    expect(isEquivalentBrowserPageUrl('https://youtube.com/watch?v=1', null)).toBe(false)
  })
})
