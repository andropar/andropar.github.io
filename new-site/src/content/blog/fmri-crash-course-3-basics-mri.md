---
title: "Basics of (Functional) MRI"
description: "How MRI and fMRI work, the BOLD signal, and a first look at real fMRI data. Part 3 of an 8-part fMRI crash course."
date: 2025-03-24
draft: true
tags: ["fMRI", "neuroscience", "methods", "vision"]
---

*This is Part 3 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

In this post we'll look at how a giant magnet can measure brain activity. When I first heard about it, it sounded a bit like magic, but you only need a handful of physics ideas to follow the rest of this series.

## MRI basics: spins, magnets, and radio waves

The MRI signal comes from hydrogen nuclei in the water and fat of your tissue. Each hydrogen nucleus is a single proton, and protons have a property called spin that gives each one a small magnetic field (Ridgway, 2010). For our purposes, you can think of each proton as a tiny bar magnet.

Normally these tiny magnets point in random directions and cancel out. Inside an MRI scanner they sit in a field of typically 1.5 to 7 Tesla, and 1 Tesla is already about 20,000 times Earth's field (Ridgway, 2010). In this field, slightly more protons align with the field than against it. The excess is tiny, just a few per million (Ridgway, 2010), but there are so many protons in a brain that it adds up to a measurable net magnetization pointing along the field. This net magnetization is what MRI works with.

<img src="/blog/fmri-diagrams/proton-alignment.svg" alt="Spins point in random directions without a field; inside the scanner a tiny excess aligns with the main field and produces a net magnetization" />

The protons also precess: like a slightly tilted spinning top, they wobble around the direction of the magnetic field at a specific frequency, the Larmor frequency, which is proportional to the field strength and depends on the type of nucleus. For hydrogen it's 42.6 MHz per Tesla (Ridgway, 2010), so in a 3T scanner it's about 128 MHz.

To get a signal, the scanner sends a short burst of radio waves at exactly this frequency (an RF pulse). Protons only absorb energy at this frequency (resonance), and the pulse tips the net magnetization away from the direction of the main field.

When the pulse stops, the magnetization returns to its original state, and the precessing protons emit radio waves that the scanner's receiver coils pick up (Ridgway, 2010). This is the MRI signal.

### T1, T2, and T2* relaxation: where contrast comes from

Different tissues return to equilibrium at different rates, and that's what gives MRI images their contrast. There are two main kinds of relaxation.

T1 relaxation (longitudinal relaxation) describes how quickly the magnetization realigns with the main field. Fat recovers quickly, fluid slowly, so in T1-weighted images fat appears bright and fluid such as cerebrospinal fluid appears dark (Ridgway, 2010). The anatomical scans you'll use for registration and cortical surface reconstruction are usually T1-weighted; fMRIPrep, for example, reconstructs the cortical surfaces from the T1w image and registers the functional data to it ([fMRIPrep documentation](https://fmriprep.org/en/stable/workflows.html)).

T2 relaxation (transverse relaxation) describes how quickly the protons lose their synchrony after the RF pulse, like runners who start together and gradually spread out. In T2-weighted images, fluids appear bright (Ridgway, 2010).

In a real scanner, the protons also get out of sync because the magnetic field isn't perfectly uniform: small local field inhomogeneities make neighboring protons precess at slightly different frequencies. The decay you actually observe, which combines T2 relaxation with this extra dephasing, is called T2* ("T2-star"), and tissue T2* values are shorter than their T2 values (Ridgway, 2010). This is what fMRI exploits.

<img src="/blog/fmri-diagrams/t1-t2-curves.svg" alt="T1 recovery and T2 decay curves for white matter, gray matter and CSF at 3T" />

*The T1 values in the plot (about 830 ms for white matter, 1330 ms for gray matter) follow in vivo measurements at 3T (Wansapura et al., 1999), and CSF has a T1 of roughly 4 s (Rooney et al., 2007). Published T2 values vary more between studies, so take the T2 curves as illustrative.*

By changing the timing of RF pulses and signal readout (TR, TE and flip angle), you can make an image sensitive mostly to T1, T2, or T2* (Ridgway, 2010).

## From structure to function: the BOLD signal

fMRI relies on the fact that active neurons need energy and oxygen. When a brain region becomes more active, local blood flow increases, and it increases by more than the extra oxygen consumption requires: in a classic PET study, somatosensory stimulation raised blood flow by 29% but oxygen metabolism by only 5% (Fox & Raichle, 1986). This is the hemodynamic response.

