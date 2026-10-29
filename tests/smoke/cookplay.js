// Shared cooking-step drivers for the Stage F smoke tests.
import { expect } from '@playwright/test'

export async function cookReady(page) {
  await page.waitForFunction(() => typeof window.__tpCook?.open === 'function', null, { timeout: 60_000 })
}

export async function openStep(page, step, scale = 1) {
  await page.evaluate(({ step, scale }) => {
    window.__tpCook.last = null
    window.__tpCook.hold = false
    window.__tpCook.force(null)
    window.__tpCook.scale = scale
    window.__tpCook.open(step)
  }, { step, scale })
  await page.waitForFunction(() => window.__tpCook.ready === true && document.querySelector('[data-step]'), null, { timeout: 30_000 })
}

// Card, Skip, meter, and hint sit in the viewport, Skip's center hits the button, and step art stays off the meter.
export async function expectCookFits(page) {
  const fit = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight
    const box = (el) => {
      const b = el.getBoundingClientRect()
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }
    }
    const card = box(document.querySelector('.tp-cook-card'))
    const skip = box(document.querySelector('.tp-cook-skip'))
    const meter = box(document.querySelector('.tp-cook-meter'))
    const hint = box(document.querySelector('.tp-cook-hint'))
    const art = document.querySelector('[data-step]')
    const overlap = (a, b) => a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5
    let artOverlap = false
    for (const el of art.querySelectorAll('ellipse, circle, path, rect, polygon')) {
      const b = el.getBoundingClientRect()
      if (b.width > 1 && b.height > 1 && overlap(b, meter)) artOverlap = true
    }
    const hit = document.elementFromPoint(skip.left + skip.width / 2, skip.top + skip.height / 2)
    const skipEl = document.querySelector('.tp-cook-skip')
    const inside = (b) => b.left >= -0.5 && b.top >= -0.5 && b.right <= vw + 0.5 && b.bottom <= vh + 0.5
    return {
      step: art.dataset.step, vw, vh,
      cardIn: inside(card), skipIn: inside(skip), meterIn: inside(meter), hintIn: inside(hint),
      skipTap: !!(hit && skipEl.contains(hit)),
      artOverlap, card, skip,
    }
  })
  const where = `${fit.step} ${fit.vw}x${fit.vh}`
  expect(fit.cardIn, `${where} card ${JSON.stringify(fit.card)}`).toBe(true)
  expect(fit.skipIn, `${where} skip ${JSON.stringify(fit.skip)}`).toBe(true)
  expect(fit.skipTap, `${where} skip tappable`).toBe(true)
  expect(fit.meterIn, `${where} meter`).toBe(true)
  expect(fit.hintIn, `${where} hint`).toBe(true)
  expect(fit.artOverlap, `${where} art overlaps the progress bar`).toBe(false)
}

export async function settled(page) {
  await page.waitForFunction(() => !document.querySelector('.tp-cook'), null, { timeout: 20_000 })
}

export async function playStirKey(page) {
  await openStep(page, 'stir')
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__tpCook.last?.via === 'play', null, { timeout: 20_000 })
  await page.keyboard.up('Space')
  const last = await page.evaluate(() => window.__tpCook.last)
  expect(last).toMatchObject({ perfect: true, item: 'soup_perfect', via: 'play' })
  await settled(page)
}

// Circles, paced to the game clock so a slow frame still lands in the calm band.
export async function playStirTouch(page, pointerType = 'touch') {
  await openStep(page, 'stir')
  const last = await page.evaluate((pointerType) => new Promise((resolve) => {
    const el = document.querySelector('[data-step]')
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const ev = (type, x, y, buttons) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType, isPrimary: true, button: 0, buttons,
      clientX: x, clientY: y,
    }))
    ev('pointerdown', cx + 36, cy, 1)
    let ang = 0, lastT = performance.now(), spins = 0
    const loop = (now) => {
      if (window.__tpCook.last?.via === 'play' || spins > 800) {
        ev('pointerup', cx, cy, 0)
        resolve(window.__tpCook.last)
        return
      }
      const dt = Math.min(0.05, (now - lastT) / 1000) * (window.__tpCook.scale || 1)
      lastT = now
      ang += 0.32 * 2.4 * dt * Math.PI * 2
      spins++
      ev('pointermove', cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40, 1)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }), pointerType)
  expect(last && last.via).toBe('play')
  expect(last.item === 'soup' || last.item === 'soup_perfect').toBe(true)
  expect(last.perfect).toBe(true)
  await settled(page)
}

export async function playFlip(page, { pointerType = 'mouse', key = false } = {}) {
  await openStep(page, 'flip')
  const last = key
    ? await page.evaluate(() => new Promise((resolve) => {
      const loop = () => {
        if (window.__tpCook.last?.via === 'play') { resolve(window.__tpCook.last); return }
        const pad = document.querySelector('[data-step]')
        if (pad && pad.dataset.gold === '1' && !pad.dataset.sent) {
          pad.dataset.sent = '1'
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }))
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }))
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }))
    : await page.evaluate((pointerType) => new Promise((resolve) => {
      const loop = () => {
        if (window.__tpCook.last?.via === 'play') { resolve(window.__tpCook.last); return }
        const pad = document.querySelector('[data-step]')
        if (pad && pad.dataset.gold === '1' && !pad.dataset.sent) {
          pad.dataset.sent = '1'
          const r = pad.getBoundingClientRect()
          const ev = (type, buttons) => pad.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: 1, pointerType, isPrimary: true, button: 0, buttons,
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
          }))
          ev('pointerdown', 1); ev('pointerup', 0)
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }), pointerType)
  expect(last).toMatchObject({ perfect: true, item: 'grilledfish_perfect', via: 'play' })
  await settled(page)
}

export async function playPress(page, pointerType = 'mouse') {
  await openStep(page, 'press')
  const last = await page.evaluate((pointerType) => new Promise((resolve) => {
    let lock = false
    const loop = () => {
      if (window.__tpCook.last?.via === 'play') { resolve(window.__tpCook.last); return }
      const st = window.__tpCook.state
      const pad = document.querySelector('.tp-cook-pad')
      if (st && st.hot && pad && !lock) {
        lock = true
        const hits = st.hits
        const r = pad.getBoundingClientRect()
        const ev = (type, buttons) => pad.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: 1, pointerType, isPrimary: true, button: 0, buttons,
          clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        }))
        ev('pointerdown', 1); ev('pointerup', 0)
        const wait = () => {
          const now = window.__tpCook.state
          if (window.__tpCook.last?.via === 'play' || (now && now.hits > hits) || (now && !now.hot)) { lock = false; requestAnimationFrame(loop); return }
          requestAnimationFrame(wait)
        }
        requestAnimationFrame(wait)
        return
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }), pointerType)
  expect(last).toMatchObject({ perfect: true, item: 'onigiri_perfect', via: 'play' })
  await settled(page)
}

export async function playPour(page, pointerType = 'mouse') {
  await openStep(page, 'pour')
  const last = await page.evaluate((pointerType) => new Promise((resolve) => {
    const pad = document.querySelector('.tp-cook-pad')
    const r = pad.getBoundingClientRect()
    const ev = (type, buttons) => pad.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType, isPrimary: true, button: 0, buttons,
      clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.7,
    }))
    ev('pointerdown', 1)
    const loop = () => {
      if (window.__tpCook.last?.via === 'play') { resolve(window.__tpCook.last); return }
      if (pad.dataset.band === '1') { ev('pointerup', 0); }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }), pointerType)
  expect(last).toMatchObject({ perfect: true, item: 'teacup_perfect', via: 'play' })
  await settled(page)
}
