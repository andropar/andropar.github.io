---
title: "Recording fMRI Data and Designing Experiments"
description: "Scanning parameters, experimental design considerations, and practical tips for fMRI studies. Part 4 of an 8-part fMRI crash course."
date: 2025-03-31
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision", "experimental design"]
---

*This is Part 4 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

In the last post we looked at how fMRI measures brain activity: the BOLD signal, the slow hemodynamic response, and the trade-offs between spatial and temporal resolution. Now it's time to actually collect some data.

Scanner time is expensive and often hard to get, so you really don't want to waste it. Unfortunately, recording fMRI data involves dozens of parameters that interact in non-obvious ways, and the "right" settings depend on your research question. There is no universally optimal configuration, only trade-offs you need to understand.

In this post, I'll go through the most important scanning parameters, the main experimental design paradigms, what's specific to running a vision experiment in the scanner, and some practical tips I wish someone had told me before my first study. Where I give numbers, I've tried to tie them to a paper or to what a well-documented dataset actually did.

## Scanning parameters

Let's start with the hardware and sequence settings. These get decided before you ever see a participant, usually together with the physicist or staff at your imaging center.

### Field strength

I covered the differences between 1.5T, 3T and 7T in [Part 3](/blog/fmri-crash-course-3-basics-mri), so here's just the practical side. 7T buys you SNR that you can spend on higher spatial resolution (Dumoulin et al., 2018). The catch is that the magnetic field distortions near air cavities get worse with field strength, and at 7T the RF field is also weak over the temporal lobes (Uğurbil, 2018). Inferior temporal cortex is already one of the regions that loses signal at 3T (Weiskopf et al., 2006), which is awkward if you study object recognition.

The SNR advantage also depends on voxel size. Triantafyllou et al. (2005) found that at 3 × 3 × 3 mm, going from 3T to 7T gave only modest gains in time-series SNR, because physiological noise dominates at that resolution. The benefit of 7T showed up once voxels were small enough for thermal noise to matter again. So 7T mainly pays off when your question needs small voxels, such as cortical layers or columns (Dumoulin et al., 2018). For standard-resolution work, 3T is enough: THINGS-fMRI, for example, was recorded at 3T with 2 mm voxels (Hebart et al., 2023).

### Repetition time (TR) and multiband acceleration

The TR is how often you acquire a complete brain volume. Conventional whole-brain EPI needed 2-3 seconds per volume (Feinberg et al., 2010), which samples the hemodynamic response quite coarsely.

Multiband (or simultaneous multi-slice) acceleration changed this. The scanner excites and acquires several slices at once and then separates them during reconstruction (Moeller et al., 2010; Feinberg & Setsompop, 2013). The Human Connectome Project, for example, settled on 2 mm voxels with a TR of 0.72 s using a multiband factor of 8 (Smith et al., 2013).

Faster sampling gives you more data points per unit time and denser sampling of physiological noise like cardiac and respiratory signals, which makes it easier to model and remove (Smith et al., 2013). The costs are noise amplification from separating the simultaneously acquired slices and signal leaking between them (Smith et al., 2013). These costs grow with the multiband factor. At 1.5 mm and 3T, Todd et al. (2016) found that multiband factors of 2, 4 and 6 all increased temporal SNR and t-scores, but false positives from slice leakage rose from 1 to 35 to 70 instances across ten participants (fewer with an improved reconstruction). They concluded that MB 2 is safe, while MB 3-4 can give more sensitivity but needs careful optimization. Risk et al. (2021) found that noise amplification was worst in deep brain regions and recommended MB 4 as a reasonable balance for resting-state studies.

Faster isn't automatically better for task fMRI either. At 3 mm, Demetriou et al. (2018) compared multiband factors of 1-6 and found only modest and inconsistent benefits for standard GLM statistics. The exception was MVPA, where the multiband protocols did better. They recommend using multiband conservatively. The large vision datasets fit this picture: both NSD (7T, 1.8 mm) and THINGS-fMRI (3T, 2 mm) used a multiband factor of 3 with TRs of 1.6 s and 1.5 s (Allen et al., 2022; Hebart et al., 2023). A moderate factor of around 2-4 with a TR somewhere between 1 and 1.6 s is a reasonable place to start the discussion with your physicist.

### Voxel size

The temptation is to go for the highest resolution possible. Smaller voxels give you finer spatial detail, but they make SNR much worse and, all else being equal, also cost you temporal resolution, because you need more slices to cover the brain (Smith et al., 2013). Larger voxels have better SNR and faster coverage, but they blur together neural populations that might respond differently. Because physiological noise dominates at around 3 mm, the time-series SNR you gain from going bigger levels off (Triantafyllou et al., 2005).

A common intuition is that MVPA needs smaller voxels than univariate analyses. The studies I could find don't support that as a general rule:

- Orientation decoding from V1, the classic "fine-scale" decoding result, was shown at 3T with 3 × 3 × 3 mm voxels (Kamitani & Tong, 2005).
- Smoothing the data, which removes fine spatial detail, did not reduce multivariate decoding performance in one study (Op de Beeck, 2010), although V1 orientation decoding did get worse with stronger smoothing in another (Alink et al., 2013).
- A meta-analysis of ventral-stream decoding studies found that larger acquired voxels were associated with better decoding in V2 and later areas, and made no difference in V1, within the range of voxel sizes those studies used (Coutanche et al., 2016).
- At 7T, orientation decoding from V1 peaked at 2 mm among acquisitions at 0.8, 1.4, 2 and 3 mm. Acquiring at high resolution and downsampling afterwards gave no benefit over acquiring at the lower resolution directly (Sengupta et al., 2017).

So for typical vision work at 3T, voxels of 2-3 mm are well supported for both univariate and multivariate analyses. That's the range used by the HCP (2 mm; Smith et al., 2013), THINGS-fMRI (2 mm; Hebart et al., 2023) and the multiband comparison above (3 mm; Demetriou et al., 2018). Going much below 2 mm mainly makes sense at 7T, where the SNR is there to support it (Triantafyllou et al., 2005), and sub-millimeter voxels are what you need for layer or column studies (Dumoulin et al., 2018).

