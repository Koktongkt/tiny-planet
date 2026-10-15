// Villager profiles (keyed by the villager's internal name in villagers.js) + the line builder for the dialogue box.
// Lines mix: a greeting by time of day, a weather remark, something about her recent activity, something from
 // their role / personality / favourite thing, and a line that matches their current routine stage when known.
export const PROFILES = {
  'fisherman': {
    name: 'Gonta', role: 'fisherman', mood: 'gruff', fav: 'the first catch of the morning',
    lines: {
      any: ['Nets don\'t mend themselves.', 'Sea\'s talking today. You hear it?', 'Thirty years on this pier and the gulls still steal my lunch.', 'Mind the wet planks — they\'ve claimed better boots than yours.', 'A good knot lasts longer than a good story.', 'If the wind turns west, I\'m packing up early.'],
      morning: ['First light, first cast. That\'s the rule.', 'Water\'s glass-still. Fish will be shy.'],
      day: ['Sun\'s on the water. Hard to see the float.', 'Lunch is tomorrow\'s bait if I don\'t catch something.'],
      evening: ['Golden hour for the big ones. Or so I tell myself.', 'Tide\'s turning. Feel it?'],
      night: ['Night fishing\'s for younger backs.', 'Lamps on the harbour keep the ghosts company.'],
      fish: ['Shh. Something\'s testing the line.', 'Hold still — she\'s thinking about the bait.'],
      eat: ['Salted rice and yesterday\'s catch. Luxury.', 'Don\'t tell Oharu I ate standing up.'],
      mend: ['Needle, thread, patience. Same as always.', 'A hole in a net is a hole in a day\'s work.'],
      rest: ['Hmph. Pier\'s mine until morning.', 'Stars look better from wet boards, somehow.'],
    },
  },
  'fishwife': {
    name: 'Oharu', role: 'fishmonger', mood: 'warm', fav: 'grilled mackerel with a little salt',
    lines: {
      any: ['Fresh off the boat, dear — well, almost.', 'If Gonta says the fish are small, he caught them.', 'Come by at noon, I\'ll save you the tail end.', 'A pinch of salt and a patient fire — that\'s all fish need.', 'The gulls know my schedule better than I do.', 'Wipe your hands, love, before you touch the scales.'],
      morning: ['Market\'s barely open and already I\'m shouting.', 'Ice is cold, fish are colder. Good morning!'],
      day: ['Best of the catch goes first. That\'s fair.', 'Need a fillet? Or are you just smelling the stall?'],
      evening: ['Packing up — unless you want what\'s left.', 'Dusk softens the fishmonger\'s voice. Almost.'],
      night: ['Board\'s scrubbed. Tomorrow can wait.', 'Gonta better be home before the lamps die.'],
      chat: ['Gossip travels faster than the post.', 'Heard anything worth a free sprat?'],
      walk: ['Hauling baskets builds character. Or so I claim.'],
    },
  },
  'sailor girl': {
    name: 'Mina', role: 'sailor\'s apprentice', mood: 'dreamy', fav: 'the lighthouse at dusk',
    lines: {
      any: ['One day I\'ll sail all the way round the planet.', 'Do you think the clouds have harbours too?', 'I can tie eleven knots. Twelve, if nobody watches.', 'Salt in my hair means I did something right.', 'The pier creaks the same song every evening.', 'Maps are just promises drawn in ink.'],
      morning: ['Flags look hopeful at first light.', 'I polished the railing. It still shines.'],
      day: ['Watch the horizon with me? Just for a minute.', 'A boat left an hour ago. I counted the wakes.'],
      evening: ['Lighthouse wink — one, two. See?', 'Dusk turns the bay into copper.'],
      night: ['Stars make better charts than paper.', 'Quiet decks. Loud dreams.'],
      look: ['If I stare long enough, maybe a ship appears.', 'That cloud looks like a schooner. I swear it does.'],
    },
  },
  'dock boy': {
    name: 'Kenta', role: 'dock runner', mood: 'cheeky', fav: 'skipping stones',
    lines: {
      any: ['Race you to the end of the pier!', 'I found a shell shaped like a cat. Don\'t tell Mina.', 'Grown-ups walk so slowly.', 'Bet I can hop those crates without falling. Twice.', 'If I run fast enough, the gulls can\'t steal my snack.', 'Want to see my secret rock collection?'],
      morning: ['Morning energy! Who needs breakfast?', 'I already skipped twelve stones. Beat that.'],
      day: ['Errands, errands… then more skipping.', 'Oharu says stop running. I say go faster.'],
      evening: ['Last race before supper!', 'Pier lights are good for hide-and-seek.'],
      night: ['Mum said bed. I said five more minutes.', 'Night bugs are cooler than day bugs.'],
      play: ['Catch me if you can!', 'Cannonball! …into imaginary water.'],
      walk: ['Running is basically flying, if you\'re small.'],
      carry: ['This crate is HEAVY. On purpose, probably.'],
    },
  },
  'farmer': {
    name: 'Tetsuo', role: 'rice farmer', mood: 'steady', fav: 'the smell of wet paddies',
    lines: {
      any: ['Rice teaches patience. Mostly to me.', 'Mind the terrace edges — they\'re older than I am.', 'A good hoe and a good hat. That\'s all a man needs.', 'Mud under the nails is a kind of medal.', 'The scarecrow works harder than I do some days.', 'Water finds its own level. So do people.'],
      morning: ['Dew\'s still on the blades. Perfect for planting.', 'Stretch the back before the day stretches you.'],
      day: ['Sun\'s high. Shade is a luxury.', 'Halfway done. Or halfway to done. Same thing.'],
      evening: ['Shadows grow long across the paddies.', 'Tomorrow\'s rows are already planned in my head.'],
      night: ['Frogs keep the night shift.', 'Sleep comes easy when the work\'s honest.'],
      tend: ['One more terrace, then I\'ll breathe.', 'Hoe sings when the soil\'s just right.'],
      eat: ['Rice ball tasted of the field. As it should.', 'Lunch tastes better with dirt on your boots.'],
      survey: ['From here you can see next season.', 'Looking is half of farming.'],
      rest: ['Knees saying thank you for sitting.', 'Hut\'s small. Heart\'s bigger.'],
    },
  },
  'farm wife': {
    name: 'Sachi', role: 'seedling planter', mood: 'cheerful', fav: 'planting songs',
    lines: {
      any: ['Every sprout gets a song. It helps, truly.', 'My knees are muddy and my heart is full.', 'If you find reeds by the lake, I\'ll weave you a basket.', 'Seedlings listen better than people sometimes.', 'Green is my favourite colour. All of them.', 'Tetsuo pretends he doesn\'t hum along.'],
      morning: ['Morning song for the paddies!', 'Cool mud. Warm hands. Perfect.'],
      day: ['Lunch later — sprouts now.', 'Which row looks happier? This one, I think.'],
      evening: ['Song for dusk: soft and slow.', 'Washing the mud off is half the ritual.'],
      night: ['Tomorrow\'s seeds are already dreaming.', 'Quiet fields, loud frogs. Lullaby enough.'],
      hoe: ['Gently, gently — they\'re babies.', 'Rhythm of the hoe matches the song.'],
    },
  },
  'grandma': {
    name: 'Grandma Fuku', role: 'retired seamstress', mood: 'gentle', fav: 'warm tea on the bench',
    lines: {
      any: ['Sit a while, child. The day can wait.', 'In my day the windmills were taller. Or I was smaller.', 'Your cape is lovely. Did you stitch that hem yourself?', 'I keep spare needles in my sleeve. Habit.', 'The square remembers every footstep.', 'Tea tastes better when shared.'],
      morning: ['Morning tea, before the square wakes.', 'Dew on the bench. Proof I got here first.'],
      day: ['Noon sun on old bones feels kind.', 'I\'m knitting nothing useful. That\'s the point.'],
      evening: ['Lamp light flatters everyone.', 'Ishi will join me soon, if his stories finish.'],
      night: ['Stars over the square never change.', 'Time for bed… after one more stitch.'],
      eat: ['Rice ball from Kiko. Soft as a cloud.', 'Little bites. Big gratitude.'],
      rest: ['This bench and I have an understanding.', 'Eyes closed, ears open. Village music.'],
      chat: ['Tell me everything. Or nothing. Either\'s fine.'],
    },
  },
  'grandpa': {
    name: 'Grandpa Ishi', role: 'village storyteller', mood: 'wry', fav: 'his old pipe (unlit, Fuku insists)',
    lines: {
      any: ['Did I tell you about the spirit in the giant camphor? No? Sit.', 'Hmph. The young walk everywhere so fast.', 'This planet is small, but it never ends. Funny, that.', 'My pipe is decorative. Fuku\'s orders.', 'A story without pauses is just shouting.', 'I\'ve forgotten more tales than most people know.'],
      morning: ['Joints creak louder than the mill.', 'Morning stretches keep the stories limber.'],
      day: ['Square\'s best audience is whoever sits first.', 'I\'m rehearsing. Don\'t look impressed yet.'],
      evening: ['Dusk is story hour. Always was.', 'Fuku saves me a spot. She\'s soft that way.'],
      night: ['Stars are punctuation for old stories.', 'One more tale, then I\'ll pretend to sleep.'],
      stretch: ['Cre-e-eak. That\'s the sound of wisdom.', 'Arms up, pride down.'],
      chat: ['Once upon a… no, better: hear this first.', 'Interruptions are part of the craft.'],
      sit: ['Bench holds more history than the ruins.', 'Sitting is an advanced skill.'],
    },
  },
  'baker': {
    name: 'Kiko', role: 'baker', mood: 'bustling', fav: 'melon bread straight from the oven',
    lines: {
      any: ['Flour on my nose again? Oh, bother.', 'The oven\'s warm if you\'re cold.', 'Bring me berries and I\'ll make a tart that\'ll make you cry.', 'Kneading is how I think. Loudly.', 'A loaf gone wrong still feeds the birds.', 'Smell that? That\'s tomorrow\'s happiness rising.'],
      morning: ['Dough first, then the world.', 'Sunrise and yeast — both need warmth.'],
      day: ['Buy something before I eat it myself.', 'Hot from the oven! Careful of your fingers.'],
      evening: ['Last trays. Then I get to taste-test.', 'Evening bread is sweeter. Science, probably.'],
      night: ['Oven\'s cooling. Dreams are warming.', 'Flour ghosts everywhere. I\'ll sweep at dawn.'],
      knead: ['Push, fold, turn. Push, fold, turn.', 'Dough listens better than people.'],
      sell: ['Melon bread! Two for a smile!', 'Fresh! Or nearly. Don\'t be picky.'],
      eat: ['Baker\'s privilege: the broken ones.', 'Tea and crust. Perfect end to a tray.'],
      rest: ['Feet up. Nose still floury.', 'Tomorrow\'s orders are already dancing in my head.'],
      chat: ['Gossip and glaze — my two specialties.'],
    },
  },
  'scholar': {
    name: 'Professor Hoshino', role: 'ruins scholar', mood: 'curious', fav: 'old pottery shards',
    lines: {
      any: ['These stones were a library once. I\'m nearly sure.', 'Every shard tells a story if you\'re patient enough.', 'Ah — careful where you step. History is underfoot.', 'I catalogue sighs as carefully as inscriptions.', 'Moss is a scholar too, in its way.', 'The ancients had better handwriting than I do.'],
      morning: ['Morning light loves carved stone.', 'I packed extra notebooks. And snacks. Priorities.'],
      day: ['Sun makes the glyphs pop. Or my eyes water.', 'Found a shard shaped like a question mark. Apt.'],
      evening: ['Shadows hide half the text. Frustrating. Beautiful.', 'I\'ll sketch until the light gives up.'],
      night: ['Lantern and ruins — a classic pair.', 'Owls approve of late scholarship.'],
      look: ['This angle… yes. That line was intentional.', 'Staring is research. Officially.'],
      stretch: ['Desk posture follows you outdoors. Alas.', 'A stretch between centuries.'],
    },
  },
  'miller girl': {
    name: 'Yui', role: 'miller\'s daughter', mood: 'bright', fav: 'the windmill\'s creak',
    lines: {
      any: ['Listen — the mill is singing!', 'Papa says the wind is borrowed. Who from, though?', 'I counted the sails going round. I lost count at a hundred.', 'Flour dust looks like snow if you squint.', 'Want to hear the mill\'s secret knock? Knock-knock… whoosh.', 'I can tell the wind\'s mood by the creak.'],
      morning: ['Sails catching first breeze. Best sound.', 'I oiled the latch. It thanked me, I think.'],
      day: ['High noon, high wind. Perfect.', 'Don\'t stand under the sails. Lesson one.'],
      evening: ['Pink sky through the blades. Look!', 'Carrying flour bags builds miller arms.'],
      night: ['Mill sleeps. I don\'t, not yet.', 'Night wind is shy. Soft creaks only.'],
      carry: ['Heavy! But I\'m stronger than yesterday.', 'Careful — flour cloud incoming.'],
      stretch: ['Arms up for the wind!', 'Even mills need a stretch. So do I.'],
    },
  },
  'big sister': {
    name: 'Natsu', role: 'big sister', mood: 'protective', fav: 'acorn hunting',
    lines: {
      any: ['Shh, Momo\'s exploring. Don\'t let her eat mushrooms.', 'The giant tree hums at night. I swear it does.', 'If you see a soot sprite, you didn\'t see it from me.', 'Being the big sister means pockets full of snacks.', 'Acorns for Momo, stories for me.', 'Stay where I can see you. That includes you.'],
      morning: ['Momo\'s already gone. Of course.', 'Morning under the camphor smells like adventures.'],
      day: ['Snack break, whether she wants it or not.', 'I counted her hops. Lost track at forty.'],
      evening: ['Home soon, Momo. After one more acorn.', 'Dusk makes the trunk look like a face.'],
      night: ['She\'s asleep. Finally. Me too, almost.', 'Night watch under the leaves. Soft duty.'],
      look: ['Keeping eyes on that toddler spark.', 'Tree\'s listening. So am I.'],
      walk: ['Always three steps behind. That\'s the job.'],
    },
  },
  'toddler': {
    name: 'Momo', role: 'tiny explorer', mood: 'wide-eyed', fav: 'acorns, all the acorns',
    lines: {
      any: ['Acorn!', 'Big tree! Biiig!', 'Wanna see my rock?', 'Up! Up!', 'Natsu, look!', 'Soft leaf. Soft.'],
      morning: ['Sun! Warm!', 'Run run run!'],
      day: ['Snack? …Snack!', 'Bug! Tiny bug!'],
      evening: ['Tired… not tired.', 'Pink sky. Pretty.'],
      night: ['Sleepy. Maybe.', 'Stars. Blink blink.'],
      play: ['Whee!', 'Jump! Again!'],
      nap: ['Zzz… acorn…', 'Soft grass pillow.'],
      eat: ['Yum yum.', 'More? Please?'],
    },
  },
  'angler': {
    name: 'Jiro', role: 'lake angler', mood: 'patient', fav: 'a still lake at dawn',
    lines: {
      any: ['Shh… the big one is listening.', 'Sometimes I don\'t even bait the hook. Don\'t tell anyone.', 'The lake keeps its own time.', 'Ripples are conversation.', 'A missed bite teaches more than a catch.', 'Dock boards know my footsteps by heart.'],
      morning: ['Dawn glass. Perfect.', 'First cast writes the day.'],
      day: ['Sun\'s bright. Fish go deep.', 'Patience is the real bait.'],
      evening: ['Golden water. Soft bites.', 'Almost… almost…'],
      night: ['Moon fishing is poetry. And mosquitoes.', 'I\'ll stay until the ripples stop.'],
      fish: ['Line\'s whispering.', 'Don\'t scare her. Or me.'],
      look: ['Watching the water think.', 'Clouds fish too, in their way.'],
    },
  },
  'mother': {
    name: 'Aiko', role: 'mother of three', mood: 'busy', fav: 'a quiet minute',
    lines: {
      any: ['Have you seen a little boy in a cap? Of course you have, he\'s everywhere.', 'Market, laundry, supper… and it\'s barely noon.', 'You look like you could use a rice ball.', 'Three children, one umbrella. Math is hard.', 'If you find a lost sock, it\'s probably ours.', 'Quiet minutes are mythical creatures.'],
      morning: ['Shoes on, everyone! …Almost everyone.', 'Breakfast crumbs mark the trail.'],
      day: ['Errand number… I lost count.', 'Umbrella up just in case. Mood swings.'],
      evening: ['Homeward. Eventually.', 'Supper smells better when you\'re tired.'],
      night: ['Finally… quiet. Don\'t jinx it.', 'One more story, then lights out. Promise.'],
      walk: ['Path walking is free childcare.', 'If I walk fast enough, maybe I\'ll rest.'],
    },
  },
  'postman': {
    name: 'Mr. Tanabe', role: 'postman', mood: 'punctual', fav: 'a well-stamped letter',
    lines: {
      any: ['Nothing for you today — but tomorrow, who knows?', 'I\'ve walked this path ten thousand times. Still pretty.', 'Rain or shine, the post goes round.', 'A letter is a folded hello.', 'Stamp corners teach honesty.', 'Bag\'s lighter when the news is good.'],
      morning: ['First loop starts with the rooster.', 'Ink dries faster in morning air.'],
      day: ['Mid-route stretch. Knees approve.', 'That cottage always has tea waiting. Tempting.'],
      evening: ['Last deliveries glow in the dusk.', 'I save the farthest house for golden hour.'],
      night: ['Night routes are for urgent hearts.', 'Lantern on the bag, stars overhead.'],
      walk: ['Tick, tock, step, step. Schedule.', 'A good pace keeps the stamps dry.'],
    },
  },
  'yukata lady': {
    name: 'Shizuka', role: 'tea house owner', mood: 'elegant', fav: 'cherry blossom tea',
    lines: {
      any: ['A lovely day for a stroll, isn\'t it?', 'Do drop by the tea house. I\'ll pour you something floral.', 'The fireflies come out by the village at night. Quite magical.', 'Umbrella first, then the sky.', 'Steam and silence — my favourite pair.', 'Every cup has a season.'],
      morning: ['Morning steam curls like calligraphy.', 'Early guests get the quietest table.'],
      day: ['Afternoon light suits porcelain.', 'Shall I recommend a tea for wandering?'],
      evening: ['Dusk tea tastes of farewell and hello.', 'Lanterns first, then the pour.'],
      night: ['Night tea is for secrets and soft voices.', 'Fireflies make better lamps than we do.'],
      walk: ['A measured walk keeps the kimono neat.', 'Umbrella as companion, not just shade.'],
    },
  },
  'cook': {
    name: 'Daikichi', role: 'noodle cook', mood: 'jolly', fav: 'a bubbling pot of broth',
    lines: {
      any: ['My broth simmered all night. Smell that!', 'Mushrooms from the forest make the best soup. Bring some?', 'Hungry? You\'re always welcome at my stall.', 'A clean ladle is a happy ladle.', 'Customers come for noodles. Stay for stories.', 'Stir clockwise for luck. Counterclockwise for flavour.'],
      morning: ['Sweep first, then the pot.', 'Morning broth is honest broth.'],
      day: ['Lunch rush! Or lunch amble. Same energy.', 'Extra toppings for a smile.'],
      evening: ['Evening stock is richer. Trust me.', 'Sweeping between bowls.'],
      night: ['Pot\'s resting. So should you.', 'Tomorrow\'s stock starts in tonight\'s dreams.'],
      sweep: ['Clean path, clean appetite.', 'Dust never stood a chance.'],
      sell: ['Noodles! Hot! Honest!', 'One bowl to go? Or stay and steam with me?'],
      eat: ['Cook\'s taste-test. Critical work.', 'Mmm. Needs… more joy.'],
      rest: ['Feet up, ladle down.', 'Stars make good kitchen lights.'],
    },
  },
  'tall teen': {
    name: 'Ren', role: 'aspiring painter', mood: 'shy', fav: 'the sky right before sunset',
    lines: {
      any: ['I\'m trying to paint the clouds. They keep moving.', 'Oh — hi. I didn\'t see you there.', 'The light on the lake… I can never get it right.', 'Sketchbook pages curl like shy smiles.', 'Don\'t look yet. It\'s not finished. It never is.', 'I mix colours until they feel like weather.'],
      morning: ['Soft light. Soft mistakes.', 'Morning sketches forgive me.'],
      day: ['Too bright. Or I\'m too pale.', 'Shading practice. Endless shading practice.'],
      evening: ['This is the light I chase.', 'If I could bottle dusk…'],
      night: ['Moonlight sketches are brave. Or foolish.', 'Stars as white dots. Still learning.'],
      walk: ['Walking helps the lines stay honest.', 'I paint better when I\'m not standing still.'],
    },
  },
  'old lady': {
    name: 'Granny Ume', role: 'herbalist', mood: 'sharp', fav: 'wild herbs and good gossip',
    lines: {
      any: ['Herbs by the stream, dear. Leave the roots.', 'I\'ve seen four generations walk this path. You walk well.', 'Mind your knees. Take it from me.', 'A bitter leaf can sweeten a week.', 'Gossip is a herb too — use sparingly.', 'My cane knows every root by name.'],
      morning: ['Morning dew on mint. Perfect.', 'Early birds get the bitter greens.'],
      day: ['Sun dries what dew softens.', 'I\'m not slow. The path is thoughtful.'],
      evening: ['Evening gathers the best whispers.', 'Tea from today\'s walk. Join me?'],
      night: ['Night herbs are for brave sleepers.', 'Cane and stars. Fine company.'],
      walk: ['Step, cane, step. That\'s the song.', 'I stop when the plants ask me to.'],
    },
  },
  'cap boy': {
    name: 'Sota', role: 'bug catcher', mood: 'energetic', fav: 'beetles',
    lines: {
      any: ['I caught a beetle THIS big. It got away though.', 'Wanna be in my explorer club? You\'re in.', 'Mom says no climbing the windmill. I\'m not climbing. Yet.', 'Bugs have feelings. Also legs. Lots.', 'My net is a scientific instrument.', 'If it crawls, I\'ve named it.'],
      morning: ['Bug hunt starts NOW!', 'Dewy grass = bug highway.'],
      day: ['Noon bugs hide. Sneaky.', 'I saw a beetle with a golden shell! Maybe.'],
      evening: ['Firefly practice for later.', 'Cap stays on. Bug luck.'],
      night: ['Night bugs are the coolest.', 'Shh — moth incoming.'],
      walk: ['Running is research.', 'Path beetles, report!'],
      stretch: ['Warm-up for beetle wrestling!', 'Arms out — airplane mode.'],
    },
  },
  'basket girl': {
    name: 'Hana', role: 'flower picker', mood: 'sweet', fav: 'pink wildflowers',
    lines: {
      any: ['These are for Grandma Fuku. She likes the pink ones.', 'The meadow is full of flowers today!', 'Do you like flowers? I like flowers.', 'Careful stems make happier bouquets.', 'I name every blossom. This one\'s Pip.', 'Basket almost full. Heart already is.'],
      morning: ['Morning petals hold dew like jewels.', 'First pick of the day is the luckiest.'],
      day: ['Sun makes pinks pinker.', 'Want one? I have extras. Always.'],
      evening: ['Dusk flowers smell softer.', 'Delivering soon. Almost.'],
      night: ['I left flowers by the lamp.', 'Night air keeps them fresh. Secret tip.'],
      walk: ['Skip-step to the meadow!', 'Basket bounce means happy flowers.'],
    },
  },
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
function linesOf(p) {
  const L = p.lines
  if (Array.isArray(L)) return { any: L }
  return L || { any: ['Nice weather.'] }
}
function pool(L, ...keys) {
  const out = []
  for (const k of keys) if (L[k]?.length) out.push(...L[k])
  return out.length ? out : (L.any || ['…'])
}
// returns an array of pages (strings) for one conversation
export function buildLines(key, ctx) {
  const p = PROFILES[key] || { name: 'Villager', role: 'villager', mood: 'warm', fav: 'quiet days', lines: ['Nice weather.'] }
  const L = linesOf(p)
  const pre = MOODY[p.mood] ?? ''
  const pages = [pre + pick(GREET[ctx.period] || GREET.day) + ' ' + pick(WEATHER[ctx.weather] || WEATHER.clear)]
  const act = activityLine(ctx.recent, p); if (act && Math.random() < 0.85) pages.push(act)
  // routine-stage line when the walker has one (hoe, knead, sell, nap…)
  const stage = ctx.stage && L[ctx.stage] ? pick(L[ctx.stage]) : null
  if (stage && Math.random() < 0.9) pages.push(stage)
  const own = pick(pool(L, ctx.period, 'any')); pages.push(own)
  // a second personal line for richer chats
  if (Math.random() < 0.7) {
    const extra = pick(pool(L, 'any', ctx.period).filter(x => x !== own))
    if (extra) pages.push(extra)
  }
  if (Math.random() < 0.55) pages.push(pick([`I do love ${p.fav}.`, `You know what makes me happy? ${p.fav[0].toUpperCase() + p.fav.slice(1)}.`, `If you ever find yourself near ${p.fav}, think of me.`]))
  if (ctx.period === 'night' && Math.random() < 0.6) pages.push(pick(['Off you go, then. Sleep well.', 'Get home safe. The lanterns will light your way.']))
  return { name: p.name, role: p.role, pages }
}
