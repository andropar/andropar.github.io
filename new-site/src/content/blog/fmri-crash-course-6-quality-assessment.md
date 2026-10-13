---
title: "Assessing the Quality of fMRI Data"
description: "Common artifacts, quality metrics, and how to decide if your data is usable. Part 6 of an 8-part fMRI crash course."
date: 2025-04-14
draft: true
tags: ["fMRI", "neuroscience", "methods", "quality control"]
---

*This is Part 6 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You've collected your data and run it through preprocessing. Now you need to find out whether it's actually usable, and that's what quality assessment (QA) is for. It's often treated as an afterthought, which I think is a mistake: problems you miss here will quietly end up in every analysis you run later.

## Why QA matters

The best-documented example is head motion. Power et al. (2012), Van Dijk et al. (2012) and Satterthwaite et al. (2012) all showed that motion doesn't just add random noise to fMRI data - it produces systematic, spurious effects in functional connectivity. Short-range correlations go up, long-range correlations go down, and the size of the effect scales with how much a person moved. That becomes a real problem as soon as you compare groups that differ in how much they move, like children vs. adults or patients vs. controls, because a "group difference" can then simply be a motion difference.

Registration failures are another classic. If a subject's functional data is misaligned to the anatomy or the template, you might think you're looking at the fusiform face area while actually picking up signal from somewhere else entirely.

No analysis method can rescue data like this, so the first job is to figure out whether your data is worth analyzing at all.

## Common artifacts and problems

### Motion

Head motion is the biggest threat to fMRI data quality. Even sub-millimeter movements can cause signal changes larger than the BOLD effects you're trying to detect. The basic reason is simple: when the head moves, a voxel that was sampling gray matter is suddenly sampling partly white matter or CSF, and that shows up as a signal jump that has nothing to do with neural activity.

There are two standard metrics. Framewise displacement (FD) measures how much the head moved from one volume to the next, combining rotations and translations into a single number in millimeters. An FD of 0.5 mm doesn't sound like much, but BOLD signal changes are typically only 1-3%, and motion effects can easily exceed that. DVARS (D for temporal derivative, VARS for variance) measures how much the image intensity changed between consecutive volumes across the whole brain. If DVARS spikes at the same time points as FD, the motion actually affected your signal.

![FD and DVARS correlation](/blog/fmri-diagrams/fd-dvars-correlation.svg)
*Simulated FD and DVARS traces (illustrative, not real data). When the head moves (high FD), image intensity changes across the brain (high DVARS), so the two metrics spike together.*

You usually don't need to compute FD yourself: fMRIPrep's confounds file already has a `framewise_displacement` column, computed with Power's definition (rotations converted to millimeters on a sphere with 50 mm radius). Nilearn's `load_confounds` can read that file for you and also give you a sample mask that drops high-motion volumes:

```python
from nilearn.interfaces.fmriprep import load_confounds

# Point it at the preprocessed BOLD file; it finds the matching confounds .tsv
confounds, sample_mask = load_confounds(
    "sub-01_task-faces_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz",
    strategy=("motion", "high_pass", "scrub"),
    motion="basic",            # the 6 rigid-body parameters
    fd_threshold=0.5,          # flag volumes with FD > 0.5 mm
    std_dvars_threshold=1.5,   # ...or standardized DVARS > 1.5
)
# sample_mask holds the indices of the volumes to keep
```

To understand what FD actually is, it helps to compute it once by hand from the motion parameters:

