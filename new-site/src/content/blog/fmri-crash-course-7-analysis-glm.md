---
title: "Analyzing fMRI Data with the GLM"
description: "The General Linear Model for fMRI, first-level analysis, and extracting single-trial responses. Part 7 of an 8-part fMRI crash course."
date: 2025-04-21
draft: true
tags: ["fMRI", "neuroscience", "methods", "GLM", "analysis"]
---

*This is Part 7 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

At this point the data is preprocessed and quality-checked, so we can finally analyze it. The standard tool for task-based fMRI is the General Linear Model (GLM). The name sounded intimidating to me at first, but it's just linear regression, applied to every voxel separately.

## The GLM is regression

Each voxel gives you a timeseries: one BOLD value per TR. The question the GLM asks is whether that timeseries can be explained as a weighted sum of predictors that describe your experiment.

Say you show someone faces and houses in alternation. If a voxel prefers faces, its signal should go up a few seconds after faces appear and down during houses. The GLM turns this intuition into a model:

```
Y = X * B + E
```

- Y is the voxel's timeseries (what you measured)
- X is the design matrix (what you think is driving the signal)
- B are the beta weights (how much each column of X contributes)
- E is the error (everything the model can't explain)

Fitting means finding the betas that minimize the squared error, which is ordinary least squares (with a correction for autocorrelated noise, more on that below). Most of the actual work goes into building X.

<img src="/blog/fmri-diagrams/design-matrix.svg" alt="Example GLM design matrix showing HRF-convolved task regressors, motion parameters, and intercept" />

*A simulated design matrix for a faces vs. houses experiment. The first two columns are HRF-convolved task regressors, followed by six motion regressors, cosine drift terms for high-pass filtering, and the intercept.*

## Building the design matrix

The design matrix is a table with one row per timepoint (TR) and one column per thing you want to model.

### Task regressors

Your main regressors describe the experimental conditions. You can't just use a column that is 1 when a face is on screen and 0 otherwise, because of the hemodynamic delay we covered in [Part 3](/blog/fmri-crash-course-3-basics-mri): the BOLD response peaks around 5-6 seconds after neural activity.

So you start with a boxcar (an on/off indicator of when each condition occurred) and convolve it with the hemodynamic response function (HRF). Convolution smears the boxcar out in time according to the HRF's shape, and the result is a smooth, delayed predictor that looks like what the BOLD signal should do.

<img src="/blog/fmri-diagrams/hrf-convolution-demo.svg" alt="Three panels: a boxcar stimulus function, the canonical HRF, and the regressor that results from convolving them" />

*The boxcar (left) marks when stimuli were on. The canonical HRF (middle) describes the delayed, sluggish BOLD response to a brief event. Convolving the two gives the regressor (right), our prediction of what the signal should look like.*

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

### Parametric modulators

Sometimes you care about how much of something happened, not just whether it happened: reaction time, stimulus contrast, rated valence. For these you scale each trial's boxcar by a continuous value before convolving. The resulting beta tells you whether the voxel's response scales with that variable.

```python
# Parametric modulator: reaction time effect
rt_values = [0.5, 0.8, 0.4, 0.9]  # RT for each face trial (z-scored in practice)
regressor_rt, _ = compute_regressor(
    exp_condition=np.array([face_onsets, face_durations, rt_values]),
    hrf_model='spm',
    frame_times=np.arange(0, 100, 2)
)
```

### Nuisance regressors

The data also contains plenty of signal that has nothing to do with your experiment, and you want to model it so it doesn't leak into your estimates.

Motion is the obvious one. Preprocessing gives you 6 motion parameters per TR (3 translations, 3 rotations), and these go in as regressors. Head movement changes the signal, and if people move more in one condition than another you get fake "activations". Many people also add the temporal derivatives and squared terms, for 24 motion regressors in total.

If you recorded pulse and respiration, you can model cardiac and breathing effects with methods like RETROICOR. Both cause periodic fluctuations that can be mistaken for neural signal.

Slow scanner drifts are handled with a high-pass filter, usually a discrete cosine transform (DCT) basis with a cutoff around 0.01 Hz (100 s period). In nilearn you set this with the `high_pass` parameter instead of adding the regressors yourself.

Finally, you can censor high-motion volumes with "spike regressors": a column of zeros with a single 1 at a bad timepoint, one column per volume you want to drop. This uses the framewise displacement values from [Part 6](/blog/fmri-crash-course-6-quality-assessment).

## First-level analysis with nilearn

First-level analysis means fitting the GLM to the data of a single subject (one or several runs). In nilearn it looks like this:

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

Do look at the design matrix plot every time. A lot of analysis bugs (wrong onsets, a condition that never appears, confounds with NaNs in the first row) are obvious once you see the matrix.

### Contrasts and t-maps

After fitting you have a beta for every regressor at every voxel. Raw betas are hard to interpret on their own: their scale is somewhat arbitrary and they say nothing about noise. To test a hypothesis you define a contrast, a weighted combination of betas. "Where do faces activate more than houses?" is the contrast `[1, -1]` on the face and house betas.

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

The output is a t-map: each voxel gets a t-statistic for the effect you're testing. Large positive values mean the effect is reliably present, large negative values mean the reverse effect.

## Defining ROIs with a functional localizer

In vision research you'll rarely look at the whole brain. Much more often you want the responses of a specific region, like the fusiform face area (FFA) or V1, in each participant. Category-selective regions vary in location and size across people, so the usual approach is to define them per subject with a functional localizer: a few short block-design runs (see [Part 4](/blog/fmri-crash-course-4-recording-experiments)) showing faces, scenes, bodies, objects and scrambled objects.

You fit a regular GLM to the localizer runs and compute contrasts:

- faces > objects: FFA and the occipital face area, OFA (Kanwisher et al., 1997)
- scenes > objects: PPA, the occipital place area (OPA, also called TOS) and the retrosplenial complex (RSC, also called MPA) (Epstein & Kanwisher, 1998)
- bodies > objects: EBA (Downing et al., 2001)
- objects > scrambled objects: LOC (Malach et al., 1995)

```python
loc_model = FirstLevelModel(t_r=2.0, hrf_model='spm', drift_model='cosine',
                            high_pass=0.01, smoothing_fwhm=4, mask_img=brain_mask)
loc_model.fit(localizer_runs, events=localizer_events,
              confounds=localizer_confounds)

# 'face' and 'object' must match the trial_type labels in your events files
faces_z = loc_model.compute_contrast('face - object', output_type='z_score')
```

A bit of smoothing is common for localizers, since you want contiguous blobs and not single voxels. A thresholded contrast map usually has more than one blob, though, and picking "the FFA" by eye is subjective. A cleaner option is the group-constrained subject-specific approach of Julian et al. (2012): they provide group-derived parcels that mark where each region tends to be. You bring a parcel into the subject's space, intersect it with the subject's contrast map, and then either threshold or keep the top N most selective voxels inside the parcel. Taking a fixed number of voxels has the nice side effect that ROIs have the same size across subjects, which helps when you compare decoding accuracies.

```python
import numpy as np

z = faces_z.get_fdata()
# Parcel already resampled to the subject's functional space
parcel = parcel_img.get_fdata() > 0

z_in_parcel = np.where(parcel, z, -np.inf)
top_idx = np.argsort(z_in_parcel, axis=None)[-100:]  # top 100 voxels
roi_mask = np.zeros(z.shape, dtype=bool)
roi_mask.flat[top_idx] = True
```

<img src="/blog/fmri-diagrams/localizer-rois.svg" alt="Ventral view of an inflated left hemisphere with simulated face-selective regions OFA and FFA in orange and scene-selective PPA in blue" />

*Simulated localizer results on an inflated surface. Face-selective FFA sits on the lateral fusiform gyrus, scene-selective PPA medial to it near the collateral sulcus, and OFA further back in occipital cortex.*

One rule you must not break: define the ROI on data that is independent of the data you analyze afterwards. If you select voxels because they respond more to faces and then report that the same data shows a stronger response to faces, the result is guaranteed by the selection. Kriegeskorte et al. (2009) wrote the standard paper on this "double dipping" problem. Separate localizer runs solve it; if you must localize with the main experiment, split the runs (e.g. define the ROI on odd runs, analyze even runs).

## Retinotopic mapping

Early visual areas (V1, V2, V3, and beyond) aren't defined by category contrasts but by their maps of the visual field. To find them you run retinotopic mapping: stimuli like rotating wedges and expanding rings, analyzed either with a phase-encoded analysis (which phase of the stimulus cycle drives each voxel most) or with population receptive field (pRF) modeling (Dumoulin & Wandell, 2008). The pRF approach fits a small model of each voxel's receptive field and gives you polar angle, eccentricity and pRF size per voxel.

<img src="/blog/fmri-diagrams/prf-model.svg" alt="Left: the visual field with a bar stimulus and a Gaussian population receptive field. Right: simulated voxel time series and the pRF model prediction over four bar sweeps" />

*Simulated pRF fit. The model predicts a response whenever the bar overlaps the voxel's Gaussian receptive field, convolved with the HRF. Fitting the position and size of that Gaussian gives polar angle, eccentricity and pRF size for each voxel.*

The borders between V1, V2 and V3 sit where the polar angle map reverses direction, which you trace on an inflated or flattened cortical surface. For fitting, analyzePRF (MATLAB, from Kendrick Kay's lab) and prfpy (Python) are common choices.

If you don't have mapping data, the anatomical retinotopy template in neuropythy (Benson et al., 2014; Benson & Winawer, 2018) predicts V1-V3 boundaries and retinotopic coordinates from a subject's FreeSurfer reconstruction. For V1-V3 it works reasonably well, and it's a good fallback or starting point.

## Group-level analysis and multiple comparisons

So far everything has been within one subject. If you want to claim that an effect holds in the population, you run a second-level (random-effects) analysis: take each subject's contrast map (the effect size, not the t-map) in a common space like MNI, and test across subjects whether the mean effect differs from zero. In nilearn:

```python
import pandas as pd
from nilearn.glm.second_level import SecondLevelModel
from nilearn.glm import threshold_stats_img

# subject_maps: list of per-subject contrast images in MNI space,
# e.g. model.compute_contrast('face - house', output_type='effect_size')
design = pd.DataFrame({'intercept': [1] * len(subject_maps)})
group_model = SecondLevelModel(smoothing_fwhm=6)
group_model.fit(subject_maps, design_matrix=design)
z_map = group_model.compute_contrast('intercept', output_type='z_score')

# FDR-corrected threshold, optionally dropping clusters smaller than 10 voxels
thresholded_map, threshold = threshold_stats_img(
    z_map, alpha=0.05, height_control='fdr', cluster_threshold=10
)
```

The catch is that you're running one test per voxel, so tens of thousands of tests. At p < 0.05 uncorrected you'd expect thousands of false positives. The main ways to deal with this:

- Voxelwise family-wise error (FWE) control, e.g. Bonferroni (`height_control='bonferroni'`) or random field theory as in SPM. Strict, so you lose sensitivity.
- False discovery rate (FDR; Benjamini & Hochberg, 1995; Genovese et al., 2002), which controls the expected proportion of false positives among the voxels you call significant. Less strict than FWE.
- Cluster-level inference: threshold the map at a cluster-forming threshold and then ask whether a cluster is larger than you'd expect by chance.

<img src="/blog/fmri-diagrams/fdr-thresholding.svg" alt="Three panels of a simulated statistical map: unthresholded z-values, a lenient uncorrected threshold with many scattered false positives, and an FDR-corrected threshold with far fewer" />

*Simulated map with three true effects. A lenient uncorrected threshold finds the effects but also many scattered false positives; FDR keeps the effects and removes most of the noise.*

Cluster inference needs care. Eklund et al. (2016) showed that parametric cluster inference, as implemented in the common packages, gave false-positive rates far above the nominal 5% when combined with a lenient cluster-forming threshold like p < 0.01. Use a cluster-forming threshold of p < 0.001, or better, nonparametric permutation testing (nilearn has `non_parametric_inference` in `nilearn.glm.second_level`), which held up well in their comparison.

Note that the `cluster_threshold` in the snippet above just removes small clusters for display. It isn't a cluster-level test.

Also, many vision studies never do whole-brain group statistics at all. Dense-sampling datasets like NSD, THINGS-data and LAION-fMRI scan a few people for many hours, define ROIs within each person and report results per subject, treating each subject as a replication. If your question is about specific visual areas, ROI-based analysis within individuals is often the more sensible design.

## Single-trial estimation for MVPA

The standard GLM gives you one beta per condition: one "face" response and one "house" response, averaged over all trials of that type. For multivariate pattern analysis (MVPA, [Part 8](/blog/fmri-crash-course-8-multivariate)) you usually want a response estimate for each individual trial, for example to decode which specific face someone saw or to build a representational similarity matrix over hundreds of images. There are several ways to get these.

### LSA: Least Squares All

The simplest approach is to give every trial its own regressor in one big design matrix. For MVPA you also want unsmoothed data (see [Part 5](/blog/fmri-crash-course-5-preprocessing)), so use a separate model with `smoothing_fwhm=None`:

```python
# Unsmoothed model for single-trial estimation
st_model = FirstLevelModel(
    t_r=2.0,
    hrf_model='spm',
    drift_model='cosine',
    high_pass=0.01,
    noise_model='ar1',
    smoothing_fwhm=None,   # no smoothing for MVPA
    mask_img=brain_mask
)

# Create trial-by-trial events
events_trials = pd.DataFrame({
    'onset': [0, 5, 10, 15, 20, 25],
    'duration': [2, 2, 2, 2, 2, 2],
    'trial_type': ['trial_001', 'trial_002', 'trial_003',
                   'trial_004', 'trial_005', 'trial_006']
})

# Fit with one regressor per trial
st_model.fit(run_imgs=fmri_img, events=events_trials,
             confounds=confounds[confound_cols])
```

The problem is that when trials are close together in time (fast event-related designs), their regressors overlap: the HRF of trial 1 is still going when trial 2 starts. The regressors become correlated, and collinearity inflates the variance of the beta estimates. The estimates are unbiased on average, but any single one can be far off.

<img src="/blog/fmri-diagrams/design-matrix-collinearity.svg" alt="Single-trial regressors for four trials: well separated in a slow design, strongly overlapping in a fast design" />

*Simulated single-trial regressors. With 12 s between trials (left), neighboring regressors barely overlap (r = -0.21 in this simulation). With 3 s between trials (right), the HRFs overlap and neighboring regressors are strongly correlated (r = 0.57), which inflates the variance of the beta estimates.*

### LSS: Least Squares Separate

Mumford et al. (2012) proposed fitting one model per trial. For trial N, the design matrix has one regressor for trial N and a single nuisance regressor for all other trials together. Because the target regressor only has to compete with one other regressor, collinearity is much lower and the estimates are less noisy. The price is some bias (the estimates tend to be shrunk a bit), plus you have to fit N models instead of one. In fast designs this trade-off usually works out in LSS's favor. A common variant models the other trials by condition rather than lumping them together.

With nilearn it's a short loop:

```python
import numpy as np
from nilearn.image import concat_imgs

betas_lss = []
for i in range(len(events)):
    ev = events.copy()
    # Current trial is 'target', everything else is 'other'
    ev['trial_type'] = np.where(np.arange(len(ev)) == i, 'target', 'other')
    st_model.fit(run_imgs=fmri_img, events=ev,
                 confounds=confounds[confound_cols])
    betas_lss.append(st_model.compute_contrast('target', output_type='effect_size'))

betas_lss = concat_imgs(betas_lss)  # 4D image, one volume per trial
```

This refits the whole model every iteration, so it's slow for long runs with many trials, but it needs nothing beyond nilearn.

### GLMsingle

Then there's [GLMsingle](https://github.com/cvnlab/GLMsingle) (Prince et al., 2022). For event-related designs where you need single-trial betas, I think it's currently the best option, and I'd use it by default for MVPA. It combines three ideas.

First, voxel-wise HRF selection. Instead of assuming one HRF shape for the whole brain, GLMsingle tries a library of 20 HRFs at each voxel and picks the one that fits best. The HRF really does vary across voxels and regions, so this helps.

Second, GLMdenoise (Kay et al., 2013). It finds voxels that don't respond to the task, takes principal components of their timeseries, and uses those as nuisance regressors. The reasoning is that whatever fluctuates in task-unresponsive voxels is probably noise, so it can be regressed out everywhere. The number of components is chosen by cross-validation.

Third, fractional ridge regression. As described above, collinearity between neighboring trials inflates the variance of the beta estimates. Ridge regression shrinks the betas to reduce that variance, and GLMsingle picks the amount of shrinkage separately for each voxel by cross-validation.

Prince et al. showed clear improvements in the reliability of single-trial betas on several datasets, including NSD and BOLD5000, and downstream analyses like RSA and decoding benefited too.

```python
from glmsingle.glmsingle import GLM_single

# data: list of runs, each an array of shape (X, Y, Z, time)
# design: list of runs, each a binary array of shape (time, n_conditions)
#         with a 1 at the TR where a trial of that condition starts
data = [run1_data, run2_data, run3_data]
design = [run1_design, run2_design, run3_design]

opt = {
    'wantlibrary': 1,      # voxel-wise HRF selection
    'wantglmdenoise': 1,   # GLMdenoise
    'wantfracridge': 1,    # ridge regularization
    'wantmemoryoutputs': [0, 0, 0, 1],  # return the final model in memory
}
glm = GLM_single(opt)

results = glm.fit(
    design,
    data,
    2.0,   # stimdur: stimulus duration in seconds
    2.0,   # tr: repetition time in seconds
    outputdir='glmsingle_outputs',
)

# Results come back per model type ('typea' ... 'typed');
# 'typed' is the final model with HRF fitting, GLMdenoise and ridge
betas = results['typed']['betasmd']  # shape (X, Y, Z, n_trials)
```

The design format is the main thing to get right. Each design matrix is a binary onset matrix of time x conditions, where each unique condition (e.g. each image) is a column, and the matrices are sampled at the TR, so trial onsets have to line up with volume acquisitions. GLMsingle uses repeated presentations of the same condition for its cross-validation, so it works best when conditions repeat across runs; with no repeats at all, it can't tune the denoising and ridge steps in the usual way. The [documentation](https://glmsingle.readthedocs.io) and the example notebooks in the repo cover the details.

## Comparison: LSA vs. LSS vs. GLMsingle

| Aspect | LSA | LSS | GLMsingle |
|--------|-----|-----|-----------|
| **Approach** | All trials in one model | Separate model per trial | One framework with HRF selection, denoising, ridge |
| **Collinearity handling** | None | Other trials collapsed into one regressor | Ridge regression tuned by cross-validation |
| **HRF** | Fixed (canonical) | Fixed (canonical) | Voxel-wise choice from a library |
| **Denoising** | Standard confounds only | Standard confounds only | Data-driven noise regressors |
| **Computation** | Single fit | N fits (slow) | Several fits + cross-validation |
| **When to use** | Slow designs, simple analyses | Fast designs, no extra toolbox | Best estimates, especially for MVPA |
| **Ease of use** | Easy (nilearn) | Easy (short loop in nilearn) | Moderate (dedicated toolbox, specific design format) |

## When to use what

For standard condition-level analyses (activation maps, localizers, group studies) you don't need single-trial estimates at all. A regular GLM in nilearn or SPM is fine.

For MVPA with a slow event-related design (trials roughly 10 seconds or more apart), LSA is probably fine, since well-spaced trials don't overlap much.

For MVPA with a fast event-related design (the typical ISI of 2-4 seconds), I'd use GLMsingle unless there's a specific reason not to. The collinearity is real, HRF variation matters, and the denoising helps.

For large datasets with thousands of images, like NSD or LAION-fMRI, GLMsingle is the obvious choice (LAION-fMRI ships GLMsingle betas). It was developed with exactly this kind of data in mind.

If you want something quick without another toolbox, LSS with nilearn only takes the short loop above and works well enough for pilot analyses before you set up GLMsingle.

## Summary

- The GLM explains each voxel's timeseries as a weighted sum of HRF-convolved task regressors and nuisance regressors, and contrasts on the betas test your hypotheses.
- Always plot the design matrix before trusting any results.
- Localizer contrasts plus group-derived parcels give you subject-specific ROIs like FFA and PPA; retinotopic mapping (or an anatomical template) gives you V1-V3. Keep ROI definition independent of the data you analyze.
- Whole-brain group maps need multiple comparisons correction; avoid lenient cluster-forming thresholds, and consider permutation tests.
- For MVPA you need single-trial betas from unsmoothed data. LSS is a reasonable quick option, GLMsingle usually gives the most reliable estimates.

---

With beta estimates in hand, whether condition-level from a standard GLM or single-trial from GLMsingle, we can move on to multivariate methods. In the final post we'll look at how to decode what people are seeing from their brain activity patterns.

**Next:** [Part 8: Multivariate analysis](/blog/fmri-crash-course-8-multivariate)

**Previous:** [Part 6: Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)

## References

### Foundational GLM Papers

- Friston, K.J., Holmes, A.P., Worsley, K.J., Poline, J.P., Frith, C.D., & Frackowiak, R.S. (1994). Statistical parametric maps in functional imaging: A general linear approach. *Human Brain Mapping*, 2(4), 189-210. [PDF](https://www.fil.ion.ucl.ac.uk/~karl/Statistical%20parametric%20maps%20in%20functional%20imaging.pdf)
- Worsley, K.J., & Friston, K.J. (1995). Analysis of fMRI time-series revisited - again. *NeuroImage*, 2(3), 173-181. [PubMed](https://pubmed.ncbi.nlm.nih.gov/9343600/)

### Nilearn Documentation

- [First Level Models User Guide](https://nilearn.github.io/stable/glm/first_level_model.html)
- [FirstLevelModel API Reference](https://nilearn.github.io/stable/modules/generated/nilearn.glm.first_level.FirstLevelModel.html)
- [GLM First Level Examples](https://nilearn.github.io/stable/auto_examples/04_glm_first_level/index.html)

### Functional Localizers and ROI Definition

- Kanwisher, N., McDermott, J., & Chun, M.M. (1997). The fusiform face area: A module in human extrastriate cortex specialized for face perception. *Journal of Neuroscience*, 17(11), 4302-4311.
- Epstein, R., & Kanwisher, N. (1998). A cortical representation of the local visual environment. *Nature*, 392, 598-601.
- Downing, P.E., Jiang, Y., Shuman, M., & Kanwisher, N. (2001). A cortical area selective for visual processing of the human body. *Science*, 293(5539), 2470-2473.
- Malach, R., Reppas, J.B., Benson, R.R., Kwong, K.K., Jiang, H., Kennedy, W.A., Ledden, P.J., Brady, T.J., Rosen, B.R., & Tootell, R.B. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. *PNAS*, 92(18), 8135-8139.
- Julian, J.B., Fedorenko, E., Webster, J., & Kanwisher, N. (2012). An algorithmic method for functionally defining regions of interest in the ventral visual pathway. *NeuroImage*, 60(4), 2357-2364.
- Kriegeskorte, N., Simmons, W.K., Bellgowan, P.S., & Baker, C.I. (2009). Circular analysis in systems neuroscience: The dangers of double dipping. *Nature Neuroscience*, 12(5), 535-540.

### Retinotopic Mapping

- Dumoulin, S.O., & Wandell, B.A. (2008). Population receptive field estimates in human visual cortex. *NeuroImage*, 39(2), 647-660.
- Benson, N.C., Butt, O.H., Brainard, D.H., & Aguirre, G.K. (2014). Correction of distortion in flattened representations of the cortical surface allows prediction of V1-V3 functional organization from anatomy. *PLoS Computational Biology*, 10(3), e1003538.
- Benson, N.C., & Winawer, J. (2018). Bayesian analysis of retinotopic maps. *eLife*, 7, e40224.

### Single-Trial Estimation

- Mumford, J.A., Turner, B.O., Ashby, F.G., & Poldrack, R.A. (2012). Deconvolving BOLD activation in event-related designs for multivoxel pattern classification analyses. *NeuroImage*, 59(3), 2636-2643. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3251697/)
- Kay, K.N., Rokem, A., Winawer, J., Dougherty, R.F., & Wandell, B.A. (2013). GLMdenoise: A fast, automated technique for denoising task-based fMRI data. *Frontiers in Neuroscience*, 7, 247.
- Prince, J.S., Charest, I., Kurzawski, J.W., Pyles, J.A., Tarr, M.J., & Kay, K.N. (2022). Improving the accuracy of single-trial fMRI response estimates using GLMsingle. *eLife*, 11, e77599. [Paper](https://elifesciences.org/articles/77599) | [GitHub](https://github.com/cvnlab/GLMsingle) | [Documentation](https://glmsingle.readthedocs.io)

### Multiple Comparisons Correction

- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289-300. [Paper](https://rss.onlinelibrary.wiley.com/doi/10.1111/j.2517-6161.1995.tb02031.x)
- Genovese, C.R., Lazar, N.A., & Nichols, T. (2002). Thresholding of statistical maps in functional neuroimaging using the false discovery rate. *NeuroImage*, 15(4), 870-878. [PubMed](https://pubmed.ncbi.nlm.nih.gov/11906227/)
- Eklund, A., Nichols, T.E., & Knutsson, H. (2016). Cluster failure: Why fMRI inferences for spatial extent have inflated false-positive rates. *PNAS*, 113(28), 7900-7905. [Paper](https://www.pnas.org/doi/full/10.1073/pnas.1602413113)