### TE, flip angle, and slice orientation

These matter, but they're closer to "set it and forget it" than the parameters above, and your center's standard protocol will usually have reasonable values.

The echo time (TE) determines your sensitivity to the BOLD contrast. A longer TE increases BOLD contrast but lowers the overall signal and increases dropout near field inhomogeneities, and the optimum is roughly the T2* of the tissue (Smith et al., 2013). T2* gets shorter at higher field, so the TE does too. At 3T, the HCP and THINGS-fMRI both used 33 ms (Smith et al., 2013; Hebart et al., 2023), while NSD used 22 ms at 7T (Allen et al., 2022).

The flip angle trades off signal against T1 saturation, and the angle that maximizes gray-matter signal (the Ernst angle) gets smaller as the TR gets shorter. At 3T it is about 77 degrees for a TR of 2 s (Gonzalez-Castillo et al., 2011) and 52 degrees for the HCP's TR of 0.72 s (Smith et al., 2013), so with a TR around 1 s you'll be in between. Getting it exactly right matters less than you'd think: when physiological noise dominates, flip angles well below the Ernst angle cost almost nothing in time-series SNR or activation maps (Gonzalez-Castillo et al., 2011).

Slice orientation is a bit more interesting for vision research. Signal dropout near the sinuses and ear canals can affect parts of the inferior temporal lobe, and tilting the slice stack relative to the AC-PC line (the line through the anterior and posterior commissures, the usual reference for axial slices) can recover some of that signal (Deichmann et al., 2003). Weiskopf et al. (2006) mapped the best slice tilt, phase-encoding direction and z-shim for every brain region at 3T and 1.5T. This is worth discussing with the physicist at your center, especially if your ROIs are in the inferior temporal lobe.

<img src="/blog/fmri-diagrams/slice-orientations.svg" alt="Sagittal brain slice with axial slice positions parallel to the AC-PC line, and the same brain with a tilted slice prescription" />

*Two example prescriptions on a midline slice. The tilted slab here runs roughly parallel to the temporal lobe; tilting the other way (anterior end up) is also common. Which angle is best depends on your target regions and scanner (Weiskopf et al., 2006).*

## Experimental design for fMRI

With the scanner settings sorted, how do you structure your experiment?

The hemodynamic response is slow. SPM's canonical HRF peaks about 5 seconds after neural activity, followed by an undershoot centered around 15 seconds after onset (SPM, `spm_hrf.m`), and the real shape varies across people and regions (Handwerker et al., 2004). This shapes everything about fMRI experimental design.

### Block designs

The oldest and simplest approach. You present stimuli from the same condition for an extended period, switch to another condition, and repeat. The sustained activity lets the hemodynamic response build up, and block designs give the best detection power of all designs (Friston et al., 1999; Liu et al., 2001). Blocks shouldn't be too long, though: Henson (2005) puts the optimal block length for an on-off design at about 16 seconds, and very long blocks push the signal into the low frequencies that get removed by high-pass filtering. Activity patterns are also simple to compute for each block (Mumford et al., 2012).

On the downside, block designs are poor at estimating the shape of the response (Liu et al., 2001), participants can predict what's coming, which opens the door to confounds like anticipation and habituation (Liu et al., 2001), and you can't study things that only exist as isolated events, like errors or surprises.

Blocks are great when you care about detection: is region X more active for faces than houses? That's also why functional localizers are usually block designs, from the original FFA localizer (Kanwisher et al., 1997) to the widely used fLoc localizer with 6-second mini-blocks (Stigliani et al., 2015). They're less useful when you care about the shape of the response or trial-by-trial variability.

<img src="/blog/fmri-diagrams/block-design-bold.svg" alt="Block design showing alternating stimulus blocks and the predicted BOLD response after HRF convolution" />

### Slow event-related designs

Here you present stimuli as brief, discrete events with long gaps between them, so the hemodynamic response can rise and fall for each trial. With a fixed interval, the best spacing for stimuli of 2 seconds or less is about 12-14 seconds from one onset to the next (Bandettini & Cox, 2000). You can estimate the response to individual trial types or even single trials, randomize trial order, and study transient events.

The price is efficiency. You spend most of the time waiting for the response to come back down, so you get far fewer trials per run. Bandettini and Cox (2000) measured about 35% lower functional contrast than a block design even at the optimal interval, and Dale (1999) showed that well-jittered designs can be more than 10 times more efficient than fixed-interval ones. Slow designs are mainly worth it when you need clean estimates of the response on each trial.

### Rapid event-related designs with jittered ISIs

What if you present events quickly (every few seconds) but vary the time between them? With randomized inter-stimulus intervals (ISIs), the overlapping hemodynamic responses can be separated statistically, and efficiency keeps improving as the mean ISI gets shorter (Dale, 1999). You get many more trials than in a slow design while still being able to estimate responses to individual events.

A few principles from the design-efficiency literature:
- Draw ISIs from a distribution in which short intervals are most common. Exponential-like distributions with a long tail score well on both estimation and detection (Hagberg et al., 2001)
- Randomize the order of trials that are close together in time (Henson, 2005)
- Include null events (periods with no stimulus) if you want to estimate responses relative to baseline, not just differences between conditions (Friston et al., 1999)
- Check the efficiency of your sequence before you scan, for example with a search algorithm that optimizes it (Wager & Nichols, 2003)

Rapid event-related designs are often preferred because they fit in more stimuli and keep participants more engaged (Mumford et al., 2012). The large datasets discussed below are variants of this: NSD and THINGS-fMRI used a fixed stimulus rhythm, but NSD interspersed blank trials and THINGS-fMRI randomized the trial order and mixed in catch trials (Allen et al., 2022; Hebart et al., 2023). Separating the overlapping responses takes a bit more care in the analysis, which we'll get to in [Part 7](/blog/fmri-crash-course-7-analysis-glm).

