"""Running example for the fMRI crash course: THINGS-fMRI, subject 01.

Uses raw runs from OpenNeuro ds004192 (motion-corrected with FSL MCFLIRT, see
`preprocess()`), plus derivatives published by the THINGS-data authors on figshare
(category-localizer ROIs, noise ceilings, single-trial test-set betas in IT).

Writes figures into public/blog/fmri-diagrams/ in the site style and prints every
number that is quoted in the posts.

Usage:
    python things_example.py            # all
    python things_example.py localizer  # one step
Environment:
    THINGS_DIR  folder with raw/ and derivatives/ (default: new-site/.local/things-fmri)
"""

import logging
import os
import subprocess
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import nibabel as nib  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

import make_figures as mf  # noqa: E402
from make_figures import (BLUE, GREEN, INK, LINE_STRONG, MUTED, OCHRE, ORANGE, PAPER,  # noqa: E402
                          PLUM, SECONDARY, GRAYS, SEQ, WIDTH, note, save)

log = logging.getLogger("things-example")

ROOT = Path(os.environ.get("THINGS_DIR",
                           Path(__file__).resolve().parents[2] / ".local" / "things-fmri"))
RAW = ROOT / "raw" / "sub-01"
DER = ROOT / "derivatives"
PROC = ROOT / "proc"
TR = 1.5

LOC = [RAW / f"ses-localizer1/func/sub-01_ses-localizer1_task-6cat_run-0{r}" for r in (1, 2)]
THINGS = RAW / "ses-things01/func/sub-01_ses-things01_task-things_run-01"

ANIMALS = {"alligator", "beaver", "boa", "butterfly", "chipmunk", "cow", "dragonfly",
           "hippopotamus", "horse", "iguana", "monkey", "rabbit", "starfish", "wasp"}
FOOD = {"banana", "bean", "beer", "brownie", "cheese", "cookie", "donut", "dough", "fudge",
        "grape", "guacamole", "jam", "lasagna", "lemonade", "mango", "marshmallow", "peach",
        "pear", "pumpkin", "tamale"}


def preprocess():
    """Motion-correct the runs with FSL MCFLIRT (run 2 of the localizer to run 1's mean)."""
    PROC.mkdir(exist_ok=True)
    fsl = Path(os.environ.get("FSLDIR", "/usr/local/fsl")) / "bin" / "mcflirt"
    jobs = [
        (LOC[0], "loc_run-01_mc", ["-meanvol"]),
        (LOC[1], "loc_run-02_mc", ["-reffile", str(PROC / "loc_run-01_mc_mean_reg.nii.gz")]),
        (THINGS, "things_run-01_mc", ["-meanvol"]),
    ]
    for src, out, extra in jobs:
        if (PROC / f"{out}.nii.gz").exists():
            continue
        cmd = [str(fsl), "-in", f"{src}_bold.nii.gz", "-out", str(PROC / out), "-plots",
               "-rmsrel"] + extra
        log.info("running %s", " ".join(cmd))
        subprocess.run(cmd, check=True)


def motion_params(name):
    """MCFLIRT .par: 3 rotations (rad) then 3 translations (mm)."""
    p = np.loadtxt(PROC / f"{name}.par")
    return p[:, 3:], p[:, :3]


def fd_power(trans, rot_rad):
    d = np.abs(np.diff(np.c_[trans, rot_rad * 50], axis=0)).sum(1)
    return np.r_[0, d]


def brain_mask(mean_img):
    from nilearn.masking import compute_epi_mask

    return compute_epi_mask(mean_img)


def std_dvars(data, mask):
    """Standardized DVARS (Nichols): DVARS divided by its expected value under AR(1)."""
    ts = data[mask].astype(np.float64)
    ts = ts - ts.mean(1, keepdims=True)
    diff = np.diff(ts, axis=1)
    dvars = np.sqrt((diff ** 2).mean(0))
    sd = ts.std(1, ddof=1)
    ar1 = np.array([np.corrcoef(v[:-1], v[1:])[0, 1] if s > 0 else 0 for v, s in zip(ts, sd)])
    expected = np.sqrt((2 * (1 - np.nan_to_num(ar1)) * sd ** 2).mean())
    return np.r_[np.nan, dvars / expected]


