---
title: The recommendation system behind Horrorverse
description: How six ratings become recommendations on Horrorverse, and how I
  tested whether they are any good.
date: 2026-11-07
draft: false
unlisted: true
tags:
  - horror
  - recommender systems
  - machine learning
---
{{step:klaus}}

## Jason and his six ratings

Jason Voorhees gives *Friday the 13th* (1980) four stars and Freddy Krueger's *A Nightmare on Elm Street* (1984) two. Yes, that Jason: the killer from the Friday the 13th sequels. His mother does the killing in the original, and apparently even Mum has to earn the fifth star.

I built Horrorverse for myself and my friends. To show how its recommendations work, I'll follow Jason's six ratings through the system. Alongside those two, he gives *The Wicker Man* (1973) and Ari Aster's *Hereditary* (2018) five stars, *The Witch* (2016) 4.5, and *Midsommar* (2019) four. He can enter them on the site or import his Letterboxd account.

His highest-ranked recommendation is *The Lighthouse* (2019), Robert Eggers's film about two lighthouse keepers trying to stay sane on a remote New England island in the 1890s. Isolation, threatened sanity, and a director Jason already liked through *The Witch*: I can see the appeal. I want to show how those six ratings put it ahead of thousands of other films, and how I checked whether this approach gives useful recommendations.

Giving a film 4 stars can mean very different things depending on who's doing the rating. Some people give them to anything decent, others save them for their all-time favourites. So the system mostly works with likes and dislikes. Anything from 3.5 stars up counts as a like, the same cut-off used to train the model. A rating of 2.5 or less counts as a dislike. A 3 tells us Jason has seen the film and keeps it out of his recommendations, without affecting the scores of other films. That leaves five likes and one dislike to work with.

{{step:funnel}}

## Which films make it through

Before Jason's taste comes into it, there's a more basic question: which films belong in the recommendations at all? The home page has daily picks, new releases and browse lists; Movie night lets him type what he's in the mood for. Daily picks and Movie night share the checks shown in the panel. These keep the recommendations focused on core horror, with enough information to make a usable card, and leave out everything he's already seen.

I chose 10 votes as the lowest bar that keeps the noise out, and use it for daily picks, Movie night and new releases alike. Among releases from the last twelve months, 44% of films with 1–4 votes have an extreme TMDB rating (9 or more, or 3 or less out of 10). At 5–9 votes that falls to 3%; from 10 votes up, none do. With just a handful of votes, the rating is mostly noise. Requiring more votes would make obscure films wait longer to appear.

That's still a lot of films. Jason's six ratings now have to help put them in order.

{{step:families}}

## Learning from other people’s ratings

The idea behind collaborative filtering is simple: if other people liked the same films as Jason, their ratings might tell us what else he'd enjoy. Horrorverse has far too few users to learn much from its own data, so I use **MovieLens**: a public research dataset with about 32 million ratings from 200,000 people, collected up to October 2023. EASE, the model I use to learn from those ratings, has scores for 5,802 of Jason's 13,129 films. The other 7,327 have no MovieLens ratings; 1,144 are from 2023 or later, and most of the rest are older films MovieLens never had. We'll need another way to score those.

There are several ways to learn from these shared tastes. Matrix factorization models such as {{term:ALS|Alternating least squares: a way to learn those numbers by updating the films while holding the people fixed, then the people while holding the films fixed.}} give each person and film a set of latent factors. A few dozen numbers stand in for a person's taste or a film's appeal, and comparing the two gives a score.

Transformers such as SASRec and HSTU also use the order of someone's ratings: what they liked most recently can help predict what comes next, much as a language model uses the preceding words in a sentence. An item-item model learns connections between films directly. How much does liking one tell us about whether someone will like another?

EASE takes that last approach. It's a linear {{term:autoencoder|A model trained to rebuild its input. Here it reconstructs which films someone liked using their other likes.}}, fitted with {{term:ridge regression|A method for fitting prediction weights that discourages large values, making the predictions less dependent on weak evidence.}} (the maths is below). That gives a concrete way to follow a recommendation back to Jason's ratings: each film he liked contributes a number to the score of a film he hasn't seen.

{{step:sandbox}}

For *The Lighthouse*, we can follow those contributions one by one. Each film Jason liked can push its score up or down. EASE learns the size and direction of that push, called a weight, from the MovieLens ratings. During training it tries to predict each person's likes from their other likes, learning a weight for every pair of films. Once those weights are learned, Jason's likes tell us which ones to add together.

