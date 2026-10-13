---
title: "Using Neuroimaging for Understanding the Visual System"
description: "Why we need functional neuroimaging to understand vision, what we've learned so far, and the different modalities available. Part 2 of an 8-part fMRI crash course."
date: 2025-03-17
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 2 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You can learn a lot about the visual system by showing people images and asking them questions. Reaction times, accuracy, what they see and what they miss: behavioral experiments have been the bread and butter of vision science for over a century. But on their own, they mostly tell you *what* the system does, and much less about *how* it does it.

I like to think of it as studying a car by only looking at the speedometer. You can work out acceleration, top speed and braking distance, which is useful. You won't learn much about the engine or the gearbox, though, or why it makes that weird noise when you turn left. Neuroimaging is one way of opening the hood.

## Why behavioral experiments aren't enough

A concrete example. In 1996, Simon Thorpe and colleagues showed that people are remarkably fast at detecting animals in natural scenes (Thorpe, Fize & Marlot, 1996). Images were flashed for only 20 milliseconds, and participants could still reliably say whether there was an animal in them. The behavioral data showed that this was possible and that it was fast, faster than you'd expect if the brain had to carefully analyze every part of the image. (In the same study, EEG recordings already showed a difference between animal and non-animal trials about 150 ms after image onset, which is a nice example of behavior and imaging working together.)

What behavior alone can't tell you is which parts of the brain are involved, what gets computed first, or whether there is a dedicated "animal detector" somewhere versus something that falls out of more general-purpose processing.

There's a second limitation. A behavioral response is the end result of a long chain of processing. By the time someone presses a button to say "yes, I saw a face", the information has passed through many brain regions, been transformed several times, and finally been turned into a motor command. Measuring only the button press is a bit like reading the last page of a book: you know how it ends, but you've missed everything in between. Neuroimaging gives us (blurry) access to the middle pages.

## The visual system: a hierarchy of increasingly complex representations

Before talking about imaging techniques, it helps to know what we're trying to image. The visual system is a cascade of brain regions that each do something a bit different.

<img src="/blog/fmri-diagrams/visual-hierarchy.svg" alt="Visual processing hierarchy from retina through LGN, V1, V2 and V4 to IT, with receptive fields growing at each stage" />

Light hits the retina and gets converted into neural signals. These travel through the optic nerve to the **lateral geniculate nucleus (LGN)** in the thalamus, and from there to the primary visual cortex, **V1**, at the very back of the brain.

Neurons in V1 respond to simple features like edges at particular orientations. In a famous series of experiments in the late 1950s and 1960s, Hubel and Wiesel showed that individual neurons in cat (and later monkey) visual cortex are tuned to specific orientations: one neuron might fire strongly for a vertical bar and barely at all for a horizontal one. This work later earned them a Nobel Prize.

From V1, visual information roughly splits into two pathways.

The **ventral stream** (the "what" pathway) runs from V1 through V2 and V4 into the inferotemporal cortex (IT) and is central to object recognition. Along the way, neurons respond to increasingly complex features. V2 still codes relatively simple features but starts combining information from V1. V4 is involved in color, intermediate shape and texture. IT contains complex object representations, including face-selective regions and category-level coding.

The **dorsal stream** (the "where" or "how" pathway) runs from V1 and V2 towards the parietal cortex. It handles spatial information: where things are, how they move, and how you might act on them. A well-known stop along the way is the motion area MT (also called V5; its human counterpart is usually labeled hMT+), where most neurons are tuned to the direction and speed of motion.

<img src="/blog/fmri-diagrams/visual-streams.svg" alt="Lateral view of the left hemisphere with the dorsal stream running from early visual cortex to posterior parietal cortex and the ventral stream running to inferotemporal cortex" />

This hierarchical organization is supported by lesion studies, single-unit recordings in animals and a lot of human neuroimaging, and it loosely inspired deep neural networks (more on that later). Still, the hierarchy is not a simple feedforward pipeline. There are massive feedback and lateral connections and a lot of recurrent processing. "Simple to complex" is a useful first approximation, and the real thing is messier than any diagram.

### Maps and modules

Two more organizing principles will come up again and again in this series.