# --------------------------------------------------------------------------------------


def fig_volume_timeseries():
    """Part 3: real 4D data (raw run) and one voxel's time series."""
    img = nib.load(f"{THINGS}_bold.nii.gz")
    data = img.dataobj
    log.info("things run shape %s, zooms %s", img.shape, img.header.get_zooms())
    z = 22
    sl = np.asarray(data[:, :, z, 10]).T[::-1]
    ev = pd.read_csv(f"{THINGS}_events.tsv", sep="\t")
    # example voxel: the one in this slice that best follows the stimulus regressor
    from nilearn.glm.first_level import compute_regressor

    vol = np.asarray(data[:, :, z, :], dtype=np.float32)
    mean = vol.mean(-1)
    reg, _ = compute_regressor(np.vstack([ev.onset, ev.duration, np.ones(len(ev))]), "spm",
                               np.arange(vol.shape[-1]) * TR)
    from scipy.ndimage import binary_erosion
    from scipy.signal import detrend

    v = detrend(vol[..., 10:], axis=-1)  # skip the first volumes, remove linear drift
    g = reg[10:, 0] - reg[10:, 0].mean()
    r = (v @ g) / (np.linalg.norm(v, axis=-1) * np.linalg.norm(g) + 1e-9)
    interior = binary_erosion(mean > np.percentile(mean, 60), iterations=4)
    r[~interior] = 0
    r[:, int(0.4 * r.shape[1]):] = 0  # posterior part of the slice (occipital cortex)
    yy, xx = np.unravel_index(np.argmax(r), mean.shape)
    log.info("example voxel (%d, %d, %d), r with stimulus regressor %.2f", yy, xx, z, r[yy, xx])
    ts = vol[yy, xx]
    fig = plt.figure(figsize=(WIDTH, 3.6))
    a0 = fig.add_axes([0.0, 0.08, 0.3, 0.82])
    a0.imshow(sl, cmap=GRAYS, interpolation="nearest")
    a0.add_patch(plt.Rectangle((yy - 1.5, sl.shape[0] - 1 - xx - 1.5), 3, 3, fc="none", ec=ORANGE, lw=1.5))
    a0.set_title("One volume (axial slice), raw", loc="center")
    a0.axis("off")
    a1 = fig.add_axes([0.38, 0.2, 0.6, 0.62])
    t = np.arange(len(ts)) * TR
    pct = (ts / ts[10:].mean() - 1) * 100
    a1.plot(t, pct, color=ORANGE, lw=1.3)
    for o in ev.onset:
        a1.axvline(o, color=LINE_STRONG, lw=0.6, zorder=0)
    a1.set_xlim(0, t[-1])
    a1.set_xlabel("Time (s)")
    a1.set_ylabel("Signal change (%)")
    a1.set_title("One voxel over the run (gray lines: image onsets)")
    save(fig, "things-volume-timeseries")


def fig_design():
    """Part 4: event timing of a THINGS run and a localizer run."""
    ev = pd.read_csv(f"{THINGS}_events.tsv", sep="\t")
    loc = pd.read_csv(f"{LOC[0]}_events.tsv", sep="\t")
    soa = np.diff(ev.onset.values)
    log.info("things run: %d events, types %s, SOA median %.2f s, duration %s", len(ev),
             ev.trial_type.value_counts().to_dict(), np.median(soa), ev.duration.unique())
    log.info("localizer: blocks %s, duration %s, onsets %s", loc.trial_type.tolist(),
             loc.duration.unique(), loc.onset.tolist())
    fig, (a0, a1) = plt.subplots(2, 1, figsize=(WIDTH, 3.6), gridspec_kw={"hspace": 0.9})
    cols = {"exp": GREEN, "test": BLUE, "catch": ORANGE}
    for typ, c in cols.items():
        sub = ev[ev.trial_type == typ]
        a0.vlines(sub.onset, 0, 1, color=c, lw=1.6, label=f"{typ} ({len(sub)})")
    a0.set_xlim(0, 120)
    a0.set_yticks([])
    a0.spines["left"].set_visible(False)
    a0.legend(ncol=3, loc="lower left", bbox_to_anchor=(0, 1.02), handlelength=0.8)
    a0.set_title("THINGS run: one image every 4.5 s (first 2 minutes)", pad=26)
    a0.set_xlabel("Time (s)")
    lc = {"faces": ORANGE, "bodyparts": PLUM, "scenes": BLUE, "objects": GREEN,
          "scrambled": MUTED, "words": OCHRE}
    for _, r in loc.iterrows():
        a1.add_patch(plt.Rectangle((r.onset, 0), r.duration, 1, fc=lc[r.trial_type], ec="none"))
        a1.text(r.onset + r.duration / 2, 0.5, r.trial_type, rotation=90, ha="center",
                va="center", fontsize=8, color=PAPER)
    a1.set_xlim(0, loc.onset.max() + 20)
    a1.set_ylim(0, 1)
    a1.set_yticks([])
    a1.spines["left"].set_visible(False)
    a1.set_title("Category localizer run: 15 s blocks")
    a1.set_xlabel("Time (s)")
    save(fig, "things-design")


