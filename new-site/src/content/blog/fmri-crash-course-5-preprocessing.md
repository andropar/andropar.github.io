---
title: "Preprocessing fMRI Data"
description: "Essential preprocessing steps, tools, and workflows for preparing fMRI data for analysis. Part 5 of an 8-part fMRI crash course."
date: 2025-04-07
draft: true
tags: ["fMRI", "neuroscience", "methods", "preprocessing"]
---

*This is Part 5 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

Raw fMRI data is a mess. I don't mean that metaphorically - I mean that if you tried to analyze it directly, you'd get garbage results. The signal you care about is buried under layers of artifacts, distortions, and noise. Preprocessing is how we dig it out.

This might be the most important post in this entire series. You can have the fanciest analysis pipeline in the world, but if your preprocessing is bad, your results will be meaningless. Or worse - they'll look meaningful but actually be driven by artifacts. I've seen papers retracted because of preprocessing errors. It's not pretty.

The good news? Modern tools have made preprocessing dramatically easier than it used to be. The bad news? You still need to understand what's happening under the hood, or you won't catch problems when they inevitably occur.

## Why preprocessing matters

Let me paint you a picture of what raw fMRI data actually looks like:

**Your subject moved.** Even the most cooperative participant shifts their head during a 45-minute scan. A movement of just 1-2 millimeters can cause massive signal changes that dwarf the neural effects you're trying to detect. Remember - we're measuring signal changes of maybe 1-2%. Head motion can cause signal changes of 10% or more.

**The images are distorted.** Functional MRI uses a technique called echo-planar imaging (EPI) to acquire images quickly. The tradeoff? The images get stretched and warped, especially near air-tissue boundaries like the sinuses and ear canals. Your subject's orbitofrontal cortex might look like it belongs to an alien.

**Different brain regions were acquired at different times.** Each 3D brain volume is actually acquired as a series of 2D slices over about 2 seconds. The first slice and the last slice weren't captured at the same moment in time - which matters when you're trying to model a hemodynamic response that evolves over seconds.

**Every subject's brain is different.** If you want to compare activation patterns across subjects or report coordinates that others can interpret, you need to transform everyone's data into a common space.

Preprocessing addresses all of these problems. It's not optional - it's essential.

## The BIDS format: Get organized first

Before we touch any preprocessing, let's talk about data organization. This might seem boring, but trust me - it will save you countless hours of frustration.

BIDS stands for Brain Imaging Data Structure. It's a standardized way to organize neuroimaging data, and it's become the lingua franca of the field. Here's what a BIDS dataset looks like:

```
my_dataset/
├── dataset_description.json
├── participants.tsv
├── sub-01/
│   ├── anat/
│   │   └── sub-01_T1w.nii.gz
│   └── func/
│       ├── sub-01_task-localizer_bold.nii.gz
│       ├── sub-01_task-localizer_events.tsv
│       └── sub-01_task-localizer_bold.json
├── sub-02/
│   └── ...
```

A few things to note:

- **Consistent naming conventions.** Subject folders are `sub-XX`, anatomical scans go in `anat/`, functional scans in `func/`.
- **Metadata in sidecars.** Each `.nii.gz` file has a corresponding `.json` file with acquisition parameters.
- **Event files alongside data.** Your stimulus timing information (`_events.tsv`) lives right next to the functional data it describes.

Why does this matter? Because virtually every modern preprocessing tool expects BIDS-formatted data. fMRIPrep, MRIQC, and countless analysis packages all speak BIDS natively. Format your data once, and everything just works.

If you have DICOM files from the scanner, use a tool like `heudiconv` or `dcm2bids` to convert them. It takes some setup, but it's worth the investment. You can also validate your dataset using the [BIDS Validator](https://bids-standard.github.io/bids-validator/) to catch formatting errors before they cause problems downstream.

## Core preprocessing steps

Here's an overview of the preprocessing pipeline. I'll explain each step in detail below.

| Step | What it does | Why it matters |
|------|--------------|----------------|
| Slice timing correction | Adjusts for different acquisition times | Accurate timing in event-related designs |
| Motion correction | Aligns all volumes to a reference | Removes motion-induced signal changes |
| Distortion correction | Unwarps EPI distortions | Recovers true anatomy, especially in frontal/temporal regions |
| Coregistration | Aligns functional to anatomical | Enables anatomical localization and segmentation |
| Normalization | Transforms to standard space | Allows group comparisons and coordinate reporting |
| Spatial smoothing | Blurs data with Gaussian kernel | Increases SNR, helps with inter-subject variability |