```python
import numpy as np
import pandas as pd


def compute_framewise_displacement(motion_params, radius=50):
    """
    Compute framewise displacement (Power et al., 2012) from motion parameters.

    Parameters
    ----------
    motion_params : array, shape (n_timepoints, 6)
        Columns: trans_x, trans_y, trans_z, rot_x, rot_y, rot_z.
        Translations in mm, rotations in radians.
    radius : float
        Head radius in mm (50 mm is the usual choice for adults).

    Returns
    -------
    fd : array, shape (n_timepoints,)
        Framewise displacement in mm (0 for the first volume).
    """
    # Convert rotations to mm of displacement on a sphere (arc length = angle * radius)
    motion_mm = motion_params.copy()
    motion_mm[:, 3:] = motion_params[:, 3:] * radius

    # Volume-to-volume differences, summed in absolute value
    fd = np.sum(np.abs(np.diff(motion_mm, axis=0)), axis=1)

    # The first volume has no predecessor
    return np.insert(fd, 0, 0)


confounds_df = pd.read_csv("sub-01_task-faces_desc-confounds_timeseries.tsv", sep="\t")
motion_cols = ["trans_x", "trans_y", "trans_z", "rot_x", "rot_y", "rot_z"]
fd = compute_framewise_displacement(confounds_df[motion_cols].values)

print(f"Mean FD: {fd.mean():.3f} mm")
print(f"Max FD: {fd.max():.3f} mm")
print(f"Volumes with FD > 0.5 mm: {(fd > 0.5).sum()}")
```

The result should match fMRIPrep's `framewise_displacement` column (which has `n/a` in the first row).

The difference between a low-motion and a high-motion subject is easy to see:

![FD comparison between subjects](/blog/fmri-diagrams/fd-comparison.svg)
*Simulated FD traces for two illustrative subjects (not real data). The low-motion subject (top) stays well below 0.2 mm with only occasional small spikes. The high-motion subject (bottom) has restless stretches above 0.5 mm and spikes above 1 mm, and would likely be flagged for exclusion or heavy censoring.*

### Signal dropout near air-tissue interfaces

The brain sits right next to air-filled cavities: the sinuses behind your forehead and the ear canals. At these air-tissue boundaries the magnetic field becomes inhomogeneous, which causes signal loss. Orbitofrontal cortex and the medial and anterior temporal lobes are hit hardest.

Preprocessing can't fix this - if the signal is gone, it's gone. You need to look at your data to see which regions are affected. For vision research, occipital cortex is usually fine, but ventral temporal regions (especially the anterior parts) can lose signal, so check coverage there if you care about object or face areas.

### Ghosting and ringing

Ghosting shows up as faint copies of the brain shifted along the phase-encoding direction, usually by half the field of view. It comes from inconsistencies in the raw frequency-space (k-space) data during acquisition. Ringing (Gibbs ringing) looks like ripples running parallel to high-contrast edges, for example at the boundary between brain and CSF or skull.

Both are acquisition problems. In preprocessing there's not much you can do beyond knowing they're there and keeping them in mind when interpreting results.

### Registration failures

Spatial normalization is supposed to align everyone's brain to a common template. When it fails, you end up comparing different brain regions across subjects. The usual failure modes are:

- The functional and anatomical images don't line up (EPI-to-T1 registration failure)
- The anatomical image doesn't line up with the template (T1-to-template failure)
- Brain extraction was too aggressive, or not aggressive enough

<img src="/blog/fmri-diagrams/registration-check.svg" alt="Two sagittal slices of a functional image with the anatomical white-matter boundary drawn on top: aligned on the left, shifted and rotated on the right" />

*Simulated registration check. On the left the white-matter boundary from the T1w image follows the functional image; on the right the functional image is shifted and rotated, so the boundary cuts across tissue. This is what the fMRIPrep report overlays let you check.*

These failures are usually obvious once you look, but you do have to look.

## QA tools and what to look for

### MRIQC: automated quality metrics

