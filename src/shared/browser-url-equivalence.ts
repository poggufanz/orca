export function isEquivalentBrowserPageUrl(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) {
    return a === b
  }
  if (a === b) {
    return true
  }
  try {
    const urlA = new URL(a)
    const urlB = new URL(b)
    if (urlA.origin !== urlB.origin || urlA.pathname !== urlB.pathname) {
      return false
    }
    const paramsA = new URLSearchParams(urlA.search)
    const paramsB = new URLSearchParams(urlB.search)
    paramsA.delete('t')
    paramsB.delete('t')
    paramsA.sort()
    paramsB.sort()
    return paramsA.toString() === paramsB.toString()
  } catch {
    return false
  }
}
