---
title: "Multivariate Analysis of fMRI Data"
description: "Decoding, RSA, encoding models, and connecting to modern deep learning. Part 8 of an 8-part fMRI crash course."
date: 2025-04-28
draft: true
tags: ["fMRI", "neuroscience", "methods", "MVPA", "decoding", "deep learning"]
---

*This is Part 8 of an [8-part crash course on fMRI for vision research](/blog/fmri-crash-course-1-introduction).*

We've gone from raw data to preprocessed, quality-checked and GLM-analyzed brain images. In this last part we'll look at multivariate methods, which ask how the brain represents visual information, not just where it responds.

## Why multivariate?

The GLM analysis from [Part 7](/blog/fmri-crash-course-7-analysis-glm) asks questions like "does this region respond more to faces than houses?" That's useful, but it treats each voxel independently. You end up with a map of significant voxels and not much else.

Information in the brain is distributed, though. One voxel responding more to faces doesn't tell you how face representations are organized, how they relate to other object categories, or which features drive them. Multivariate methods change the question from "where does average activity change?" to "where does the pattern of activity carry information about the condition?" (Kriegeskorte et al., 2006). The classic demonstration is Haxby et al. (2001): object categories could still be told apart from ventral temporal response patterns after the regions responding most strongly to each category were excluded.

The analogy I like: univariate analysis measures how loud the orchestra is, multivariate analysis tries to recognize the melody. Two pieces can be equally loud and still sound completely different.

<img src="/blog/fmri-diagrams/univariate-vs-multivariate.svg" alt="Bar chart with equal mean responses for faces and houses, next to two different 5 by 5 voxel activity patterns for the same conditions" />

*Two conditions can have identical mean activation (left) while showing different patterns across voxels (right). A univariate analysis can't see this difference.*

For a lot of vision research this is the more interesting question. We don't just want to know where processing happens, but which features are encoded and how representations change from early visual cortex to object-selective regions.

## MVPA: Multi-Voxel Pattern Analysis

MVPA (multi-voxel pattern analysis) is the common name for these approaches (Norman et al., 2006). The basic idea is to treat the activity pattern across many voxels as one observation, a point in a high-dimensional voxel space. Different conditions are different points, and the question becomes whether we can reliably tell them apart.

### Decoding with classifiers

The most intuitive approach is decoding: can a classifier predict what someone was looking at from their brain activity? The workflow (Norman et al., 2006):

1. Run an experiment where participants view different categories (faces, houses, objects, ...)
2. Extract a labeled activity pattern for each trial or run (e.g. GLM beta estimates)
3. Train a classifier to predict the category from the pattern
4. Test it on held-out data
5. If accuracy is above chance, the region contains information about category

Linear classifiers are the norm (Norman et al., 2006). The SVM is the most common choice and logistic regression is also widely used, and the two perform similarly (Varoquaux et al., 2017). In a comparison of six classifiers, nonlinear ones never beat linear ones and were sometimes worse (Misaki et al., 2010).

You can't train and test on the same data, and you also can't split trials randomly. fMRI signals are autocorrelated, so samples close in time aren't independent, and leaving out single samples gives strongly optimistic accuracy (Varoquaux et al., 2017). The fix is to leave out whole blocks of data, usually runs. The common version is leave-one-run-out cross-validation: train on all runs but one, test on the held-out run, and rotate through all runs. Varoquaux et al. (2017) also suggest repeated random splits that leave out about 20% of the runs, which gives less variable estimates.

<img src="/blog/fmri-diagrams/cross-validation-folds.svg" alt="Grid of six folds by six runs: in each fold one run is held out for testing and the other five are used for training" />

*Leave-one-run-out cross-validation with six runs. Each run is the test set exactly once.*

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

Here's what this looks like with the running example. THINGS-data publishes single-trial responses to its 100 test images for the IT voxels of each participant: 1,200 trials (each image in each of 12 sessions) by 4,145 voxels for participant 1 ([figshare](https://doi.org/10.25452/figshare.plus.23284622.v1); Hebart et al., 2023). Leaving out one session at a time, I asked two questions. Which of the 100 images was shown? For that I correlated each held-out trial with the average pattern of every image in the remaining sessions and picked the best match. And was it an animal or a food item? For that I trained a regularized logistic regression on the 14 animal and 20 food images.

<img src="/blog/fmri-diagrams/things-it-decoding.svg" alt="Two bar charts of decoding accuracy per held-out session: 100-way image identification around 10 percent against 1 percent chance, and animal versus food classification around 81 percent against 50 percent chance" />

