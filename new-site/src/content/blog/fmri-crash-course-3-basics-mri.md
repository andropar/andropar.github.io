---
title: "Basics of (Functional) MRI"
description: "How MRI and fMRI work, the BOLD signal, and a first look at real fMRI data. Part 3 of an 8-part fMRI crash course."
date: 2025-03-24
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 3 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

Now we get to the fun part: understanding how we can use giant magnets to measure brain activity. It sounds almost magical when you first hear it. A person lies in a tube, magnets do their thing, and somehow we get beautiful images of their brain lighting up. But the physics behind it is surprisingly elegant, and once you grasp the core principles, everything else clicks into place.

## MRI basics: spins, magnets, and radio waves

Here's the fundamental insight: your body is mostly water, and water contains hydrogen atoms. Each hydrogen atom has a single proton in its nucleus, and protons have a property called **spin**. You can think of each proton as a tiny bar magnet, constantly spinning on its axis.

Normally, these tiny magnets point in random directions, canceling each other out. But when you place someone inside an MRI scanner, something interesting happens. The scanner generates an incredibly strong magnetic field - typically 1.5 to 7 Tesla, which is tens of thousands of times stronger than Earth's magnetic field. This field forces all those randomly oriented protons to align with it, like compass needles pointing north.

<img src="/blog/fmri-diagrams/proton-alignment.svg" alt="Proton alignment before and after magnetic field application" />

But here's where it gets clever. The protons don't just align - they also **precess**. Imagine a spinning top that's slightly tilted: it wobbles in a circle while it spins. Protons do the same thing, wobbling around the axis of the magnetic field at a very specific frequency called the Larmor frequency. This frequency depends on the strength of the magnetic field and the type of atom. For hydrogen in a 3T scanner, it's about 128 MHz.

Now comes the radio frequency (RF) pulse. The scanner sends out a burst of radio waves at exactly the Larmor frequency. This is resonance - the same principle that lets an opera singer shatter a glass by hitting the right note. The RF pulse tips the protons away from their aligned state, essentially giving them a push.

When the RF pulse stops, the protons want to return to their aligned state. As they do, they release energy in the form of radio waves, which the scanner detects. This is the MRI signal.

### T1 and T2 relaxation: the source of contrast

The brilliance of MRI is that different tissues relax at different rates, giving us contrast. There are two types of relaxation:

**T1 relaxation** (longitudinal relaxation) is how quickly protons realign with the main magnetic field. Fat relaxes quickly; water relaxes slowly. This gives us T1-weighted images where fat appears bright and cerebrospinal fluid appears dark.

**T2 relaxation** (transverse relaxation) is how quickly the protons lose their synchrony with each other after the RF pulse. Think of it like a group of runners who start together but gradually spread out. Different tissues lose sync at different rates, giving us T2-weighted images where fluids appear bright.

<img src="/blog/fmri-diagrams/t1-t2-relaxation.svg" alt="T1 and T2 relaxation processes in MRI" />

By adjusting the timing of RF pulses and signal acquisition, we can emphasize either T1 or T2 contrast. This is why radiologists can see different things by running different MRI sequences - the physics is the same, but the timing reveals different tissue properties.

## From structure to function: the BOLD signal

Structural MRI gives us gorgeous images of brain anatomy. But what we really want for cognitive neuroscience is to see the brain *doing* things. That's where functional MRI comes in.

The key insight that makes fMRI possible is beautifully simple: **active neurons need oxygen**. When a brain region becomes active, local blood flow increases to deliver more oxygenated blood. This is called the hemodynamic response.

Here's where physics helps us again. Hemoglobin - the molecule in red blood cells that carries oxygen - has different magnetic properties depending on whether it's carrying oxygen or not. Oxygenated hemoglobin (oxyhemoglobin) is **diamagnetic**, meaning it barely affects the local magnetic field. But deoxygenated hemoglobin (deoxyhemoglobin) is **paramagnetic** - it distorts the magnetic field around it, which speeds up T2 relaxation and reduces the MRI signal.

So here's the logic:
1. Neurons fire in some brain region
2. Blood flow increases, bringing fresh oxygenated blood
3. The ratio of oxy- to deoxyhemoglobin shifts toward more oxygenated blood
4. Less magnetic distortion means slower T2 relaxation
5. The MRI signal increases

This is the **Blood Oxygen Level Dependent (BOLD)** signal. We're not measuring neural activity directly - we're measuring changes in blood oxygenation that correlate with neural activity. It's indirect, but it works remarkably well.

### A recent complication: discordant voxels

