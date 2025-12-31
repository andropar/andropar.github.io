---
title: "A Crash Course in fMRI for Vision Research: Introduction"
description: "A practical, opinionated introduction to using fMRI for vision research. Part 1 of an 8-part series."
date: 2025-03-10
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

When I started my PhD in computational cognitive neuroscience, I felt quite lost. Coming from a Computer Science background, I had never touched a functional MRI (fMRI) dataset before, designed an experiment, or moved a person into an MRI scanner. But suddenly, I had to learn how to do all this, and fast. Over the course of a couple of weeks, I read countless books, articles, tutorials and papers, until finally I gained some confidence in working with this modality. However, it wasn't easy and I spent way too much time on figuring out how to properly do things - making many mistakes along the way.

In this series of blog posts, I want to remove the pain from this process and share what I learned about using fMRI for vision research. This crash course should be right for you if:

- You've just started as a PhD candidate and don't have a neuroscience/psychology background
- You're familiar with fMRI and want to refresh the basics
- You're just curious about what neuroscientists do all day and what tools they use

My goal is to provide you with a foundational set of tools and workflows that can easily be extended for your own research purposes, as well as a general intuition for working with fMRI data. Note that, although we'll focus on vision, many of the tools we'll talk about will also be relevant for other research areas.

Throughout the series, we'll use real code examples and reference the kinds of large-scale datasets that are driving modern vision research - particularly the Natural Scenes Dataset (NSD) and THINGS-data, which have become essential resources for computational approaches to visual neuroscience.

## Technical prerequisites

In this series, we'll use Python, an easy-to-learn, general-purpose programming language, and I'll assume some familiarity with programming and working with command line tools. You should be able to follow along even if you don't have much coding experience, but learning to code is more or less a prerequisite for doing research, so I recommend starting sooner rather than later!

## Parts of the series

The series is divided into 8 separate posts (including this introduction). These are meant to be read in sequence, as each post builds on concepts from the previous ones, but you can also just pick whatever interests you most.

1. **Introduction** (this post) - Setting the stage and outlining what we'll cover.

2. **[Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision)** - Motivating the need for functional neuroimaging to understand the visual system. We'll look at what the field has learned so far, the different modalities for collecting brain activity, and what questions they can answer.

3. **[Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)** - Introducing the fundamentals of MRI and fMRI, explaining how we can record neural activity using magnets(!). We'll discuss the pros and cons of fMRI and look at what fMRI data actually looks like.

4. **[Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)** - Collecting fMRI data involves many interdependent decisions, and optimal scanning parameters aren't always clear. We'll explain these parameters and make suggestions for how to set them, plus a detour into experimental design for fMRI.

5. **[Preprocessing fMRI data](/blog/fmri-crash-course-5-preprocessing)** - Probably the most important step. We'll look at the reasoning behind each common preprocessing step, the tools required, and how to organize data neatly. I'll also introduce advanced preprocessing options for parallelization and re-use.

6. **[Assessing the quality of fMRI data](/blog/fmri-crash-course-6-quality-assessment)** - Even with the best planning, preprocessing and data collection can run into problems. We'll go over typical issues and how to check your data for artifacts.

7. **[Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)** - We're finally at the stage where we can run analyses. You'll learn about the General Linear Model (GLM), the primary tool for task-based fMRI analysis, and use it to extract single-trial response estimates for multivariate analysis.

8. **[Multivariate analysis](/blog/fmri-crash-course-8-multivariate)** - In the final post, we'll go over examples showing how to actually use the preprocessed and analyzed data, with pointers to more advanced material at the edge of current research.

---

My hope is that this series will provide you with a solid intuition for how fMRI data is recorded, processed and analyzed, so that you can easily move on to doing your own research. As we go along, I'll point you to other resources that will allow you to further improve your understanding of the material.

Let's get started with [Part 2: Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision).
