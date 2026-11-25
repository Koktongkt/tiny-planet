// Draft chibi Fuku / Hoshino must not be what the game renders. The villager
// list stays on the shipped looks, and the draft chunk is off unless ?dev=chibi-drafts.
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
})

test('the play path does not load the draft villager chunk', () => {
  const app = src('App.jsx')
  assert.equal(app.includes('ChibiVillagers'), false)
  assert.equal(app.includes('ChibiVillager'), false)
  assert.equal(app.includes('ChibiFuku'), false)
  assert.equal(app.includes('ChibiHoshino'), false)
  assert.match(app, /NEWCHAR \? <Character cfg=\{w\.cfg\}/)
  const lineup = src('debug/Lineup.jsx')
  assert.match(lineup, /chibi-drafts/)
  assert.match(src('debug/Studio.jsx'), /chibi-drafts/)
  assert.match(src('art/chibi/ChibiVillagers.jsx'), /DRAFT/)
})