I should mention an important recent finding that complicates this picture. A [2025 paper in Nature Neuroscience](https://www.nature.com/articles/s41593-025-02132-9) by Poser and colleagues found that the relationship between BOLD signal and neural activity is more complex than the standard model suggests.

Using quantitative imaging that measures both BOLD signal and actual oxygen consumption (cerebral metabolic rate of oxygen, or CMRO₂), they discovered that about **40% of voxels** showing significant BOLD changes during tasks exhibited what they call "discordant" behavior - the BOLD signal went in the *opposite* direction from oxygen metabolism. This was particularly common in the **default mode network**.

What's happening? In "concordant" voxels (the majority), BOLD increases track with increased neural activity and oxygen consumption, as the textbook model predicts. But in discordant voxels, the relationship is inverted - likely because these regions regulate oxygen delivery differently, relying more on changes in oxygen extraction fraction rather than blood flow.

This doesn't invalidate fMRI - the technique remains invaluable. But it's a reminder that BOLD is a complex physiological signal, not a simple neural activity meter. The relationship between BOLD and neural firing varies across brain regions, and interpreting "deactivation" (BOLD decreases) requires particular caution. For most vision research in sensory cortex, the standard model holds well.

### The hemodynamic response function

The BOLD response doesn't happen instantly. The hemodynamic response function (HRF) describes how the BOLD signal changes over time after a brief neural event.

<img src="/blog/fmri-diagrams/hrf-timeline.svg" alt="Hemodynamic response function timeline" />

The typical HRF looks something like this:
- **Initial dip (0-2 seconds):** A small decrease in signal as local oxygen is consumed before blood flow catches up. This is subtle and not always observed.
- **Rise to peak (2-6 seconds):** Blood flow overshoots the demand, flooding the area with oxygenated blood. The signal peaks around 5-6 seconds after the neural event.
- **Return to baseline (6-12 seconds):** Blood flow normalizes.
- **Post-stimulus undershoot (12-30 seconds):** The signal dips slightly below baseline as the vascular system settles. This is why you can't present stimuli too rapidly - you need time for the HRF to recover.

This sluggish response has major implications for experimental design. If you show someone two images 500ms apart, their BOLD responses will overlap and blend together. The brain can do a lot in half a second, but fMRI smooths it all together. We'll deal with this constraint extensively when we design experiments.

## Pros and cons of fMRI

Let's be honest about what fMRI can and cannot do. I've seen too many papers oversell their findings by ignoring the method's limitations, and too many researchers dismiss fMRI entirely without appreciating its unique strengths.

### The good stuff

**Non-invasive and safe.** No radiation, no injections (usually), no surgery. You can scan the same person hundreds of times. This is huge for longitudinal studies and for building the large datasets that modern computational approaches require.

**Excellent spatial resolution.** Standard fMRI gives you 2-3mm voxels. High-field scanners can push below 1mm. That's not single-neuron resolution, but it's good enough to distinguish between cortical layers and fine-grained patterns within brain regions.

**Whole-brain coverage.** Unlike electrophysiology, where you sample from a few locations, fMRI gives you the entire brain in every scan. You can discover unexpected activations. You can study network interactions across distant regions. This matters more than people often appreciate.

**Widespread availability.** Most research universities have access to an MRI scanner. The analysis software is mature and well-documented. There's a large community to learn from.

### The not-so-good stuff

**Poor temporal resolution.** The BOLD response peaks 5-6 seconds after neural activity. Even with fast acquisition (TR of 1 second or less), you're measuring a sluggish, smoothed version of neural dynamics. EEG and MEG can capture millisecond-level changes; fMRI cannot.

**Indirect measurement.** You're measuring blood flow changes, not neural firing. The relationship between BOLD and neural activity is complex and can vary across brain regions, populations, and conditions. Always remember: BOLD is a proxy.

**Expensive.** Scanner time typically costs $500-1000 per hour. A full research study can easily run into six figures. This isn't a hobby.

**Motion sensitivity.** Head movement of even 1-2mm can ruin your data. Participants have to lie very still for extended periods, which is challenging. Motion correction helps but doesn't eliminate the problem, and differential motion between conditions can create spurious results.

**Loud and uncomfortable.** The scanner makes a rhythmic banging sound (around 100 dB) as gradient coils switch rapidly. Participants wear earplugs and headphones. The bore is narrow and claustrophobic. Some people simply can't tolerate it.

### Field strength comparison

Not all MRI scanners are created equal. Here's how the main field strengths compare:

| Field Strength | Spatial Resolution | SNR | Availability | Best For |
|----------------|-------------------|-----|--------------|----------|
| **1.5T** | ~3-4mm typical | Lower | Common in hospitals | Clinical scanning, basic research |
| **3T** | ~2-3mm typical | Good | Most research centers | Standard cognitive fMRI, good balance |
| **7T** | <1mm possible | Highest | Specialized centers | High-resolution cortical mapping, layers |

Higher field strength means stronger signal, which translates to better spatial resolution or faster scanning. But it also means more artifacts, especially near air-tissue boundaries, and more expensive hardware. For vision research, 3T is the workhorse; 7T is the luxury option when you need to resolve fine-grained cortical organization.

## What does fMRI data actually look like?

Let's get concrete. When you run an fMRI experiment, what do you actually get?

### 4D volumes and voxels

An fMRI dataset is a **4D volume**: three spatial dimensions (x, y, z) plus time. At each time point, you have a 3D brain image divided into small cubes called **voxels** (volumetric pixels). Each voxel is typically 2-3mm on each side.

A typical fMRI scan might be 64 x 64 x 40 voxels, acquired every 2 seconds for 10 minutes. That's 300 time points, or 300 complete 3D brain images.

<img src="/blog/fmri-diagrams/4d-volume.svg" alt="4D fMRI volume structure showing brain volumes over time" />

*Each 3D volume contains ~160,000 voxels. A 10-minute scan with TR=2s yields 300 volumes – a 4D dataset.*

### Time series

For each voxel, you have a **time series** - a sequence of signal intensities across the scan. This is what you analyze. You're looking for voxels whose time series correlate with your experimental conditions.

The signal values are arbitrary units. What matters is the relative change: a 1-2% signal change between conditions is typical and meaningful. This is why we often work with percent signal change rather than raw values.

### Loading fMRI data in Python

Let's look at some actual code. The standard library for working with neuroimaging data in Python is **nibabel**. Here's how you'd load and inspect an fMRI volume:

```python
import nibabel as nib
import numpy as np

# Load an fMRI NIfTI file
img = nib.load('sub-01_task-visual_bold.nii.gz')

# Get the data as a numpy array
data = img.get_fdata()

# Check the shape: (x, y, z, time)
print(f"Data shape: {data.shape}")
# Output: Data shape: (64, 64, 40, 300)

# Get the voxel size from the header
voxel_size = img.header.get_zooms()
print(f"Voxel size (mm): {voxel_size[:3]}")
print(f"TR (seconds): {voxel_size[3]}")

# Extract the time series from a single voxel
voxel_timeseries = data[32, 32, 20, :]
print(f"Time series length: {len(voxel_timeseries)}")

# Compute mean signal across time for a single volume
mean_volume = np.mean(data, axis=3)
print(f"Mean volume shape: {mean_volume.shape}")
```

This is the foundation. Everything else - preprocessing, analysis, statistics - builds on manipulating these 4D arrays.

## Modern datasets: A quick note

I mentioned NSD and THINGS in [Part 2](/blog/fmri-crash-course-2-neuroimaging-vision) - these large-scale, densely-sampled datasets are transforming what's possible in computational vision neuroscience. They'll come up throughout the rest of this course.

The key insight is scale: with 10,000+ images per participant (NSD) or systematic coverage of object concept space (THINGS), you can train meaningful encoding and decoding models, study representational geometry in detail, and compare brain representations to deep neural networks. Both are publicly available and well-documented.

---

## Key Takeaways

- **MRI uses strong magnetic fields and RF pulses** to detect hydrogen atoms in tissue. Different relaxation rates (T1, T2) create contrast between tissue types.

- **fMRI measures the BOLD signal** - changes in blood oxygenation that correlate with neural activity. It's indirect but non-invasive and provides whole-brain coverage.

- **The hemodynamic response is slow**, peaking 5-6 seconds after neural activity. This limits temporal resolution but allows us to detect even brief events.

- **fMRI data is a 4D volume**: 3D brain images sampled over time, typically every 1-2 seconds with 2-3mm spatial resolution.

- **Trade-offs are real**: fMRI offers good spatial resolution and whole-brain coverage, but poor temporal resolution, indirect measurement, and significant cost.

- **Modern datasets like NSD and THINGS** provide densely-sampled data with rich annotations, enabling computational approaches that weren't possible before.

---

Now that we understand what fMRI measures, the next post will cover how to actually record fMRI data and design experiments that work well with this modality.

**Next:** [Part 4: Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)

**Previous:** [Part 2: Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision)
