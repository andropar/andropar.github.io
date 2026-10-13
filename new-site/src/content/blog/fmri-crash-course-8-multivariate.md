---
title: "Multivariate Analysis of fMRI Data"
description: "Decoding, RSA, encoding models, and connecting to modern deep learning. Part 8 of an 8-part fMRI crash course."
date: 2025-04-28
draft: true
tags: ["fMRI", "neuroscience", "methods", "MVPA", "decoding", "deep learning"]
---

*This is Part 8 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

We've gone from raw data to preprocessed, quality-checked and GLM-analyzed brain images. In this last part we'll look at multivariate methods, which is where most of my own work happens and where a lot of current vision neuroscience is done: asking how the brain represents visual information, not just where it responds.

## Why multivariate?

The GLM analysis from [Part 7](/blog/fmri-crash-course-7-analysis-glm) asks questions like "does this region respond more to faces than houses?" That's useful, but it treats each voxel independently. You end up with a map of significant voxels and not much else.

Information in the brain is distributed, though. One voxel responding more to faces doesn't tell you how face representations are organized, how they relate to other object categories, or which features drive them. Multivariate methods change the question from "does this region respond?" to "what information is carried by the pattern of activity across voxels?" A region can have the same average response to faces and houses and still show patterns that reliably tell them apart.

The analogy I like: univariate analysis measures how loud the orchestra is, multivariate analysis tries to recognize the melody. Two pieces can be equally loud and still sound completely different.

<img src="/blog/fmri-diagrams/univariate-vs-multivariate.svg" alt="Comparison of univariate vs multivariate analysis - univariate shows same mean activation for two conditions, while multivariate reveals distinct patterns across voxels" />

*Two conditions can have identical mean activation (left) while showing different patterns across voxels (right). A univariate analysis can't see this difference.*

For vision research this is what we usually care about. We don't just want to know where processing happens, but what transformations happen along the way: which features are encoded, and how representations change from early visual cortex to object-selective regions.

## MVPA: Multi-Voxel Pattern Analysis

MVPA is the umbrella term for multivariate approaches to fMRI. The basic idea is to treat the activity pattern across many voxels as one observation, a point in a high-dimensional space. Different conditions are different points, and the question becomes whether we can reliably tell them apart.

### Decoding with classifiers

The most intuitive approach is decoding: can a classifier predict what someone was looking at from their brain activity? The workflow:

1. Run an experiment where participants view different categories (faces, houses, objects, ...)
2. Extract an activity pattern (GLM beta weights) for each trial
3. Train a classifier to predict the category from the pattern
4. Test it on held-out data
5. If accuracy is above chance, the region contains information about category

Linear SVMs and logistic regression are the usual choices. SVMs are more common in older papers, and in practice the two give similar results.

You can't train and test on the same data, and you also can't split trials randomly, because trials from the same run share autocorrelated noise and that inflates accuracy. The standard is leave-one-run-out cross-validation: train on all runs but one, test on the held-out run, and rotate through all runs.

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

Decoding from one big set of voxels tells you that information is there, but not where. Searchlight analysis, introduced by Kriegeskorte et al. (2006), handles this by moving a small sphere through the brain and running your analysis at every location. The result is a whole-brain map of decoding accuracy (or whatever you compute in the sphere), without having to define ROIs in advance. The downside is compute: you're fitting thousands of classifiers.