*Real decoding results from IT of THINGS-fMRI participant 1, with leave-one-session-out cross-validation (one bar per held-out session).*

Image identification is right about 10% of the time, ten times chance but far from perfect, because a single trial is noisy. Animal vs. food decoding reaches a balanced accuracy of 81% (chance 50%), between 70% and 90% depending on the held-out session.

### Searchlight analysis

Decoding from one big set of voxels tells you that information is there, but not where. Searchlight analysis, introduced by Kriegeskorte et al. (2006), handles this by centering a small sphere on each voxel in turn and running your analysis on the voxels inside it. The result is a whole-brain map of decoding accuracy (or whatever you compute in the sphere), without having to define ROIs in advance. The downside is compute: you fit one classifier (with its full cross-validation) for every voxel in the mask.

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

The central object is the representational dissimilarity matrix (RDM). For every pair of conditions you compute how different their activity patterns are. Kriegeskorte et al. (2008) suggest the correlation distance, 1 minus the Pearson correlation. Put all pairs together and you get a symmetric matrix that describes the geometry of the representation.

<img src="/blog/fmri-diagrams/rdm-matrix.svg" alt="Representational dissimilarity matrix for twelve items in four categories, with low dissimilarity within categories" />

*Illustrative (simulated) RDM. Light blocks along the diagonal mean low dissimilarity within each category, and darker cells mean more dissimilar patterns. Animals and faces are closer to each other than to fruits or vehicles. That apples are more similar to bananas than to cars is the kind of structure RSA captures.*

You can also project this geometry into 2D with multidimensional scaling (MDS) to look at it, as the RSA toolbox does (Nili et al., 2014):

<img src="/blog/fmri-diagrams/mds-representational-space.svg" alt="Two-dimensional MDS plot of the same twelve items, with fruits, vehicles, animals and faces forming separate clusters" />

*Illustrative (simulated) MDS of the RDM above. Items from the same category cluster together, and the two animate categories sit next to each other.*

What makes RSA useful is that RDMs can be compared across very different sources. Compute an RDM from your neural data, compute another from a model (a semantic embedding, a CNN layer, human similarity judgments), and correlate the two. Because you only compare dissimilarity structures, you never need a mapping between voxels and model units (Kriegeskorte et al., 2008). Kriegeskorte et al. (2008) compare RDMs with a Spearman rank correlation, computed here over the lower triangle.

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

A tempting shortcut is to take the p-value from `scipy.stats.spearmanr` on the two lower triangles. Don't. That p-value assumes the n(n-1)/2 dissimilarities are independent observations, but every condition shows up in n-1 of them, so that independence can't be assumed (Kriegeskorte et al., 2008). The fix proposed by Kriegeskorte et al. (2008), and implemented in the RSA toolbox (Nili et al., 2014), is a permutation test over condition labels: shuffle the order of conditions in one RDM, permuting rows and columns together, and recompute the correlation each time to build a null distribution.

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

<img src="/blog/fmri-diagrams/rsa-permutation.svg" alt="Histogram of correlations under 10,000 label permutations centered on zero, with the observed correlation far in the right tail" />

*Simulated. Shuffling condition labels builds the null distribution; the p-value is the fraction of permutations at least as large as the observed correlation.*

This tests one subject's RDM. For group-level inference, Nili et al. (2014) compute the correlation per subject and test across subjects with a signed-rank test (their default with 12 or more subjects), or bootstrap over subjects and/or conditions. The Python [rsatoolbox](https://rsatoolbox.readthedocs.io/en/latest/inference.html) implements bootstrap inference over subjects, conditions or both, and reports a noise ceiling (see below) alongside model evaluations.

