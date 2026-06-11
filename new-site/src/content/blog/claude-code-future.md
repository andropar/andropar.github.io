---
title: "$200 for a glimpse into the future (existential crisis included)"
description: "A month with Claude Max taught me how work, science, and life will change radically in the very near future."
date: 2025-12-31
draft: false
tags: ["AI", "productivity", "future of work"]
---

For the month of December 2025 I splurged on the $200 Claude Max subscription. Not a small amount for a PhD student, but well worth it in hindsight: it gave me a visceral sense of how work, science, and life in general will change radically in the very near future.

I took the plunge sometime end of November, after realizing that I had not been using LLMs to their full potential - despite being a heavy user since GPT-3 first came out in March 2022. Like everyone else, I started with ChatGPT, bound to copying and pasting from its chat interface. My usage grew as models improved and IDE integrations like Copilot and Cursor emerged. I'd heard of CLI agents like Claude Code, but never tried them. Why would I, when I could just use the IDE?

This changed when I tried Opus 4.5 in Cursor. I wanted to run an existing neural network interpretability method on some images and plot the results - nothing complicated. I expected the usual output: a solid script that I'd have to tweak in a few places. But to my surprise, it didn't just deliver a working analysis - it asked for permission to execute it. And when something in the results looked off, it noticed, updated the script, and ran it again. All on its own initiative.

That got me thinking: if it can show this kind of initiative, what else can it do with just high-level directions? How far can you push today's LLMs by being a "conductor" - not using them as a coding sidekick, but treating them more like remote employees who can make their own decisions?