<img src="/blog/fmri-diagrams/jittered-design.svg" alt="Jittered event-related design showing rapidly presented events with variable ISIs and overlapping HRF responses" />

### Mixed designs

Brain activity during a task has two kinds of components. Transient (or item-related) activity is the brief response to each individual stimulus: the bump in the BOLD signal after every image. Sustained (or state-related) activity lasts for as long as the task or condition does, for example because participants keep a particular task set or level of attention up for a whole block. Pure block and event-related designs each ignore some of these components (Petersen & Dubis, 2012).

Mixed designs combine the two. Task blocks alternate with control blocks, and within each task block the individual trials are presented at jittered intervals (Visscher et al., 2003). For example, you could have blocks in which face images appear as jittered events, alternating with fixation blocks. The model then contains a regressor for each block (sustained) and regressors for the individual events (transient). Visscher et al. (2003) showed with simulations and visual cortex data that this separates the two kinds of activity. Petersen and Dubis (2012) warn that a poorly designed mixed experiment doesn't just lose power, it misattributes one signal to the other, and they suggest around 25-30 participants for a reliable sustained signal. You'll rarely need this in a vision study, but it's worth knowing the distinction, because a block design can't tell you which of the two produced an effect.

### Comparing design types

| Aspect | Block Design | Slow Event-Related | Rapid Event-Related | Mixed |
|--------|-------------|---------------|---------------------|-------|
| **Power for detection** | Best | Low | Moderate | Weak for sustained effects |
| **HRF estimation** | Poor | Good | Best | Possible |
| **Single-trial analysis** | No | Yes | Yes, with dedicated models | Yes |
| **Predictability for participants** | High | Low | Low | Within blocks |
| **Design complexity** | Simple | Simple | Moderate | Complex |
| **Analysis complexity** | Simple | Moderate | Complex | Complex |
| **Best for** | Localizers, strong effects | Shape of response, trial variability | Most cognitive studies | State + event effects |

*Summarized from Liu et al. (2001), Bandettini & Cox (2000), Dale (1999), Mumford et al. (2012), and Petersen & Dubis (2012).*

<img src="/blog/fmri-diagrams/design-types.svg" alt="Stimulus timing and predicted BOLD response for block, slow event-related, and rapid event-related designs" />

## Naturalistic paradigms

Cognitive neuroscience has traditionally relied on simple tasks with abstract stimuli presented one at a time, like isolated images on gray backgrounds (Sonkusare et al., 2019). That keeps the statistics clean, but it's also pretty artificial. Naturalistic paradigms such as films, spoken stories, music and games were developed in response, with the idea that if we want to understand how the brain processes real-world experience, we should study something closer to it (Sonkusare et al., 2019; Nastase et al., 2020).

Movies are the most common naturalistic stimulus in vision research. You show the same movie to multiple participants and look for brain regions that respond consistently across people, using inter-subject correlation (Hasson et al., 2004; Nastase et al., 2019). In the original study, responses were synchronized across viewers not only in visual and auditory cortex but also in association cortex (Hasson et al., 2004). Movies can also help with motion: in young children, head motion is lower during movies than during rest or conventional tasks, although this advantage disappears in adolescents (Vanderwal et al., 2019; Greene et al., 2018).

The problems are the flip side of the same coin. Every movie differs from every other in countless ways, which confounds comparisons between them (Vanderwal et al., 2019): a scary scene has faces, motion, emotion and narrative tension all at once. You also need different analysis tools than the standard GLM approach, because often there is no explicit model of what each moment should evoke (Nastase et al., 2019). My own take is that naturalistic and controlled experiments complement each other, and most questions benefit from having both.

## Design lessons from large datasets

The large datasets I keep mentioning, NSD, THINGS-data and LAION-fMRI, follow a different design philosophy from the classic small experiment, and it's worth looking at what they did.

The Natural Scenes Dataset (Allen et al., 2022) scanned 8 participants at 7T with 1.8 mm isotropic voxels and a TR of 1.6 s, in 30-40 sessions each. Images of natural scenes were shown for 3 seconds with a 1 second gap. Each image was planned to be shown 3 times over the course of the experiment, and participants saw 9,209-10,000 unique images each, depending on how many sessions they completed. The task was a continuous recognition task: on every trial, participants judged whether they had seen the image before at any point in the experiment. That keeps people engaged and also gives you memory data for free.

THINGS-fMRI (part of THINGS-data; Hebart et al., 2023) scanned 3 participants in 12 main sessions at 3T. They saw 8,740 unique images of 720 object concepts from the THINGS database, each shown once, plus 100 test images that were shown in every session to estimate reliability. Images were shown for 500 ms followed by 4 s of fixation. To keep participants engaged, they had to respond to occasional catch images, which were unrecognizable objects generated with a neural network and mixed in among the real photographs.

LAION-fMRI (Zerbe et al., 2026) scanned 5 participants at 7T with multi-echo fMRI, 1.8 mm isotropic voxels and a TR of 1.9 s, in 30 main sessions each. Its design combines both ideas above: 25,052 unique images for broad coverage, plus 1,492 shared images repeated up to 12 times for reliability. It also includes images from NSD and THINGS, which makes comparisons with those datasets possible, and out-of-distribution test stimuli like abstract shapes and visual illusions. Retinotopic mapping and functional localizers were collected in the same people, which is exactly the setup described in the next section.

### What this means for your own designs

