---
title: "Using Neuroimaging for Understanding the Visual System"
description: "Why we need functional neuroimaging to understand vision, what we've learned so far, and the different modalities available. Part 2 of an 8-part fMRI crash course."
date: 2025-03-17
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 2 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You can learn a lot about the visual system by showing people images and asking them questions. Reaction times, accuracy, what they see versus what they miss. Behavioral experiments have been the bread and butter of vision science for over a century. But here's the thing: they can only tell you *what* the system does, not *how* it does it.

I think of it like studying a car by only looking at the speedometer. You can figure out acceleration, top speed, how quickly it brakes. Useful information. But you'll never understand how the engine works, how the transmission shifts, or why it makes that weird noise when you turn left.

That's where neuroimaging comes in.

## Why behavioral experiments aren't enough

Let me give you a concrete example. In the 1980s, researchers discovered that people are remarkably fast at detecting animals in natural scenes. Flash an image for just 20 milliseconds and people can reliably say whether there's an animal in it. Behavioral experiments told us this was possible. They told us it was fast - faster than we'd expect if the brain had to carefully analyze every part of the image.

But they couldn't tell us *how*. What parts of the brain are involved? What computations happen first? Is there a dedicated "animal detector" somewhere, or does it emerge from more general-purpose processing?

> Behavioral experiments reveal the *what*. Neuroimaging reveals the *where* and *when*. Combining both gets us closer to the *how*.

Here's another limitation: behavioral responses are the end result of a long chain of processing. By the time someone presses a button to say "yes, I saw a face," information has traveled through dozens of brain regions, been transformed multiple ways, and finally been converted into a motor command. The behavior you measure is like reading the last page of a book - you know how it ends, but you've missed the entire story.

Neuroimaging lets us read the middle pages.

## The visual system: a hierarchy of increasingly complex representations

Before we talk about imaging techniques, you need to understand what we're trying to image. The visual system isn't a single thing - it's a cascade of brain regions, each doing something different.

<img src="/blog/fmri-diagrams/visual-hierarchy.svg" alt="Visual processing hierarchy from Retina to IT cortex" />

Light hits your retina and gets converted to neural signals. Those signals travel through the optic nerve to the **lateral geniculate nucleus (LGN)** in the thalamus - essentially a relay station. From there, information flows to the primary visual cortex, called **V1**, located at the very back of your brain.

V1 is where things get interesting. Neurons here respond to simple features: edges, orientations, basic shapes. A famous set of experiments by Hubel and Wiesel in the 1960s (which won them a Nobel Prize) showed that individual V1 neurons are tuned to specific orientations - one neuron might fire strongly for vertical lines but not at all for horizontal ones.

From V1, visual information splits into two main pathways:

**The ventral stream** (the "what" pathway) flows from V1 through areas V2 and V4 into the inferotemporal cortex (IT). This pathway is crucial for object recognition. As you move along it, neurons respond to increasingly complex features:
- **V2**: Still relatively simple features, but starting to combine information from V1
- **V4**: Color processing, moderate shape complexity, some texture selectivity
- **IT (inferotemporal cortex)**: Complex object representations, face-selective regions, category-level coding

**The dorsal stream** (the "where" pathway) goes from V1 through V2 into the parietal cortex. This pathway handles spatial information - where things are, how they're moving, and how you might interact with them. It's essential for visually guided action.

<img src="/blog/fmri-diagrams/visual-streams.svg" alt="Ventral and dorsal visual processing streams" />

This hierarchical organization is one of the most robust findings in visual neuroscience. We've confirmed it through lesion studies, single-unit recordings in animals, and extensive neuroimaging in humans. It's also become a blueprint for deep neural networks - more on that connection in later posts.

But here's what's important to understand: this hierarchy isn't a simple feedforward pipeline. There's massive feedback, lateral connections, and recurrent processing. The "simple to complex" story is useful, but it's also an oversimplification. The brain is messier than any diagram can capture.

## Neuroimaging modalities: your toolkit for studying the brain

So how do we actually study these brain regions in living, behaving humans? We have several tools, each with different strengths and weaknesses. Choosing the right one depends entirely on what question you're asking.

| Modality | Spatial Resolution | Temporal Resolution | Invasiveness | Cost | Best For |
|----------|-------------------|---------------------|--------------|------|----------|
| **EEG** | ~10mm | ~1ms | Non-invasive | Low | Timing of neural processes |
| **MEG** | ~5mm | ~1ms | Non-invasive | High | Timing with better source localization |
| **fMRI** | ~1-3mm | ~1-2s | Non-invasive | High | Where processing happens |
| **Invasive recordings** | Single neurons | <1ms | Very invasive | Very high | Precise neural coding |

Let me break these down.

### EEG (Electroencephalography)

EEG measures electrical activity through electrodes placed on the scalp. It's been around since the 1920s and remains one of the most widely used techniques in cognitive neuroscience. The big advantage? **Temporal resolution**. You can track neural activity with millisecond precision, which lets you see the temporal dynamics of visual processing.

The downside is spatial resolution. Those electrical signals have to pass through the skull and scalp before reaching your electrodes, and they get smeared together in the process. Figuring out *where* the signals come from (called "source localization") is mathematically tricky and inherently ambiguous. You're essentially trying to figure out what's happening inside a room by listening at the door.

For vision research, EEG is great for questions about timing. When does the brain first distinguish faces from objects? How quickly does attention modulate visual processing? These are EEG questions.