def fig_motion():
    """Part 5: real motion parameters of a localizer run (MCFLIRT)."""
    trans, rot = motion_params("loc_run-01_mc")
    t = np.arange(len(trans)) * TR
    fig, (a0, a1) = plt.subplots(2, 1, figsize=(WIDTH, 4.2), sharex=True, gridspec_kw={"hspace": 0.3})
    for k, (lab, c) in enumerate(zip("xyz", (GREEN, BLUE, ORANGE))):
        a0.plot(t, trans[:, k], color=c, lw=1.4, label=lab)
    for k, (lab, c) in enumerate(zip(("pitch", "roll", "yaw"), (GREEN, BLUE, ORANGE))):
        a1.plot(t, np.degrees(rot[:, k]), color=c, lw=1.4, label=lab)
    a0.set_ylabel("Translation (mm)")
    a1.set_ylabel("Rotation (°)")
    a1.set_xlabel("Time (s)")
    a0.set_title("Motion parameters, THINGS-fMRI sub-01, localizer run 1")
    for a in (a0, a1):
        a.axhline(0, color=LINE_STRONG, lw=0.8)
        a.legend(ncol=3, loc="upper left")
        a.set_xlim(0, t[-1])
    log.info("motion: max |trans| %.2f mm, max |rot| %.2f deg", np.abs(trans).max(),
             np.degrees(np.abs(rot)).max())
    save(fig, "things-motion")


def fig_fd_dvars_carpet():
    """Part 6: FD, standardized DVARS and a carpet plot of the same run."""
    img = nib.load(PROC / "loc_run-01_mc.nii.gz")
    data = np.asarray(img.dataobj, dtype=np.float32)
    mean_img = nib.Nifti1Image(data.mean(-1), img.affine)
    mask = brain_mask(mean_img).get_fdata().astype(bool)
    trans, rot = motion_params("loc_run-01_mc")
    fd = fd_power(trans, rot)
    dv = std_dvars(data, mask)
    t = np.arange(len(fd)) * TR
    log.info("loc run-01: mean FD %.3f, max FD %.3f, vols FD>0.5 %d, vols FD>0.2 %d, "
             "max std DVARS %.2f, vols >1.5 %d, r(FD,DVARS) %.2f", fd.mean(), fd.max(),
             (fd > 0.5).sum(), (fd > 0.2).sum(), np.nanmax(dv), np.nansum(dv > 1.5),
             np.corrcoef(fd[1:], dv[1:])[0, 1])
    ts = data[mask]
    ts = ts - ts.mean(1, keepdims=True)
    from scipy.signal import detrend

    ts = detrend(ts, axis=1)
    ts = ts / (ts.std(1, keepdims=True) + 1e-6)
    rng = np.random.default_rng(0)
    rows = rng.choice(len(ts), size=min(1500, len(ts)), replace=False)
    order = np.argsort(np.asarray(np.nonzero(mask))[2][rows])  # sort by z, top to bottom
    fig = plt.figure(figsize=(WIDTH, 5.2))
    gs = fig.add_gridspec(3, 1, height_ratios=[1, 1, 3.4], hspace=0.12)
    a0, a1, a2 = (fig.add_subplot(gs[i]) for i in range(3))
    a0.plot(t, fd, color=GREEN, lw=1.2)
    a0.axhline(0.5, color=ORANGE, lw=1, ls=(0, (4, 3)))
    a0.set_ylabel("FD (mm)")
    a1.plot(t, dv, color=BLUE, lw=1.2)
    a1.axhline(1.5, color=ORANGE, lw=1, ls=(0, (4, 3)))
    a1.set_ylabel("Std. DVARS")
    a2.imshow(ts[rows][order], aspect="auto", cmap=GRAYS, vmin=-2, vmax=2,
              interpolation="nearest", extent=(0, t[-1], len(rows), 0))
    a2.set_yticks([])
    a2.set_ylabel("Voxels")
    a2.set_xlabel("Time (s)")
    for a in (a0, a1):
        a.set_xlim(0, t[-1])
        a.tick_params(labelbottom=False)
    a0.set_title("Quality check of a real run (THINGS-fMRI sub-01, localizer run 1)")
    save(fig, "things-qc")


