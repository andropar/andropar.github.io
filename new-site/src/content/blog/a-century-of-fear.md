---
title: A century of fear
description: What scares us changes. An illustrated analysis of 19,302 horror
  films, from atomic mutants to masked killers to ghosts.
date: 2026-10-26
draft: true
tags:
  - horror
  - data
  - film
---
As a side project, I built [Horrorverse](https://horrorverse.jroth.space/), a recommendation site for horror films. It makes it easy for my friends and me to plan movie nights themed around a film, and it gives me a way to explore the genre and find films picked for my own taste.

To build it, I put together a catalogue of every horror film I could find: 19,302 of them, from 1896 to today. With nearly the whole genre in one place, it seemed a waste not to look at it more closely. Film historians have long argued that horror mirrors the anxieties of its time,{{cite:skal,phillips,wood}} but they make that case from the classics everyone remembers. What do all the others say?

First, the films had to be sorted into buckets by what makes them scary. I collected 32 published classifications of horror, from film scholarship to film catalogues, and merged their 490 categories into 21 themes, from vampires and masked killers to aliens and haunted houses. Two AI models then labelled every film from its synopsis, keywords and what they knew about it, and a third settled their disagreements. As a check, Wikidata’s volunteers tag some films with subgenres such as ‘vampire film’; on films held back for testing, my labels include 81% of those tags.

Data: TMDB, MovieLens, Wikidata · Updated 4 November 2026 · [How I did it](#tl-methods)

## What were horror films about?

The first thing I wanted to know was simple: how much of cinema was horror in each year, and what those films were about.

{{figure:hero}}

A few things stand out right away. The first is how far horror’s share of cinema has swung. Right after the Second World War, almost no films were horror (2% around 1949); by 1973, more than one in five was (23%). Today it is about one in six. The biggest swings line up with changes in how films were made and shown. Horror’s share halved after Hollywood began censoring its films in 1934, nearly doubled once a ratings system replaced that censorship in 1968, and peaked again during the video-rental boom of the 1980s.

The second is how slowly the slasher faded. *Halloween* and *Friday the 13th* made the masked killer the face of 1980s horror,{{cite:nowell,clover}} and killer films peaked at 26% of horror films in the early 1980s. They have declined ever since, to 14%. Ghost stories rose in two waves, first in the early 1980s, led by *The Shining* and *Poltergeist*, then in the early 2000s, led by *Ringu*, *Ju-on* and their Hollywood remakes{{cite:mcroy}}, and are now horror’s most common theme (16%).

## Does horror mirror the news?

How much horror got made follows the industry. What I was more curious about is whether what it was about follows the news. It’s one of the oldest ideas in writing about the genre: each era’s monsters stand for what that era feared.{{cite:skal,phillips}} Its most systematic version comes from the sociologist Andrew Tudor, who in 1989 sorted nearly 1,000 horror films released in Britain by where their threat comes from.{{cite:tudor}} He found fear moving closer to home over the century: away from gothic monsters and mad laboratories, towards the disturbed human mind.

Across all 19,302 films, the first half of his story holds. In the 1950s, the decade of H-bomb tests and Sputnik, science gone wrong peaked.{{cite:skal}} Around 1956 it was behind nearly half of the horror films with an identifiable threat (48%), from *Them!* to *The Fly*, against 10% today. From the 1960s through the 1980s, after *Psycho*, human killers and disturbed minds led, just as Tudor found.

Then the story turns. Since the 1990s, the supernatural has been behind at least 40% of horror films in every decade, the opposite of where Tudor’s trend pointed. The post-9/11 years are often remembered for ‘torture porn’,{{cite:edelstein,wetmore}} because *Saw* and *Hostel* were hits. Across the thousands of other horror films made in the 2000s, killer films held steady at 21%; the growth was in ghosts.

{{figure:threats}}

## How do people describe each decade?

I also wanted to see how people describe each decade. On TMDB, users tag films with keywords, and some tags turn up far more often in one decade than in any other. ‘Mad scientist’ peaks in the 1940s and fades by the 1960s; ‘slasher’ defines the 1980s and remains a staple; ‘found footage’ takes over in the 2010s. Most of these tags were added in recent years, so they show how we remember each era today.

{{figure:vocabulary}}

## Do the famous films tell the whole story?

Histories of horror are written from the films people remember: the hits, the classics, the films that get remade and taught. I wanted to know whether those films are a fair sample. If they are, the histories hold. If not, whole trends can go unnoticed.

They are not a fair sample. Take the 1,047 horror films with Wikipedia articles in at least 20 languages, the ones historians write about and everyone has heard of. Compared with all horror films from the same decades, they hold a third fewer ghost stories (9% instead of 14%), but far more spectacle: 2.4 times as many giant monsters, 1.7 times as many aliens and 1.5 times as many vampires.

{{figure:canon}}

At the other end, horror keeps growing in films almost no one sees. Counting every film on TMDB, not just those with 20 ratings, horror’s share of cinema rose from 4% in 1975 to 14% in 2020: a flood of micro-budget films. Much of that flood is ghost stories: since 2010, 18% of the films too obscure to have 20 ratings are about ghosts, against 14% of the rest. The rise of the ghost story happened mostly in films that never became famous.

Fame and quality only loosely go together. Films with articles in 40 or more languages average 6.9 on TMDB, against 6.2 for all films with 300+ ratings, but [Anaconda](https://www.themoviedb.org/movie/9360) (1997) has articles in 46 languages at a rating of 5.3.

{{figure:reach}}

## Which stories keep coming back?

Horror tells the same stories again and again: as remakes of a few classic novels, and as franchises that turn one hit into ten films. I wanted to know which stories come back most often, and whether the later versions are any good.

The oldest stories keep finding new life. Mary Shelley’s *Frankenstein* has been filmed again in 8 decades since its first adaptation in 1910, and Bram Stoker’s *Dracula*, starting with the unauthorised [Nosferatu](https://www.themoviedb.org/movie/653) in 1922, in 7. [The Fall of the House of Usher](https://www.themoviedb.org/movie/28189) and [Dr. Jekyll and Mr. Hyde](https://www.themoviedb.org/movie/3019) share third place, with 5 decades each. A century on, Frankenstein has not worn out: the 2025 version is its best-rated yet, at 7.6 on TMDB.

Franchises wear out faster. In 32 of the 40 most-rated horror franchises, the original is still the best-rated film, and the films that follow score a full point lower on average on TMDB’s 10-point scale, with the same drop on MovieLens. The hardest falls came after the greatest originals: *Jaws* (7.7, then 4.9 on average), *Psycho* (8.4, then 6.0 on average) and *The Exorcist* (7.7, then 5.5 on average). Coming back after ten years or more is a coin toss: of 24 such films, 13 beat the one before them, like [Halloween](https://www.themoviedb.org/movie/424139) (2018), which climbed to 6.6 after *Halloween: Resurrection* scored 4.6.

{{figure:stories}}

## Where is horror made?

Last, I wanted to know where horror comes from. It’s often treated as a Hollywood genre, and more of it comes from the United States than from anywhere else: it made between 32% and 56% of each decade’s horror films since 1950. Elsewhere, horror came in national waves: Japan in the 1950s, when Toho’s monster films began (17%); Britain in the 1960s, the heyday of Hammer{{cite:hutchings}} (12%); Hong Kong in the 1950s (10%); Italy in the 1970s, during the giallo boom{{cite:koven}} (10%).

{{figure:geography}}

But every film industry has its own monsters. Each country has a signature nightmare: the theme it makes far more often than the world does. Japan, the home of Godzilla, makes giant monsters 7 times as often as the world; Australia, killer animals 3.1 times; Italy, cannibals 2.5 times. Ghost stories make up 60% of India’s horror films, 59% of Thailand’s, 41% of South Korea’s and 40% of Hong Kong’s, against 14% worldwide. Witchcraft makes up 14% of Indonesia’s horror films and 7% of Mexico’s, against 3% worldwide.

{{figure:signatures}}

## So what were we afraid of?

Seen whole, a century of horror mostly confirms the story historians tell: atomic monsters in the 1950s, human killers and broken minds through the 1980s, the supernatural ever since. Where it differs is in what got noticed. The ghost story, the biggest growth of the last forty years, grew mostly in films few people remember. The post-9/11 torture cycle that dominated the conversation barely moved the numbers. The famous films are the ones history gets written from. The rest are where much of the genre actually changed.

To find your own way through them, [Horrorverse](https://horrorverse.jroth.space/) maps every one of these films by plot.
