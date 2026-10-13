---
title: "Basics of (Functional) MRI"
description: "How MRI and fMRI work, the BOLD signal, and a first look at real fMRI data. Part 3 of an 8-part fMRI crash course."
date: 2025-03-24
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 3 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

In this post we'll look at how a giant magnet can measure brain activity. When I first heard about it, it sounded a bit like magic, but you only need a handful of physics ideas to follow the rest of this series.

## MRI basics: spins, magnets, and radio waves

Your body is mostly water, and water contains hydrogen. Each hydrogen atom has a single proton in its nucleus, and protons have a property called spin. For our purposes, you can think of each proton as a tiny bar magnet.

Normally these tiny magnets point in random directions and cancel out. Inside an MRI scanner they sit in a field of typically 1.5 to 7 Tesla, tens of thousands of times stronger than Earth's. In this field, slightly more protons align with the field than against it. The excess is tiny, only a few parts per million, but there are so many protons in a brain that it adds up to a measurable net magnetization pointing along the field. This net magnetization is what MRI works with.

<img src="/blog/fmri-diagrams/proton-alignment.svg" alt="Spins point in random directions without a field; inside the scanner a tiny excess aligns with the main field and produces a net magnetization" />

The protons also precess: like a slightly tilted spinning top, they wobble around the direction of the magnetic field at a specific frequency, the Larmor frequency, which depends on the field strength and the type of nucleus. For hydrogen in a 3T scanner it's about 128 MHz.

To get a signal, the scanner sends a short burst of radio waves at exactly this frequency (an RF pulse). Because it matches the precession frequency, the pulse is absorbed efficiently (resonance) and tips the net magnetization away from the direction of the main field.

When the pulse stops, the magnetization returns to its original state, and the precessing protons emit radio waves that the scanner's coils pick up. This is the MRI signal.

### T1, T2, and T2* relaxation: where contrast comes from

Different tissues return to equilibrium at different rates, and that's what gives MRI images their contrast. There are two main kinds of relaxation.

T1 relaxation (longitudinal relaxation) describes how quickly the magnetization realigns with the main field. Fat recovers quickly, water slowly, so in T1-weighted images fat appears bright and cerebrospinal fluid appears dark. The anatomical scans you'll use for registration and cortical surface reconstruction are usually T1-weighted.

T2 relaxation (transverse relaxation) describes how quickly the protons lose their synchrony after the RF pulse, like runners who start together and gradually spread out. In T2-weighted images, fluids appear bright.

In a real scanner, the protons also get out of sync because the magnetic field isn't perfectly uniform: small local field inhomogeneities make neighboring protons precess at slightly different frequencies. The decay you actually observe, including this extra dephasing, is called T2* ("T2-star"). T2* is always shorter than T2. This is what fMRI exploits.

<img src="/blog/fmri-diagrams/t1-t2-curves.svg" alt="T1 recovery and T2 decay curves for white matter, gray matter and CSF at 3T" />

By changing the timing of RF pulses and signal readout, you can make an image sensitive mostly to T1, T2, or T2*.

## From structure to function: the BOLD signal

fMRI relies on the fact that active neurons need energy and oxygen. When a brain region becomes more active, local blood flow increases, and it increases by more than the extra oxygen consumption requires. This is the hemodynamic response.

Hemoglobin, the molecule in red blood cells that carries oxygen, has different magnetic properties depending on whether it's carrying oxygen. Oxygenated hemoglobin is diamagnetic and barely affects the local magnetic field. Deoxygenated hemoglobin is paramagnetic: it creates small distortions in the field around blood vessels. These local field inhomogeneities make nearby protons dephase faster, which shortens T2* and reduces the signal in a T2*-weighted image.

So the logic goes:
1. Neurons in some region become more active
2. Blood flow increases, bringing in more oxygenated blood than is used up
3. The proportion of deoxyhemoglobin in the local blood drops
4. Less field distortion means slower T2* decay
5. The T2*-weighted MRI signal increases