[MRIQC](https://mriqc.readthedocs.io/) computes a set of image quality metrics (IQMs) for every scan in a BIDS dataset and writes HTML reports for each scan, plus group-level summaries:

```bash
mriqc /path/to/bids_dataset /path/to/output participant --participant-label 01 02 03
mriqc /path/to/bids_dataset /path/to/output group
```

I find the group report the most useful part, because it shows where each scan falls relative to the others, and outliers stand out immediately. For functional data the metrics include:

- FD and DVARS summary statistics
- tSNR (temporal signal-to-noise ratio): how stable the signal is over time
- SNR: signal-to-noise ratio
- FBER (foreground-to-background energy ratio): how much energy is inside the brain vs. outside
- EFC (entropy focus criterion): sensitive to ghosting and motion-related blurring

### fMRIPrep HTML reports

If you preprocessed with fMRIPrep (see [Part 5](/blog/fmri-crash-course-5-preprocessing)), you get detailed HTML reports for free. Things to check:

1. Brain mask: does it capture all brain tissue without including skull?
2. T1-to-template registration: flip between the subject's brain and the template. Any obvious misalignment?
3. Functional-to-anatomical registration: the anatomical tissue boundaries should follow the structure in the functional image.
4. Susceptibility distortion correction: compare before and after. Did it help or make things worse?
5. Confound correlation matrix: which confounds are highly correlated with each other?
6. Carpet plot and motion traces (see below)

### Carpet plots (grayplots)

Carpet plots (Power, 2017) are one of the most informative QA visualizations. They show the time series of every voxel as one big image: time on the x-axis, voxels on the y-axis, signal as color. In the versions produced by fMRIPrep and nilearn, each voxel's time series is detrended and z-scored, and the voxels are grouped by tissue class (cortical gray matter, subcortical gray matter, white matter and CSF, sometimes cerebellum).

What to look for:

- Vertical stripes are bad. They mean the signal changed in many voxels at the same moment, which is usually motion or respiration.
- Horizontal bands are expected. They come from the grouping of voxels by tissue class, so different compartments look a bit different. Because every voxel is z-scored, they don't reflect differences in baseline signal level.
- A fairly uniform, random-looking texture is what clean data looks like.

<img src="/blog/fmri-diagrams/carpet-plot.svg" alt="Two simulated carpet plots with framewise displacement on top: a clean run with uniform texture, and a run with motion showing vertical bands at the FD spikes" />

*Simulated carpet plots. Each row is one voxel's z-scored time series, grouped by tissue class. The motion spikes in FD line up with vertical bands that cut across every tissue class.*

### Manual inspection with FSLeyes

Sometimes you just need to look at the data yourself. FSLeyes is the standard viewer for this:

```bash
fsleyes sub-01_task-faces_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz \
        MNI152_T1_2mm.nii.gz
```

Scroll through the time series and look for sudden jumps, check alignment with the template, look for dropout, and check brain coverage (did you clip the cerebellum or the frontal pole?).

## Checks specific to vision experiments

Everything above applies to any fMRI study. For vision experiments there are a few extra checks that I'd always run, because they test whether the experiment itself worked rather than just whether the images look OK.

### Does early visual cortex respond?

Fit a quick sanity GLM for every run with a single regressor, stimulus vs. baseline (fixation). Any visual experiment should produce strong activation in occipital cortex in every single run. If one run doesn't show it, something went wrong: the timing log doesn't match the data, the scanner trigger was missed or recorded wrong, or the participant had their eyes closed or fell asleep. This takes a few minutes to set up (GLMs are covered in [Part 7](/blog/fmri-crash-course-7-analysis-glm)) and catches problems that no image quality metric will.

### Response reliability

If your design repeats images, as NSD, THINGS-fMRI and LAION-fMRI do, you can check how reliable the responses are. Estimate single-trial betas ([Part 7](/blog/fmri-crash-course-7-analysis-glm) shows how), split the repetitions of each image into two halves (e.g. odd vs. even repetitions), average within each half, and correlate the two halves across images, separately for each voxel. In visual cortex you should see clearly positive reliabilities. If you don't, your betas are mostly noise, and that's something to sort out before running any fancy analysis.

```python
import numpy as np


def split_half_reliability(betas):
    """
    Per-voxel split-half reliability of single-trial betas.

    Parameters
    ----------
    betas : array, shape (n_images, n_reps, n_voxels)
        Single-trial betas, with repetitions of the same image along axis 1
        (needs at least 2 repetitions per image).

    Returns
    -------
    r : array, shape (n_voxels,)
        Correlation across images between odd- and even-repetition averages.
    r_sb : array, shape (n_voxels,)
        Spearman-Brown corrected estimate for the full number of repetitions.
    """
    odd = betas[:, 0::2].mean(axis=1)   # (n_images, n_voxels)
    even = betas[:, 1::2].mean(axis=1)

    # Pearson correlation per voxel, computed across images
    odd = (odd - odd.mean(0)) / odd.std(0)
    even = (even - even.mean(0)) / even.std(0)
    r = (odd * even).mean(0)

    r_sb = 2 * r / (1 + r)
    return r, r_sb
```

Plotting `r` on the brain is a good sanity check in itself: reliability should be highest in visual cortex and fall off elsewhere. NSD uses a more principled version of the same idea, the noise ceiling SNR (ncsnr), which estimates the ratio of signal variability across images to trial-to-trial noise variability across repetitions and converts that into a noise ceiling for each voxel (Allen et al., 2022).

<img src="/blog/fmri-diagrams/split-half-reliability.svg" alt="Histograms of split-half reliability: voxels outside visual cortex center on zero, early visual cortex voxels center around 0.5" />

*Simulated. In a healthy dataset, voxels in early visual cortex have clearly positive split-half reliability while the rest of the brain centers on zero. If visual cortex looks like the gray distribution, something went wrong.*

### Eye tracking

Most vision experiments ask participants to fixate, and if they don't, your retinotopic responses get smeared and your stimuli land on different parts of the visual field than you think. If you recorded eye tracking, compute the fraction of trials in which gaze stayed within some radius of the fixation point (1-2 degrees of visual angle is common) and look at blink rates and long eye closures, which are a decent proxy for drowsiness. Decide on exclusion criteria for trials or runs, and report how many you excluded.

<img src="/blog/fmri-diagrams/fixation-qc.svg" alt="Two scatter plots of gaze positions: one participant fixates tightly inside a 1.5 degree window, another often looks away toward the stimuli" />

*Simulated eye-tracking data. Summarizing each run as the fraction of samples inside a fixation window makes it easy to spot participants or runs to exclude.*

### Behavioral performance

Most vision experiments include a simple task to keep people attentive, for example pressing a button on catch trials (an oddball image, or a change of the fixation dot). Low hit rates or lots of false alarms tell you the participant wasn't paying attention in that run, which is useful when you're deciding whether a run with weak visual responses should be dropped.

## Practical thresholds and exclusion criteria

People always want concrete numbers here. Honestly, thresholds are somewhat arbitrary and depend on your study, but these are values you'll commonly see:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Mean FD | > 0.2 mm | Flag for inspection |
| Mean FD | > 0.5 mm | Consider exclusion |
| Max FD | > 5 mm | Likely exclude |
| % volumes with FD > 0.5 mm | > 20% | Consider exclusion |
| DVARS (standardized) | > 1.5 | Flag individual volumes |
| tSNR (whole brain) | < 50 | Flag for inspection |

Two caveats. First, tSNR depends heavily on voxel size, field strength and multiband factor, so an absolute cutoff like 50 doesn't transfer well between protocols. I'd compare runs and subjects within your own dataset and look into the ones that stand out. Second, for MVPA and other analyses of fine-grained patterns, people often use stricter FD thresholds, around 0.2-0.3 mm.

For individual high-motion volumes you have a few options:

1. Censoring ("scrubbing"): remove those volumes from the analysis, e.g. by adding a spike regressor per bad volume to your GLM.
2. Interpolation: replace bad volumes with interpolated values (more controversial).
3. Run exclusion: if too many volumes are bad (more than 20-30%), drop the whole run.
4. Subject exclusion: if several runs are bad, drop the subject.

My take is to be conservative. Losing a subject hurts less than including noisy data that adds variance and reduces your power to detect real effects.

## Being transparent about exclusions

Your methods section should state which QA metrics you computed (FD, DVARS, tSNR, ...), which thresholds you used for flagging or exclusion, how many subjects, runs and trials were excluded and why, and whether you censored volumes and how many. Ideally you define the criteria before you look at the results. For example:

> "Data quality was assessed using MRIQC and fMRIPrep visual reports. Subjects were excluded if mean framewise displacement exceeded 0.5 mm or if more than 20% of volumes had FD > 0.5 mm. Based on these criteria, 3 of 28 subjects were excluded from analysis. For remaining subjects, individual volumes with FD > 0.5 mm were censored by including spike regressors in the GLM (mean 4.2% of volumes per subject, range 0-12%)."

Please don't bury exclusions in the supplementary materials. Readers need to know how much data you threw away and why.

## Summary

- Motion is the main threat: know mean FD, max FD and the share of high-motion volumes for every run, and remember it can create systematic, not just random, effects.
- Run MRIQC and read the fMRIPrep reports for every dataset, and actually look at registration and carpet plots.
- For vision experiments, also check that visual cortex responds in every run, that responses to repeated images are reliable, and that participants fixated and paid attention.
- Treat thresholds as rough guides, set them before looking at results, and report all exclusions.

---

With quality-checked data in hand, we can finally analyze it. Next up is the General Linear Model, the workhorse of fMRI analysis.

**Next:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Previous:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)