*Midsommar* gives *The Lighthouse* its biggest push, followed by *The Witch* and *Hereditary*. *Friday the 13th* pulls slightly the other way. You can inspect each contribution in the panel, but there's an important detail behind them: EASE learns all the weights together.

Suppose nearly everyone who likes *The Witch* also likes *Midsommar*. Knowing that Jason liked both might tell us little more than knowing he liked either one. Learning the weights together lets the two share the credit: each weight reflects what that film adds once the person's other likes have been accounted for. Otherwise, we'd count much of the same information twice.

Add up the contributions from everything Jason liked and you have a film's score. His dislike for *A Nightmare on Elm Street* also contributes: the system reverses that film's weights and uses them at a tenth of the strength. A film it would have pushed up therefore gets a small deduction. The liked film with the largest positive contribution supplies the "Because you liked ..." line on the recommendation card, so Jason can see which of his ratings did most to put it there.

Add those contributions and *The Lighthouse* beats 99.96% of the 5,808 films being scored, including those Jason has already rated. Its percentile gives the raw sum some context: how strong is this match compared with everything else we could show him?

Jason's ratings can support a different sort of recommendation too. *Halloween* (1978) comes sixth. Its biggest contribution is 0.101 from *Friday the 13th*, which gives its card the line "Because you liked Friday the 13th". Jason's dislike of *A Nightmare on Elm Street* subtracts 0.009 from it. *Rosemary's Baby* (1968) comes seventh. Jason hasn't rated it, so it remains available to recommend.

You can try this yourself in the panel. Clear the ratings and give only *Shaun of the Dead* (2004) a like. The whole list changes. Select a recommendation to see which ratings put it there. You can also change any of Jason's ratings or load another profile; the weights behind the panel are the same ones the site uses.

{{details:The maths}}

The calculation starts with a table of people and films. `X` records who liked what in MovieLens, with a 1 wherever a rating is 3.5 or more; `B` holds the learned film-to-film weights. Multiplying them adds up the weights from each person's likes. EASE ([Steck, WWW 2019](https://arxiv.org/abs/1905.03375)) is a linear autoencoder `X ≈ XB`: it tries to reconstruct that table of likes through this multiplication. Setting `diag(B) = 0` prevents a film from predicting itself. Ridge regression fits the weights while penalising large values, and has a closed-form solution:

```formula
P = (XᵀX + λI)⁻¹            λ = 1000
B[i,j] = −P[i,j] / P[j,j]    (i ≠ j)
raw[j] = Σ B[i,j] over liked i
       − 0.1 · Σ B[i,j] over disliked i
```

`XᵀX` counts how often films were liked together. Inverting this matrix after adding `λI` gives the inverse Gram matrix used to calculate `B`'s regression weights. These are partial associations: they discount what the other likes already explain, much as a precision matrix does when describing conditional relationships in a Gaussian graphical model. λ controls how strongly the weights are pulled towards zero, shrinking the weights of pairs with little evidence; values between 300 and 1000 work about equally well here.

The cost of fitting grows quickly with the number of films: `O(n³)` time and `O(n²)` memory mean that doubling that number multiplies the time by roughly eight and the memory by four. With ~15,800 input and 5,808 output films, that comes to about 5 GB and a few minutes on a laptop. Input films supply evidence from a person's ratings; output films are the ones being scored. The dislike penalty applies only to films EASE has a row for.

{{/details}}

{{step:bridge}}

## Films missing from MovieLens

So we can explain why *The Lighthouse* comes first. For the 7,327 films missing from MovieLens, EASE has no ratings to learn from and therefore no score to give. This is the film side of the cold start problem. The dataset stops in October 2023, so retraining on it will still leave out everything released since then.

We do have something else to go on: what the films are about. TMDB describes each film through its synopsis, keywords, genres, country, language, decade, runtime, director, writers and cast. Descriptions give us a way to find a missing film's closest matches among films that already have scores.

To compare those descriptions, I run the text through BGE-small, an open model that produces an {{term:embedding|A list of numbers representing something, such as a film description. Similar descriptions are given similar lists, so we can compare them mathematically.}} for each description. BGE-small uses 384 numbers. I make three versions for each film: all the text, keywords and genres alone, and title and synopsis alone. This lets the comparison use both the full description and more focused matches on subject matter. I compare them using {{term:cosine similarity|A measure of how closely two lists of numbers point in the same direction. Here, a higher value means the film descriptions are more alike.}}. Those versions contribute 60, 25 and 15% of the similarity, respectively.

