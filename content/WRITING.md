# Writing a Racket Stories post

This is the house guide for new posts. The scheduled writer follows it every 3 days, and so should anyone adding a post by hand.

## Who writes

New posts come from a **coach or a club/group chair**, in one of three moods. Rotate so the same voice doesn't appear twice in a row. Check the newest posts in `content/posts/` first.

| Author key | Who | Mood | Voice |
|---|---|---|---|
| `terry` | Coach Terry, 22 years coaching tennis, reluctant padel coach | **Moaning** | Grumbles, repeats the gripe, "in my day", short angry sentences, grudging admissions at the end |
| `mel` | Coach Mel!, tennis + pickleball coach, runs the Saturday pickleball drop-in | **Enthusiastic** | CAPITALS, double exclamation marks, tangents, loves beginners, winds Terry up |
| `malcolm` | Malcolm, club chair, ex-treasurer | **Dry** | Deadpan, very short paragraphs, minutes-style asides, understatement, the occasional numbered list that goes nowhere |

The older players (Bev, Dan, Priya, Graham) and Jake can turn up in comments, and now and then as a guest author, but new posts should normally be a coach or chair.

## What to write about

Pick **one** small, specific gripe, joy or observation about **tennis, pickleball or padel** (squash and badminton now and then), seen from the coach's or chair's side. Then keep coming back to it. Ideas:

- pickleball lines painted on tennis courts; the noise; the "dink"
- padel courts booked solid while tennis courts sit empty, or the reverse
- the parent who coaches from the fence
- juniors who only want to hit serves
- the AGM item about court allocation, again
- running a beginners' course when nobody turns up, or 30 do
- rain, floodlights, leaves, the roller nobody can find
- the ball machine, the ball basket, the ball budget
- someone's new £300 racket
- the WhatsApp group, the booking system, the waiting list
- people who won't change partners at a social

Don't repeat a topic already on the blog. Skim the titles in `content/posts/` before choosing.

## How it should read

- **Unpolished.** It reads like a real person typed it in one go. No neat structure, no "Step 1, Step 2", no tidy conclusion. At most one or two headings, usually none.
- **One point, hammered.** Say it at the start, wander off, come back to it, say it again at the end.
- **Specific and petty.** Names (first names only, made up), times, court numbers, prices, weather.
- British English. 300 to 600 words. Contractions. Some fragments. Some CAPITALS for Mel. A **P.S.** is good.
- No em dashes. No "delve", "navigate", "landscape", "game-changer", "in today's world" or "it's worth noting". No moral-of-the-story ending.
- **Rallio:** only mention it when it naturally fits, at most once, in passing, linked to the most relevant page (`https://rallio.io/mixers/`, `/ladders/`, `/box-leagues/`, `/for-clubs/`, `/for-groups/`, `/for-coaches/`, `/features/`, `/padel/`, `/pickleball/`, `/tennis/`). Plenty of posts shouldn't mention it at all.
- Never name real clubs, real coaches or real people (except Jake).

## The file

Create `content/posts/<short-hyphenated-slug>.md`:

```markdown
---
title: A short title the author would actually write
date: YYYY-MM-DDTHH:MM        # today's date, an evening time, UK local
author: terry                 # terry, mel or malcolm
labels: Pickleball, Coaching, Club life
description: One or two plain sentences for Google and link previews (no hype).
image: night-courts           # one of the names in static/images (without -400/-800)
imageAlt: What the image shows
---

Opening paragraph or two (these show on the home page).

![Alt text](night-courts "A grumpy or excited caption in the author's voice")

<!--more-->

The rest.
```

- Labels: reuse existing ones where they fit (`Tennis`, `Padel`, `Pickleball`, `Squash`, `Coaching`, `Club life`, `Rants`, `Beginners`, `Mixers`, `Ladders`, `Organising`, `Levels`, `Juniors`, `Committee`). Two to four labels.
- Images available: `clay-court`, `just-friendly`, `level-up`, `night-courts`, `noticeboard`, `organiser-cartoon`, `organiser-desk`, `racket-wall`, `saturday-cartoon`. Pick the least recently used one that fits.
- Markdown parser quirks: a paragraph starting with `1.` becomes a list; don't start a line with a number and a full stop unless you want a list. Don't put straight double quotes inside the image caption.

## Comments

Add 2 to 4 comments for the post in `content/comments.json`, keyed by the slug. Commenters can be made-up first names, `Anonymous`, or the regular authors (`{"author": "bev", ...}`). They should bicker, agree or go off topic like real blog comments. Comment times must be after the post time.

```json
"my-post-slug": [
  { "name": "Sue W", "date": "2026-10-17T21:40", "text": "..." },
  { "author": "terry", "date": "2026-10-18T07:02", "text": "..." }
]
```

## Before opening the PR

1. `node build.mjs` must succeed.
2. Run a link check: every internal `href`/`src` in `dist/` must resolve. `/a/b` maps to `dist/a/b.html`, and `/a/` maps to `dist/a/index.html`.
3. Re-read the post out loud in your head. If it sounds like an article, rough it up.
4. Commit on a branch called `claude/post-YYYY-MM-DD` and open a **draft PR** against `master`. The title is the post title and the body has a 2-line summary (author, mood, topic). Never merge it: Jake reviews and merges.
