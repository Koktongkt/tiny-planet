// Chibi Fuku ships in the game (App.jsx, her own lazy chunk); Hoshino is still a draft. The villager list keeps the
// shipped configs (the fallback look), and the draft preview chunk is off unless ?dev=chibi-drafts.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { VILLAGERS } from '../../src/villagers.js'
import { chibiDraftName, draftsEnabled } from '../../src/art/chibi/drafts.js'

const src = (p) => fs.readFileSync(new URL('../../src/' + p, import.meta.url), 'utf8')

test('default game villagers do not use the draft Fuku or Hoshino looks', () => {
  const grandma = VILLAGERS.find(v => v.name === 'grandma')
  const scholar = VILLAGERS.find(v => v.name === 'scholar')
  assert.equal(grandma.hair.style, 'bun')
  assert.equal(grandma.outfit.type, 'cardigan')
  assert.equal(grandma.outfit.hemY, undefined)
  assert.notEqual(grandma.outfit.buttons, false)
  assert.equal(scholar.hair.style, 'short')
  assert.equal(scholar.hair.beard, true)
  assert.equal(scholar.outfit.type, 'cardigan')
  assert.equal(scholar.outfit.hemY, undefined)
  for (const v of VILLAGERS) {
    assert.equal(v.outfit.hemY, undefined, v.name)
    assert.notEqual(v.outfit.type, 'openJacket', v.name)
    assert.notEqual(v.outfit.buttons, false, v.name)
  }
  assert.equal(draftsEnabled(''), false)
  assert.equal(draftsEnabled('?chibi=1'), false)
  assert.equal(draftsEnabled('?dev=chibi-drafts'), true)
  assert.equal(chibiDraftName('grandma', ''), null)
  assert.equal(chibiDraftName('scholar', '?view=lineup'), null)
  assert.equal(chibiDraftName('grandma', '?dev=chibi-drafts'), 'fuku')
  assert.equal(chibiDraftName('scholar', '?view=charstudio&dev=chibi-drafts'), 'hoshino')
  assert.equal(chibiDraftName('baker', '?dev=chibi-drafts'), null)
  assert.equal(chibiDraftName('fuku', '?dev=chibi-drafts'), 'fuku')
  assert.equal(chibiDraftName('hoshino', '?dev=chibi-drafts'), 'hoshino')
  assert.equal(chibiDraftName('grandpa', ''), null)
  assert.equal(chibiDraftName('grandpa', '?dev=chibi-drafts'), 'ishi')
  assert.equal(chibiDraftName('ishi', '?dev=chibi-drafts'), 'ishi')
})

test('the play path renders chibi Fuku for grandma but not the draft chunk or Hoshino', () => {
  const app = src('App.jsx')
  assert.equal(app.includes('ChibiVillagers'), false)
  assert.equal(app.includes('ChibiVillager '), false)
  assert.equal(app.includes('ChibiHoshino'), false)
  assert.match(app, /import\('\.\/art\/chibi\/ChibiFuku\.jsx'\)/)
  assert.match(app, /chibiGrandma\(w\) \? <Suspense fallback=\{null\}><ChibiFuku st=\{st\} scale=\{1\}/)
  assert.match(app, /NEWCHAR \? <Character cfg=\{w\.cfg\}/)
  const lineup = src('debug/Lineup.jsx')
  assert.match(lineup, /chibi-drafts/)
  assert.match(src('debug/Studio.jsx'), /chibi-drafts/)
  assert.match(src('art/chibi/ChibiVillagers.jsx'), /DRAFT/)
})

test('Grandpa Ishi ships in the game as a lazy chunk (not through the drafts)', () => {
  const app = src('App.jsx')
  assert.match(app, /lazy\(\(\) => import\('\.\/art\/chibi\/ChibiIshi\.jsx'\)/)
  assert.match(app, /CHIBI && npc\.key === 'grandpa' \?/)
  assert.match(app, /<ChibiIshi st=\{st\}[^>]*scale=\{0\.995\}/) // her height, not the old villagers' 0.8
  assert.equal(/^import .*ChibiIshi/m.test(app), false) // never a static import (startup chunk)
})