def fig_noise_ceiling():
    """Part 6: published noise ceilings vs number of averaged repetitions, V1 vs whole brain."""
    nd = DER / "noise_ceilings/noise_ceilings"
    v1 = nib.load(DER / "rois/rois/prf/sub-01/resampled_va-1_interp-nn.nii.gz").get_fdata() > 0  # label 1 = V1
    ns = np.arange(1, 13)
    rows = []
    for n in ns:
        d = nib.load(nd / f"sub-01_nc_n-{n}.nii.gz").get_fdata()
        brain = np.isfinite(d) & (d != 0)
        rows.append([np.nanpercentile(d[v1 & brain], q) for q in (25, 50, 75)] +
                    [np.nanpercentile(d[brain], q) for q in (25, 50, 75)])
    rows = np.array(rows)
    log.info("noise ceiling medians V1 n=1 %.1f%%, n=12 %.1f%%; all voxels n=1 %.1f%%, n=12 %.1f%%",
             rows[0, 1], rows[-1, 1], rows[0, 4], rows[-1, 4])
    fig, ax = plt.subplots(figsize=(WIDTH * 0.75, 3.5))
    for (lo, md, hi), c, lab in (((0, 1, 2), GREEN, "V1"), ((3, 4, 5), MUTED, "all voxels")):
        ax.fill_between(ns, rows[:, lo], rows[:, hi], color=c, alpha=0.15, lw=0)
        ax.plot(ns, rows[:, md], color=c, marker="o", ms=4, label=f"{lab} (median, IQR)")
    ax.set_xticks(ns)
    ax.set_xlabel("Number of repetitions averaged per image")
    ax.set_ylabel("Noise ceiling (% variance)")
    ax.legend(loc="upper left")
    ax.set_ylim(0, None)
    ax.set_title("Published noise ceilings, THINGS-fMRI sub-01")
    save(fig, "things-noise-ceiling")


