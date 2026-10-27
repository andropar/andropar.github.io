"""Render the Selected-work card graphics from real project data.

Each graphic is written as alpha masks (``<name>-ink.png`` and ``<name>-accent.png``) so the
site can color them with ``--ink`` and ``--accent`` in both themes via CSS ``mask-image``.

The source data lives outside this repository (Horrorverse, lfmrivis, conwell_replication, the
THINGS-fMRI files in ``new-site/.local``, THINGS model features and the CCN 2025 figure in
``~/Downloads``, and the LAION-fMRI git history), so this only runs on Johannes's machine:

    python3 new-site/scripts/card_graphics.py [horrorverse relaion revision laion_fmri thingsvision
                                               paper_universal paper_sampling paper_coding]
"""

import json
import logging
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import nibabel as nib
import numpy as np
import pandas as pd
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("card-graphics")

HOME = Path.home() / "repos"
OUT = Path(__file__).resolve().parents[1] / "public/v2/graphics"
THUMBS = HOME / "lfmrivis/data/concept_thumbs"
DPI = 200
rng = np.random.default_rng(7)


def canvas(w, h):
    fig = plt.figure(figsize=(w / DPI, h / DPI), dpi=DPI)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    return fig, ax


def save_mask(fig, name):
    """Save a figure as a black, alpha-only PNG (grayscale + alpha keeps files small)."""
    path = OUT / f"{name}.png"
    fig.savefig(path, transparent=True, dpi=DPI)
    plt.close(fig)
    alpha = Image.open(path).getchannel("A")
    Image.merge("LA", (Image.new("L", alpha.size, 0), alpha)).save(path, optimize=True)
    log.info("wrote %s (%d KB)", path.name, path.stat().st_size // 1024)


def save_array_mask(alpha, name, scale=1):
    img = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L")
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    path = OUT / f"{name}.png"
    Image.merge("LA", (Image.new("L", img.size, 0), img)).save(path, optimize=True)
    log.info("wrote %s (%d KB)", path.name, path.stat().st_size // 1024)


def horrorverse(w=1600, h=1000):
    data = np.load(HOME / "horrorshow/data/v3/atlas.npz", allow_pickle=True)
    xy = data["display_coords"].astype(float)
    regions = {r["label"]: r["id"] for r in json.loads(str(data["regions"]))}
    accent = data["region_ids"] == regions["Haunted house"]
    lo, hi = np.percentile(xy, 0.2, axis=0), np.percentile(xy, 99.8, axis=0)
    center, span = (lo + hi) / 2, (
        hi - lo
    ) * 1.08  # stretched to the card, like the live atlas
    for name, mask, alpha in (("ink", ~accent, 0.55), ("accent", accent, 0.9)):
        fig, ax = canvas(w, h)
        ax.scatter(*xy[mask].T, s=2.4, c="k", alpha=alpha, linewidths=0)
        ax.set_xlim(center[0] - span[0] / 2, center[0] + span[0] / 2)
        ax.set_ylim(center[1] - span[1] / 2, center[1] + span[1] / 2)
        save_mask(fig, f"horrorverse-{name}")


def relaion(cols=10, rows=6, tile=72, gap=6, w=1600, h=1000):
    """A dithered contact sheet of natural images (no people)."""
    categories = [
        "mountain",
        "forest",
        "beach",
        "cityscape",
        "flower",
        "fruit",
        "bird",
        "cat",
        "dog",
        "buildings",
        "waterfall",
        "snow",
        "clouds",
        "sunset",
        "vehicle",
        "furniture",
        "fish",
        "insect",
        "food",
        "musical_instrument",
        "tree",
        "water",
        "road",
        "dessert",
    ]
    files = [p for c in categories for p in sorted(THUMBS.glob(f"{c}_*.jpg"))[:4]]
    files = list(rng.choice(files, cols * rows, replace=False))
    bayer = (
        np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16
        + 1 / 32
    )
    threshold = np.tile(bayer, (tile // 4, tile // 4))
    sheet_w, sheet_h = cols * tile + (cols - 1) * gap, rows * tile + (rows - 1) * gap
    ink = np.zeros((sheet_h, sheet_w))
    light = np.zeros_like(ink)
    accent = np.zeros_like(ink)
    accent_tile = (2, 6)
    for i, path in enumerate(files):
        r, c = divmod(i, cols)
        img = Image.open(path).convert("L")
        side = min(img.size)
        img = img.crop(
            (
                (img.width - side) // 2,
                (img.height - side) // 2,
                (img.width + side) // 2,
                (img.height + side) // 2,
            )
        ).resize((tile, tile), Image.LANCZOS)
        lum = np.asarray(img, float) / 255
        lum = np.clip(
            (lum - lum.mean()) * 1.25 + 0.5, 0, 1
        )  # even out exposure across tiles
        y, x = r * (tile + gap), c * (tile + gap)
        target = accent if (r, c) == accent_tile else ink
        target[y : y + tile, x : x + tile] = lum < threshold
        light[y : y + tile, x : x + tile] = (
            lum >= threshold
        )  # positive image for dark mode
    scale = 2
    for name, arr in (("ink", ink), ("ink-dark", light), ("accent", accent)):
        if name == "ink-dark":
            arr = arr.copy()
            r, c = accent_tile
            arr[
                r * (tile + gap) : r * (tile + gap) + tile,
                c * (tile + gap) : c * (tile + gap) + tile,
            ] = 0
        save_array_mask(arr, f"relaion-{name}", scale)
    # Dark mode accent tile also needs the positive rendering.
    r, c = accent_tile
    y, x = r * (tile + gap), c * (tile + gap)
    dark_accent = np.zeros_like(ink)
    dark_accent[y : y + tile, x : x + tile] = 1 - accent[y : y + tile, x : x + tile]
    save_array_mask(dark_accent, "relaion-accent-dark", scale)


def revision(w=1200, h=900, metric="srpr"):
    """Brain-predictivity of 118 vision models on LAION-fMRI (replication), sorted."""
    df = pd.read_csv(
        HOME
        / "conwell_replication/reports/conwell_nsd_train_selected_full_vs_our_sample.csv"
    )
    df = df[df.metric == metric]
    per_model = (
        df.groupby("model")
        .our_train_selected_test.agg(["mean", "min", "max"])
        .sort_values("mean")
    )
    x = np.arange(len(per_model))
    top = x >= len(x) - 10
    for name, sel in (("ink", ~top), ("accent", top)):
        fig, ax = canvas(w, h)
        m = per_model[sel]
        ax.vlines(x[sel], m["min"], m["max"], color="k", alpha=0.35, linewidth=0.9)
        ax.scatter(x[sel], m["mean"], s=9 if name == "ink" else 16, c="k", linewidths=0)
        ax.set_xlim(-6, len(x) + 5)
        ax.set_ylim(per_model["min"].min() - 0.05, per_model["max"].max() + 0.05)
        if name == "ink":
            for level in np.arange(0.1, 0.6, 0.1):
                ax.axhline(level, color="k", alpha=0.12, linewidth=0.6)
        save_mask(fig, f"revision-{name}")


def laion_fmri(w=1200, h=900, view="sagittal"):
    """A T1 slice as smoothed contour lines, with face- and scene-selective cortex filled in."""
    from nibabel.processing import resample_from_to
    from scipy.ndimage import gaussian_filter

    base = Path(__file__).resolve().parents[1] / ".local/things-fmri/proc"
    t1_img = nib.as_closest_canonical(nib.load(base / "t1_brain.nii.gz"))
    t1 = t1_img.get_fdata()
    faces, scenes = (
        resample_from_to(nib.load(base / f), t1_img, order=1).get_fdata()
        for f in ("z_faces_t1.nii.gz", "z_scenes_t1.nii.gz")
    )
    active = (faces > 3.1) | (scenes > 3.1)
    axis = {"sagittal": 0, "axial": 2}[view]
    counts = active.sum(axis=tuple(a for a in range(3) if a != axis))
    mid = t1.shape[axis] // 2
    if view == "sagittal":
        counts[mid - 30 : mid + 30] = (
            0  # lateral slice through ventral visual cortex, not the midline
        )
    idx = int(np.argmax(counts))
    log.info("laion-fmri: %s slice %d of %d", view, idx, t1.shape[axis])
    # Transpose so rows run inferior to superior (contour draws row 0 at the bottom).
    sl = np.take(t1, idx, axis=axis).T
    act = np.take(active, idx, axis=axis).astype(float).T
    brain = gaussian_filter((sl > 0).astype(float), 2)
    sl = gaussian_filter(sl, 1.6)
    ys, xs = np.nonzero(brain > 0.5)
    pad = 10
    crop = (
        slice(ys.min() - pad, ys.max() + pad),
        slice(xs.min() - pad, xs.max() + pad),
    )
    sl, act, brain = sl[crop], gaussian_filter(act[crop], 1.2), brain[crop]
    levels = np.percentile(sl[brain > 0.5], [30, 55, 80])
    for name in ("ink", "accent"):
        fig, ax = canvas(w, h)
        if name == "ink":
            ax.contour(
                np.where(brain > 0.5, sl, 0),
                levels=levels,
                colors="k",
                linewidths=0.6,
                alpha=0.55,
            )
            ax.contour(brain, levels=[0.5], colors="k", linewidths=1.2)
        else:
            ax.contourf(
                np.where(brain > 0.5, act, 0), levels=[0.35, 2], colors="k", alpha=0.9
            )
        hh, ww = sl.shape
        span = max(hh * 1.12, ww * 1.12 * h / w)
        ax.set_ylim(hh / 2 - span / 2, hh / 2 + span / 2)
        ax.set_xlim(ww / 2 - span * w / h / 2, ww / 2 + span * w / h / 2)
        save_mask(fig, f"laion-{name}")


def thingsvision(w=1200, h=900, per_category=10):
    """Representational similarity of ResNet-50 features, images grouped by category."""
    import torch
    import torchvision

    categories = [
        "face_close_up",
        "dog",
        "bird",
        "vehicle",
        "food",
        "buildings",
        "printed_text",
        "flower",
    ]
    files = [
        p for c in categories for p in sorted(THUMBS.glob(f"{c}_*.jpg"))[:per_category]
    ]
    model = torchvision.models.resnet50()
    model.load_state_dict(
        torch.load(Path.home() / ".cache/torch/hub/checkpoints/resnet50-0676ba61.pth")
    )
    model.fc = torch.nn.Identity()
    model.eval()
    transform = torchvision.models.ResNet50_Weights.IMAGENET1K_V2.transforms()
    batch = torch.stack([transform(Image.open(p).convert("RGB")) for p in files])
    with torch.inference_mode():
        features = model(batch).numpy()
    sim = np.corrcoef(features)
    off = sim[~np.eye(len(sim), dtype=bool)]
    sim = np.clip(
        (sim - np.percentile(off, 5))
        / (np.percentile(off, 99) - np.percentile(off, 5)),
        0,
        1,
    )
    n = len(sim)
    block = np.repeat(np.arange(len(categories)), per_category)
    same = block[:, None] == block[None, :]
    # Cells with a 1px gap, drawn as a raster so 6,400 cells stay cheap.
    cell, gap = 10, 1
    size = n * cell
    grid = np.kron(sim, np.ones((cell, cell)))
    mask = np.ones((cell, cell))
    mask[-gap:, :] = 0
    mask[:, -gap:] = 0
    grid *= np.tile(mask, (n, n))
    accent_cells = np.kron(
        (same & (block[:, None] == 3)).astype(float), np.ones((cell, cell))
    )
    for name, arr in (
        ("ink", grid * (1 - accent_cells) * 0.9),
        ("accent", grid * accent_cells),
    ):
        out = np.zeros((h, w))
        scale = (h * 0.86) / size
        img = Image.fromarray((arr * 255).astype(np.uint8)).resize(
            (int(size * scale),) * 2, Image.NEAREST
        )
        y0, x0 = (h - img.height) // 2, (w - img.width) // 2
        out[y0 : y0 + img.height, x0 : x0 + img.width] = np.asarray(img) / 255
        save_array_mask(out, f"thingsvision-{name}")


def _symnmf(S, rank, iters=400, seed=0):
    """Symmetric NMF (S ~ W W^T) with damped multiplicative updates (Ding et al., 2005)."""
    import torch

    S = torch.as_tensor(S, dtype=torch.float32)
    gen = torch.Generator().manual_seed(seed)
    W = torch.rand(S.shape[0], rank, generator=gen) * (S.mean() / rank).sqrt() * 2
    for _ in range(iters):
        W = W * (0.5 + 0.5 * (S @ W) / (W @ (W.T @ W) + 1e-9))
    return W.numpy()


def paper_universal(w=1200, h=900, rank=30):
    """Universality of SymNMF dimensions of THINGS object similarity, across vision models.

    Each row is one model; each dot one of its dimensions, placed by how consistently it recurs
    in the other models (Hungarian-matched cos^2, calibrated against a row-shuffled null). The
    accent thread follows the most universal dimension through its match in every model.
    """
    from scipy.optimize import linear_sum_assignment
    from scipy.spatial.distance import pdist, squareform

    files = sorted((Path.home() / "Downloads/p_max0pt02_model_features").glob("*.npy"))
    embeddings = []
    for f in files:
        z = np.load(f).astype(np.float64)
        d = squareform(pdist(z))
        sigma = np.median(d[np.triu_indices_from(d, 1)])
        embeddings.append(_symnmf(np.exp(-(d**2) / (2 * sigma**2)), rank))
    unit = [e / np.linalg.norm(e, axis=0, keepdims=True) for e in embeddings]
    n_models = len(unit)
    null_rng = np.random.default_rng(0)
    score = np.zeros((n_models, rank))
    match = np.zeros((n_models, n_models, rank), int)
    for m in range(n_models):
        for o in range(n_models):
            if o == m:
                match[m, o] = np.arange(rank)
                continue
            cos2 = (unit[m].T @ unit[o]) ** 2
            _, cols = linear_sum_assignment(-cos2)
            match[m, o] = cols
            shuffled = unit[o][null_rng.permutation(len(unit[o]))]
            null_cos2 = (unit[m].T @ shuffled) ** 2
            _, null_cols = linear_sum_assignment(-null_cos2)
            matched, null = (
                cos2[np.arange(rank), cols],
                null_cos2[np.arange(rank), null_cols],
            )
            score[m] += (matched - null) / (1 - null) / (n_models - 1)
    order = np.argsort(score.mean(axis=1))
    ref, dim = np.unravel_index(np.argmax(score), score.shape)
    thread = np.array([score[o, match[ref, o, dim]] for o in order])
    log.info(
        "paper-universal: %d models, scores %.3f-%.3f, thread from %s dim %d",
        n_models,
        score.min(),
        score.max(),
        files[ref].stem,
        dim,
    )
    y = np.arange(n_models)
    # Two near-chance outliers (IPCL rows) would squash the strip; they fall off the left edge.
    lo, hi = np.percentile(score, 1), score.max()
    pad = (hi - lo) * 0.04
    for name in ("ink", "accent"):
        fig, ax = canvas(w, h)
        if name == "ink":
            for row, m in enumerate(order):
                keep = np.ones(rank, bool)
                keep[match[ref, m, dim]] = False
                ax.hlines(row, lo - pad, hi + pad, color="k", alpha=0.18, linewidth=0.6)
                ax.scatter(
                    score[m, keep],
                    np.full(keep.sum(), row),
                    s=20,
                    c="k",
                    alpha=0.6,
                    linewidths=0,
                )
        else:
            ax.plot(thread, y, color="k", linewidth=1.3)
            ax.scatter(thread, y, s=34, c="k", linewidths=0)
        ax.set_xlim(lo - pad * 3, hi + pad * 3)
        ax.set_ylim(-1.2, n_models + 0.2)
        save_mask(fig, f"paper-universal-{name}")


def paper_sampling(w=1200, h=900):
    """LAION-natural cluster centres, digitized from Fig. 1B of the CCN 2025 paper.

    The figure's source data is not on this machine, so the dots are recovered from the
    published PNG: each class colour is segmented and dot centres are taken as peaks of the
    distance transform. Ink: clusters covered by THINGS and/or NSD. Accent: covered by neither.
    """
    from scipy.ndimage import distance_transform_edt, maximum_filter

    path = Path.home() / (
        "Downloads/CCN2025_8pager/figures/fig1_laion_coverage_by_things_nsd.png"
    )
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(int)
    s = rgb.shape[1] / 1600  # boxes below are in 1600px-wide figure coordinates
    x0, y0, x1, y1 = (int(v * s) for v in (45, 325, 1070, 1012))
    rgb = rgb[y0:y1, x0:x1]
    keep = np.ones(rgb.shape[:2], bool)
    for bx0, by0, bx1, by1 in (  # photo insets, their leader lines and the legend
        (100, 345, 255, 518),
        (660, 325, 855, 475),
        (270, 850, 440, 1012),
        (920, 810, 1070, 1012),
        (10, 875, 225, 1012),
    ):
        keep[
            max(int(by0 * s) - y0, 0) : int(by1 * s) - y0,
            max(int(bx0 * s) - x0, 0) : int(bx1 * s) - x0,
        ] = False
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    classes = {
        "things": (r > 170) & (g < 90) & (b > 50) & (b < 170),
        "both": (b > 160) & (r < 110) & (g > 70) & (g < 150),
        "nsd": (g > 170) & (r < 110) & (b > 70) & (b < 170),
        "neither": (abs(r - g) < 8) & (abs(g - b) < 8) & (r > 188) & (r < 228),
    }
    points = {}
    for label, mask in classes.items():
        dist = distance_transform_edt(mask & keep)
        peaks = (dist == maximum_filter(dist, size=int(7 * s) | 1)) & (dist >= 1.4 * s)
        ys, xs = np.nonzero(peaks)
        points[label] = np.c_[xs, -ys].astype(float)
    log.info(
        "paper-sampling: digitized %s",
        ", ".join(f"{k}={len(v)}" for k, v in points.items()),
    )
    covered = np.vstack([points[k] for k in ("things", "both", "nsd")])
    allxy = np.vstack([covered, points["neither"]])
    lo, hi = allxy.min(axis=0), allxy.max(axis=0)
    center, span = (lo + hi) / 2, (hi - lo) * 1.1
    span = np.maximum(span, span[::-1] * np.array([w / h, h / w]))
    for name, xy in (("ink", covered), ("accent", points["neither"])):
        fig, ax = canvas(w, h)
        if name == "ink":
            ax.scatter(*xy.T, s=8, c="k", alpha=0.45, linewidths=0)
        else:
            ax.scatter(*xy.T, s=11, c="k", linewidths=0)
        ax.set_xlim(center[0] - span[0] / 2, center[0] + span[0] / 2)
        ax.set_ylim(center[1] - span[1] / 2, center[1] + span[1] / 2)
        save_mask(fig, f"paper-sampling-{name}")


def paper_coding(w=1200, h=900, repo=HOME / "LAION-fMRI"):
    """Code churn of every non-merge commit in the LAION-fMRI package, in order.

    Ticks rise with lines added and fall with lines deleted (log scale); the accent marks
    commits that touched the test suite.
    """
    import subprocess

    out = subprocess.run(
        [
            "git",
            "-C",
            str(repo),
            "log",
            "--no-merges",
            "--reverse",
            "--format=@%at",
            "--numstat",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    commits = []
    for block in out.split("@")[1:]:
        lines = block.strip().splitlines()
        added = deleted = 0
        tests = False
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) != 3:
                continue
            a, d, f = parts
            added += int(a) if a.isdigit() else 0
            deleted += int(d) if d.isdigit() else 0
            tests |= f.startswith("tests/")
        commits.append((added, deleted, tests))
    df = pd.DataFrame(commits, columns=["added", "deleted", "tests"])
    log.info("paper-coding: %d commits, %d touch tests/", len(df), int(df.tests.sum()))
    x = np.arange(len(df))
    up, down = np.log1p(df.added.to_numpy()), -np.log1p(df.deleted.to_numpy())
    lim = max(up.max(), -down.min())
    for name, sel in (("ink", ~df.tests.to_numpy()), ("accent", df.tests.to_numpy())):
        fig, ax = canvas(w, h)
        if name == "ink":
            ax.vlines(x[sel], down[sel], up[sel], color="k", alpha=0.55, linewidth=0.9)
            ax.hlines(0, -1, len(df), color="k", alpha=0.35, linewidth=0.6)
        else:
            ax.vlines(x[sel], down[sel], up[sel], color="k", linewidth=1.8)
        ax.set_xlim(-len(df) * 0.08, len(df) * 1.08)
        ax.set_ylim(-lim * 1.35, lim * 1.35)
        save_mask(fig, f"paper-coding-{name}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    targets = sys.argv[1:] or [
        "horrorverse",
        "relaion",
        "revision",
        "laion_fmri",
        "thingsvision",
        "paper_universal",
        "paper_sampling",
        "paper_coding",
    ]
    for target in targets:
        globals()[target]()
