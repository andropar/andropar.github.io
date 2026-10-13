---
title: "Using Neuroimaging for Understanding the Visual System"
description: "Why we need functional neuroimaging to understand vision, what we've learned so far, and the different modalities available. Part 2 of an 8-part fMRI crash course."
date: 2025-03-17
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 2 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

You can learn a lot about the visual system by showing people images and asking them questions. Reaction times, accuracy, what they see and what they miss: behavioral experiments have long been the bread and butter of vision science. But on their own, they mostly tell you *what* the system does, and much less about *how* it does it.

I like to think of it as studying a car by only looking at the speedometer. You can work out acceleration, top speed and braking distance, which is useful. You won't learn much about the engine or the gearbox, though, or why it makes that weird noise when you turn left. Neuroimaging is one way of opening the hood.

## Why behavioral experiments aren't enough

A concrete example. Thorpe, Fize and Marlot (1996) asked people to decide whether a photograph they had never seen before, flashed for just 20 milliseconds, contained an animal. People can do this, but a reaction time can't tell you how long the visual part of the task took, because it also includes the time needed to prepare and execute the response. So the authors also recorded EEG, and found that the signal on trials without an animal diverged from trials with one roughly 150 ms after image onset. They concluded that the visual processing for this task can be done in under 150 ms, which is a nice example of behavior and imaging working together.

What behavior alone can't tell you is which parts of the brain are involved, what gets computed first, or whether there is a dedicated "animal detector" somewhere versus something that falls out of more general-purpose processing.

There's a second limitation. A behavioral response is the end result of a long chain of processing. By the time someone presses a button to say "yes, I saw a face", the information has passed through many brain regions, been transformed several times, and finally been turned into a motor command. Measuring only the button press is a bit like reading the last page of a book: you know how it ends, but you've missed everything in between. Neuroimaging gives us (blurry) access to the middle pages.

## The visual system: a hierarchy of increasingly complex representations

Before talking about imaging techniques, it helps to know what we're trying to image. The visual system is a cascade of brain regions that each do something a bit different.

<img src="/blog/fmri-diagrams/visual-hierarchy.svg" alt="Visual processing hierarchy from retina through LGN, V1, V2 and V4 to IT, with receptive fields growing at each stage" />

Light hits the retina and gets converted into neural signals. These travel from the retina to the **lateral geniculate nucleus (LGN)** in the thalamus, and from there to the primary visual cortex, **V1**, at the very back of the brain (DiCarlo et al., 2012).

Neurons in V1 respond to simple features like edges at particular orientations. In a famous series of experiments starting in the late 1950s, Hubel and Wiesel recorded from single neurons in cat and later monkey visual cortex and showed that they are tuned to specific orientations: one neuron might fire strongly for a bar at one angle and barely at all for another (Hubel & Wiesel, 1959, 1968). This work earned them a share of the 1981 Nobel Prize (Grzybowski & Pietrzak, 2014).

From V1, visual information roughly splits into two pathways (Mishkin et al., 1983).

The **ventral stream** (the "what" pathway) runs from V1 through V2 and V4 into the inferotemporal cortex (IT) and is central to object recognition (Mishkin et al., 1983; DiCarlo et al., 2012). Along the way, neurons respond to increasingly complex features. V2 neurons respond to many of the same simple features as V1, but unlike V1 cells, most respond more strongly to naturalistic textures that combine those features (Freeman et al., 2013). V4 cells are selective for color, texture and shape properties such as contour curvature (Roe et al., 2012). IT holds the most powerful object representations along this pathway (DiCarlo et al., 2012), including regions where almost all neurons are face-selective (Tsao et al., 2006).

The **dorsal stream** runs from V1 towards the parietal cortex. It was first described as the "where" pathway for locating objects (Mishkin et al., 1983) and later reframed as a "how" pathway for guiding actions towards them (Goodale & Milner, 1992). A well-known stop along the way is the motion area MT (also called V5), which is full of direction-selective neurons (Born & Bradley, 2005); its human counterpart is usually labeled hMT+ (Wandell et al., 2007).

