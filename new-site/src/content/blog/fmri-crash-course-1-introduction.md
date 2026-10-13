---
title: "A Crash Course in fMRI for Vision Research: Introduction"
description: "A practical, opinionated introduction to using fMRI for vision research. Part 1 of an 8-part series."
date: 2025-03-10
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

When I started my PhD in computational cognitive neuroscience, I felt quite lost. Coming from a Computer Science background, I had never touched a functional MRI (fMRI) dataset before, designed an experiment, or moved a person into an MRI scanner. But suddenly, I had to learn how to do all this, and fast. Over the course of a couple of weeks, I read countless books, articles, tutorials and papers, until finally I gained some confidence in working with this modality. However, it wasn't easy and I spent way too much time on figuring out how to properly do things - making many mistakes along the way.

My first own fMRI study is a good example of what can go wrong. We tried several "improvements" at once, among them a very fast TR, without really knowing what we were doing, and without deciding in advance what exactly we wanted to measure or how we would judge whether the data was any good. If there's one piece of advice that runs through this whole series, it's this: stick to sensible, well-tested defaults until you understand why you'd want to deviate from them, and change one thing at a time.

In this series of blog posts, I want to remove the pain from this process and share what I learned about using fMRI for vision research. This crash course should be right for you if:

- You've just started as a PhD candidate and don't have a neuroscience/psychology background
- You're familiar with fMRI and want to refresh the basics
- You're just curious about what neuroscientists do all day and what tools they use

My goal is to provide you with a foundational set of tools and workflows that can easily be extended for your own research purposes, as well as a general intuition for working with fMRI data. Note that, although we'll focus on vision, many of the tools we'll talk about will also be relevant for other research areas.

Throughout the series, we'll use real code examples and reference the kinds of large-scale datasets used in modern vision research - particularly the Natural Scenes Dataset (NSD; Allen et al., 2022), THINGS-data (Hebart et al., 2023) and LAION-fMRI (Zerbe et al., 2026), large public datasets that were built with computational approaches to visual neuroscience in mind.

![Overview of the 8 parts of the series: introduction, neuroimaging for vision, MRI basics, recording and design, preprocessing, quality assessment, GLM analysis, and multivariate analysis](/blog/fmri-diagrams/pipeline-overview.svg)

## Technical prerequisites

In this series, we'll use Python, an easy-to-learn, general-purpose programming language, and I'll assume some familiarity with programming and working with command line tools. You should be able to follow along even if you don't have much coding experience, but learning to code is more or less a prerequisite for doing research, so I recommend starting sooner rather than later!

## The running example

