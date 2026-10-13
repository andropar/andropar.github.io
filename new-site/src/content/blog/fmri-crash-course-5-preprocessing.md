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

Your subject moved. Movement-related signal changes can swamp the effects you're after: in extreme cases, more than 90% of the fMRI signal can be attributed to movement, and these effects remain even after the images are perfectly realigned (Friston et al., 1996).

The images are distorted. Functional MRI uses echo-planar imaging (EPI) to acquire images quickly, and the price is geometric distortion from magnetic field inhomogeneities (Jezzard & Balaban, 1995) and signal loss near bone and air sinuses. The signal loss is concentrated in orbitofrontal cortex and inferior lateral temporal cortex, including part of the fusiform gyrus (Ojemann et al., 1997).

Different slices were acquired at different times. Each volume is usually acquired as a series of 2D slices spread over one TR, so the first and last slice weren't measured at the same moment (Sladky et al., 2011). That matters when you model a hemodynamic response that unfolds over a few seconds.

Every subject's brain is different. If you want to compare across subjects or report coordinates others can interpret, you need to bring everyone into a common space.

Preprocessing deals with all of these.

## The BIDS format: get organized first

Before touching any preprocessing, it's worth organizing your data properly. It's boring, but it saves a lot of time later.

BIDS (Brain Imaging Data Structure) is a community standard for organizing and describing neuroimaging data (Gorgolewski et al., 2016). A BIDS dataset looks like this:

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

The main reason to bother is that a standard layout lets automatic pipelines find and interpret your data without manual configuration (Gorgolewski et al., 2016). fMRIPrep, for example, reads the structure and metadata of a BIDS dataset with no manual intervention (Esteban et al., 2019).

