---
title: "Recording fMRI Data and Designing Experiments"
description: "Scanning parameters, experimental design considerations, and practical tips for fMRI studies. Part 4 of an 8-part fMRI crash course."
date: 2025-03-31
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision", "experimental design"]
---

*This is Part 4 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

Now that we understand how fMRI measures brain activity - the BOLD signal, the sluggish hemodynamic response, the tradeoffs in spatial and temporal resolution - it's time to actually collect some data.

You've got scanner time booked. Maybe it cost you thousands of dollars. Maybe you waited months. Either way, you don't want to screw this up.

The thing is, collecting fMRI data involves dozens of parameters that interact in non-obvious ways. And the "right" settings depend entirely on your research question. There's no universal optimal configuration - just tradeoffs you need to understand.

In this post, I'll walk through the key scanning parameters, the major experimental design paradigms, and some practical tips I wish someone had told me before my first study.

## Scanning Parameters

Let's start with the hardware and sequence settings. These decisions get made before you even see a participant.

### Field Strength: The Magnet Wars

MRI scanners come in different field strengths, measured in Tesla (T). The three you'll encounter most are 1.5T, 3T, and 7T.

**1.5T** is the workhorse of clinical imaging. For research, it's mostly obsolete - the signal is just too weak for modern fMRI standards. You might use it if that's genuinely all you have access to, but you'll be fighting an uphill battle.

**3T** is the current standard for fMRI research. It offers a good balance of signal strength, image quality, and practical considerations. Most published vision studies use 3T scanners. If you're starting out, this is probably what you'll use.

**7T** is where things get interesting - and complicated. The higher field strength means stronger signal, which translates to either better spatial resolution or faster scanning. You can resolve cortical layers. You can see fine-grained patterns that disappear at 3T. But there are real downsides: increased susceptibility artifacts (especially in ventral temporal cortex, which is awkward if you study object recognition), more severe signal dropout near air-tissue boundaries, and the scanners are less common and more expensive to run.

My honest take: unless you specifically need high resolution for your scientific question, 3T is probably the right choice. The 7T papers look impressive, but they come with headaches that aren't always worth it.

### Repetition Time (TR) and Multiband Acceleration

The TR is how often you acquire a complete brain volume. Traditional fMRI used TRs of 2-3 seconds. This was fine for block designs, but it meant you were severely undersampling the hemodynamic response.

Then came **multiband (simultaneous multi-slice) acceleration**. The basic idea: excite and acquire multiple slices at once, then use clever math to separate them. This lets you cut TR dramatically - from 2 seconds down to 500-800ms is now common.

Why does this matter? Faster TRs give you:
- Better temporal resolution for event-related designs
- More data points per unit time (more statistical power)
- Better separation of overlapping responses
- Improved physiological noise removal

The tradeoff is slightly lower SNR per volume and increased reconstruction complexity. But for most modern studies, multiband with TR around 1 second is the sweet spot.

A typical setup I'd recommend: multiband factor of 4-6, TR of 800-1200ms. This gives you good temporal sampling without sacrificing too much signal quality.

### Voxel Size: Resolution vs. SNR vs. Coverage

This one trips people up. The temptation is to go for the highest resolution possible. Don't.

Voxel size involves a three-way tradeoff:

**Smaller voxels** give you finer spatial detail - you can distinguish activity in adjacent regions. But smaller voxels mean less signal per voxel (SNR drops), and you need more slices to cover the same brain volume (longer TR or less coverage).

**Larger voxels** mean better SNR and faster coverage, but you blur together neural populations that might have different response properties.

For typical vision research at 3T:
- **3mm isotropic**: Good SNR, whole-brain coverage, sufficient for most ROI-based analyses
- **2mm isotropic**: Better resolution for MVPA and retinotopic mapping, some SNR cost
- **1.5mm or smaller**: High-resolution studies, usually requires 7T or accepting limited coverage

Here's my rule of thumb: if you're doing univariate analyses or standard ROI comparisons, 2.5-3mm is fine. If you're doing MVPA or need to resolve fine spatial patterns, push toward 2mm. If you're doing cortical layer studies, you need sub-millimeter - and probably 7T.

### TE, Flip Angle, and Slice Orientation

These parameters matter, but they're more "set it and forget it" compared to the ones above.

**Echo Time (TE)** determines your BOLD contrast sensitivity. The optimal TE depends on field strength - roughly 30ms at 3T, 25ms at 7T. Too short and you lose BOLD sensitivity; too long and signal decay kills you. Most standard protocols have this dialed in.

**Flip angle** affects the tradeoff between SNR and T1-weighting. For typical fMRI with TR around 1-2 seconds, flip angles of 60-90 degrees work well. Again, standard protocols usually handle this.