This is the Blood Oxygen Level Dependent (BOLD) signal, first described by Ogawa and colleagues in 1990. To be sensitive to it, fMRI uses T2*-weighted gradient-echo sequences, almost always echo-planar imaging (EPI), which can acquire a whole brain volume in a second or two. We're measuring changes in blood oxygenation that follow neural activity, not the activity itself. Visual cortex was one of the first places this was shown in humans (Kwong et al., 1992, with flashing-light stimulation), and its strong, reliable responses are one reason vision has been such a productive area for fMRI.

<img src="/blog/fmri-diagrams/bold-contrast-te.svg" alt="Left: T2* decay curves at rest and during activity, nearly overlapping. Right: their difference as a function of echo time, peaking near the tissue T2*" />

*Simulated gray matter at 3T. Activity makes T2* slightly longer, so the signal decays a little more slowly. The difference is tiny, and it is largest when the echo time is close to the tissue's T2*. In practice TE is set a bit shorter (around 30 ms at 3T) to limit dropout and keep acquisition fast.*

### A recent complication: discordant voxels

A [2025 paper in Nature Neuroscience](https://www.nature.com/articles/s41593-025-02132-9) by Epp and colleagues showed that the relationship between BOLD and the underlying physiology can be messier than the standard model suggests.

They used quantitative imaging to measure both the BOLD signal and oxygen metabolism (the cerebral metabolic rate of oxygen, CMRO₂) during tasks. In about 40% of voxels with significant BOLD changes, the BOLD signal went in the opposite direction from oxygen metabolism. They called these voxels "discordant", and they were particularly common in the default mode network.

In concordant voxels, BOLD tracks oxygen consumption as the textbook model predicts. In discordant voxels, the authors' interpretation is that these regions meet changing oxygen demand mostly by extracting more oxygen from the blood that's already there, instead of increasing blood flow, which flips the sign of the BOLD change.

This doesn't make fMRI useless, but the coupling between BOLD and neural activity can differ between regions, and BOLD decreases ("deactivations") deserve extra caution. In sensory cortex, which is where most vision research happens, the standard model seems to hold reasonably well.

### The hemodynamic response function

The hemodynamic response function (HRF) describes how the BOLD signal evolves over time after a brief neural event.

<img src="/blog/fmri-diagrams/hrf-curve.svg" alt="Hemodynamic response function showing the characteristic BOLD signal shape over time" />

A typical HRF has these phases:
- Initial dip (0-2 seconds): a small, brief signal decrease, possibly because oxygen is consumed before blood flow catches up. It's subtle and often not observed.
- Rise to peak (2-6 seconds): blood flow overshoots demand and the signal peaks around 5-6 seconds after the neural event.
- Return to baseline (6-12 seconds): blood flow normalizes.
- Post-stimulus undershoot (12-30 seconds): the signal dips slightly below baseline before it settles.

So if you show someone two images 500 ms apart, their BOLD responses overlap almost completely. This doesn't mean you have to wait 30 seconds between stimuli, though. To a first approximation, overlapping responses add up linearly, which is what allows the analysis to separate them later in rapid event-related designs, especially if you jitter the timing between trials. At very fast presentation rates this linearity starts to break down and responses saturate, so there are limits. We'll get into this properly in [Part 4](/blog/fmri-crash-course-4-recording-experiments).

## Pros and cons of fMRI

### The good stuff

It's non-invasive and safe. There's no ionizing radiation, usually no injections, and no surgery, so you can scan the same person many times. That makes longitudinal studies and large, densely sampled datasets possible.

The spatial resolution is good. Standard fMRI at 3T gives you 2-3 mm voxels, which is enough to map visual field maps, category-selective regions, and fine-grained activity patterns within a region. With 7T scanners and sub-millimeter voxels, specialized studies can even look at differences between cortical layers, but that's far from routine.

You get whole-brain coverage. Unlike electrophysiology, where you sample from a few locations, fMRI records from (more or less) the whole brain in every volume.

It's widely available, the analysis software is mature, and there's a large community to learn from.

### The not-so-good stuff

The temporal resolution is poor. The BOLD response peaks 5-6 seconds after neural activity, and even with fast acquisition (a TR of 1 second or less) you're measuring a slow, smoothed version of neural dynamics.

It's an indirect measure. You're measuring changes in blood oxygenation, not neural firing, and as the discordant voxel results show, the relationship between the two can vary across brain regions, populations, and conditions.

It's expensive. Scanner time typically costs somewhere around $500-1000 per hour, and a full study can easily run into six figures.

It's sensitive to motion. Head movement of even 1-2 mm can ruin your data. Motion correction helps but doesn't fully solve the problem, and if participants move more in one condition than another, you can get spurious effects.

It's loud (around 100 dB from the switching gradient coils) and the bore is narrow, which some people can't tolerate.

### Field strength

A rough comparison of the field strengths you'll come across (SNR is the signal-to-noise ratio):

| Field Strength | Typical voxel size | SNR | Availability | Mostly used for |
|----------------|-------------------|-----|--------------|----------|
| 1.5T | ~3-4 mm | Lower | Common in hospitals | Clinical scanning |
| 3T | ~2-3 mm | Good | Most research centers | Standard cognitive fMRI |
| 7T | <1 mm possible | Highest | Specialized centers | High-resolution mapping, layer studies |

Higher field strength gives you a higher SNR, which you can spend on smaller voxels or faster scanning. It also brings more artifacts, especially near air-tissue boundaries, and more expensive hardware. For vision research, 3T is the standard choice. [Part 4](/blog/fmri-crash-course-4-recording-experiments) goes into the trade-offs in more detail.

## What does fMRI data actually look like?

### 4D volumes and voxels

An fMRI dataset is a 4D volume: three spatial dimensions (x, y, z) plus time. At each time point you have a 3D image of the brain divided into small cubes called voxels (volumetric pixels), typically 2-3 mm on each side.

A typical scan might be 64 x 64 x 40 voxels, with a new volume acquired every 2 seconds (the repetition time, TR) for 10 minutes. That gives you 300 time points, i.e. 300 complete 3D brain images.

<img src="/blog/fmri-diagrams/4d-volume.svg" alt="A stack of brain volumes acquired over time, with one voxel highlighted and its signal plotted as a time series" />

*Each 3D volume contains ~160,000 voxels. A 10-minute scan with TR=2s yields 300 volumes, which together form a 4D dataset.*

### Time series

For each voxel you have a time series of signal intensities across the scan, and the analysis looks for voxels whose time series relate to your experimental conditions.

The raw values are in arbitrary units, so what matters is the relative change. Differences of 1-2% between conditions are typical for task effects at 3T, which is why people often convert to percent signal change.

### Loading fMRI data in Python

The standard library for reading neuroimaging files in Python is nibabel. Here's how you'd load and inspect an fMRI run:

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
# The 4th zoom is only the TR if the header's time units are set correctly
# (check img.header.get_xyzt_units()). For BIDS data, the RepetitionTime
# field in the JSON sidecar (sub-01_task-visual_bold.json) is the reliable source.
print(f"TR (seconds, from header): {voxel_size[3]}")

# Extract the time series from a single voxel
voxel_timeseries = data[32, 32, 20, :]
print(f"Time series length: {len(voxel_timeseries)}")

# Compute mean signal across time for a single volume
mean_volume = np.mean(data, axis=3)
print(f"Mean volume shape: {mean_volume.shape}")
```

Everything that follows in this series (preprocessing, modeling, statistics) comes down to manipulating 4D arrays like this one. The large datasets from [Part 2](/blog/fmri-crash-course-2-neuroimaging-vision), NSD, THINGS-data and LAION-fMRI, come in exactly this form.

---

## Summary

- MRI uses a strong magnetic field and RF pulses to measure signal from hydrogen protons, and differences in relaxation (T1, T2, T2*) between tissues create image contrast.
- fMRI measures the BOLD signal with T2*-weighted EPI. Deoxyhemoglobin shortens T2*, so when blood flow brings in extra oxygenated blood, the signal goes up.
- BOLD is an indirect measure of neural activity, and its coupling to metabolism isn't the same everywhere in the brain.
- The hemodynamic response peaks 5-6 seconds after neural activity, but overlapping responses add up roughly linearly, so rapid designs still work.
- fMRI data is a 4D array: 3D brain volumes sampled every 0.5-2 seconds, typically at 2-3 mm resolution.

---

Now that we know what fMRI measures, the next post covers how to actually record fMRI data and design experiments that work well with it.

**Next:** [Part 4: Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)

**Previous:** [Part 2: Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision)

---

## References

### Foundational MRI Physics Resources

- Brown RW, Cheng YC, Haacke EM, Thompson MR, Venkatesan R. [Magnetic Resonance Imaging: Physical Principles and Sequence Design](https://www.wiley.com/en-us/Magnetic+Resonance+Imaging:+Physical+Principles+and+Sequence+Design,+2nd+Edition-p-9780471720850) (2nd ed). Wiley, 2014. *The standard technical reference for MRI physics.*

- Huettel SA, Song AW, McCarthy G. [Functional Magnetic Resonance Imaging](https://global.oup.com/academic/product/functional-magnetic-resonance-imaging-9780878936274) (3rd ed). Sinauer Associates/Oxford University Press. *The standard fMRI textbook, and very readable.*

- Poldrack RA, Mumford JA, Nichols TE. [Handbook of Functional MRI Data Analysis](https://www.cambridge.org/core/books/handbook-of-functional-mri-data-analysis/8EDF966C65811FCCC306F7C916228529). Cambridge University Press, 2011. *Practical guide to fMRI analysis methods.*

- [Andy's Brain Book](https://andysbrainbook.readthedocs.io/). *Free online tutorials for learning fMRI analysis with FSL, SPM, and AFNI.*

### BOLD Signal and Hemodynamic Response

- Ogawa S, Lee TM, Kay AR, Tank DW. [Brain magnetic resonance imaging with contrast dependent on blood oxygenation](https://www.pnas.org/doi/10.1073/pnas.87.24.9868). PNAS 1990;87(24):9868-9872. *The original paper introducing BOLD contrast.*

- Kwong KK, Belliveau JW, Chesler DA, et al. [Dynamic magnetic resonance imaging of human brain activity during primary sensory stimulation](https://pubmed.ncbi.nlm.nih.gov/1608978/). PNAS 1992;89(12):5675-5679. *One of the first demonstrations of BOLD fMRI in humans, using visual and motor tasks.*

- Logothetis NK, Pauls J, Augath M, Trinath T, Oeltermann A. [Neurophysiological investigation of the basis of the fMRI signal](https://www.nature.com/articles/35084005). Nature 2001;412(6843):150-157. *Simultaneous electrophysiology and fMRI linking BOLD to neural activity.*

- Glover GH. Deconvolution of impulse response in event-related BOLD fMRI. NeuroImage 1999;9(4):416-429. *Foundational work on estimating the hemodynamic response function.*

### Discordant Voxels and BOLD Interpretation

- Epp SM, Castrillón G, Yuan B, Andrews-Hanna J, Preibisch C, Riedl V. [BOLD signal changes can oppose oxygen metabolism across the human cortex](https://www.nature.com/articles/s41593-025-02132-9). Nature Neuroscience 2025. *Shows that BOLD and oxygen metabolism can change in opposite directions in a large fraction of voxels.*

### Scanner Field Strength Comparisons

- Barisano G, et al. [7T MRI Versus 3T MRI of the Brain](https://pmc.ncbi.nlm.nih.gov/articles/PMC10240322/). *Comparison of imaging quality and clinical sensitivity at different field strengths.*

- Trattnig S, et al. [Clinical Neuroimaging at 7T](https://www.mri.theclinics.com/article/S1064-9689(20)30066-0/fulltext). Magnetic Resonance Imaging Clinics 2021. *Review of 7T advantages and challenges for brain imaging.*