To keep things concrete, the series follows one real dataset through the whole pipeline: participant 1 of THINGS-fMRI (Hebart et al., 2023). The raw data is openly available in BIDS format on OpenNeuro (dataset [ds004192](https://openneuro.org/datasets/ds004192)), and the THINGS-data authors also share derivatives on figshare. The real-data figures and numbers in Parts 3 to 8 come from these files:

- one run of the main experiment (`ses-things01`, run 1) and the two category localizer runs from `ses-localizer1`, all from OpenNeuro
- the published [regions of interest](https://doi.org/10.25452/figshare.plus.20492769.v1), [noise ceilings](https://doi.org/10.25452/figshare.plus.20492775.v1), [brain masks](https://doi.org/10.25452/figshare.plus.20492757.v1) and [single-trial responses to the test images in IT](https://doi.org/10.25452/figshare.plus.23284622.v1)

The OpenNeuro files can be downloaded directly from its public S3 bucket, for example:

```bash
base=https://s3.amazonaws.com/openneuro.org/ds004192/sub-01
run=ses-localizer1/func/sub-01_ses-localizer1_task-6cat_run-01
mkdir -p $(dirname $run)
for ext in bold.nii.gz bold.json events.tsv; do
    curl -o ${run}_${ext} ${base}/${run}_${ext}
done
```

Each functional run is around 150-270 MB. Everything here runs on a laptop.

## Parts of the series

The series is divided into 8 separate posts (including this introduction). These are meant to be read in sequence, as each post builds on concepts from the previous ones, but you can also just pick whatever interests you most.

1. **Introduction** (this post) - Setting the stage and outlining what we'll cover.

2. **[Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision)** - Motivating the need for functional neuroimaging to understand the visual system. We'll look at what the field has learned so far, the different modalities for collecting brain activity, and what questions they can answer.

3. **[Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)** - Introducing the fundamentals of MRI and fMRI, explaining how we can record neural activity using magnets(!). We'll discuss the pros and cons of fMRI and look at what fMRI data actually looks like.

4. **[Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)** - Collecting fMRI data involves many interdependent decisions, and optimal scanning parameters aren't always clear. We'll explain these parameters and make suggestions for how to set them, then cover experimental design, stimulus display, eye tracking, and the localizer and retinotopy runs that most vision studies need.

5. **[Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)** - Probably the most important step. We'll look at the reasoning behind each common preprocessing step, the tools required, and how to organize data neatly. I'll also show how to run fMRIPrep in parallel on a SLURM cluster and when to work on the cortical surface instead of in the volume.

6. **[Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)** - Even with the best planning, preprocessing and data collection can run into problems. We'll go over typical issues, how to check your data for artifacts, and a few checks that are specific to vision experiments.

7. **[Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)** - We're finally at the stage where we can run analyses. You'll learn about the General Linear Model (GLM), the primary tool for task-based fMRI analysis, and use it to define regions of interest with localizers, run group-level statistics, and extract single-trial response estimates for multivariate analysis.

8. **[Multivariate analysis](/blog/fmri-crash-course-8-multivariate)** - In the final post, we'll use the single-trial estimates for decoding, representational similarity analysis and encoding models, and compare brain responses to deep neural networks.

---

My hope is that this series will provide you with a solid intuition for how fMRI data is recorded, processed and analyzed, so that you can easily move on to doing your own research. As we go along, I'll point you to other resources that will allow you to further improve your understanding of the material.

Let's get started with [Part 2: Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision).

## References

### Datasets

- **Natural Scenes Dataset (NSD)**: Allen, E.J., St-Yves, G., Wu, Y. et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25, 116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x) | [Dataset website](https://naturalscenesdataset.org/)
- **THINGS-data**: Hebart, M.N., Contier, O., Teichmann, L. et al. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. *eLife*, 12, e82580. [DOI: 10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580) | [THINGS Initiative](https://things-initiative.org/) | [OpenNeuro](https://openneuro.org/datasets/ds004192)
- **LAION-fMRI**: Zerbe, J., Roth, J., Mell, M. M., Herholz, P., Knapen, T., & Hebart, M. N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset website](https://laion-fmri.hebartlab.com) | [AWS Open Data](https://registry.opendata.aws/laion-fmri/)

### Textbooks

- Huettel, S.A., Song, A.W., & McCarthy, G. (2014). *Functional Magnetic Resonance Imaging* (3rd ed.). Sinauer Associates. ISBN 978-0-87893-627-4. An introductory textbook covering the physics and physiology of fMRI and experimental design and analysis ([BIAC announcement](https://biac.duke.edu/news/functional-magnetic-resonance-imaging-3rd-edition)).
- Poldrack, R.A., Mumford, J.A., & Nichols, T.E. (2011). *Handbook of Functional MRI Data Analysis*. Cambridge University Press. [DOI: 10.1017/CBO9780511895029](https://doi.org/10.1017/CBO9780511895029). A handbook of fMRI data analysis methods.

### Online tutorials

- [Andy's Brain Book](https://andysbrainbook.readthedocs.io/) - Tutorials for fMRI analysis with FSL, SPM, AFNI and other packages, written for fMRI beginners.
- [Mumford Brain Stats](https://www.youtube.com/@mumfordbrainstats) - Jeanette Mumford's short video tutorials and lessons on neuroimaging data analysis strategies.