<img src="/blog/fmri-diagrams/preprocessing-pipeline.svg" alt="fMRI preprocessing pipeline from raw data to analysis-ready data" />

Let's dig into each one.

### Slice timing correction

Remember how I said each brain volume is acquired as a series of slices over ~2 seconds? Slice timing correction interpolates the data so that all voxels in a volume appear to have been acquired at the same moment in time.

Here's the intuition: imagine you're trying to model a neural response that peaks 5 seconds after stimulus onset. If slices at the bottom of the brain were acquired at t=0 and slices at the top were acquired at t=2s, the "same" timepoint in your data actually represents different moments relative to the stimulus. Slice timing correction fixes this.

**When does it matter?** Mostly for event-related designs where precise timing is crucial, and when your TR is relatively long (>2 seconds). With modern multiband sequences that achieve TRs of 1 second or less, slice timing correction becomes less critical - but it doesn't hurt.

**When to skip it?** Some researchers argue that slice timing correction can introduce interpolation artifacts and prefer to model slice timing differences in the GLM instead. fMRIPrep gives you both options.

### Motion correction (realignment)

This is arguably the most important preprocessing step. Motion correction aligns all volumes in your time series to a reference volume, correcting for head movement.

The algorithm treats each volume as a rigid body - meaning it can rotate and translate but not stretch or deform. This gives us 6 motion parameters: translation in X, Y, and Z, plus rotation around each axis (pitch, roll, yaw).

<img src="/blog/fmri-diagrams/motion-traces.svg" alt="Example motion parameter traces showing translations and rotations over time" />

*Example motion traces from a real scan. Note the drift and sudden movements - these are typical. 6 parameters describe any rigid body movement: 3 translations + 3 rotations.*

**Here's the key insight:** motion correction uses interpolation, which inevitably smooths your data slightly. More importantly, it can only correct for movement between volumes - not within them. If your subject moved during a volume acquisition, that volume is corrupted in ways motion correction can't fix.

**The motion parameters matter beyond correction.** Even after alignment, motion-correlated signal changes remain in your data. These parameters (and their derivatives) are typically included as nuisance regressors in your statistical model. Sudden large movements (>0.5mm framewise displacement) might warrant censoring those timepoints entirely.

