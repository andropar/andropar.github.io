---
title: "Analyzing fMRI Data with the GLM"
description: "The General Linear Model for fMRI, first-level analysis, and extracting single-trial responses. Part 7 of an 8-part fMRI crash course."
date: 2025-04-21
draft: true
tags: ["fMRI", "neuroscience", "methods", "GLM", "analysis"]
---

*This is Part 7 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

We've preprocessed our data, quality-checked it, and now comes the part you've been waiting for: actually analyzing the thing. The workhorse of task-based fMRI analysis is the General Linear Model, or GLM. It sounds intimidating if you haven't encountered it before, but here's the secret: it's just regression. Really. If you understand y = mx + b from high school, you're already 80% of the way there.

## The GLM: It's Just Regression

Let me demystify this. At each voxel in your brain, you have a timeseries - a sequence of BOLD signal values, one per TR. The question we're trying to answer is: can we explain that timeseries as a weighted combination of our experimental conditions?

Think of it like this. You show someone pictures of faces and houses in an alternating pattern. If a voxel responds to faces, its timeseries should go up when faces appear and down when houses appear (roughly - there's that pesky hemodynamic delay). The GLM formalizes this intuition.

Here's the equation:

```
Y = X * B + E
```

Where:
- **Y** is your voxel's timeseries (what you measured)
- **X** is your design matrix (what you think should be happening)
- **B** are beta weights (how much each thing in X contributes)
- **E** is the error (everything you can't explain)

The goal? Find the beta weights that minimize the error. That's it. That's linear regression.

The magic is in building X - the design matrix. This is where you encode your experimental design, and getting it right is crucial.

<img src="/blog/fmri-diagrams/glm-design-matrix.svg" alt="GLM design matrix with task regressors and the GLM equation" />

*Each column is a regressor; rows are timepoints. Task regressors are convolved with the HRF.*

## Building the Design Matrix

The design matrix is a table where rows are timepoints (TRs) and columns are different things you want to model. Let's break down what goes in there.

### Task Regressors: The Main Event

Your primary regressors represent your experimental conditions. But here's the catch - you can't just create a column that's 1 when faces are shown and 0 otherwise. Remember that hemodynamic delay from Part 2? The BOLD response peaks 5-6 seconds after neural activity, not instantly.

So we start with a "boxcar" function - a simple on/off indicator of when each condition occurred - and convolve it with the Hemodynamic Response Function (HRF). Convolution is just a fancy way of saying we smear the boxcar in time according to the shape of the HRF. The result is a smooth, delayed predictor that actually matches what the BOLD signal should look like.

```python
import numpy as np
from nilearn.glm.first_level import compute_regressor

# Define when faces appeared (onset in seconds, duration)
face_onsets = [0, 20, 40, 60]  # faces shown at these times
face_durations = [2, 2, 2, 2]  # each shown for 2 seconds

# Build the regressor (automatically convolves with HRF)
regressor, _ = compute_regressor(
    exp_condition=np.array([face_onsets, face_durations, [1]*4]),
    hrf_model='spm',  # standard SPM double-gamma HRF
    frame_times=np.arange(0, 100, 2)  # TR = 2s, 100s total
)
```

### Parametric Modulators: Beyond On/Off

Sometimes you want to model not just *whether* something happened, but *how much* of something happened. Maybe reaction time, or stimulus intensity, or emotional valence. These are parametric modulators.

You create them by scaling your boxcar by a continuous variable before convolving. If you're modeling reaction time, trials with long RTs get a bigger value than trials with fast RTs. The resulting beta tells you: does this voxel's response scale with reaction time?

```python
# Parametric modulator: reaction time effect
rt_values = [0.5, 0.8, 0.4, 0.9]  # RT for each face trial (z-scored in practice)
regressor_rt, _ = compute_regressor(
    exp_condition=np.array([face_onsets, face_durations, rt_values]),
    hrf_model='spm',
    frame_times=np.arange(0, 100, 2)
)
```

### Nuisance Regressors: Cleaning Up the Mess

Here's where things get practical. Your data contains noise from many sources that have nothing to do with your experiment. You want to model these out so they don't corrupt your estimates.

**Motion parameters**: During preprocessing, you estimated 6 motion parameters (3 translation, 3 rotation) per TR. Include these as regressors. Head movement causes signal changes, and if subjects move more during one condition than another, you'll get spurious "activations." Some researchers also include the temporal derivatives (how fast motion is changing) and squared terms, giving you 24 motion regressors total.

**Physiological noise**: If you recorded pulse and respiration (you should), you can model their effects with tools like RETROICOR. The beating heart and breathing lungs cause periodic signal fluctuations that can look like neural activity if you're not careful.

**High-pass filtering**: Slow drifts in the scanner signal (from heating, subject movement, etc.) are modeled with a discrete cosine transform (DCT) basis set. Typically we use a cutoff around 0.01 Hz (100s period), removing anything slower than that. In nilearn, this is handled with the `high_pass` parameter rather than explicit regressors.

**Scrubbing/censoring**: Remember those framewise displacement calculations from quality assessment? Some researchers add "spike regressors" - a column of all zeros except a 1 at timepoints with excessive motion. This effectively removes those volumes from the analysis.

## First-Level Analysis with Nilearn

Let's put this together. First-level analysis means fitting the GLM to each run of each subject individually. Here's how it looks in practice with nilearn:

```python
from nilearn.glm.first_level import FirstLevelModel
import pandas as pd

# Create the model
model = FirstLevelModel(
    t_r=2.0,              # TR in seconds
    hrf_model='spm',       # HRF shape
    drift_model='cosine',  # High-pass filtering
    high_pass=0.01,        # Cutoff frequency in Hz
    noise_model='ar1',     # Autocorrelation correction
    smoothing_fwhm=5,      # Optional smoothing (mm)
    mask_img=brain_mask    # Only analyze brain voxels
)

# Your events file (from BIDS, or create manually)
events = pd.DataFrame({
    'onset': [0, 5, 10, 15, 20, 25],
    'duration': [2, 2, 2, 2, 2, 2],
    'trial_type': ['face', 'house', 'face', 'house', 'face', 'house']
})

# Confounds from preprocessing (e.g., fMRIPrep)
confounds = pd.read_csv('confounds.tsv', sep='\t')
confound_cols = ['trans_x', 'trans_y', 'trans_z',
                 'rot_x', 'rot_y', 'rot_z']

# Fit the model
model.fit(
    run_imgs='sub-01_task-faces_bold.nii.gz',
    events=events,
    confounds=confounds[confound_cols]
)

# Get the design matrix (always inspect this!)
design_matrix = model.design_matrices_[0]
from nilearn.plotting import plot_design_matrix
plot_design_matrix(design_matrix)
```

### Contrasts and T-maps

Once the model is fit, you have beta weights for each regressor at each voxel. But raw betas aren't that useful - their scale is arbitrary and they don't account for noise. Enter contrasts.

A contrast is a weighted combination of betas that tests a specific hypothesis. Want to know where faces activate more than houses? That's a contrast: `[1, -1]` for face and house betas respectively.

```python
# Define contrasts
contrasts = {
    'faces': 'face',                    # face vs. baseline
    'houses': 'house',                  # house vs. baseline
    'faces_vs_houses': 'face - house',  # direct comparison
}

# Compute statistical maps
for name, contrast in contrasts.items():
    stat_map = model.compute_contrast(contrast, output_type='stat')
    # stat_map is now a t-statistic image
```

The output is a t-map: at each voxel, you get a t-statistic indicating how confidently that voxel shows the effect you're testing. High positive values mean the effect is reliably present; high negative values mean the opposite effect.

## Single-Trial Estimation: The MVPA Prerequisite

Here's where things get interesting for vision researchers. The standard GLM gives you one beta per condition - one "face" response, one "house" response, averaged across all trials of that type. But for multivariate pattern analysis (MVPA), you often want response estimates for each individual trial. You want to ask: can I decode *which specific face* someone saw, not just whether they saw a face at all?

This is single-trial estimation, and there are several approaches.

### LSA: Least Squares All

The simplest approach: put every single trial as its own regressor in one massive design matrix. Trial 1 face, trial 2 house, trial 3 face, etc. - each gets its own column.

```python
# Create trial-by-trial events
events_trials = pd.DataFrame({
    'onset': [0, 5, 10, 15, 20, 25],
    'duration': [2, 2, 2, 2, 2, 2],
    'trial_type': ['trial_001', 'trial_002', 'trial_003',
                   'trial_004', 'trial_005', 'trial_006']
})

# Fit with one regressor per trial
model.fit(run_imgs=fmri_img, events=events_trials, confounds=confounds)
```

**The problem**: When trials are close together in time (fast event-related designs), their regressors become highly correlated. The HRF for trial 1 hasn't finished by the time trial 2 starts. This collinearity inflates noise in your beta estimates. Think of it like trying to separate overlapping voices in a crowded room - possible, but noisy.

### LSS: Least Squares Separate

Mumford et al. (2012) proposed a clever solution: fit each trial separately. For trial N, your design matrix has one regressor for trial N and another regressor for "all other trials" combined. Repeat for each trial.

```python
# Pseudocode for LSS
betas_lss = []
for trial in trials:
    # One regressor for this trial
    # One regressor for all other trials combined
    # Fit model
    # Extract beta for this trial
    betas_lss.append(beta)
```

This reduces collinearity at the expense of losing information about the relationships between different trials. It's more computationally intensive (you fit N models instead of 1), but often produces better single-trial estimates than LSA.

### GLMsingle: The Modern Approach

And then there's [GLMsingle](https://github.com/cvnlab/GLMsingle), developed by Prince et al. (2022) and published in eLife. I think this is the state-of-the-art for single-trial estimation, and if you're doing MVPA with an event-related design, you should seriously consider using it.

GLMsingle improves on traditional approaches with three key innovations:

**1. Voxel-wise HRF optimization**: Instead of assuming the same HRF shape across the brain (a major simplification), GLMsingle tests a library of 20 different HRF shapes for each voxel and picks the one that best explains the data. The HRF actually varies across brain regions - visual cortex and prefrontal cortex don't have identical hemodynamics. This matters.

**2. GLMdenoise**: This technique, originally developed by Kay et al., finds noise regressors in a data-driven way. It identifies voxels that don't respond to your task, extracts principal components from their timeseries, and uses these as nuisance regressors. Think of it as: "whatever is happening in task-unresponsive voxels is probably noise, so regress it out everywhere."

**3. Fracridge regularization**: Here's the clever part. When trials are close together, the resulting collinearity inflates beta estimates - they become unreliably large. GLMsingle applies ridge regression to dampen this, but critically, it finds the optimal regularization strength for each voxel using cross-validation. Some voxels need more shrinkage, some need less.

The result? Substantially more reliable single-trial estimates. In their paper, they show dramatic improvements in beta reliability across three major datasets (Natural Scenes Dataset, BOLD5000, and StudyForrest). Downstream analyses - representational similarity, decoding - all benefit.

```python
# Using GLMsingle (Python version)
from glmsingle.glmsingle import GLMsingle

# Prepare data
data = [run1_data, run2_data, run3_data]  # list of 4D arrays
design = [run1_design, run2_design, run3_design]  # design matrices

# Create and run GLMsingle
glm = GLMsingle(dict(
    wantlibrary=1,      # use HRF library
    wantglmdenoise=1,   # use GLMdenoise
    wantfracridge=1,    # use ridge regression
))

results = glm.fit(
    design=design,
    data=data,
    stimdur=2.0,        # stimulus duration
    tr=2.0              # TR
)

# Get the optimized betas
betas = results['betasmd']  # denoised, regularized single-trial betas
```

Note: GLMsingle requires your design matrices in a specific format (timepoints x conditions, binary). Check their [documentation](https://glmsingle.readthedocs.io) for details. There's also a size limit in the Python version - if your outputs exceed 4GB, you'll need to handle file saving manually.

## Comparison: LSA vs. LSS vs. GLMsingle

| Aspect | LSA | LSS | GLMsingle |
|--------|-----|-----|-----------|
| **Approach** | All trials in one model | Separate model per trial | Unified framework with denoising |
| **Collinearity handling** | None | Reduced by design separation | Ridge regression with cross-validation |
| **HRF** | Fixed (canonical) | Fixed (canonical) | Voxel-wise optimization from library |
| **Denoising** | Standard confounds only | Standard confounds only | Data-driven noise regressors |
| **Computation** | Single fit | N fits (slow) | Single fit + cross-validation |
| **When to use** | Slow designs, simple analysis | Fast designs, moderate improvement needed | Best results, especially for MVPA |
| **Ease of use** | Easy (nilearn) | Moderate (loop required) | Easy (dedicated toolbox) |

## When to Use What

Let me give you some practical guidance:

**Standard condition-level analysis** (group studies, activation maps): Stick with the standard GLM in nilearn or SPM. You don't need single-trial estimates.

**MVPA with slow event-related design** (6+ seconds between trials): LSA is probably fine. Collinearity isn't a major issue with well-spaced trials.

**MVPA with fast event-related design** (typical 2-4 second ITI): This is where GLMsingle shines. The collinearity is real, the HRF variation matters, and the denoising helps. I'd use GLMsingle unless you have a specific reason not to.

**Massive datasets** (thousands of images, like NSD): Definitely GLMsingle. It was literally developed for this use case. The improvements compound when you have lots of trials to estimate.

**Quick and dirty analysis**: LSS with nilearn is surprisingly effective and doesn't require additional toolboxes. Good for pilot analyses before committing to GLMsingle.

## Key Takeaways

- **The GLM is just regression.** You're explaining each voxel's timeseries as a weighted combination of predictors.

- **The design matrix encodes your experiment.** Task regressors (convolved with the HRF), parametric modulators, and nuisance regressors (motion, physiological noise) all go in there.

- **Contrasts test hypotheses.** They transform betas into interpretable t-statistics that tell you where effects are reliable.

- **Single-trial estimation is essential for MVPA.** You need per-trial betas, not condition averages.

- **GLMsingle is the current gold standard for single-trial estimation.** If you're doing serious MVPA work, the combination of HRF optimization, GLMdenoise, and ridge regression is worth the effort. Check out the [paper](https://elifesciences.org/articles/77599) and [GitHub repo](https://github.com/cvnlab/GLMsingle).

- **Always visualize your design matrix.** Seriously. So many analysis problems can be caught by just looking at what you're actually modeling.

---

With beta estimates in hand - whether condition-level from a standard GLM or single-trial from GLMsingle - we're ready for the fun part. In the final post, we'll explore multivariate methods that let us decode what people are seeing from their brain activity patterns.

**Next:** [Part 8: Multivariate Pattern Analysis](/blog/fmri-crash-course-8-multivariate)

**Previous:** [Part 6: Assessing the Quality of fMRI Data](/blog/fmri-crash-course-6-quality-assessment)