<img src="/blog/fmri-diagrams/visual-streams.svg" alt="Lateral view of the left hemisphere with the dorsal stream running from early visual cortex to posterior parietal cortex and the ventral stream running to inferotemporal cortex" />

This hierarchical picture comes from anatomy (Felleman & Van Essen, 1991), lesion and recording studies in monkeys (Mishkin et al., 1983) and a lot of human neuroimaging, and it loosely inspired neural network models of vision: the neocognitron, an ancestor of today's convolutional networks, was built to resemble Hubel and Wiesel's hierarchy (Fukushima, 1980). Still, the hierarchy is not a simple feedforward pipeline. Most connections between visual areas are reciprocal (Felleman & Van Essen, 1991), and feedback is thought to matter for many visual tasks (DiCarlo et al., 2012). "Simple to complex" is a useful first approximation, and the real thing is messier than any diagram.

### Maps and modules

Two more organizing principles will come up again and again in this series.

First, the early visual areas are **retinotopic**: neighboring points in the visual field are represented by neighboring points on the cortex, so V1, V2 and V3 each contain a map of the visual field (Wandell et al., 2007). Adjacent areas often represent the visual field as mirror images of each other, so their borders show up as reversals in these maps (Sereno et al., 1995). That's why people run a retinotopic mapping experiment (for example with population receptive field mapping; Dumoulin & Wandell, 2008) to delineate V1, V2 and V3 in each participant.

Second, further along the ventral stream there are regions that respond much more strongly to some categories than to others. The best known are the fusiform face area (FFA; Kanwisher, McDermott & Chun, 1997), the parahippocampal place area (PPA), which prefers scenes and places (Epstein & Kanwisher, 1998), and the lateral occipital complex (LOC), which responds more to images of objects than to textures (Malach et al., 1995). These regions are usually identified per participant with a **functional localizer**, a short experiment contrasting, say, faces against objects (Kanwisher et al., 1997; Saxe, Brett & Kanwisher, 2006).

Retinotopic maps and localizer-defined regions are common regions of interest (ROIs) in fMRI vision studies; NSD, for example, provides ROIs from both kinds of scans (Allen et al., 2022). [Part 4](/blog/fmri-crash-course-4-recording-experiments) covers the scans you need for them and [Part 7](/blog/fmri-crash-course-7-analysis-glm) how to define the ROIs from the data.

## Neuroimaging modalities

So how do we study these regions in living, behaving humans? There are several tools, each with different strengths and weaknesses, and which one is right depends on the question you're asking.

| Modality | Spatial Resolution | Temporal Resolution | Invasiveness | Best For |
|----------|-------------------|---------------------|--------------|----------|
| **EEG** | ~cm scale, source localization ill-posed | Milliseconds | Non-invasive | Timing of neural processes |
| **MEG** | Better localization than EEG | Milliseconds | Non-invasive | Timing with better source localization |
| **fMRI** | Millimeters (e.g. 1.8 mm in NSD) | Seconds (response peaks ~5-6 s) | Non-invasive | Where processing happens |
| **Invasive recordings** | Single neurons to millimeters | Milliseconds | Very invasive | Precise neural coding |

*Sources: He & Liu (2008) and Grech et al. (2008) for EEG; Singh (2014) and Baillet (2017) for MEG; Glover (2011) and Allen et al. (2022) for fMRI; Parvizi & Kastner (2018) for human intracranial recordings.*

<img src="/blog/fmri-diagrams/spatial-temporal-tradeoff.svg" alt="Approximate spatial and temporal resolution of EEG, MEG, fMRI, and single-unit and LFP recordings on log scales" />

*Schematic. The boxes are rough orders of magnitude matching the table above, not measured boundaries.*

### EEG (Electroencephalography)

EEG measures electrical activity with electrodes placed on the scalp. Hans Berger published the first recordings from humans in 1929 (Coenen & Zayachkivska, 2013). Its main advantage is temporal resolution: EEG is classically considered to have excellent temporal and poor spatial resolution (Burle et al., 2015).

The downside is spatial resolution. The electrical signals have to pass through the skull and scalp before reaching the electrodes, and volume conduction smears them together along the way (Burle et al., 2015). Working out where a signal came from ("source localization") is mathematically ill-posed, because many different source configurations can produce the same scalp voltages (Grech et al., 2008). It's a bit like trying to figure out what's going on inside a room by listening at the door.

