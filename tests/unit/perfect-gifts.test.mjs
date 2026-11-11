import test from 'node:test'
import assert from 'node:assert/strict'
import { reactionTo, giftScore, give, resetDay, MAX_HEARTS } from '../../src/systems/friendship.js'

test('plain dishes keep their current reaction', () => {
  assert.equal(reactionTo('cook', 'soup'), 'love')
  assert.equal(reactionTo('cook', 'mushroom'), 'like')
  assert.equal(reactionTo('cook', 'flower'), 'dislike')
  assert.equal(reactionTo('scholar', 'wood'), 'neutral')
})

test('a perfect gift strips the suffix and is a little kinder', () => {
  const loved = giftScore('cook', 'soup_perfect')
  assert.equal(loved.kind, 'love')
  assert.ok(loved.gain > giftScore('cook', 'soup').gain)
  const liked = giftScore('baker', 'jam_perfect')
  assert.equal(liked.kind, 'love')
  assert.equal(liked.gain, giftScore('baker', 'jam').gain > 0 ? giftScore('scholar', 'shard').gain : liked.gain)
  const otherwise = giftScore('cook', 'flower_perfect')
  assert.equal(otherwise.kind, 'like')
  assert.ok(otherwise.gain > 0 && otherwise.gain < giftScore('cook', 'soup').gain)
})

test('perfect love is still capped, once a day, and cozy multiplies the gain', () => {
  const F = { day: 0, list: {} }
  const plain = give(F, 'cook', 'soup')
  assert.equal(plain.kind, 'love')
  assert.equal(F.list.cook.hearts, 1)
  resetDay(F, 1)
  const perfect = give(F, 'cook', 'soup_perfect', 1.5)
  assert.equal(perfect.kind, 'love')
  assert.ok(perfect.gained > 1)
  assert.ok(F.list.cook.hearts <= MAX_HEARTS)
  assert.equal(give(F, 'cook', 'soup_perfect', 1.5), null)
  const top = { day: 0, list: { cook: { npcId: 'cook', hearts: 4.9, giftedToday: false, lastGiftReaction: null } } }
  give(top, 'cook', 'soup_perfect')
  assert.equal(top.list.cook.hearts, MAX_HEARTS)
})
