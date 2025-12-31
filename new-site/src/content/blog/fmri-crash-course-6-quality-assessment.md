---
title: "Assessing the Quality of fMRI Data"
description: "Common artifacts, quality metrics, and how to decide if your data is usable. Part 6 of an 8-part fMRI crash course."
date: 2025-04-14
draft: true
tags: ["fMRI", "neuroscience", "methods", "quality control"]
---

*This is Part 6 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You've collected your data and run it through preprocessing. But is it actually usable? Quality assessment (QA) is where you find out. And I'm going to be honest: this step is often treated as an afterthought, which is a mistake. I've seen entire studies compromised by data quality issues that should have been caught before any analysis began.

## Why QA matters more than you think

Here's a scenario I've witnessed more than once: a PhD student spends months analyzing their fMRI data, finds an interesting effect, writes it up, and then - during review or a lab meeting - someone asks to see the motion parameters. Turns out half the subjects had excessive head motion that was never addressed. The "effect" was driven by motion artifacts, not neural activity.

This isn't hypothetical. The fMRI field has been rocked by several high-profile failures related to data quality:

- **The "dead salmon" study** by Bennett et al. demonstrated that without proper multiple comparisons correction, you can find "significant" brain activations in a dead fish. While this was about statistical thresholds, it highlighted how easy it is to find spurious results when you're not rigorous.

- **Motion-related false positives** have been particularly problematic in developmental and clinical studies where patient groups often move more than controls. Several papers have had to be retracted or heavily caveated because group differences were confounded with motion.

- **Registration failures** can lead to mislocalized activations - you think you're looking at the fusiform face area, but actually your data is misaligned and you're picking up signal from a completely different region.

The bottom line: garbage in, garbage out. No amount of sophisticated analysis can save bad data. Your first job is to figure out if your data is even worth analyzing.

## Common artifacts and problems

### Motion: the enemy of fMRI

Head motion is the single biggest threat to fMRI data quality. Even sub-millimeter movements can cause massive signal changes that dwarf the tiny BOLD effects you're trying to detect. The physics is straightforward: when the head moves, voxels that were sampling gray matter are now sampling white matter or CSF. This shows up as signal spikes that have nothing to do with neural activity.

There are two key metrics you need to know:

**Framewise Displacement (FD)** measures how much the head moved from one volume to the next. It combines rotational and translational motion into a single number (in millimeters). An FD of 0.5 mm might not sound like much, but remember that your BOLD signal changes are typically 1-3% - motion effects can easily exceed that.

**DVARS** (D for temporal derivative, VARS for variance) measures how much the image intensity changed between consecutive volumes, across the whole brain. High DVARS at the same time points as high FD confirms that the motion actually affected your signal.

Here's how to compute framewise displacement yourself using nilearn:

```python
from nilearn.interfaces.fmriprep import load_confounds
import pandas as pd

# Load confounds from an fMRIPrep output
confounds, sample_mask = load_confounds(
    "sub-01_task-faces_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz",
    strategy=("motion", "high_pass"),
    motion="basic"
)

# Or compute FD manually from motion parameters
import numpy as np

def compute_framewise_displacement(motion_params, radius=50):
    """
    Compute framewise displacement from motion parameters.

    Parameters:
    -----------
    motion_params : array, shape (n_timepoints, 6)
        Columns: trans_x, trans_y, trans_z, rot_x, rot_y, rot_z
        Rotations should be in radians.
    radius : float
        Head radius in mm (default 50mm for adult human head)

    Returns:
    --------
    fd : array, shape (n_timepoints,)
        Framewise displacement in mm
    """
    # Convert rotations to mm (arc length = angle * radius)
    motion_mm = motion_params.copy()
    motion_mm[:, 3:] = motion_params[:, 3:] * radius

    # Compute temporal derivative (difference between consecutive frames)
    diff = np.diff(motion_mm, axis=0)

    # FD is sum of absolute values
    fd = np.sum(np.abs(diff), axis=1)

    # Prepend 0 for first frame (no prior frame to compare)
    fd = np.insert(fd, 0, 0)

    return fd

# Example usage:
motion_file = "sub-01_task-faces_desc-confounds_timeseries.tsv"
confounds_df = pd.read_csv(motion_file, sep='\t')
motion_cols = ['trans_x', 'trans_y', 'trans_z', 'rot_x', 'rot_y', 'rot_z']
motion_params = confounds_df[motion_cols].values

fd = compute_framewise_displacement(motion_params)
print(f"Mean FD: {fd.mean():.3f} mm")
print(f"Max FD: {fd.max():.3f} mm")
print(f"Volumes with FD > 0.5mm: {(fd > 0.5).sum()}")
```