### MEG (Magnetoencephalography)

MEG measures the magnetic fields generated by neural activity. Since magnetic fields pass through the skull without distortion, MEG has better spatial resolution than EEG while maintaining the same excellent temporal resolution.

The catch? The magnetic fields are incredibly weak - about a billion times weaker than Earth's magnetic field. You need superconducting sensors cooled to near absolute zero, housed in a magnetically shielded room. MEG setups cost millions of dollars. Most researchers don't have access to one.

### fMRI (Functional Magnetic Resonance Imaging)

Here's where this crash course is heading. fMRI measures changes in blood oxygenation, which tracks (indirectly) with neural activity. I'll explain exactly how this works in the next post, but the key points for now:

**Spatial resolution is excellent** - we can reliably localize activity to specific brain regions, even specific subregions a few millimeters across. With high-field scanners (7 Tesla and above), you can image individual cortical columns.

**Temporal resolution is poor** - the blood oxygenation response is slow, peaking about 5-6 seconds after neural activity. We're measuring a sluggish metabolic proxy, not the electrical activity itself.

fMRI is non-invasive and relatively safe (no radiation, no injections for basic studies). It's become the workhorse of human cognitive neuroscience because it gives us a detailed map of where things happen in the brain.

> fMRI trades temporal precision for spatial precision. It's the right tool when your question is "where in the brain" rather than "when in time."

### Invasive recordings

The gold standard for understanding neural coding is sticking electrodes directly into the brain. Single-unit and multi-unit recordings can measure the activity of individual neurons with sub-millisecond precision. This is how Hubel and Wiesel discovered orientation selectivity in V1. It's how we know about face cells in IT cortex. Much of our foundational knowledge about visual processing comes from invasive recordings in monkeys.

Obviously, you can't do this routinely in healthy humans. Invasive recordings in humans are limited to clinical contexts - typically epilepsy patients who have electrodes implanted for surgical planning. These studies have been invaluable, but they're rare and the electrode locations are determined by clinical needs, not research questions.

For vision research specifically, the combination of invasive recordings in animal models plus fMRI in humans has been incredibly powerful. We can establish detailed mechanisms in animals and then verify that similar principles hold in human brains.

## What questions is fMRI particularly good at answering?

Given its strengths (spatial resolution) and limitations (temporal resolution, indirect measurement), what should you use fMRI for?

**Localization questions**: Where in the brain does face processing happen? Which regions respond more to tools than to animals? fMRI excels at these.

**Representational questions**: What information is contained in a brain region's activity patterns? This is where techniques like MVPA (multivariate pattern analysis) and RSA (representational similarity analysis) come in - we'll cover these later in the course.

**Connectivity questions**: How do different brain regions interact? Which regions share information during a task?

**Individual differences**: Why do some people have better face recognition than others? How do expertise and training change neural representations?

**Comparing models to brains**: This is where modern computational neuroscience gets exciting. We can ask: does a deep neural network trained on ImageNet represent images similarly to human V4? fMRI lets us test these hypotheses directly.

## The dataset revolution: NSD and THINGS

I want to end with something that's transforming the field right now: large-scale, densely-sampled fMRI datasets.

Traditional fMRI studies might scan 20-30 participants, each viewing a few hundred images. That's enough for many questions, but it limits what you can learn about how the brain represents the full diversity of visual experience.

Enter the **Natural Scenes Dataset (NSD)**. This is a massive undertaking: 8 participants, each scanned for 30-40 hours, viewing 10,000 unique natural images. The same images were shown multiple times, so you can assess reliability. The data is publicly available. It's become the ImageNet of vision neuroscience.

What can you do with NSD that you couldn't do before? Train machine learning models to predict brain activity from images - and actually have enough data for the models to generalize. Analyze fine-grained representational structure. Compare different brain regions' tuning properties across thousands of image dimensions.

Similarly, the **THINGS** initiative provides a carefully curated set of 1,854 object images spanning diverse categories, with extensive behavioral and neural data. The THINGS-fMRI dataset scanned participants viewing these objects, creating a standardized benchmark for studying object representations.

> We're in a new era of "condition-rich" neuroimaging. Instead of showing participants a handful of carefully controlled stimuli, we're throwing thousands of naturalistic images at them and letting the data speak.

These datasets are enabling research that simply wasn't possible five years ago. If you're getting into vision neuroscience now, you're entering at an exciting time - there's more high-quality data publicly available than ever before.

## Key Takeaways

- **Behavioral experiments tell us what the visual system does, but not how.** Neuroimaging lets us open the black box and see the mechanisms.

- **The visual system is hierarchically organized.** Information flows from V1 through increasingly complex representations in the ventral stream (objects, categories) and dorsal stream (space, action).

- **Different imaging modalities have different strengths.** EEG/MEG for timing, fMRI for spatial localization, invasive recordings for single-neuron precision. Choose based on your question.

- **fMRI is ideal for "where" questions.** Its excellent spatial resolution and non-invasive nature make it the workhorse of human vision neuroscience, despite its poor temporal resolution.

- **Large-scale datasets are changing the game.** NSD, THINGS, and similar initiatives provide the data needed for machine learning approaches and detailed representational analyses.

---

In the next post, we'll dive into the specifics of how fMRI actually works - how magnets let us measure brain activity, and what that "brain activity" really means.

**Next:** [Part 3: Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)

**Previous:** [Part 1: Introduction](/blog/fmri-crash-course-1-introduction)