First, the early visual areas are **retinotopic**: neighbouring points in the visual field are represented by neighbouring points on the cortex, so V1, V2 and V3 each contain a map of the visual field. The boundaries between these areas can't be seen in an anatomical scan, but they show up as reversals in these maps. That's why people run a retinotopic mapping experiment (for example with population receptive field mapping; Dumoulin & Wandell, 2008) to delineate V1, V2 and V3 in each participant.

Second, further along the ventral stream there are regions that respond much more strongly to some categories than to others. The best known are the fusiform face area (FFA; Kanwisher, McDermott & Chun, 1997), the parahippocampal place area (PPA), which prefers scenes and places (Epstein & Kanwisher, 1998), and the lateral occipital complex (LOC), which responds more to intact objects than to scrambled versions of them (Malach et al., 1995). These regions are usually identified per participant with a **functional localizer**, a short experiment contrasting, say, faces against objects.

Both retinotopic maps and localizer-defined regions are what most fMRI vision studies use as their regions of interest. Later parts of the series show how to actually define them.

## Neuroimaging modalities

So how do we study these regions in living, behaving humans? There are several tools, each with different strengths and weaknesses, and which one is right depends on the question you're asking.

| Modality | Spatial Resolution | Temporal Resolution | Invasiveness | Cost | Best For |
|----------|-------------------|---------------------|--------------|------|----------|
| **EEG** | ~cm scale, source localization ambiguous | ~1ms | Non-invasive | Low | Timing of neural processes |
| **MEG** | ~5-10mm, better localization than EEG | ~1ms | Non-invasive | High | Timing with better source localization |
| **fMRI** | ~1-3mm | ~1-2s | Non-invasive | High | Where processing happens |
| **Invasive recordings** | Single neurons | <1ms | Very invasive | Very high | Precise neural coding |

<img src="/blog/fmri-diagrams/spatial-temporal-tradeoff.svg" alt="Approximate spatial and temporal resolution of EEG, MEG, fMRI, and single-unit and LFP recordings on log scales" />

### EEG (Electroencephalography)

EEG measures electrical activity with electrodes placed on the scalp. It has been around since the 1920s and is still one of the most widely used techniques in cognitive neuroscience. Its main advantage is temporal resolution: you can follow neural activity with millisecond precision.

The downside is spatial resolution. The electrical signals have to pass through the skull and scalp before reaching the electrodes, and they get smeared together along the way. Working out where a signal came from ("source localization") is mathematically ill-posed, a bit like trying to figure out what's going on inside a room by listening at the door.

For vision, EEG is great for questions about timing. When does the brain first distinguish faces from objects? How quickly does attention modulate visual responses?

### MEG (Magnetoencephalography)

MEG measures the magnetic fields generated by neural activity. Magnetic fields are much less distorted by the skull and scalp than electrical potentials, so MEG localizes sources better than EEG while keeping the same millisecond temporal resolution.

The catch is that these fields are incredibly weak, about a billion times weaker than the Earth's magnetic field. You need superconducting sensors cooled with liquid helium, inside a magnetically shielded room. MEG systems cost millions, and many researchers don't have access to one.

### fMRI (Functional Magnetic Resonance Imaging)

This is where the crash course is heading. fMRI measures changes in blood oxygenation, which track neural activity indirectly. I'll explain how that works in the next post, but for now the main points are these.

Spatial resolution is good. We can localize activity to specific brain regions and even subregions a few millimeters across. With high-field scanners (7 Tesla and above), specialized studies have resolved columnar structure such as ocular dominance columns in V1, though that's far from routine.

Temporal resolution is poor. The blood oxygenation response is slow and peaks about 5-6 seconds after the neural activity that caused it. We're measuring a sluggish metabolic proxy, not the electrical activity itself.

fMRI is non-invasive and relatively safe (no radiation, no injections for standard studies), and it has become the workhorse of human cognitive neuroscience because it gives a detailed map of where things happen. If your question is "where in the brain" rather than "when", it's usually the right tool.

### Invasive recordings

The most direct way to study neural coding is to put electrodes into the brain. Single-unit and multi-unit recordings measure the activity of individual neurons with sub-millisecond precision. This is how Hubel and Wiesel found orientation selectivity, and how we know about face cells in IT. Much of our foundational knowledge about visual processing comes from invasive recordings in monkeys.

You obviously can't do this routinely in healthy humans. Human invasive recordings are limited to clinical settings, typically epilepsy patients who have electrodes implanted for surgical planning. These studies are very valuable, but they're rare and the electrode locations are chosen for clinical reasons, not research ones.