## References

### MRIQC
- Esteban O, Birman D, Schaer M, Koyejo OO, Poldrack RA, Gorgolewski KJ (2017). [MRIQC: Advancing the automatic prediction of image quality in MRI from unseen sites](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0184661). PLOS ONE 12(9): e0184661.
- [MRIQC Documentation](https://mriqc.readthedocs.io/)

### Framewise Displacement and Motion QC
- Power JD, Barnes KA, Snyder AZ, Schlaggar BL, Petersen SE (2012). [Spurious but systematic correlations in functional connectivity MRI networks arise from subject motion](https://pmc.ncbi.nlm.nih.gov/articles/PMC3254728/). NeuroImage 59(3):2142-2154.
- Power JD, Mitra A, Laumann TO, Snyder AZ, Schlaggar BL, Petersen SE (2014). [Methods to detect, characterize, and remove motion artifact in resting state fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3849338/). NeuroImage 84:320-341.

### Carpet Plots (Grayplots)
- Power JD (2017). [A simple but useful way to assess fMRI scan qualities](https://pmc.ncbi.nlm.nih.gov/articles/PMC5296400/). NeuroImage 154:150-158.
- [Nilearn carpet plot documentation](https://nilearn.github.io/dev/modules/generated/nilearn.plotting.plot_carpet.html)

### Impact of Motion on fMRI Analysis
- Van Dijk KRA, Sabuncu MR, Buckner RL (2012). [The influence of head motion on intrinsic functional connectivity MRI](https://www.sciencedirect.com/science/article/abs/pii/S1053811911011815). NeuroImage 59:431-438.
- Satterthwaite TD, Wolf DH, Loughead J, et al. (2012). [Impact of in-scanner head motion on multiple measures of functional connectivity: Relevance for studies of neurodevelopment in youth](https://doi.org/10.1016/j.neuroimage.2011.07.044). NeuroImage 60:623-632.
- Ciric R, Wolf DH, Power JD, et al. (2017). [Benchmarking of participant-level confound regression strategies for the control of motion artifact in studies of functional connectivity](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5483393/). NeuroImage 154:174-187.
- Ciric R, Rosen AFG, Erus G, et al. (2018). [Mitigating head motion artifact in functional connectivity MRI](https://www.nature.com/articles/s41596-018-0065-y). Nature Protocols 13:2801-2826.

### Response Reliability
- Allen EJ, St-Yves G, Wu Y, Breedlove JL, Prince JS, Dowdle LT, Nau M, Caron B, Pestilli F, Charest I, Hutchinson JB, Naselaris T, Kay K (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. Nature Neuroscience 25:116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)

### Best Practices and Guidelines
- Nichols TE, Das S, Eickhoff SB, et al. (2017). [Best Practices in Data Analysis and Sharing in Neuroimaging using MRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC5685169/). Nature Neuroscience 20:299-303. (COBIDAS Report)
- [COBIDAS Checklist](https://www.humanbrainmapping.org/cobidas/)
- Williams PA, et al. (2023). [The art and science of using quality control to understand and improve fMRI data](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2023.1100544/full). Frontiers in Neuroscience 17:1100544.
- Provins C, et al. (2023). [Quality control in functional MRI studies with MRIQC and fMRIPrep](https://www.frontiersin.org/journals/neuroimaging/articles/10.3389/fnimg.2022.1073734/full). Frontiers in Neuroimaging 1:1073734.
