---
title: "Assessing the Quality of fMRI Data"
description: "Common artifacts, quality metrics, and how to decide if your data is usable. Part 6 of an 8-part fMRI crash course."
date: 2025-04-14
draft: true
tags: ["fMRI", "neuroscience", "methods", "quality control"]
---

*This is Part 6 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You've collected your data and run it through preprocessing. Now you need to find out whether it's actually usable, and that's what quality assessment (QA) is for. Teves et al. (2023) make the case that QC deserves real attention and that it works best as a mix of automated metrics, which flag problems, and a human looking at the data, who figures out what caused them.

## Why QA matters

The best-documented example is head motion. Power et al. (2012), Van Dijk et al. (2012) and Satterthwaite et al. (2012) all showed that motion doesn't just add random noise to fMRI data - it produces systematic, spurious effects in functional connectivity. Motion inflates local, short-distance coupling and weakens longer-distance correlations, for example within the default network (Power et al., 2012; Van Dijk et al., 2012). That becomes a real problem as soon as you compare groups that differ in how much they move: in Power et al. (2012) the effects were strongest in children, and Satterthwaite et al. (2012) found that controlling for motion weakened the apparent relationship between age and connectivity in youth. Van Dijk et al. (2012) put it plainly: group differences in motion can produce maps that look like neuronal effects.

Registration failures are another classic. If a subject's functional data is misaligned to the anatomy or the template, you might think you're looking at the fusiform face area while actually picking up signal from somewhere else entirely.

No analysis method can rescue data like this, so the first job is to figure out whether your data is worth analyzing at all.

## Common artifacts and problems

### Motion

Head motion is the artifact with the best-documented consequences. Power et al. (2012) found systematic artifacts with movements of a few tenths of a millimeter or less. Two mechanisms are usually invoked: a voxel sits next to tissues with different signal intensities, so when the head moves it samples a different mix of them, and movement disturbs the spin history of the tissue (Power et al., 2014). Either way, the result is a signal change that has nothing to do with neural activity.

There are two standard metrics (Power et al., 2012). Framewise displacement (FD) measures how much the head moved from one volume to the next: the absolute volume-to-volume changes of the six realignment parameters are summed into a single number in millimeters. An FD of 0.5 mm doesn't sound like much, but Power et al. (2014) found measurable changes in correlations at FD as low as 0.15-0.2 mm, and pronounced ones at 0.5 mm. DVARS (D for the temporal derivative of the time courses, VARS for RMS variance over voxels) is the root mean square of the volume-to-volume signal change across all brain voxels, so it measures how much the image intensity changed between consecutive volumes. Power et al. (2012) used the two together: when DVARS spikes at the same time points as FD, the motion actually affected your signal.

![FD and DVARS correlation](/blog/fmri-diagrams/fd-dvars-correlation.svg)
*Simulated FD and DVARS traces (illustrative, not real data). When the head moves (high FD), image intensity changes across the brain (high DVARS), so the two metrics spike together.*

You usually don't need to compute FD yourself: fMRIPrep's confounds file already has a `framewise_displacement` column computed with Power's formula ([fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)), where rotations are converted to millimeters as displacement on a sphere of radius 50 mm (Power et al., 2012). It also has a `std_dvars` column. Standardized DVARS divides DVARS by its expected value under a simple noise model, so well-behaved volumes sit near 1 and bad ones well above it (Nichols, 2017; Afyouni & Nichols, 2018). Nilearn's `load_confounds` can read that file for you and also give you a sample mask that drops high-motion volumes; its default thresholds of 0.5 mm FD and 1.5 standardized DVARS match fMRIPrep's defaults ([nilearn docs](https://nilearn.github.io/stable/modules/generated/nilearn.interfaces.fmriprep.load_confounds.html)):

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

The result should match fMRIPrep's `framewise_displacement` column (which has `n/a` in the first row, as in the example table in the [fMRIPrep docs](https://fmriprep.org/en/stable/outputs.html)).

The difference between a low-motion and a high-motion subject is easy to see:

![FD comparison between subjects](/blog/fmri-diagrams/fd-comparison.svg)
*Simulated FD traces for two illustrative subjects (not real data). The low-motion subject (top) stays well below 0.2 mm with only occasional small spikes. The high-motion subject (bottom) has restless stretches above 0.5 mm and spikes above 1 mm, and would likely be flagged for exclusion or heavy censoring.*

