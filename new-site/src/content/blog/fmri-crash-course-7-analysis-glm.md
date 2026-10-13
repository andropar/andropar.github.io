---
title: "Analyzing fMRI Data with the GLM"
description: "The General Linear Model for fMRI, first-level analysis, and extracting single-trial responses. Part 7 of an 8-part fMRI crash course."
date: 2025-04-21
draft: true
tags: ["fMRI", "neuroscience", "methods", "GLM", "analysis"]
---

*This is Part 7 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

At this point the data is preprocessed and quality-checked, so we can finally analyze it. The standard tool for task-based fMRI is the General Linear Model (GLM) (Friston et al., 1994; Worsley & Friston, 1995). The name sounded intimidating to me at first, but it's just linear regression, applied to every voxel separately (Lindquist, 2008).

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

Your main regressors describe the experimental conditions. You can't just use a column that is 1 when a face is on screen and 0 otherwise, because of the hemodynamic delay we covered in [Part 3](/blog/fmri-crash-course-3-basics-mri): the BOLD response starts to rise about 2 seconds after neural activity begins and peaks roughly 5-8 seconds after the neural activity has peaked (Lindquist, 2008). For a brief event, that's a peak around 5-6 seconds after onset (Glover, 2011).

So you start with a boxcar (an on/off indicator of when each condition occurred) and convolve it with the hemodynamic response function (HRF). Convolution smears the boxcar out in time according to the HRF's shape, and the result is a smooth, delayed predictor that looks like what the BOLD signal should do. This assumes the BOLD response behaves roughly like a linear system, which Boynton et al. (1996) found to be consistent with their data from V1.

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

Sometimes you care about how much of something happened, not just whether it happened: reaction time, stimulus contrast, rated valence. For these you scale each trial's boxcar by a continuous value before convolving (Büchel et al., 1998). The resulting beta tells you whether the voxel's response scales with that variable.

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

