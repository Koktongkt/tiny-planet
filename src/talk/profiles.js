// Villager profiles (keyed by the villager's internal name in villagers.js) + the line builder for the dialogue box.
// Lines mix: a greeting by time of day, a weather remark, something about her recent activity, and something from
// their role / personality / favourite thing. Nothing here touches React or three.
export const PROFILES = {
  'fisherman':   { name: 'Gonta', role: 'fisherman', mood: 'gruff', fav: 'the first catch of the morning', lines: ['Nets don\'t mend themselves.', 'Sea\'s talking today. You hear it?', 'Thirty years on this pier and the gulls still steal my lunch.'] },
  'fishwife':    { name: 'Oharu', role: 'fishmonger', mood: 'warm', fav: 'grilled mackerel with a little salt', lines: ['Fresh off the boat, dear — well, almost.', 'If Gonta says the fish are small, he caught them.', 'Come by at noon, I\'ll save you the tail end.'] },
  'sailor girl': { name: 'Mina', role: 'sailor\'s apprentice', mood: 'dreamy', fav: 'the lighthouse at dusk', lines: ['One day I\'ll sail all the way round the planet.', 'Do you think the clouds have harbours too?', 'I can tie eleven knots. Twelve, if nobody watches.'] },
  'dock boy':    { name: 'Kenta', role: 'dock runner', mood: 'cheeky', fav: 'skipping stones', lines: ['Race you to the end of the pier!', 'I found a shell shaped like a cat. Don\'t tell Mina.', 'Grown-ups walk so slowly.'] },
  'farmer':      { name: 'Tetsuo', role: 'rice farmer', mood: 'steady', fav: 'the smell of wet paddies', lines: ['Rice teaches patience. Mostly to me.', 'Mind the terrace edges — they\'re older than I am.', 'A good hoe and a good hat. That\'s all a man needs.'] },
  'farm wife':   { name: 'Sachi', role: 'seedling planter', mood: 'cheerful', fav: 'planting songs', lines: ['Every sprout gets a song. It helps, truly.', 'My knees are muddy and my heart is full.', 'If you find reeds by the lake, I\'ll weave you a basket.'] },
  'grandma':     { name: 'Grandma Fuku', role: 'retired seamstress', mood: 'gentle', fav: 'warm tea on the bench', lines: ['Sit a while, child. The day can wait.', 'In my day the windmills were taller. Or I was smaller.', 'Your cape is lovely. Did you stitch that hem yourself?'] },
  'grandpa':     { name: 'Grandpa Ishi', role: 'village storyteller', mood: 'wry', fav: 'his old pipe (unlit, Fuku insists)', lines: ['Did I tell you about the spirit in the giant camphor? No? Sit.', 'Hmph. The young walk everywhere so fast.', 'This planet is small, but it never ends. Funny, that.'] },
  'baker':       { name: 'Kiko', role: 'baker', mood: 'bustling', fav: 'melon bread straight from the oven', lines: ['Flour on my nose again? Oh, bother.', 'The oven\'s warm if you\'re cold.', 'Bring me berries and I\'ll make a tart that\'ll make you cry.'] },
  'scholar':     { name: 'Professor Hoshino', role: 'ruins scholar', mood: 'curious', fav: 'old pottery shards', lines: ['These stones were a library once. I\'m nearly sure.', 'Every shard tells a story if you\'re patient enough.', 'Ah — careful where you step. History is underfoot.'] },
  'miller girl': { name: 'Yui', role: 'miller\'s daughter', mood: 'bright', fav: 'the windmill\'s creak', lines: ['Listen — the mill is singing!', 'Papa says the wind is borrowed. Who from, though?', 'I counted the sails going round. I lost count at a hundred.'] },
  'big sister':  { name: 'Natsu', role: 'big sister', mood: 'protective', fav: 'acorn hunting', lines: ['Shh, Momo\'s exploring. Don\'t let her eat mushrooms.', 'The giant tree hums at night. I swear it does.', 'If you see a soot sprite, you didn\'t see it from me.'] },
  'toddler':     { name: 'Momo', role: 'tiny explorer', mood: 'wide-eyed', fav: 'acorns, all the acorns', lines: ['Acorn!', 'Big tree! Biiig!', 'Wanna see my rock?'] },
  'angler':      { name: 'Jiro', role: 'lake angler', mood: 'patient', fav: 'a still lake at dawn', lines: ['Shh… the big one is listening.', 'Sometimes I don\'t even bait the hook. Don\'t tell anyone.', 'The lake keeps its own time.'] },
  'mother':      { name: 'Aiko', role: 'mother of three', mood: 'busy', fav: 'a quiet minute', lines: ['Have you seen a little boy in a cap? Of course you have, he\'s everywhere.', 'Market, laundry, supper… and it\'s barely noon.', 'You look like you could use a rice ball.'] },
  'postman':     { name: 'Mr. Tanabe', role: 'postman', mood: 'punctual', fav: 'a well-stamped letter', lines: ['Nothing for you today — but tomorrow, who knows?', 'I\'ve walked this path ten thousand times. Still pretty.', 'Rain or shine, the post goes round.'] },
  'yukata lady': { name: 'Shizuka', role: 'tea house owner', mood: 'elegant', fav: 'cherry blossom tea', lines: ['A lovely day for a stroll, isn\'t it?', 'Do drop by the tea house. I\'ll pour you something floral.', 'The fireflies come out by the village at night. Quite magical.'] },
  'cook':        { name: 'Daikichi', role: 'noodle cook', mood: 'jolly', fav: 'a bubbling pot of broth', lines: ['My broth simmered all night. Smell that!', 'Mushrooms from the forest make the best soup. Bring some?', 'Hungry? You\'re always welcome at my stall.'] },
  'tall teen':   { name: 'Ren', role: 'aspiring painter', mood: 'shy', fav: 'the sky right before sunset', lines: ['I\'m trying to paint the clouds. They keep moving.', 'Oh — hi. I didn\'t see you there.', 'The light on the lake… I can never get it right.'] },
  'old lady':    { name: 'Granny Ume', role: 'herbalist', mood: 'sharp', fav: 'wild herbs and good gossip', lines: ['Herbs by the stream, dear. Leave the roots.', 'I\'ve seen four generations walk this path. You walk well.', 'Mind your knees. Take it from me.'] },
  'cap boy':     { name: 'Sota', role: 'bug catcher', mood: 'energetic', fav: 'beetles', lines: ['I caught a beetle THIS big. It got away though.', 'Wanna be in my explorer club? You\'re in.', 'Mom says no climbing the windmill. I\'m not climbing. Yet.'] },
  'basket girl': { name: 'Hana', role: 'flower picker', mood: 'sweet', fav: 'pink wildflowers', lines: ['These are for Grandma Fuku. She likes the pink ones.', 'The meadow is full of flowers today!', 'Do you like flowers? I like flowers.'] },
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
export function periodOf(T) { if (T.night > 0.6) return 'night'; if (T.dusk > 0.45) return T.sunUp ? 'morning' : 'evening'; return 'day' }
const GREET = {
  morning: ['Good morning!', 'Oh, you\'re up early.', 'Morning! The dew\'s still on the grass.'],
  day: ['Hello there!', 'Ah, it\'s you!', 'Good day to you.'],
  evening: ['Good evening.', 'Lovely light, isn\'t it?', 'Evening already… where does the day go?'],
  night: ['Out so late?', 'Good evening — mind the dark paths.', 'The stars are out. Shouldn\'t you be home?'],
}
const WEATHER = {
  clear: ['Not a cloud in the sky.', 'Sun\'s generous today.'],
  breezy: ['Hold on to your hat — breezy one today.', 'The wind\'s got the windmills going.'],
  cloudy: ['Clouds are piling up like rice bales.', 'Grey sky, soft light. I don\'t mind it.'],
  drizzle: ['Bit of drizzle about. Good for the paddies.', 'Light rain — the frogs are thrilled.'],
}
const MOODY = { gruff: 'Hmph. ', wry: 'Heh. ', shy: 'Um… ', bustling: 'Oh! ', cheeky: 'Hey! ', 'wide-eyed': '', energetic: 'Whoa! ' }
function activityLine(a, p) {
  if (!a) return null
  if (a.kind === 'craft') return pick([`You made a ${a.what}? Clever hands!`, `I heard you crafted a ${a.what}. Show me sometime.`])
  if (a.kind === 'gather') return pick([`Been gathering ${a.what}, I see.`, `Is that ${a.what} in your bag? ${p.role === 'baker' || p.role === 'noodle cook' ? 'I could use some.' : 'Good find.'}`])
  if (a.kind === 'cat') return pick(['You smell faintly of cat. Mochi\'s, I bet.', 'Mochi let you pet him? He must like you.'])
  if (a.kind === 'dog') return pick(['Pip\'s been following you all day, hasn\'t he?', 'That pup of yours fetches better than my nephew.'])
  if (a.kind === 'indoors') return pick(['Ah, out of the house at last!', 'Fresh air suits you better than four walls.'])
  if (a.kind === 'fish') return pick(['Any luck fishing?', 'Catch anything worth bragging about?'])
  return null
}
// returns an array of pages (strings) for one conversation
export function buildLines(key, ctx) {
  const p = PROFILES[key] || { name: 'Villager', role: 'villager', mood: 'warm', fav: 'quiet days', lines: ['Nice weather.'] }
  const pre = MOODY[p.mood] ?? ''
  const pages = [pre + pick(GREET[ctx.period] || GREET.day) + ' ' + pick(WEATHER[ctx.weather] || WEATHER.clear)]
  const act = activityLine(ctx.recent, p); if (act && Math.random() < 0.85) pages.push(act)
  const own = pick(p.lines); pages.push(own)
  if (Math.random() < 0.55) pages.push(pick([`I do love ${p.fav}.`, `You know what makes me happy? ${p.fav[0].toUpperCase() + p.fav.slice(1)}.`, `If you ever find yourself near ${p.fav}, think of me.`]))
  if (ctx.period === 'night' && Math.random() < 0.6) pages.push(pick(['Off you go, then. Sleep well.', 'Get home safe. The lanterns will light your way.']))
  return { name: p.name, role: p.role, pages }
}