### Signal dropout near air-tissue interfaces

The brain sits right next to air-filled cavities and bone: the sinuses behind your forehead and the ear canals. Near these structures the magnetic field becomes inhomogeneous, which causes signal loss in gradient-echo EPI (Ojemann et al., 1997). Orbitofrontal cortex and the medial and inferior temporal lobes are hit hardest (Volz et al., 2019).

Preprocessing can't fix this: distortion can be corrected after the fact, but signal dropout cannot be recovered and has to be dealt with at acquisition (Volz et al., 2019). You need to look at your data to see which regions are affected. For vision research the relevant detail is that the signal loss Ojemann et al. (1997) mapped in the inferior lateral temporal lobe included part of the fusiform gyrus, so check coverage there if you care about object or face areas.

### Ghosting and ringing

Ghosting shows up as faint copies of the brain shifted along the phase-encoding direction (Provins et al., 2022). In EPI the typical case is the Nyquist ghost, shifted by half the field of view, which comes from a phase mismatch between the odd and even echoes that EPI reads out in alternating directions (Giannelli et al., 2010). Ringing (Gibbs ringing) looks like ripples confined to the neighborhood of sharp intensity steps at tissue boundaries, whereas motion ripples tend to span the whole brain (Provins et al., 2022).

Both originate during acquisition, so the main thing to do at the QA stage is to spot them. In their QC protocol, Provins et al. (2022) excluded a scan when the ghosts were about as bright as the inside of the brain.

### Registration failures

Spatial normalization is supposed to align everyone's brain to a common template. When it fails, you end up comparing different brain regions across subjects. The failure modes that the QC protocol of Provins et al. (2022) checks for are:

- The functional and anatomical images don't line up (EPI-to-T1 registration failure)
- The anatomical image doesn't line up with the template (T1-to-template failure)
- The brain mask has holes over brain tissue, or includes bits of skull

<img src="/blog/fmri-diagrams/registration-check.svg" alt="Two sagittal slices of a functional image with the anatomical white-matter boundary drawn on top: aligned on the left, shifted and rotated on the right" />

*Simulated registration check. On the left the white-matter boundary from the T1w image follows the functional image; on the right the functional image is shifted and rotated, so the boundary cuts across tissue. This is what the fMRIPrep report overlays let you check.*

These failures are usually obvious once you look, but you do have to look.

## QA tools and what to look for

### MRIQC: automated quality metrics