These datasets start from "how do I collect data that's useful for many questions?" rather than "how do I answer my one question with as little scanning as possible?" You probably won't scan 40 sessions per person, but some of the ideas transfer to smaller studies:
- Repeating stimuli lets you estimate reliability and a noise ceiling, as NSD does with its three repetitions (Allen et al., 2022; see also [Part 6](/blog/fmri-crash-course-6-quality-assessment) and [Part 8](/blog/fmri-crash-course-8-multivariate))
- Sampling stimuli broadly and systematically, as THINGS does across 720 object concepts, lets you study many hypotheses with one dataset instead of a single category contrast (Hebart et al., 2023)
- For building models of how the brain processes complex stimuli, Naselaris et al. (2021) argue that sampling many conditions in a few participants is more productive than sampling few conditions in many participants

## Running a vision experiment in the scanner

A vision study adds a few practical concerns on top of the general design questions above.

### Displaying stimuli in the scanner

You can't put a normal monitor next to the magnet. A common setup is a projector that projects onto a screen at the end of the bore, which the participant sees through a mirror mounted on the head coil; this is how the HCP retinotopy data were collected (Benson et al., 2018). Some centers have MR-compatible LCD displays instead. NSD used one placed at the end of the bore and viewed via a mirror, chosen because it gives a sharper image than typical projector setups (Allen et al., 2022).

Whatever the setup, you need to know the screen size and the viewing distance (from the eyes via the mirror to the screen), because stimulus size in vision research is reported in degrees of visual angle, not pixels or centimeters. For an object of size s at distance d, the visual angle is 2 · arctan(s / 2d):

<img src="/blog/fmri-diagrams/visual-angle.svg" alt="Diagram of an eye looking at a stimulus on a screen at distance d, with the visual angle theta and the formula theta = 2 arctan(s / 2d)" />

*Visual angle depends on both stimulus size and viewing distance, which is why stimuli are reported in degrees rather than centimeters or pixels.*

```python
import numpy as np

def visual_angle_deg(size_cm, distance_cm):
    """Visual angle (degrees) of an object of a given size at a given distance."""
    return np.degrees(2 * np.arctan(size_cm / (2 * distance_cm)))

# Approximate degrees per pixel for your setup (fine near the screen center)
screen_width_cm, screen_width_px, distance_cm = 40.0, 1920, 100.0
deg_per_px = visual_angle_deg(screen_width_cm, distance_cm) / screen_width_px
```

PsychoPy can do this conversion for you if you define a monitor with the screen width and viewing distance and use `units='deg'`. It assumes every degree spans the same number of pixels, which is off by about 2% at 10 degrees from the center of a flat screen (PsychoPy documentation, units). Check the numbers with your imaging center, because the visible field is often small. In NSD, the largest square visible to both eyes inside the head coil was 8.4 degrees (Allen et al., 2022), THINGS-fMRI images spanned 10 degrees (Hebart et al., 2023), and the HCP retinotopy stimuli were limited to a 16-degree circle (Benson et al., 2018). That limits how large your stimuli can be and how far into the periphery you can map, which matters a lot for retinotopy.

You'll almost always want a fixation target that stays visible throughout the run. Small dots are common, for example a 0.3-degree dot plus a semitransparent fixation grid in the HCP retinotopy experiment (Benson et al., 2018). Thaler et al. (2013) compared seven common target shapes and found that a combination of a bull's eye and a cross hair gave the most stable fixation, and THINGS-fMRI used that target (Hebart et al., 2023).

### Eye tracking and fixation

In a vision experiment, where people look determines what lands on the retina. If participants move their eyes, the retinal input changes, retinotopic responses shift, and you can end up with effects that come from eye movements rather than from the stimulus. Eye movements explain activity across the brain, including regions not associated with eye movement control (Frey et al., 2021), so if viewing behavior differs between conditions, it can show up as a difference in brain responses. Thielen et al. (2018) found no such confound for orientation decoding under standard fixation conditions, but stress that it can't be ruled out in other settings.

MR-compatible eye trackers exist. The EyeLink 1000 Plus has a long-range mount meant for fMRI and MEG setups (SR Research), and both NSD and the HCP retinotopy experiment used EyeLink 1000 systems (Allen et al., 2022; Benson et al., 2018). If you have access, record throughout the session, even if you don't plan to analyze the eye data right away, since it's the most direct way to check fixation afterwards. Expect setup to take some time: the HCP team caution that the quality of their eye-tracking data varied because the head coil got in the way (Benson et al., 2018).

If you don't have an eye tracker, you can still reduce the problem. Give participants a task that requires fixation, such as pressing a button when the fixation dot changes color (Benson et al., 2018). DeepMReye can also estimate gaze position from the MR signal of the eyeballs, even in data that has already been collected (Frey et al., 2021).

### Localizer and retinotopy runs

In a vision study you almost always add a functional localizer: a short block-design run with categories like faces, bodies, places, objects and written characters (Stigliani et al., 2015). Contrasts between these conditions define category-selective regions in each participant, like the fusiform face area (FFA; Kanwisher et al., 1997), the parahippocampal place area (PPA; Epstein & Kanwisher, 1998), the extrastriate body area (EBA; Downing et al., 2001) and the lateral occipital complex (LOC; Malach et al., 1995). The location of these regions varies across people, which is the main argument for defining them individually rather than using a group atlas (Saxe et al., 2006).

Often you'll also add a retinotopic mapping run to define early visual areas, as NSD did to define V1, V2, V3 and hV4 (Allen et al., 2022). The classic approach uses rotating wedges and expanding rings, and the population receptive field (pRF) method fits a model of each voxel's receptive field to the responses (Dumoulin & Wandell, 2008). The HCP protocol combines wedges, rings and sweeping bars (Benson et al., 2018). As mentioned above, a small screen limits how much of the visual field you can map.

<img src="/blog/fmri-diagrams/retinotopy-stimuli.svg" alt="Three retinotopic mapping stimuli: a rotating checkerboard wedge, an expanding checkerboard ring, and a sweeping checkerboard bar, each around a central fixation dot" />

*Standard retinotopic mapping stimuli. The wedge maps polar angle, the ring maps eccentricity, and sweeping bars are used to fit population receptive fields.*