For vision research, combining invasive recordings in animals with fMRI in humans has worked well: mechanisms can be worked out in detail in animals, and fMRI can then test whether similar principles hold in the human brain.

## What is fMRI good at?

Given its strengths (spatial resolution) and limitations (temporal resolution, indirect measurement), these are the kinds of questions fMRI is well suited for:

- Localization: where in the brain does face processing happen? Which regions respond more to tools than to animals?
- Representation: what information is contained in a region's activity patterns? This is where MVPA (multivariate pattern analysis) and RSA (representational similarity analysis) come in, which we'll cover later in the course.
- Connectivity: how do different regions interact, and which ones share information during a task?
- Individual differences: why are some people better at recognizing faces than others? How does expertise change neural representations?
- Comparing models to brains: does a deep neural network trained on ImageNet represent images similarly to human V4? fMRI lets us test this kind of hypothesis directly.

## Large-scale datasets: NSD, THINGS and LAION-fMRI

I want to end with something that has changed how a lot of us work: large, densely sampled fMRI datasets.

A traditional fMRI study might scan 20-30 participants, each viewing a few hundred images or fewer. That's enough for many questions, but it limits how much you can learn about how the brain represents the huge variety of things we see.

The **Natural Scenes Dataset (NSD)** went the other way: 8 participants, each scanned in roughly 30-40 one-hour sessions at 7 Tesla, each viewing 9,000-10,000 unique natural images from the COCO dataset (Allen et al., 2022). Each image was shown up to three times, so you can estimate how reliable the responses are. The data is publicly available and widely used.

With this much data per person, models that predict brain activity from images finally have enough data to generalize.

The **THINGS** initiative takes a related approach centered on objects (Hebart et al., 2019, 2023). The THINGS database contains 1,854 object concepts with more than 26,000 naturalistic images. In THINGS-fMRI, 3 participants viewed 8,740 images of 720 of these concepts (12 images per concept); THINGS-MEG used the same 720 concepts. The full set of 1,854 concepts is covered by the behavioral part of THINGS-data, millions of odd-one-out similarity judgments collected online.

**LAION-fMRI** (Zerbe et al., 2026) is the most recent of these and pushes image diversity further. Five participants were each scanned in 30 main sessions at 7T, viewing 25,052 unique images in the first release. Most are everyday photographs sampled from a 120-million image-text corpus derived from LAION, and the set also includes images from NSD and THINGS, abstract shapes, visual illusions and other out-of-distribution stimuli. 1,492 shared images were repeated up to 12 times, which gives reliable responses to compare across people. The same participants also have retinotopic mapping, functional localizers, diffusion MRI and eye-tracking data, and the release includes single-trial betas estimated with GLMsingle.

Datasets like these (and others, such as BOLD5000; Chang et al., 2019) mark a shift towards "condition-rich" designs: instead of a handful of tightly controlled stimuli, participants see thousands of naturalistic images. If you're getting into vision neuroscience now, there is more high-quality public data available than ever before, which also means you can do a lot of research without collecting your own.

## Summary

- Behavioral experiments tell us what the visual system does; neuroimaging helps us get at where and how it does it.
- Visual processing is roughly hierarchical, with a ventral "what" stream towards IT and a dorsal "where/how" stream through MT towards parietal cortex. Early areas are retinotopic maps, and higher areas include category-selective regions like FFA, PPA and LOC.
- EEG and MEG are best for timing, fMRI for spatial localization, invasive recordings for single-neuron precision.
- Large public datasets like NSD, THINGS-data and LAION-fMRI make data-hungry, model-based analyses feasible.

---

In the next post, we'll look at how fMRI actually works: how magnets let us measure brain activity, and what that "brain activity" really is.

**Next:** [Part 3: Basics of (functional) MRI](/blog/fmri-crash-course-3-basics-mri)

**Previous:** [Part 1: Introduction](/blog/fmri-crash-course-1-introduction)

## References

### Visual System Hierarchy