One more thing worth knowing about: distances that aren't cross-validated are always positive, even when two patterns don't differ at all, because noise alone makes them look different ([rsatoolbox docs](https://rsatoolbox.readthedocs.io/en/latest/distances.html)). Cross-validated distances avoid this. The usual one is the crossnobis distance, a cross-validated Mahalanobis distance: patterns are noise-normalized (rsatoolbox estimates the noise precision from the GLM residuals) and only estimates from different runs are multiplied together. This gives an unbiased estimate of pattern dissimilarity with an interpretable zero point (Walther et al., 2016). In rsatoolbox it's `calc_rdm(..., method='crossnobis')` ([source](https://github.com/rsagroup/rsatoolbox/blob/main/src/rsatoolbox/rdm/calc.py)).

### Noise ceilings

Your data is noisy, so even the true model wouldn't correlate perfectly with your neural RDM. The noise ceiling is the expected correlation the (unknown) true model would reach given that noise (Nili et al., 2014). Their version works across subjects. The upper bound is the average correlation of each subject's RDM with the group-average RDM (including that subject, which overfits and makes it optimistic). The lower bound is the same, but with each subject's RDM compared to the average of all *other* subjects (leave-one-subject-out), which underestimates the true model's correlation. A model that falls within the ceiling range performs about as well as any model can, given the noise (Nili et al., 2014).

If you only have one subject, you can split the data (e.g. odd vs. even runs), compute an RDM for each half and correlate them. That correlation is the reliability of half the data, though, so it underestimates the reliability of the full dataset. The usual correction for split-half estimates is the Spearman-Brown formula, r_full = 2r / (1 + r), which Lage-Castellanos et al. (2019) apply to split-half noise ceilings for voxel responses; the same logic carries over to RDMs.

Either way, the point is to report model performance relative to the ceiling. A correlation of 0.3 means something very different when the ceiling is 0.35 than when it's 0.8.

The running example shows why this matters. Below is the RDM of the 100 test images in IT for participant 1, computed from the responses averaged over all 12 repetitions:

<img src="/blog/fmri-diagrams/things-it-rdm.svg" alt="A 100 by 100 representational dissimilarity matrix of the THINGS test images in IT, ordered into animals, food and other objects, with weak block structure" />

*Real RDM (1 minus Pearson correlation) for THINGS-fMRI participant 1, IT voxels, ordered into animals, food and other objects and clustered within each group.*

The category structure is weak, and the split-half reliability tells you why. Correlating the RDMs from odd and even sessions gives a Spearman correlation of 0.12, or 0.21 after the Spearman-Brown correction. Spearman's correction for attenuation says that a measure can't correlate with anything more strongly than the square root of its own reliability allows (Spearman, 1904). Here that's about √0.21 ≈ 0.46, so even a perfect model of this participant's IT representations would only reach a correlation of around 0.46 with this RDM, and a model reaching 0.3 would be doing well.

## Cross-validated MANOVA

Classifier accuracy has some quirks: it depends on the classifier you pick, its parameters, how it's applied to the data, and how much training data it gets (Allefeld & Haynes, 2014). Cross-validated MANOVA (cvMANOVA; Allefeld & Haynes, 2014) is an alternative. It estimates "pattern distinctness", the multivariate variance explained by an effect in units of the error variance, uses cross-validation to make that estimate unbiased, and is built on the multivariate form of the GLM.

The original implementation is in [MATLAB](https://github.com/allefeld/cvmanova). I wrote a [Python port](https://github.com/andropar/cvmanova_python) that supports searchlight and ROI analyses, handles factorial designs, and writes results to NIfTI. On an ROI analysis of the Haxby et al. (2001) data, its results are perfectly rank-correlated with the MATLAB implementation's, but the absolute values differ (MATLAB's are about 6 times larger), probably because of differences in preprocessing and implementation details (see the repository README).

Should you use cvMANOVA instead of classification? Allefeld & Haynes (2014) argue it's a parameter-free framework, so you don't have to pick a classifier, and unlike classifiers it can test interactions in factorial designs. On the other hand, the decoding literature relies almost entirely on classifiers (Allefeld & Haynes, 2014), so accuracy is what most readers will be familiar with.

## Encoding models

Decoding and RSA go from brain activity to the stimulus. Encoding models go the other way: given features of the stimulus, can we predict the brain's response (Naselaris et al., 2011)? The advantage is that you have to state a specific hypothesis about which features drive the response, rather than only showing that some information is present. Naselaris et al. (2011) argue that only encoding models can give a complete functional description of a region.

The standard setup is voxelwise encoding: for every voxel, fit a linear regression from stimulus features to that voxel's response, and evaluate the predictions on a separate validation set (Naselaris et al., 2011), usually with R² or the Pearson correlation between predicted and measured responses (Dupré la Tour et al., 2022). That gives you a map of how well your feature space explains each part of the brain. The features can be Gabor wavelets (Kay et al., 2008), semantic labels (Naselaris et al., 2011) or DNN activations.

With thousands of features you need regularization, and ridge regression is the most popular choice for voxelwise encoding models, with the regularization strength chosen by cross-validation (Dupré la Tour et al., 2022). Here's a minimal version with scikit-learn. `X` holds DNN features for each image and `Y` the single-trial betas (from [Part 7](/blog/fmri-crash-course-7-analysis-glm)), averaged over repetitions of the same image, so each image appears exactly once. The train/test split is over images, so no test image is ever seen during training.

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

`RidgeCV` with the default `cv=None` uses efficient leave-one-out cross-validation, and `alpha_per_target=True` picks a separate alpha for each voxel ([scikit-learn docs](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.RidgeCV.html)). For whole-brain data with many voxels and features, [himalaya](https://gallantlab.org/himalaya/) (Dupré la Tour et al., 2022) fits these models with CPU or GPU support and also implements banded ridge regression, which fits several feature spaces jointly with a separate regularization per feature space.

As with RSA, raw prediction accuracy is hard to interpret without knowing how reliable each voxel is. NSD (Allen et al., 2022) provides a noise ceiling SNR (`ncsnr`) per voxel, estimated from the variability of the betas across repetitions of the same image. From it you get the noise ceiling as a percentage of explainable variance, NC = 100 · ncsnr² / (ncsnr² + 1/n), where n is the number of trials averaged per image (Allen et al., 2022). You can then compare your model's variance explained on the test set against NC. Voxels with a low ceiling are mostly noise, and low prediction accuracy there doesn't say much about your model. (See also [Part 6](/blog/fmri-crash-course-6-quality-assessment).)

<img src="/blog/fmri-diagrams/encoding-noise-ceiling.svg" alt="Grouped bar chart of encoding accuracy per visual area for early-layer and late-layer DNN features, with a noise ceiling line for each area" />

*Simulated. Early-layer features predict early visual areas best and late-layer features predict higher areas best. The noise ceiling shows how much is left to explain in each area.*

### ROIs and the cortical surface

In vision studies you rarely run these analyses on "the whole brain" in the abstract. Most of the time you work within ROIs: early visual areas (V1, V2, V3, hV4) delineated from retinotopic mapping or a retinotopy atlas (Benson & Winawer, 2018), and category-selective regions from functional localizers, like FFA for faces (Kanwisher et al., 1997), PPA for scenes (Epstein & Kanwisher, 1998) and LOC for objects (Malach et al., 1995). The scans for this are covered in [Part 4](/blog/fmri-crash-course-4-recording-experiments), and defining ROIs from localizers in [Part 7](/blog/fmri-crash-course-7-analysis-glm). Then you compare decoding accuracy, RDMs or encoding performance across areas, which is how you get at questions about the hierarchy.

The other common choice is to work on the cortical surface instead of in the volume. Visual areas are laid out on a folded sheet, and two points that are close in 3D can be far apart along that sheet: Brodoehl et al. (2020) show an example of two points 4 mm apart in the volume and about 40 mm apart on the surface, and find that volume-based smoothing mixes signals across the sulcal border while surface-based smoothing reduces this. Retinotopic analyses like Benson & Winawer (2018) are done on inflated surfaces and shown on flattened maps for the same reason. fMRIPrep can output surface data for you ([`--output-spaces fsnative fsaverage`](https://fmriprep.org/en/stable/spaces.html)), and NSD provides its betas in surface preparations (fsaverage and native surface) as well as in the volume (Allen et al., 2022).

## Connecting to deep learning

Deep convolutional neural networks (CNNs) trained on object recognition turned out to be good models of the ventral visual stream (reviewed in Yamins & DiCarlo, 2016). In 2014, Yamins et al. showed that the top layer of a CNN optimized for object categorization predicted neural responses in monkey IT cortex, and its intermediate layers predicted V4. In the same year, Khaligh-Razavi & Kriegeskorte showed with RSA that a deep supervised network explained human (fMRI) and monkey IT representations better than the other models they tested. Güçlü & van Gerven (2015) then showed in fMRI that there's a layer-to-area correspondence: voxels best predicted by low layers sat mostly in early visual areas, and voxels best predicted by high layers sat mostly in downstream areas, so the model hierarchy roughly mirrors the cortical one.

<img src="/blog/fmri-diagrams/dnn-brain-heatmap.svg" alt="Heatmap of model-brain correspondence between CNN layers and visual areas, with the best-matching layer moving deeper for higher areas" />

*Illustrative (simulated) layer-by-region comparison. Each cell would be the correlation between a CNN layer's representations and a brain region's activity patterns. The diagonal structure follows the pattern Güçlü & van Gerven (2015) reported from V1 up to LO: early layers match early visual cortex best, and later layers match higher areas best (here also extended to category-selective FFA and PPA).*

Since then, a lot of work has compared DNNs to brains: which architecture predicts neural activity best, which layer, and whether the training task or data changes the correspondence. In one large controlled comparison of 224 models, architecture and task objective mattered little once other factors were held constant, and the training data had the largest effect (Conwell et al., 2024). [thingsvision](https://github.com/ViCCo-Group/thingsvision) (Muttenthaler & Hebart, 2021) makes the feature extraction part easy. You pick a model (including everything in torchvision) and a layer, extract activations for your images, and can go straight into encoding or RSA.

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

The usual approach is the linearizing encoding model from above (Naselaris et al., 2011): DNN features in, voxel responses out, with the assumption that voxel responses are a linear readout of the network's representation. How much good prediction tells us about the brain's actual computations is debated. Many models with clearly different representations reach similarly high brain predictivity, which suggests the standard model-brain mapping methods may be too flexible (Conwell et al., 2024), and Bowers et al. (2023) argue that good predictions can come from networks that share little with biological vision.

## Comparing approaches

| Method | Question Answered | Advantages | Limitations |
|--------|------------------|------------|-------------|
| **Decoding** | Is information about X present? | Intuitive, easy to explain | Doesn't reveal structure; accuracy depends on classifier and training data |
| **RSA** | What is the structure of representations? | Model-comparative; geometry-focused | Permutation tests need enough conditions; correlational |
| **cvMANOVA** | How distinct are patterns? | Parameter-free; no classifier choice; tests interactions | Less intuitive; less common in literature |
| **Encoding** | What features predict activity? | Tests specific feature models | Assumes linear readout; requires good features |

These methods complement each other. Decoding shows that information is there, RSA and encoding models describe what it looks like. Many papers use more than one.

## Datasets

There are now several large, public fMRI datasets for vision with many stimuli and repeated presentations, which is what encoding models and RSA need.

### Natural Scenes Dataset (NSD)

In the [Natural Scenes Dataset](https://naturalscenesdataset.org/) (Allen et al., 2022), eight participants each viewed up to 10,000 distinct natural images from COCO (9,000 unique to each participant plus 1,000 shared), with each image shown up to 3 times, over 30-40 scanning sessions per participant at 7T and 1.8 mm resolution. It was the basis of the Algonauts 2023 challenge on predicting responses to natural scenes (Gifford et al., 2023).

### THINGS-data

[THINGS-data](https://things-initiative.org/) (Hebart et al., 2023) is built around object concepts rather than natural scenes. THINGS has 1,854 object concepts, drawn from a list of nameable living and non-living objects and selected to be representative of American English. The fMRI data (3 participants) covers 720 of these concepts with 8,740 images, the MEG data (4 participants) covers all 1,854 concepts with 22,448 images, and 4.70 million behavioral odd-one-out similarity judgments cover all 1,854 as well (Hebart et al., 2023).

The broad concept sampling and the behavioral similarity data make it a good fit for RSA, since you can compare neural representations to human similarity judgments and to models. Because the fMRI concepts are a subset of the MEG concepts, you can also combine the two to ask spatial and temporal questions about the same objects (Hebart et al., 2023).

### LAION-fMRI

[LAION-fMRI](https://laion-fmri.hebartlab.com) (Zerbe et al., 2026) has five participants with 30 main 7T sessions each and 25,052 unique images in its launch release, mostly everyday photographs sampled from a 120-million image-text corpus. 1,492 shared images were repeated up to 12 times, and the set includes NSD and THINGS images as well as out-of-distribution test stimuli like abstract shapes and visual illusions. That combination makes it useful for testing whether encoding models and representational findings generalize beyond the image distribution they were developed on. It comes with GLMsingle betas, retinotopic maps, functional localizers and eye tracking, and the fMRI data and derivatives are released under CC0 on [AWS Open Data](https://registry.opendata.aws/laion-fmri/) (the raw stimulus images require a data use agreement).

All three datasets are publicly available, and if your question fits them, they're a much cheaper starting point than collecting your own data.

## Where the field is heading

A few trends that I think will shape the next years, each with an example of where it's already happening:

Models are being trained to predict brain activity directly, across subjects and modalities, rather than taking an off-the-shelf DNN layer and mapping it to one region. TRIBE, which won the Algonauts 2025 challenge, is trained to predict responses across modalities, cortical areas and individuals (d'Ascoli et al., 2025).

Static images are being complemented by movies. The Algonauts 2025 challenge asked for encoding models of fMRI responses during movie watching, trained on the largest such dataset available so far (Gifford et al., 2025).

Most fMRI research has averaged across subjects to find general principles, but the field is now able to study measures in individual subjects and relate them to traits (Dubois & Adolphs, 2016).

Finally, good prediction isn't the same as explanation. As discussed above, it's debated what brain predictivity says about shared mechanisms (Bowers et al., 2023; Conwell et al., 2024), and Bowers et al. (2023) argue for testing models on experiments that manipulate variables to test specific hypotheses.

---

## Summary

- Multivariate methods treat the pattern across voxels as the unit of analysis and pick up distributed information that univariate analysis misses.
- Decoding shows that information is present, RSA describes representational geometry, and encoding models test which features drive responses.
- Cross-validate across runs (or images), test RSA results with condition-label permutations rather than naive p-values, and report performance relative to a noise ceiling.
- In vision you'll usually do all of this within retinotopic and localizer-defined ROIs, or on the cortical surface.
- NSD, THINGS-data and LAION-fMRI, together with tools like thingsvision, make comparing DNNs to visual cortex accessible.

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
- [himalaya](https://gallantlab.org/himalaya/) - voxelwise encoding models

**Datasets:**
- [Natural Scenes Dataset](https://naturalscenesdataset.org/)
- [THINGS-data](https://things-initiative.org/)
- [LAION-fMRI](https://laion-fmri.hebartlab.com)
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

**Previous:** [Part 7: Analyzing fMRI data with the GLM](/blog/fmri-crash-course-7-analysis-glm)

**Back to:** [Part 1: Introduction](/blog/fmri-crash-course-1-introduction)

## References

### Foundational MVPA Papers
- Haxby, J. V., Gobbini, M. I., Furey, M. L., Ishai, A., Schouten, J. L., & Pietrini, P. (2001). [Distributed and overlapping representations of faces and objects in ventral temporal cortex](https://doi.org/10.1126/science.1063736). *Science*, 293(5539), 2425-2430.
- Norman, K. A., Polyn, S. M., Detre, G. J., & Haxby, J. V. (2006). [Beyond mind-reading: multi-voxel pattern analysis of fMRI data](https://doi.org/10.1016/j.tics.2006.07.005). *Trends in Cognitive Sciences*, 10(9), 424-430.
- Misaki, M., Kim, Y., Bandettini, P. A., & Kriegeskorte, N. (2010). [Comparison of multivariate classifiers and response normalizations for pattern-information fMRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC2914143/). *NeuroImage*, 53(1), 103-118.
- Varoquaux, G., Raamana, P. R., Engemann, D. A., Hoyos-Idrobo, A., Schwartz, Y., & Thirion, B. (2017). [Assessing and tuning brain decoders: Cross-validation, caveats, and guidelines](https://doi.org/10.1016/j.neuroimage.2016.10.038). *NeuroImage*, 145, 166-179. ([arXiv preprint](https://arxiv.org/abs/1606.05201))

### Representational Similarity Analysis (RSA)
- Kriegeskorte, N., Mur, M., & Bandettini, P. (2008). [Representational similarity analysis - connecting the branches of systems neuroscience](https://doi.org/10.3389/neuro.06.004.2008). *Frontiers in Systems Neuroscience*, 2, 4.
- Nili, H., Wingfield, C., Walther, A., Su, L., Marslen-Wilson, W., & Kriegeskorte, N. (2014). [A toolbox for representational similarity analysis](https://doi.org/10.1371/journal.pcbi.1003553). *PLOS Computational Biology*, 10(4), e1003553.
- Spearman, C. (1904). The proof and measurement of association between two things. *The American Journal of Psychology*, 15(1), 72-101. [https://doi.org/10.2307/1412159](https://doi.org/10.2307/1412159)
- Walther, A., Nili, H., Ejaz, N., Alink, A., Kriegeskorte, N., & Diedrichsen, J. (2016). [Reliability of dissimilarity measures for multi-voxel pattern analysis](https://doi.org/10.1016/j.neuroimage.2015.12.012). *NeuroImage*, 137, 188-200.
- Lage-Castellanos, A., Valente, G., Formisano, E., & De Martino, F. (2019). [Methods for computing the maximum performance of computational models of fMRI responses](https://doi.org/10.1371/journal.pcbi.1006397). *PLOS Computational Biology*, 15(3), e1006397.
- [rsatoolbox documentation](https://rsatoolbox.readthedocs.io/) ([dissimilarities](https://rsatoolbox.readthedocs.io/en/latest/distances.html), [inference](https://rsatoolbox.readthedocs.io/en/latest/inference.html)) | [GitHub repository](https://github.com/rsagroup/rsatoolbox)

### Searchlight Analysis and cvMANOVA
- Kriegeskorte, N., Goebel, R., & Bandettini, P. (2006). [Information-based functional brain mapping](https://doi.org/10.1073/pnas.0600244103). *Proceedings of the National Academy of Sciences*, 103(10), 3863-3868.
- Allefeld, C., & Haynes, J.-D. (2014). [Searchlight-based multi-voxel pattern analysis of fMRI by cross-validated MANOVA](https://doi.org/10.1016/j.neuroimage.2013.11.043). *NeuroImage*, 89, 345-357. ([arXiv preprint](https://arxiv.org/abs/1401.4122))

### Encoding Models
- Kay, K. N., Naselaris, T., Prenger, R. J., & Gallant, J. L. (2008). [Identifying natural images from human brain activity](https://doi.org/10.1038/nature06713). *Nature*, 452, 352-355.
- Naselaris, T., Kay, K. N., Nishimoto, S., & Gallant, J. L. (2011). [Encoding and decoding in fMRI](https://doi.org/10.1016/j.neuroimage.2010.07.073). *NeuroImage*, 56(2), 400-410.
- Dupré la Tour, T., Eickenberg, M., Nunez-Elizalde, A. O., & Gallant, J. L. (2022). [Feature-space selection with banded ridge regression](https://doi.org/10.1016/j.neuroimage.2022.119728). *NeuroImage*, 264, 119728.

### Visual ROIs and Surface Analysis
- Kanwisher, N., McDermott, J., & Chun, M. M. (1997). [The fusiform face area: a module in human extrastriate cortex specialized for face perception](https://doi.org/10.1523/JNEUROSCI.17-11-04302.1997). *Journal of Neuroscience*, 17(11), 4302-4311.
- Epstein, R., & Kanwisher, N. (1998). [A cortical representation of the local visual environment](https://doi.org/10.1038/33402). *Nature*, 392, 598-601.
- Malach, R., Reppas, J. B., Benson, R. R., Kwong, K. K., Jiang, H., Kennedy, W. A., Ledden, P. J., Brady, T. J., Rosen, B. R., & Tootell, R. B. (1995). [Object-related activity revealed by functional magnetic resonance imaging in human occipital cortex](https://doi.org/10.1073/pnas.92.18.8135). *Proceedings of the National Academy of Sciences*, 92(18), 8135-8139.
- Benson, N. C., & Winawer, J. (2018). [Bayesian analysis of retinotopic maps](https://doi.org/10.7554/eLife.40224). *eLife*, 7, e40224.
- Brodoehl, S., Gaser, C., Dahnke, R., Witte, O. W., & Klingner, C. M. (2020). [Surface-based analysis increases the specificity of cortical activation patterns and connectivity results](https://doi.org/10.1038/s41598-020-62832-z). *Scientific Reports*, 10, 5737.

### DNN-Brain Correspondence
- Yamins, D. L. K., Hong, H., Cadieu, C. F., Solomon, E. A., Seibert, D., & DiCarlo, J. J. (2014). [Performance-optimized hierarchical models predict neural responses in higher visual cortex](https://doi.org/10.1073/pnas.1403112111). *Proceedings of the National Academy of Sciences*, 111(23), 8619-8624.
- Khaligh-Razavi, S.-M., & Kriegeskorte, N. (2014). [Deep supervised, but not unsupervised, models may explain IT cortical representation](https://doi.org/10.1371/journal.pcbi.1003915). *PLOS Computational Biology*, 10(11), e1003915.
- Güçlü, U., & van Gerven, M. A. J. (2015). [Deep neural networks reveal a gradient in the complexity of neural representations across the ventral stream](https://doi.org/10.1523/JNEUROSCI.5023-14.2015). *Journal of Neuroscience*, 35(27), 10005-10014.
- Yamins, D. L. K., & DiCarlo, J. J. (2016). [Using goal-driven deep learning models to understand sensory cortex](https://doi.org/10.1038/nn.4244). *Nature Neuroscience*, 19(3), 356-365.
- Conwell, C., Prince, J. S., Kay, K. N., Alvarez, G. A., & Konkle, T. (2024). [A large-scale examination of inductive biases shaping high-level visual representation in brains and machines](https://doi.org/10.1038/s41467-024-53147-y). *Nature Communications*, 15, 9383.
- Bowers, J. S., Malhotra, G., Dujmović, M., Montero, M. L., Tsvetkov, C., Biscione, V., Puebla, G., Adolfi, F., Hummel, J. E., Heaton, R. F., Evans, B. D., Mitchell, J., & Blything, R. (2023). [Deep problems with neural network models of human vision](https://doi.org/10.1017/S0140525X22002813). *Behavioral and Brain Sciences*, 46, e385.
- Muttenthaler, L., & Hebart, M. N. (2021). [THINGSvision: A Python toolbox for streamlining the extraction of activations from deep neural networks](https://doi.org/10.3389/fninf.2021.679838). *Frontiers in Neuroinformatics*, 15, 679838.

### Datasets and Challenges
- Allen, E. J., St-Yves, G., Wu, Y., Breedlove, J. L., et al. (2022). [A massive 7T fMRI dataset to bridge cognitive neuroscience and artificial intelligence](https://doi.org/10.1038/s41593-021-00962-x). *Nature Neuroscience*, 25, 116-126.
- Hebart, M. N., Contier, O., Teichmann, L., Rockter, A. H., Zheng, C. Y., Kidder, A., Corriveau, A., Vaziri-Pashkam, M., & Baker, C. I. (2023). [THINGS-data, a multimodal collection of large-scale datasets for investigating object representations in human brain and behavior](https://doi.org/10.7554/eLife.82580). *eLife*, 12, e82580.
- Zerbe, J., Roth, J., Mell, M. M., Herholz, P., Knapen, T., & Hebart, M. N. (2026). LAION-fMRI: A densely sampled 7T-fMRI dataset providing broad coverage of natural image diversity. Talk 25.11, Vision Sciences Society Annual Meeting. Dataset: [laion-fmri.hebartlab.com](https://laion-fmri.hebartlab.com), [AWS Open Data registry](https://registry.opendata.aws/laion-fmri/).
- Gifford, A. T., Lahner, B., Saba-Sadiya, S., Vilas, M. G., Lascelles, A., Oliva, A., Kay, K., Roig, G., & Cichy, R. M. (2023). [The Algonauts Project 2023 Challenge: How the human brain makes sense of natural scenes](https://arxiv.org/abs/2301.03198). *arXiv*:2301.03198.

### Outlook
- d'Ascoli, S., Rapin, J., Benchetrit, Y., Banville, H., & King, J.-R. (2025). [TRIBE: TRImodal Brain Encoder for whole-brain fMRI response prediction](https://arxiv.org/abs/2507.22229). *arXiv*:2507.22229.
- Gifford, A. T., Bersch, D., St-Laurent, M., Pinsard, B., Boyle, J., Bellec, L., Oliva, A., Roig, G., & Cichy, R. M. (2025). [The Algonauts Project 2025 Challenge: How the human brain makes sense of multimodal movies](https://arxiv.org/abs/2501.00504). *arXiv*:2501.00504.
- Dubois, J., & Adolphs, R. (2016). [Building a science of individual differences from fMRI](https://doi.org/10.1016/j.tics.2016.03.014). *Trends in Cognitive Sciences*, 20(6), 425-443.

### Software Documentation
- [pysearchlight](https://github.com/andropar/pysearchlight) - searchlight implementation used above (README describes the `SearchLight` API)
- [cvmanova_python](https://github.com/andropar/cvmanova_python) - Python port of cvMANOVA, including the MATLAB comparison | [original MATLAB cvmanova](https://github.com/allefeld/cvmanova)
- [Nilearn: SearchLight](https://nilearn.github.io/stable/modules/generated/nilearn.decoding.SearchLight.html) - API reference
- [scikit-learn: RidgeCV](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.RidgeCV.html) - efficient leave-one-out CV and `alpha_per_target`
- [himalaya](https://gallantlab.org/himalaya/) - documentation
- [thingsvision: Getting started](https://vicco-group.github.io/thingsvision/GettingStarted.html) - `get_extractor` and `extract_features`
- [fMRIPrep: Defining standard and nonstandard spaces](https://fmriprep.org/en/stable/spaces.html) - surface outputs via `--output-spaces`
- [rsatoolbox `calc_rdm` source](https://github.com/rsagroup/rsatoolbox/blob/main/src/rsatoolbox/rdm/calc.py) - available `method` strings including `'crossnobis'`
