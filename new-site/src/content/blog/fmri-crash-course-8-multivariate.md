---
title: "Multivariate Analysis of fMRI Data"
description: "Decoding, RSA, encoding models, and connecting to modern deep learning. Part 8 of an 8-part fMRI crash course."
date: 2025-04-28
draft: true
tags: ["fMRI", "neuroscience", "methods", "MVPA", "decoding", "deep learning"]
---

*This is Part 8 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

We've come a long way - from raw data to preprocessed, quality-checked, and GLM-analyzed brain images. Now for the exciting part: using multivariate methods to understand how the brain represents visual information.

This is where modern vision neuroscience really comes alive.

## Beyond univariate: why multivariate?

Traditional GLM analysis asks a simple question: "Does this region respond more to faces than houses?" It's a powerful approach, and we covered it in [Part 7](/blog/fmri-crash-course-7-analysis-glm). But it treats each voxel independently. You get a map of "significant" voxels, and that's it.

The problem? Information in the brain is distributed. A single voxel responding more to faces doesn't tell us much about how face representations are organized, how they differ from other object categories, or what features drive those representations. We're leaving information on the table.

Multivariate methods flip the question. Instead of asking "does this region respond?", we ask "what information is represented in the pattern of activity across voxels?" It's a subtle but profound shift. A region might show similar average activation to faces and houses while still containing patterns that reliably distinguish between them.

Here's an analogy I like: univariate analysis is like measuring the overall loudness of an orchestra. Multivariate analysis is like recognizing the melody. The total volume might be the same for two pieces, but the patterns are completely different.

This matters enormously for vision research. We want to understand not just where processing happens, but what computational transformations occur at each stage. What features are encoded? How do representations change from early visual cortex to object-selective regions? Multivariate methods let us tackle these questions head-on.

## MVPA: Multi-Voxel Pattern Analysis

MVPA is the umbrella term for multivariate approaches to fMRI data. The core idea is simple: treat the activity pattern across many voxels as a single observation, like a point in high-dimensional space. Different experimental conditions become different points. The question becomes: can we reliably separate these points?

### Decoding with classifiers

The most intuitive MVPA approach is decoding. Can we train a classifier to predict what someone is looking at based on their brain activity?

Here's the workflow:
1. Run an experiment where participants view different categories (faces, houses, objects, etc.)
2. Extract the pattern of activity (beta weights from GLM) for each trial
3. Train a classifier to predict category from pattern
4. Test on held-out data
5. If accuracy is above chance, the region contains information about category

The standard classifier choices are Support Vector Machines (SVM) and logistic regression. Both work well. SVMs are more common in older papers; logistic regression is arguably more interpretable. In practice, they usually give similar results.

Cross-validation is critical. You absolutely cannot train and test on the same data - you'll massively overfit. The gold standard is leave-one-run-out cross-validation: train on all runs except one, test on the held-out run, rotate through all runs. This respects the temporal structure of fMRI data and avoids inflated accuracy from autocorrelated noise.

```python
from sklearn.svm import SVC
from sklearn.model_selection import cross_val_score, LeaveOneGroupOut
import numpy as np

# X: (n_trials, n_voxels) array of beta weights
# y: (n_trials,) array of condition labels
# runs: (n_trials,) array indicating which run each trial belongs to

clf = SVC(kernel='linear')
logo = LeaveOneGroupOut()

# Leave-one-run-out cross-validation
accuracies = cross_val_score(clf, X, y, cv=logo, groups=runs)

print(f"Mean accuracy: {accuracies.mean():.2f} (+/- {accuracies.std():.2f})")
print(f"Chance level: {1/len(np.unique(y)):.2f}")
```

### Searchlight analysis

Whole-brain decoding treats the entire brain as one pattern. But what if you want to find where information is represented? Enter searchlight analysis.