A missing film can then borrow the scores of its 30 most similar films with ratings, giving more weight to closer matches. For *The King Tide* (2024), those matches include *Hereditary* and *Midsommar*.

Each neighbour gets a similarity weight, and those 30 weights sum to 100%. The system multiplies each weight by that neighbour's score for Jason, then adds the contributions. *Hereditary* has a similarity weight of just 3.3%, yet supplies 27% of the total score: Jason's score for it is high, while most neighbours score near zero.

That's why the percentages differ. The similarity weight says how much to borrow from a neighbour; its share of the final score also depends on what there is to borrow. *Midsommar* supplies another 26%, so together they account for over half of *The King Tide*'s borrowed score.

The descriptions determine which films it borrows from; Jason's ratings determine the scores it borrows. Change the profile and those same 30 neighbours produce a very different result. I compared 10 and 30 neighbours. The difference on new releases was within noise, while 30 did somewhat better across all films.

The weakness is easy to imagine: two films can have similar plots and appeal to very different people. I checked this by starting with films for which we do have audience ratings. For each one, EASE gives us the 20 films whose likes most strongly raise its score. The question was how many of those same 20 we could recover by borrowing from similar descriptions. Borrowed scores recovered 15% of them; using real audience neighbours recovered 55%, and a random guess managed 0.7%. Much of what the ratings tell us about shared taste gets lost when we rely on descriptions. Borrowing works well enough to rank new releases against each other, but they struggle against the classics. That's why new films get their own list.

{{step:site}}

## Putting it on the site

We can now put every eligible film in order. Leave Jason's ratings alone, though, and *The Lighthouse* will greet him every day. Eventually he'll want something else to look at. Jason sees six daily picks: three at the top and three under "More for you", with new releases and browse lists below. Movie night has its own page, where he can ask for something specific. On the home page, I wanted the picks to change even when he hasn't entered another rating.

{{step:home}}

To give Jason some variety without losing his strongest matches, the site keeps his best three, then draws the other three at random from his top 24, favouring films higher in the ranking. He can keep his strongest matches in view and still come back to something different.

This is Gumbel top-k sampling. The draw gives each film a temporary number, or key, and takes the highest keys. Each gets `−rank / 6 + Gumbel noise`: its position in the ranking sets the starting value, and a random amount drawn from a Gumbel distribution gives it a chance to move up or down. This is a standard way to sample without replacement, so a film can only be chosen once in a draw. A film's odds fall off as `exp(−rank / 6)`. The browser holds on to that draw for the rest of the day, unless Jason hits "New picks".

When Jason comes back with the same ratings, his browser tells the server what he's been shown recently so it can skip those films. Only one film per franchise gets in. He won't get two Halloween sequels next to each other.

{{step:newrow}}

New releases give Jason another way to find something he hasn't already passed over. They use the same basic checks, with a release window and a minimum average rating on top; the panel has the full criteria.

New films can take weeks to clear even this 10-vote bar. On 22 October 2026, only 5 of the 561 horror films released in the previous 30 days had reached it. Jason gets these ranked by borrowed scores; someone without likes gets them by popularity. Films newer than the catalogue appear a few seconds after the daily TMDB update, once their descriptions have been embedded.

The browse lists offer a shared starting point, with the same ranking for everyone. They balance how highly people rated a film against how many people rated it. This vote-weighted rating pulls films with few votes towards the average, so ten glowing reviews won't put a new film above a classic. A subgenre list and a director list change every day, giving Jason another way to browse beyond what his ratings suggest.

{{step:night}}

## Finding something for tonight

The home-page lists give Jason something to browse. Tonight, though, he has a more specific idea. He types "slow-burn folk horror, not American" into Movie night. The site removes every US film, then uses the subgenre it recognises to adjust the scores: films without the "folk horror" tag lose 0.10. It matches the remaining words as text. In the chat version, a language model turns the conversation into the same kind of request.

The remaining request has to be matched against the films' descriptions. Exact wording helps when a description uses the same terms as Jason; matching meaning also helps when it expresses a similar idea in different words. The panel calls these scores "Words" and "Meaning". Words combines {{term:BM25|A way to score word matches that gives more weight to uncommon words and accounts for how long each description is.}} with how many of the request's words the film covers. Meaning compares the film's embedding with an embedding of the request, using the same kind of numerical representation introduced above. Two further scores measure matches on the named tags and genres ("Facets") and how well rated the film is ("Quality"). All four run from 0 to 1, so they can be combined by giving each a weight.

