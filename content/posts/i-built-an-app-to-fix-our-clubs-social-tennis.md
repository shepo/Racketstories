---
title: I built an app to fix our club's social tennis. Then it became something else.
date: 2026-06-25T19:12
author: jake
labels: Tennis, Club life, Mixers
description: How a WhatsApp message, a secret Excel spreadsheet and a surprisingly hard pairing problem at a Surrey tennis club turned a weekend project into Rallio. A club member's story.
image: noticeboard
imageAlt: A club noticeboard covered in overlapping box league sheets, tournament draws and notices
---

Bev has been nagging me to write this for about a month, so here it is. It started, as most things at our club do, with a WhatsApp message.

> "Anyone fancy social tennis Thursday 7pm? Courts 3 and 4. First 8 to reply."

I'm a member at a big multi-sport club in Surrey. Tennis, squash, padel, badminton, table tennis, a decent bar. And a noticeboard that looks like a crime scene.

![A club noticeboard covered in box league sheets and notices](noticeboard "The noticeboard. Somewhere in there, in eight-point font, is an email address for enquiries.")

<!--more-->

I love the place. But actually *using* it (knowing what was on, who was playing, whether there was space) was, to put it kindly, a mess.

The booking system ran on software old enough to have Y2K worries. Courts, lights, payments, bar tabs and membership fees were all wired into one creaking machine. Fine. Every club has one of those. But nobody had built anything for the *players*.

## Fourteen people, six courts, no idea

After Covid, our social sessions got hugely popular. Up to five a week: mixed doubles across six courts, twenty-odd players a session, all sorts of abilities, people who'd never met and people who'd played together for ten years, juniors and veterans on the same evening.

One person was organising all of it, purely out of love for the club. They'd graduated from WhatsApp to a secret Excel spreadsheet with some scripting bolted on. It still broke. And when they went on holiday, it either fell to whoever they could rope in, or they ran it from a sun lounger.

They collected names. They tried to remember who'd played with whom. They knew everyone's ability, roughly, but turning that into balanced pairings across six courts, in your head, on the fly, is a different thing altogether. They'd screenshot the pairings and post them in the group. Half the people didn't see it. Sometimes the same pair ended up together three rounds running. Sometimes a strong player got stuck with two complete beginners all evening.

It wasn't anyone's fault. Balanced mixed doubles rotation across lots of courts (balancing ability, avoiding repeat partners, rotating opponents fairly) is a genuinely hard combinatorial problem. Your brain can't hold it at that size.

People tried ChatGPT. Paste in the names, describe the rules, ask for pairings. It got muddled, repeated pairs, and once put the same player on two courts at the same time. Impressive, but not ideal.

So I had a go.

## The weekend project

I'm a designer and developer by trade and run a small studio, so building things is the day job. I started with the core problem: given a bunch of players of different abilities, put them on courts for several rounds of doubles, keep repeat pairings to a minimum, keep matches roughly even, and flag anything that looks off.

The first version was a weekend job. A little web tool. Type in the players, hit generate, get court assignments. It flagged same-gender pairs when that mattered for the format, kept track of who'd played with whom, and gave the organiser something to sanity-check before confirming.

The response at the club was instant. The organiser loved it. Players said the games felt fairer. A few people asked what the thing was.

That was when I realised it wasn't just a club hack.

## What it turned into

Little features crept in. A queue for drop-ins and cancellations. A rating layer so ability could be tracked over time and fed back into pairings. Session history. A ladder for singles and doubles rankings (Dan on here has opinions about ladders). Then competition draws: knockouts and round robins. The mixer, which started all of it, became one of four proper session types.

It was never just for tennis, either. Padel, pickleball, squash, badminton, table tennis: if you're rotating players across courts, the sport hardly matters. And it was always for *players and organisers*, not the back office. There are a hundred products for court booking and membership payments, and clubs take years to change those, probably rightly. I didn't want to go anywhere near that. No court lighting, no bar tabs. Just helping someone run a great session and build a bit of community around it.

## The bit I didn't expect

I assumed people would mind being paired with someone much better or much worse than them. They didn't, much. What they *really* hated was playing the same person twice, once as an opponent and then again as a partner. Ability wasn't the big pain. Repetition was.

The other thing I learned: nobody wants to sign up for anything. So now organisers just share a link. One tap and you're in, no approval queue, no form. You see your pairings and results straight away. If you want more (a profile, a rating, notifications) it's there, but you don't have to.

The useful bit has to show up *before* you ask anyone for anything. Results and pairings that live in the link, not a screenshot. A recap the organiser can share to WhatsApp in two taps. The first reaction needs to be "oh, that's handy", not "oh, another form".

## Where it is now

It's called Rallio, it's on iOS, Android and the web, and it's in free beta while I work out proper pricing for clubs. A handful of other clubs have found their way to it, which still surprises me.

I'm still a member at the same club. The socials still run. The organiser still does a brilliant job, they just use the tool now. The noticeboard is still a mess, but a smaller one. I'm working on the rest.

The games are fairer, though. And sometimes that's enough to keep the rally going.

P.S. Bev would like it noted that she "thought of half of this". She's not wrong.