Budget real scanner time for this. The fLoc authors recommend at least four 4-minute runs (16 minutes; Stigliani et al., 2015, fLoc repository), and the HCP retinotopy protocol is six 5-minute runs (Benson et al., 2018). NSD put six runs of each into a separate screening session (Allen et al., 2022), which is a good option if you scan the same participants several times. I'll cover how to analyze localizers with the GLM in [Part 7](/blog/fmri-crash-course-7-analysis-glm).

## Practical tips

### Stimulus presentation with PsychoPy

PsychoPy is a free, Python-based tool for running experiments with precise control over stimulus timing (Peirce et al., 2019). In a comparison of timing across experiment software, it was among the packages with sub-millisecond precision in lab-based setups (Bridges et al., 2020). Here's a conceptual example of a simple trial structure:

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

This uses `core.wait()` for simplicity, but that timing is only approximate. A display can only change on a screen refresh, so at 60 Hz you can show a stimulus for 116.7 ms or 133.3 ms but not for 120 ms, and PsychoPy recommends specifying durations in frames when timing needs to be precise (PsychoPy documentation, start and stop). Timing each event relative to the previous one also adds a fraction of a refresh per trial, which adds up: at 10 ms per trial, stimulus and scanner are 1 second apart after 100 trials. The fix is non-slip timing, where you schedule each event relative to a global clock started at the beginning of the run (PsychoPy documentation, non-slip timing).

A few more points:
- Synchronize with the scanner trigger. Depending on the setup, the scanner sends its trigger as an emulated key press or through a parallel or serial port, and your experiment must wait for the first one before starting (PsychoPy documentation, fMRI).
- Log the timing of what actually happened, not what you intended. `win.flip()` returns the time at which the flip completed, which is close to when the screen actually updated (PsychoPy documentation, Window API).
- Know your display. A frame lasts 1/refresh rate (PsychoPy documentation, start and stop), so a 120 Hz display like the one used in NSD gives you twice as fine a time grid as a 60 Hz projector like the one in the HCP retinotopy setup (Allen et al., 2022; Benson et al., 2018).
- Test your timing. Bridges et al. (2020) measured stimulus timing with a photodiode on the screen and recommend that everyone validate timing for their own stimuli and hardware.

### Scanner synchronization

The scanner sends a trigger pulse at every TR, and there are two ways to use them:

1. Start on the first trigger, then run on your own clock. Simple, but any timing errors accumulate over the run unless you use non-slip timing.
2. Re-synchronize to the trigger during the run, advancing the experiment based on incoming pulses. More work, but it keeps the experiment aligned with the scanner.

The PsychoPy documentation notes that keeping in sync matters most if you only wait for the trigger once at the start, and suggests a "waiting for scanner" routine at the start of every trial when trial durations can't be fixed in advance (PsychoPy documentation, fMRI). Whichever option you choose, I'd log every trigger so you can check for drift afterwards.

### Motion and participant comfort

Head motion is one of the biggest threats to data quality. A few things help:

- Foam padding around the head, which is the standard approach (Power et al., 2019)
- A practice session in a mock scanner, which is a standard tool in pediatric labs (Meissner et al., 2020)
- Short runs with breaks in between. Motion increases over the course of a run, and in adults it is lower after in-scanner breaks. Meissner et al. (2020) suggest, for example, five 3.6-minute runs instead of three 6-minute runs, but not going below about 2 minutes. For reference, NSD runs were 5 minutes and THINGS-fMRI runs about 7 minutes (Allen et al., 2022; Hebart et al., 2023)
- Real-time feedback. Showing children their own head motion reduced it, although mainly in those younger than 10 (Greene et al., 2018), and real-time motion monitoring lets the operator scan until enough low-motion data is collected (Dosenbach et al., 2017)

### Custom head cases

For studies where motion has to be really minimal (dense sampling with many sessions per person, high-resolution imaging, or participants who struggle to stay still) you can use custom-fitted head cases. You make a 3D scan of the participant's head and produce a foam mold that fits both the head and the inside of the head coil. In a cohort aged 7-28, such molds reduced head motion compared with standard foam padding in 12 of 13 participants, and participants found them comfortable (Power et al., 2019). NSD and THINGS-fMRI both used custom head cases (Allen et al., 2022; Hebart et al., 2023), and mean framewise displacement in THINGS-fMRI stayed below 0.2 mm.

The [Gallant Lab's headcase-pipeline](https://github.com/gallantlab/headcase-pipeline) is an open-source workflow for this:
1. Capture a 3D scan of the participant's head (the pipeline has been tested with a Structure Sensor)
2. Run the pipeline to generate printable STL files
3. 3D print the case (in 2 or 4 pieces; 4 is the default)

It's extra effort up front, but if you're going to scan the same people many times, cleaner data and fewer excluded runs can make it worth it.

---

## Summary

- Multiband acceleration helps, but moderately: higher factors bring noise amplification and slice leakage, and the measured benefits for task fMRI are modest. NSD and THINGS-fMRI both used a factor of 3 with TRs around 1.5 s.
- Voxels of 2-3 mm at 3T are well supported for both univariate analyses and MVPA. Much smaller voxels mainly make sense at 7T.
- Block designs are best for detection and localizers, rapid event-related designs with jittered ISIs for most other questions.
- Large datasets like NSD, THINGS-data and LAION-fMRI show the value of repeated stimuli and broad stimulus sampling, even if your own study is much smaller.
- Vision studies need extra care: report stimulus size in degrees of visual angle, control fixation (ideally with an eye tracker), and plan scanner time for localizer and retinotopy runs.
- Scanner synchronization, accurate timing logs and motion prevention are boring but make or break your data.

---

With data collected, the next step is preprocessing: getting the raw data ready for analysis. That's where we'll head next.

**Next:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)

**Previous:** [Part 3: Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)

## References

### Acquisition parameters