I wrote [pysearchlight](https://github.com/andropar/pysearchlight) to take care of the sphere bookkeeping and parallelization. You give it your 4D data, a binary mask, a radius in voxels, and a function that gets called on the data inside each sphere. Extra arguments (labels, run indices) get bound with `functools.partial`.

```python
from functools import partial

from pysearchlight import SearchLight
from sklearn.svm import SVC
from sklearn.model_selection import cross_val_score, LeaveOneGroupOut


def decode_accuracy(sphere_data, labels, runs):
    """Leave-one-run-out decoding accuracy within one searchlight sphere.

    Assumes sphere_data is (n_trials, n_voxels_in_sphere) - check the
    pysearchlight README for the exact shape passed to sl_fn.
    """
    clf = SVC(kernel='linear')
    scores = cross_val_score(clf, sphere_data, labels, cv=LeaveOneGroupOut(), groups=runs)
    return scores.mean()


sl_fn = partial(decode_accuracy, labels=conditions, runs=run_indices)

sl = SearchLight(
    data=beta_maps,   # 4D: (x, y, z, n_trials)
    sl_fn=sl_fn,      # takes a single argument: the data in the sphere
    radius=2,         # in voxels
    mask=brain_mask,  # binary 3D mask
)
accuracy_map = sl.fit(n_jobs=8, n_chunks=10, verbose=1)  # 3D array
```

Nilearn also has a [SearchLight implementation](https://nilearn.github.io/stable/modules/generated/nilearn.decoding.SearchLight.html) that's well documented and fits into the rest of its ecosystem.

## Representational Similarity Analysis (RSA)

Decoding tells you whether information is present. RSA (Kriegeskorte et al., 2008) tells you something about how it's structured.

The central object is the representational dissimilarity matrix (RDM). For every pair of conditions you compute how different their activity patterns are, most often as 1 minus the Pearson correlation. Put all pairs together and you get a symmetric matrix that describes the geometry of the representation.

<img src="/blog/fmri-diagrams/rdm-matrix.svg" alt="Representational dissimilarity matrix showing category structure - similar items (fruits, vehicles, animals) cluster together" />

*Illustrative (simulated) RDM. Dark squares along the diagonal show within-category similarity (fruits, vehicles, animals), lighter off-diagonal blocks show between-category dissimilarity. That apples are more similar to bananas than to cars is the kind of structure RSA captures.*

You can also project this geometry into 2D with multidimensional scaling (MDS) to look at it:

<img src="/blog/fmri-diagrams/mds-representational-space.svg" alt="MDS plot showing category clusters in representational space - fruits, vehicles, animals, tools, and faces form distinct clusters" />

*Illustrative (simulated) MDS plot of a representational space. Items from the same category cluster together and different categories occupy different regions.*

What makes RSA useful is that RDMs can be compared across very different sources. Compute an RDM from your neural data, compute another from a model (a semantic embedding, a CNN layer, human similarity judgments), and correlate the two. Because you only compare dissimilarity structures, you never need a mapping between voxels and model units. The usual comparison is a Spearman correlation over the lower triangle.

```python
import numpy as np
from scipy.spatial.distance import pdist, squareform


def compute_rdm(patterns):
    """RDM (1 - Pearson r) from patterns of shape (n_conditions, n_features)."""
    return squareform(pdist(patterns, metric='correlation'))


neural_rdm = compute_rdm(roi_betas)     # (n_conditions, n_voxels)
model_rdm = compute_rdm(cnn_features)   # (n_conditions, n_features)
```

### Testing RDM correlations

A tempting shortcut is to take the p-value from `scipy.stats.spearmanr` on the two lower triangles. Don't. That p-value assumes the n(n-1)/2 dissimilarities are independent observations, but every condition shows up in n-1 of them, so they clearly aren't, and the p-value comes out too small. The standard fix (used in Nili et al., 2014) is a permutation test over condition labels: shuffle the order of conditions in one RDM, permuting rows and columns together, and recompute the correlation each time to build a null distribution.

```python
import numpy as np
from scipy.stats import rankdata


def rsa_permutation_test(neural_rdm, model_rdm, n_perm=10000, seed=0):
    """Spearman correlation between two RDMs, with a condition-label permutation test.

    Returns the observed correlation and a one-sided p-value.
    """
    n = neural_rdm.shape[0]
    tril = np.tril_indices(n, k=-1)

    # Spearman = Pearson on ranks. Permuting the conditions only reorders the
    # model dissimilarities, so we can rank once and permute the rank matrix.
    a = rankdata(neural_rdm[tril])
    a = (a - a.mean()) / a.std()
    ranks = np.zeros((n, n))
    ranks[tril] = rankdata(model_rdm[tril])
    ranks = ranks + ranks.T
    b = ranks[tril]
    mu, sd = b.mean(), b.std()

    def corr(rank_mat):
        return np.mean(a * (rank_mat[tril] - mu) / sd)

    observed = corr(ranks)
    rng = np.random.default_rng(seed)
    null = np.empty(n_perm)
    for i in range(n_perm):
        p = rng.permutation(n)
        null[i] = corr(ranks[np.ix_(p, p)])

    p_value = (np.sum(null >= observed) + 1) / (n_perm + 1)
    return observed, p_value


rho, p = rsa_permutation_test(neural_rdm, model_rdm)
```

This tests one subject's RDM. For group-level inference you'd usually compute the correlation per subject and test across subjects (e.g. a Wilcoxon signed-rank test), or bootstrap over subjects and conditions. In practice I'd let [rsatoolbox](https://github.com/rsagroup/rsatoolbox) handle this, since it implements these inference methods and the noise ceiling below.

One more thing worth knowing about: correlation distance between noisy patterns is biased, because noise alone makes two patterns look dissimilar. Cross-validated distances avoid this. The most common one is the crossnobis distance, a Mahalanobis distance that is noise-normalized using the GLM residuals and computed across independent runs, so its expected value is zero when two conditions don't differ (Walther et al., 2016). rsatoolbox supports it via `calc_rdm(..., method='crossnobis')`.

### Noise ceilings

Your data is noisy, so even the true model wouldn't correlate perfectly with your neural RDM. The noise ceiling estimates how well the best possible model could do given that noise. The standard version from Nili et al. (2014) works across subjects. The upper bound is the average correlation of each subject's RDM with the group-average RDM (including that subject, which makes it slightly optimistic). The lower bound is the same, but with each subject's RDM compared to the average of all *other* subjects (leave-one-subject-out). A model that reaches the lower bound explains about as much as the data can tell you.

If you only have one subject, you can split the data (e.g. odd vs. even runs), compute an RDM for each half and correlate them. That correlation is the reliability of half the data, though, so it underestimates the reliability of the full dataset. Correct it with the Spearman-Brown formula, r_full = 2r / (1 + r), before using it as a ceiling.

Either way, the point is to report model performance relative to the ceiling. A correlation of 0.3 means something very different when the ceiling is 0.35 than when it's 0.8.

## Cross-validated MANOVA

Classifier accuracy has some quirks: it depends on the number of categories, the classifier you pick, and its hyperparameters. Cross-validated MANOVA (cvMANOVA; Allefeld & Haynes, 2014) is an alternative. It estimates "pattern distinctness", the multivariate variance explained by your experimental conditions, uses cross-validation to make that estimate unbiased, and sits directly on top of the GLM.

The original implementation is in MATLAB. I wrote a [Python port](https://github.com/andropar/cvmanova_python) that supports searchlight and ROI analyses, handles factorial designs, and writes results to NIfTI. In my validation tests it reproduces the results of the MATLAB implementation (rank-identical, with small absolute differences from implementation details).

Should you use cvMANOVA instead of classification? It's arguably the more principled choice for statistical inference and you don't have to pick a classifier. It's also harder to explain, and classification accuracy is what most reviewers expect. Both have their place.

## Encoding models

Decoding and RSA go from brain activity to the stimulus. Encoding models go the other way: given features of the stimulus, can we predict the brain's response? The advantage is that you're forced to state a specific hypothesis about which features drive the response, rather than only showing that some information is present.

The standard setup is voxelwise encoding: for every voxel, fit a regression from stimulus features to that voxel's response, and evaluate on held-out stimuli, typically with the Pearson correlation between predicted and measured responses. That gives you a map of how well your feature space explains each part of the brain. The features can be anything: Gabor wavelets, semantic embeddings, DNN activations.

With thousands of features (a single CNN layer can easily have tens of thousands), you need regularization, and ridge regression with a cross-validated penalty per voxel is the default. Here's a minimal version with scikit-learn. `X` holds DNN features for each image and `Y` the single-trial betas (from Part 7), averaged over repetitions of the same image, so each image appears exactly once. The train/test split is over images, so no test image is ever seen during training.

```python
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler

# X: (n_images, n_features) DNN features
# Y: (n_images, n_voxels) betas, averaged over repetitions of each image
n_images = X.shape[0]
rng = np.random.default_rng(0)
test = rng.choice(n_images, size=n_images // 5, replace=False)
train = np.setdiff1d(np.arange(n_images), test)

scaler = StandardScaler().fit(X[train])
X_train, X_test = scaler.transform(X[train]), scaler.transform(X[test])

# Efficient leave-one-out CV over alphas, with a separate alpha per voxel
model = RidgeCV(alphas=np.logspace(-1, 6, 15), alpha_per_target=True)
model.fit(X_train, Y[train])
Y_pred = model.predict(X_test)


def columnwise_pearson(a, b):
    """Pearson r between matching columns of two (n_samples, n_targets) arrays."""
    a = (a - a.mean(0)) / a.std(0)
    b = (b - b.mean(0)) / b.std(0)
    return (a * b).mean(0)


r = columnwise_pearson(Y_pred, Y[test])  # (n_voxels,) prediction accuracy
```

For whole-brain data with many voxels and features, [himalaya](https://gallantlab.github.io/himalaya/) does the same thing much faster (including on GPU) and also supports fitting several feature spaces jointly.

As with RSA, raw prediction accuracy is hard to interpret without knowing how reliable each voxel is. NSD (Allen et al., 2022) provides a noise ceiling SNR (`ncsnr`) per voxel, estimated from the variability across image repetitions. From it you get the noise ceiling as a percentage of explainable variance, NC = 100 · ncsnr² / (ncsnr² + 1/n), where n is the number of trials averaged per image. You can then compare your model's variance explained on the test set against NC. Voxels with a low ceiling are mostly noise, and low prediction accuracy there doesn't say much about your model. (See also [Part 6](/blog/fmri-crash-course-6-quality-assessment).)

### ROIs and the cortical surface

In vision studies you rarely run these analyses on "the whole brain" in the abstract. Most of the time you work within ROIs: early visual areas (V1, V2, V3, hV4) delineated from retinotopic mapping or a retinotopy atlas (Benson & Winawer, 2018), and category-selective regions from functional localizers, like FFA for faces (Kanwisher et al., 1997), PPA for scenes (Epstein & Kanwisher, 1998) and LOC for objects (Malach et al., 1995). The scans for this are covered in [Part 4](/blog/fmri-crash-course-4-recording-experiments), and defining ROIs from localizers in [Part 7](/blog/fmri-crash-course-7-analysis-glm). Then you compare decoding accuracy, RDMs or encoding performance across areas, which is how you get at questions about the hierarchy.

The other common choice is to work on the cortical surface instead of in the volume. Visual areas are laid out on a folded sheet, and two voxels that are close in 3D can sit on opposite banks of a sulcus. Surface-based ROIs and analyses follow the sheet, which is why retinotopic maps are almost always shown on (inflated or flattened) surfaces. fMRIPrep can output surface data for you, and NSD ships data in surface space as well.

## Connecting to deep learning

Deep convolutional neural networks (CNNs) trained on object recognition turned out to be surprisingly good models of the ventral visual stream. In 2014, Yamins et al. showed that a CNN optimized for object recognition predicted neural responses in monkey IT cortex, and Khaligh-Razavi & Kriegeskorte showed that representations of deep supervised networks matched human and monkey IT representations in RSA. Güçlü & van Gerven (2015) then showed in fMRI that there's a layer-to-area correspondence: early CNN layers best predict early visual cortex, later layers best predict higher ventral areas, so the model hierarchy roughly mirrors the cortical one.

<img src="/blog/fmri-diagrams/dnn-brain-heatmap.svg" alt="Heatmap showing correlations between CNN layers and brain ROIs - early layers correlate with V1/V2, late layers with IT cortex" />

*Illustrative (simulated) layer-by-region comparison. Each cell would be the correlation between a CNN layer's representations and a brain region's activity patterns. The diagonal structure is the pattern reported in the literature: early layers (conv1-2) match early visual cortex (V1-V2) best, late layers (fc6-8) match higher visual areas (IT) best.*

Since then, a lot of work has compared DNNs to brains: which architecture predicts neural activity best, which layer, and whether the training task or data changes the correspondence. [thingsvision](https://github.com/ViCCo-Group/thingsvision) makes the feature extraction part easy. You pick a model and a layer, extract features for your images, and can go straight into encoding or RSA.

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

The usual approach is the linearized encoding model from above: DNN features in, voxel responses out, with the assumption that voxel responses are a linear readout of the network's representation. This works well in practice, but there's an ongoing debate about how much good prediction tells us about the brain's actual computations.

## Comparing approaches

| Method | Question Answered | Advantages | Limitations |
|--------|------------------|------------|-------------|
| **Decoding** | Is information about X present? | Intuitive, easy to explain | Doesn't reveal structure; accuracy depends on # categories |
| **RSA** | What is the structure of representations? | Model-comparative; geometry-focused | Requires many conditions; correlational |
| **cvMANOVA** | How distinct are patterns? | Principled statistics; no classifier choice | Less intuitive; less common in literature |
| **Encoding** | What features predict activity? | Tests specific feature models | Assumes linear readout; requires good features |

These methods complement each other. Decoding shows that information is there, RSA and encoding models describe what it looks like. Many papers use more than one.

## Datasets

These methods need a lot of data, ideally many stimuli with repeated presentations. Luckily there are now several large, public fMRI datasets for vision.

### Natural Scenes Dataset (NSD)

In the [Natural Scenes Dataset](https://naturalscenesdataset.org/) (Allen et al., 2022), eight participants each viewed 9,000-10,000 distinct natural images from COCO, with each image shown up to 3 times, over 30-40 scanning sessions per participant at 7T and 1.8mm resolution. With that many images and repetitions you can fit encoding models with large feature spaces, test fine-grained hypotheses, and look at individual participants. It has become the standard dataset for encoding model work (it was also the basis of the Algonauts 2023 challenge).

### THINGS-data

[THINGS-data](https://things-initiative.org/) (Hebart et al., 2023) is built around object concepts rather than natural scenes. The THINGS database has 1,854 concepts, sampled to cover concrete, nameable object concepts in American English. The fMRI data (3 participants) covers 720 of these concepts with 8,740 images, the MEG data (4 participants) covers the same 720 concepts, and 4.7 million behavioral odd-one-out similarity judgments cover all 1,854.

The broad concept sampling and the behavioral similarity data make it a good fit for RSA, since you can compare neural representations to human similarity judgments and to models. Having fMRI and MEG for the same concepts also lets you ask spatial and temporal questions about the same stimuli.

Both datasets are freely available, and if your question fits them, they're a much cheaper starting point than collecting your own data.

## Where the field is heading

A few trends that I think will shape the next years:

Models are increasingly trained to predict brain activity directly, across many subjects and datasets, rather than taking an off-the-shelf DNN layer and mapping it to one region. These "brain foundation models" might give better encoding, better alignment across individuals, and new ways to compare brains.

Static images are being complemented by movies and other dynamic, naturalistic stimuli. That needs different methods (temporal encoding models, inter-subject correlation) but gets closer to how vision actually works outside the scanner.

Most studies still average across subjects, but individual brains differ a lot, and understanding how they differ in anatomy, representation and behavior is becoming a research topic of its own.

Finally, good prediction isn't the same as explanation. People increasingly want to know why certain features predict activity, and combine encoding analyses with causal manipulations, both in the brain (e.g. TMS) and in silico (lesioning or perturbing model units).

---

## Summary

- Multivariate methods treat the pattern across voxels as the unit of analysis and pick up distributed information that univariate analysis misses.
- Decoding shows that information is present, RSA describes representational geometry, and encoding models test which features drive responses.
- Cross-validate across runs (or images), test RSA results with condition-label permutations rather than naive p-values, and report performance relative to a noise ceiling.
- In vision you'll usually do all of this within retinotopic and localizer-defined ROIs, or on the cortical surface.
- NSD and THINGS-data, together with tools like thingsvision, make comparing DNNs to visual cortex accessible.

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
- [rsatoolbox](https://github.com/rsagroup/rsatoolbox) - RSA toolkit, including inference and noise ceilings
- [himalaya](https://gallantlab.github.io/himalaya/) - voxelwise encoding models

**Datasets:**
- [Natural Scenes Dataset](https://naturalscenesdataset.org/)
- [THINGS-data](https://things-initiative.org/)
- [BOLD5000](https://bold5000-dataset.github.io/website/) - another large-scale image viewing dataset

**Papers to start with:**
- Haxby et al. (2001) - distributed representations in ventral cortex
- Kriegeskorte et al. (2006) - searchlight analysis
- Kriegeskorte et al. (2008) - RSA framework
- Nili et al. (2014) - RSA toolbox, inference and noise ceilings
- Yamins & DiCarlo (2016) - DNNs and the ventral stream
- Allefeld & Haynes (2014) - cross-validated MANOVA

---

That's the end of the crash course. If you've read all eight parts, you should now have a decent picture of the whole pipeline: what fMRI measures, how to design experiments around its constraints, how to preprocess and quality-check data, how to run GLM analyses, and how to use multivariate methods to look at neural representations.

From here, the best way to learn is to pick a dataset and a question and start working on it. Most of the tools are free and the community is helpful. Good luck!

---

## References

### Foundational MVPA Papers
- Haxby, J. V., Gobbini, M. I., Furey, M. L., Ishai, A., Schouten, J. L., & Pietrini, P. (2001). [Distributed and overlapping representations of faces and objects in ventral temporal cortex](https://www.science.org/doi/10.1126/science.1063736). *Science*, 293(5539), 2425-2430.

### Representational Similarity Analysis (RSA)
- Kriegeskorte, N., Mur, M., & Bandettini, P. (2008). [Representational similarity analysis - connecting the branches of systems neuroscience](https://www.frontiersin.org/journals/systems-neuroscience/articles/10.3389/neuro.06.004.2008/full). *Frontiers in Systems Neuroscience*, 2, 4.
- Nili, H., Wingfield, C., Walther, A., Su, L., Marslen-Wilson, W., & Kriegeskorte, N. (2014). A toolbox for representational similarity analysis. *PLOS Computational Biology*, 10(4), e1003553.
- Walther, A., Nili, H., Ejaz, N., Alink, A., Kriegeskorte, N., & Diedrichsen, J. (2016). Reliability of dissimilarity measures for multi-voxel pattern analysis. *NeuroImage*, 137, 188-200.
- [rsatoolbox documentation](https://rsatoolbox.readthedocs.io/) | [GitHub repository](https://github.com/rsagroup/rsatoolbox)

### Searchlight Analysis and cvMANOVA
- Kriegeskorte, N., Goebel, R., & Bandettini, P. (2006). [Information-based functional brain mapping](https://www.pnas.org/doi/10.1073/pnas.0600244103). *Proceedings of the National Academy of Sciences*, 103(10), 3863-3868.
- Allefeld, C., & Haynes, J.-D. (2014). Searchlight-based multi-voxel pattern analysis of fMRI by cross-validated MANOVA. *NeuroImage*, 89, 345-357.

### Encoding Models
- Kay, K. N., Naselaris, T., Prenger, R. J., & Gallant, J. L. (2008). [Identifying natural images from human brain activity](https://www.nature.com/articles/nature06713). *Nature*, 452, 352-355.
- Naselaris, T., Kay, K. N., Nishimoto, S., & Gallant, J. L. (2011). [Encoding and decoding in fMRI](https://www.sciencedirect.com/science/article/abs/pii/S1053811910010657). *NeuroImage*, 56(2), 400-410.

### Visual ROIs
- Kanwisher, N., McDermott, J., & Chun, M. M. (1997). The fusiform face area: a module in human extrastriate cortex specialized for face perception. *Journal of Neuroscience*, 17(11), 4302-4311.
- Epstein, R., & Kanwisher, N. (1998). A cortical representation of the local visual environment. *Nature*, 392, 598-601.
- Malach, R., Reppas, J. B., Benson, R. R., et al. (1995). Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex. *Proceedings of the National Academy of Sciences*, 92(18), 8135-8139.
- Benson, N. C., & Winawer, J. (2018). Bayesian analysis of retinotopic maps. *eLife*, 7, e40224.

### DNN-Brain Correspondence
- Yamins, D. L. K., Hong, H., Cadieu, C. F., Solomon, E. A., Seibert, D., & DiCarlo, J. J. (2014). Performance-optimized hierarchical models predict neural responses in higher visual cortex. *Proceedings of the National Academy of Sciences*, 111(23), 8619-8624.
- Khaligh-Razavi, S.-M., & Kriegeskorte, N. (2014). [Deep supervised, but not unsupervised, models may explain IT cortical representation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1003915). *PLOS Computational Biology*, 10(11), e1003915.
- Güçlü, U., & van Gerven, M. A. J. (2015). Deep neural networks reveal a gradient in the complexity of neural representations across the ventral stream. *Journal of Neuroscience*, 35(27), 10005-10014.
- Yamins, D. L. K., & DiCarlo, J. J. (2016). [Using goal-driven deep learning models to understand sensory cortex](https://www.nature.com/articles/nn.4244). *Nature Neuroscience*, 19, 356-365.

### Datasets
- Allen, E. J., St-Yves, G., Wu, Y., et al. (2022). A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence. *Nature Neuroscience*, 25, 116-126.
- Hebart, M. N., Contier, O., Teichmann, L., et al. (2023). THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior. *eLife*, 12, e82580.

### Software Documentation
- [Nilearn: Decoding and MVPA](https://nilearn.github.io/stable/decoding/decoding_intro.html) - Introduction to decoding with nilearn
- [Nilearn: Decoder class](https://nilearn.github.io/dev/modules/generated/nilearn.decoding.Decoder.html) - API reference for the Decoder wrapper
- [scikit-learn: Support Vector Machines](https://scikit-learn.org/stable/modules/svm.html) - User guide for SVM classification
- [scikit-learn: SVC](https://scikit-learn.org/stable/modules/generated/sklearn.svm.SVC.html) - API reference for the SVC classifier

---

**Previous:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Back to:** [Part 1: Introduction](/blog/fmri-crash-course-1-introduction)
