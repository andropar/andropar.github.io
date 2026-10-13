---
title: "Preprocessing fMRI Data"
description: "Essential preprocessing steps, tools, and workflows for preparing fMRI data for analysis. Part 5 of an 8-part fMRI crash course."
date: 2025-04-07
draft: true
tags: ["fMRI", "neuroscience", "methods", "preprocessing"]
---

*This is Part 5 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

Raw fMRI data is a mess. If you tried to analyze it directly, you'd mostly be analyzing head motion, scanner distortions and timing offsets, with a small neural signal somewhere underneath. Preprocessing is how we get that signal back out.

If preprocessing goes wrong, everything downstream goes wrong with it. The worst case isn't a null result, it's a result that looks meaningful but is actually driven by an artifact. Luckily, modern tools have made preprocessing much easier than it used to be. You still need to understand what they're doing, though, otherwise you won't notice when something breaks.

## Why preprocessing matters

A few things are wrong with the data that comes off the scanner.

Your subject moved. Even very cooperative participants shift their head over a long session, and a movement of 1-2 mm can cause signal changes much larger than the effects you're after. Remember that task-related BOLD changes are often only around 1-2%, while motion can change the signal in a voxel by 10% or more, especially at tissue edges.

The images are distorted. Functional MRI uses echo-planar imaging (EPI) to acquire images quickly, and the price is geometric distortion and signal loss near air-tissue boundaries like the sinuses and ear canals. Orbitofrontal and inferior temporal cortex are the usual victims.

Different slices were acquired at different times. Each volume is acquired as a series of 2D slices spread over one TR, so the first and last slice weren't measured at the same moment. That matters when you model a hemodynamic response that unfolds over a few seconds.

Every subject's brain is different. If you want to compare across subjects or report coordinates others can interpret, you need to bring everyone into a common space.

Preprocessing deals with all of these.

## The BIDS format: get organized first

Before touching any preprocessing, it's worth organizing your data properly. It's boring, but it saves a lot of time later.

BIDS (Brain Imaging Data Structure) is a standard for organizing neuroimaging data, and by now almost everyone uses it. A BIDS dataset looks like this:

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

Subject folders are named `sub-XX`, anatomical scans go in `anat/` and functional scans in `func/`. Each `.nii.gz` file has a `.json` sidecar with the acquisition parameters, and your stimulus timing (`_events.tsv`) sits right next to the run it describes.

The main reason to bother is that nearly every modern tool expects BIDS. fMRIPrep, MRIQC and many analysis packages read it directly, so once your data is in BIDS, a lot of things just work.