- Demetriou, L., Kowalczyk, O.S., Tyson, G., Bello, T., Newbould, R.D., & Wall, M.B. (2018). A comprehensive evaluation of increasing temporal resolution with multiband-accelerated protocols and effects on statistical outcome measures in fMRI. NeuroImage, 176, 404-416. [DOI: 10.1016/j.neuroimage.2018.05.011](https://doi.org/10.1016/j.neuroimage.2018.05.011)
- Deichmann, R., Gottfried, J.A., Hutton, C., & Turner, R. (2003). Optimized EPI for fMRI studies of the orbitofrontal cortex. NeuroImage, 19(2), 430-441. [DOI: 10.1016/S1053-8119(03)00073-9](https://doi.org/10.1016/S1053-8119(03)00073-9)
- Dumoulin, S.O., Fracasso, A., van der Zwaag, W., Siero, J.C.W., & Petridou, N. (2018). Ultra-high field MRI: Advancing systems neuroscience towards mesoscopic human brain function. NeuroImage, 168, 345-357. [DOI: 10.1016/j.neuroimage.2017.01.028](https://doi.org/10.1016/j.neuroimage.2017.01.028)
- Feinberg, D.A., Moeller, S., Smith, S.M., Auerbach, E., Ramanna, S., Gunther, M., Glasser, M.F., Miller, K.L., Ugurbil, K., & Yacoub, E. (2010). [Multiplexed echo planar imaging for sub-second whole brain FMRI and fast diffusion imaging](https://doi.org/10.1371/journal.pone.0015710). PLoS ONE, 5(12), e15710.
- Feinberg, D.A. & Setsompop, K. (2013). [Ultra-fast MRI of the human brain with simultaneous multi-slice imaging](https://doi.org/10.1016/j.jmr.2013.02.002). Journal of Magnetic Resonance, 229, 90-100.
- Gonzalez-Castillo, J., Roopchansingh, V., Bandettini, P.A., & Bodurka, J. (2011). [Physiological noise effects on the flip angle selection in BOLD fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3020268/). NeuroImage, 54(4), 2764-2778.
- Moeller, S., Yacoub, E., Olman, C.A., Auerbach, E., Strupp, J., Harel, N., & Uğurbil, K. (2010). [Multiband multislice GE-EPI at 7 tesla, with 16-fold acceleration using partial parallel imaging with application to high spatial and temporal whole-brain fMRI](https://doi.org/10.1002/mrm.22361). Magnetic Resonance in Medicine, 63(5), 1144-1153.
- Risk, B.B., Murden, R.J., Wu, J., Nebel, M.B., Venkataraman, A., Zhang, Z., & Qiu, D. (2021). [Which multiband factor should you choose for your resting-state fMRI study?](https://pmc.ncbi.nlm.nih.gov/articles/PMC8159874/) NeuroImage, 234, 117965.
- Smith, S.M., Beckmann, C.F., Andersson, J., et al. (2013). [Resting-state fMRI in the Human Connectome Project](https://pmc.ncbi.nlm.nih.gov/articles/PMC3720828/). NeuroImage, 80, 144-168.
- Todd, N., Moeller, S., Auerbach, E.J., Yacoub, E., Flandin, G., & Weiskopf, N. (2016). [Evaluation of 2D multiband EPI imaging for high-resolution, whole-brain, task-based fMRI studies at 3T: Sensitivity and slice leakage artifacts](https://pmc.ncbi.nlm.nih.gov/articles/PMC4655914/). NeuroImage, 124, 32-42.
- Triantafyllou, C., Hoge, R.D., Krueger, G., Wiggins, C.J., Potthast, A., Wiggins, G.C., & Wald, L.L. (2005). Comparison of physiological noise at 1.5 T, 3 T and 7 T and optimization of fMRI acquisition parameters. NeuroImage, 26(1), 243-250. [DOI: 10.1016/j.neuroimage.2005.01.007](https://doi.org/10.1016/j.neuroimage.2005.01.007)
- Uğurbil, K. (2018). [Imaging at ultrahigh magnetic fields: History, challenges, and solutions](https://pmc.ncbi.nlm.nih.gov/articles/PMC5758441/). NeuroImage, 168, 7-32.
- Weiskopf, N., Hutton, C., Josephs, O., & Deichmann, R. (2006). Optimal EPI parameters for reduction of susceptibility-induced BOLD sensitivity losses: a whole-brain analysis at 3 T and 1.5 T. NeuroImage, 33(2), 493-504. [DOI: 10.1016/j.neuroimage.2006.07.029](https://doi.org/10.1016/j.neuroimage.2006.07.029)

### Voxel size and decoding

- Coutanche, M.N., Solomon, S.H., & Thompson-Schill, S.L. (2016). [A meta-analysis of fMRI decoding: Quantifying influences on human visual population codes](https://pmc.ncbi.nlm.nih.gov/articles/PMC4761448/). Neuropsychologia, 82, 134-141.
- Kamitani, Y. & Tong, F. (2005). [Decoding the visual and subjective contents of the human brain](https://pmc.ncbi.nlm.nih.gov/articles/PMC1808230/). Nature Neuroscience, 8(5), 679-685.
- Alink, A., Krugliak, A., Walther, A., & Kriegeskorte, N. (2013). fMRI orientation decoding in V1 does not require global maps or globally coherent orientation stimuli. Frontiers in Psychology, 4, 493. [https://doi.org/10.3389/fpsyg.2013.00493](https://doi.org/10.3389/fpsyg.2013.00493)
- Op de Beeck, H.P. (2010). Against hyperacuity in brain reading: spatial smoothing does not hurt multivariate fMRI analyses? NeuroImage, 49(3), 1943-1948. [DOI: 10.1016/j.neuroimage.2009.02.047](https://doi.org/10.1016/j.neuroimage.2009.02.047)
- Sengupta, A., Yakupov, R., Speck, O., Pollmann, S., & Hanke, M. (2017). The effect of acquisition resolution on orientation decoding from V1 BOLD fMRI at 7T. NeuroImage, 148, 64-76. [DOI: 10.1016/j.neuroimage.2016.12.040](https://doi.org/10.1016/j.neuroimage.2016.12.040) ([preprint](https://www.biorxiv.org/content/10.1101/081604v1.full))

### Experimental Design

- Bandettini, P.A. & Cox, R.W. (2000). [Event-related fMRI contrast when using constant interstimulus interval: theory and experiment](https://pubmed.ncbi.nlm.nih.gov/10748429/). Magnetic Resonance in Medicine, 43(4), 540-548.
- Dale, A.M. (1999). [Optimal experimental design for event-related fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC6873302/). Human Brain Mapping, 8(2-3), 109-114.
- Friston, K.J., Zarahn, E., Josephs, O., Henson, R.N., & Dale, A.M. (1999). Stochastic designs in event-related fMRI. NeuroImage, 10(5), 607-619. [DOI: 10.1006/nimg.1999.0498](https://doi.org/10.1006/nimg.1999.0498)
- Hagberg, G.E., Zito, G., Patria, F., & Sanes, J.N. (2001). Improved detection of event-related functional MRI signals using probability functions. NeuroImage, 14(5), 1193-1205. [DOI: 10.1006/nimg.2001.0880](https://doi.org/10.1006/nimg.2001.0880)
- Handwerker, D.A., Ollinger, J.M., & D'Esposito, M. (2004). Variation of BOLD hemodynamic responses across subjects and brain regions and their effects on statistical analyses. NeuroImage, 21(4), 1639-1651. [DOI: 10.1016/j.neuroimage.2003.11.029](https://doi.org/10.1016/j.neuroimage.2003.11.029)
- Henson, R. (2005). [Design efficiency](https://imaging.mrc-cbu.cam.ac.uk/imaging/DesignEfficiency). MRC Cognition and Brain Sciences Unit Imaging Wiki.
- Liu, T.T., Frank, L.R., Wong, E.C., & Buxton, R.B. (2001). Detection power, estimation efficiency, and predictability in event-related fMRI. NeuroImage, 13(4), 759-773. [DOI: 10.1006/nimg.2000.0728](https://doi.org/10.1006/nimg.2000.0728)
- Mumford, J.A., Turner, B.O., Ashby, F.G., & Poldrack, R.A. (2012). [Deconvolving BOLD activation in event-related designs for multivoxel pattern classification analyses](https://pmc.ncbi.nlm.nih.gov/articles/PMC3251697/). NeuroImage, 59(3), 2636-2643.
- Petersen, S.E. & Dubis, J.W. (2012). [The mixed block/event-related design](https://pmc.ncbi.nlm.nih.gov/articles/PMC3288695/). NeuroImage, 62(2), 1177-1184.
- SPM. [`spm_hrf.m`](https://github.com/spm/spm/blob/main/spm_hrf.m), canonical haemodynamic response function (default parameters and documentation in the file header).
- Visscher, K.M., Miezin, F.M., Kelly, J.E., Buckner, R.L., Donaldson, D.I., McAvoy, M.P., Bhalodia, V.M., & Petersen, S.E. (2003). Mixed blocked/event-related designs separate transient and sustained activity in fMRI. NeuroImage, 19(4), 1694-1708. [DOI: 10.1016/S1053-8119(03)00178-2](https://doi.org/10.1016/S1053-8119(03)00178-2)
- Wager, T.D. & Nichols, T.E. (2003). Optimization of experimental design in fMRI: a general framework using a genetic algorithm. NeuroImage, 18(2), 293-309. [DOI: 10.1016/S1053-8119(02)00046-0](https://doi.org/10.1016/S1053-8119(02)00046-0)

### Large-Scale Datasets

- Allen, E.J., St-Yves, G., Wu, Y. et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. Nature Neuroscience, 25, 116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)
- Hebart, M.N., Contier, O., Teichmann, L. et al. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. eLife, 12, e82580. [DOI: 10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580)
- Naselaris, T., Allen, E., & Kay, K. (2021). Extensive sampling for complete models of individual brains. Current Opinion in Behavioral Sciences, 40, 45-51. [DOI: 10.1016/j.cobeha.2020.12.008](https://doi.org/10.1016/j.cobeha.2020.12.008)
- Zerbe, J., Roth, J., Mell, M.M., Herholz, P., Knapen, T., & Hebart, M.N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset website](https://laion-fmri.hebartlab.com)

### Localizers, Retinotopic Mapping and Fixation

- Benson, N.C., Jamison, K.W., Arcaro, M.J., et al. (2018). [The Human Connectome Project 7 Tesla retinotopy dataset: Description and population receptive field analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6314247/). Journal of Vision, 18(13), 23.
- Downing, P.E., Jiang, Y., Shuman, M. & Kanwisher, N. (2001). A cortical area selective for visual processing of the human body. Science, 293(5539), 2470-2473. [DOI: 10.1126/science.1063414](https://doi.org/10.1126/science.1063414)
- Dumoulin, S.O. & Wandell, B.A. (2008). Population receptive field estimates in human visual cortex. NeuroImage, 39(2), 647-660. [DOI: 10.1016/j.neuroimage.2007.09.034](https://doi.org/10.1016/j.neuroimage.2007.09.034)
- Epstein, R. & Kanwisher, N. (1998). A cortical representation of the local visual environment. Nature, 392, 598-601. [DOI: 10.1038/33402](https://doi.org/10.1038/33402)
- Frey, M., Nau, M., & Doeller, C.F. (2021). [Magnetic resonance-based eye tracking using deep neural networks](https://pmc.ncbi.nlm.nih.gov/articles/PMC10097595/). Nature Neuroscience, 24, 1772-1779.
- Kanwisher, N., McDermott, J. & Chun, M.M. (1997). [The fusiform face area: a module in human extrastriate cortex specialized for face perception](https://doi.org/10.1523/JNEUROSCI.17-11-04302.1997). Journal of Neuroscience, 17(11), 4302-4311.
- Malach, R., et al. (1995). [Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex](https://doi.org/10.1073/pnas.92.18.8135). Proceedings of the National Academy of Sciences, 92(18), 8135-8139.
- Saxe, R., Brett, M., & Kanwisher, N. (2006). Divide and conquer: a defense of functional localizers. NeuroImage, 30(4), 1088-1096. [DOI: 10.1016/j.neuroimage.2005.12.062](https://doi.org/10.1016/j.neuroimage.2005.12.062)
- SR Research. [EyeLink 1000 Plus](https://www.sr-research.com/eyelink-1000-plus/) product page (long-range mount for fMRI/MEG).
- Stigliani, A., Weiner, K.S., & Grill-Spector, K. (2015). Temporal processing capacity in high-level visual cortex is domain specific. Journal of Neuroscience, 35(36), 12412-12424. [DOI: 10.1523/JNEUROSCI.4822-14.2015](https://doi.org/10.1523/JNEUROSCI.4822-14.2015). Localizer code and recommendations: [fLoc repository](https://github.com/VPNL/fLoc)
- Thaler, L., Schütz, A.C., Goodale, M.A., & Gegenfurtner, K.R. (2013). What is the best fixation target? The effect of target shape on stability of fixational eye movements. Vision Research, 76, 31-42. [DOI: 10.1016/j.visres.2012.10.012](https://doi.org/10.1016/j.visres.2012.10.012)
- Thielen, J., van Lier, R., & van Gerven, M. (2018). [No evidence for confounding orientation-dependent fixational eye movements under baseline conditions](https://pmc.ncbi.nlm.nih.gov/articles/PMC6076314/). Scientific Reports, 8, 11644.

### Stimulus Presentation and Timing

- Bridges, D., Pitiot, A., MacAskill, M.R., & Peirce, J.W. (2020). [The timing mega-study: comparing a range of experiment generators, both lab-based and online](https://pmc.ncbi.nlm.nih.gov/articles/PMC7512138/). PeerJ, 8, e9414.
- Peirce, J., Gray, J.R., Simpson, S., MacAskill, M., Höchenberger, R., Sogo, H., Kastman, E., & Lindeløv, J.K. (2019). [PsychoPy2: Experiments in behavior made easy](https://pmc.ncbi.nlm.nih.gov/articles/PMC6420413/). Behavior Research Methods, 51, 195-203.
- PsychoPy documentation: [Units for the window and stimuli](https://psychopy.org/general/units.html), [Defining the onset/duration of components](https://psychopy.org/builder/startStop.html), [Non-slip timing for imaging](https://psychopy.readthedocs.io/en/stable/general/timing/nonSlipTiming.html), [Communicating with fMRI](https://psychopy.org/hardware/fMRI.html), [Window API](https://psychopy.org/api/visual/window.html).

### Motion Reduction

- Dosenbach, N.U.F., Koller, J.M., Earl, E.A., et al. (2017). [Real-time motion analytics during brain MRI improve data quality and reduce costs](https://pmc.ncbi.nlm.nih.gov/articles/PMC5731481/). NeuroImage, 161, 80-93.
- Greene, D.J., Koller, J.M., Hampton, J.M., et al. (2018). [Behavioral interventions for reducing head motion during MRI scans in children](https://pmc.ncbi.nlm.nih.gov/articles/PMC5857466/). NeuroImage, 171, 234-245.
- Meissner, T.W., Walbrin, J., Nordt, M., Koldewyn, K., & Weigelt, S. (2020). [Head motion during fMRI tasks is reduced in children and adults if participants take breaks](https://pmc.ncbi.nlm.nih.gov/articles/PMC7284013/). Developmental Cognitive Neuroscience, 44, 100803.
- Power, J.D., Silver, B.M., Silverman, M.R., Ajodan, E.L., Bos, D.J., & Jones, R.M. (2019). Customized head molds reduce motion during resting state fMRI scans. NeuroImage, 189, 141-149. [DOI: 10.1016/j.neuroimage.2019.01.016](https://doi.org/10.1016/j.neuroimage.2019.01.016)
- [Gallant Lab headcase-pipeline](https://github.com/gallantlab/headcase-pipeline) - An open-source pipeline to generate subject-specific 3D-printed headcases for fMRI scanning.

### Naturalistic Paradigms and Inter-Subject Correlation

- Hasson, U., Nir, Y., Levy, I., Fuhrmann, G., & Malach, R. (2004). [Intersubject synchronization of cortical activity during natural vision](https://www.science.org/doi/10.1126/science.1089506). Science, 303(5664), 1634-1640.
- Nastase, S.A., Gazzola, V., Hasson, U., & Keysers, C. (2019). [Measuring shared responses across subjects using intersubject correlation](https://academic.oup.com/scan/article/14/6/667/5489905). Social Cognitive and Affective Neuroscience, 14(6), 667-685.
- Nastase, S.A., Goldstein, A., & Hasson, U. (2020). [Keep it real: rethinking the primacy of experimental control in cognitive neuroscience](https://pmc.ncbi.nlm.nih.gov/articles/PMC7789034/). NeuroImage, 222, 117254.
- Sonkusare, S., Breakspear, M., & Guo, C. (2019). Naturalistic stimuli in neuroscience: critically acclaimed. Trends in Cognitive Sciences, 23(8), 699-714. [DOI: 10.1016/j.tics.2019.05.004](https://doi.org/10.1016/j.tics.2019.05.004)
- Vanderwal, T., Eilbott, J., & Castellanos, F.X. (2019). [Movies in the magnet: Naturalistic paradigms in developmental functional neuroimaging](https://pmc.ncbi.nlm.nih.gov/articles/PMC6969259/). Developmental Cognitive Neuroscience, 36, 100600.
- [Naturalistic Data Analysis](https://naturalistic-data.org/) - Tutorial resources for analyzing naturalistic fMRI data, including ISC methods.