Motion is the obvious one. Preprocessing gives you 6 motion parameters per TR (3 translations, 3 rotations), and these go in as regressors. Movement changes the signal even after realignment (Friston et al., 1996), and it can produce false-positive "activations" (Lemieux et al., 2007), for example if people move more in one condition than another. A common expansion uses 24 motion regressors: Friston et al. (1996) modeled each parameter at the current and the previous volume plus the squares of both, and fMRIPrep provides the closely related set of temporal derivatives and squared terms as ready-made confound columns ([fMRIPrep documentation](https://fmriprep.org/en/stable/outputs.html)).

If you recorded pulse and respiration, you can model cardiac and breathing effects with RETROICOR, which fits low-order Fourier series locked to the phase of the cardiac and respiratory cycles (Glover et al., 2000). Both cause signal fluctuations that add noise and weaken your statistics.

Slow scanner drifts are handled with a high-pass filter, commonly a set of slow cosine regressors (Lindquist, 2008). nilearn's default cutoff is 0.01 Hz, a 100 s period ([nilearn documentation](https://nilearn.github.io/stable/modules/generated/nilearn.glm.first_level.FirstLevelModel.html)), and SPM's default is 128 s, with the advice to check that the cutoff doesn't remove experimental variance ([SPM12 manual](https://www.fil.ion.ucl.ac.uk/spm/doc/spm12_manual.pdf)). In nilearn you set this with the `high_pass` parameter instead of adding the regressors yourself.

Finally, you can censor high-motion volumes with "spike regressors" (Lemieux et al., 2007; Satterthwaite et al., 2013): a column of zeros with a single 1 at a bad timepoint, one column per volume you want to drop. fMRIPrep generates these from framewise displacement and DVARS, with default cutoffs of FD > 0.5 mm or standardized DVARS > 1.5 ([fMRIPrep documentation](https://fmriprep.org/en/stable/outputs.html)); see [Part 6](/blog/fmri-crash-course-6-quality-assessment) for these measures.

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

The `noise_model='ar1'` setting (nilearn's default) is the autocorrelation correction mentioned above. fMRI noise is correlated from one timepoint to the next, and ignoring this can push false-positive rates far from the nominal level (Purdon & Weisskoff, 1998). Modeling the residuals as an AR(1) process and removing that structure ("prewhitening") gives the best linear unbiased estimates if the autocorrelation is estimated accurately (Woolrich et al., 2001). SPM uses an AR(1) model by default as well ([SPM12 manual](https://www.fil.ion.ucl.ac.uk/spm/doc/spm12_manual.pdf)).

Do look at the design matrix plot every time. A lot of analysis bugs (wrong onsets, a condition that never appears, confounds with NaNs in the first row) are obvious once you see the matrix.

### Contrasts and t-maps

After fitting you have a beta for every regressor at every voxel. A beta on its own says nothing about how noisy it is. To test a hypothesis you define a contrast, a weighted combination of betas, and compare its estimated value to the uncertainty of that estimate, which gives a t-statistic (Friston et al., 1994; [nilearn documentation](https://nilearn.github.io/stable/glm/glm_intro.html)). "Where do faces activate more than houses?" is the contrast `[1, -1]` on the face and house betas.

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

In vision research you'll rarely look at the whole brain. Much more often you want the responses of a specific region, like the fusiform face area (FFA) or V1, in each participant. Category-selective regions sit in roughly the same place in everyone, but their exact location varies across people, so the usual approach is to define them per subject with a functional localizer (Julian et al., 2012; Marvi et al., 2025): a few short block-design runs (see [Part 4](/blog/fmri-crash-course-4-recording-experiments)) showing, for example, faces, scenes, bodies, objects and scrambled objects.

You fit a regular GLM to the localizer runs and compute contrasts like these (the four used by Julian et al., 2012):

- faces > objects: FFA (Kanwisher et al., 1997) and the occipital face area, OFA (Gauthier et al., 2000)
- scenes > objects: PPA (Epstein & Kanwisher, 1998), the occipital place area (OPA, previously called TOS) and the retrosplenial complex (RSC) (Dilks et al., 2013); the scene-selective part of RSC is also called the medial place area, MPA (Silson et al., 2016)
- bodies > objects: EBA (Downing et al., 2001)
- objects > scrambled objects: the lateral occipital complex, LOC (Malach et al., 1995)

```python
loc_model = FirstLevelModel(t_r=2.0, hrf_model='spm', drift_model='cosine',
                            high_pass=0.01, smoothing_fwhm=4, mask_img=brain_mask)
loc_model.fit(localizer_runs, events=localizer_events,
              confounds=localizer_confounds)

# 'face' and 'object' must match the trial_type labels in your events files
faces_z = loc_model.compute_contrast('face - object', output_type='z_score')
```

Julian et al. (2012) smoothed their localizer data (6 mm FWHM), though they also found the major regions without smoothing. A thresholded contrast map usually has more than one blob, and deciding by hand which cluster is "the FFA" is subjective (Julian et al., 2012). A cleaner option is their group-constrained subject-specific (GSS) method: group-derived parcels mark where each region tends to be, and you intersect a parcel with the subject's thresholded contrast map ([Kanwisher lab GSS page](https://web.mit.edu/bcs/nklab/GSS.shtml)). A common variant skips the fixed threshold and keeps the most selective voxels inside the parcel, such as the top 10% (Marvi et al., 2025) or a fixed number like the top 100 (Kamps et al., 2022). A fixed number of voxels also gives ROIs of the same size in every subject.

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

*Simulated localizer results on an inflated surface. Face-selective FFA sits on the lateral fusiform gyrus, scene-selective PPA medial to it near the collateral sulcus (Grill-Spector & Weiner, 2014), and OFA further back in occipital cortex.*

One rule you must not break: define the ROI on data that is independent of the data you analyze afterwards. If you select voxels because they respond more to faces and then report that the same data shows a stronger response to faces, the result is largely produced by the selection. Kriegeskorte et al. (2009) showed that this "double dipping" gives distorted statistics and spurious effects even in pure noise. Their fix is to use independent data for the final analysis: separate localizer runs, or, if you must localize with the main experiment, split the runs (e.g. define the ROI on odd runs, analyze even runs).

## Retinotopic mapping

Early visual areas (V1, V2, V3, and beyond) aren't defined by category contrasts but by their maps of the visual field (Wandell et al., 2007). To find them you run retinotopic mapping: stimuli like rotating wedges and expanding rings, analyzed either with a phase-encoded analysis (which phase of the stimulus cycle drives each voxel most; Sereno et al., 1995) or with population receptive field (pRF) modeling (Dumoulin & Wandell, 2008). The pRF approach fits a model of each voxel's receptive field, in its original form a 2D Gaussian, and gives you the visual field position (polar angle, eccentricity) and pRF size per voxel (Dumoulin & Wandell, 2008).

<img src="/blog/fmri-diagrams/prf-model.svg" alt="Left: the visual field with a bar stimulus and a Gaussian population receptive field. Right: simulated voxel time series and the pRF model prediction over four bar sweeps" />

*Simulated pRF fit. The model predicts a response whenever the bar overlaps the voxel's Gaussian receptive field, convolved with the HRF. Fitting the position and size of that Gaussian gives polar angle, eccentricity and pRF size for each voxel.*

The borders between V1, V2 and V3 sit where the polar angle map reverses direction, so neighboring areas have mirror-reversed maps, which you trace on an inflated or flattened cortical surface (Sereno et al., 1995; Wandell et al., 2007). For fitting, [analyzePRF](https://kendrickkay.net/analyzePRF/) (MATLAB) implements a pRF model with a compressive nonlinearity (Kay et al., 2013b), and [prfpy](https://github.com/VU-Cog-Sci/prfpy) is a Python package for simulating and fitting pRFs.

If you don't have mapping data, the anatomical retinotopy template in [neuropythy](https://github.com/noahbenson/neuropythy) predicts the location and retinotopic organization of V1-V3 from a subject's FreeSurfer reconstruction alone (Benson et al., 2014). If you have even a small amount of mapping data, neuropythy's Bayesian method combines it with the template and predicts held-out data better than either the template or the data alone (Benson & Winawer, 2018).

## Group-level analysis and multiple comparisons

So far everything has been within one subject. If you want to claim that an effect holds in the population, you run a second-level (random-effects) analysis: take each subject's contrast estimate map (the effect size, not the t-map) in a common space like MNI, and test across subjects whether the mean effect differs from zero. This simple two-stage approach is by far the most common one, and Mumford & Nichols (2009) showed it gives valid group inferences with nearly optimal sensitivity. In nilearn:

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

The catch is that you're running one test per voxel, so on the order of 100,000 tests (Nichols & Hayasaka, 2003). If none of them had a real effect, p < 0.05 uncorrected would still flag about 5% of them, thousands of voxels. The main ways to deal with this:

- Voxelwise family-wise error (FWE) control, e.g. Bonferroni (`height_control='bonferroni'`), random field theory as in SPM, or permutation tests (Nichols & Hayasaka, 2003). FWE methods tend to be conservative, so you lose sensitivity (Genovese et al., 2002; Lindquist, 2008).
- False discovery rate (FDR; Benjamini & Hochberg, 1995; Genovese et al., 2002), which controls the expected proportion of false positives among the voxels you call significant. Less strict than FWE.
- Cluster-level inference: threshold the map at a cluster-forming threshold and then ask whether a cluster is larger than you'd expect by chance (Woo et al., 2014).

<img src="/blog/fmri-diagrams/fdr-thresholding.svg" alt="Three panels of a simulated statistical map: unthresholded z-values, a lenient uncorrected threshold with many scattered false positives, and an FDR-corrected threshold with far fewer" />

*Simulated map with three true effects. A lenient uncorrected threshold finds the effects but also many scattered false positives; FDR keeps the effects and removes most of the noise.*

Cluster inference needs care. Eklund et al. (2016) ran millions of group analyses on null data and found that parametric cluster inference in SPM, FSL and AFNI gave familywise error rates of up to 70% instead of the nominal 5%. A cluster-forming threshold of p < 0.001 gave much better error control than p < 0.01, though not always nominal, while a nonparametric permutation test stayed close to 5% for both voxelwise and clusterwise inference (Eklund et al., 2016). Woo et al. (2014) recommend p < 0.001 as the minimum cluster-forming threshold. nilearn has a permutation test in `non_parametric_inference` (in `nilearn.glm.second_level`), which also supports cluster-level inference ([nilearn documentation](https://nilearn.github.io/stable/modules/generated/nilearn.glm.second_level.non_parametric_inference.html)).

Note that the `cluster_threshold` in the snippet above just removes clusters smaller than the given size ([nilearn documentation](https://nilearn.github.io/stable/modules/generated/nilearn.glm.threshold_stats_img.html)). It isn't a cluster-level test.

Also, many vision studies never do whole-brain group statistics at all. Dense-sampling datasets like NSD (Allen et al., 2022), THINGS-data (Hebart et al., 2023) and LAION-fMRI (Zerbe et al., 2026) scan a few people for many sessions, define retinotopic and category-selective ROIs within each person, and show results per subject. This follows the small-N logic of treating each participant as a replication (Smith & Little, 2018). Subject-specific functional ROIs also tend to beat traditional group analyses in both sensitivity and spatial precision (Nieto-Castañón & Fedorenko, 2012), so if your question is about specific visual areas, ROI-based analysis within individuals is a good fit.

## Single-trial estimation for MVPA

The standard GLM gives you one beta per condition: one "face" response and one "house" response, averaged over all trials of that type. For multivariate pattern analysis (MVPA, [Part 8](/blog/fmri-crash-course-8-multivariate)) you usually want a response estimate for each individual trial, for example to decode which specific face someone saw or to build a representational similarity matrix over hundreds of images. In slow designs that's easy, but in fast event-related designs the responses to neighboring trials overlap in time (Mumford et al., 2012). There are several ways to get these estimates.

### LSA: Least Squares All

The simplest approach is to give every trial its own regressor in one big design matrix (Mumford et al., 2012). MVPA is often run on unsmoothed data, although the evidence that smoothing hurts decoding is mixed (see [Part 5](/blog/fmri-crash-course-5-preprocessing)). Here we use a separate model with `smoothing_fwhm=None`:

```python
# Unsmoothed model for single-trial estimation
st_model = FirstLevelModel(
    t_r=2.0,
    hrf_model='spm',
    drift_model='cosine',
    high_pass=0.01,
    noise_model='ar1',
    smoothing_fwhm=None,   # unsmoothed, as is common for MVPA
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

The problem is that when trials are close together in time (fast event-related designs), their regressors overlap: the HRF of trial 1 is still going when trial 2 starts. The regressors become correlated, and collinearity makes the beta estimates highly variable (Mumford et al., 2012). Least-squares estimates are still unbiased on average (Abdulrahman & Henson, 2016), but any single one can be far off.

<img src="/blog/fmri-diagrams/design-matrix-collinearity.svg" alt="Single-trial regressors for four trials: well separated in a slow design, strongly overlapping in a fast design" />

*Simulated single-trial regressors. With 12 s between trials (left), neighboring regressors barely overlap (r = -0.21 in this simulation). With 3 s between trials (right), the HRFs overlap and neighboring regressors are strongly correlated (r = 0.57), which inflates the variance of the beta estimates.*

### LSS: Least Squares Separate

Mumford et al. (2012) proposed fitting one model per trial. For trial N, the design matrix has one regressor for trial N and a single nuisance regressor for all other trials together. In their simulations, LSS estimates tracked the true trial responses best and gave higher classification accuracy in fast designs. The price is that you fit N models instead of one, and LSS acts as a kind of temporal regularization: it smooths the series of betas, which can blur real differences between nearby trials (Abdulrahman & Henson, 2016). Whether LSS or LSA wins depends on how much the true responses vary from trial to trial relative to scan noise (Abdulrahman & Henson, 2016). A variant models the other trials by condition rather than lumping them together; this uses the condition labels, so train and test your classifier on separate runs (Abdulrahman & Henson, 2016; Mumford et al., 2014).

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

Then there's [GLMsingle](https://github.com/cvnlab/GLMsingle) (Prince et al., 2022), a MATLAB and Python toolbox built for large condition-rich experiments with brief trials and few repetitions per stimulus. It combines three ideas.

First, voxel-wise HRF selection. Instead of assuming one HRF shape for the whole brain, GLMsingle fits the GLM with each HRF from a library of 20 HRFs (derived from NSD data) and picks the best one for each voxel (Prince et al., 2022). The HRF does vary across people and brain regions, and getting it wrong affects the beta estimates (Handwerker et al., 2004).

Second, GLMdenoise (Kay et al., 2013a). It finds voxels unrelated to the task, takes principal components of their timeseries, and uses those as nuisance regressors. The reasoning is that whatever fluctuates in task-unrelated voxels is probably noise, so it can be regressed out everywhere. The number of components is chosen by cross-validation.

Third, fractional ridge regression (Rokem & Kay, 2020). As described above, collinearity between neighboring trials inflates the variance of the beta estimates. Ridge regression shrinks the betas to reduce that variance, and GLMsingle picks the amount of shrinkage separately for each voxel by cross-validation (Prince et al., 2022).

On NSD and BOLD5000, GLMsingle substantially improved the reliability of single-trial betas across visual cortex in all subjects, and it improved representational similarity between subjects and decoding of individual stimuli (Prince et al., 2022). The ridge step does bias neighboring trials toward each other, so the authors caution against it when responses to adjacent trials are the thing you study, as in repetition suppression (Prince et al., 2022).

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

The design format is the main thing to get right. Each design matrix is a binary onset matrix of time x conditions, where each unique condition (e.g. each image) is a column, and the design is sampled at the same rate as the data, so trial onsets have to line up with volume acquisitions; if they don't, the docs suggest resampling data and design to a finer grid. GLMsingle uses repeated presentations of the same condition for its cross-validation, so it needs at least some repeats, although even a handful seems to be enough; without repeats, the denoising and ridge steps can only run with fixed, user-chosen settings (Prince et al., 2022; [GLMsingle documentation](https://glmsingle.readthedocs.io)). The documentation and the example notebooks in the repo cover the details.

## Comparison: LSA vs. LSS vs. GLMsingle

| Aspect | LSA | LSS | GLMsingle |
|--------|-----|-----|-----------|
| **Approach** | All trials in one model | Separate model per trial | One framework with HRF selection, denoising, ridge |
| **Collinearity handling** | None | Other trials collapsed into one regressor | Ridge regression tuned by cross-validation |
| **HRF** | Fixed (canonical) | Fixed (canonical) | Voxel-wise choice from a library |
| **Denoising** | Standard confounds only | Standard confounds only | Data-driven noise regressors |
| **Computation** | Single fit | N fits (slow) | Several fits + cross-validation |
| **When to use** | Slow designs, simple analyses | Fast designs, no extra toolbox | Condition-rich designs with some repeats, especially for MVPA |
| **Ease of use** | Easy (nilearn) | Easy (short loop in nilearn) | Moderate (dedicated toolbox, specific design format) |

## When to use what

For standard condition-level analyses (activation maps, localizers, group studies) you don't need single-trial estimates at all. A regular GLM in nilearn or SPM is fine.

For MVPA with a slow event-related design, where trials are spaced far enough apart that their responses barely overlap (like the 12 s spacing in the figure above), trial-wise estimates are straightforward (Mumford et al., 2012) and LSA is fine.

For MVPA with a fast event-related design, collinearity becomes the main problem. Prince et al. (2022) found that ridge regression gave more reliable betas than LSS, and that the full GLMsingle pipeline improved reliability the most. The GLMsingle documentation adds, as a rough guess, that trial onsets less than 4 s apart would be risky; 4 s worked well in NSD.

For large datasets with thousands of images, like NSD or LAION-fMRI, GLMsingle was built for exactly this kind of data (Prince et al., 2022). NSD's single-trial betas come from the approach that became GLMsingle (Allen et al., 2022), and LAION-fMRI provides GLMsingle betas ([LAION-fMRI](https://laion-fmri.hebartlab.com)).

If you want something without another toolbox, LSS only needs the short loop above, and it beat LSA in fast designs in Mumford et al.'s (2012) comparison.

## Summary

- The GLM explains each voxel's timeseries as a weighted sum of HRF-convolved task regressors and nuisance regressors, and contrasts on the betas test your hypotheses.
- Always plot the design matrix before trusting any results.
- Localizer contrasts plus group-derived parcels give you subject-specific ROIs like FFA and PPA; retinotopic mapping (or an anatomical template) gives you V1-V3. Keep ROI definition independent of the data you analyze.
- Whole-brain group maps need multiple comparisons correction; avoid lenient cluster-forming thresholds, and consider permutation tests.
- For MVPA you need single-trial betas, usually estimated from unsmoothed data. LSS is a quick option that needs only nilearn; GLMsingle gave the most reliable estimates in Prince et al.'s (2022) comparison.

---

With beta estimates in hand, whether condition-level from a standard GLM or single-trial from GLMsingle, we can move on to multivariate methods. In the final post we'll look at how to decode what people are seeing from their brain activity patterns.

**Next:** [Part 8: Multivariate analysis](/blog/fmri-crash-course-8-multivariate)

**Previous:** [Part 6: Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)


## References

### GLM foundations and nuisance modeling

- Boynton, G.M., Engel, S.A., Glover, G.H., & Heeger, D.J. (1996). Linear systems analysis of functional magnetic resonance imaging in human V1. *Journal of Neuroscience*, 16(13), 4207-4221. [doi:10.1523/JNEUROSCI.16-13-04207.1996](https://doi.org/10.1523/JNEUROSCI.16-13-04207.1996)
- Büchel, C., Holmes, A.P., Rees, G., & Friston, K.J. (1998). Characterizing stimulus-response functions using nonlinear regressors in parametric fMRI experiments. *NeuroImage*, 8(2), 140-148. [doi:10.1006/nimg.1998.0351](https://doi.org/10.1006/nimg.1998.0351)
- Friston, K.J., Holmes, A.P., Worsley, K.J., Poline, J.P., Frith, C.D., & Frackowiak, R.S. (1994). Statistical parametric maps in functional imaging: A general linear approach. *Human Brain Mapping*, 2(4), 189-210. [doi:10.1002/hbm.460020402](https://doi.org/10.1002/hbm.460020402)
- Friston, K.J., Williams, S., Howard, R., Frackowiak, R.S., & Turner, R. (1996). Movement-related effects in fMRI time-series. *Magnetic Resonance in Medicine*, 35(3), 346-355. [doi:10.1002/mrm.1910350312](https://doi.org/10.1002/mrm.1910350312)
- Glover, G.H., Li, T.Q., & Ress, D. (2000). Image-based method for retrospective correction of physiological motion effects in fMRI: RETROICOR. *Magnetic Resonance in Medicine*, 44(1), 162-167. [PubMed](https://pubmed.ncbi.nlm.nih.gov/10893535/)
- Handwerker, D.A., Ollinger, J.M., & D'Esposito, M. (2004). Variation of BOLD hemodynamic responses across subjects and brain regions and their effects on statistical analyses. *NeuroImage*, 21(4), 1639-1651. [doi:10.1016/j.neuroimage.2003.11.029](https://doi.org/10.1016/j.neuroimage.2003.11.029)
- Lemieux, L., Salek-Haddadi, A., Lund, T.E., Laufs, H., & Carmichael, D. (2007). Modelling large motion events in fMRI studies of patients with epilepsy. *Magnetic Resonance Imaging*, 25(6), 894-901. [doi:10.1016/j.mri.2007.03.009](https://doi.org/10.1016/j.mri.2007.03.009)
- Glover, G.H. (2011). Overview of functional magnetic resonance imaging. *Neurosurgery Clinics of North America*, 22(2), 133-139. [PMC3073717](https://pmc.ncbi.nlm.nih.gov/articles/PMC3073717/)
- Lindquist, M.A. (2008). The statistical analysis of fMRI data. *Statistical Science*, 23(4), 439-464. [doi:10.1214/09-STS282](https://doi.org/10.1214/09-STS282)
- Purdon, P.L., & Weisskoff, R.M. (1998). Effect of temporal autocorrelation due to physiological noise and stimulus paradigm on voxel-level false-positive rates in fMRI. *Human Brain Mapping*, 6(4), 239-249. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6873371/)
- Satterthwaite, T.D., Elliott, M.A., Gerraty, R.T., Ruparel, K., Loughead, J., Calkins, M.E., Eickhoff, S.B., Hakonarson, H., Gur, R.C., Gur, R.E., & Wolf, D.H. (2013). An improved framework for confound regression and filtering for control of motion artifact in the preprocessing of resting-state functional connectivity data. *NeuroImage*, 64, 240-256. [doi:10.1016/j.neuroimage.2012.08.052](https://doi.org/10.1016/j.neuroimage.2012.08.052)
- Woolrich, M.W., Ripley, B.D., Brady, M., & Smith, S.M. (2001). Temporal autocorrelation in univariate linear modeling of FMRI data. *NeuroImage*, 14(6), 1370-1386. [doi:10.1006/nimg.2001.0931](https://doi.org/10.1006/nimg.2001.0931)
- Worsley, K.J., & Friston, K.J. (1995). Analysis of fMRI time-series revisited - again. *NeuroImage*, 2(3), 173-181. [doi:10.1006/nimg.1995.1023](https://doi.org/10.1006/nimg.1995.1023)

### Software documentation

- [nilearn: FirstLevelModel API reference](https://nilearn.github.io/stable/modules/generated/nilearn.glm.first_level.FirstLevelModel.html)
- [nilearn: Introduction to the GLM](https://nilearn.github.io/stable/glm/glm_intro.html)
- [nilearn: threshold_stats_img](https://nilearn.github.io/stable/modules/generated/nilearn.glm.threshold_stats_img.html) and [non_parametric_inference](https://nilearn.github.io/stable/modules/generated/nilearn.glm.second_level.non_parametric_inference.html)
- [nilearn: First Level Models User Guide](https://nilearn.github.io/stable/glm/first_level_model.html) and [GLM First Level Examples](https://nilearn.github.io/stable/auto_examples/04_glm_first_level/index.html)
- [fMRIPrep: Outputs and confounds](https://fmriprep.org/en/stable/outputs.html)
- [SPM12 Manual](https://www.fil.ion.ucl.ac.uk/spm/doc/spm12_manual.pdf)
- [GLMsingle documentation](https://glmsingle.readthedocs.io) and [GitHub repository](https://github.com/cvnlab/GLMsingle)
- [analyzePRF](https://kendrickkay.net/analyzePRF/), [prfpy](https://github.com/VU-Cog-Sci/prfpy), [neuropythy](https://github.com/noahbenson/neuropythy)
- [Kanwisher lab: GSS parcels](https://web.mit.edu/bcs/nklab/GSS.shtml)

### Functional localizers and ROI definition

- Dilks, D.D., Julian, J.B., Paunov, A.M., & Kanwisher, N. (2013). The occipital place area is causally and selectively involved in scene perception. *Journal of Neuroscience*, 33(4), 1331-1336. [doi:10.1523/JNEUROSCI.4081-12.2013](https://doi.org/10.1523/JNEUROSCI.4081-12.2013)
- Downing, P.E., Jiang, Y., Shuman, M., & Kanwisher, N. (2001). A cortical area selective for visual processing of the human body. *Science*, 293(5539), 2470-2473. [doi:10.1126/science.1063414](https://doi.org/10.1126/science.1063414)
- Epstein, R., & Kanwisher, N. (1998). A cortical representation of the local visual environment. *Nature*, 392(6676), 598-601. [doi:10.1038/33402](https://doi.org/10.1038/33402)
- Gauthier, I., Tarr, M.J., Moylan, J., Skudlarski, P., Gore, J.C., & Anderson, A.W. (2000). The fusiform "face area" is part of a network that processes faces at the individual level. *Journal of Cognitive Neuroscience*, 12(3), 495-504. [doi:10.1162/089892900562165](https://doi.org/10.1162/089892900562165)
- Grill-Spector, K., & Weiner, K.S. (2014). The functional architecture of the ventral temporal cortex and its role in categorization. *Nature Reviews Neuroscience*, 15(8), 536-548. [doi:10.1038/nrn3747](https://doi.org/10.1038/nrn3747)
- Julian, J.B., Fedorenko, E., Webster, J., & Kanwisher, N. (2012). An algorithmic method for functionally defining regions of interest in the ventral visual pathway. *NeuroImage*, 60(4), 2357-2364. [doi:10.1016/j.neuroimage.2012.02.055](https://doi.org/10.1016/j.neuroimage.2012.02.055)
- Kamps, F.S., Richardson, H., Murty, N.A.R., Kanwisher, N., & Saxe, R. (2022). Using child-friendly movie stimuli to study the development of face, place, and object regions from age 3 to 12 years. *Human Brain Mapping*, 43(9), 2782-2800. [doi:10.1002/hbm.25815](https://doi.org/10.1002/hbm.25815)
- Kanwisher, N., McDermott, J., & Chun, M.M. (1997). The fusiform face area: A module in human extrastriate cortex specialized for face perception. *Journal of Neuroscience*, 17(11), 4302-4311. [doi:10.1523/JNEUROSCI.17-11-04302.1997](https://doi.org/10.1523/JNEUROSCI.17-11-04302.1997)
- Kriegeskorte, N., Simmons, W.K., Bellgowan, P.S., & Baker, C.I. (2009). Circular analysis in systems neuroscience: The dangers of double dipping. *Nature Neuroscience*, 12(5), 535-540. [doi:10.1038/nn.2303](https://doi.org/10.1038/nn.2303)
- Malach, R., Reppas, J.B., Benson, R.R., Kwong, K.K., Jiang, H., Kennedy, W.A., Ledden, P.J., Brady, T.J., Rosen, B.R., & Tootell, R.B. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. *PNAS*, 92(18), 8135-8139. [doi:10.1073/pnas.92.18.8135](https://doi.org/10.1073/pnas.92.18.8135)
- Marvi, A.I., Hutchinson, S., Fedorenko, E., Saxe, R.R., Kamps, F.S., Regev, T.I., Chen, E.M., & Kanwisher, N.G. (2025). An efficient multifunction fMRI localizer for high-level visual, auditory, and cognitive regions in humans. *Imaging Neuroscience*, 3, IMAG.a.905. [doi:10.1162/imag.a.905](https://doi.org/10.1162/imag.a.905)
- Nieto-Castañón, A., & Fedorenko, E. (2012). Subject-specific functional localizers increase sensitivity and functional resolution of multi-subject analyses. *NeuroImage*, 63(3), 1646-1669. [doi:10.1016/j.neuroimage.2012.06.065](https://doi.org/10.1016/j.neuroimage.2012.06.065)
- Silson, E.H., Steel, A.D., & Baker, C.I. (2016). Scene-selectivity and retinotopy in medial parietal cortex. *Frontiers in Human Neuroscience*, 10, 412. [doi:10.3389/fnhum.2016.00412](https://doi.org/10.3389/fnhum.2016.00412)

### Retinotopic mapping

- Benson, N.C., Butt, O.H., Brainard, D.H., & Aguirre, G.K. (2014). Correction of distortion in flattened representations of the cortical surface allows prediction of V1-V3 functional organization from anatomy. *PLoS Computational Biology*, 10(3), e1003538. [doi:10.1371/journal.pcbi.1003538](https://doi.org/10.1371/journal.pcbi.1003538)
- Benson, N.C., & Winawer, J. (2018). Bayesian analysis of retinotopic maps. *eLife*, 7, e40224. [doi:10.7554/eLife.40224](https://doi.org/10.7554/eLife.40224)
- Dumoulin, S.O., & Wandell, B.A. (2008). Population receptive field estimates in human visual cortex. *NeuroImage*, 39(2), 647-660. [doi:10.1016/j.neuroimage.2007.09.034](https://doi.org/10.1016/j.neuroimage.2007.09.034)
- Kay, K.N., Winawer, J., Mezer, A., & Wandell, B.A. (2013b). Compressive spatial summation in human visual cortex. *Journal of Neurophysiology*, 110(2), 481-494. [doi:10.1152/jn.00105.2013](https://doi.org/10.1152/jn.00105.2013)
- Sereno, M.I., Dale, A.M., Reppas, J.B., Kwong, K.K., Belliveau, J.W., Brady, T.J., Rosen, B.R., & Tootell, R.B. (1995). Borders of multiple visual areas in humans revealed by functional magnetic resonance imaging. *Science*, 268(5212), 889-893. [doi:10.1126/science.7754376](https://doi.org/10.1126/science.7754376)
- Wandell, B.A., Dumoulin, S.O., & Brewer, A.A. (2007). Visual field maps in human cortex. *Neuron*, 56(2), 366-383. [doi:10.1016/j.neuron.2007.10.012](https://doi.org/10.1016/j.neuron.2007.10.012)

### Group analysis and multiple comparisons

- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289-300. [doi:10.1111/j.2517-6161.1995.tb02031.x](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)
- Eklund, A., Nichols, T.E., & Knutsson, H. (2016). Cluster failure: Why fMRI inferences for spatial extent have inflated false-positive rates. *PNAS*, 113(28), 7900-7905. [doi:10.1073/pnas.1602413113](https://doi.org/10.1073/pnas.1602413113)
- Genovese, C.R., Lazar, N.A., & Nichols, T. (2002). Thresholding of statistical maps in functional neuroimaging using the false discovery rate. *NeuroImage*, 15(4), 870-878. [doi:10.1006/nimg.2001.1037](https://doi.org/10.1006/nimg.2001.1037)
- Mumford, J.A., & Nichols, T. (2009). Simple group fMRI modeling and inference. *NeuroImage*, 47(4), 1469-1475. [doi:10.1016/j.neuroimage.2009.05.034](https://doi.org/10.1016/j.neuroimage.2009.05.034)
- Nichols, T., & Hayasaka, S. (2003). Controlling the familywise error rate in functional neuroimaging: A comparative review. *Statistical Methods in Medical Research*, 12(5), 419-446. [doi:10.1191/0962280203sm341ra](https://doi.org/10.1191/0962280203sm341ra)
- Woo, C.W., Krishnan, A., & Wager, T.D. (2014). Cluster-extent based thresholding in fMRI analyses: Pitfalls and recommendations. *NeuroImage*, 91, 412-419. [doi:10.1016/j.neuroimage.2013.12.058](https://doi.org/10.1016/j.neuroimage.2013.12.058)

### Datasets and small-N designs

- Allen, E.J., St-Yves, G., Wu, Y., Breedlove, J.L., Prince, J.S., Dowdle, L.T., Nau, M., Caron, B., Pestilli, F., Charest, I., Hutchinson, J.B., Naselaris, T., & Kay, K. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25(1), 116-126. [doi:10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)
- Hebart, M.N., Contier, O., Teichmann, L., Rockter, A.H., Zheng, C.Y., Kidder, A., Corriveau, A., Vaziri-Pashkam, M., & Baker, C.I. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. *eLife*, 12, e82580. [doi:10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580)
- Smith, P.L., & Little, D.R. (2018). Small is beautiful: In defense of the small-N design. *Psychonomic Bulletin & Review*, 25(6), 2083-2101. [doi:10.3758/s13423-018-1451-8](https://doi.org/10.3758/s13423-018-1451-8)
- Zerbe, J., Roth, J., Mell, M.M., Herholz, P., Knapen, T., & Hebart, M.N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset site](https://laion-fmri.hebartlab.com) | [AWS Open Data](https://registry.opendata.aws/laion-fmri/)

### Single-trial estimation

- Abdulrahman, H., & Henson, R.N. (2016). Effect of trial-to-trial variability on optimal event-related fMRI design: Implications for Beta-series correlation and multi-voxel pattern analysis. *NeuroImage*, 125, 756-766. [doi:10.1016/j.neuroimage.2015.11.009](https://doi.org/10.1016/j.neuroimage.2015.11.009)
- Kay, K.N., Rokem, A., Winawer, J., Dougherty, R.F., & Wandell, B.A. (2013a). GLMdenoise: A fast, automated technique for denoising task-based fMRI data. *Frontiers in Neuroscience*, 7, 247. [doi:10.3389/fnins.2013.00247](https://doi.org/10.3389/fnins.2013.00247)
- Mumford, J.A., Turner, B.O., Ashby, F.G., & Poldrack, R.A. (2012). Deconvolving BOLD activation in event-related designs for multivoxel pattern classification analyses. *NeuroImage*, 59(3), 2636-2643. [doi:10.1016/j.neuroimage.2011.08.076](https://doi.org/10.1016/j.neuroimage.2011.08.076)
- Mumford, J.A., Davis, T., & Poldrack, R.A. (2014). The impact of study design on pattern estimation for single-trial multivariate pattern analysis. *NeuroImage*, 103, 130-138. [doi:10.1016/j.neuroimage.2014.09.026](https://doi.org/10.1016/j.neuroimage.2014.09.026)
- Prince, J.S., Charest, I., Kurzawski, J.W., Pyles, J.A., Tarr, M.J., & Kay, K.N. (2022). Improving the accuracy of single-trial fMRI response estimates using GLMsingle. *eLife*, 11, e77599. [doi:10.7554/eLife.77599](https://doi.org/10.7554/eLife.77599)
- Rokem, A., & Kay, K. (2020). Fractional ridge regression: A fast, interpretable reparameterization of ridge regression. *GigaScience*, 9(12), giaa133. [doi:10.1093/gigascience/giaa133](https://doi.org/10.1093/gigascience/giaa133)
