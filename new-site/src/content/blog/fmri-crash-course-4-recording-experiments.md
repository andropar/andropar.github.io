---
title: "Recording fMRI Data and Designing Experiments"
description: "Scanning parameters, experimental design considerations, and practical tips for fMRI studies. Part 4 of an 8-part fMRI crash course."
date: 2025-03-31
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision", "experimental design"]
---

*This is Part 4 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

In the last post we looked at how fMRI measures brain activity: the BOLD signal, the slow hemodynamic response, and the tradeoffs between spatial and temporal resolution. Now it's time to actually collect some data.

Scanner time is expensive and often hard to get, so you really don't want to waste it. Unfortunately, recording fMRI data involves dozens of parameters that interact in non-obvious ways, and the "right" settings depend on your research question. There is no universally optimal configuration, only tradeoffs you need to understand.

In this post, I'll go through the most important scanning parameters, the main experimental design paradigms, what's specific to running a vision experiment in the scanner, and some practical tips I wish someone had told me before my first study.

## Scanning parameters

Let's start with the hardware and sequence settings. These get decided before you ever see a participant, usually together with the physicist or staff at your imaging center.

### Field strength

I covered the differences between 1.5T, 3T and 7T in [Part 3](/blog/fmri-crash-course-3-basics-mri), so here's just the practical advice. For most vision studies, 3T is the default and probably what you'll use. 7T buys you higher resolution or SNR, but comes with more signal dropout and distortion near air-tissue boundaries (ventral temporal cortex is one of the problem areas, which is awkward if you study object recognition), and the scanners are rarer and harder to book. Unless your question really needs the resolution, for example cortical layers or columns, I'd go with 3T.

### Repetition time (TR) and multiband acceleration

The TR is how often you acquire a complete brain volume. Traditional fMRI used TRs of 2-3 seconds, which works for block designs but samples the hemodynamic response quite coarsely.

Multiband (or simultaneous multi-slice) acceleration changed this. The scanner excites and acquires several slices at once and then separates them during reconstruction. This lets you cut the TR a lot - TRs of 500-800 ms are now common.

Faster TRs give you better temporal sampling for event-related designs, more data points per unit time, and they make it easier to model and remove physiological noise like cardiac and respiratory signals. The cost is lower SNR per volume (each volume has less time for the magnetization to recover) and potential artifacts if the acceleration is pushed too far. For most studies I'd use a multiband factor of around 4-6 and a TR of 800-1200 ms. Longer TRs are still fine for simple block designs, but I don't see much reason to go back to them.

### Voxel size

The temptation is to go for the highest resolution possible. I'd resist it. Smaller voxels give you finer spatial detail, but each voxel contains less tissue and therefore less signal, and you need more slices to cover the same brain volume, which means a longer TR or less coverage. Larger voxels have better SNR and faster coverage, but they blur together neural populations that might respond differently.

For typical vision research at 3T:
- 3 mm isotropic: good SNR, whole-brain coverage, enough for most ROI-based analyses
- 2 mm isotropic: better for MVPA and retinotopic mapping, at some SNR cost
- 1.5 mm or smaller: high-resolution studies, usually needs 7T or limited coverage

My rule of thumb: for univariate analyses or standard ROI comparisons, 2.5-3 mm is fine. For MVPA or fine spatial patterns, push toward 2 mm. For cortical layer studies you need sub-millimeter voxels and almost certainly 7T.

### TE, flip angle, and slice orientation

These matter, but they're closer to "set it and forget it" than the parameters above, and your center's standard protocol will usually have reasonable values.

The echo time (TE) determines your sensitivity to the BOLD contrast. The optimum depends on field strength: roughly 30 ms at 3T and somewhat shorter, around 20-25 ms, at 7T. Too short and you lose BOLD sensitivity, too long and the signal has decayed too much.

The flip angle trades off signal against T1 saturation, and the optimum (the Ernst angle) depends on the TR. With the multiband TRs around 1 second that I recommended above, it's lower than people often expect, roughly 50-65 degrees at 3T. The 60-90 degree range you sometimes see quoted applies to longer TRs of 2 seconds or more.

Slice orientation is a bit more interesting for vision research. Signal dropout near the sinuses and ear canals can affect parts of ventral temporal cortex, and tilting the slice stack relative to the AC-PC line can reduce it in some regions. This is worth discussing with the physicist at your center, especially if your ROIs are in the inferior temporal lobe.