**Slice orientation** is more interesting for vision research. You want your slices oriented to minimize signal dropout in your regions of interest. For ventral visual cortex, tilting slices 30 degrees from the AC-PC line (toward coronal) can help reduce susceptibility artifacts. Some groups use carefully optimized slice prescriptions for their specific ROIs.

<img src="/blog/fmri-diagrams/slice-orientations.svg" alt="MRI slice orientations: axial, coronal, and tilted" />

## Experimental Design for fMRI

Now for the fun part. You've got your scanner settings sorted. How do you structure your experiment?

The hemodynamic response is sluggish - it takes 5-6 seconds to peak after neural activity starts, and another 10+ seconds to return to baseline. This fundamentally shapes everything about fMRI experimental design.

### Block Designs

The oldest and simplest approach. You present the same condition for an extended period (10-30 seconds), then switch to another condition, and repeat.

**Why blocks work well:**
- Maximum statistical power for detecting differences between conditions
- The sustained activity lets the hemodynamic response "build up"
- Simple to analyze - you're essentially comparing average activity between blocks
- Robust to timing uncertainties

**The downsides:**
- No information about single-trial responses
- Participants can predict what's coming (potential confounds from expectation)
- Can't study things that require isolated events (like error trials, surprise, etc.)

Blocks are your friend when you care about detection: "Is region X more active for faces than houses?" They're less useful when you care about the shape of responses or trial-by-trial variability.

### Event-Related Designs

Present stimuli as discrete, brief events with substantial gaps between them (typically 10-20 seconds). This lets the hemodynamic response rise and fall for each trial independently.

**Why event-related designs work:**
- You can estimate the response to individual trial types
- You can analyze single trials
- Randomized trial order eliminates expectation effects
- Flexibility to study transient phenomena

**The downsides:**
- Much lower statistical power than blocks (less time "on condition")
- Slower data collection - you spend most of your time waiting for the HRF to recover
- You need many more trials to get reliable estimates

I'd use event-related designs when I need to understand the shape of the response, analyze trial-by-trial variability, or my paradigm fundamentally requires isolated events.

### Rapid Event-Related Designs with Jittered ISIs

Here's where things get clever. What if you present events rapidly (every 2-4 seconds) but vary the timing between events randomly?

The magic is in the jitter. With randomized inter-stimulus intervals (ISIs), overlapping hemodynamic responses can be mathematically separated through deconvolution. You get the efficiency of rapid presentation with the estimation power of event-related designs.

**Key principles:**
- Jitter ISIs from a distribution (e.g., 2-8 seconds, exponentially distributed)
- Randomize trial order
- Include some longer "null" periods for baseline estimation
- Use design optimization tools to find efficient sequences

This is the workhorse design for modern cognitive fMRI. It's more complex to analyze but gives you the best of both worlds.

### Mixed Designs

Sometimes you want to study both sustained and transient effects. Mixed designs combine blocks of trials with jittered events within blocks.

For example: blocks of face trials vs. house trials, but within each block, individual images are presented as jittered events. This lets you separately estimate the sustained "state" effect and the transient event-related responses.

### Comparing Design Types

| Aspect | Block Design | Event-Related | Rapid Event-Related | Mixed |
|--------|-------------|---------------|---------------------|-------|
| **Power for detection** | Excellent | Poor | Moderate | Good |
| **HRF estimation** | Poor | Excellent | Good | Good |
| **Single-trial analysis** | No | Yes | Yes | Yes |
| **Efficiency** | High | Low | Moderate-High | Moderate |
| **Design complexity** | Simple | Simple | Moderate | Complex |
| **Analysis complexity** | Simple | Moderate | Complex | Complex |
| **Best for** | Localizers, strong effects | Shape of response, trial variability | Most cognitive studies | State + event effects |

<img src="/blog/fmri-diagrams/design-types.svg" alt="fMRI experimental design types: block, event-related, and rapid event-related" />

## The Rise of Naturalistic Paradigms

For decades, fMRI experiments used tightly controlled stimuli: isolated images on gray backgrounds, carefully counterbalanced, stripped of context. It made the statistics clean. It also made the experiments artificial.

The field is shifting. Naturalistic paradigms - movies, stories, podcasts, virtual reality - are becoming increasingly popular. The logic: if we want to understand how the brain processes real-world experience, maybe we should study real-world experience.

Movies are the dominant naturalistic stimulus for vision research. You present the same movie to multiple participants, then look for brain regions that respond reliably across people (inter-subject correlation analysis). This reveals the "shared" neural response to naturalistic input.

The advantages are compelling:
- Ecological validity - this is closer to how we actually see
- Rich, dynamic stimuli that engage the full visual hierarchy
- No task demands (just watch), which can be easier for participants
- Potential to study temporal dynamics and narrative processing

The challenges are real too:
- You can't counterbalance or randomize a movie
- Confounds are everywhere - a scary scene has faces, motion, emotion, and narrative tension all at once
- Analysis requires different tools than traditional GLM approaches