Hemoglobin, the molecule in red blood cells that carries oxygen, has different magnetic properties depending on whether it's carrying oxygen. Oxygenated hemoglobin is diamagnetic and magnetically indistinguishable from brain tissue. Deoxygenated hemoglobin is paramagnetic: it creates small field gradients around blood vessels. These local field inhomogeneities make nearby protons dephase faster, which shortens T2* and reduces the signal in a T2*-weighted image (Glover, 2011).

So the logic goes:
1. Neurons in some region become more active
2. Blood flow increases, bringing in more oxygenated blood than is used up
3. The proportion of deoxyhemoglobin in the local blood drops
4. Less field distortion means slower T2* decay
5. The T2*-weighted MRI signal increases

This is the Blood Oxygen Level Dependent (BOLD) signal, first described by Ogawa et al. (1990). To be sensitive to it, fMRI uses T2*-weighted gradient-echo sequences, almost always echo-planar imaging (EPI), which typically acquires a whole brain volume every 2 seconds (Glover, 2011), and with newer multiband sequences in under a second (Feinberg et al., 2010). We're measuring changes in blood oxygenation that follow neural activity, not the activity itself. Visual cortex was one of the first places this was shown in humans: Kwong et al. (1992) found a 1.8% signal increase in V1 during flashing-light stimulation.

<img src="/blog/fmri-diagrams/bold-contrast-te.svg" alt="Left: T2* decay curves at rest and during activity, nearly overlapping. Right: their difference as a function of echo time, peaking near the tissue T2*" />

*Simulated gray matter at 3T, with a T2* of 44 ms (measured values are around 40-50 ms; Wansapura et al., 1999). Activity makes T2* slightly longer, so the signal decays a little more slowly. The difference is tiny, and BOLD contrast is largest where the echo time equals the local T2* (Poser et al., 2006). In practice TE is often set a bit shorter, around 30 ms at 3T (THINGS-fMRI used 33 ms; Hebart et al., 2023): a shorter TE reduces signal loss near the sinuses and allows faster scanning (Gorno-Tempini et al., 2002), and at 3T BOLD sensitivity stays near its optimum from about 30 ms upward (Fera et al., 2004).*

### A recent complication: discordant voxels