<img src="/blog/fmri-diagrams/slice-orientations.svg" alt="MRI slice orientations: axial, coronal, and tilted" />

## Experimental design for fMRI

With the scanner settings sorted, how do you structure your experiment?

The hemodynamic response peaks around 5-6 seconds after neural activity starts and takes well over 10 seconds to return to baseline. This shapes everything about fMRI experimental design.

### Block designs

The oldest and simplest approach. You present stimuli from the same condition for an extended period (10-30 seconds), switch to another condition, and repeat. The sustained activity lets the hemodynamic response build up, which gives you the most statistical power for detecting differences between conditions. Analysis is simple, since you're essentially comparing average activity between blocks, and it's forgiving about small timing errors.

On the downside, you get no information about responses to individual trials, participants can predict what's coming (which can introduce expectation or attention confounds), and you can't study things that only exist as isolated events, like errors or surprises.

Blocks are great when you care about detection: is region X more active for faces than houses? That's also why functional localizers are almost always block designs. They're less useful when you care about the shape of the response or trial-by-trial variability.

<img src="/blog/fmri-diagrams/block-design-bold.svg" alt="Block design showing alternating stimulus blocks and the predicted BOLD response after HRF convolution" />

### Slow event-related designs

Here you present stimuli as brief, discrete events with long gaps between them (slow event-related designs, with ISIs of 12 seconds or more), so the hemodynamic response can rise and fall for each trial. You can estimate the response to individual trial types or even single trials, randomize trial order, and study transient events.

The price is efficiency. You spend most of the time waiting for the response to come back down, so you get far fewer trials per run and much lower power than with blocks. I'd only use a slow design when I really need clean estimates of the response shape on each trial.

### Rapid event-related designs with jittered ISIs

What if you present events quickly (every few seconds) but vary the time between them? With randomized inter-stimulus intervals, the overlapping hemodynamic responses can be separated statistically, because the jitter makes the regressors for different events less correlated. You get many more trials than in a slow design while still being able to estimate responses to individual events.

A few principles:
- Jitter ISIs from a distribution (e.g., 2-8 seconds, roughly exponentially distributed so that short ISIs are most common)
- Randomize trial order
- Include some longer null periods for baseline estimation
- Use design optimization tools to check that your sequence is efficient (Dale, 1999)

This is the standard design for most modern cognitive fMRI, including the large datasets discussed below. It takes a bit more care to analyze, which we'll get to in [Part 7](/blog/fmri-crash-course-7-analysis-glm).

<img src="/blog/fmri-diagrams/jittered-design.svg" alt="Jittered event-related design showing rapidly presented events with variable ISIs and overlapping HRF responses" />

### Mixed designs

Sometimes you want to study both sustained and transient effects. Mixed designs combine blocks with jittered events inside the blocks. For example, you could have blocks of face trials and blocks of house trials, with individual images presented as jittered events within each block. This lets you separately estimate the sustained "state" effect of the block and the transient responses to individual events (Petersen & Dubis, 2012).

### Comparing design types

| Aspect | Block Design | Slow Event-Related | Rapid Event-Related | Mixed |
|--------|-------------|---------------|---------------------|-------|
| **Power for detection** | Excellent | Poor | Moderate | Good |
| **HRF estimation** | Poor | Excellent | Good | Good |
| **Single-trial analysis** | No | Yes | Yes | Yes |
| **Efficiency** | High | Low | Moderate-High | Moderate |
| **Design complexity** | Simple | Simple | Moderate | Complex |
| **Analysis complexity** | Simple | Moderate | Complex | Complex |
| **Best for** | Localizers, strong effects | Shape of response, trial variability | Most cognitive studies | State + event effects |

<img src="/blog/fmri-diagrams/design-types.svg" alt="fMRI experimental design types: block, event-related, and rapid event-related" />

## Naturalistic paradigms

For decades, fMRI experiments used tightly controlled stimuli: isolated images on gray backgrounds, carefully counterbalanced and stripped of context. That keeps the statistics clean, but it's also pretty artificial. Naturalistic paradigms like movies, stories or virtual reality have become more popular, with the idea that if we want to understand how the brain processes real-world experience, we should study something closer to it.

Movies are the most common naturalistic stimulus in vision research. You show the same movie to multiple participants and look for brain regions that respond consistently across people, using inter-subject correlation (Hasson et al., 2004; Nastase et al., 2019). Movies drive large parts of the visual hierarchy at once, participants usually find them easier to sit through than a long task, and you can study temporal dynamics and narrative processing.