For vision, EEG is great for questions about timing. When does the brain first distinguish faces from objects? How quickly does attention modulate visual responses?

### MEG (Magnetoencephalography)

MEG measures the magnetic fields generated by neural activity. Magnetic fields are not distorted by the scalp and skull the way electrical potentials are, so MEG localizes sources better than EEG (Singh, 2014) while keeping millisecond temporal resolution (Baillet, 2017).

The catch is that these fields are incredibly weak, at most a few hundred femtotesla, compared to 10<sup>-5</sup> to 10<sup>-4</sup> tesla for the Earth's magnetic field (Singh, 2014). That's roughly a hundred million to a billion times weaker. You need superconducting sensors cooled with liquid helium, inside a magnetically shielded room (Singh, 2014), which makes MEG considerably more expensive than EEG.

### fMRI (Functional Magnetic Resonance Imaging)

This is where the crash course is heading. fMRI measures changes in blood oxygenation, which track neural activity indirectly (Glover, 2011). I'll explain how that works in the next post, but for now the main points are these.

Spatial resolution is good. NSD, for example, was recorded with 1.8 mm voxels (Allen et al., 2022). With high-field scanners, specialized studies have resolved columnar structure such as ocular dominance columns in V1, at 4 T (Cheng, Waggoner & Tanaka, 2001) and more robustly at 7 T (Yacoub et al., 2007), though that's far from routine.

Temporal resolution is poor. The blood oxygenation response is slow and peaks about 5-6 seconds after the neural activity that caused it (Glover, 2011). We're measuring a sluggish hemodynamic proxy, not the electrical activity itself (Logothetis, 2008).

fMRI is non-invasive (no injections or radioactive tracers for standard studies; Glover, 2011), and it has become the mainstay of neuroimaging in cognitive neuroscience (Logothetis, 2008) because it gives a detailed map of where things happen. If your question is "where in the brain" rather than "when", it's usually the right tool.

### Invasive recordings

The most direct way to study neural coding is to put electrodes into the brain. Single-unit and multi-unit recordings measure the activity of individual neurons. This is how Hubel and Wiesel found orientation selectivity (Hubel & Wiesel, 1959), and how we know about face cells in IT (Tsao et al., 2006). Much of what we know about mid-level areas like V4 comes from recordings and imaging in macaque monkeys (Roe et al., 2012).

You obviously can't do this routinely in healthy humans. Most human intracranial recordings are done in epilepsy patients who have electrodes implanted to locate the source of their seizures (Parvizi & Kastner, 2018). These studies are very valuable, but the location of the electrodes is decided by clinical needs, not research ones, and occipital and parietal cortex are covered less often (Parvizi & Kastner, 2018).

For vision research, combining invasive recordings in animals with fMRI has worked well. Tsao et al. (2006), for example, used fMRI in macaques to find face-selective regions like those seen in humans, then recorded from one of them and found that almost all visually responsive neurons there were face-selective.

## What is fMRI good at?

Given its strengths (spatial resolution) and limitations (temporal resolution, indirect measurement), these are the kinds of questions fMRI is well suited for:

- Localization: where in the brain does face processing happen (Kanwisher et al., 1997)? Which regions respond more to tools than to animals (Chao, Haxby & Martin, 1999)?
- Representation: what information is contained in a region's activity patterns (Haxby et al., 2001)? This is where MVPA (multivariate pattern analysis) and RSA (representational similarity analysis; Kriegeskorte, Mur & Bandettini, 2008) come in, which we'll cover later in the course.
- Connectivity: how do different regions interact, and which ones share information during a task (Friston, 2011)?
- Individual differences: why are some people better at recognizing faces than others (Elbich & Scherf, 2017)? How does expertise change neural responses (Gauthier et al., 2000)?
- Comparing models to brains: does a deep neural network trained on ImageNet represent images similarly to human IT? Khaligh-Razavi and Kriegeskorte (2014) tested this with fMRI and found that a deep network explained IT better than 36 other models, though not fully.

## Large-scale datasets: NSD, THINGS and LAION-fMRI