Jason's request is all genre words, so hundreds of films fit about equally well. For a request like this, quality gets more weight in the combined request score. This narrows the choice to 80 films that can then be ranked using his taste as well.

{{step:fusion}}

A film can fit "slow-burn folk horror" well and still be a poor match for Jason. Each of the 80 candidates therefore has two scores to consider: its request score and his taste percentile. Their scales differ: a small change in one needn't mean as much as the same change in the other. I use each film's position in the two rankings to combine them, giving request and taste equal weight.

The method is called weighted reciprocal-rank fusion. Each ranking gives a film a contribution that gets smaller as its position drops, and the contributions are added together. To calculate one, add a fixed offset to the position, then divide one by that total. The offset softens the differences near the top, so falling a few places in either ranking only reduces the contribution slightly.

Moving from first to fifth on either list costs a film very little. Further down, the combination can move a film a long way: *Kwaidan* (1965) sits near the bottom for Jason's request, but near the top by his taste. Giving the two rankings equal weight pulls it up to 27th. His past likes pull it up, while tonight's request keeps it well away from the top. Drag the slider towards either end to see how much each ranking contributes.

{{step:lineup}}

Even after combining taste and request, the top three might be near-identical films. The site uses greedy diversification based on maximal marginal relevance (MMR): it builds the lineup one pick at a time, reducing the remaining films' scores when they repeat something already chosen. A similar story costs up to 0.30, the same franchise 0.40, and the same director 0.15. That gives a different kind of film a chance to move up as the lineup fills.

For this request, every candidate resembles Jason's first pick about equally: the penalties range from 0.17 to 0.21. The deductions are too similar to change the order, so the three films shown in the panel keep their places. A sequel to a film already picked would take a larger penalty and drop right down the list.

{{step:anon}}

## Before the first like

Jason arrived with six ratings. For a visitor who starts with none, EASE has no likes to add up. The site starts with the films that have the most TMDB votes, converting those vote counts to percentiles like the other scores.

I started with an average rating here, which favours films whose viewers rated them highly. Vote count favours films that many people have rated. To compare the two, I hid people's next liked films and checked where each method ranked them, giving more credit for a higher position. Popularity scored 0.113 against 0.069 for average ratings, so I switched. That also means the signed-out picks have a lower average rating.

This starting list also makes the catalogue's boundaries visible. The horror filter lets the occasional crossover like *Venom* (2018) through. Popularity can bring a film like that into the picks before the site has any likes to guide it towards someone's particular taste.

Give the site only dislikes and you'll still get the same list. Dislikes adjust scores once there's at least one like. So the first useful thing a new visitor can do is tell the site about a film they enjoyed.

{{step:testing}}

## Replaying people’s ratings

We can now follow Jason's ratings all the way to the films on his screen. But would he enjoy them? For a made-up user, I can only guess. To check how often the system finds something someone likes, I need real rating histories. Horrorverse doesn't record what people click on or watch, so I replay people's MovieLens histories. I stop at a point in someone's ratings, hide everything that comes afterwards, and see whether the system would recommend the next film they liked.

For each replay, the system produces an ordered list, and I look for the hidden next like among the first six films. On a reserved set of 2023 ratings, EASE put that next like among the six picks 37% of the time. Giving everyone the most popular films managed 21%. That's a useful gain, but it still leaves most next likes outside the six picks.

Getting that film into the six picks is useful; putting it first is better still. The measure I use for the comparisons below, NDCG@6, gives each test case more credit the higher the next like appears in those six places, then averages that credit across cases. First place earns full credit, lower places earn less, and anything outside the six earns nothing. A perfect score is 1. Randomly ordering all ~9,500 films in that replay gives about 0.0003; the models here score around 0.2. Replaying 2021 and 2022 ratings with the 10-vote bar gives identical scores.

Each test starts with a like from someone who has at least five earlier ratings that aren't a 3. The system sees only what they rated before that moment and has to find their next like among all eligible films they haven't rated yet. I train the models on ratings from before the test year, keeping the people used for training, tuning and testing separate.

The timing of those ratings matters. Most arrive in sprees, a minute apart, and guessing the next like during a spree is much easier: it roughly doubles the score. I therefore also test likes entered more than an hour after the person's previous rating. I call these session starts and report them separately, because the easier predictions within a rating spree can otherwise make the system look much better.

{{step:why}}