The problems are the flip side of the same coin. You can't counterbalance or randomize a movie, and confounds are everywhere: a scary scene has faces, motion, emotion and narrative tension all at once. You also need different analysis tools than the standard GLM approach. My take is that naturalistic and controlled experiments complement each other, and most questions benefit from having both.

## Design lessons from large datasets

The two large datasets I keep mentioning, NSD and THINGS-data, follow a different design philosophy from the classic small experiment, and it's worth looking at what they did.

The Natural Scenes Dataset (Allen et al., 2022) scanned 8 participants for 30-40 sessions each at 7T, with 1.8 mm isotropic voxels and a TR of 1.6 s. Images of natural scenes were shown for 3 seconds with a 1 second gap. Each image was planned to be shown up to 3 times over the course of the experiment, and participants saw around 9,000-10,000 unique images each, depending on how many sessions they completed. The task was a continuous recognition task: on every trial, participants judged whether they had seen the image before at any point in the experiment. That keeps people attentive and also gives you memory data for free.

THINGS-fMRI (part of THINGS-data; Hebart et al., 2023) scanned 3 participants over many sessions at 3T. They saw 8,740 unique images from 720 object concepts of the THINGS database (12 images per concept), each shown once, plus 100 test images that were repeated many times to estimate reliability. It used a rapid event-related design with images shown for 500 ms. To keep participants engaged, they had to respond to occasional catch images, which were artificially generated images mixed in among the real photographs.

### What this means for your own designs

Both datasets start from "how do I collect data that's useful for many questions?" rather than "how do I answer my one question with as little scanning as possible?" You probably won't scan 40 sessions per person, but some of the ideas transfer to smaller studies:
- Repeating stimuli lets you estimate reliability (and a noise ceiling) and helps single-trial modeling
- Sampling stimuli broadly and systematically lets you study representational geometry, not just category selectivity
- For computational approaches, lots of data from a few participants can be more useful than a little data from many

## Running a vision experiment in the scanner

A vision study adds a few practical concerns on top of the general design questions above.

### Displaying stimuli in the scanner

You can't put a normal monitor next to the magnet. The most common setup is a projector outside the scanner room that projects onto a screen at the end of the bore (or behind the participant's head), which the participant sees through a mirror mounted on the head coil. Some centers have MR-compatible LCD displays instead, placed behind the scanner and also viewed through a mirror.

Whatever the setup, you need to know the screen size and the viewing distance (from the eyes via the mirror to the screen), because stimulus size in vision research is reported in degrees of visual angle, not pixels or centimeters. For an object of size s at distance d, the visual angle is 2 · arctan(s / 2d):

```python
import numpy as np

def visual_angle_deg(size_cm, distance_cm):
    """Visual angle (degrees) of an object of a given size at a given distance."""
    return np.degrees(2 * np.arctan(size_cm / (2 * distance_cm)))

# Approximate degrees per pixel for your setup (fine near the screen center)
screen_width_cm, screen_width_px, distance_cm = 40.0, 1920, 100.0
deg_per_px = visual_angle_deg(screen_width_cm, distance_cm) / screen_width_px
```

PsychoPy can do this conversion for you if you define a monitor with the right width and distance and use `units='deg'`. Check the numbers with your imaging center, because they're often surprising: in many setups the whole screen only covers something like 15-20 degrees of visual angle. That limits how large your stimuli can be and how far into the periphery you can map, which matters a lot for retinotopy.

You'll almost always want a fixation point that stays visible throughout the run, either a small cross or a dot. A small dot is often preferred for retinotopic mapping because it covers less of the central visual field.

### Eye tracking and fixation

In a vision experiment, where people look determines what lands on the retina. If participants move their eyes, the retinal input changes, retinotopic responses shift, and you can end up with effects that come from eye movements rather than from the stimulus. This can also confound category comparisons: people look at faces differently than at scenes, so differences in eye movement patterns between categories can show up as differences in brain responses.

MR-compatible eye trackers exist (the EyeLink 1000 Plus with a long-range mount is a common one), and many centers have one installed. If you have access, calibrate it at the start of each session and record throughout, even if you don't plan to analyze the eye data right away. At the very least, it lets you check fixation quality and exclude bad runs. Getting a good calibration through a mirror inside a head coil can be fiddly, so budget some setup time.