If you have DICOM files from the scanner, use a tool like `heudiconv` or `dcm2bids` to convert them. Setting up the conversion takes a bit of effort, but you only do it once per study. You can check the result with the [BIDS Validator](https://bids-standard.github.io/bids-validator/) to catch formatting errors before they cause problems downstream.

## Core preprocessing steps

Here's an overview of the standard steps. I'll go through each one below.

| Step | What it does | Why it matters |
|------|--------------|----------------|
| Slice timing correction | Adjusts for different acquisition times | Accurate timing in event-related designs |
| Motion correction | Aligns all volumes to a reference | Removes motion-induced signal changes |
| Distortion correction | Unwarps EPI distortions | Recovers true anatomy, especially in frontal/temporal regions |
| Coregistration | Aligns functional to anatomical | Enables anatomical localization and segmentation |
| Normalization | Transforms to standard space | Allows group comparisons and coordinate reporting |
| Spatial smoothing | Blurs data with Gaussian kernel | Increases SNR, helps with inter-subject variability |

<img src="/blog/fmri-diagrams/preprocessing-pipeline.svg" alt="fMRI preprocessing pipeline from raw data to analysis-ready data" />

### Slice timing correction

Since each volume is acquired slice by slice over one TR, slice timing correction interpolates the data so that all voxels in a volume look as if they were acquired at the same moment.

The intuition: say you model a response that peaks about 5 seconds after stimulus onset. If the bottom slices were acquired at t=0 and the top slices at t=2 s, the "same" timepoint in your data corresponds to different moments relative to the stimulus in different parts of the brain. Slice timing correction removes that offset.

It matters most for event-related designs and longer TRs (above roughly 2 seconds). With multiband sequences and TRs of a second or less, the offsets are small and the correction matters less, although it doesn't hurt much either. Some researchers avoid it because the interpolation can introduce its own artifacts, and they account for slice timing in the GLM instead. fMRIPrep lets you go either way.

### Motion correction (realignment)

Motion correction aligns every volume in the time series to a reference volume. The head is treated as a rigid body, so it can rotate and translate but not deform. That gives 6 motion parameters per volume: translations in x, y and z, and rotations around each axis (pitch, roll, yaw).

<img src="/blog/fmri-diagrams/motion-traces.svg" alt="Simulated motion parameter traces showing translations and rotations over time" />

*Simulated motion traces, for illustration. Slow drift plus the occasional sudden movement is a typical pattern. The 6 parameters (3 translations, 3 rotations) describe any rigid-body movement.*

Two limitations to keep in mind. Realignment uses interpolation, which smooths your data slightly. And it can only correct for movement between volumes, not within them: if the subject moved while a volume was being acquired, that volume is corrupted in a way realignment can't fix.

The motion parameters are also useful after correction. Motion-related signal changes remain in the data even after alignment, so the parameters (often with their temporal derivatives) are usually added as nuisance regressors to your model. Volumes with large sudden movements, e.g. a framewise displacement (FD, how far the head moved since the previous volume; see [Part 6](/blog/fmri-crash-course-6-quality-assessment)) above 0.5 mm, are sometimes censored entirely (Power et al., 2012).

Always look at your motion parameters. A common rule of thumb is to consider excluding a run if the subject moved more than 3-4 mm in total; [Part 6](/blog/fmri-crash-course-6-quality-assessment) has more concrete thresholds. Motion is also often correlated with the task (people move more during difficult trials or right before responding), so motion artifacts can show up as apparent task effects.

### Distortion correction

EPI images are warped, mostly near air-tissue boundaries: frontal regions near the sinuses and temporal regions near the ear canals get stretched or compressed along the phase-encoding direction (the image axis along which EPI is most sensitive to field errors, usually anterior-posterior), and some signal is lost entirely. Without correction, voxels end up displaced relative to the anatomy, so your functional data won't line up properly with the T1.

There are three common ways to fix this. First, field maps: the scanner measures the inhomogeneities of the magnetic field, which tells you how each voxel was displaced. If your protocol includes field maps (and it should), fMRIPrep uses them automatically. Second, reverse phase encoding: you acquire two short scans with opposite phase-encoding directions (e.g. anterior-posterior and posterior-anterior), so the distortions go in opposite directions, and an algorithm estimates the undistortion field from the difference. This is the approach FSL's `topup` uses. Third, if you have neither, fMRIPrep can estimate the distortion by nonlinearly registering the EPI to the anatomical image (fieldmap-less "SyN" correction, enabled with `--use-syn-sdc`). It works reasonably well, but real field maps are better.

<img src="/blog/fmri-diagrams/epi-distortion.svg" alt="Three sagittal slices: the T1w anatomy, a simulated uncorrected EPI stretched and missing signal near the orbitofrontal cortex, and the corrected EPI with geometry restored but signal still missing" />

*Simulated distortion along the anterior-posterior phase-encoding direction. Correction moves signal back to where it belongs, but it can't bring back signal that was lost to dropout.*

### Coregistration

Coregistration aligns your functional images to the high-resolution anatomical scan, so you can tell which structures your signal actually comes from.

This is harder than it sounds because the two images look different. Functional images have low resolution (~2-3 mm isotropic) and T2* contrast, while anatomical images are high resolution (~1 mm) with T1 contrast. Algorithms deal with this either by maximizing mutual information or with boundary-based registration, which aligns the gray/white matter boundary that is visible in both image types.

Coregistration is one of the most common failure points, so check it. fMRIPrep's HTML reports show the functional image overlaid on the anatomy with tissue boundary contours, which makes this quick.

### Normalization

Normalization transforms each subject's brain into a common template space, typically MNI (Montreal Neurological Institute) space. That lets you compare across subjects, report coordinates others can interpret, and use atlases and parcellations defined in standard space.

The transformation is nonlinear: different regions get stretched or compressed by different amounts to match the template. ANTs, which fMRIPrep uses, does this very well, but it can't remove individual differences in anatomy, so "the same" MNI coordinate can fall into slightly different structures in different subjects.

You don't always want to normalize. For single-subject analyses you might stay in native space to keep the subject's actual anatomy. In vision research, retinotopic mapping and other analyses of individually defined visual areas are usually done in native space, often on the cortical surface (more on that below). High-resolution studies also tend to avoid normalization to keep fine spatial detail.

### Spatial smoothing

Smoothing convolves the data with a Gaussian kernel, typically 4-8 mm FWHM (full width at half maximum). This increases the SNR by averaging neighboring voxels, reduces the impact of residual misalignment between subjects, and makes the data more normally distributed, which helps the statistics.

Don't smooth (much) for MVPA. Multivariate pattern analysis relies on fine-grained spatial patterns, and smoothing blurs them. For MVPA, either skip smoothing or use very little (2-3 mm).

That's also why fMRIPrep doesn't smooth by default. Different analyses need different amounts, so the choice is left to the analysis step.

<img src="/blog/fmri-diagrams/smoothing-effects.png" alt="Effect of spatial smoothing on brain images at 0mm, 4mm, 6mm, and 8mm FWHM" />

*The effect of Gaussian smoothing at different kernel sizes. Fine anatomical details become progressively blurred as FWHM increases.*

## fMRIPrep

Unless you have a specific reason not to, I'd use fMRIPrep.

fMRIPrep is a preprocessing pipeline that combines tools from FSL, FreeSurfer, ANTs and AFNI into one workflow that follows current best practices and needs very little configuration. It's well tested, reproducible, and produces good quality control reports. The developers call it a "glass box": every step is documented, but you don't have to make dozens of parameter decisions unless you want to.

### Running fMRIPrep

fMRIPrep runs in a container (Docker, or Singularity/Apptainer on clusters), so the software environment is identical across machines. A typical call looks like this:

```bash
# Using Docker
docker run --rm -it \
    -v /path/to/bids_dataset:/data:ro \
    -v /path/to/output:/out \
    -v /path/to/work:/work \
    -v /path/to/freesurfer_license.txt:/license.txt:ro \
    nipreps/fmriprep:24.1.1 \
    /data /out participant \
    --participant-label 01 \
    -w /work \
    --fs-license-file /license.txt \
    --output-spaces MNI152NLin2009cAsym:res-2 T1w \
    --nprocs 8 \
    --mem-mb 32000
```

```bash
# Using Singularity/Apptainer (for HPC clusters)
singularity run --cleanenv \
    -B /path/to/bids_dataset:/data:ro \
    -B /path/to/output:/out \
    -B /path/to/work:/work \
    -B /path/to/freesurfer_license.txt:/license.txt:ro \
    /path/to/fmriprep-24.1.1.sif \
    /data /out participant \
    --participant-label 01 \
    -w /work \
    --fs-license-file /license.txt \
    --output-spaces MNI152NLin2009cAsym:res-2 T1w \
    --nprocs 8 \
    --mem-mb 32000
```

Pin a specific version instead of using `latest`. Results can change between fMRIPrep releases, so you want every subject processed with the same version, and you should report that version in your methods section.

Flags worth knowing:

- `--output-spaces`: which spaces to write outputs in. `MNI152NLin2009cAsym:res-2` is MNI space at 2 mm, `T1w` is the subject's native anatomical space.
- `--participant-label`: process specific subjects instead of the whole dataset.
- `-w`: the working directory for intermediate files. It gets big, so put it somewhere with space, and keep it if you want to resume an interrupted run.
- `--fs-no-reconall`: skip FreeSurfer surface reconstruction (much faster, but you lose all surface outputs).
- `--ignore fieldmaps`: skip distortion correction if your field maps are problematic.

### What you get out

fMRIPrep writes a tidy output directory:

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

The preprocessed BOLD data is your starting point for analysis, and the confounds file next to it is what you'll use to build nuisance regressors.

### The HTML reports

Every run produces an HTML report per subject, and this is where you'll catch most preprocessing problems. It shows:

- anatomical processing with tissue segmentation overlays
- functional-to-anatomical coregistration
- motion parameter plots
- temporal SNR maps
- distortion correction before/after comparisons

Look at the report for every single subject. It takes about 5 minutes each, which is nothing compared to finding a broken registration after you've run your whole analysis.

### Confound regressors

The `_desc-confounds_timeseries.tsv` file contains dozens of potential nuisance regressors. The ones you'll use most:

- `trans_x`, `trans_y`, `trans_z`: translation parameters
- `rot_x`, `rot_y`, `rot_z`: rotation parameters
- `framewise_displacement`: summary motion metric per volume
- `csf`, `white_matter`: mean signal in CSF and white matter
- `global_signal`: mean signal across the whole brain (whether to regress it out is controversial)
- `cosine_XX`: discrete cosine basis functions for high-pass filtering

Which ones to use depends on your analysis. A common default is the 6 motion parameters plus their temporal derivatives, possibly with the CSF and white matter signals. Resting-state analyses usually clean more aggressively, while for task fMRI with short event-related designs, lighter cleaning is often more appropriate.

Older fMRIPrep versions could also run ICA-AROMA and output its motion components as confounds. That was removed in version 23.1.0. If you want AROMA, a separate fMRIPost-AROMA tool exists that runs on fMRIPrep outputs.

## Surface or volume?

So far everything has been in the volume: 3D voxel grids, either in native or MNI space. In vision research, a lot of analysis happens on the cortical surface instead. The reason is that visual areas are organized along the cortical sheet. Retinotopic maps run along the folded cortex, and two points that are close in the volume can be far apart on the surface if they sit on opposite banks of a sulcus. Smoothing or searching over neighboring voxels in the volume mixes signal across those banks; doing it on the surface doesn't.

<img src="/blog/fmri-diagrams/surface-vs-volume.svg" alt="Schematic of a folded cortical ribbon around a sulcus. Two points on opposite banks are 4 mm apart in the volume but about 12 mm apart along the cortex, and a 3D kernel around them covers both banks" />

*Schematic. Two points on opposite banks of a sulcus are close in 3D but far apart along the cortical sheet. Volume-based smoothing or searchlights mix signal from both banks; surface-based analysis follows the sheet.*

Many tools and resources in the field assume surface data. Retinotopic atlases that predict the location of V1-V3 from anatomy work on the FreeSurfer surface (Benson et al., 2014; Benson & Winawer, 2018), and NSD provides its data on subject-native and fsaverage surfaces alongside the volume (Allen et al., 2022).

fMRIPrep can give you surface outputs as long as it runs FreeSurfer's `recon-all`, which it does by default:

```bash
--output-spaces T1w MNI152NLin2009cAsym:res-2 fsnative fsaverage \
--cifti-output 91k
```

`fsnative` is the subject's own reconstructed surface and `fsaverage` is FreeSurfer's template surface; both are written as GIFTI files, one per hemisphere. `--cifti-output 91k` additionally writes CIFTI files in the HCP "grayordinates" format, which combines cortical surface vertices with subcortical voxels.

The trade-off is time. `recon-all` adds several hours per subject, which is why `--fs-no-reconall` is tempting. But if you skip it, you get no surfaces at all. For vision studies I'd almost always run it: retinotopy, atlas-based ROI definitions and surface visualizations all depend on it, and you only pay the cost once per subject.

## Running fMRIPrep on a cluster

fMRIPrep takes hours per subject, so for any real dataset you'll want to run subjects in parallel. On a SLURM cluster the simplest way is an array job with one task per participant. Here's a script I'd start from:

```bash
#!/bin/bash
#SBATCH --job-name=fmriprep
#SBATCH --array=1-30%10
#SBATCH --cpus-per-task=8
#SBATCH --mem=32G
#SBATCH --time=24:00:00
#SBATCH --output=logs/fmriprep_%A_%a.out  # create logs/ before submitting

set -euo pipefail

BIDS=/path/to/bids_dataset
OUT=/path/to/derivatives/fmriprep
IMG=/path/to/fmriprep-24.1.1.sif
LICENSE=/path/to/freesurfer_license.txt

# participants.txt has one label per line (e.g. "01"); array task N gets line N
SUB=$(sed -n "${SLURM_ARRAY_TASK_ID}p" participants.txt)

# Separate work directory per task, on node-local scratch
WORK=${TMPDIR:-/tmp}/fmriprep_work_sub-${SUB}
mkdir -p "$WORK"

# Pre-fetched TemplateFlow templates (compute nodes may have no internet)
export APPTAINERENV_TEMPLATEFLOW_HOME=/templateflow

apptainer run --cleanenv \
    -B "$BIDS":/data:ro \
    -B "$OUT":/out \
    -B "$WORK":/work \
    -B "$LICENSE":/license.txt:ro \
    -B "$HOME/.cache/templateflow":/templateflow \
    "$IMG" \
    /data /out participant \
    --participant-label "$SUB" \
    -w /work \
    --fs-license-file /license.txt \
    --output-spaces MNI152NLin2009cAsym:res-2 T1w fsnative \
    --nprocs "$SLURM_CPUS_PER_TASK" \
    --omp-nthreads 4 \
    --mem-mb 30000 \
    --skip-bids-validation

rm -rf "$WORK"
```

A few notes on this. `--array=1-30%10` runs 30 tasks with at most 10 at a time, so you don't hog the cluster. Create the `logs/` directory before you submit, since SLURM won't create it for you. `--nprocs` sets how many CPUs fMRIPrep uses in total, `--omp-nthreads` how many threads a single process (e.g. an ANTs registration) may use, and `--mem-mb` should be a bit below what you requested from SLURM, so the job isn't killed for going over its memory limit. I've set `--skip-bids-validation` because I validate the dataset once beforehand rather than in every task; leave it out if you haven't.

The work directory goes on node-local scratch because fMRIPrep writes a huge number of small intermediate files, which shared network file systems handle badly. Check what your cluster provides; many set `$TMPDIR` to a per-job local directory. Each task gets its own work directory so parallel runs don't interfere with each other.

fMRIPrep gets its templates (MNI and so on) from TemplateFlow, which downloads them on first use. Compute nodes often have no internet access, so fetch the templates you need once on a login node, using the TemplateFlow Python client with `TEMPLATEFLOW_HOME` pointing at a shared directory, and then point the container there as above. Because of `--cleanenv`, normal environment variables don't reach the container, which is why the script uses the `APPTAINERENV_` prefix (`SINGULARITYENV_` on older Singularity installations).

### Re-using previous results

The most expensive part of a run is usually the FreeSurfer reconstruction. If you already have `recon-all` outputs for your subjects, for example from an earlier fMRIPrep run or a separate anatomical pipeline, you can pass the FreeSurfer subjects directory with `--fs-subjects-dir` and fMRIPrep will reuse the existing reconstructions instead of recomputing them. Similarly, if you keep the work directory from an interrupted run, fMRIPrep picks up the intermediate results that already finished and only recomputes what's missing.

## When to use FSL directly

fMRIPrep covers most cases, but sometimes you want more control.

If your field maps were acquired in a nonstandard way, you might need to run FSL's `topup` or `fugue` yourself with specific parameters. fMRIPrep also doesn't smooth, so if you want to compare several smoothing levels or smooth on the surface, you do that afterwards (e.g. FSL's `fslmaths -s` or FreeSurfer's `mri_surf2surf`). Older datasets that aren't BIDS-compliant can be painful to convert, and sometimes a manual FSL pipeline is less work.

Running the steps yourself is also a good way to learn. FSL's tools (`mcflirt`, `flirt`, `fnirt`, `bet`, `fast`) are well documented and widely used, and I'd recommend going through a manual pipeline at least once to see what each step does. A minimal version looks like this:

```bash
# Brain extraction
bet structural.nii.gz structural_brain -R

# Motion correction (-meanvol also writes the mean volume: func_mc_mean_reg.nii.gz)
mcflirt -in functional.nii.gz -out func_mc -meanvol -plots

# Coregistration of the mean functional to the structural
flirt -in func_mc_mean_reg.nii.gz -ref structural_brain.nii.gz -omat func2struct.mat

# Affine registration of the structural to MNI (initialization for fnirt)
flirt -in structural_brain.nii.gz \
    -ref $FSLDIR/data/standard/MNI152_T1_2mm_brain.nii.gz \
    -omat struct2mni_affine.mat

# Nonlinear normalization (fnirt works on the non-brain-extracted T1)
fnirt --in=structural.nii.gz \
    --ref=$FSLDIR/data/standard/MNI152_T1_2mm.nii.gz \
    --aff=struct2mni_affine.mat \
    --config=T1_2_MNI152_2mm \
    --iout=struct2mni
```

For an actual project, though, I'd still use fMRIPrep. It does all of this and more, with better algorithms, better QC and better reproducibility.

## Summary

- Raw fMRI data needs correction for motion, distortions, slice timing and anatomical differences before you can analyze it. Organize it in BIDS first.
- fMRIPrep is the default choice. Pin its version, and look at the HTML report for every subject.
- Motion correction doesn't remove all motion effects, so include motion regressors in your model and be ready to exclude high-motion runs.
- Don't smooth (much) for MVPA, and consider surface outputs if you work with retinotopic or individually defined visual areas.
- On a cluster, run one participant per SLURM array task with a local work directory and pre-fetched templates.

Preprocessing turns raw data into something you can analyze, but that doesn't mean the data is good. In the next post, we'll look at quality assessment: how to find problems preprocessing can't fix and decide which data to trust.

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

### Surface-Based Analysis and Retinotopy

- Benson, N.C., Butt, O.H., Brainard, D.H., & Aguirre, G.K. (2014). Correction of distortion in flattened representations of the cortical surface allows prediction of V1-V3 functional organization from anatomy. *PLoS Computational Biology*, 10(3), e1003538.
- Benson, N.C., & Winawer, J. (2018). Bayesian analysis of retinotopic maps. *eLife*, 7, e40224.
- Allen, E.J., St-Yves, G., Wu, Y., et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25, 116-126. [https://doi.org/10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)

### Data Organization

- Gorgolewski, K.J., Auer, T., Calhoun, V.D., et al. (2016). The brain imaging data structure, a format for organizing and describing outputs of neuroimaging experiments. *Scientific Data*, 3, 160044. [https://doi.org/10.1038/sdata.2016.44](https://www.nature.com/articles/sdata201644)
- [BIDS Specification](https://bids-specification.readthedocs.io/)

### Software Documentation

- [FSL - FMRIB Software Library](https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/)
- [FreeSurfer](https://surfer.nmr.mgh.harvard.edu/)
- [AFNI - Analysis of Functional NeuroImages](https://afni.nimh.nih.gov/)
- [TemplateFlow](https://www.templateflow.org/)
