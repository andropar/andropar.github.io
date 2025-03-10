---
layout: post
title: "A crash course in functional MRI for vision research - Part 0: Introduction"
date: 2025-03-10 15:32
featured: true
---


## Introduction
When I started my PhD in computational cognitive neuroscience, I felt quite lost. Coming from a Computer Science background, I had never touched a functional MRI (fMRI) dataset before, designed an experiment, or moved a person into a MRI scanner. But suddenly, I had to learn how to do all this, and fast. Over the course of a couple of weeks, I read countless books, articles, tutorials and papers, until finally I gained some confidence in working with this modality. However, it wasn't easy and I spent way too much time on figuring out how to properly do things - making many mistakes along the way.

In this series of blog posts, I want to remove the pain from this process and share what I learned about using fMRI for vision research. This crash course should be right for you if you've just started as a PhD candidate and don't have a neuroscience/psychology background, you're familiar with fMRI and want to refresh the basics, or you're just curious about what neuroscientists do all day and what tools they use. My goal is to provide you with a foundational set of tools and workflows that can easily be extended for your own research purposes, as well as a general intuition for working with fMRI data. Note that, although we'll focus on vision, many of the tools we'll talk about will also be relevant for other research areas. To make it practical, we'll work with an actual fMRI dataset throughout the course of the series - the [Visual object recognition](https://openneuro.org/datasets/ds000105/versions/3.0.0) dataset.

In this series, we'll use Python, an easy-to-learn, general-purpose programming language, and I'll assume some familiarity with programming and working with command line tools. You should be able to follow along even if you don't have much coding experience, but learning to code is more or less a prerequisite for doing research, so I recommend starting sooner rather than later! Quick shoutout to myself: we wrote a [primer on programming for neuroscientists and psychologists](link) with many useful tips around writing and organizing research code, so feel free to take a look!

## Parts of the series
The series is divided into 7 separate posts. These are meant to be read in sequence (especially if you want to follow along with the analysis of the Visual object recognition dataset), but you can also just pick whatever interests you most.

1 - Using neuroimaging for understanding the visual system. 
	Here I'll motivate the need for using functional neuroimaging to understand the visual system. I'll take a closer look at what the field already learned about it, what the different modalities are for collecting brain activity, and what questions they can answer. 
2 - Basics of (functional) MRI.
	In this post I'll introduce the basics of (functional) MRI, explaining how we can record neural activity using magnets(!). We'll talk about the pros and cons of using fMRI and take a first look at the Visual object recognition dataset. 
3 - Recording fMRI data and designing experiments.
	Collecting fMRI data can be quite complex, with many decisions to make that can influence each other, and it's often not 100% clear what the optimal scanning parameters are. Here I'll explain these parameters and make suggestions for how to set them, depending on the type of study. We'll also take a brief detour into experimental design for fMRI and its peculiarities. 
4 - Preprocessing fMRI data.
	Probably the most important step, fMRI data has to be preprocessed before its ready for further analysis. We'll look at the reasoning behind each of the common preprocessing steps, the tools required for them and how to neatly organize the data for future use. I'll also introduce some of the more advanced preprocessing options for the interested reader, that allow easy re-use and parallelization of preprocessing operations.
5 - Assessing the quality of fMRI data.
	Even with the best planning, both preprocessing and data collection can run into problems, which is why any processed data needs to be closely examined for artifacts or other problems. Here we'll go over typical issues and how to check your data for them.
6 - Analyzing fMRI data.
	We're finally at the stage where we can run analyses on the data. You'll learn about the primary tool for task-based fMRI analysis, the General Linear Model (GLM), and use it to analyse the data we preprocessed. We'll also use it to extract single-trial response estimates, setting the foundation for multivariate analysis.
7 - Multivariate analysis 
	In the last post of this series, we'll go over some examples that show how we can actually use the preprocessed and analyzed data, and I'll give pointers to more advanced material that's at the edge of current research. 

My hope is that this series of posts will provide you with a solid intuition for how fMRI data is recorded, processed and analysed, so that you can easily move on to doing your own research. As we go along, I'll point you to other resources that will allow you to further improve your understanding of the material, or might clear up any remaining questions. So without further ado, let's start with the first post: LINK!


Note: As of right now, this series is a work in progress and I'll try to fill it up in the upcoming weeks. If the post you're interested in isn't available now, check back in later on!