### Signal dropout near air-tissue interfaces

Your brain sits next to air-filled cavities - the sinuses behind your forehead and the ear canals. At these air-tissue boundaries, the magnetic field becomes inhomogeneous, which causes signal loss. The orbitofrontal cortex and medial temporal lobes (including the hippocampus and amygdala) are particularly affected.

This isn't something preprocessing can fix - if the signal is gone, it's gone. You need to check your data visually to see which regions are affected. For vision research, fortunately, occipital cortex is usually fine. But if you're looking at object recognition in the temporal lobe, you might have problems.

### Ghosting and ringing

Ghosting appears as faint copies of the brain shifted along the phase-encoding direction. You'll see a faint "ghost" of the brain overlaid on the image, usually displaced by half the field of view. This happens due to inconsistencies in the k-space data during acquisition.

Ringing (or Gibbs ringing) appears as oscillating patterns near high-contrast edges. It looks like ripples emanating from the boundary between brain tissue and CSF or skull.

Both of these are acquisition problems. There's little you can do in preprocessing except be aware they exist and factor them into your interpretation.

### Registration failures

Spatial normalization is supposed to align everyone's brain to a common template. When it fails, your results are meaningless - you're comparing apples to oranges across subjects.

Common failure modes:
- The functional and anatomical images don't align properly (EPI-to-T1 registration failure)
- The anatomical image doesn't align to the template (T1-to-template failure)
- The brain extraction was too aggressive or not aggressive enough

<!-- Image needed: Good vs bad registration comparison showing functional-anatomical alignment -->

These failures are usually obvious when you look, but you have to actually look. This is where QA tools become essential.

## QA tools and what to look for

### MRIQC: automated quality metrics