If you don't have an eye tracker, you can still reduce the problem: give participants a task that requires fixation (for example, detecting a color change of the fixation dot), keep stimulus durations short so there's little time for exploratory eye movements, and present stimuli at fixation.

### Localizer and retinotopy runs

In a vision study you almost always add a functional localizer: a short block-design run with blocks of faces, scenes, bodies, objects and scrambled objects. Contrasts between these conditions define category-selective regions in each participant, like the fusiform face area (FFA; Kanwisher et al., 1997), the parahippocampal place area (PPA; Epstein & Kanwisher, 1998), the extrastriate body area (EBA; Downing et al., 2001) and the lateral occipital complex (LOC; Malach et al., 1995). These regions vary in location from person to person, so defining them individually is much more precise than using a group atlas.

Often you'll also add a retinotopic mapping run to define early visual areas (V1, V2, V3, hV4). The classic approach uses a rotating wedge and an expanding ring, and the more recent population receptive field (pRF) approach typically uses bars sweeping across the visual field (Dumoulin & Wandell, 2008). As mentioned above, a small screen limits how much of the visual field you can map.

Budget roughly 10-20 minutes of scanner time for localizers and retinotopy. They can also go into a separate session, which is a good option if you scan the same participants several times. I'll cover how to analyze them with the GLM in [Part 7](/blog/fmri-crash-course-7-analysis-glm).

## Practical tips

### Stimulus presentation with PsychoPy

PsychoPy is the most common tool for fMRI stimulus presentation. It's free, Python-based, and has good timing precision if used carefully. Here's a conceptual example of a simple trial structure:

```python
from psychopy import visual, core, event

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

This uses `core.wait()` for simplicity, but that timing is only approximate: the actual duration depends on when the next screen refresh happens, and small errors can add up over a run. For precise durations, count frames instead (draw and call `win.flip()` a fixed number of times, e.g. 30 flips for 500 ms at 60 Hz), or use non-slip timing, where you schedule each event relative to the run start rather than relative to the previous event.

A few more points:
- Synchronize with the scanner trigger. The scanner sends a pulse (usually a TTL signal or a keyboard character) at the start of each volume, and your experiment must wait for the first one before starting.
- Log the timing of what actually happened, not what you intended. Use the time of the `win.flip()` that showed the stimulus.
- Know your display. Projectors and monitors have refresh rates (60 Hz is the minimum, 120 Hz is nicer) and some input lag.
- Test your timing. A photodiode on the screen tells you when stimuli really appeared.

### Scanner synchronization

The scanner sends a trigger pulse at every TR, and there are two ways to use them:

1. Start on the first trigger, then run on your own clock. Simple, but the two clocks can drift apart over long runs.
2. Lock to every trigger, advancing the experiment based on incoming pulses. More work, but guarantees synchronization.

For most studies, option 1 is fine if runs are under 10 minutes or so. For longer runs, or when precise timing matters, I'd go with option 2 or at least log every trigger so you can check for drift afterwards.

### Motion and participant comfort

Head motion is one of the biggest threats to data quality. A few things help:

- Foam padding around the head, snug but not uncomfortable
- A practice session in the scanner, or in a mock scanner if your center has one
- Short runs, around 8-12 minutes at most, with breaks in between so participants can move a bit and refocus
- Water between runs rather than during them, to reduce swallowing
- Some centers show participants their own motion in real time, which can help but isn't standard

It also helps to tell participants explicitly: "It's okay to blink. Try not to move your head. If you need to swallow, try to do it quickly between trials."

### Custom head cases

For studies where motion has to be really minimal (dense sampling with many sessions per person, high-resolution imaging, or participants who struggle to stay still) you can use custom-fitted head cases. You make a 3D scan of the participant's head and 3D print a foam case that fits both the head and the inside of the head coil, so the head has very little room to move without any uncomfortable pressure points.

The [Gallant Lab's headcase-pipeline](https://github.com/gallantlab/headcase-pipeline) is an open-source workflow for this:
1. Capture a 3D scan of the participant's head (with a Structure Sensor or similar)
2. Run the pipeline to generate printable STL files
3. 3D print the case (typically in 2 or 4 pieces that assemble around the coil)

It's extra effort up front, but if you're going to scan the same people many times, cleaner data and fewer excluded runs can make it worth it.

---

## Summary

- 3T with multiband acceleration (TR around 0.8-1.2 s, flip angle adjusted to the short TR) and 2-3 mm voxels is a sensible default for most vision studies.
- Block designs are best for detection and localizers, rapid event-related designs with jittered ISIs for most other questions.
- Large datasets like NSD and THINGS-data show the value of repeated stimuli and broad stimulus sampling, even if your own study is much smaller.
- Vision studies need extra care: report stimulus size in degrees of visual angle, control fixation (ideally with an eye tracker), and plan scanner time for localizer and retinotopy runs.
- Scanner synchronization, accurate timing logs and motion prevention are boring but make or break your data.

---

With data collected, the next step is preprocessing: getting the raw data ready for analysis. That's where we'll head next.

## References

### Experimental Design

- Dale, A.M. (1999). [Optimal experimental design for event-related fMRI](https://pubmed.ncbi.nlm.nih.gov/10524601/). Human Brain Mapping, 8(2-3), 109-114.
- Petersen, S.E. & Dubis, J.W. (2012). [The mixed block/event-related design](https://pmc.ncbi.nlm.nih.gov/articles/PMC3288695/). NeuroImage, 62(2), 1177-1184.

### Multiband/SMS Acquisition

- Moeller, S., et al. (2010). [Multiband multislice GE-EPI at 7 tesla, with 16-fold acceleration using partial parallel imaging with application to high spatial and temporal whole-brain fMRI](https://pubmed.ncbi.nlm.nih.gov/20027588/). Magnetic Resonance in Medicine, 63(5), 1144-1153.
- Feinberg, D.A., et al. (2010). [Multiplexed echo planar imaging for sub-second whole brain fMRI and fast diffusion imaging](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0015710). PLoS ONE, 5(12), e15710.
- Feinberg, D.A. & Setsompop, K. (2013). [Ultra-fast MRI of the human brain with simultaneous multi-slice imaging](https://pubmed.ncbi.nlm.nih.gov/23702822/). Journal of Magnetic Resonance, 229, 90-100.

### Large-Scale Datasets

- Allen, E.J., St-Yves, G., Wu, Y. et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. Nature Neuroscience, 25, 116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)
- Hebart, M.N., Contier, O., Teichmann, L. et al. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. eLife, 12, e82580. [DOI: 10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580)

### Localizers and Retinotopic Mapping

- Kanwisher, N., McDermott, J. & Chun, M.M. (1997). The fusiform face area: a module in human extrastriate cortex specialized for face perception. Journal of Neuroscience, 17(11), 4302-4311.
- Epstein, R. & Kanwisher, N. (1998). A cortical representation of the local visual environment. Nature, 392, 598-601.
- Downing, P.E., Jiang, Y., Shuman, M. & Kanwisher, N. (2001). A cortical area selective for visual processing of the human body. Science, 293(5539), 2470-2473.
- Malach, R., et al. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. Proceedings of the National Academy of Sciences, 92(18), 8135-8139.
- Dumoulin, S.O. & Wandell, B.A. (2008). Population receptive field estimates in human visual cortex. NeuroImage, 39(2), 647-660.

### Motion Reduction

- [Gallant Lab headcase-pipeline](https://github.com/gallantlab/headcase-pipeline) - An open-source pipeline to generate subject-specific 3D-printed headcases for fMRI scanning.

### Data Organization

- Gorgolewski, K.J., et al. (2016). [The brain imaging data structure, a format for organizing and describing outputs of neuroimaging experiments](https://www.nature.com/articles/sdata201644). Scientific Data, 3, 160044.
- [BIDS Specification](https://bids-specification.readthedocs.io/) - Official documentation for the Brain Imaging Data Structure.
- [BIDS Website](https://bids.neuroimaging.io/) - Main website with tutorials and resources.

### Naturalistic Paradigms and Inter-Subject Correlation

- Hasson, U., et al. (2004). [Intersubject synchronization of cortical activity during natural vision](https://www.science.org/doi/10.1126/science.1089506). Science, 303(5664), 1634-1640.
- Nastase, S.A., et al. (2019). [Measuring shared responses across subjects using intersubject correlation](https://academic.oup.com/scan/article/14/6/667/5489905). Social Cognitive and Affective Neuroscience, 14(6), 667-685.
- [Naturalistic Data Analysis](https://naturalistic-data.org/) - Tutorial resources for analyzing naturalistic fMRI data, including ISC methods.

**Next:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)

**Previous:** [Part 3: Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)