A good quality control practice: always look at your motion parameters. If a subject moved more than 3-4mm total, consider excluding that run or subject. Motion and neural signal are often correlated (subjects move more during hard tasks, when they're about to respond, etc.), so motion artifacts can masquerade as real effects.

### Distortion correction

EPI images are warped, especially in regions with air-tissue boundaries. The frontal lobes near the sinuses and the temporal lobes near the ear canals get stretched and displaced. Without correction, you might think a voxel is in the orbitofrontal cortex when it's actually in the insula.

There are several approaches to fixing this:

**Field maps.** The scanner can acquire a map of the magnetic field inhomogeneities. This map tells us exactly how each voxel should be displaced, allowing precise correction. If your protocol includes field map acquisitions (and it should), fMRIPrep will use them automatically.

**Reverse phase encoding.** Acquire two short scans with opposite distortion directions (usually anterior-posterior and posterior-anterior). The distortions flip, and algorithms can estimate the undistortion field from the difference. This is the "topup" approach.

**SyN-based correction.** If you don't have field maps, fMRIPrep can estimate distortions by nonlinearly aligning your EPI to the anatomical image. It works surprisingly well, though dedicated field maps are still preferable.

### Coregistration

Coregistration aligns your functional images to your high-resolution anatomical scan. This enables anatomical localization - figuring out which brain structures your activations are actually in.

The challenge is that functional and anatomical images have different contrasts and resolutions. Functional images are lower resolution (~2-3mm isotropic) and have T2* contrast, while anatomicals are high resolution (~1mm) with T1 contrast.

Modern algorithms use mutual information or boundary-based registration to find the alignment despite these differences. Boundary-based registration is particularly clever - it aligns the boundaries between gray matter, white matter, and CSF, which are visible in both image types.

**Always check your coregistration.** This is one of the most common failure points. fMRIPrep's HTML reports make this easy - you'll see the functional data overlaid on the anatomical with contour lines marking tissue boundaries.

### Normalization

Normalization transforms each subject's brain into a common template space - typically MNI (Montreal Neurological Institute) space. This allows you to:

- Compare activations across subjects
- Report coordinates that others can interpret
- Use atlases and parcellations defined in standard space

The transformation is nonlinear - different brain regions get stretched or compressed different amounts to match the template. Modern algorithms like ANTs (used by fMRIPrep) are remarkably good at this, but they're not perfect. Individual differences in brain anatomy mean that "the same" MNI coordinate might be in slightly different structures across subjects.

**When not to normalize:** For single-subject analyses, you might prefer to stay in native space to preserve the subject's actual anatomy. For retinotopic mapping in vision research, native space is often preferable. Some high-resolution fMRI studies also avoid normalization to preserve fine spatial detail.

### Spatial smoothing

Smoothing convolves your data with a Gaussian kernel, typically 4-8mm FWHM (full width at half maximum). This:

- Increases signal-to-noise ratio by averaging neighboring voxels
- Reduces the impact of residual misalignment between subjects
- Makes your data more normally distributed (helpful for statistics)

**Critical point: Don't smooth for MVPA.** Multivariate pattern analysis relies on fine-grained spatial patterns. Smoothing blurs these patterns away. For MVPA, either skip smoothing entirely or use very minimal smoothing (2-3mm).

This is why fMRIPrep doesn't smooth your data by default - it leaves that choice to you, for the analysis step. Different analyses need different levels of smoothing.

<img src="/blog/fmri-diagrams/smoothing-effects.png" alt="Effect of spatial smoothing on brain images at 0mm, 4mm, 6mm, and 8mm FWHM" />

*The effect of Gaussian smoothing at different kernel sizes. Notice how fine anatomical details become progressively blurred as FWHM increases.*

## fMRIPrep: The modern standard

Let me be direct: unless you have a very specific reason to do otherwise, you should be using fMRIPrep.

fMRIPrep is a preprocessing pipeline that implements best practices from the field, combines the best algorithms from multiple software packages (FSL, FreeSurfer, ANTs, AFNI), and does it all with minimal user input. It's robust, reproducible, and generates beautiful quality control reports.

The philosophy is "glass-box" rather than "black-box" - everything is documented and transparent, but you don't have to make dozens of parameter decisions unless you want to.

### Running fMRIPrep

fMRIPrep runs in a container (Docker or Singularity), which ensures reproducibility across systems. Here's a typical command:

```bash
# Using Docker
docker run --rm -it \
    -v /path/to/bids_dataset:/data:ro \
    -v /path/to/output:/out \
    -v /path/to/freesurfer_license.txt:/license.txt:ro \
    nipreps/fmriprep:latest \
    /data /out participant \
    --participant-label 01 \
    --fs-license-file /license.txt \
    --output-spaces MNI152NLin2009cAsym:res-2 T1w \
    --n-cpus 8 \
    --mem-mb 32000
```

```bash
# Using Singularity (for HPC clusters)
singularity run --cleanenv \
    -B /path/to/bids_dataset:/data:ro \
    -B /path/to/output:/out \
    -B /path/to/freesurfer_license.txt:/license.txt:ro \
    /path/to/fmriprep.sif \
    /data /out participant \
    --participant-label 01 \
    --fs-license-file /license.txt \
    --output-spaces MNI152NLin2009cAsym:res-2 T1w \
    --n-cpus 8 \
    --mem-mb 32000
```

Key flags to know:

- `--output-spaces`: Which spaces to output. `MNI152NLin2009cAsym:res-2` gives you MNI space at 2mm resolution. `T1w` gives you native anatomical space.
- `--participant-label`: Process specific subjects instead of the whole dataset.
- `--fs-no-reconall`: Skip FreeSurfer surface reconstruction (much faster, but you lose surface-based outputs).
- `--ignore fieldmaps`: Skip distortion correction if field maps are problematic.

### What you get out

fMRIPrep produces a well-organized output directory:

```
output/
├── sub-01/
│   ├── anat/
│   │   ├── sub-01_desc-preproc_T1w.nii.gz
│   │   ├── sub-01_dseg.nii.gz  (tissue segmentation)
│   │   └── sub-01_space-MNI152NLin2009cAsym_desc-preproc_T1w.nii.gz
│   ├── func/
│   │   ├── sub-01_task-localizer_space-MNI152NLin2009cAsym_desc-preproc_bold.nii.gz
│   │   ├── sub-01_task-localizer_desc-confounds_timeseries.tsv
│   │   └── sub-01_task-localizer_space-MNI152NLin2009cAsym_desc-brain_mask.nii.gz
│   └── figures/  (QC images)
└── sub-01.html  (THE REPORT)
```

The preprocessed BOLD data is your starting point for analysis. But pay attention to the confounds file - it's crucial.

### The HTML reports

Every fMRIPrep run generates an HTML report for each subject. Open it. Seriously. This is where you'll catch 90% of preprocessing problems.

The report includes:
- Anatomical processing summary with tissue segmentation overlays
- Coregistration quality (functional-to-anatomical alignment)
- Motion parameter plots
- Temporal SNR maps
- Distortion correction before/after comparisons
- ICA-based artifact detection (if enabled)

I cannot stress this enough: look at these reports for every single subject. It takes 5 minutes per subject and will save you from analyzing garbage data.

### Confound regressors

The `_desc-confounds_timeseries.tsv` file contains dozens of potential nuisance regressors. Key ones include:

- **trans_x, trans_y, trans_z**: Translation parameters
- **rot_x, rot_y, rot_z**: Rotation parameters
- **framewise_displacement**: Summary motion metric per volume
- **csf, white_matter**: Mean signal from CSF and white matter
- **global_signal**: Mean signal across the whole brain (controversial whether to regress out)
- **aroma_motion_XX**: ICA-AROMA identified motion components
- **cosine_XX**: DCT basis functions for high-pass filtering

Which confounds to use depends on your analysis. A common "sensible default" is the 6 motion parameters plus their temporal derivatives, plus maybe CSF and white matter signals. For resting-state fMRI, you might be more aggressive. For task fMRI with short event-related designs, less aggressive cleaning is often appropriate.

## When to use FSL directly

fMRIPrep handles 90% of cases beautifully. But sometimes you need more control:

**Custom distortion correction.** If your field maps are acquired in a nonstandard way, you might need to run FSL's `topup` or `fugue` manually with specific parameters.

**Specific smoothing strategies.** fMRIPrep doesn't smooth. For studies where you want to test multiple smoothing levels, or apply surface-based smoothing, you'll apply this yourself afterward (FSL's `fslmaths -s` or FreeSurfer's `mri_surf2surf`).

**Legacy data.** Older datasets might not be BIDS-compliant and might be painful to convert. Sometimes it's easier to just run a manual FSL pipeline.

**Educational purposes.** Understanding what each step does is easier when you run them individually. FSL's tools (`mcflirt`, `flirt`, `fnirt`, `bet`, `fast`) are well-documented and widely used. I'd recommend running through a manual pipeline at least once to really understand what's happening.

A typical FSL pipeline might look like:

```bash
# Brain extraction
bet structural.nii.gz structural_brain -R

# Motion correction
mcflirt -in functional.nii.gz -out func_mc -plots

# Coregistration
flirt -in func_mc_meanvol.nii.gz -ref structural_brain.nii.gz -omat func2struct.mat

# Normalization
fnirt --in=structural_brain.nii.gz --ref=$FSLDIR/data/standard/MNI152_T1_2mm_brain.nii.gz --iout=struct2mni
```

But honestly? For most projects, just use fMRIPrep. It's doing all of this and more, with better algorithms, better QC, and better reproducibility.

## Key Takeaways

1. **Raw fMRI data is messy.** Motion, distortions, timing differences, and anatomical variability all need to be addressed before analysis.

2. **Use BIDS format.** Organize your data properly from the start. Everything downstream will thank you.

3. **fMRIPrep is the modern standard.** Unless you have a specific reason not to, use it. It implements best practices, combines the best algorithms, and generates excellent QC reports.

4. **Always check the QC reports.** Look at every subject's HTML report. Catch problems before they ruin your analysis.

5. **Motion is the enemy.** Motion correction helps, but motion-correlated artifacts remain. Include motion regressors in your model. Consider excluding high-motion subjects.

6. **Don't smooth for MVPA.** Smoothing destroys the fine-grained patterns that multivariate methods rely on.

7. **Understand what's happening.** Even if you use fMRIPrep, know what each step does. You'll be better equipped to diagnose problems and make informed choices.

Preprocessing takes your raw, messy fMRI data and transforms it into something analyzable. But "analyzable" doesn't mean "good." In the next post, we'll talk about quality assessment - how to identify problems that preprocessing can't fix and make informed decisions about which data to trust.

---

**Next:** [Part 6: Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)

**Previous:** [Part 4: Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)

## References

### fMRIPrep

- Esteban, O., Markiewicz, C.J., Blair, R.W., et al. (2019). fMRIPrep: a robust preprocessing pipeline for functional MRI. *Nature Methods*, 16, 111-116. [https://doi.org/10.1038/s41592-018-0235-4](https://www.nature.com/articles/s41592-018-0235-4)
- [fMRIPrep Documentation](https://fmriprep.org/en/stable/)

### Motion Correction

- Power, J.D., Barnes, K.A., Snyder, A.Z., Schlaggar, B.L., & Petersen, S.E. (2012). Spurious but systematic correlations in functional connectivity MRI networks arise from subject motion. *NeuroImage*, 59(3), 2142-2154. [https://doi.org/10.1016/j.neuroimage.2011.10.018](https://pubmed.ncbi.nlm.nih.gov/22019881/)
- Power, J.D., Mitra, A., Laumann, T.O., Snyder, A.Z., Schlaggar, B.L., & Petersen, S.E. (2014). Methods to detect, characterize, and remove motion artifact in resting state fMRI. *NeuroImage*, 84, 320-341. [https://doi.org/10.1016/j.neuroimage.2013.08.048](https://pmc.ncbi.nlm.nih.gov/articles/PMC3849338/)

### Slice Timing Correction

- Sladky, R., Friston, K.J., Trostl, J., Cunnington, R., Moser, E., & Windischberger, C. (2011). Slice-timing effects and their correction in functional MRI. *NeuroImage*, 58(2), 588-594. [https://doi.org/10.1016/j.neuroimage.2011.06.078](https://pmc.ncbi.nlm.nih.gov/articles/PMC3167249/)
- Henson, R., Buechel, C., Josephs, O., & Friston, K.J. (1999). The slice-timing problem in event-related fMRI. *NeuroImage*, 9, S125. [PDF](https://www.researchgate.net/publication/32889571_The_slice-timing_problem_in_event-related_fMRI)

### Spatial Normalization

- Avants, B.B., Tustison, N.J., Song, G., et al. (2011). A reproducible evaluation of ANTs similarity metric performance in brain image registration. *NeuroImage*, 54(3), 2033-2044. [ANTs GitHub](https://github.com/ANTsX/ANTs)
- Tustison, N.J., Cook, P.A., Holbrook, A.J., et al. (2021). The ANTsX ecosystem for quantitative biological and medical imaging. *Scientific Reports*, 11, 9068. [https://doi.org/10.1038/s41598-021-87564-6](https://www.nature.com/articles/s41598-021-87564-6)
- Lancaster, J.L., Tordesillas-Gutierrez, D., Martinez, M., et al. (2007). Bias between MNI and Talairach coordinates analyzed using the ICBM-152 brain template. *Human Brain Mapping*, 28(11), 1194-1205. [https://doi.org/10.1002/hbm.20345](https://brainmap.org/icbm2tal/)

### Data Organization

- Gorgolewski, K.J., Auer, T., Calhoun, V.D., et al. (2016). The brain imaging data structure, a format for organizing and describing outputs of neuroimaging experiments. *Scientific Data*, 3, 160044. [https://doi.org/10.1038/sdata.2016.44](https://www.nature.com/articles/sdata201644)
- [BIDS Specification](https://bids-specification.readthedocs.io/)

### Software Documentation

- [FSL - FMRIB Software Library](https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/)
- [FreeSurfer](https://surfer.nmr.mgh.harvard.edu/)
- [AFNI - Analysis of Functional NeuroImages](https://afni.nimh.nih.gov/)
