export function useSwipe(element, options = {}) {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onSwipe,
    threshold = 30,
    preventDefault = true
  } = options

  let touchStartX = 0
  let touchStartY = 0
  let touchEndX = 0
  let touchEndY = 0
  let touchStartTime = 0

  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX
    touchStartY = e.changedTouches[0].screenY
    touchStartTime = Date.now()
  }

  function handleTouchMove(e) {
    if (preventDefault) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX
    touchEndY = e.changedTouches[0].screenY
    handleSwipe()
  }

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY
    const deltaTime = Date.now() - touchStartTime

    if (deltaTime > 500) return

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (Math.max(absX, absY) < threshold) return

    let direction = null

    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    if (onSwipe) {
      onSwipe(direction, deltaX, deltaY)
    }

    switch (direction) {
      case 'up':
        if (onSwipeUp) onSwipeUp()
        break
      case 'down':
        if (onSwipeDown) onSwipeDown()
        break
      case 'left':
        if (onSwipeLeft) onSwipeLeft()
        break
      case 'right':
        if (onSwipeRight) onSwipeRight()
        break
    }
  }

  function bind() {
    if (!element) return
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  function unbind() {
    if (!element) return
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
  }

  return { bind, unbind }
}

export function useTouchHold(element, options = {}) {
  const { onHoldStart, onHoldEnd, onHold, holdTime = 500 } = options

  let holdTimer = null
  let isHolding = false

  function handleTouchStart() {
    holdTimer = setTimeout(() => {
      isHolding = true
      if (onHoldStart) onHoldStart()
      if (onHold) onHold()
    }, holdTime)
  }

  function handleTouchEnd() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    if (isHolding && onHoldEnd) {
      onHoldEnd()
    }
    isHolding = false
  }

  function bind() {
    if (!element) return
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  }

  function unbind() {
    if (!element) return
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchcancel', handleTouchEnd)
    if (holdTimer) clearTimeout(holdTimer)
  }

  return { bind, unbind }
}