Much farther than I expected, it turns out. CLI agents are a big part of what Leopold Aschenbrenner calls "unhobbling" in [Situational Awareness](https://situational-awareness.ai/). In this post I want to share how I used Claude Code over the past 30 days, and what I think this technology means for the future - both the exciting parts and the unsettling ones.

## Abundant ideas, limited time - not anymore

The first thing I noticed was an almost overwhelming sense of agency. Suddenly, everything seemed possible. It was addictive, honestly - you can see it in my Git commit history:

![Git commit activity showing a dramatic spike in December](/blog/claude-code-future/Screenshot_2025-12-20_at_15.37.25.png)

We all know the feeling: you have an idea for a small app or side project, but you never have the time. Or it would require learning a technology you're not familiar with. Chat interfaces help - they put all the information on the internet at your fingertips. But you still have to execute.

### A personal full-stack development team

Enter Claude Code. For years I'd been frustrated with planning events over WhatsApp. You either create a new group for every hangout, or you have one giant supergroup where coordinating anything is a nightmare. I always wanted to build something better - simple, separate events that can be managed from one place, good for both quick "wanna hang out?" invites and more elaborate group trips.

So I built **Circles**: a full-stack web app for organizing events with friends. I didn't write a single line of code myself. Claude Code handled everything - Next.js frontend, Supabase backend, authentication, real-time updates, even deploying to a Hetzner VPS. I just described what I wanted and made decisions when it asked.

![Circles app interface](/blog/claude-code-future/circles.png)

A few things I learned along the way:

- **Refactor regularly.** Keep everything modular - it helps the agent navigate the codebase as it grows.
- **Use CLAUDE.md well.** It's the only context that persists between sessions. Link to docs, describe the architecture, note important decisions.
- **Linear is a power-up.** Breaking features into issues and letting Claude Code work through them systematically is incredibly effective.
- **Mock up designs first.** Solidify UI elements before implementation to avoid endless iteration.
- **Let the agent test itself.** Giving it access to Puppeteer for automated testing catches issues before you even see them.

### A personal frontend designer

Beyond building new things, I used Claude Code to redesign older websites - giving them a fresh, modern look while preserving functionality. CSS architecture, responsive design, subtle animations - like having a frontend designer on call 24/7.

<div class="image-row">
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.34.50.png" alt="Website before redesign" />
    <figcaption>Before</figcaption>
  </figure>
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.34.38.png" alt="Website after redesign" />
    <figcaption>After</figcaption>
  </figure>
</div>

It even redesigned this very website you're reading right now.

![My personal website redesigned by Claude Code](/blog/claude-code-future/personal-site.png)

### Slurmboard - managing Slurm jobs

Running experiments on an HPC cluster means dealing with a lot of Slurm logs. Finding them, reading through them, tracking which jobs succeeded or failed - it gets tedious fast.

So I built [Slurmboard](https://github.com/andropar/slurmboard): a lightweight dashboard that displays all your jobs in one place, with filtering, canceling, and log viewing right in the browser.

![Slurmboard interface showing job management](/blog/claude-code-future/image.png)

I also created a [Python port of cvManova](https://github.com/andropar/cvmanova_python), originally a MATLAB tool for cross-validated multivariate pattern analysis. Claude Code not only ported the code but downloaded test data and validated its output against the original implementation.

### QA reporting for fMRI data

![fMRI quality assurance report interface](/blog/claude-code-future/Screenshot_2025-12-23_at_11.19.43.png)

Quality assurance of fMRI data is crucial for my PhD research. I had Claude Code build a reporting system that automatically generates visual reports for each scan session - motion parameters, signal quality metrics, anatomical overlays, all in one place.

### Custom labeling engine for segmentation masks

When I needed to label segmentation masks for a computer vision project, I didn't want to use an off-the-shelf tool that didn't quite fit. Instead, Claude Code built me a custom interface tailored to my workflow - keyboard shortcuts, batch operations, the works.

<div class="image-row">
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.20.44.png" alt="Segmentation labeling interface - overview" />
  </figure>
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.20.59.png" alt="Segmentation labeling interface - detail view" />
  </figure>
</div>

### Mini routine tracker app

<img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.07.22.png" alt="Routine tracker app interface" class="image-float-right" />

Sometimes you just want a simple app for personal use. I had Claude Code build me a minimal routine tracker - nothing fancy, just something that works exactly how I want. No account creation, no cloud sync, no premium tier. Just a clean interface to help me stick to my morning routine.

### A personal gift assistant

Perhaps the most personal project: turning my travel journal into a proper photo book. I had handwritten entries from a trip, plus hundreds of photos scattered across folders. Claude Code OCR'd the handwritten pages, matched photos to journal entries by date and location, and generated a beautifully formatted LaTeX document ready for printing.

<div class="image-row">
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.22.40.png" alt="Raw photo from the trip" />
    <figcaption>Before</figcaption>
  </figure>
  <figure>
    <img src="/blog/claude-code-future/Screenshot_2025-12-23_at_11.21.41.png" alt="Final photo book spread" />
    <figcaption>After</figcaption>
  </figure>
</div>

## A glimpse into the future

So what's all this worth? Let me try to put some numbers to it:

- **Cost:** $200/month for Claude Max
- **Value gained?** Hard to measure. My time as a PhD student is worth about €26/hour. On vibes alone, I'd estimate I was 2-3x more productive this month than a typical month without Claude Code. Maybe €5,000 in value?
- **Token usage:** According to [ccusage](https://github.com/ryoppippi/ccusage), I used about $2,500 worth of tokens - over 3 billion total, though I'm not sure that's accurate.

<img src="/blog/claude-code-future/productivity-roi.svg" alt="Productivity and ROI comparison charts showing 2.5x productivity gain and 25x return on the $200 subscription" />

But the biggest gain is harder to quantify: **a feeling of agency and capability**. What I can achieve now feels limited only by how well I can orchestrate agents. Like being a conductor - I don't play the instruments, but I shape the music.

The path forward seems clear to me:

- **Models are already good enough** for 90% of the work I do, including research. Automated research is coming - not a question of "if" but "when."
- **The biggest limitation is memory** - maintaining context across sessions and learning from past interactions. This is actively being worked on.
- **Current tools don't capture the full capabilities.** The agents are smart enough for much more than they can currently do. It's the frameworks and harnesses that need to catch up - the "unhobbling" that the [Conductor paper from DeepMind](https://arxiv.org/abs/2412.04248) explores.

## What about us?

I won't pretend this doesn't raise difficult questions.

<img src="/blog/claude-code-future/agent-capabilities.svg" alt="Diagram showing current AI agent capabilities - excels at small tasks, full-stack development, and testing; struggles with large codebases, cross-session memory, and novel architecture decisions" />

**Where agents still struggle:** Large systems and codebases overwhelm them. Without persistent memory, they can't build a mental model of what exists - search alone isn't sufficient. They need small task scopes and good context management to be effective.

**The worry about unlearning:** I've noticed myself reaching for the agent before I've even tried to think through a problem myself. Am I losing core skills? There's something unsettling about becoming dependent on tools that think faster than you do. I try to stay aware of this, to still engage my own brain, but it's a real tension.

**The future of work:** If a PhD student can 2-3x their productivity with a $200 subscription, what does that mean for the job market? For junior developers? For the value of technical skills? I don't have answers, but we're all going to need to figure this out together.

---

This month felt like a glimpse into a future arriving faster than I expected. Exhilarating and unsettling in equal measure. The tools are here. The question is how we adapt - as individuals, as organizations, as a society.

I'm still processing it all. But I'm glad I spent the $200 to find out.