def fig_localizer():
    """Part 7: category localizer GLM in native space on the motion-corrected runs."""
    from nilearn.glm.first_level import FirstLevelModel
    from nilearn.image import mean_img

    runs = [str(PROC / "loc_run-01_mc.nii.gz"), str(PROC / "loc_run-02_mc.nii.gz")]
    events = [pd.read_csv(f"{p}_events.tsv", sep="\t") for p in LOC]
    confounds = []
    for name in ("loc_run-01_mc", "loc_run-02_mc"):
        tr_, rot_ = motion_params(name)
        confounds.append(pd.DataFrame(np.c_[tr_, rot_], columns=["tx", "ty", "tz", "rx", "ry", "rz"]))
    mean = mean_img(runs[0], copy_header=True)
    mask = brain_mask(mean)
    model = FirstLevelModel(t_r=TR, hrf_model="spm", drift_model="cosine", high_pass=0.01,
                            noise_model="ar1", smoothing_fwhm=4, mask_img=mask, n_jobs=4)
    model.fit(runs, events=events, confounds=confounds)
    zf = model.compute_contrast("faces - objects", output_type="z_score").get_fdata()
    zs = model.compute_contrast("scenes - objects", output_type="z_score").get_fdata()
    m = mean.get_fdata()
    thr = 3.1  # p < 0.001 one-sided, uncorrected, for display
    log.info("localizer: faces>objects voxels z>%.1f: %d, max z %.1f; scenes>objects: %d, max z %.1f",
             thr, (zf > thr).sum(), zf.max(), (zs > thr).sum(), zs.max())
    # pick the axial slice with the most face- and scene-selective voxels in the inferior half
    nz = m.shape[2]
    kf = int(np.argmax([(zf[:, :, k] > thr).sum() for k in range(nz)]))
    kscene = int(np.argmax([(zs[:, :, k] > thr).sum() for k in range(nz)]))
    log.info("localizer slices: faces %d (%d vox), scenes %d (%d vox)", kf,
             (zf[:, :, kf] > thr).sum(), kscene, (zs[:, :, kscene] > thr).sum())
    ks = [kf, kscene]
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH * 0.75, 3.9))
    for ax, k in zip(axs, ks):
        ax.imshow(m[:, :, k].T[::-1], cmap=GRAYS, interpolation="nearest")
        for z, c in ((zf, ORANGE), (zs, BLUE)):
            ov = np.ma.masked_less(z[:, :, k].T[::-1], thr)
            ax.imshow(ov, cmap=plt.matplotlib.colors.ListedColormap([c]), alpha=0.85,
                      interpolation="nearest")
        ax.set_title("slice with most face voxels" if k == kf else "slice with most scene voxels",
                     loc="center", color=MUTED, fontsize=9.5)
        ax.axis("off")
    fig.text(0.02, 0.98, "faces > objects", color=ORANGE, fontsize=11, weight="medium", va="top")
    fig.text(0.27, 0.98, "scenes > objects", color=BLUE, fontsize=11, weight="medium", va="top")
    fig.text(0.98, 0.98, "z > 3.1, uncorrected, on the mean EPI", color=MUTED, fontsize=9,
             va="top", ha="right")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "things-localizer")


def _it_data():
    b = DER / "betas_csv_testset/betas_csv_testset/"
    X = np.load(b / "sub-01_TestResponsesIT.npy").astype(np.float64)
    meta = pd.read_csv(b / "sub-01_StimulusMetadataTestset.csv")
    names = meta.stimulus.str.rsplit("_", n=1).str[0].values
    return X, meta, names