I want to end with something that has changed how a lot of us work: large, densely sampled fMRI datasets.

A traditional fMRI study might scan around 30 participants (the median single-group sample size in 2015 was 28.5; Poldrack et al., 2017), and human neuroimaging studies of vision have typically used around 100 images (Chang et al., 2019). That's enough for many questions, but it limits how much you can learn about how the brain represents the huge variety of things we see.

The **Natural Scenes Dataset (NSD)** went the other way: 8 participants, each scanned in 30-40 sessions at 7 Tesla (Allen et al., 2022). The design scheduled 10,000 distinct natural images from the COCO dataset per participant, each shown three times over 40 sessions, so participants who completed fewer sessions saw somewhat fewer images and repeats. The data is publicly available and widely used.

With this much data per person, the NSD authors could train deep neural network models that predict brain activity more accurately than state-of-the-art models from computer vision (Allen et al., 2022).

The **THINGS** initiative takes a related approach centered on objects. The THINGS database contains 1,854 object concepts with 26,107 naturalistic images (Hebart et al., 2019). In THINGS-fMRI, 3 participants viewed 8,740 unique images of 720 of these concepts, while 4 participants in THINGS-MEG viewed 22,448 unique images covering all 1,854 concepts (Hebart et al., 2023). THINGS-data also includes 4.70 million odd-one-out similarity judgments collected online.

**LAION-fMRI** (Zerbe et al., 2026) is the most recent of these and pushes image diversity further. Five participants were each scanned in 30 main sessions at 7T, viewing 25,052 unique images in the launch release. Most are everyday photographs sampled from a 120-million image-text corpus, and the set also includes images from NSD and THINGS, abstract shapes, visual illusions and other out-of-distribution stimuli. 1,492 shared images were repeated up to 12 times. The dataset also includes retinotopic mapping, functional localizers, diffusion MRI and eye-tracking data, and the release includes single-trial betas estimated with GLMsingle.

Datasets like these (and others, such as BOLD5000, with almost 5,000 images; Chang et al., 2019) mark a shift towards "condition-rich" designs (Kriegeskorte et al., 2008): instead of a handful of tightly controlled stimuli, participants see thousands of naturalistic images. Since all of these are public, you can do a lot of research without collecting your own data.

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

- Hubel, D. H., & Wiesel, T. N. (1959). Receptive fields of single neurones in the cat's striate cortex. *The Journal of Physiology*, 148(3), 574-591. [DOI: 10.1113/jphysiol.1959.sp006308](https://doi.org/10.1113/jphysiol.1959.sp006308) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC1363130/)

