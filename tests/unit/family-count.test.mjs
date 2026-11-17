import test from 'node:test'
import assert from 'node:assert/strict'
import { familyCount, familyLine, heartLine, MAX_HEARTS, newFriend } from '../../src/systems/friendship.js'

test('five hearts is family, and the count is quiet', () => {
  const friends = { day: 0, list: {} }
  assert.deepEqual(familyCount(friends), { n: 0, of: 22 })
  friends.list.cook = { ...newFriend('cook'), hearts: 4.9 }
  friends.list.baker = { ...newFriend('baker'), hearts: MAX_HEARTS }
  assert.equal(familyCount(friends).n, 1)
  const line = familyLine(friends)
  assert.equal(line, '1 of 22 neighbours feel like family')
  assert.equal(line.includes('\n'), false)
  assert.equal(heartLine(friends.list.baker).includes('family'), true)
})

test('twenty-two villagers at five hearts fill the line and do not list names', () => {
  const friends = { day: 0, list: {} }
  for (let i = 0; i < 22; i++) friends.list['n' + i] = { hearts: 5 }
  friends.list.extra = { hearts: 5 }
  const c = familyCount(friends)
  assert.equal(c.n, 22)
  assert.equal(c.of, 22)
  assert.equal(familyLine(friends), '22 of 22 neighbours feel like family')
})