If you have DICOM files from the scanner, use a tool like [`heudiconv`](https://github.com/nipy/heudiconv) or [`dcm2bids`](https://github.com/UNFmontreal/Dcm2Bids) to convert them. Setting up the conversion takes a bit of effort, but you only do it once per study. You can check the result with the [BIDS Validator](https://bids-standard.github.io/bids-validator/) to catch formatting errors before they cause problems downstream.

## Core preprocessing steps

Here's an overview of the standard steps. I'll go through each one below.

| Step | What it does | Why it matters |
|------|--------------|----------------|
| Slice timing correction | Adjusts for different acquisition times | Accurate timing in event-related designs |
| Motion correction | Aligns all volumes to a reference | Removes motion-induced signal changes |
| Distortion correction | Unwarps EPI distortions | Recovers true anatomy, especially in frontal/temporal regions |
| Coregistration | Aligns functional to anatomical | Enables anatomical localization and segmentation |
| Normalization | Transforms to standard space | Allows group comparisons and coordinate reporting |
| Spatial smoothing | Blurs data with Gaussian kernel | Increases SNR, helps with inter-subject variability (Hendriks et al., 2017) |

<img src="/blog/fmri-diagrams/preprocessing-pipeline.svg" alt="fMRI preprocessing pipeline from raw data to analysis-ready data" />

### Slice timing correction

Since each volume is acquired slice by slice over one TR, slice timing correction interpolates the data so that all voxels in a volume look as if they were acquired at the same moment.

The intuition: say you model a response that peaks about 5 seconds after stimulus onset. If the bottom slices were acquired at t=0 and the top slices at t=2 s, the "same" timepoint in your data corresponds to different moments relative to the stimulus in different parts of the brain. Slice timing correction removes that offset.

In simulations, slice timing effects were largest for event-related designs, short stimulus intervals and long TRs, and slice timing correction reliably reduced them (Sladky et al., 2011). Long TRs are also where the interpolation is hardest, so some people instead account for slice timing in the GLM, e.g. with temporal derivative regressors (Sladky et al., 2011). Short TRs don't make the problem go away entirely: slice timing correction still helped with sub-second TRs (Parker & Razlighi, 2019). fMRIPrep applies it whenever the `SliceTiming` metadata is present and lets you switch it off with `--ignore slicetiming` ([fMRIPrep workflows docs](https://fmriprep.org/en/stable/workflows.html)).

### Motion correction (realignment)

Motion correction aligns every volume in the time series to a reference volume. The head is treated as a rigid body, so it can rotate and translate but not deform. That gives 6 motion parameters per volume: translations in x, y and z, and rotations around each axis ([FSL MCFLIRT docs](https://fsl.fmrib.ox.ac.uk/fsl/docs/registration/mcflirt.html); [fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)).

<img src="/blog/fmri-diagrams/motion-traces.svg" alt="Simulated motion parameter traces showing translations and rotations over time" />

*Simulated motion traces, for illustration. Slow drift plus the occasional sudden movement is a typical pattern. The 6 parameters (3 translations, 3 rotations) describe any rigid-body movement.*

Two limitations to keep in mind. Realignment resamples the images, and interpolation smooths the data slightly; fMRIPrep therefore combines all spatial transforms into a single resampling step with Lanczos interpolation (Esteban et al., 2019). And the motion estimates are computed per volume, so motion that affects only some slices of a volume isn't captured by them (Power et al., 2015).

The motion parameters are also useful after correction. Motion-related signal changes remain in the data even after alignment (Friston et al., 1996), so the parameters are usually added as nuisance regressors to your model, often with their temporal derivatives, which account for a one-frame delay in the effect of motion (Satterthwaite et al., 2013). Volumes with large sudden movements can also be censored entirely: Power et al. (2012) removed volumes with a framewise displacement (FD, how far the head moved since the previous volume; see [Part 6](/blog/fmri-crash-course-6-quality-assessment)) above 0.5 mm that also exceeded a DVARS threshold.

Always look at your motion parameters; [Part 6](/blog/fmri-crash-course-6-quality-assessment) covers thresholds for excluding runs. Motion can also be correlated with the task, and then motion artifacts show up as apparent task effects: Hajnal et al. (1994) found stimulus-correlated motion in all eight visual and motor studies they examined, and the resulting artifacts looked strikingly like activation maps. Regressing out such motion also removes part of the real effect (Bullmore et al., 1999).

### Distortion correction

EPI images are warped, mostly near air-tissue boundaries: magnetic field inhomogeneities shift voxels, mostly along the phase-encoding direction (the image axis along which EPI is most sensitive to field errors), so regions near the sinuses and ear canals get stretched or compressed (Jezzard & Balaban, 1995), and some signal is lost entirely (Ojemann et al., 1997). Without correction, voxels end up displaced relative to the anatomy, so your functional data won't line up properly with the T1.

There are three common ways to fix this. First, field maps: the scanner measures the inhomogeneities of the magnetic field, which tells you how each voxel was displaced (Jezzard & Balaban, 1995). If your dataset includes field maps and the BIDS metadata links them to the runs, fMRIPrep uses them without further action ([fMRIPrep workflows docs](https://fmriprep.org/en/stable/workflows.html)). Second, reverse phase encoding: you acquire two scans with opposite phase-encoding directions (e.g. anterior-posterior and posterior-anterior), so the distortions go in opposite directions, and an algorithm estimates the displacement field from the pair (Andersson et al., 2003). This is the approach FSL's `topup` uses, and it is fMRIPrep's default for such data ([SDCFlows docs](https://www.nipreps.org/sdcflows/master/methods.html)). Third, if you have neither, fMRIPrep can estimate the distortion by nonlinearly registering the EPI to the anatomical image (fieldmap-less "SyN" correction, enabled with `--use-syn-sdc`). Its developers call this experimental and say to check its outcomes one by one ([SDCFlows docs](https://www.nipreps.org/sdcflows/master/methods.html)), so acquire a field map if you can.

<img src="/blog/fmri-diagrams/epi-distortion.svg" alt="Three sagittal slices: the T1w anatomy, a simulated uncorrected EPI stretched and missing signal near the orbitofrontal cortex, and the corrected EPI with geometry restored but signal still missing" />

*Simulated distortion along the anterior-posterior phase-encoding direction. Correction moves signal back to where it belongs, but it can't bring back signal that was lost to dropout.*

### Coregistration

Coregistration aligns your functional images to the high-resolution anatomical scan, so you can tell which structures your signal actually comes from.

This is harder than it sounds because the two images look different: functional images have lower resolution and T2* contrast, anatomical images higher resolution and T1 contrast. Algorithms deal with this either with a cost function that tolerates different contrasts, such as mutual information, or with boundary-based registration, which extracts the gray/white matter boundary from the anatomical image and aligns the functional image by maximizing the intensity gradient across it. Boundary-based registration was more accurate and robust than normalized mutual information in its original evaluation (Greve & Fischl, 2009), and fMRIPrep uses it (Esteban et al., 2019).

Greve & Fischl (2009) found on visual inspection that the accuracy and robustness of common registration algorithms were suspect, especially with strong intensity gradients or partial-brain coverage, so check it. fMRIPrep's HTML reports include a panel showing the alignment of the functional and anatomical images, which makes this quick ([sample report](https://fmriprep.org/en/stable/_static/SampleReport/sample_report.html)).

### Normalization

Normalization transforms each subject's brain into a common template space, typically MNI (Montreal Neurological Institute) space. That lets you compare across subjects, report coordinates others can interpret, and use atlases and parcellations defined in standard space.

The transformation is nonlinear: different regions get stretched or compressed by different amounts to match the template. fMRIPrep uses ANTs for this ([fMRIPrep workflows docs](https://fmriprep.org/en/stable/workflows.html)), whose SyN algorithm was among the most accurate in a comparison of 14 nonlinear registration methods (Klein et al., 2009). But no registration removes individual differences in anatomy, so "the same" coordinate can fall into different structures in different subjects, and localizing activity to an individual's own anatomy remains more accurate (Devlin & Poldrack, 2007).

You don't always want to normalize. For single-subject analyses you might stay in native space to keep the subject's actual anatomy. In vision research, retinotopic maps are typically measured in each subject and analyzed on that subject's cortical surface (Benson & Winawer, 2018; more on surfaces below). Volume-based registration also throws away much of the benefit of high-resolution acquisitions (Coalson et al., 2018).

### Spatial smoothing

Smoothing convolves the data with a Gaussian kernel of several millimeters FWHM (full width at half maximum). This increases the SNR for the larger-scale signals most studies care about, helps meet the assumptions of the random field theory used for statistical thresholding, and reduces the impact of anatomical differences between subjects (Hendriks et al., 2017). The best kernel size depends on the study; in one systematic comparison for a visual task, about 8 mm was optimal for group analysis (Mikl et al., 2008).

Multivariate pattern analysis (MVPA) is often run on unsmoothed data (Hendriks et al., 2017), on the reasoning that it relies on fine-grained spatial patterns that smoothing would blur. The evidence is less clear-cut than that reasoning suggests: smoothing did not reduce decoding of grating orientation from V1 in one study (Op de Beeck, 2010) but did lower V1 orientation decoding accuracy at stronger smoothing levels in another (Alink et al., 2013), and moderate smoothing slightly improved correlation-based MVPA in another study (Hendriks et al., 2017). Smoothing doesn't remove the information in multivoxel patterns, but it limits what you can conclude about where that information comes from (Kamitani & Sawahata, 2010).

fMRIPrep doesn't smooth at all, to stay agnostic to whatever analysis comes next (Esteban et al., 2019; [fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)), so the choice is left to the analysis step.

<img src="/blog/fmri-diagrams/smoothing-effects.png" alt="Effect of spatial smoothing on brain images at 0mm, 4mm, 6mm, and 8mm FWHM" />

*The effect of Gaussian smoothing at different kernel sizes. Fine anatomical details become progressively blurred as FWHM increases.*

## fMRIPrep

Unless you have a specific reason not to, I'd use fMRIPrep.

fMRIPrep is a preprocessing pipeline that combines tools from FSL, FreeSurfer, ANTs and AFNI into one workflow that adapts itself to the input data and needs very little configuration. It was validated on a large collection of diverse datasets, and in a comparison with FSL's `feat` its outputs were less smooth and better aligned with the anatomy (Esteban et al., 2019). The developers describe it as following "glass-box" principles, with visual reports at each quality control point so you can see what each step did (Esteban et al., 2019).

### Running fMRIPrep

fMRIPrep runs in a container (Docker, or Singularity/Apptainer on clusters), so the software environment is identical across machines ([NiPreps Singularity guide](https://www.nipreps.org/apps/singularity/)). A typical call looks like this:

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

Pin a specific version instead of using `latest`. The fMRIPrep developers advise processing the whole dataset with the same version and not switching versions during an ongoing study ([fMRIPrep FAQ](https://fmriprep.org/en/stable/faq.html)), and the version belongs in your methods section.

Flags worth knowing (all from the [fMRIPrep usage docs](https://fmriprep.org/en/stable/usage.html)):

- `--output-spaces`: which spaces to write outputs in. `MNI152NLin2009cAsym:res-2` is MNI space at 2 mm, `T1w` is the subject's native anatomical space.
- `--participant-label`: process specific subjects instead of the whole dataset.
- `-w`: the working directory for intermediate files. It gets big, so put it somewhere with space, and keep it if you want to resume an interrupted run: fMRIPrep picks up where it left off as long as the work directory is the same.
- `--fs-no-reconall`: skip FreeSurfer surface reconstruction. Without it a run takes about 1-2 hours ([fMRIPrep FAQ](https://fmriprep.org/en/stable/faq.html)), but you lose all surface outputs.
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

Every run produces an HTML report per subject with views of the images at each quality control point (Esteban et al., 2019). The [sample report](https://fmriprep.org/en/stable/_static/SampleReport/sample_report.html) shows:

- brain mask and tissue segmentation of the T1w image
- spatial normalization to the template
- surface reconstruction
- functional-to-anatomical alignment
- a BOLD summary ("carpet plot") with framewise displacement and DVARS
- correlations among the nuisance regressors

Look at the report for every single subject. The reports are designed to minimize the time this takes (Esteban et al., 2019), and it's much cheaper than finding a broken registration after you've run your whole analysis. [Part 6](/blog/fmri-crash-course-6-quality-assessment) goes through what to look for.

### Confound regressors

The `_desc-confounds_timeseries.tsv` file contains dozens of potential nuisance regressors. Some common ones ([fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)):

- `trans_x`, `trans_y`, `trans_z`: translation parameters
- `rot_x`, `rot_y`, `rot_z`: rotation parameters
- `framewise_displacement`: summary motion metric per volume
- `csf`, `white_matter`: mean signal in CSF and white matter
- `global_signal`: mean signal within the brain mask (whether to regress it out remains controversial; Ciric et al., 2017)
- `cosine_XX`: discrete cosine basis functions for high-pass filtering (leave them out if you high-pass filter separately)

The fMRIPrep documentation recommends picking only the confounds you actually want to remove rather than entering the whole file. Which ones depends on your analysis. Most benchmarks of confound models come from resting-state connectivity, where an expanded 36-parameter model (motion, white matter, CSF and global signals, plus derivatives and squares) performed best (Satterthwaite et al., 2013), and a later comparison of 14 methods found trade-offs that depend on the scientific question (Ciric et al., 2017). In task GLMs, the 6 motion parameters are a common minimal set; fMRIPrep's own validation analysis used exactly those (Esteban et al., 2019).

Older fMRIPrep versions could also run ICA-AROMA (Esteban et al., 2019). It was removed in version 23.1.0 ([fMRIPrep changelog](https://fmriprep.org/en/23.1.4/changes.html)). If you want AROMA, the separate [fMRIPost-AROMA](https://github.com/nipreps/fmripost-aroma) tool runs it on fMRIPrep derivatives.

## Surface or volume?

So far everything has been in the volume: 3D voxel grids, either in native or MNI space. In vision research, a lot of analysis happens on the cortical surface instead. The reason is that the cortex is topologically a 2D sheet, and visual areas like V1-V3 are organized as maps along that sheet (Benson et al., 2014). Two points that are close in the volume can be far apart on the surface if they sit on opposite banks of a sulcus. Smoothing or searching over neighboring voxels in the volume mixes signal across those banks, and volume-based smoothing and registration measurably degrade the localization of cortical areas compared with surface-based processing (Coalson et al., 2018).

<img src="/blog/fmri-diagrams/surface-vs-volume.svg" alt="Schematic of a folded cortical ribbon around a sulcus. Two points on opposite banks are 4 mm apart in the volume but about 12 mm apart along the cortex, and a 3D kernel around them covers both banks" />

*Schematic. Two points on opposite banks of a sulcus are close in 3D but far apart along the cortical sheet. Volume-based smoothing or searchlights mix signal from both banks; surface-based analysis follows the sheet.*

Many tools and resources in the field assume surface data. Retinotopic atlases that predict the location of V1-V3 from anatomy work on FreeSurfer surfaces (Benson et al., 2014; Benson & Winawer, 2018), and NSD (Allen et al., 2022) provides its single-trial betas on subject-native and fsaverage surfaces alongside the volume ([NSD data release](https://naturalscenesdataset.org)).

fMRIPrep can give you surface outputs as long as it runs FreeSurfer's `recon-all`, which it does unless you pass `--fs-no-reconall` ([fMRIPrep workflows docs](https://fmriprep.org/en/stable/workflows.html)):

```bash
--output-spaces T1w MNI152NLin2009cAsym:res-2 fsnative fsaverage \
--cifti-output 91k
```

`fsnative` is the subject's own reconstructed surface and `fsaverage` is FreeSurfer's template surface; both are written as GIFTI files, one per hemisphere. `--cifti-output 91k` additionally writes CIFTI files in the HCP "grayordinates" format (91,282 grayordinates at 2 mm), which combines cortical surface vertices with subcortical voxels ([fMRIPrep outputs docs](https://fmriprep.org/en/stable/outputs.html)).

The trade-off is time. `recon-all` adds several hours per subject (see the per-step timings in the [recon-all docs](https://surfer.nmr.mgh.harvard.edu/fswiki/recon-all)), which is why `--fs-no-reconall` is tempting. But if you skip it, you get no surfaces at all. For vision studies I'd almost always run it: surface-based retinotopy and atlas-based ROI definitions depend on it, and you only pay the cost once per subject.

## Running fMRIPrep on a cluster

fMRIPrep takes hours per subject, so for any real dataset you'll want to run subjects in parallel. The developers recommend processing one subject per container instance ([fMRIPrep FAQ](https://fmriprep.org/en/stable/faq.html)), and on a SLURM cluster the simplest way to do that is an array job with one task per participant. Here's a script I'd start from:

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

A few notes on this. `--array=1-30%10` runs 30 tasks with at most 10 at a time, so you don't hog the cluster ([sbatch docs](https://slurm.schedmd.com/sbatch.html)). Create the `logs/` directory before you submit, since SLURM won't create it and the job fails silently ([SchedMD ticket 8895](https://support.schedmd.com/show_bug.cgi?id=8895)). `--nprocs` sets the maximum number of threads fMRIPrep uses across all processes, `--omp-nthreads` the maximum per process (e.g. an ANTs registration), and `--mem-mb` is fMRIPrep's upper memory limit ([fMRIPrep usage docs](https://fmriprep.org/en/stable/usage.html)); I set it a bit below what I requested from SLURM, so the job isn't killed for going over its memory limit. I've set `--skip-bids-validation` because I validate the dataset once beforehand rather than in every task; leave it out if you haven't.

The work directory goes on node-local scratch because fMRIPrep writes a huge number of small intermediate files, and shared cluster file systems are inefficient at handling thousands of small files ([CSC docs](https://docs.csc.fi/support/faq/local_scratch_for_data_processing/)); the NiPreps example SLURM script also binds node-local scratch as the work directory ([NiPreps Singularity guide](https://www.nipreps.org/apps/singularity/)). Check what your cluster provides and what the variable is called (the script falls back from `$TMPDIR` to `/tmp`). Each task gets its own work directory so parallel runs don't interfere with each other.

fMRIPrep gets its templates (MNI and so on) from TemplateFlow, which needs internet access the first time a template is requested ([fMRIPrep FAQ](https://fmriprep.org/en/stable/faq.html)). If your compute nodes have no internet access, fetch the templates you need beforehand with the TemplateFlow Python client, with `TEMPLATEFLOW_HOME` pointing at a shared directory, and then point the container there as above ([NiPreps Singularity guide](https://www.nipreps.org/apps/singularity/)). Because of `--cleanenv`, host environment variables don't reach the container, which is why the script uses the `APPTAINERENV_` prefix (`SINGULARITYENV_` on older Singularity installations) ([Apptainer docs](https://apptainer.org/docs/user/latest/environment_and_metadata.html)).

### Re-using previous results

The most expensive part of a run is usually the FreeSurfer reconstruction. If you already have `recon-all` outputs for your subjects (FreeSurfer 6.0.0 or newer), for example from an earlier fMRIPrep run or a separate anatomical pipeline, you can pass the FreeSurfer subjects directory with `--fs-subjects-dir` and fMRIPrep will reuse the existing reconstructions instead of recomputing them ([fMRIPrep FAQ](https://fmriprep.org/en/stable/faq.html)). Similarly, if you keep the work directory from an interrupted run, fMRIPrep picks up where it left off, although some steps are always rerun ([fMRIPrep usage docs](https://fmriprep.org/en/stable/usage.html)).

## When to use FSL directly

fMRIPrep covers most cases, but sometimes you want more control.

If your field maps were acquired in a nonstandard way, you might need to run FSL's `topup` or `fugue` yourself with specific parameters. fMRIPrep also doesn't smooth, so if you want to compare several smoothing levels or smooth on the surface, you do that afterwards (e.g. with FSL's `fslmaths` in the volume or FreeSurfer's [`mri_surf2surf`](https://surfer.nmr.mgh.harvard.edu/fswiki/mri_surf2surf) on the surface). Older datasets that aren't BIDS-compliant can be painful to convert, and sometimes a manual FSL pipeline is less work.

Running the steps yourself is also a good way to learn. FSL's tools (`mcflirt`, `flirt`, `fnirt`, `bet`, `fast`) are well documented ([FSL docs](https://fsl.fmrib.ox.ac.uk/fsl/docs/)), and I'd recommend going through a manual pipeline at least once to see what each step does. A minimal version, following the [FNIRT user guide](https://fsl.fmrib.ox.ac.uk/fsl/docs/registration/fnirt/user_guide.html) for the normalization, looks like this:

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

For an actual project, though, I'd still use fMRIPrep. It does all of this and more, produces the QC reports for free, and in its validation gave less smooth, better aligned results than FSL's `feat` (Esteban et al., 2019).

## Summary

- Raw fMRI data needs correction for motion, distortions, slice timing and anatomical differences before you can analyze it. Organize it in BIDS first.
- fMRIPrep is the default choice. Pin its version, and look at the HTML report for every subject.
- Motion correction doesn't remove all motion effects, so include motion regressors in your model and be ready to exclude high-motion runs.
- Choose smoothing deliberately for MVPA (unsmoothed is common, but moderate smoothing often doesn't hurt), and consider surface outputs if you work with retinotopic or individually defined visual areas.
- On a cluster, run one participant per SLURM array task with a local work directory and pre-fetched templates.

Preprocessing turns raw data into something you can analyze, but that doesn't mean the data is good. In the next post, we'll look at quality assessment: how to find problems preprocessing can't fix and decide which data to trust.

---

**Next:** [Part 6: Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)

**Previous:** [Part 4: Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)

## References

### fMRIPrep and related tools

- Esteban, O., Markiewicz, C.J., Blair, R.W., et al. (2019). fMRIPrep: a robust preprocessing pipeline for functional MRI. *Nature Methods*, 16, 111-116. [https://doi.org/10.1038/s41592-018-0235-4](https://doi.org/10.1038/s41592-018-0235-4)
- fMRIPrep documentation: [usage](https://fmriprep.org/en/stable/usage.html), [workflows](https://fmriprep.org/en/stable/workflows.html), [outputs](https://fmriprep.org/en/stable/outputs.html), [FAQ](https://fmriprep.org/en/stable/faq.html), [changelog](https://fmriprep.org/en/23.1.4/changes.html)
- [SDCFlows: methods for susceptibility distortion correction](https://www.nipreps.org/sdcflows/master/methods.html)
- [NiPreps: running BIDS Apps with Singularity/Apptainer](https://www.nipreps.org/apps/singularity/)
- [fMRIPost-AROMA](https://github.com/nipreps/fmripost-aroma)

### Motion

- Friston, K.J., Williams, S., Howard, R., Frackowiak, R.S., & Turner, R. (1996). Movement-related effects in fMRI time-series. *Magnetic Resonance in Medicine*, 35(3), 346-355. [https://doi.org/10.1002/mrm.1910350312](https://doi.org/10.1002/mrm.1910350312)
- Hajnal, J.V., Myers, R., Oatridge, A., Schwieso, J.E., Young, I.R., & Bydder, G.M. (1994). Artifacts due to stimulus correlated motion in functional imaging of the brain. *Magnetic Resonance in Medicine*, 31(3), 283-291. [https://doi.org/10.1002/mrm.1910310307](https://doi.org/10.1002/mrm.1910310307)
- Bullmore, E.T., Brammer, M.J., Rabe-Hesketh, S., et al. (1999). Methods for diagnosis and treatment of stimulus-correlated motion in generic brain activation studies using fMRI. *Human Brain Mapping*, 7(1), 38-48. [https://pmc.ncbi.nlm.nih.gov/articles/PMC6873318/](https://pmc.ncbi.nlm.nih.gov/articles/PMC6873318/)
- Power, J.D., Barnes, K.A., Snyder, A.Z., Schlaggar, B.L., & Petersen, S.E. (2012). Spurious but systematic correlations in functional connectivity MRI networks arise from subject motion. *NeuroImage*, 59(3), 2142-2154. [https://doi.org/10.1016/j.neuroimage.2011.10.018](https://pmc.ncbi.nlm.nih.gov/articles/PMC3254728/)
- Power, J.D., Schlaggar, B.L., & Petersen, S.E. (2015). Recent progress and outstanding issues in motion correction in resting state fMRI. *NeuroImage*, 105, 536-551. [https://doi.org/10.1016/j.neuroimage.2014.10.044](https://pmc.ncbi.nlm.nih.gov/articles/PMC4262543/)

### Confound regression

- Satterthwaite, T.D., Elliott, M.A., Gerraty, R.T., et al. (2013). An improved framework for confound regression and filtering for control of motion artifact in the preprocessing of resting-state functional connectivity data. *NeuroImage*, 64, 240-256. [https://doi.org/10.1016/j.neuroimage.2012.08.052](https://pmc.ncbi.nlm.nih.gov/articles/PMC3811142/)
- Ciric, R., Wolf, D.H., Power, J.D., et al. (2017). Benchmarking of participant-level confound regression strategies for the control of motion artifact in studies of functional connectivity. *NeuroImage*, 154, 174-187. [https://doi.org/10.1016/j.neuroimage.2017.03.020](https://pmc.ncbi.nlm.nih.gov/articles/PMC5483393/)

### Slice timing correction

- Sladky, R., Friston, K.J., Tröstl, J., Cunnington, R., Moser, E., & Windischberger, C. (2011). Slice-timing effects and their correction in functional MRI. *NeuroImage*, 58(2), 588-594. [https://doi.org/10.1016/j.neuroimage.2011.06.078](https://pmc.ncbi.nlm.nih.gov/articles/PMC3167249/)
- Parker, D.B., & Razlighi, Q.R. (2019). The benefit of slice timing correction in common fMRI preprocessing pipelines. *Frontiers in Neuroscience*, 13, 821. [https://doi.org/10.3389/fnins.2019.00821](https://doi.org/10.3389/fnins.2019.00821)

### Distortion correction

- Jezzard, P., & Balaban, R.S. (1995). Correction for geometric distortion in echo planar images from B0 field variations. *Magnetic Resonance in Medicine*, 34(1), 65-73. [https://doi.org/10.1002/mrm.1910340111](https://doi.org/10.1002/mrm.1910340111)
- Ojemann, J.G., Akbudak, E., Snyder, A.Z., McKinstry, R.C., Raichle, M.E., & Conturo, T.E. (1997). Anatomic localization and quantitative analysis of gradient refocused echo-planar fMRI susceptibility artifacts. *NeuroImage*, 6(3), 156-167. [https://doi.org/10.1006/nimg.1997.0289](https://doi.org/10.1006/nimg.1997.0289)
- Andersson, J.L.R., Skare, S., & Ashburner, J. (2003). How to correct susceptibility distortions in spin-echo echo-planar images: application to diffusion tensor imaging. *NeuroImage*, 20(2), 870-888. [https://doi.org/10.1016/S1053-8119(03)00336-7](https://doi.org/10.1016/S1053-8119(03)00336-7)

### Registration and normalization

- Greve, D.N., & Fischl, B. (2009). Accurate and robust brain image alignment using boundary-based registration. *NeuroImage*, 48(1), 63-72. [https://doi.org/10.1016/j.neuroimage.2009.06.060](https://pmc.ncbi.nlm.nih.gov/articles/PMC2733527/)
- Klein, A., Andersson, J., Ardekani, B.A., et al. (2009). Evaluation of 14 nonlinear deformation algorithms applied to human brain MRI registration. *NeuroImage*, 46(3), 786-802. [https://doi.org/10.1016/j.neuroimage.2008.12.037](https://pmc.ncbi.nlm.nih.gov/articles/PMC2747506/)
- Devlin, J.T., & Poldrack, R.A. (2007). In praise of tedious anatomy. *NeuroImage*, 37(4), 1033-1041. [https://doi.org/10.1016/j.neuroimage.2006.09.055](https://pmc.ncbi.nlm.nih.gov/articles/PMC1986635/)

### Spatial smoothing

- Mikl, M., Mareček, R., Hluštík, P., et al. (2008). Effects of spatial smoothing on fMRI group inferences. *Magnetic Resonance Imaging*, 26(4), 490-503. [https://doi.org/10.1016/j.mri.2007.08.006](https://doi.org/10.1016/j.mri.2007.08.006)
- Alink, A., Krugliak, A., Walther, A., & Kriegeskorte, N. (2013). fMRI orientation decoding in V1 does not require global maps or globally coherent orientation stimuli. *Frontiers in Psychology*, 4, 493. [https://doi.org/10.3389/fpsyg.2013.00493](https://doi.org/10.3389/fpsyg.2013.00493)
- Op de Beeck, H.P. (2010). Against hyperacuity in brain reading: spatial smoothing does not hurt multivariate fMRI analyses? *NeuroImage*, 49(3), 1943-1948. [https://doi.org/10.1016/j.neuroimage.2009.02.047](https://doi.org/10.1016/j.neuroimage.2009.02.047)
- Kamitani, Y., & Sawahata, Y. (2010). Spatial smoothing hurts localization but not information: pitfalls for brain mappers. *NeuroImage*, 49(3), 1949-1952. [https://doi.org/10.1016/j.neuroimage.2009.06.040](https://doi.org/10.1016/j.neuroimage.2009.06.040)
- Hendriks, M.H.A., Daniels, N., Pegado, F., & Op de Beeck, H.P. (2017). The effect of spatial smoothing on representational similarity in a simple motor paradigm. *Frontiers in Neurology*, 8, 222. [https://doi.org/10.3389/fneur.2017.00222](https://pmc.ncbi.nlm.nih.gov/articles/PMC5446978/)

### Surface-based analysis and retinotopy

- Benson, N.C., Butt, O.H., Brainard, D.H., & Aguirre, G.K. (2014). Correction of distortion in flattened representations of the cortical surface allows prediction of V1-V3 functional organization from anatomy. *PLoS Computational Biology*, 10(3), e1003538. [https://doi.org/10.1371/journal.pcbi.1003538](https://doi.org/10.1371/journal.pcbi.1003538)
- Benson, N.C., & Winawer, J. (2018). Bayesian analysis of retinotopic maps. *eLife*, 7, e40224. [https://doi.org/10.7554/eLife.40224](https://doi.org/10.7554/eLife.40224)
- Coalson, T.S., Van Essen, D.C., & Glasser, M.F. (2018). The impact of traditional neuroimaging methods on the spatial localization of cortical areas. *PNAS*, 115(27), E6356-E6365. [https://doi.org/10.1073/pnas.1801582115](https://doi.org/10.1073/pnas.1801582115)
- Allen, E.J., St-Yves, G., Wu, Y., et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25, 116-126. [https://doi.org/10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x)

### Data organization

- Gorgolewski, K.J., Auer, T., Calhoun, V.D., et al. (2016). The brain imaging data structure, a format for organizing and describing outputs of neuroimaging experiments. *Scientific Data*, 3, 160044. [https://doi.org/10.1038/sdata.2016.44](https://doi.org/10.1038/sdata.2016.44)
- [BIDS Specification](https://bids-specification.readthedocs.io/)

### Software and cluster documentation

- [FSL documentation](https://fsl.fmrib.ox.ac.uk/fsl/docs/) ([MCFLIRT](https://fsl.fmrib.ox.ac.uk/fsl/docs/registration/mcflirt.html), [FNIRT user guide](https://fsl.fmrib.ox.ac.uk/fsl/docs/registration/fnirt/user_guide.html))
- [FreeSurfer recon-all](https://surfer.nmr.mgh.harvard.edu/fswiki/recon-all)
- [AFNI - Analysis of Functional NeuroImages](https://afni.nimh.nih.gov/)
- [TemplateFlow](https://www.templateflow.org/)
- [Apptainer: environment and metadata](https://apptainer.org/docs/user/latest/environment_and_metadata.html)
- [SLURM sbatch documentation](https://slurm.schedmd.com/sbatch.html)
- [CSC: local scratch for data processing](https://docs.csc.fi/support/faq/local_scratch_for_data_processing/)