- Hubel, D. H., & Wiesel, T. N. (1968). Receptive fields and functional architecture of monkey striate cortex. *The Journal of Physiology*, 195(1), 215-243. [DOI: 10.1113/jphysiol.1968.sp008455](https://doi.org/10.1113/jphysiol.1968.sp008455)

- Grzybowski, A., & Pietrzak, K. (2014). David Hubel (1926-2013): the man who developed our understanding of vision. *Neurological Sciences*, 35(6), 919-921. [DOI: 10.1007/s10072-014-1638-3](https://doi.org/10.1007/s10072-014-1638-3) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4033802/)

- Felleman, D. J., & Van Essen, D. C. (1991). Distributed hierarchical processing in the primate cerebral cortex. *Cerebral Cortex*, 1(1), 1-47. [DOI: 10.1093/cercor/1.1.1](https://doi.org/10.1093/cercor/1.1.1)

- DiCarlo, J. J., Zoccolan, D., & Rust, N. C. (2012). How does the brain solve visual object recognition? *Neuron*, 73(3), 415-434. [DOI: 10.1016/j.neuron.2012.01.010](https://doi.org/10.1016/j.neuron.2012.01.010) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3306444/)

- Mishkin, M., Ungerleider, L. G., & Macko, K. A. (1983). Object vision and spatial vision: two cortical pathways. *Trends in Neurosciences*, 6, 414-417. [DOI: 10.1016/0166-2236(83)90190-X](https://doi.org/10.1016/0166-2236(83)90190-X)

- Goodale, M. A., & Milner, A. D. (1992). Separate visual pathways for perception and action. *Trends in Neurosciences*, 15(1), 20-25. [DOI: 10.1016/0166-2236(92)90344-8](https://doi.org/10.1016/0166-2236(92)90344-8)

- Freeman, J., Ziemba, C. M., Heeger, D. J., Simoncelli, E. P., & Movshon, J. A. (2013). A functional and perceptual signature of the second visual area in primates. *Nature Neuroscience*, 16(7), 974-981. [DOI: 10.1038/nn.3402](https://doi.org/10.1038/nn.3402) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3710454/)

- Roe, A. W., Chelazzi, L., Connor, C. E., Conway, B. R., Fujita, I., Gallant, J. L., Lu, H., & Vanduffel, W. (2012). Toward a unified theory of visual area V4. *Neuron*, 74(1), 12-29. [DOI: 10.1016/j.neuron.2012.03.011](https://doi.org/10.1016/j.neuron.2012.03.011) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4912377/)

- Born, R. T., & Bradley, D. C. (2005). Structure and function of visual area MT. *Annual Review of Neuroscience*, 28, 157-189. [DOI: 10.1146/annurev.neuro.26.041002.131052](https://doi.org/10.1146/annurev.neuro.26.041002.131052)

- Tsao, D. Y., Freiwald, W. A., Tootell, R. B. H., & Livingstone, M. S. (2006). A cortical region consisting entirely of face-selective cells. *Science*, 311(5761), 670-674. [DOI: 10.1126/science.1119983](https://doi.org/10.1126/science.1119983) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2678572/)

- Fukushima, K. (1980). Neocognitron: a self-organizing neural network model for a mechanism of pattern recognition unaffected by shift in position. *Biological Cybernetics*, 36(4), 193-202. [DOI: 10.1007/BF00344251](https://doi.org/10.1007/BF00344251)

### Retinotopy and Category-Selective Regions

- Wandell, B. A., Dumoulin, S. O., & Brewer, A. A. (2007). Visual field maps in human cortex. *Neuron*, 56(2), 366-383. [DOI: 10.1016/j.neuron.2007.10.012](https://doi.org/10.1016/j.neuron.2007.10.012)

- Sereno, M. I., Dale, A. M., Reppas, J. B., Kwong, K. K., Belliveau, J. W., Brady, T. J., Rosen, B. R., & Tootell, R. B. H. (1995). Borders of multiple visual areas in humans revealed by functional magnetic resonance imaging. *Science*, 268(5212), 889-893. [DOI: 10.1126/science.7754376](https://doi.org/10.1126/science.7754376)

- Dumoulin, S. O., & Wandell, B. A. (2008). Population receptive field estimates in human visual cortex. *NeuroImage*, 39(2), 647-660. [DOI: 10.1016/j.neuroimage.2007.09.034](https://doi.org/10.1016/j.neuroimage.2007.09.034) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3073038/)

- Kanwisher, N., McDermott, J., & Chun, M. M. (1997). The fusiform face area: a module in human extrastriate cortex specialized for face perception. *Journal of Neuroscience*, 17(11), 4302-4311. [DOI: 10.1523/JNEUROSCI.17-11-04302.1997](https://doi.org/10.1523/JNEUROSCI.17-11-04302.1997) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6573547/)

- Epstein, R., & Kanwisher, N. (1998). A cortical representation of the local visual environment. *Nature*, 392, 598-601. [DOI: 10.1038/33402](https://doi.org/10.1038/33402)

- Malach, R., Reppas, J. B., Benson, R. R., Kwong, K. K., Jiang, H., Kennedy, W. A., Ledden, P. J., Brady, T. J., Rosen, B. R., & Tootell, R. B. H. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. *Proceedings of the National Academy of Sciences*, 92(18), 8135-8139. [DOI: 10.1073/pnas.92.18.8135](https://doi.org/10.1073/pnas.92.18.8135) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC41110/)

- Saxe, R., Brett, M., & Kanwisher, N. (2006). Divide and conquer: a defense of functional localizers. *NeuroImage*, 30(4), 1088-1096. [DOI: 10.1016/j.neuroimage.2005.12.062](https://doi.org/10.1016/j.neuroimage.2005.12.062)

### Neuroimaging Methods

- He, B., & Liu, Z. (2008). Multimodal functional neuroimaging: integrating functional magnetic resonance imaging and electroencephalography/magnetoencephalography. *IEEE Reviews in Biomedical Engineering*, 1, 23-40. [DOI: 10.1109/RBME.2008.2008233](https://doi.org/10.1109/RBME.2008.2008233) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2903760/)

- Coenen, A., & Zayachkivska, O. (2013). Adolf Beck: a pioneer in electroencephalography in between Richard Caton and Hans Berger. *Advances in Cognitive Psychology*, 9(4), 216-221. [DOI: 10.5709/acp-0148-3](https://doi.org/10.5709/acp-0148-3) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3902832/)

- Burle, B., Spieser, L., Roger, C., Casini, L., Hasbroucq, T., & Vidal, F. (2015). Spatial and temporal resolutions of EEG: is it really black and white? A scalp current density view. *International Journal of Psychophysiology*, 97(3), 210-220. [DOI: 10.1016/j.ijpsycho.2015.05.004](https://doi.org/10.1016/j.ijpsycho.2015.05.004) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4548479/)

- Grech, R., Cassar, T., Muscat, J., Camilleri, K. P., Fabri, S. G., Zervakis, M., Xanthopoulos, P., Sakkalis, V., & Vanrumste, B. (2008). Review on solving the inverse problem in EEG source analysis. *Journal of NeuroEngineering and Rehabilitation*, 5, 25. [DOI: 10.1186/1743-0003-5-25](https://doi.org/10.1186/1743-0003-5-25) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2605581/)

- Singh, S. P. (2014). Magnetoencephalography: basic principles. *Annals of Indian Academy of Neurology*, 17(Suppl 1), S107-S112. [DOI: 10.4103/0972-2327.128676](https://doi.org/10.4103/0972-2327.128676) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4001219/)

- Baillet, S. (2017). Magnetoencephalography for brain electrophysiology and imaging. *Nature Neuroscience*, 20(3), 327-339. [DOI: 10.1038/nn.4504](https://doi.org/10.1038/nn.4504)

- Glover, G. H. (2011). Overview of functional magnetic resonance imaging. *Neurosurgery Clinics of North America*, 22(2), 133-139. [DOI: 10.1016/j.nec.2010.11.001](https://doi.org/10.1016/j.nec.2010.11.001) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3073717/)

- Logothetis, N. K. (2008). What we can do and what we cannot do with fMRI. *Nature*, 453, 869-878. [DOI: 10.1038/nature06976](https://doi.org/10.1038/nature06976)

- Cheng, K., Waggoner, R. A., & Tanaka, K. (2001). Human ocular dominance columns as revealed by high-field functional magnetic resonance imaging. *Neuron*, 32(2), 359-374. [DOI: 10.1016/S0896-6273(01)00477-9](https://doi.org/10.1016/S0896-6273(01)00477-9)

- Yacoub, E., Shmuel, A., Logothetis, N., & Uğurbil, K. (2007). Robust detection of ocular dominance columns in humans using Hahn Spin Echo BOLD functional MRI at 7 Tesla. *NeuroImage*, 37(4), 1161-1177. [DOI: 10.1016/j.neuroimage.2007.05.020](https://doi.org/10.1016/j.neuroimage.2007.05.020) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2040323/)

- Parvizi, J., & Kastner, S. (2018). Promises and limitations of human intracranial electroencephalography. *Nature Neuroscience*, 21(4), 474-483. [DOI: 10.1038/s41593-018-0108-2](https://doi.org/10.1038/s41593-018-0108-2) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6476542/)

### What fMRI Can Address

- Chao, L. L., Haxby, J. V., & Martin, A. (1999). Attribute-based neural substrates in temporal cortex for perceiving and knowing about objects. *Nature Neuroscience*, 2(10), 913-919. [DOI: 10.1038/13217](https://doi.org/10.1038/13217)

- Haxby, J. V., Gobbini, M. I., Furey, M. L., Ishai, A., Schouten, J. L., & Pietrini, P. (2001). Distributed and overlapping representations of faces and objects in ventral temporal cortex. *Science*, 293(5539), 2425-2430. [DOI: 10.1126/science.1063736](https://doi.org/10.1126/science.1063736)

- Kriegeskorte, N., Mur, M., & Bandettini, P. (2008). Representational similarity analysis - connecting the branches of systems neuroscience. *Frontiers in Systems Neuroscience*, 2, 4. [DOI: 10.3389/neuro.06.004.2008](https://doi.org/10.3389/neuro.06.004.2008) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2605405/)

- Friston, K. J. (2011). Functional and effective connectivity: a review. *Brain Connectivity*, 1(1), 13-36. [DOI: 10.1089/brain.2011.0008](https://doi.org/10.1089/brain.2011.0008)

- Elbich, D. B., & Scherf, S. (2017). Beyond the FFA: brain-behavior correspondences in face recognition abilities. *NeuroImage*, 147, 409-422. [DOI: 10.1016/j.neuroimage.2016.12.042](https://doi.org/10.1016/j.neuroimage.2016.12.042)

- Gauthier, I., Skudlarski, P., Gore, J. C., & Anderson, A. W. (2000). Expertise for cars and birds recruits brain areas involved in face recognition. *Nature Neuroscience*, 3(2), 191-197. [DOI: 10.1038/72140](https://doi.org/10.1038/72140)

- Khaligh-Razavi, S.-M., & Kriegeskorte, N. (2014). Deep supervised, but not unsupervised, models may explain IT cortical representation. *PLOS Computational Biology*, 10(11), e1003915. [DOI: 10.1371/journal.pcbi.1003915](https://doi.org/10.1371/journal.pcbi.1003915) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4222664/)

- Poldrack, R. A., Baker, C. I., Durnez, J., Gorgolewski, K. J., Matthews, P. M., Munafò, M. R., Nichols, T. E., Poline, J.-B., Vul, E., & Yarkoni, T. (2017). Scanning the horizon: towards transparent and reproducible neuroimaging research. *Nature Reviews Neuroscience*, 18(2), 115-126. [DOI: 10.1038/nrn.2016.167](https://doi.org/10.1038/nrn.2016.167) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6910649/)

### Datasets

- **Natural Scenes Dataset (NSD):** Allen, E. J., St-Yves, G., Wu, Y., Breedlove, J. L., Prince, J. S., Dowdle, L. T., ... & Kay, K. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25(1), 116-126. [DOI: 10.1038/s41593-021-00962-x](https://doi.org/10.1038/s41593-021-00962-x) | [Dataset Website](https://naturalscenesdataset.org/)

- **THINGS Database:** Hebart, M. N., Dickter, A. H., Kidder, A., Kwok, W. Y., Corriveau, A., Van Wicklin, C., & Baker, C. I. (2019). THINGS: A database of 1,854 object concepts and more than 26,000 naturalistic object images. *PLOS ONE*, 14(10), e0223792. [DOI: 10.1371/journal.pone.0223792](https://doi.org/10.1371/journal.pone.0223792) | [THINGS Initiative](https://things-initiative.org/)

- **THINGS-data:** Hebart, M. N., Contier, O., Teichmann, L., Rockter, A. H., Zheng, C. Y., Kidder, A., ... & Baker, C. I. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. *eLife*, 12, e82580. [DOI: 10.7554/eLife.82580](https://doi.org/10.7554/eLife.82580) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10038662/) | [GitHub](https://github.com/ViCCo-Group/THINGS-data)

- **BOLD5000:** Chang, N., Pyles, J. A., Marcus, A., Gupta, A., Tarr, M. J., & Aminoff, E. M. (2019). BOLD5000, a public fMRI dataset while viewing 5000 visual images. *Scientific Data*, 6, 49. [DOI: 10.1038/s41597-019-0052-3](https://doi.org/10.1038/s41597-019-0052-3) | [Dataset Website](https://bold5000-dataset.github.io/website/)

- **LAION-fMRI:** Zerbe, J., Roth, J., Mell, M. M., Herholz, P., Knapen, T., & Hebart, M. N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. [Dataset website](https://laion-fmri.hebartlab.com) | [AWS Open Data](https://registry.opendata.aws/laion-fmri/)