def fig_it_decoding():
    """Part 8: decoding from IT single-trial betas (published test set)."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import LeaveOneGroupOut, cross_val_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    X, meta, names = _it_data()
    ses = meta.session.values
    stims = sorted(set(meta.stimulus))
    y = meta.stimulus.map({s: i for i, s in enumerate(stims)}).values
    acc_id = []
    for s in np.unique(ses):
        tr, te = ses != s, ses == s
        cent = np.stack([X[tr & (y == k)].mean(0) for k in range(len(stims))])
        z = lambda a: (a - a.mean(1, keepdims=True)) / a.std(1, keepdims=True)  # noqa: E731
        acc_id.append(((z(X[te]) @ z(cent).T).argmax(1) == y[te]).mean())
    sel = np.isin(names, list(ANIMALS | FOOD))
    lab = np.isin(names[sel], list(ANIMALS)).astype(int)
    clf = make_pipeline(StandardScaler(), LogisticRegression(C=0.01, max_iter=2000))
    acc_cat = cross_val_score(clf, X[sel], lab, groups=ses[sel], cv=LeaveOneGroupOut(),
                              scoring="balanced_accuracy")
    log.info("IT: %d trials x %d voxels; 100-way identification mean %.3f (chance 0.01), "
             "range %.3f-%.3f; animals(%d) vs food(%d) balanced acc %.3f (chance 0.5), range %.3f-%.3f",
             X.shape[0], X.shape[1], np.mean(acc_id), min(acc_id), max(acc_id),
             len(set(names[sel]) & ANIMALS), len(set(names[sel]) & FOOD), acc_cat.mean(),
             acc_cat.min(), acc_cat.max())
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 3.4))
    for ax, acc, chance, title in ((axs[0], acc_id, 0.01, "Which of 100 images? (identification)"),
                                   (axs[1], acc_cat, 0.5, "Animal or food? (balanced accuracy)")):
        x = np.arange(1, len(acc) + 1)
        ax.bar(x, acc, color=GREEN, width=0.7)
        ax.axhline(chance, color=ORANGE, lw=1.2, ls=(0, (4, 3)))
        ax.axhline(np.mean(acc), color=INK, lw=1.2)
        ax.text(len(acc) + 0.55, chance, " chance", color=ORANGE, va="center", ha="left", fontsize=9)
        ax.text(len(acc) + 0.55, np.mean(acc), f" mean {np.mean(acc):.2f}", color=INK, va="center",
                ha="left", fontsize=9)
        ax.set_xlim(0.3, len(acc) + 0.6)
        ax.set_xticks(x)
        ax.set_xlabel("Held-out session (fold)")
        ax.set_title(title)
    axs[0].set_ylabel("Accuracy")
    axs[1].set_ylim(0, 1)
    fig.tight_layout(w_pad=3)
    save(fig, "things-it-decoding")


def fig_it_rsa():
    """Part 8: RDM of the 100 test images in IT, split-half reliability."""
    from scipy.cluster.hierarchy import leaves_list, linkage
    from scipy.spatial.distance import pdist, squareform
    from scipy.stats import spearmanr

    X, meta, names = _it_data()
    ses = meta.session.values
    stims = sorted(set(meta.stimulus))
    y = meta.stimulus.map({s: i for i, s in enumerate(stims)}).values
    nm = np.array([s.rsplit("_", 1)[0] for s in stims])
    avg = np.stack([X[y == k].mean(0) for k in range(len(stims))])
    odd = np.stack([X[(y == k) & (ses % 2 == 1)].mean(0) for k in range(len(stims))])
    even = np.stack([X[(y == k) & (ses % 2 == 0)].mean(0) for k in range(len(stims))])
    r = spearmanr(pdist(odd, "correlation"), pdist(even, "correlation"))[0]
    rdm = squareform(pdist(avg, "correlation"))
    grp = np.array([0 if n in ANIMALS else 1 if n in FOOD else 2 for n in nm])
    order = []
    for g in (0, 1, 2):
        idx = np.where(grp == g)[0]
        sub = squareform(rdm[np.ix_(idx, idx)], checks=False)
        order += list(idx[leaves_list(linkage(sub, "average"))])
    order = np.array(order)
    within = {g: np.mean(squareform(rdm[np.ix_(grp == g, grp == g)], checks=False)) for g in (0, 1, 2)}
    log.info("IT RDM: split-half Spearman %.3f (Spearman-Brown %.3f); mean within-animal %.3f, "
             "within-food %.3f, within-other %.3f, overall %.3f", r, 2 * r / (1 + r), within[0],
             within[1], within[2], squareform(rdm, checks=False).mean())
    fig, ax = plt.subplots(figsize=(WIDTH * 0.62, 5.2))
    rr = rdm[np.ix_(order, order)]
    lo, hi = np.percentile(squareform(rdm, checks=False), [2, 98])
    im = ax.imshow(rr, cmap=SEQ, vmin=lo, vmax=hi, interpolation="nearest")
    bounds = np.cumsum([np.sum(grp == g) for g in (0, 1)]) - 0.5
    for b in bounds:
        ax.axhline(b, color=PAPER, lw=2)
        ax.axvline(b, color=PAPER, lw=2)
    ticks = [np.sum(grp == 0) / 2, np.sum(grp == 0) + np.sum(grp == 1) / 2,
             np.sum(grp < 2) + np.sum(grp == 2) / 2]
    ax.set_xticks(ticks)
    ax.set_xticklabels(["animals", "food", "other objects"])
    ax.set_yticks(ticks)
    ax.set_yticklabels(["animals", "food", "other objects"], rotation=90, va="center")
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    cb = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.03)
    cb.set_label("Dissimilarity (1 − r)")
    cb.outline.set_visible(False)
    ax.set_title("RDM of the 100 test images in IT, sub-01")
    save(fig, "things-it-rdm")


ALL_LOC = LOC + [RAW / f"ses-localizer2/func/sub-01_ses-localizer2_task-6cat_run-0{r}" for r in range(1, 7)]
T1W = RAW / "ses-localizer1/anat/sub-01_ses-localizer1_acq-prescannormalized_rec-pydeface_T1w.nii.gz"


def _fsl(tool, *args):
    exe = Path(os.environ.get("FSLDIR", "/usr/local/fsl")) / "bin" / tool
    log.info("%s %s", tool, " ".join(map(str, args)))
    subprocess.run([str(exe), *map(str, args)], check=True,
                   env={**os.environ, "FSLOUTPUTTYPE": "NIFTI_GZ"})


def preprocess_localizers():
    """All 8 localizer runs: MCFLIRT per run, then one rigid transform per run into the
    space of localizer-1 run-1's mean; finally register that mean EPI to the T1w."""
    ref = PROC / "loc_ref_mean.nii.gz"
    for i, src in enumerate(ALL_LOC):
        tag = f"locall_{i:02d}"
        if not (PROC / f"{tag}_mc.nii.gz").exists():
            _fsl("mcflirt", "-in", f"{src}_bold.nii.gz", "-out", PROC / f"{tag}_mc", "-meanvol",
                 "-plots")
        if i == 0 and not ref.exists():
            subprocess.run(["cp", PROC / f"{tag}_mc_mean_reg.nii.gz", ref], check=True)
        out = PROC / f"{tag}_ref.nii.gz"
        if not out.exists():
            mat = PROC / f"{tag}_to_ref.mat"
            _fsl("flirt", "-in", PROC / f"{tag}_mc_mean_reg.nii.gz", "-ref", ref, "-dof", "6",
                 "-omat", mat)
            _fsl("applyxfm4D", PROC / f"{tag}_mc.nii.gz", ref, out, mat, "-singlematrix")
    if not (PROC / "epi2t1.mat").exists():
        # skull-strip with the published brain mask (same world space as the raw T1w)
        from nilearn.image import resample_to_img

        t1 = nib.load(T1W)
        bm = resample_to_img(nib.load(DER / "brainmasks/brainmasks/sub-01_space-T1w_brainmask.nii.gz"),
                             t1, interpolation="nearest", force_resample=True, copy_header=True)
        nib.Nifti1Image(t1.get_fdata() * (bm.get_fdata() > 0), t1.affine).to_filename(PROC / "t1_brain.nii.gz")
        _fsl("flirt", "-in", ref, "-ref", PROC / "t1_brain.nii.gz", "-dof", "6", "-cost",
             "normmi", "-omat", PROC / "epi2t1.mat", "-out", PROC / "ref_in_t1.nii.gz")