[MRIQC](https://mriqc.readthedocs.io/) computes a set of image quality metrics (IQMs) for every scan in a BIDS dataset and writes an individual HTML report per subject plus a group report (Esteban et al., 2017):

```bash
mriqc /path/to/bids_dataset /path/to/output participant --participant-label 01 02 03
mriqc /path/to/bids_dataset /path/to/output group
```

The group report shows where each scan falls relative to the others, which is what Provins et al. (2022) recommend using it for on a single-site dataset: spot the outliers in the IQM distributions, then look at those scans' individual reports. For functional data the metrics include ([MRIQC BOLD IQMs](https://mriqc.readthedocs.io/en/latest/iqms/bold.html)):

- FD and DVARS summaries (mean FD, number and percentage of volumes above an FD threshold, standardized DVARS)
- tSNR (temporal signal-to-noise ratio): the median over voxels of the mean signal divided by its standard deviation over time
- SNR: signal-to-noise ratio
- FBER (foreground-to-background energy ratio): the mean energy inside the head relative to outside it
- EFC (entropy focus criterion): uses the entropy of voxel intensities as an indicator of ghosting and blurring caused by head motion ([MRIQC structural IQMs](https://mriqc.readthedocs.io/en/latest/iqms/t1w.html))

### fMRIPrep HTML reports

If you preprocessed with fMRIPrep (see [Part 5](/blog/fmri-crash-course-5-preprocessing)), you get detailed HTML reports for free. Things to check, following Provins et al. (2022) unless noted:

1. Brain mask: does it follow the contour of the brain, without holes and without bumps that include non-brain tissue?
2. T1-to-template registration: flip between the subject's brain and the template. Are the ventricles, subcortical structures and corpus callosum aligned?
3. Functional-to-anatomical registration: intensity edges and landmarks like the ventricles and corpus callosum should line up.
4. Susceptibility distortion correction: compare before and after. Is there residual distortion?
5. Confound correlation matrix: which confounds are highly correlated with each other and with the global signal ([fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html))?
6. Carpet plot and motion traces (see below)

### Carpet plots (grayplots)

Carpet plots (Power, 2017) show the time series of every voxel as one big image: time on the x-axis, voxels on the y-axis, signal as color. Power (2017) argues that summary traces like DVARS mostly reflect what is already visible in the plot, and that some artifacts show up only in the temporal structure it displays. In Power's version each voxel's mean and linear trend are removed and gray matter is plotted separately from white matter and CSF. Nilearn's `plot_carpet` detrends and z-scores each time series by default ([nilearn docs](https://nilearn.github.io/stable/modules/generated/nilearn.plotting.plot_carpet.html)), and fMRIPrep groups the rows into cortical gray matter, deep gray matter, white matter plus CSF, cerebellum, and a brain-edge "crown" ([fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)).

What to look for (Power, 2017; Provins et al., 2022):

- Vertical bands are bad. They mean the signal changed in many voxels at the same moment. Head motion disrupts the signal across gray and white matter when it happens, and some large motions and deep breaths are followed by a dark band of brain-wide signal decrease.
- A strongly structured crown region in fMRIPrep's plot is a sign that artifacts are affecting the scan.
- Fine-grained "static" is thermal noise and is expected.

<img src="/blog/fmri-diagrams/carpet-plot.svg" alt="Two simulated carpet plots with framewise displacement on top: a clean run with uniform texture, and a run with motion showing vertical bands at the FD spikes" />

*Simulated carpet plots. Each row is one voxel's z-scored time series, grouped by tissue class. The motion spikes in FD line up with vertical bands that cut across every tissue class.*

### Manual inspection with FSLeyes

Sometimes you just need to look at the data yourself, for example in [FSLeyes](https://open.oxcin.ox.ac.uk/pages/fsl/fsleyes/fsleyes/userdoc/), the FSL image viewer:

```bash
fsleyes sub-01_task-faces_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz \
        MNI152_T1_2mm.nii.gz
```

Scroll through the time series and look for sudden jumps, check alignment with the template, look for dropout, and check brain coverage. Provins et al. (2022), for example, left the cerebellum out of their QC criteria because it fell outside the field of view in a number of their scans.

## Checks specific to vision experiments

Everything above applies to any fMRI study. For vision experiments there are a few extra checks that I'd always run, because they test whether the experiment itself worked rather than just whether the images look OK.

### Does early visual cortex respond?

Fit a quick sanity GLM for every run with a single regressor, stimulus vs. baseline (fixation). Any visual experiment should produce strong activation in occipital cortex in every single run. If one run doesn't show it, something went wrong: the timing log doesn't match the data, the scanner trigger was missed or recorded wrong, or the participant had their eyes closed or fell asleep. This takes a few minutes to set up (GLMs are covered in [Part 7](/blog/fmri-crash-course-7-analysis-glm)) and catches problems that no image quality metric will.

### Response reliability

If your design repeats images, you can check how reliable the responses are. NSD shows each image up to three times (Allen et al., 2022), THINGS-fMRI repeats 100 test images 12 times (Hebart et al., 2023), and LAION-fMRI has up to 12 repeats of its shared images (Zerbe et al., 2026). Estimate single-trial betas ([Part 7](/blog/fmri-crash-course-7-analysis-glm) shows how), split the repetitions of each image into two halves (e.g. odd vs. even repetitions), average within each half, and correlate the two halves across images, separately for each voxel. In visual cortex you should see clearly positive reliabilities: NSD reports its highest noise ceilings in occipital cortex (Allen et al., 2022), and THINGS-fMRI reaches noise ceilings of up to about 80% in early visual cortex for the averaged test-set responses (Hebart et al., 2023). If you don't see this, your betas are mostly noise, and that's something to sort out before running any fancy analysis.

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

Plotting `r` on the brain is a good sanity check in itself: reliability should be highest in visual cortex and fall off elsewhere. NSD uses a more principled version of the same idea, the noise ceiling SNR (ncsnr), which estimates the ratio of signal variability across images to trial-to-trial noise variability across repetitions and converts that into a noise ceiling for each voxel (Allen et al., 2022). Allen et al. also point out the direct link to split-half reliability: the correlation between two sets of responses to the same images, times 100, equals the single-trial noise ceiling in percent.

<img src="/blog/fmri-diagrams/split-half-reliability.svg" alt="Histograms of split-half reliability: voxels outside visual cortex center on zero, early visual cortex voxels center around 0.5" />

*Simulated. In a healthy dataset, voxels in early visual cortex have clearly positive split-half reliability while the rest of the brain centers on zero. If visual cortex looks like the gray distribution, something went wrong.*

### Eye tracking

Most vision experiments ask participants to fixate, and if they don't, your retinotopic responses get smeared and your stimuli land on different parts of the visual field than you think. If you recorded eye tracking, compute the fraction of time gaze stayed within some radius of the fixation point. NSD reports the share of time within 1 degree of central fixation, which ranged from 68% to 97% across participants (Allen et al., 2022), and the THINGS MEG data used the same 1 degree criterion (Hebart et al., 2023). Also look at long eyelid closures, which Wang et al. (2016) used as a marker of low arousal in sleep-deprived participants. Decide on exclusion criteria for trials or runs, and report how many you excluded.

<img src="/blog/fmri-diagrams/fixation-qc.svg" alt="Two scatter plots of gaze positions: one participant fixates tightly inside a 1 degree window, another often looks away toward the stimuli" />

*Simulated eye-tracking data. Summarizing each run as the fraction of samples inside a fixation window makes it easy to spot participants or runs to exclude.*

### Behavioral performance

Many vision experiments include a simple task to keep people attentive. In THINGS-fMRI, for example, participants pressed a button whenever an unrecognizable catch image appeared (Hebart et al., 2023). Low hit rates or lots of false alarms tell you the participant wasn't paying attention in that run, which is useful when you're deciding whether a run with weak visual responses should be dropped.

## Practical thresholds and exclusion criteria

People always want concrete numbers here. There is no definitive cutoff - Power et al. (2014) found that the effect of motion on the data is gradual - but these are published values you can anchor on:

| Metric | Threshold | Used for |
|--------|-----------|----------|
| FD of a single volume | > 0.5 mm | Flag the volume (fMRIPrep default; Power et al., 2012) |
| FD of a single volume | > 0.2 mm | Flag the volume, stringent (Power et al., 2014) |
| Standardized DVARS of a single volume | > 1.5 | Flag the volume (fMRIPrep default) |
| Mean FD | > 0.55 mm | Exclude participant, lenient (Parkes et al., 2018) |
| Mean FD | > 0.25 mm | Exclude participant, stringent (Parkes et al., 2018) |
| % volumes with FD > 0.2 mm | > 20% | Exclude participant, stringent (Parkes et al., 2018) |
| Max FD | > 5 mm | Exclude participant, stringent (Parkes et al., 2018) |

The fMRIPrep defaults are the `--fd-spike-threshold` and `--dvars-spike-threshold` options ([fMRIPrep usage docs](https://fmriprep.org/en/stable/usage.html)). Note that the participant-level criteria come from a benchmark of resting-state connectivity pipelines, not from task fMRI. For tSNR I don't know of an established absolute cutoff, and one would not transfer well anyway, since tSNR depends on voxel size and field strength (Triantafyllou et al., 2005). Compare runs and subjects within your own dataset instead and look into the ones that stand out, which is also what MRIQC's group report is for.

For individual high-motion volumes you have a few options:

1. Censoring ("scrubbing"): remove those volumes from the analysis. Adding a spike regressor per bad volume to your GLM is equivalent (Power et al., 2014).
2. Interpolation: Power et al. (2014) fill in censored volumes with values interpolated from the uncensored data, but only so that temporal filtering doesn't smear the artifact into neighboring volumes; the interpolated volumes are removed again afterwards.
3. Run exclusion: if too little data survives censoring, drop the whole run. Power et al. (2014) dropped runs with fewer than 50 remaining volumes, while noting that this rule has no particular empirical support.
4. Subject exclusion: Power et al. (2014) excluded participants with fewer than 125 uncensored volumes, about 5 minutes of data, and Parkes et al. (2018) excluded those left with less than 4 minutes.

There is a trade-off here. Censoring reduces motion artifact but costs degrees of freedom (Ciric et al., 2017), and Parkes et al. (2018) found that much of the benefit of censoring came from excluding high-motion participants altogether.

## Being transparent about exclusions

The COBIDAS report (Nichols et al., 2016) asks that quality control criteria be specified, including the metrics and thresholds of any automated checks, and that data excluded by scrubbing or other denoising be reported. In practice that means stating which QA metrics you computed (FD, DVARS, tSNR, ...), which thresholds you used for flagging or exclusion, how many subjects, runs and trials were excluded and why, and whether you censored volumes and how many. Ideally you define the criteria before you look at the results; COBIDAS recommends registering the analysis before exploring the data. Here is a made-up example:

> "Data quality was assessed using MRIQC and fMRIPrep visual reports. Subjects were excluded if mean framewise displacement exceeded 0.5 mm or if more than 20% of volumes had FD > 0.5 mm. Based on these criteria, 3 of 28 subjects were excluded from analysis. For remaining subjects, individual volumes with FD > 0.5 mm were censored by including spike regressors in the GLM (mean 4.2% of volumes per subject, range 0-12%)."

Please don't bury exclusions in the supplementary materials. Readers need to know how much data you threw away and why.

## Summary

- Motion is the main threat: know mean FD, max FD and the share of high-motion volumes for every run, and remember it can create systematic, not just random, effects.
- Run MRIQC and read the fMRIPrep reports for every dataset, and actually look at registration and carpet plots.
- For vision experiments, also check that visual cortex responds in every run, that responses to repeated images are reliable, and that participants fixated and paid attention.
- Treat thresholds as anchors rather than hard truths, set them before looking at results, and report all exclusions.

---

With quality-checked data in hand, we can finally analyze it. Next up is the General Linear Model, the workhorse of fMRI analysis.

**Next:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Previous:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)

## References

### Motion: effects and metrics
- Power JD, Barnes KA, Snyder AZ, Schlaggar BL, Petersen SE (2012). [Spurious but systematic correlations in functional connectivity MRI networks arise from subject motion](https://pmc.ncbi.nlm.nih.gov/articles/PMC3254728/). NeuroImage 59(3):2142-2154.
- Van Dijk KRA, Sabuncu MR, Buckner RL (2012). [The influence of head motion on intrinsic functional connectivity MRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3683830/). NeuroImage 59(1):431-438.
- Satterthwaite TD, Wolf DH, Loughead J, Ruparel K, Elliott MA, Hakonarson H, Gur RC, Gur RE (2012). [Impact of in-scanner head motion on multiple measures of functional connectivity: Relevance for studies of neurodevelopment in youth](https://doi.org/10.1016/j.neuroimage.2011.12.063). NeuroImage 60(1):623-632.
- Power JD, Mitra A, Laumann TO, Snyder AZ, Schlaggar BL, Petersen SE (2014). [Methods to detect, characterize, and remove motion artifact in resting state fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3849338/). NeuroImage 84:320-341.
- Nichols TE (2017). [Notes on creating a standardized version of DVARS](https://arxiv.org/abs/1704.01469). arXiv:1704.01469 (notes originally from 2013).
- Afyouni S, Nichols TE (2018). [Insight and inference for DVARS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5915574/). NeuroImage 172:291-312.
- Ciric R, Wolf DH, Power JD, et al. (2017). [Benchmarking of participant-level confound regression strategies for the control of motion artifact in studies of functional connectivity](https://pmc.ncbi.nlm.nih.gov/articles/PMC5483393/). NeuroImage 154:174-187.
- Parkes L, Fulcher B, Yücel M, Fornito A (2018). [An evaluation of the efficacy, reliability, and sensitivity of motion correction strategies for resting-state functional MRI](https://doi.org/10.1016/j.neuroimage.2017.12.073). NeuroImage 171:415-436.

### Other artifacts
- Ojemann JG, Akbudak E, Snyder AZ, McKinstry RC, Raichle ME, Conturo TE (1997). [Anatomic localization and quantitative analysis of gradient refocused echo-planar fMRI susceptibility artifacts](https://doi.org/10.1006/nimg.1997.0289). NeuroImage 6(3):156-167.
- Volz S, Callaghan MF, Josephs O, Weiskopf N (2019). [Maximising BOLD sensitivity through automated EPI protocol optimisation](https://pmc.ncbi.nlm.nih.gov/articles/PMC6435104/). NeuroImage 189:159-170.
- Giannelli M, Diciotti S, Tessa C, Mascalchi M (2010). [Characterization of Nyquist ghost in EPI-fMRI acquisition sequences implemented on two clinical 1.5 T MR scanner systems: effect of readout bandwidth and echo spacing](https://pmc.ncbi.nlm.nih.gov/articles/PMC5720418/). Journal of Applied Clinical Medical Physics 11(4):3237.
- Triantafyllou C, Hoge RD, Krueger G, Wiggins CJ, Potthast A, Wiggins GC, Wald LL (2005). [Comparison of physiological noise at 1.5 T, 3 T and 7 T and optimization of fMRI acquisition parameters](https://doi.org/10.1016/j.neuroimage.2005.01.007). NeuroImage 26(1):243-250.

### QC tools and protocols
- Esteban O, Birman D, Schaer M, Koyejo OO, Poldrack RA, Gorgolewski KJ (2017). [MRIQC: Advancing the automatic prediction of image quality in MRI from unseen sites](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0184661). PLOS ONE 12(9): e0184661.
- Provins C, MacNicol E, Seeley SH, Hagmann P, Esteban O (2022). [Quality control in functional MRI studies with MRIQC and fMRIPrep](https://www.frontiersin.org/journals/neuroimaging/articles/10.3389/fnimg.2022.1073734/full). Frontiers in Neuroimaging 1:1073734.
- Teves JB, Gonzalez-Castillo J, Holness M, Spurney M, Bandettini PA, Handwerker DA (2023). [The art and science of using quality control to understand and improve fMRI data](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2023.1100544/full). Frontiers in Neuroscience 17:1100544.
- Power JD (2017). [A simple but useful way to assess fMRI scan qualities](https://pmc.ncbi.nlm.nih.gov/articles/PMC5296400/). NeuroImage 154:150-158.
- Documentation: [MRIQC BOLD IQMs](https://mriqc.readthedocs.io/en/latest/iqms/bold.html), [fMRIPrep outputs](https://fmriprep.org/en/stable/outputs.html), [fMRIPrep usage](https://fmriprep.org/en/stable/usage.html), [nilearn load_confounds](https://nilearn.github.io/stable/modules/generated/nilearn.interfaces.fmriprep.load_confounds.html), [nilearn plot_carpet](https://nilearn.github.io/stable/modules/generated/nilearn.plotting.plot_carpet.html), [FSLeyes](https://open.oxcin.ox.ac.uk/pages/fsl/fsleyes/fsleyes/userdoc/)

### Vision datasets and reliability
- Allen EJ, St-Yves G, Wu Y, Breedlove JL, Prince JS, Dowdle LT, Nau M, Caron B, Pestilli F, Charest I, Hutchinson JB, Naselaris T, Kay K (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. Nature Neuroscience 25:116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)
- Hebart MN, Contier O, Teichmann L, Rockter AH, Zheng CY, Kidder A, Corriveau A, Vaziri-Pashkam M, Baker CI (2023). [THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior](https://doi.org/10.7554/eLife.82580). eLife 12:e82580.
- Zerbe J, Roth J, Mell MM, Herholz P, Knapen T, Hebart MN (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset website](https://laion-fmri.hebartlab.com) | [AWS Open Data](https://registry.opendata.aws/laion-fmri/)
- Wang C, Ong JL, Patanaik A, Zhou J, Chee MWL (2016). [Spontaneous eyelid closures link vigilance fluctuation with fMRI dynamic connectivity states](https://pmc.ncbi.nlm.nih.gov/articles/PMC5003283/). PNAS 113(34):9653-9658.

### Reporting
- Nichols TE, Das S, Eickhoff SB, Evans AC, Glatard T, Hanke M, Kriegeskorte N, Milham MP, Poldrack RA, Poline JB, Proal E, Thirion B, Van Essen DC, White T, Yeo BTT (2016). [Best practices in data analysis and sharing in neuroimaging using MRI](https://doi.org/10.1101/054262) (COBIDAS report). bioRxiv 054262. Summarized in Nature Neuroscience 20:299-303 (2017).
