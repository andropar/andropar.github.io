"""Additional figures for the fMRI crash course (second batch).

Imported by make_figures.py, which owns the style, tokens and save helper.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Wedge
from scipy.ndimage import gaussian_filter, map_coordinates
from scipy.interpolate import splprep, splev

import make_figures as mf
from make_figures import (BLUE, GREEN, INK, LINE, LINE_STRONG, MUTED, OCHRE, ORANGE, PAPER,
                          PLUM, SECONDARY, SURFACE, GRAYS, DIV, WIDTH, note, save, spm_hrf)


# --------------------------------------------------------------------------------------
# Part 3
# --------------------------------------------------------------------------------------


def bold_contrast_te():
    te = np.linspace(0, 120, 600)
    t2_rest, t2_act = 44.0, 45.5  # ms, gray matter T2* at 3T, small change with activation
    s_rest, s_act = np.exp(-te / t2_rest), np.exp(-te / t2_act)
    diff = (s_act - s_rest) * 100
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 3.5))
    axs[0].plot(te, s_rest, color=BLUE, label="rest")
    axs[0].plot(te, s_act, color=ORANGE, label="active", ls=(0, (4, 2)))
    axs[0].set_title("T2* decay at rest and during activity")
    axs[0].set_xlabel("Echo time, TE (ms)")
    axs[0].set_ylabel("Signal (relative)")
    axs[0].legend(loc="upper right")
    axs[0].set_ylim(0, 1.05)
    note(axs[0], 60, 0.5, "the curves almost overlap:\nBOLD is a ~1% effect", ha="left")
    i = np.argmax(diff)
    axs[1].axvspan(25, 35, color=GREEN, alpha=0.1, lw=0)
    axs[1].plot(te, diff, color=GREEN)
    axs[1].plot(te[i], diff[i], "o", color=GREEN, ms=7, mec=PAPER, mew=1.5)
    axs[1].annotate(f"largest near TE ≈ T2* ({te[i]:.0f} ms)", (te[i], diff[i]),
                    (te[i] + 12, diff[i] * 0.98), fontsize=10, va="center",
                    arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
    axs[1].text(30, 0.03, "typical TE\nat 3T", ha="center", fontsize=9, color=GREEN)
    axs[1].set_title("BOLD contrast: active minus rest")
    axs[1].set_xlabel("Echo time, TE (ms)")
    axs[1].set_ylabel("Signal difference (% of S₀)".replace("S₀", "$S_0$"))
    axs[1].set_ylim(0, diff.max() * 1.25)
    for a in axs:
        a.set_xlim(0, 120)
    fig.tight_layout(w_pad=3)
    save(fig, "bold-contrast-te")


# --------------------------------------------------------------------------------------
# Part 4
# --------------------------------------------------------------------------------------


def visual_angle():
    fig, ax = plt.subplots(figsize=(WIDTH, 3.1))
    ax.set_aspect("equal")
    ax.axis("off")
    d, s = 10.0, 3.2
    ax.add_patch(Circle((0, 0), 0.45, fc=SURFACE, ec=SECONDARY, lw=1.2))
    ax.add_patch(Circle((0.3, 0), 0.14, fc=INK, ec="none"))
    ax.plot([d, d], [-2.6, 2.6], color=LINE_STRONG, lw=4, solid_capstyle="butt")
    ax.plot([d, d], [-s / 2, s / 2], color=GREEN, lw=5, solid_capstyle="butt")
    for yy in (s / 2, -s / 2):
        ax.plot([0.3, d], [0, yy], color=MUTED, lw=1, ls=(0, (4, 3)))
    ang = np.degrees(np.arctan(s / 2 / (d - 0.3)))
    ax.add_patch(Wedge((0.3, 0), 2.4, -ang, ang, width=None, fc=GREEN, alpha=0.12, ec="none"))
    ax.text(2.95, 0, "θ", fontsize=14, va="center", color=GREEN)
    ax.annotate("", (d, -3.1), (0.3, -3.1), arrowprops=dict(arrowstyle="<->", color=MUTED, lw=1))
    ax.text(d / 2, -3.45, "viewing distance d (eye to screen, via the mirror)", ha="center",
            va="top", fontsize=10, color=SECONDARY)
    ax.annotate("", (d + 0.6, s / 2), (d + 0.6, -s / 2),
                arrowprops=dict(arrowstyle="<->", color=MUTED, lw=1))
    ax.text(d + 0.9, 0, "stimulus\nsize s", va="center", fontsize=10, color=SECONDARY)
    ax.text(d, 2.85, "screen", ha="center", fontsize=9.5, color=MUTED)
    ax.text(15.2, 0.9, r"$\theta = 2\,\arctan\left(\frac{s}{2d}\right)$", fontsize=15,
            color=INK, va="center")
    ax.text(15.2, -0.6, "s = 10 cm, d = 100 cm  →  θ ≈ 5.7°", fontsize=10.5, color=SECONDARY,
            va="center")
    ax.set_xlim(-0.8, 23.5)
    ax.set_ylim(-4.0, 3.2)
    save(fig, "visual-angle")


def retinotopy_stimuli():
    n = 420
    y, x = np.mgrid[-1:1:n * 1j, -1:1:n * 1j]
    r = np.hypot(x, y)
    th = np.arctan2(y, x)
    checker = np.sign(np.sin(12 * th) * np.sin(10 * np.log(r + 0.04)))
    xr = x * np.cos(np.pi / 4) + y * np.sin(np.pi / 4)
    yr = -x * np.sin(np.pi / 4) + y * np.cos(np.pi / 4)
    bar_check = np.sign(np.sin(18 * xr) * np.sin(18 * yr))
    masks = [
        ("Rotating wedge", "maps polar angle", (np.abs(np.angle(np.exp(1j * (th - 0.9)))) < 0.4)
         & (r < 0.95), checker),
        ("Expanding ring", "maps eccentricity", (r > 0.38) & (r < 0.58), checker),
        ("Sweeping bar", "for pRF mapping", (np.abs(xr - 0.2) < 0.13) & (r < 0.95), bar_check),
    ]
    fig, axs = plt.subplots(1, 3, figsize=(WIDTH, 3.5))
    for ax, (title, sub, m, chk) in zip(axs, masks):
        img = np.full((n, n), 0.5)
        img[m] = 0.5 + 0.5 * chk[m]
        img[r >= 0.95] = 0.5
        ax.imshow(img, cmap=GRAYS, vmin=0, vmax=1, extent=(-1, 1, -1, 1), origin="lower")
        ax.add_patch(Circle((0, 0), 0.025, fc=ORANGE, ec=PAPER, lw=0.8))
        ax.set_title(f"{title}\n", loc="center")
        ax.text(0.5, 1.03, sub, transform=ax.transAxes, ha="center", fontsize=9.5, color=MUTED)
        ax.axis("off")
    a0, a1 = 1.4, 2.1
    axs[0].add_patch(FancyArrowPatch((0.86 * np.cos(a0), 0.86 * np.sin(a0)),
                                     (0.86 * np.cos(a1), 0.86 * np.sin(a1)),
                                     connectionstyle="arc3,rad=0.25",
                                     arrowstyle="-|>", mutation_scale=12, color=ORANGE, lw=1.6))
    axs[1].add_patch(FancyArrowPatch((0.49, -0.12), (0.8, -0.12), arrowstyle="-|>",
                                     mutation_scale=12, color=ORANGE, lw=1.6))
    axs[2].add_patch(FancyArrowPatch((0.2 * 0.707 + 0.0, 0.2 * 0.707 - 0.0),
                                     (0.62 * 0.707, 0.62 * 0.707), arrowstyle="-|>",
                                     mutation_scale=12, color=ORANGE, lw=1.6))
    fig.text(0.5, 0.0, "Flickering checkerboards drive early visual cortex strongly. The orange "
             "dot is the fixation point.", ha="center", fontsize=9, color=MUTED)
    fig.tight_layout(w_pad=1)
    save(fig, "retinotopy-stimuli")


# --------------------------------------------------------------------------------------
# Part 5
# --------------------------------------------------------------------------------------


def epi_distortion():
    from nilearn import image

    tmpl = image.resample_img(mf.mni_slices(), target_affine=np.diag([1.5, 1.5, 1.5]),
                              force_resample=True, copy_header=True)
    d = tmpl.get_fdata()
    aff = tmpl.affine
    i = int(round((np.linalg.inv(aff) @ np.array([-4, 0, 0, 1]))[0]))
    sag = d[i].T[::-1]  # rows: z (top = superior), cols: y (left = posterior)
    nz, ny = sag.shape
    zz, yy = np.mgrid[0:nz, 0:ny].astype(float)
    # mm coordinates of each pixel
    ymm = aff[1, 3] + yy * aff[1, 1]
    zmm = aff[2, 3] + (nz - 1 - zz) * aff[2, 2]
    field = np.exp(-(((ymm - 40) / 25) ** 2 + ((zmm + 28) / 18) ** 2))
    shift = 14.0 * field / aff[1, 1]  # pixels along y (phase-encode, anterior-posterior)
    dropout = 1 - 0.92 * np.exp(-(((ymm - 32) / 14) ** 2 + ((zmm + 20) / 10) ** 2))
    epi = gaussian_filter(sag, 1.2)
    warped = map_coordinates(epi, [zz, yy - shift], order=1) * map_coordinates(
        dropout, [zz, yy - shift], order=1)
    corrected = epi * dropout
    outline = gaussian_filter((gaussian_filter(sag, 2) > np.percentile(sag[sag > 0], 45)).astype(float), 2.0)
    fig, axs = plt.subplots(1, 3, figsize=(WIDTH, 3.4))
    for ax, img, title in ((axs[0], sag, "T1w anatomy"), (axs[1], warped, "Uncorrected EPI"),
                           (axs[2], corrected, "After distortion correction")):
        ax.imshow(img, cmap=GRAYS, interpolation="bilinear")
        if img is not sag:
            ax.contour(outline, levels=[0.5], colors=[ORANGE], linewidths=0.9)
        ax.set_title(title, loc="center")
        ax.set_xlim(ny * 0.08, ny * 0.97)
        ax.set_ylim(nz * 0.92, nz * 0.06)
        ax.axis("off")
    def px(y_mm, z_mm):
        return ((y_mm - aff[1, 3]) / aff[1, 1], nz - 1 - (z_mm - aff[2, 3]) / aff[2, 2])

    axs[1].annotate("stretched and\nsignal lost", px(40, -18), px(-5, -55),
                    color=PAPER, fontsize=9, ha="center",
                    arrowprops=dict(arrowstyle="-", color=PAPER, lw=0.8))
    axs[2].annotate("geometry fixed,\ndropout remains", px(32, -18), px(-5, -55), color=PAPER, fontsize=9, ha="center",
                    arrowprops=dict(arrowstyle="-", color=PAPER, lw=0.8))
    fig.text(0.5, 0.0, "Simulated. Orange: brain outline from the anatomical image. "
             "Distortion is worst near the sinuses, along the phase-encoding direction.",
             ha="center", fontsize=9, color=MUTED)
    fig.tight_layout(w_pad=0.8)
    save(fig, "epi-distortion")


def _ribbon_path():
    """Centerline of a folded cortical ribbon: two gyri around one deep, narrow sulcus."""
    pts = np.array([
        (0, 4.0), (1.5, 4.3), (3.0, 4.2), (3.9, 3.6), (4.1, 2.3), (4.1, 0.9), (4.4, 0.25),
        (4.8, 0.2), (5.1, 0.9), (5.1, 2.3), (5.3, 3.6), (6.2, 4.2), (7.7, 4.3), (9.2, 4.0),
    ])
    tck, _ = splprep(pts.T, s=0.02, k=3)
    u = np.linspace(0, 1, 800)
    x, y = splev(u, tck)
    return np.c_[x, y]


def surface_vs_volume():
    c = _ribbon_path()
    tang = np.gradient(c, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    nrm = np.c_[-tang[:, 1], tang[:, 0]]
    half = 0.28
    outer, inner = c + nrm * half, c - nrm * half
    fig, ax = plt.subplots(figsize=(WIDTH, 3.9))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.fill_between([-0.3, 9.5], -0.6, 5.2, color="#eef2f6", lw=0)
    # white matter below the inner surface
    wm = np.r_[inner, [[9.5, inner[-1, 1]], [9.5, -0.6], [-0.3, -0.6], [-0.3, inner[0, 1]]]]
    ax.fill(wm[:, 0], wm[:, 1], color="#f4f3ef", lw=0)
    rib = np.r_[outer, inner[::-1]]
    ax.fill(rib[:, 0], rib[:, 1], color="#cfe3d6", lw=0)
    ax.plot(*outer.T, color=GREEN, lw=1)
    ax.plot(*inner.T, color=GREEN, lw=0.8, alpha=0.6)
    # two points on opposite banks at the same depth
    ia = np.argmin(np.abs(c[:400, 1] - 1.6) + 10 * (c[:400, 0] < 3.5))
    ib = 400 + np.argmin(np.abs(c[400:, 1] - 1.6) + 10 * (c[400:, 0] > 5.6))
    pa, pb = c[ia], c[ib]
    seg = c[ia : ib + 1]
    geo = np.sum(np.linalg.norm(np.diff(seg, axis=0), axis=1))
    euc = np.linalg.norm(pb - pa)
    ax.plot(*seg.T, color=ORANGE, lw=2.2)
    ax.plot(*np.c_[pa, pb], color=BLUE, lw=1.8, ls=(0, (3, 2)))
    for p in (pa, pb):
        ax.plot(*p, "o", ms=7, color=INK, mec=PAPER, mew=1.5, zorder=5)
    mid = (pa + pb) / 2
    ax.add_patch(Circle(mid, 1.25, fc="none", ec=PLUM, lw=1.3, ls=(0, (2, 2))))
    scale = 4.0 / euc  # pretend the banks are 4 mm apart through the sulcus
    ax.text(mid[0] + 1.45, mid[1] + 0.95, f"{euc * scale:.0f} mm apart in the volume",
            color=BLUE, fontsize=10)
    ax.text(mid[0] + 1.45, mid[1] + 0.45, f"~{geo * scale:.0f} mm apart along the cortex",
            color=ORANGE, fontsize=10)
    ax.text(mid[0] + 1.45, mid[1] - 0.05, "a 3D smoothing kernel or searchlight\nmixes both banks",
            color=PLUM, fontsize=10, va="top")
    ax.text(0.2, 4.75, "CSF", color=MUTED, fontsize=9.5)
    ax.text(1.0, 3.25, "gray matter", color=GREEN, fontsize=9.5)
    ax.text(0.2, 0.0, "white matter", color=MUTED, fontsize=9.5)
    ax.set_xlim(-0.3, 9.5)
    ax.set_ylim(-0.6, 5.2)
    save(fig, "surface-vs-volume")


# --------------------------------------------------------------------------------------
# Part 6
# --------------------------------------------------------------------------------------


def fixation_qc():
    rng = np.random.default_rng(14)
    good = rng.normal(0, 0.3, (900, 2))
    poor = np.r_[rng.normal(0, 0.7, (600, 2)), rng.normal((2.8, 1.6), 0.4, (150, 2)),
                 rng.normal((-2.2, -1.4), 0.45, (150, 2))]
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 4.0), sharey=True)
    for ax, g, title in ((axs[0], good, "Good fixation"), (axs[1], poor, "Poor fixation")):
        inside = (np.hypot(*g.T) <= 1.0).mean() * 100
        ax.scatter(*g.T, s=6, color=BLUE, alpha=0.35, lw=0)
        ax.add_patch(Circle((0, 0), 1.0, fc="none", ec=ORANGE, lw=1.4))
        ax.plot(0, 0, "+", color=INK, ms=10, mew=1.5)
        ax.set_title(f"{title}: {inside:.0f}% of samples within 1°")
        ax.set_xlim(-5, 5)
        ax.set_ylim(-4, 4)
        ax.set_aspect("equal")
        ax.set_xlabel("Horizontal gaze (°)")
        ax.axhline(0, color=LINE, lw=0.8, zorder=0)
        ax.axvline(0, color=LINE, lw=0.8, zorder=0)
    axs[0].set_ylabel("Vertical gaze (°)")
    note(axs[1], 2.8, 3.1, "looking at the stimuli", ha="center")
    fig.text(0.5, -0.02, "Simulated gaze samples during one run. Orange circle: 1° fixation "
             "window around the fixation point.", ha="center", fontsize=9, color=MUTED)
    fig.tight_layout(w_pad=2)
    save(fig, "fixation-qc")


def split_half_reliability():
    rng = np.random.default_rng(3)
    vis = np.clip(rng.normal(0.5, 0.17, 3000), -0.3, 0.95)
    other = np.clip(rng.normal(0.02, 0.1, 6000), -0.4, 0.6)
    bins = np.linspace(-0.4, 1, 57)
    fig, ax = plt.subplots(figsize=(WIDTH * 0.75, 3.4))
    for v, col, lab, xy in ((other, MUTED, "voxels outside\nvisual cortex", (0.02, 0.88)),
                            (vis, GREEN, "early visual\ncortex", (0.8, 0.7))):
        h, _ = np.histogram(v, bins, density=True)
        ax.fill_between(bins[:-1], h, step="post", color=col, alpha=0.15, lw=0)
        ax.step(bins[:-1], h, where="post", color=col, lw=1.6)
        ax.text(*xy, lab, transform=ax.transAxes, color=col if col != MUTED else SECONDARY,
                fontsize=10, weight="medium", va="top")
    ax.axvline(0, color=LINE_STRONG, lw=0.8)
    ax.set_xlabel("Split-half reliability (r between odd and even repetitions)")
    ax.set_ylabel("Density")
    ax.set_yticks([])
    ax.set_title("What a healthy dataset looks like (simulated)")
    save(fig, "split-half-reliability")


# --------------------------------------------------------------------------------------
# Part 7
# --------------------------------------------------------------------------------------


def prf_model():
    rng = np.random.default_rng(6)
    tr = 1.5
    n_steps = 20
    pos = np.linspace(-9, 9, n_steps)
    dirs = [(1, 0), (0, 1), (-1, 0), (0, -1)]
    x0, y0, sig = 3.0, 2.0, 1.5
    g = np.linspace(-10, 10, 201)
    X, Y = np.meshgrid(g, g)
    prf = np.exp(-((X - x0) ** 2 + (Y - y0) ** 2) / (2 * sig ** 2))
    drive = []
    for dx, dy in dirs:
        for p in pos:
            proj = X * dx + Y * dy
            m = (np.abs(proj - p) < 1.0) & (np.hypot(X, Y) < 10)
            drive.append((prf * m).sum())
        drive.extend([0] * 6)  # blank between sweeps
    drive = np.array(drive) / max(drive)
    hrf = spm_hrf(np.arange(0, 30, tr))
    pred = np.convolve(drive, hrf)[: len(drive)]
    pred /= pred.max()
    data = pred + rng.normal(0, 0.12, len(pred))
    t = np.arange(len(pred)) * tr
    fig = plt.figure(figsize=(WIDTH, 3.6))
    gs = fig.add_gridspec(1, 2, width_ratios=[1, 2.1], wspace=0.25)
    a0 = fig.add_subplot(gs[0])
    a0.add_patch(Circle((0, 0), 10, fc=SURFACE, ec=LINE_STRONG, lw=0.9))
    a0.add_patch(plt.Rectangle((2.2, -10), 2, 20, fc=INK, alpha=0.18, ec="none"))
    for k, a in ((1, 0.25), (2, 0.12)):
        a0.add_patch(Circle((x0, y0), k * sig, fc=ORANGE, alpha=a, ec=ORANGE, lw=1))
    a0.annotate("", (8.5, -8.0), (4.6, -8.0), arrowprops=dict(arrowstyle="-|>", color=MUTED))
    a0.text(4.6, -9.6, "bar sweeps", fontsize=9, color=MUTED)
    a0.plot(0, 0, "+", color=INK, ms=8)
    a0.text(x0, y0 + 2 * sig + 0.6, "pRF", ha="center", color=ORANGE, fontsize=10,
            weight="medium")
    a0.set_xlim(-10.5, 10.5)
    a0.set_ylim(-10.5, 10.5)
    a0.set_aspect("equal")
    a0.axis("off")
    a0.set_title("Visual field (±10°)", loc="center")
    a1 = fig.add_subplot(gs[1])
    a1.plot(t, data, "o", ms=3, color=BLUE, alpha=0.6, label="measured (simulated)")
    a1.plot(t, pred, color=ORANGE, lw=1.8, label="pRF model prediction")
    a1.set_xlabel("Time (s)")
    a1.set_yticks([])
    a1.set_ylabel("BOLD")
    a1.legend(loc="upper right", ncol=2, bbox_to_anchor=(1, 1.12))
    a1.set_xlim(0, t[-1])
    for k, lab in enumerate(("→", "↑", "←", "↓")):
        a1.text((k * (n_steps + 6) + n_steps / 2) * tr, -0.42, f"bar moving {lab}",
                ha="center", fontsize=9, color=MUTED)
    a1.set_ylim(-0.55, 1.35)
    fig.text(0.02, -0.04, f"Best fit: x = {x0:.0f}°, y = {y0:.0f}°, σ = {sig}°. The voxel only "
             "responds when the bar crosses its pRF.", fontsize=9, color=MUTED)
    save(fig, "prf-model")


AZIM = 0


def localizer_rois():
    from matplotlib.colors import to_rgb
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    from nilearn import datasets, surface

    fs = datasets.fetch_surf_fsaverage("fsaverage")
    pial = np.asarray(surface.load_surf_mesh(fs["pial_left"]).coordinates)
    infl = surface.load_surf_mesh(fs["infl_left"])
    coords, faces = np.asarray(infl.coordinates), np.asarray(infl.faces)
    sulc = surface.load_surf_data(fs["sulc_left"])
    blobs = [("FFA", (-40, -52, -20), 6.5, ORANGE), ("PPA", (-27, -46, -9), 6.5, BLUE),
             ("OFA", (-40, -78, -12), 5.5, ORANGE)]
    base = np.where(sulc > 0, 0.62, 0.8)
    rgb = np.repeat(base[:, None], 3, axis=1) * np.array(to_rgb("#f4f3ef"))
    for _, c, s, col in blobs:
        w = np.exp(-np.sum((pial - np.array(c)) ** 2, axis=1) / (2 * s ** 2))
        w = np.clip((w - 0.25) / 0.75, 0, 1)
        rgb = rgb * (1 - w[:, None] * 0.9) + np.array(to_rgb(col)) * w[:, None] * 0.9
    fcol = rgb[faces].mean(axis=1)
    fig = plt.figure(figsize=(WIDTH, 3.6))
    ax = fig.add_axes([-0.02, -0.55, 0.78, 2.1], projection="3d")
    pc = Poly3DCollection(coords[faces], facecolors=fcol, edgecolors="none", linewidths=0,
                          antialiased=False)
    pc.set_rasterized(True)
    ax.add_collection3d(pc)
    for k, lo, hi in zip(range(3), coords.min(0), coords.max(0)):
        getattr(ax, "set_" + "xyz"[k] + "lim")(lo, hi)
    ax.set_box_aspect(np.ptp(coords, axis=0))
    ax.view_init(elev=-90, azim=AZIM)
    ax.set_proj_type("ortho")
    ax.set_axis_off()
    ax.set_in_layout(False)
    from mpl_toolkits.mplot3d import proj3d

    fig.canvas.draw()
    lab_ax = fig.add_axes([0, 0, 1, 1])
    lab_ax.axis("off")
    lab_ax.set_xlim(0, 1)
    lab_ax.set_ylim(0, 1)
    for name, c, _, col in blobs:
        v = np.argmin(np.sum((pial - np.array(c)) ** 2, axis=1))
        x, y, _ = proj3d.proj_transform(*coords[v], ax.get_proj())
        fx, fy = fig.transFigure.inverted().transform(ax.transData.transform((x, y)))
        ty = 0.92 if name != "PPA" else 0.1
        lab_ax.annotate(name, (fx, fy), (fx, ty), color=col, fontsize=11, weight="medium",
                        ha="center", va="center",
                        arrowprops=dict(arrowstyle="-", color=col, lw=0.9, shrinkB=6))
    lab_ax.text(0.78, 0.8, "Left hemisphere,\nventral view", color=INK, fontsize=11.5,
                weight="medium", va="top")
    lab_ax.text(0.78, 0.62, "faces > objects (orange)\nscenes > objects (blue)", color=MUTED,
                fontsize=9.5, va="top")
    lab_ax.text(0.78, 0.06, "Simulated localizer contrasts\non an inflated surface.",
                color=MUTED, fontsize=9)
    lab_ax.text(0.02, 0.04, "posterior ←", color=MUTED, fontsize=9)
    lab_ax.text(0.7, 0.04, "→ anterior", ha="right", color=MUTED, fontsize=9)
    save(fig, "localizer-rois", tight=False)


def fdr_thresholding():
    from scipy.stats import norm

    rng = np.random.default_rng(30)
    n = 140
    yy, xx = np.mgrid[0:n, 0:n]
    mask = ((xx - n / 2) / (n * 0.44)) ** 2 + ((yy - n / 2) / (n * 0.48)) ** 2 < 1
    signal = np.zeros((n, n))
    for cx, cy, a in ((45, 50, 4.5), (95, 60, 3.8), (70, 100, 4.2)):
        signal += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * 6.0 ** 2))
    noise = gaussian_filter(rng.normal(0, 1, (n, n)), 1.2)
    noise /= noise[mask].std()
    z = signal + noise
    true = signal > 0.5
    p = norm.sf(z)
    pm = p[mask]
    order = np.sort(pm)
    m = len(pm)
    ok = order <= 0.05 * np.arange(1, m + 1) / m
    thr_fdr = order[ok].max() if ok.any() else 0
    maps = [("Unthresholded z-map", None), ("p < 0.01, uncorrected", 0.01),
            ("FDR q < 0.05", thr_fdr)]
    fig, axs = plt.subplots(1, 3, figsize=(WIDTH, 3.6))
    for ax, (title, thr) in zip(axs, maps):
        bg = np.where(mask, 0.88, 1.0)
        ax.imshow(np.where(mask, 1, np.nan), cmap=plt.matplotlib.colors.ListedColormap([SURFACE]))
        if thr is None:
            im = np.ma.masked_where(~mask, z)
            ax.imshow(im, cmap=DIV, vmin=-5, vmax=5)
            sub = "signal plus smooth noise"
        else:
            sig = (p <= thr) & mask
            fp = (sig & ~true).sum()
            ax.imshow(np.ma.masked_where(~sig, z), cmap=plt.matplotlib.colors.ListedColormap(
                [ORANGE]))
            sub = f"{sig.sum()} voxels, {fp} outside the true effects"
        ax.contour(true.astype(float), levels=[0.5], colors=[INK], linewidths=0.7,
                   linestyles="dashed")
        ax.set_title(title, loc="center")
        ax.text(0.5, -0.06, sub, transform=ax.transAxes, ha="center", va="top", fontsize=9,
                color=MUTED)
        ax.axis("off")
    fig.text(0.5, -0.04, "Simulated 2D slice with three true effects (dashed outlines).",
             ha="center", fontsize=9, color=MUTED)
    fig.tight_layout(w_pad=1)
    save(fig, "fdr-thresholding")


# --------------------------------------------------------------------------------------
# Part 8
# --------------------------------------------------------------------------------------


def cross_validation_folds():
    n = 6
    fig, ax = plt.subplots(figsize=(WIDTH * 0.8, 3.4))
    for f in range(n):
        for r in range(n):
            test = f == r
            ax.add_patch(plt.Rectangle((r + 0.06, n - 1 - f + 0.1), 0.88, 0.8,
                                       fc=ORANGE if test else "#cfe3d6",
                                       ec="none"))
        ax.text(-0.15, n - 1 - f + 0.5, f"Fold {f + 1}", ha="right", va="center", fontsize=10,
                color=SECONDARY)
    for r in range(n):
        ax.text(r + 0.5, n + 0.2, f"{r + 1}", ha="center", fontsize=10, color=SECONDARY)
    ax.text(-0.15, n + 0.2, "Run", ha="right", fontsize=10, color=SECONDARY)
    ax.add_patch(plt.Rectangle((n + 0.4, 3.6), 0.4, 0.35, fc="#cfe3d6", ec="none"))
    ax.text(n + 0.95, 3.78, "train", va="center", fontsize=10)
    ax.add_patch(plt.Rectangle((n + 0.4, 3.0), 0.4, 0.35, fc=ORANGE, ec="none"))
    ax.text(n + 0.95, 3.18, "test", va="center", fontsize=10)
    ax.text(n + 0.4, 2.4, "Accuracy is averaged\nover the six folds.", va="top", fontsize=9.5,
            color=MUTED)
    ax.set_xlim(-1.2, n + 2.9)
    ax.set_ylim(-0.2, n + 0.6)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("Leave-one-run-out cross-validation")
    save(fig, "cross-validation-folds")


def encoding_noise_ceiling():
    rois = ["V1", "V2", "V3", "hV4", "LOC", "FFA", "PPA"]
    ceiling = np.array([0.72, 0.7, 0.66, 0.6, 0.58, 0.55, 0.57])
    early = np.array([0.52, 0.48, 0.42, 0.33, 0.24, 0.17, 0.2])
    late = np.array([0.3, 0.32, 0.35, 0.39, 0.45, 0.43, 0.44])
    x = np.arange(len(rois))
    w = 0.34
    fig, ax = plt.subplots(figsize=(WIDTH, 3.7))
    ax.bar(x - w / 2 - 0.01, early, w, color=GREEN, label="early-layer features")
    ax.bar(x + w / 2 + 0.01, late, w, color=BLUE, label="late-layer features")
    for xi, c in zip(x, ceiling):
        ax.plot([xi - 0.42, xi + 0.42], [c, c], color=INK, lw=1.6)
    ax.plot([], [], color=INK, lw=1.6, label="noise ceiling")
    ax.set_xticks(x)
    ax.set_xticklabels(rois)
    ax.set_ylabel("Prediction accuracy (r)")
    ax.set_ylim(0, 0.85)
    ax.legend(loc="upper right", ncol=3, bbox_to_anchor=(1, 1.13))
    ax.grid(True, axis="y")
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", length=0)
    ax.set_title("Encoding model accuracy on held-out images (simulated)", pad=26)
    save(fig, "encoding-noise-ceiling")


def rsa_permutation():
    rng = np.random.default_rng(2)
    null = rng.normal(0, 0.065, 10000)
    obs = 0.21
    p = (np.sum(null >= obs) + 1) / (len(null) + 1)
    fig, ax = plt.subplots(figsize=(WIDTH * 0.75, 3.3))
    ax.hist(null, bins=60, color=MUTED, alpha=0.35, histtype="stepfilled")
    ax.hist(null, bins=60, color=MUTED, histtype="step", lw=1)
    ax.axvline(obs, color=ORANGE, lw=2)
    ax.text(obs + 0.01, ax.get_ylim()[1] * 0.9, f"observed r = {obs}\np = {p:.4f}",
            color=INK, fontsize=10, va="top")
    ax.text(-0.27, ax.get_ylim()[1] * 0.9, "null distribution:\n10,000 label permutations",
            color=SECONDARY, fontsize=10, va="top")
    ax.set_xlabel("Correlation between neural and model RDM")
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xlim(-0.3, 0.32)
    ax.set_title("Permutation test for an RDM correlation (simulated)")
    save(fig, "rsa-permutation")


FIGURES = {
    "bold-contrast-te": bold_contrast_te,
    "visual-angle": visual_angle,
    "retinotopy-stimuli": retinotopy_stimuli,
    "epi-distortion": epi_distortion,
    "surface-vs-volume": surface_vs_volume,
    "fixation-qc": fixation_qc,
    "split-half-reliability": split_half_reliability,
    "prf-model": prf_model,
    "localizer-rois": localizer_rois,
    "fdr-thresholding": fdr_thresholding,
    "cross-validation-folds": cross_validation_folds,
    "encoding-noise-ceiling": encoding_noise_ceiling,
    "rsa-permutation": rsa_permutation,
}