def fig_localizer_t1():
    """Part 7: localizer GLM on all 8 runs, shown on the T1w with published ROI outlines."""
    from nilearn.glm.first_level import FirstLevelModel
    from nilearn.image import resample_to_img
    from nilearn.masking import compute_epi_mask
    from scipy.ndimage import binary_dilation

    runs = [str(PROC / f"locall_{i:02d}_ref.nii.gz") for i in range(len(ALL_LOC))]
    events = [pd.read_csv(f"{p}_events.tsv", sep="\t") for p in ALL_LOC]
    conf = [pd.DataFrame(np.loadtxt(PROC / f"locall_{i:02d}_mc.par"),
                         columns=["rx", "ry", "rz", "tx", "ty", "tz"]) for i in range(len(ALL_LOC))]
    ref = nib.load(PROC / "loc_ref_mean.nii.gz")
    mask = compute_epi_mask(ref)
    model = FirstLevelModel(t_r=TR, hrf_model="spm", drift_model="cosine", high_pass=0.01,
                            noise_model="ar1", smoothing_fwhm=4, mask_img=mask, n_jobs=4)
    model.fit(runs, events=events, confounds=conf)
    maps = {}
    for name, con in (("faces", "faces - objects"), ("scenes", "scenes - objects")):
        z = model.compute_contrast(con, output_type="z_score")
        f = PROC / f"z_{name}.nii.gz"
        z.to_filename(f)
        _fsl("flirt", "-in", f, "-ref", T1W, "-applyisoxfm", "1.6", "-init", PROC / "epi2t1.mat",
             "-out", PROC / f"z_{name}_t1.nii.gz")
        maps[name] = nib.load(PROC / f"z_{name}_t1.nii.gz")
    grid = maps["faces"]
    t1 = resample_to_img(nib.load(T1W), grid, force_resample=True, copy_header=True).get_fdata()
    roi_dir = DER / "rois/rois/category_localizer/sub-01"
    rois = {}
    for name, files in (("faces", ["face_parcels/sub-01_lFFA.nii.gz", "face_parcels/sub-01_rFFA.nii.gz"]),
                        ("scenes", ["scene_parcels/sub-01_lPPA.nii.gz", "scene_parcels/sub-01_rPPA.nii.gz"])):
        m = np.zeros(grid.shape, bool)
        for f in files:
            m |= resample_to_img(nib.load(roi_dir / f), grid, interpolation="nearest",
                                 force_resample=True, copy_header=True).get_fdata() > 0
        rois[name] = m
    thr = 3.1
    for name in ("faces", "scenes"):
        z = maps[name].get_fdata()
        hit = (z[rois[name]] > thr).mean()
        log.info("localizer (8 runs): %s>objects voxels z>%.1f (EPI space) %d; published ROI voxels "
                 "with z>%.1f: %.0f%%", name, thr,
                 (nib.load(PROC / f"z_{name}.nii.gz").get_fdata() > thr).sum(), thr, 100 * hit)
    # axial slices through the published FFA and PPA
    kf = int(np.argmax(rois["faces"].sum((0, 1))))
    kp = int(np.argmax(rois["scenes"].sum((0, 1))))
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 5.4))
    for ax, k, title in ((axs[0], kf, "through the published FFA"), (axs[1], kp, "through the published PPA")):
        bg = t1[:, :, k].T[::-1]
        rows, cols = np.nonzero(bg > np.percentile(bg[bg > 0], 5))
        pad = 3
        ax.set_xlim(cols.min() - pad, cols.max() + pad)
        ax.set_ylim(rows.max() + pad, rows.min() - pad)
        ax.imshow(bg, cmap=GRAYS, interpolation="bilinear")
        for name, c in (("faces", ORANGE), ("scenes", BLUE)):
            z = maps[name].get_fdata()[:, :, k].T[::-1]
            ax.imshow(np.ma.masked_less(z, thr), cmap=plt.matplotlib.colors.ListedColormap([c]),
                      alpha=0.75, interpolation="nearest")
            r = rois[name][:, :, k].T[::-1]
            if r.any():
                ax.contour(r.astype(float), levels=[0.5], colors=[INK if name == "faces" else "#0b1d3a"],
                           linewidths=1.0)
                ax.contour(binary_dilation(r).astype(float), levels=[0.5], colors=[PAPER],
                           linewidths=0.6)
        ax.set_title(title, loc="center", color=MUTED, fontsize=9.5)
        ax.set_xticks([])
        ax.set_yticks([])
        for sp in ax.spines.values():
            sp.set_visible(False)
    fig.text(0.02, 0.985, "faces > objects", color=ORANGE, fontsize=11, weight="medium", va="top")
    fig.text(0.2, 0.985, "scenes > objects", color=BLUE, fontsize=11, weight="medium", va="top")
    fig.text(0.98, 0.985, "z > 3.1 uncorrected · outlines: published ROIs", color=MUTED,
             fontsize=9, va="top", ha="right")
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    save(fig, "things-localizer")


STEPS = {
    "preprocess": preprocess,
    "volume": fig_volume_timeseries,
    "design": fig_design,
    "motion": fig_motion,
    "qc": fig_fd_dvars_carpet,
    "noiseceiling": fig_noise_ceiling,
    "localizer_old": fig_localizer,
    "prep_localizers": preprocess_localizers,
    "localizer": fig_localizer_t1,
    "decoding": fig_it_decoding,
    "rsa": fig_it_rsa,
}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    mf.setup_style()
    for name in sys.argv[1:] or list(STEPS):
        log.info("== %s", name)
        STEPS[name]()