[MRIQC](https://mriqc.readthedocs.io/) is a fantastic tool that computes a battery of "Image Quality Metrics" (IQMs) for your data. You run it on your BIDS dataset and it generates HTML reports for each scan plus group-level summaries.

To run MRIQC:

```bash
mriqc /path/to/bids_dataset /path/to/output participant --participant-label 01 02 03
mriqc /path/to/bids_dataset /path/to/output group
```

The group report is particularly useful - it shows you where each subject falls relative to others on various metrics. Outliers jump out immediately.

Key metrics MRIQC gives you:
- **FD and DVARS** summary statistics
- **tSNR** (temporal signal-to-noise ratio) - how stable is your signal over time
- **SNR** - signal-to-noise ratio
- **FBER** (foreground-to-background energy ratio) - distinguishes brain from non-brain
- **EFC** (entropy focus criterion) - detects ghosting and head motion

### fMRIPrep HTML reports

If you preprocessed with fMRIPrep (and you should - see Part 5), you get detailed HTML reports for free. Here's what to check:

1. **Brain mask overlay**: Does the mask capture all brain tissue without including skull?
2. **T1-to-template registration**: Flip between the subject's brain and the template. Any obvious misalignment?
3. **Functional-to-anatomical registration**: The red outline should follow the cortical surface
4. **Susceptibility distortion correction**: Compare the before/after - did it help or hurt?
5. **Confound correlation matrix**: Check which confounds are highly correlated
6. **Carpet plot and motion traces**: More on this below

### Carpet plots (grayplots): your best friend

Carpet plots are one of the most informative QA visualizations. They show the entire time series for every voxel in a 2D image: time on the x-axis, voxels on the y-axis (organized by tissue type), and signal intensity as color.

What you're looking for:

- **Vertical stripes** = bad. These indicate global signal changes affecting the whole brain simultaneously, usually caused by motion or respiration. When the head moves, all voxels shift together, creating these distinctive bands.
- **Horizontal bands** = expected. These represent different tissue types (gray matter, white matter, CSF) with different baseline signals.
- **Clean, random-looking texture** = good. This is what a well-behaved time series looks like.

<!-- Image needed: Carpet plots - clean example vs one with motion artifacts (vertical stripes) -->

### Manual inspection with FSLeyes

Sometimes you just need to look at the data yourself. FSLeyes is the standard viewer for neuroimaging data.

```bash
fsleyes sub-01_task-faces_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz \
        MNI152_T1_2mm.nii.gz
```

Things to check:
- Scroll through the time series - any sudden jumps?
- Check alignment with the template
- Look for signal dropout regions
- Verify brain coverage - did you clip the cerebellum or frontal pole?

## Practical thresholds and exclusion criteria

Here's where people want concrete numbers. The honest truth is that thresholds are somewhat arbitrary and depend on your study. But here's what the field generally uses:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Mean FD | > 0.5 mm | Consider exclusion |
| Mean FD | > 0.2 mm | Flag for inspection |
| Max FD | > 5 mm | Likely exclude |
| % volumes with FD > 0.5 mm | > 20% | Consider exclusion |
| DVARS (standardized) | > 1.5 | Flag individual volumes |
| tSNR (whole brain) | < 50 | Flag for inspection |

**Motion scrubbing vs. exclusion**: For individual high-motion volumes, you have options:
1. **Censoring/scrubbing**: Remove those volumes from analysis (add spike regressors to your GLM)
2. **Interpolation**: Replace bad volumes with interpolated values (controversial)
3. **Run exclusion**: If too many volumes are bad (>20-30%), drop the entire run
4. **Subject exclusion**: If multiple runs are bad, drop the subject

My recommendation: Be conservative. It's better to lose a subject than to include noisy data that adds variance and reduces your power to detect real effects.

## Being transparent about exclusions

This is crucial for reproducible science. Your methods section should clearly state:

1. **What QA metrics you computed** (FD, DVARS, tSNR, etc.)
2. **What thresholds you used** for flagging or exclusion
3. **How many subjects/runs were excluded** and why
4. **Whether you used motion scrubbing** and how many volumes were affected

Example methods text:

> "Data quality was assessed using MRIQC and fMRIPrep visual reports. Subjects were excluded if mean framewise displacement exceeded 0.5 mm or if more than 20% of volumes had FD > 0.5 mm. Based on these criteria, 3 of 28 subjects were excluded from analysis. For remaining subjects, individual volumes with FD > 0.5 mm were censored by including spike regressors in the GLM (mean 4.2% of volumes per subject, range 0-12%)."

Don't bury exclusions in supplementary materials. Reviewers and readers need to know how much data you threw away and why.

## Key Takeaways

- **QA is not optional.** Bad data leads to bad science. No amount of fancy analysis can save motion-corrupted or poorly registered data.

- **Motion is your main enemy.** Track framewise displacement religiously. Know your mean FD, max FD, and percentage of high-motion volumes for every subject.

- **Use automated tools.** MRIQC and fMRIPrep reports catch problems you'd miss with manual inspection alone. Run them on every dataset.

- **Look at carpet plots.** They're the single best visualization for spotting global artifacts. Vertical stripes mean trouble.

- **Check registration.** Always visually verify that functional data aligns with anatomical data and that both align with your template.

- **Be consistent and transparent.** Define your exclusion criteria before you look at the data. Report them clearly in your papers.

- **When in doubt, throw it out.** Excluding a noisy subject hurts less than including data that adds variance or creates spurious effects.

Quality assessment isn't glamorous, but it's what separates rigorous science from noise. Take it seriously.

---

With clean, quality-checked data in hand, we're finally ready to analyze it. Next up: the General Linear Model - the workhorse of fMRI analysis.

**Next:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Previous:** [Part 5: Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)