### Choosing EASE

Once I had the replay, I could also check whether a more complicated model would earn its place on the server. In October I compared eight model families on an older, smaller catalogue. I ran EASE, ALS, several neural networks, the transformers SASRec and HSTU, and a fine-tuned Qwen language model built to generate recommendations through the replay. Each model ranked the whole catalogue for the same people, so I could compare its results against EASE case by case. The transformers only got through one year (2019), and I stopped tuning the neural models so I could ship the site.

Nothing beat EASE within that budget. SASRec and HSTU came out roughly level with it. The panel shows a 95% {{term:bootstrap confidence interval|A range calculated by repeatedly resampling the evaluation data and recalculating the result. It shows how much the estimate varies with the data sampled.}} for each difference from EASE, so we can judge how much to make of those small gaps. For both transformers, that range includes zero, so the results are compatible with either a small gain or a small loss. Everything else did clearly worse. After two hours of training, the language model was still far behind.

These were my two-stage hybrids built on EASE: alongside the rating sequence, the neural models (including my adaptations of SASRec and HSTU) received each candidate's EASE score and global statistics as side features, and trained with 16 of EASE's top-ranked films as {{term:hard negatives|Films used as examples to rank below the target even though an earlier model scored them highly. They give the model harder choices to learn from.}}. During training, collaborative dropout removed the film's identity, EASE score and statistics together so the models also learned from content alone; sharing EASE's signal makes the tie less independent than it sounds.

That made me curious about how much SASRec depended on EASE. Switching that input off in a trained SASRec dropped its score from 0.172 to 0.110 on a small sample. Removing an input after training hurts any model, so I can't read that drop as a clean measure of EASE's contribution. It does suggest that a good part of the tie comes from EASE's own signal.

With the transformers roughly tied with EASE, the practical differences matter. EASE fits with a single matrix inverse, gives the same result every time and needs no training loop or GPU. Scoring a user takes a sum. Those are useful properties for a hobby project running on a small server, and the more complicated models hadn't given me a better result in return for their extra work. Simple models have held up well in published comparisons too. [Ferrari Dacrema et al. (RecSys 2019)](https://arxiv.org/abs/1907.06902) tried to reproduce 18 neural recommenders. Only 7 worked. Six of those were often beaten by simple nearest-neighbour methods, and the last didn't consistently beat a well-tuned linear model. For my small server, EASE was an easy choice.

{{step:results}}

### What the rebuild changed

Choosing the model was only part of the work. I still had to decide which films it can recommend, how often they change, and what happens when someone dislikes one. In October I rebuilt most of that surrounding system, including the borrowed scores, daily rotation and dislike penalty, and added a new catalogue that includes films from TMDB. I tested the full pipeline exactly as it runs on the site, using a second set of 2023 ratings. These were 10,643 test cases from 1,140 people whose data hadn't been used for tuning.

For people with ratings, all that rebuilding brought no measurable improvement in finding their next like. The current system's NDCG@6 sits slightly below the old one's in the panel. The old system also used the old catalogue, so both the recommendations and the set of films competing for a place changed. That makes the two scores hard to compare directly. On session starts, both score about half as much.

Daily rotation makes the trade-off particularly clear because we can compare the current system with and without the draw. Rotation lowers NDCG@6, but puts 4.4% of the catalogue into someone's six picks instead of 3.3%. More films reach someone, at the cost of finding fewer of the recorded next likes near the top. I kept it. A fresh draw can miss the next recorded like while giving someone a reason to look at the page again; seeing the same films every day gets boring fast.

The rebuild lets people rate and get recommendations for films MovieLens doesn't have. People without ratings now get the popularity list in place of the average rating. New releases also improve with borrowed scores over the random ordering they had before.

The part I'd most like to understand is what happens with less popular films. The films people like next sit at the 93rd popularity percentile on average, meaning they have more votes than most films in the catalogue. EASE's picks sit at the 99th, and the replay rewards that. Since the hidden films are usually popular themselves, recommending widely known films is a good way to find them. I'd also like the site to help people discover films they might otherwise miss.

I can follow every contribution that puts *The Lighthouse* at the top of Jason's list. But the part that interests me most is further down: a film he hasn't heard of, picked because those six ratings gave the system something useful to go on. Horrorverse collects no feedback of its own, so I still can't check whether those less popular recommendations work better for the people using it. Somewhere down that list may be a film he'd love and would never have found on his own. I'd like to know how often Horrorverse gets him to it.