I think naturalistic paradigms are the future, but they complement rather than replace controlled experiments. You need both.

## Design lessons from modern datasets

The large-scale datasets I mentioned earlier - NSD and THINGS - represent a fundamental shift in experimental design philosophy. Let me highlight what they teach us.

**NSD's approach**: Instead of scanning many participants briefly, they scanned 8 participants extensively (30-40 sessions each). Key design choices:
- 10,000 unique images per participant
- Each image repeated 3 times across sessions (enabling reliability estimation)
- 1.8mm voxels at 7T for high resolution
- Rapid event-related design with a simple attention task

**THINGS' approach**: Rather than naturalistic complexity, they systematically sampled 1,854 object concepts to span the semantic space. The rapid event-related design with catch trials (detect repeated images) kept participants engaged while maximizing efficiency.

### What this means for your own designs

These datasets embody a new philosophy: instead of "how do I answer my specific question with minimal scanning," ask "how do I collect data that's useful for many questions?"

Practical takeaways:
- **More repetitions** enable reliability estimation and single-trial modeling
- **Systematic stimulus sampling** lets you study representational geometry, not just category selectivity
- **Dense individual sampling** may be more valuable than large N for computational approaches

## Practical Tips

### Stimulus Presentation with PsychoPy

PsychoPy is the de facto standard for fMRI stimulus presentation. It's free, Python-based, and has good timing precision. Here's a conceptual example of a simple trial structure:

```python
from psychopy import visual, core, event, parallel

# Setup
win = visual.Window(fullscr=True, color='gray')
stim = visual.ImageStim(win)
fixation = visual.TextStim(win, text='+', height=0.1)

# Wait for scanner trigger (usually '5' or 't')
event.waitKeys(keyList=['5', 't'])
exp_clock = core.Clock()

# Trial loop
for trial in trials:
    # Fixation period (jittered ISI)
    fixation.draw()
    win.flip()
    core.wait(trial['isi'])

    # Stimulus presentation
    stim.image = trial['image_path']
    stim.draw()
    win.flip()
    onset_time = exp_clock.getTime()

    # Log timing for analysis
    log_trial(trial['condition'], onset_time)

    core.wait(trial['duration'])

    # Return to fixation
    fixation.draw()
    win.flip()
```

A few critical points:
- **Synchronize with the scanner trigger**. The scanner sends a pulse (usually TTL or keyboard character) at the start of each run. Your experiment must wait for this before starting.
- **Log precise timing**. Don't rely on intended timing - log when stimuli actually appeared.
- **Use a fast display**. 60Hz is minimum; 120Hz is better. Display lag varies by monitor.
- **Test timing thoroughly**. Use a photodiode on the screen to verify actual display timing.

### Scanner Synchronization

The scanner-experiment synchronization deserves special attention. The scanner sends trigger pulses at each TR. You have two options:

1. **Start on first trigger, free-run thereafter**: Wait for the first pulse to start your experiment, then run on your own clock. Simple, but timing can drift over long runs.

2. **Lock to every trigger**: Advance your experiment based on incoming triggers. More complex, but guarantees synchronization. Essential for very long runs.

For most studies, option 1 is fine if your runs are under 10 minutes. For longer runs or when precise timing is critical, use option 2.

### Motion and Participant Comfort

Motion is the enemy of fMRI data quality. A few practical tips:

- **Padding**: Use foam padding around the head. Snug but not uncomfortable.
- **Practice**: Let participants experience the scanner (or a mock scanner) before the real thing.
- **Short runs**: 8-12 minutes maximum per run. Breaks let participants move, swallow, and refocus.
- **Minimize swallowing**: Provide water between runs, not during.
- **Feedback**: Some studies show participants their motion in real-time. Controversial but can help.

Tell participants explicitly: "It's okay to blink. Try not to move your head. If you need to swallow, do it quickly between trials when possible."

---

## Key Takeaways

1. **Field strength**: 3T is the standard for most vision research. 7T offers higher resolution but comes with significant challenges.

2. **Use multiband acceleration**: Modern sequences with TR of 0.8-1.2 seconds are standard. There's little reason to use 2+ second TRs anymore.

3. **Match voxel size to your question**: 2-3mm for most studies. Go smaller only if you specifically need high resolution for your scientific question.

4. **Design type matters**: Block designs for detection/localizers, rapid event-related for most other studies. Jittered ISIs are your friend.

5. **Naturalistic paradigms are rising**: Movies and stories offer ecological validity but require different analytical approaches.

6. **Modern datasets use intensive sampling**: NSD and THINGS show the power of scanning fewer participants more extensively with more stimuli.

7. **Get the practical details right**: Scanner synchronization, precise timing logs, and motion minimization are unsexy but essential.

---

With data collected, the next step is preprocessing - preparing the raw data for analysis. That's where we'll head next.

**Next:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)

**Previous:** [Part 3: Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)