The idea, introduced by Kriegeskorte et al. (2006), is elegant: move a small sphere through the brain, running your analysis at each location. This gives you a map of decoding accuracy (or whatever metric you're computing) across the entire brain.

It's computationally expensive - you're fitting thousands of classifiers - but extremely powerful. You get a data-driven answer to "where does the brain represent this distinction?" without having to predefine ROIs.

I built [pysearchlight](https://github.com/andropar/pysearchlight) to make this easier. It handles the sphere-moving overhead, lets you plug in any function, and supports parallel processing. The key inputs are your 4D data, a function to apply within each sphere, and the radius.

```python
from pysearchlight import Searchlight
from sklearn.svm import SVC
from sklearn.model_selection import cross_val_score, LeaveOneGroupOut

def decode_accuracy(data, labels, runs):
    """Compute decoding accuracy within a searchlight sphere."""
    clf = SVC(kernel='linear')
    logo = LeaveOneGroupOut()
    scores = cross_val_score(clf, data, labels, cv=logo, groups=runs)
    return scores.mean()

# Initialize searchlight
sl = Searchlight(radius=3, n_jobs=8)

# Run searchlight across the brain
accuracy_map = sl.run(
    data=beta_maps,  # (x, y, z, n_trials)
    func=decode_accuracy,
    func_args={'labels': conditions, 'runs': run_indices},
    mask=brain_mask
)
```

Nilearn also has a [SearchLight implementation](https://nilearn.github.io/stable/modules/generated/nilearn.decoding.SearchLight.html) that's well-documented and integrates nicely with the rest of their ecosystem.

## Representational Similarity Analysis (RSA)

Decoding tells you whether information is present. RSA, developed by Kriegeskorte et al. (2008), tells you about the structure of representations.

The core concept is the Representational Dissimilarity Matrix (RDM). For each pair of conditions, you compute how dissimilar their neural patterns are (usually 1 minus Pearson correlation). Stack these up, and you get a symmetric matrix showing the geometry of the representational space.

<img src="/blog/fmri-diagrams/rsa-workflow.svg" alt="RSA workflow: from stimuli to voxel patterns to representational dissimilarity matrix" />

*The RDM reveals representational geometry: similar items (apple-banana, car-bus) have low dissimilarity, while dissimilar items (fruits vs. vehicles) have high dissimilarity.*

Why is this powerful? Because you can compare RDMs. Build an RDM from your neural data. Build another RDM from a computational model (e.g., a semantic model, a CNN layer, human similarity judgments). Correlate them. If they match, your model captures something about how that brain region organizes information.

```python
import numpy as np
from scipy.spatial.distance import pdist, squareform
from scipy.stats import spearmanr

def compute_rdm(patterns):
    """Compute RDM from patterns (n_conditions x n_voxels)."""
    # 1 - correlation = dissimilarity
    dissimilarities = pdist(patterns, metric='correlation')
    return squareform(dissimilarities)

def compare_rdms(rdm1, rdm2):
    """Compare two RDMs using Spearman correlation on lower triangle."""
    # Extract lower triangle (excluding diagonal)
    tril_idx = np.tril_indices(rdm1.shape[0], k=-1)
    vec1 = rdm1[tril_idx]
    vec2 = rdm2[tril_idx]
    return spearmanr(vec1, vec2)

# Compute neural RDM
neural_rdm = compute_rdm(roi_betas)  # (n_conditions, n_voxels)

# Compare to model RDM (e.g., from a CNN layer)
model_rdm = compute_rdm(cnn_features)  # (n_conditions, n_features)

rho, pval = compare_rdms(neural_rdm, model_rdm)
print(f"RSA correlation: r={rho:.3f}, p={pval:.4f}")
```

### Noise ceilings

A crucial concept in RSA is the noise ceiling. Your neural data is noisy. Even the perfect model can't achieve r=1 because the data itself isn't perfectly reliable. The noise ceiling gives you an upper bound: given the noise in your data, what's the maximum correlation you could possibly observe?

You estimate it by splitting your data (e.g., odd vs. even runs), computing RDMs for each split, and correlating them. This gives you a sense of how much signal there is to explain. If your model achieves 80% of the noise ceiling, that's excellent. If it achieves 20%, there's a lot your model is missing.

## Cross-validated MANOVA

Decoding with classifiers is intuitive but has quirks. Accuracy depends on the number of categories, the specific classifier, and various hyperparameters. Cross-validated MANOVA (cvMANOVA), developed by Allefeld & Haynes (2014), offers an alternative.

Instead of classification accuracy, cvMANOVA estimates "pattern distinctness" - the multivariate variance explained by your experimental conditions. It uses cross-validation to get an unbiased estimate, and it integrates naturally with the GLM framework we already know.

The original implementation was in MATLAB, but I created a [Python port](https://github.com/andropar/cvmanova_python) to make it more accessible. The package supports searchlight and ROI analyses, handles factorial designs, and exports results to NIfTI for visualization. I validated it against the MATLAB implementation and the results correlate perfectly (Spearman rho = 1.0), though absolute values differ slightly due to preprocessing differences.

When should you use cvMANOVA over classification? It's arguably more principled for statistical inference and doesn't require choosing a classifier. But it's less intuitive to explain, and classification accuracy is what most reviewers expect to see. Both have their place.

## Encoding models

Decoding and RSA ask: given brain activity, what can we infer about the stimulus? Encoding models flip this around: given stimulus features, can we predict brain activity?

This might seem like a subtle distinction, but it's conceptually important. Encoding models let you test specific hypotheses about what features drive neural responses. You're building a model of computation, not just demonstrating that information is present.

The standard approach is voxelwise encoding: for each voxel, fit a regression model predicting its activity from stimulus features. Use cross-validation to evaluate prediction accuracy (typically Pearson correlation between predicted and actual responses). This gives you a map of how well your feature model explains responses across the brain.

Feature spaces can be anything: Gabor wavelets, semantic embeddings, deep neural network activations. The more predictive your features, the better your model captures what the brain is computing.

Modern encoding models often use ridge regression with carefully tuned regularization. With thousands of features (e.g., from a CNN layer), regularization is essential to avoid overfitting. Libraries like [himalaya](https://gallantlab.github.io/himalaya/) are designed specifically for this kind of large-scale voxelwise modeling.

## Connecting to deep learning

Here's where things get exciting. Deep convolutional neural networks (CNNs) trained on object recognition turn out to be surprisingly good models of the ventral visual stream.

The discovery, pioneered by researchers like Yamins and DiCarlo around 2014, was striking: layer-by-layer, CNN representations predict neural activity in corresponding brain regions. Early CNN layers predict V1 better than later layers; late CNN layers predict IT cortex better than early layers. The hierarchy matches.

This launched a cottage industry of comparing DNNs to brains. Which architecture best predicts neural activity? Which layer? Does training on different tasks change the correspondence? Tools like [thingsvision](https://github.com/ViCCo-Group/thingsvision) make this easy: specify a model and layer, extract features for your images, and you're ready for encoding or RSA analyses.

```python
from thingsvision import get_extractor

# Load a pretrained model
extractor = get_extractor(
    model_name='resnet50',
    source='torchvision',
    pretrained=True,
    device='cuda'
)

# Extract features from a specific layer
features = extractor.extract_features(
    batches=image_batches,
    module_name='layer4',
    flatten_acts=True
)
```

The standard approach is linearized encoding: extract DNN features for each image, then fit a linear model predicting voxel responses from those features. The assumption is that voxel responses are a linear readout of the underlying representation. This works remarkably well, though there's ongoing debate about what it really tells us about computation versus just pattern matching.

## Comparing approaches

| Method | Question Answered | Advantages | Limitations |
|--------|------------------|------------|-------------|
| **Decoding** | Is information about X present? | Intuitive, easy to explain | Doesn't reveal structure; accuracy depends on # categories |
| **RSA** | What is the structure of representations? | Model-comparative; geometry-focused | Requires many conditions; correlational |
| **cvMANOVA** | How distinct are patterns? | Principled statistics; no classifier choice | Less intuitive; less common in literature |
| **Encoding** | What features predict activity? | Mechanistic; tests specific models | Assumes linear readout; requires good features |

In practice, these methods are complementary. Decoding establishes that information exists. RSA and encoding characterize what that information looks like. Use all of them.

## Modern datasets enabling this research

The methods I've described are only as good as the data. Fortunately, we're in a golden age of large-scale, publicly available fMRI datasets.

### Natural Scenes Dataset (NSD)

The [Natural Scenes Dataset](https://naturalscenesdataset.org/) is a landmark. Eight subjects viewed 9,000-10,000 distinct natural images from COCO, each image presented 3 times. That's 30-40 scanning sessions per subject, collected at 7T with 1.8mm resolution. The scale is unprecedented.

Why does this matter? With thousands of images and multiple repetitions, you can train serious encoding models. You can test fine-grained hypotheses about representation. You can characterize individual differences. NSD has become the de facto benchmark for brain encoding research.

### THINGS-data

[THINGS-data](https://things-initiative.org/) takes a different approach. Rather than naturalistic complexity, it focuses on object concepts - 1,854 of them, carefully sampled to represent the English lexicon. The dataset includes fMRI, MEG, and millions of behavioral similarity judgments.

It's ideal for RSA. With careful condition sampling and rich behavioral data, you can directly compare neural representations to human perception and computational models. The combination of modalities (fMRI for where, MEG for when) enables spatiotemporal investigations that neither alone could support.

Both datasets are freely available. If you're serious about vision neuroscience, you should be working with them.

## Where the field is heading

A few trends I see shaping the next decade:

**Foundation models for the brain.** We're moving beyond comparing single DNN layers to brain regions. Newer work trains models specifically to predict brain activity across multiple subjects and datasets. These "brain foundation models" may enable better encoding, better alignment across individuals, and even brain-to-brain comparisons.

**Naturalistic paradigms.** Static images are giving way to movies and dynamic naturalistic stimuli. This requires new methods - temporal encoding models, inter-subject correlation, narrative-level representations - but captures cognition in a more ecologically valid setting.

**Individual differences.** Most studies average across subjects. But individual brains differ substantially. Understanding these differences - in architecture, in representation, in how they map to behavior - is becoming a focus.

**Interpretability and causality.** Predictive accuracy isn't explanation. We want to know why certain features predict activity, not just that they do. Causal perturbation methods (TMS, targeted lesions in silico) are increasingly used alongside correlational encoding analyses.

---

## Key Takeaways

1. **Multivariate methods reveal what's represented, not just where.** They treat patterns across voxels as the unit of analysis, capturing distributed information that univariate methods miss.

2. **Decoding, RSA, and encoding are complementary.** Decoding establishes information is present. RSA reveals representational geometry. Encoding tests mechanistic hypotheses about features.

3. **Cross-validation is non-negotiable.** Leave-one-run-out respects fMRI's temporal structure and prevents inflated results.

4. **DNNs are useful models of vision.** Comparing CNN layers to brain regions has become standard practice, enabled by tools like thingsvision.

5. **Modern datasets are a gift.** NSD and THINGS provide the scale needed for serious encoding work. Use them.

---

## Further Resources

**Books and tutorials:**
- Kriegeskorte & Kievit (2013) "Representational geometry" - the conceptual foundation for RSA
- [Nilearn's searchlight tutorial](https://nilearn.github.io/stable/decoding/searchlight.html) - practical implementation
- [Neuroimaging Analysis Replication and Prediction Study](https://www.narps.info/) - understanding variability in analysis choices

**Tools:**
- [pysearchlight](https://github.com/andropar/pysearchlight) - flexible searchlight analysis
- [cvmanova_python](https://github.com/andropar/cvmanova_python) - cross-validated MANOVA in Python
- [thingsvision](https://github.com/ViCCo-Group/thingsvision) - extracting DNN features
- [rsatoolbox](https://github.com/rsagroup/rsatoolbox) - comprehensive RSA toolkit
- [himalaya](https://gallantlab.github.io/himalaya/) - voxelwise encoding models

**Datasets:**
- [Natural Scenes Dataset](https://naturalscenesdataset.org/)
- [THINGS-data](https://things-initiative.org/)
- [BOLD5000](https://bold5000.github.io/) - another large-scale image viewing dataset

**Key papers:**
- Haxby et al. (2001) - distributed representations in ventral cortex
- Kriegeskorte et al. (2006) - searchlight analysis
- Kriegeskorte et al. (2008) - RSA framework
- Yamins & DiCarlo (2016) - DNNs and the ventral stream
- Allefeld & Haynes (2014) - cross-validated MANOVA

---

**Congratulations** - you've made it through the entire crash course! You now have a solid foundation for working with fMRI data: understanding what fMRI measures, designing experiments that work with its constraints, preprocessing data properly, checking quality, running GLM analyses, and using multivariate methods to probe neural representations.

From here, the possibilities are vast. Pick a dataset, pick a question, and dive in. The tools are accessible, the community is active, and there's never been a better time to study how the brain represents the visual world.

Good luck.

---

**Previous:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Back to:** [Part 1: Introduction](/blog/fmri-crash-course-1-introduction)