- Thorpe, S., Fize, D., & Marlot, C. (1996). Speed of processing in the human visual system. *Nature*, 381, 520-522. [DOI: 10.1038/381520a0](https://doi.org/10.1038/381520a0)

- Hubel, D. H., & Wiesel, T. N. (1962). Receptive fields, binocular interaction and functional architecture in the cat's visual cortex. *The Journal of Physiology*, 160(1), 106-154. [DOI: 10.1113/jphysiol.1962.sp006837](https://doi.org/10.1113/jphysiol.1962.sp006837) | [PMC Free Article](https://pmc.ncbi.nlm.nih.gov/articles/PMC1359523/)

- Felleman, D. J., & Van Essen, D. C. (1991). Distributed hierarchical processing in the primate cerebral cortex. *Cerebral Cortex*, 1(1), 1-47. [DOI: 10.1093/cercor/1.1.1](https://doi.org/10.1093/cercor/1.1.1) | [Oxford Academic](https://academic.oup.com/cercor/article/1/1/1/408896)

- Mishkin, M., Ungerleider, L. G., & Macko, K. A. (1983). Object vision and spatial vision: two cortical pathways. *Trends in Neurosciences*, 6, 414-417. [DOI: 10.1016/0166-2236(83)90190-X](https://doi.org/10.1016/0166-2236(83)90190-X)

- Goodale, M. A., & Milner, A. D. (1992). Separate visual pathways for perception and action. *Trends in Neurosciences*, 15(1), 20-25. [DOI: 10.1016/0166-2236(92)90344-8](https://doi.org/10.1016/0166-2236(92)90344-8) | [PDF](https://cnbc.cmu.edu/braingroup/papers/goodale_milner_1992.pdf)

### Retinotopy and Category-Selective Regions

- Kanwisher, N., McDermott, J., & Chun, M. M. (1997). The fusiform face area: a module in human extrastriate cortex specialized for face perception. *Journal of Neuroscience*, 17(11), 4302-4311.

- Epstein, R., & Kanwisher, N. (1998). A cortical representation of the local visual environment. *Nature*, 392, 598-601.

- Malach, R., Reppas, J. B., Benson, R. R., Kwong, K. K., Jiang, H., Kennedy, W. A., ... & Tootell, R. B. H. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. *Proceedings of the National Academy of Sciences*, 92(18), 8135-8139.

- Dumoulin, S. O., & Wandell, B. A. (2008). Population receptive field estimates in human visual cortex. *NeuroImage*, 39(2), 647-660.

### Neuroimaging Methods

- Logothetis, N. K. (2008). What we can do and what we cannot do with fMRI. *Nature*, 453, 869-878. [DOI: 10.1038/nature06976](https://doi.org/10.1038/nature06976)

### Datasets

- **Natural Scenes Dataset (NSD):** Allen, E. J., St-Yves, G., Wu, Y., Breedlove, J. L., Prince, J. S., Dowdle, L. T., ... & Kay, K. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25(1), 116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x) | [Dataset Website](https://naturalscenesdataset.org/)

- **THINGS Database:** Hebart, M. N., Dickter, A. H., Kidder, A., Kwok, W. Y., Corriveau, A., Van Wicklin, C., & Baker, C. I. (2019). THINGS: A database of 1,854 object concepts and more than 26,000 naturalistic object images. *PLOS ONE*, 14(10), e0223792. [DOI: 10.1371/journal.pone.0223792](https://doi.org/10.1371/journal.pone.0223792) | [THINGS Initiative](https://things-initiative.org/)

- **THINGS-data:** Hebart, M. N., Contier, O., Teichmann, L., Rockter, A. H., Zheng, C. Y., Kidder, A., ... & Baker, C. I. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. *eLife*, 12, e82580. [DOI: 10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580) | [GitHub](https://github.com/ViCCo-Group/THINGS-data)

- **BOLD5000:** Chang, N., Pyles, J. A., Marcus, A., Gupta, A., Tarr, M. J., & Aminoff, E. M. (2019). BOLD5000, a public fMRI dataset while viewing 5000 visual images. *Scientific Data*, 6, 49. [DOI: 10.1038/s41597-019-0052-3](https://doi.org/10.1038/s41597-019-0052-3) | [Dataset Website](https://bold5000-dataset.github.io/website/)

- **LAION-fMRI:** Zerbe, J., Roth, J., Mell, M. M., Herholz, P., Knapen, T., & Hebart, M. N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset website](https://laion-fmri.hebartlab.com) | [AWS Open Data](https://registry.opendata.aws/laion-fmri/)