A [2025 paper in Nature Neuroscience](https://www.nature.com/articles/s41593-025-02132-9) (Epp et al., 2025) showed that the relationship between BOLD and the underlying physiology can be messier than the standard model suggests.

They used quantitative imaging to measure both the BOLD signal and oxygen metabolism (the cerebral metabolic rate of oxygen, CMRO₂) during tasks. In about 40% of voxels with significant BOLD changes, the BOLD signal went in the opposite direction from oxygen metabolism. They called these voxels "discordant", and they were particularly common in the default mode network.

In concordant voxels, BOLD tracks oxygen consumption as the textbook model predicts, and changes in blood flow do most of the work. Discordant voxels instead regulated oxygen supply mainly by changing how much oxygen is extracted from the blood, which flips the sign of the BOLD change (Epp et al., 2025).

This doesn't make fMRI useless, but the coupling between BOLD and neural activity can differ between regions, and BOLD decreases ("deactivations") deserve extra caution: 66% of voxels with negative BOLD changes were discordant, compared with 31% of those with positive changes (Epp et al., 2025). The textbook model was originally established in sensory cortex (Fox & Raichle, 1986), and the authors note it is unclear how well it holds beyond it.

### The hemodynamic response function

The hemodynamic response function (HRF) describes how the BOLD signal evolves over time after a brief neural event.

<img src="/blog/fmri-diagrams/hrf-curve.svg" alt="Hemodynamic response function showing the characteristic BOLD signal shape over time" />

A typical HRF has these phases:
- Initial dip (first ~2 seconds): a small, brief signal decrease, attributed to oxygen being used before blood flow increases. Its mechanism is debated, and it isn't always observed (Hu & Yacoub, 2012).
- Rise to peak: blood flow overshoots demand, and the signal peaks around 5-6 seconds after a brief neural event (Glover, 2011). For a 500 ms visual stimulus, Huettel & McCarthy (2000) saw the rise at 3 s and the peak at 5 s.
- Return to baseline: in the same data, the response was back to baseline by about 10 s.
- Post-stimulus undershoot: the signal dips slightly below baseline before it settles. In SPM's canonical HRF, which the plot above uses, the undershoot is deepest at about 15 s and the model runs to 32 s ([SPM12 `spm_hrf`](https://github.com/spm/spm12/blob/main/spm_hrf.m)).

So if you show someone two images 500 ms apart, their BOLD responses overlap almost completely. This doesn't mean you have to wait 30 seconds between stimuli, though. To a first approximation, overlapping responses add up linearly (Boynton et al., 1996; Dale & Buckner, 1997), which is what allows the analysis to separate them later in rapid event-related designs, especially if you jitter the timing between trials (Dale, 1999). At fast presentation rates this linearity breaks down: the response to a second stimulus 1 s after the first was only 55% as large as a single response (Huettel & McCarthy, 2000), and Glover (1999) found linear deconvolution worked when stimuli were at least 4 s apart. We'll get into this properly in [Part 4](/blog/fmri-crash-course-4-recording-experiments).

## Pros and cons of fMRI

### The good stuff

It's non-invasive. Unlike PET, it doesn't need an injected radioisotope or any other agent (Glover, 2011), so you can scan the same person many times. That makes longitudinal studies and large, densely sampled datasets possible.

The spatial resolution is good. Glover (2011) gives 3-4 mm as the typical voxel size, and modern 3T studies often go smaller (THINGS-fMRI used 2 mm; Hebart et al., 2023), which is enough to map visual field maps, category-selective regions, and fine-grained activity patterns within a region. At 7T and above, sub-millimeter voxels become possible (Dumoulin et al., 2018), and specialized studies can even look at differences between cortical layers (Huber et al., 2017).

You get whole-brain coverage. Unlike electrophysiology, where you sample from a few locations, fMRI records from (more or less) the whole brain in every volume (Glover, 2011).

It's widely available, since it can run on a clinical 1.5T scanner, and a PubMed search already turned up 100,000 to 250,000 fMRI entries by 2011 (Glover, 2011), so the analysis software is mature and there's a large community to learn from.

### The not-so-good stuff

The temporal resolution is poor. The BOLD response peaks 5-6 seconds after a brief neural event and is about 3 seconds wide (Glover, 2011), so even with fast acquisition (a TR of 1 second or less) you're measuring a slow, smoothed version of neural dynamics.

It's an indirect measure. You're measuring changes in blood oxygenation, not neural firing, and as the discordant voxel results show, the relationship between the two can vary across brain regions (Epp et al., 2025).

It's expensive. University research centers charge several hundred dollars per scanner hour, for example $597 per hour for internal users at UC San Diego ([CFMRI policies](https://ucsd-center-for-functional-mri-cfmri-web-rtd.readthedocs-hosted.com/en/latest/_downloads/ee06c57f9d30db8e0bb80c8cc0ef95d6/3TPolicies_Rev_20251001.pdf)) and $675 per hour at the University of Iowa ([MRRF guidelines](https://mri.medicine.uiowa.edu/node/46)).

It's sensitive to motion. Movement-related signal changes remain even after the images are realigned (Friston et al., 1996), and if participants move in step with the task, the motion alone can produce patterns that look like activation (Hajnal et al., 1994).

It's loud, because of the switched gradient fields (Glover, 2011): a survey of 14 scanners measured 82-118 dB(A) for fast sequences (Price et al., 2001). The bore is also narrow, and about 2% of patients in a large clinical cohort had a claustrophobic reaction on a conventional scanner (Dewey et al., 2007).

### Field strength

A rough comparison of the field strengths you'll come across (SNR is the signal-to-noise ratio; voxel sizes based on Glover, 2011, Hebart et al., 2023, and Dumoulin et al., 2018):

| Field Strength | Typical voxel size | SNR | Availability | Mostly used for |
|----------------|-------------------|-----|--------------|----------|
| 1.5T | ~3-4 mm | Lower | Common in hospitals | Clinical scanning |
| 3T | ~2-3 mm | Good | Most research centers | Standard cognitive fMRI |
| 7T | <1 mm possible | Highest | Specialized centers | High-resolution mapping, layer studies |

Higher field strength gives you a higher SNR (Fera et al., 2004, measured a 100-110% increase from 1.5T to 3T), and the BOLD contrast itself grows with field strength too (Trattnig et al., 2018). You can spend that on smaller voxels or faster scanning. It also brings stronger susceptibility artifacts and signal loss in regions with large field inhomogeneities, such as near air-tissue boundaries (Trattnig et al., 2018). Of the large vision datasets from Part 2, THINGS-fMRI was recorded at 3T (Hebart et al., 2023) and NSD at 7T (Allen et al., 2022). [Part 4](/blog/fmri-crash-course-4-recording-experiments) goes into the trade-offs in more detail.

## What does fMRI data actually look like?

### 4D volumes and voxels

An fMRI dataset is a 4D volume: three spatial dimensions (x, y, z) plus time. At each time point you have a 3D image of the brain divided into small cubes called voxels (volumetric pixels), typically 2-4 mm on each side.

A typical scan might be 64 x 64 x 40 voxels, with a new volume acquired every 2 seconds (the repetition time, TR) for 10 minutes. That gives you 300 time points, i.e. 300 complete 3D brain images.

<img src="/blog/fmri-diagrams/4d-volume.svg" alt="A stack of brain volumes acquired over time, with one voxel highlighted and its signal plotted as a time series" />

*Each 3D volume contains ~160,000 voxels. A 10-minute scan with TR=2s yields 300 volumes, which together form a 4D dataset.*

### Time series

For each voxel you have a time series of signal intensities across the scan, and the analysis looks for voxels whose time series relate to your experimental conditions.

The raw values are in arbitrary units, so what matters is the relative change, which is why people often convert to percent signal change. The changes are small: Kwong et al. (1992) measured about 1.8% in V1 for flashing lights, and for higher cognitive processes the effect is often below 1% (Glover, 2011).

### Loading fMRI data in Python

The standard library for reading neuroimaging files in Python is nibabel, which reads NIfTI and most other common formats into NumPy arrays ([NiBabel documentation](https://nipy.org/nibabel/)). Here's how you'd load and inspect an fMRI run:

```python
import nibabel as nib
import numpy as np

# Load an fMRI NIfTI file
img = nib.load('sub-01_task-visual_bold.nii.gz')

# Get the data as a numpy array
data = img.get_fdata()

# Check the shape: (x, y, z, time)
print(f"Data shape: {data.shape}")
# Output: Data shape: (64, 64, 40, 300)

# Get the voxel size from the header
voxel_size = img.header.get_zooms()
print(f"Voxel size (mm): {voxel_size[:3]}")
# The 4th zoom is only the TR if the header's time units are set correctly
# (check img.header.get_xyzt_units()). For BIDS data, the RepetitionTime
# field in the JSON sidecar (sub-01_task-visual_bold.json) is the reliable source.
print(f"TR (seconds, from header): {voxel_size[3]}")

# Extract the time series from a single voxel
voxel_timeseries = data[32, 32, 20, :]
print(f"Time series length: {len(voxel_timeseries)}")

# Compute mean signal across time for a single volume
mean_volume = np.mean(data, axis=3)
print(f"Mean volume shape: {mean_volume.shape}")
```

Everything that follows in this series (preprocessing, modeling, statistics) comes down to manipulating 4D arrays like this one. The large datasets from [Part 2](/blog/fmri-crash-course-2-neuroimaging-vision), NSD, THINGS-data and LAION-fMRI, come in exactly this form.

---

## Summary

- MRI uses a strong magnetic field and RF pulses to measure signal from hydrogen protons, and differences in relaxation (T1, T2, T2*) between tissues create image contrast.
- fMRI measures the BOLD signal with T2*-weighted EPI. Deoxyhemoglobin shortens T2*, so when blood flow brings in extra oxygenated blood, the signal goes up.
- BOLD is an indirect measure of neural activity, and its coupling to metabolism isn't the same everywhere in the brain.
- The hemodynamic response peaks 5-6 seconds after neural activity, but overlapping responses add up roughly linearly, so rapid designs still work.
- fMRI data is a 4D array: 3D brain volumes sampled every 0.5-2 seconds, typically at 2-4 mm resolution.

---

Now that we know what fMRI measures, the next post covers how to actually record fMRI data and design experiments that work well with it.

**Next:** [Part 4: Recording fMRI data and designing experiments](/blog/fmri-crash-course-4-recording-experiments)

**Previous:** [Part 2: Using neuroimaging for understanding the visual system](/blog/fmri-crash-course-2-neuroimaging-vision)

---

## References

### MRI physics

- Ridgway JP. [Cardiovascular magnetic resonance physics for clinicians: part I](https://doi.org/10.1186/1532-429X-12-71). Journal of Cardiovascular Magnetic Resonance 2010;12:71.
- Wansapura JP, Holland SK, Dunn RS, Ball WS Jr. [NMR relaxation times in the human brain at 3.0 tesla](https://pubmed.ncbi.nlm.nih.gov/10232510/). Journal of Magnetic Resonance Imaging 1999;9(4):531-538.
- Rooney WD, Johnson G, Li X, Cohen ER, Kim SG, Ugurbil K, Springer CS Jr. [Magnetic field and tissue dependencies of human brain longitudinal 1H2O relaxation in vivo](https://doi.org/10.1002/mrm.21122). Magnetic Resonance in Medicine 2007;57(2):308-318.
- fMRIPrep developers. [Processing pipeline details](https://fmriprep.org/en/stable/workflows.html). fMRIPrep documentation.

### BOLD signal and echo time

- Ogawa S, Lee TM, Kay AR, Tank DW. [Brain magnetic resonance imaging with contrast dependent on blood oxygenation](https://doi.org/10.1073/pnas.87.24.9868). PNAS 1990;87(24):9868-9872.
- Kwong KK, Belliveau JW, Chesler DA, et al. [Dynamic magnetic resonance imaging of human brain activity during primary sensory stimulation](https://doi.org/10.1073/pnas.89.12.5675). PNAS 1992;89(12):5675-5679.
- Fox PT, Raichle ME. [Focal physiological uncoupling of cerebral blood flow and oxidative metabolism during somatosensory stimulation in human subjects](https://doi.org/10.1073/pnas.83.4.1140). PNAS 1986;83(4):1140-1144.
- Glover GH. [Overview of functional magnetic resonance imaging](https://pmc.ncbi.nlm.nih.gov/articles/PMC3073717/). Neurosurgery Clinics of North America 2011;22(2):133-139.
- Feinberg DA, Moeller S, Smith SM, et al. [Multiplexed echo planar imaging for sub-second whole brain FMRI and fast diffusion imaging](https://doi.org/10.1371/journal.pone.0015710). PLoS One 2010;5(12):e15710.
- Poser BA, Versluis MJ, Hoogduin JM, Norris DG. [BOLD contrast sensitivity enhancement and artifact reduction with multiecho EPI: parallel-acquired inhomogeneity-desensitized fMRI](https://doi.org/10.1002/mrm.20900). Magnetic Resonance in Medicine 2006;55(6):1227-1235.
- Gorno-Tempini ML, Hutton C, Josephs O, Deichmann R, Price C, Turner R. [Echo time dependence of BOLD contrast and susceptibility artifacts](https://doi.org/10.1006/nimg.2001.0967). NeuroImage 2002;15(1):136-142.
- Fera F, Yongbi MN, van Gelderen P, Frank JA, Mattay VS, Duyn JH. [EPI-BOLD fMRI of human motor cortex at 1.5 T and 3.0 T: sensitivity dependence on echo time and acquisition bandwidth](https://doi.org/10.1002/jmri.10440). Journal of Magnetic Resonance Imaging 2004;19(1):19-26.
- Epp SM, Castrillón G, Yuan B, Andrews-Hanna J, Preibisch C, Riedl V. [BOLD signal changes can oppose oxygen metabolism across the human cortex](https://doi.org/10.1038/s41593-025-02132-9). Nature Neuroscience 2026;29(5):1225-1236 (published online December 2025).

### Hemodynamic response and linearity

- Hu X, Yacoub E. [The story of the initial dip in fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3389272/). NeuroImage 2012;62(2):1103-1108.
- Huettel SA, McCarthy G. [Evidence for a refractory period in the hemodynamic response to visual stimuli as measured by MRI](https://doi.org/10.1006/nimg.2000.0553). NeuroImage 2000;11(5):547-553.
- Boynton GM, Engel SA, Glover GH, Heeger DJ. [Linear systems analysis of functional magnetic resonance imaging in human V1](https://doi.org/10.1523/JNEUROSCI.16-13-04207.1996). Journal of Neuroscience 1996;16(13):4207-4221.
- Dale AM, Buckner RL. [Selective averaging of rapidly presented individual trials using fMRI](https://pubmed.ncbi.nlm.nih.gov/20408237/). Human Brain Mapping 1997;5(5):329-340.
- Dale AM. [Optimal experimental design for event-related fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC6873302/). Human Brain Mapping 1999;8(2-3):109-114.
- Glover GH. [Deconvolution of impulse response in event-related BOLD fMRI](https://doi.org/10.1006/nimg.1998.0419). NeuroImage 1999;9(4):416-429.
- SPM12. [`spm_hrf.m`: haemodynamic response function](https://github.com/spm/spm12/blob/main/spm_hrf.m). Wellcome Centre for Human Neuroimaging.

### Resolution, field strength and practicalities

- Hebart MN, Contier O, Teichmann L, et al. [THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior](https://doi.org/10.7554/eLife.82580). eLife 2023;12:e82580.
- Allen EJ, St-Yves G, Wu Y, et al. [A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence](https://doi.org/10.1038/s41593-021-00962-x). Nature Neuroscience 2022;25(1):116-126.
- Dumoulin SO, Fracasso A, van der Zwaag W, Siero JCW, Petridou N. [Ultra-high field MRI: Advancing systems neuroscience towards mesoscopic human brain function](https://doi.org/10.1016/j.neuroimage.2017.01.028). NeuroImage 2018;168:345-357.
- Huber L, Handwerker DA, Jangraw DC, et al. [High-resolution CBV-fMRI allows mapping of laminar activity and connectivity of cortical input and output in human M1](https://pmc.ncbi.nlm.nih.gov/articles/PMC5739950/). Neuron 2017;96(6):1253-1263.
- Trattnig S, Springer E, Bogner W, et al. [Key clinical benefits of neuroimaging at 7T](https://pmc.ncbi.nlm.nih.gov/articles/PMC5832016/). NeuroImage 2018;168:477-489.
- Friston KJ, Williams S, Howard R, Frackowiak RS, Turner R. [Movement-related effects in fMRI time-series](https://doi.org/10.1002/mrm.1910350312). Magnetic Resonance in Medicine 1996;35(3):346-355.
- Hajnal JV, Myers R, Oatridge A, Schwieso JE, Young IR, Bydder GM. [Artifacts due to stimulus correlated motion in functional imaging of the brain](https://doi.org/10.1002/mrm.1910310307). Magnetic Resonance in Medicine 1994;31(3):283-291.
- Price DL, De Wilde JP, Papadaki AM, Curran JS, Kitney RI. [Investigation of acoustic noise on 15 MRI scanners from 0.2 T to 3 T](https://pubmed.ncbi.nlm.nih.gov/11169836/). Journal of Magnetic Resonance Imaging 2001;13(2):288-293.
- Dewey M, Schink T, Dewey CF. [Claustrophobia during magnetic resonance imaging: cohort study in over 55,000 patients](https://doi.org/10.1002/jmri.21147). Journal of Magnetic Resonance Imaging 2007;26(5):1322-1327.
- [NiBabel documentation](https://nipy.org/nibabel/). NiPy community.

### Further reading

- Brown RW, Cheng YC, Haacke EM, Thompson MR, Venkatesan R. [Magnetic Resonance Imaging: Physical Principles and Sequence Design](https://www.wiley.com/en-us/Magnetic+Resonance+Imaging:+Physical+Principles+and+Sequence+Design,+2nd+Edition-p-9780471720850) (2nd ed). Wiley, 2014. *The standard technical reference for MRI physics.*

- Huettel SA, Song AW, McCarthy G. [Functional Magnetic Resonance Imaging](https://global.oup.com/academic/product/functional-magnetic-resonance-imaging-9780878936274) (3rd ed). Sinauer Associates/Oxford University Press. *The standard fMRI textbook, and very readable.*

- Poldrack RA, Mumford JA, Nichols TE. [Handbook of Functional MRI Data Analysis](https://www.cambridge.org/core/books/handbook-of-functional-mri-data-analysis/8EDF966C65811FCCC306F7C916228529). Cambridge University Press, 2011. *Practical guide to fMRI analysis methods.*

- [Andy's Brain Book](https://andysbrainbook.readthedocs.io/). *Free online tutorials for learning fMRI analysis with FSL, SPM, and AFNI.*

- Logothetis NK, Pauls J, Augath M, Trinath T, Oeltermann A. [Neurophysiological investigation of the basis of the fMRI signal](https://www.nature.com/articles/35084005). Nature 2001;412(6843):150-157. *Simultaneous electrophysiology and fMRI linking BOLD to neural activity.*
