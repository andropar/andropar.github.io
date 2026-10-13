"""Generate the figures for the fMRI crash course blog series.

All figures share one style that matches the site's v2 design system (paper background,
ink text, Inter, a validated categorical palette). Text is converted to paths so the SVGs
render identically when embedded with <img>.

Usage:
    python make_figures.py                # all figures
    python make_figures.py hrf-curve rdm-matrix
    INTER_DIR=/path/to/inter python make_figures.py

Most figures use simulated data and are labeled as illustrative in the posts. Brain images
use the MNI152 template and fsaverage surfaces shipped with nilearn.
"""

import logging
import os
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle  # noqa: E402
from scipy.ndimage import gaussian_filter, gaussian_filter1d  # noqa: E402
from scipy.stats import gamma  # noqa: E402

log = logging.getLogger("fmri-figures")

OUT = Path(__file__).resolve().parents[2] / "public" / "blog" / "fmri-diagrams"

# Design tokens (src/styles/v2.css, light theme)
PAPER = "#fbfaf8"
SURFACE = "#f1f0ec"
INK = "#1c1d1a"
SECONDARY = "#4d4f49"
MUTED = "#6b6d66"
LINE = "#e3e1db"
LINE_STRONG = "#cbc8c0"
ACCENT = "#34604a"

# Categorical order validated with the dataviz palette checker (light, surface PAPER)
GREEN, BLUE, ORANGE, PLUM, OCHRE = "#1f7a55", "#3c66b8", "#d96a2b", "#a8479e", "#9a7612"
CAT = [GREEN, BLUE, ORANGE, PLUM, OCHRE]

SEQ = LinearSegmentedColormap.from_list("seq", [PAPER, "#cfe3d6", "#6fa98a", GREEN, "#123d2a"])
DIV = LinearSegmentedColormap.from_list("div", [BLUE, "#9db1d8", "#ecebe6", "#ecb08c", ORANGE])
GRAYS = LinearSegmentedColormap.from_list("grays", ["#141513", "#f4f3ef"])

WIDTH = 9.2  # inches; ~880px when rendered, the article column is 920px


def setup_style():
    inter_dir = os.environ.get(
        "INTER_DIR",
        "/private/tmp/claude-503/-Users-jrothadmin-repos-andropar-github-io/"
        "abe97f1d-87db-4a3d-b11b-cd3f996fb736/scratchpad/fonts/inter/extras/ttf",
    )
    family = "DejaVu Sans"
    if Path(inter_dir).is_dir():
        for f in Path(inter_dir).glob("Inter-*.ttf"):
            font_manager.fontManager.addfont(str(f))
        family = "Inter"
    else:
        log.warning("Inter not found at %s, falling back to DejaVu Sans", inter_dir)
    plt.rcParams.update(
        {
            "font.family": family,
            "font.size": 10.5,
            "axes.titlesize": 11.5,
            "axes.titleweight": "medium",
            "axes.titlelocation": "left",
            "axes.titlepad": 10,
            "axes.labelsize": 10.5,
            "axes.labelcolor": SECONDARY,
            "axes.edgecolor": LINE_STRONG,
            "axes.linewidth": 0.8,
            "axes.facecolor": PAPER,
            "figure.facecolor": PAPER,
            "savefig.facecolor": PAPER,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": False,
            "grid.color": LINE,
            "grid.linewidth": 0.8,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "xtick.labelcolor": MUTED,
            "ytick.labelcolor": MUTED,
            "xtick.major.size": 3,
            "ytick.major.size": 3,
            "xtick.major.width": 0.8,
            "ytick.major.width": 0.8,
            "text.color": INK,
            "legend.frameon": False,
            "legend.fontsize": 10,
            "lines.linewidth": 2,
            "lines.solid_capstyle": "round",
            "svg.fonttype": "path",
            "svg.hashsalt": "fmri-crash-course",
            "path.simplify": True,
        }
    )


def save(fig, name, png=False, tight=True):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / (name + (".png" if png else ".svg"))
    kw = {"dpi": 200} if png else {"metadata": {"Date": None}, "dpi": 200}
    bb = "tight" if tight else None
    fig.savefig(path, bbox_inches=bb, pad_inches=0.25, **kw)
    preview = os.environ.get("PREVIEW_DIR")
    if preview:
        fig.savefig(Path(preview) / f"{name}.png", bbox_inches=bb, pad_inches=0.25, dpi=90)
    plt.close(fig)
    log.info("wrote %s", path.relative_to(OUT.parents[2]))


def spm_hrf(t):
    """SPM canonical double-gamma HRF (peak ~5 s, undershoot ~15 s), unit peak."""
    h = gamma.pdf(t, 6) - gamma.pdf(t, 16) / 6.0
    return h / h.max()


def note(ax, x, y, text, **kw):
    kw.setdefault("color", MUTED)
    kw.setdefault("fontsize", 9.5)
    ax.text(x, y, text, **kw)


def box(ax, x, y, w, h, text, fill=SURFACE, edge=LINE_STRONG, color=INK, size=10.5, sub=None,
        weight="medium"):
    ax.add_patch(
        FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.08",
                       fc=fill, ec=edge, lw=0.9)
    )
    if sub:
        ax.text(x + w / 2, y + h * 0.62, text, ha="center", va="center", fontsize=size,
                color=color, weight=weight)
        ax.text(x + w / 2, y + h * 0.3, sub, ha="center", va="center", fontsize=size - 1.5,
                color=MUTED if color == INK else color)
    else:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=size,
                color=color, weight=weight)


def arrow(ax, p0, p1, color=MUTED, lw=1.2, style="-|>", ms=10, **kw):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=style, mutation_scale=ms, color=color,
                                 lw=lw, shrinkA=0, shrinkB=0, **kw))


def mni_slices():
    """MNI152 T1 template as a numpy array plus its affine (cached by nilearn)."""
    from nilearn import datasets

    img = datasets.load_mni152_template(resolution=1)
    return img


# --------------------------------------------------------------------------------------
# Part 1
# --------------------------------------------------------------------------------------


def pipeline_overview():
    parts = [
        ("1", "Introduction", "what the series covers"),
        ("2", "Neuroimaging", "why image the brain"),
        ("3", "MRI basics", "spins, BOLD, HRF"),
        ("4", "Recording", "parameters, design"),
        ("5", "Preprocessing", "BIDS, fMRIPrep"),
        ("6", "Quality", "motion, artifacts"),
        ("7", "GLM", "ROIs, single trials"),
        ("8", "Multivariate", "decoding, RSA"),
    ]
    fig, ax = plt.subplots(figsize=(WIDTH, 3.1))
    ax.set_xlim(0, 4)
    ax.set_ylim(0.05, 2)
    ax.axis("off")
    w, h = 0.9, 0.72
    for i, (n, title, sub) in enumerate(parts):
        row, col = divmod(i, 4)
        x = col + (1 - w) / 2
        y = 1.15 - row * 1.0
        hi = n == "1"
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.06",
                                    fc="#e4efe8" if hi else SURFACE,
                                    ec=GREEN if hi else LINE_STRONG, lw=0.9))
        ax.text(x + 0.08, y + h - 0.15, f"Part {n}", fontsize=9, color=GREEN, va="center")
        ax.text(x + 0.08, y + h * 0.47, title, fontsize=11, weight="medium", va="center")
        ax.text(x + 0.08, y + 0.15, sub, fontsize=9, color=MUTED, va="center")
        if col < 3:
            arrow(ax, (x + w + 0.005, y + h / 2), (x + 1 - 0.005, y + h / 2), ms=7)
    save(fig, "pipeline-overview")


# --------------------------------------------------------------------------------------
# Part 2
# --------------------------------------------------------------------------------------


def visual_hierarchy():
    stages = [
        ("Retina", "light to spikes", 0.6),
        ("LGN", "thalamic relay", 0.8),
        ("V1", "edges, orientation", 1.0),
        ("V2", "contours, texture", 1.6),
        ("V4", "shape, color", 2.6),
        ("IT", "objects, faces", 4.2),
    ]
    fig, ax = plt.subplots(figsize=(WIDTH, 2.9))
    ax.set_xlim(-0.2, 6.2)
    ax.set_ylim(-1.35, 1.35)
    ax.axis("off")
    for i, (name, sub, rf) in enumerate(stages):
        x = i + 0.5
        fill = "#e4efe8" if name in ("V1", "V2", "V4", "IT") else SURFACE
        ax.add_patch(FancyBboxPatch((x - 0.38, 0.35), 0.76, 0.5,
                                    boxstyle="round,pad=0,rounding_size=0.07",
                                    fc=fill, ec=LINE_STRONG, lw=0.9))
        ax.text(x, 0.6, name, ha="center", va="center", fontsize=11.5, weight="medium")
        ax.text(x, 0.12, sub, ha="center", va="center", fontsize=9.2, color=MUTED)
        # receptive field size cartoon
        ax.add_patch(Circle((x, -0.62), 0.085 * rf, fc="none", ec=GREEN, lw=1.4))
        ax.plot([x], [-0.62], marker="o", ms=2.5, color=GREEN)
        if i < len(stages) - 1:
            arrow(ax, (x + 0.4, 0.6), (x + 0.6, 0.6), ms=9)
    ax.text(0.12, -0.62, "receptive\nfield size", fontsize=9, color=MUTED, va="center",
            ha="right")
    ax.text(3.0, -1.22, "Feedforward simplification: every stage also sends feedback to the "
            "ones before it.", ha="center", fontsize=9, color=MUTED)
    save(fig, "visual-hierarchy")


def visual_streams():
    from nilearn import datasets, surface
    from mpl_toolkits.mplot3d import proj3d

    fs = datasets.fetch_surf_fsaverage("fsaverage")
    mesh = surface.load_surf_mesh(fs["pial_left"])
    coords, faces = np.asarray(mesh.coordinates), np.asarray(mesh.faces)
    sulc = surface.load_surf_data(fs["sulc_left"])

    fig = plt.figure(figsize=(WIDTH, 4.3))
    ax = fig.add_axes([0.12, -0.2, 0.86, 1.4], projection="3d")
    tri = coords[faces]
    shade = sulc[faces].mean(axis=1)
    shade = (shade - shade.min()) / (shade.max() - shade.min())
    # sulcal depth sets the base tone, a light source adds relief
    from matplotlib.colors import LightSource
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection

    nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    light = np.array([-0.8, 0.25, 0.55])
    light /= np.linalg.norm(light)
    lam = np.clip(nrm @ light, 0, 1)
    tone = 0.62 + 0.3 * lam - 0.22 * shade
    cols = GRAYS(np.clip(tone, 0, 1))
    pc = Poly3DCollection(tri, facecolors=cols, edgecolors="none", linewidths=0, antialiased=False)
    pc.set_rasterized(True)  # ~300k triangles; vector output would be ~50 MB
    ax.add_collection3d(pc)
    ax.set_xlim(coords[:, 0].min(), coords[:, 0].max())
    ax.set_ylim(coords[:, 1].min(), coords[:, 1].max())
    ax.set_zlim(coords[:, 2].min(), coords[:, 2].max())
    ax.set_box_aspect(np.ptp(coords, axis=0))
    ax.view_init(elev=0, azim=180)
    ax.set_axis_off()
    ax.set_proj_type("ortho")
    ax.set_facecolor(PAPER)
    ax.set_in_layout(False)  # keep the oversized 3D axes out of the tight bbox
    fig.canvas.draw()

    def p2(xyz):
        x, y, _ = proj3d.proj_transform(*xyz, ax.get_proj())
        return ax.transData.inverted().inverted().transform((x, y))

    def fig_xy(xyz):
        disp = p2(xyz)
        return fig.transFigure.inverted().transform(disp)

    # Approximate MNI-like coordinates on the lateral left hemisphere
    occ = (-30, -98, 2)
    mt = (-46, -72, 4)
    par = (-32, -62, 56)
    it = (-50, -38, -22)
    ax2 = fig.add_axes([0, 0, 1, 1])
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.axis("off")
    o, m, p, t = (fig_xy(c) for c in (occ, mt, par, it))
    for (a, b, col) in ((o, p, BLUE), (o, t, ORANGE)):
        ax2.add_patch(FancyArrowPatch(a, b, connectionstyle="arc3,rad=-0.18" if col == BLUE
                                      else "arc3,rad=0.22",
                                      arrowstyle="simple,head_width=1.6,head_length=1.6,"
                                      "tail_width=0.6", mutation_scale=9, color=col,
                                      alpha=0.85, lw=0))
    for xy, lab, dx, dy in ((o, "early visual\ncortex (V1)", 0.065, -0.02),
                            (m, "MT+", -0.035, 0.03), (p, "posterior parietal", 0.0, 0.04),
                            (t, "inferotemporal", 0.0, -0.065)):
        ax2.plot(*xy, "o", ms=6, color=INK, mec=PAPER, mew=1.5)
        ax2.text(xy[0] + dx, xy[1] + dy, lab, ha="center", va="center", fontsize=10, color=INK,
                 bbox=dict(boxstyle="round,pad=0.2", fc=PAPER, ec="none", alpha=0.85))
    ax2.text(0.02, 0.86, "Dorsal stream", color=BLUE, fontsize=11.5, weight="medium")
    ax2.text(0.02, 0.8, "where / how: space, motion, action", color=MUTED, fontsize=9.5)
    ax2.text(0.02, 0.2, "Ventral stream", color=ORANGE, fontsize=11.5, weight="medium")
    ax2.text(0.02, 0.14, "what: objects, faces, scenes", color=MUTED, fontsize=9.5)
    ax2.text(0.98, 0.02, "left hemisphere, lateral view (fsaverage)", ha="right", color=MUTED,
             fontsize=9)
    save(fig, "visual-streams", tight=False)


def spatial_temporal_tradeoff():
    # Rough ranges: (label, time range in s, spatial range in mm, color, label position)
    mods = [
        ("EEG", (1e-3, 30), (20, 100), BLUE, (1.3e-3, 55)),
        ("MEG", (1e-3, 30), (5, 20), PLUM, (1.3e-3, 10.5)),
        ("fMRI", (0.5, 3000), (0.5, 4), GREEN, (0.75, 1.5)),
        ("ECoG", (1e-3, 3000), (1, 5), ORANGE, None),
        ("Single units, LFP", (1e-4, 30), (0.02, 0.3), OCHRE, (1.4e-4, 0.075)),
    ]
    fig, ax = plt.subplots(figsize=(WIDTH * 0.8, 4.6))
    for name, (t0, t1), (s0, s1), col, lab in mods:
        if name == "ECoG":
            continue
        ax.add_patch(FancyBboxPatch((t0, s0), t1 - t0, s1 - s0, boxstyle="square,pad=0",
                                    fc=col, alpha=0.13, ec="none"))
        ax.add_patch(FancyBboxPatch((t0, s0), t1 - t0, s1 - s0, boxstyle="square,pad=0",
                                    fc="none", ec=col, lw=1.4))
        ax.text(*lab, name, color=INK, fontsize=10.5, weight="medium", va="center")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlim(5e-5, 1e4)
    ax.set_ylim(8e-3, 300)
    ax.set_xticks([1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100, 1000])
    ax.set_xticklabels(["0.1 ms", "1 ms", "10 ms", "100 ms", "1 s", "10 s", "100 s", "1000 s"])
    ax.set_yticks([0.01, 0.1, 1, 10, 100])
    ax.set_yticklabels(["10 µm", "0.1 mm", "1 mm", "1 cm", "10 cm"])
    ax.set_xlabel("Temporal resolution")
    ax.set_ylabel("Spatial resolution")
    ax.minorticks_off()
    ax.grid(True, which="major")
    ax.set_axisbelow(True)
    note(ax, 8e3, 1.2e-2, "Rough ranges", ha="right", va="bottom")
    save(fig, "spatial-temporal-tradeoff")


# --------------------------------------------------------------------------------------
# Part 3
# --------------------------------------------------------------------------------------


def proton_alignment():
    rng = np.random.default_rng(3)
    n = 42
    gx, gy = np.meshgrid(np.linspace(0, 1, 7), np.linspace(0, 1, 6))
    pos = np.c_[gx.ravel(), gy.ravel()][:n] + rng.normal(0, 0.02, (n, 2))
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 3.9))
    for k, ax in enumerate(axs):
        ang = rng.uniform(0, 2 * np.pi, n)
        if k == 1:
            # tiny bias toward +z: shift a few spins up so the excess is visible
            ang[:6] = np.pi / 2 + rng.normal(0, 0.15, 6)
        for (x, y), a in zip(pos, ang):
            ax.annotate("", xy=(x + 0.055 * np.cos(a), y + 0.055 * np.sin(a)),
                        xytext=(x - 0.055 * np.cos(a), y - 0.055 * np.sin(a)),
                        arrowprops=dict(arrowstyle="-|>", color=SECONDARY, lw=1.1,
                                        mutation_scale=7))
        ax.set_xlim(-0.12, 1.12)
        ax.set_ylim(-0.12, 1.12)
        ax.set_aspect("equal")
        ax.axis("off")
    axs[0].set_title("No field: random orientations,\nno net magnetization")
    axs[1].set_title("Inside the scanner: a tiny excess\naligns with the field $B_0$")
    # B0 and net magnetization arrows
    axs[1].annotate("", xy=(1.22, 1.0), xytext=(1.22, 0.0),
                    arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.2, mutation_scale=12),
                    annotation_clip=False)
    axs[1].text(1.27, 0.5, "$B_0$", color=MUTED, fontsize=11, va="center")
    axs[1].annotate("", xy=(0.5, 0.86), xytext=(0.5, 0.14),
                    arrowprops=dict(arrowstyle="simple,head_width=1.2,head_length=1.0,"
                                    "tail_width=0.4", color=GREEN, alpha=0.85,
                                    mutation_scale=20))
    axs[1].text(0.5, -0.1, "net magnetization", color=GREEN, fontsize=10, ha="center",
                weight="medium")
    fig.text(0.5, -0.01, "Exaggerated for visibility: at 3T only a few spins per million make up "
             "the excess.", ha="center", color=MUTED, fontsize=9)
    fig.tight_layout(w_pad=3)
    save(fig, "proton-alignment")


def t1_t2_curves():
    # Approximate 3T values (ms)
    tissues = [("White matter", 830, 75, GREEN), ("Gray matter", 1330, 95, BLUE),
               ("CSF", 4000, 2000, ORANGE)]
    t1 = np.linspace(0, 5000, 400)
    t2 = np.linspace(0, 400, 400)
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 3.6))
    for name, T1, T2, col in tissues:
        axs[0].plot(t1, 1 - np.exp(-t1 / T1), color=col)
        axs[1].plot(t2, np.exp(-t2 / T2), color=col)
    axs[0].set_title("T1 recovery (longitudinal)")
    axs[1].set_title("T2 decay (transverse)")
    axs[0].set_xlabel("Time after excitation (ms)")
    axs[1].set_xlabel("Time after excitation (ms)")
    axs[0].set_ylabel("Magnetization (relative)")
    for ax in axs:
        ax.set_ylim(0, 1.05)
        ax.grid(True, axis="y")
        ax.set_axisbelow(True)
    for name, _, _, col in tissues:
        axs[1].plot([], [], color=col, label=name)
    axs[1].legend(loc="center right")
    fig.text(0.99, -0.02, "Approximate relaxation times at 3T.", ha="right", color=MUTED,
             fontsize=9)
    fig.tight_layout(w_pad=3)
    save(fig, "t1-t2-curves")


def hrf_curve():
    t = np.linspace(-2, 30, 600)
    h = np.where(t >= 0, spm_hrf(np.clip(t, 0, None)), 0)
    fig, ax = plt.subplots(figsize=(WIDTH * 0.8, 3.6))
    ax.axhline(0, color=LINE_STRONG, lw=0.8)
    ax.axvline(0, color=MUTED, lw=1, ls=(0, (3, 3)))
    ax.fill_between(t, h, 0, color=GREEN, alpha=0.1)
    ax.plot(t, h, color=GREEN)
    ipk = np.argmax(h)
    iund = np.argmin(h)
    ax.plot(t[ipk], h[ipk], "o", color=GREEN, ms=7, mec=PAPER, mew=1.5)
    ax.annotate(f"peak ≈ {t[ipk]:.0f} s", (t[ipk], h[ipk]), (t[ipk] + 3, h[ipk] - 0.05),
                fontsize=10, color=INK, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
    ax.annotate("post-stimulus undershoot", (t[iund], h[iund]), (t[iund] + 2, -0.42),
                fontsize=10, color=INK, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
    ax.text(0.5, -0.3, "brief stimulus at t = 0", fontsize=9.5, color=MUTED, ha="left", va="center")
    ax.set_xlabel("Time after a brief stimulus (s)")
    ax.set_ylabel("BOLD response (normalized)")
    ax.set_xlim(-2, 30)
    ax.set_ylim(-0.5, 1.12)
    save(fig, "hrf-curve")


def four_d_volume():
    from nilearn import image

    tmpl = mni_slices()
    epi = image.resample_img(tmpl, target_affine=np.diag([3, 3, 3]), interpolation="linear",
                             force_resample=True, copy_header=True)
    d = gaussian_filter(epi.get_fdata(), 0.6)
    z = d.shape[2] // 2 + 3
    sl = np.rot90(d[:, :, z])
    rng = np.random.default_rng(0)
    fig = plt.figure(figsize=(WIDTH, 3.8))
    n_show = 4
    base_x, base_y, w, h = 0.02, 0.12, 0.27, 0.62
    vy, vx = 22, 30
    for k in range(n_show):
        a = fig.add_axes([base_x + k * 0.05, base_y + (n_show - 1 - k) * 0.06, w * 0.62, h * 0.85])
        img = sl * (1 + rng.normal(0, 0.04, sl.shape))
        a.imshow(img, cmap=GRAYS, interpolation="nearest")
        a.set_xticks([])
        a.set_yticks([])
        for s in a.spines.values():
            s.set_visible(True)
            s.set_color(PAPER)
            s.set_linewidth(2)
        if k == n_show - 1:
            a.add_patch(plt.Rectangle((vx - 1, vy - 1), 2, 2, fc=ORANGE, ec=PAPER, lw=0.8))
            last = a
    fig.text(0.04, 0.9, "one volume every TR", fontsize=10, color=MUTED)
    fig.text(0.04, 0.03, "x · y · z  ×  time", fontsize=10, color=INK, weight="medium")
    ts_ax = fig.add_axes([0.5, 0.2, 0.47, 0.6])
    tr = 2.0
    n = 150
    tt = np.arange(n) * tr
    ons = np.arange(10, 300, 40)
    stim = np.zeros(n)
    for o in ons:
        stim[int(o / tr) : int((o + 12) / tr)] = 1
    hrf = spm_hrf(np.arange(0, 32, tr))
    reg = np.convolve(stim, hrf)[:n]
    sig = 100 + 1.5 * reg / reg.max() + gaussian_filter1d(rng.normal(0, 0.25, n), 1.0)
    sig += np.linspace(0, 1.2, n)
    ts_ax.plot(tt, sig, color=ORANGE, lw=1.6)
    ts_ax.set_xlabel("Time (s)")
    ts_ax.set_yticks([])
    ts_ax.spines["left"].set_visible(False)
    ts_ax.set_title("Signal of one voxel over time")
    ts_ax.set_xlim(0, tt[-1])
    # connector from voxel to time series
    xy_vox = last.transData.transform((vx, vy))
    xy_ts = ts_ax.transAxes.transform((0, 0.5))
    inv = fig.transFigure.inverted()
    con = FancyArrowPatch(inv.transform(xy_vox), inv.transform(xy_ts) - np.array([0.01, 0]),
                          transform=fig.transFigure, arrowstyle="-|>", mutation_scale=9,
                          color=MUTED, lw=1, connectionstyle="arc3,rad=-0.2")
    fig.add_artist(con)
    save(fig, "4d-volume")


# --------------------------------------------------------------------------------------
# Part 4
# --------------------------------------------------------------------------------------


def slice_orientations():
    tmpl = mni_slices()
    d = tmpl.get_fdata()
    aff = tmpl.affine
    ijk0 = np.linalg.inv(aff) @ np.array([-2, 0, 0, 1])
    sag = np.rot90(d[int(round(ijk0[0])), :, :])
    ny, nz = d.shape[1], d.shape[2]
    # extent in mm
    y0 = aff[1, 3]
    z0 = aff[2, 3]
    ext = (y0, y0 + ny * aff[1, 1], z0, z0 + nz * aff[2, 2])
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 4.0))
    for ax, tilt, title in ((axs[0], 0, "Axial slices (parallel to AC-PC)"),
                            (axs[1], -20, "Tilted to run along the temporal lobe")):
        ax.imshow(sag, cmap=GRAYS, extent=ext, interpolation="bilinear")
        th = np.deg2rad(tilt)
        yy = np.array([-130, 90])
        for c in np.arange(-45, 80, 7):
            zz = c + np.tan(th) * yy
            ax.plot(yy, zz, color="#7fd1a6", lw=0.9, alpha=0.9)
        ax.set_xlim(ext[0], ext[1])
        ax.set_ylim(-75, ext[3])
        ax.set_title(title)
        ax.axis("off")
    axs[0].text(ext[0] + 3, -71, "posterior", color="#cfcdc6", fontsize=9)
    axs[0].text(ext[1] - 3, -71, "anterior", color="#cfcdc6", fontsize=9, ha="right")
    fig.text(0.5, -0.01, "The slab angle changes which tissue sits in each slice and where "
             "dropout and distortion land. Ask your physicist what works for your target "
             "regions.", ha="center", color=MUTED, fontsize=9, wrap=True)
    fig.tight_layout(w_pad=2)
    save(fig, "slice-orientations")


def _timeline(ax, onsets, dur, total, color, label=None):
    for o in onsets:
        ax.add_patch(plt.Rectangle((o, 0), dur, 1, fc=color, ec="none", alpha=0.85))
    ax.set_xlim(0, total)
    ax.set_ylim(0, 1)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    if label:
        ax.set_ylabel(label, rotation=0, ha="right", va="center", color=SECONDARY)


def _predicted(onsets, dur, total, dt=0.1):
    t = np.arange(0, total, dt)
    s = np.zeros_like(t)
    for o in onsets:
        s[(t >= o) & (t < o + dur)] = 1
    h = spm_hrf(np.arange(0, 32, dt))
    y = np.convolve(s, h)[: len(t)] * dt
    return t, y


def block_design_bold():
    total = 160
    ons = np.arange(10, total, 40)
    fig, (a0, a1) = plt.subplots(2, 1, figsize=(WIDTH, 3.7), sharex=True,
                                 gridspec_kw={"height_ratios": [1, 3], "hspace": 0.12})
    _timeline(a0, ons, 20, total, GREEN)
    a0.set_title("Stimulus blocks (20 s on, 20 s off) and the predicted BOLD response", pad=8)
    a0.tick_params(bottom=False)
    a0.spines["bottom"].set_visible(False)
    t, y = _predicted(ons, 20, total)
    y /= y.max()
    a1.axhline(0, color=LINE_STRONG, lw=0.8)
    a1.fill_between(t, y, 0, color=GREEN, alpha=0.1)
    a1.plot(t, y, color=GREEN)
    a1.set_ylabel("Predicted BOLD")
    a1.set_xlabel("Time (s)")
    a1.set_ylim(-0.25, 1.15)

    save(fig, "block-design-bold")


def jittered_design():
    rng = np.random.default_rng(7)
    total = 60
    isi = rng.choice([2.5, 3, 4, 5, 6.5, 8], 14)
    ons = 2 + np.cumsum(np.r_[0, isi])
    ons = ons[ons < total - 14]
    dt = 0.1
    t = np.arange(0, total, dt)
    h = spm_hrf(np.arange(0, 32, dt))
    fig, axs = plt.subplots(3, 1, figsize=(WIDTH, 5.0), sharex=True,
                            gridspec_kw={"height_ratios": [0.7, 2, 2], "hspace": 0.25})
    for o in ons:
        axs[0].axvline(o, color=INK, lw=1.4)
    for a, b in zip(ons[:-1], ons[1:]):
        if b - a >= 4.5:
            axs[0].annotate("", (b, 0.5), (a, 0.5),
                            arrowprops=dict(arrowstyle="<->", color=MUTED, lw=0.8))
            axs[0].text((a + b) / 2, 0.62, f"{b - a:g} s", ha="center", fontsize=8.5, color=MUTED)
    axs[0].set_ylim(0, 1)
    axs[0].set_yticks([])
    axs[0].spines["left"].set_visible(False)
    axs[0].set_title("Events with jittered inter-stimulus intervals")
    total_y = np.zeros_like(t)
    for k, o in enumerate(ons):
        y = np.zeros_like(t)
        i = int(o / dt)
        seg = h[: len(t) - i]
        y[i : i + len(seg)] = seg
        total_y += y
        axs[1].plot(t, y, color=CAT[k % 2 and 1 or 0], lw=1.3, alpha=0.9)
    axs[1].axhline(0, color=LINE_STRONG, lw=0.8)
    axs[1].set_ylabel("Response to\neach event")
    axs[2].axhline(0, color=LINE_STRONG, lw=0.8)
    axs[2].fill_between(t, total_y, 0, color=ORANGE, alpha=0.1)
    axs[2].plot(t, total_y, color=ORANGE)
    axs[2].set_ylabel("Measured\n(sum)")
    axs[2].set_xlabel("Time (s)")
    axs[2].set_xlim(0, total)
    axs[2].set_ylim(-0.25, total_y.max() * 1.45)
    note(axs[2], total - 0.5, total_y.max() * 1.4,
         "jitter makes the overlapping responses separable in the GLM", ha="right", va="top")
    save(fig, "jittered-design")


def design_types():
    total = 120
    designs = [
        ("Block", np.arange(5, total, 30), 15, GREEN),
        ("Slow event-related", np.arange(5, total, 14), 1, BLUE),
        ("Rapid event-related", None, 1, ORANGE),
    ]
    rng = np.random.default_rng(2)
    rapid = 3 + np.cumsum(rng.choice([2, 3, 4, 6], 40))
    rapid = rapid[rapid < total - 2]
    fig, axs = plt.subplots(3, 1, figsize=(WIDTH, 5.1), sharex=True, gridspec_kw={"hspace": 0.55})
    for ax, (name, ons, dur, col) in zip(axs, designs):
        if ons is None:
            ons = rapid
        t, y = _predicted(ons, dur, total)
        y /= np.abs(y).max()
        for o in ons:
            ax.add_patch(plt.Rectangle((o, -0.42), max(dur, 0.6), 0.18, fc=col, ec="none"))
        ax.axhline(0, color=LINE_STRONG, lw=0.8)
        ax.fill_between(t, y, 0, color=col, alpha=0.1)
        ax.plot(t, y, color=col, lw=1.8)
        ax.set_ylim(-0.48, 1.12)
        ax.set_yticks([])
        ax.spines["left"].set_visible(False)
        ax.set_title(name)
    axs[-1].set_xlabel("Time (s)")
    for ax, txt in zip(axs, ("strongest signal, no single-trial estimates",
                             "clean single trials, but few trials per minute",
                             "many trials; the GLM handles the overlap")):
        ax.text(1.0, 1.08, txt, transform=ax.transAxes, ha="right", va="bottom", color=MUTED,
                fontsize=9.5)
    axs[-1].set_xlim(0, total)
    fig.text(0.125, -0.02, "Bars: stimuli. Lines: predicted BOLD response.", color=MUTED,
             fontsize=9)
    save(fig, "design-types")


# --------------------------------------------------------------------------------------
# Part 5
# --------------------------------------------------------------------------------------


def preprocessing_pipeline():
    steps = [
        ("Raw BOLD", "BIDS dataset"),
        ("Slice timing", "optional"),
        ("Motion\ncorrection", "6 parameters"),
        ("Distortion\ncorrection", "field maps"),
        ("Coregister", "BOLD to T1w"),
        ("Normalize", "T1w to MNI"),
        ("Outputs", "+ confounds"),
    ]
    fig, ax = plt.subplots(figsize=(WIDTH, 2.3))
    n = len(steps)
    ax.set_xlim(0, n)
    ax.set_ylim(0, 1.25)
    ax.axis("off")
    w = 0.9
    for i, (title, sub) in enumerate(steps):
        x = i + (1 - w) / 2
        edge = GREEN if i in (0, n - 1) else LINE_STRONG
        fill = "#e4efe8" if i in (0, n - 1) else SURFACE
        ax.add_patch(FancyBboxPatch((x, 0.35), w, 0.72, boxstyle="round,pad=0,rounding_size=0.06",
                                    fc=fill, ec=edge, lw=0.9))
        ax.text(i + 0.5, 0.78, title, ha="center", va="center", fontsize=9.8, weight="medium",
                linespacing=1.1)
        ax.text(i + 0.5, 0.47, sub, ha="center", va="center", fontsize=8.8, color=MUTED)
        if i < n - 1:
            arrow(ax, (x + w + 0.005, 0.71), (x + w + (1 - w) - 0.005, 0.71), ms=7)
    ax.text(n / 2, 0.08, "fMRIPrep runs all of these; smoothing is left to the analysis step.",
            ha="center", color=MUTED, fontsize=9.2)
    save(fig, "preprocessing-pipeline")


def _sim_motion(n, rng, scale=1.0, jerks=()):
    """Plausible motion: slow drift + small noise + occasional jerks. mm and degrees."""
    trans = np.cumsum(rng.normal(0, 0.012, (n, 3)), axis=0) * scale
    trans += gaussian_filter1d(rng.normal(0, 0.03, (n, 3)), 2, axis=0)
    rot = np.cumsum(rng.normal(0, 0.008, (n, 3)), axis=0) * scale
    rot += gaussian_filter1d(rng.normal(0, 0.02, (n, 3)), 2, axis=0)
    for j, amp in jerks:
        trans[j:] += rng.normal(0, amp, 3)
        rot[j:] += rng.normal(0, amp * 0.6, 3)
        trans[j : j + 3] += rng.normal(0, amp, (3, 3))
    return trans, rot


def motion_traces():
    rng = np.random.default_rng(11)
    n, tr = 300, 2.0
    t = np.arange(n) * tr
    trans, rot = _sim_motion(n, rng, jerks=[(170, 0.35)])
    fig, (a0, a1) = plt.subplots(2, 1, figsize=(WIDTH, 4.6), sharex=True,
                                 gridspec_kw={"hspace": 0.3})
    for k, (lab, col) in enumerate(zip(("x", "y", "z"), CAT[:3])):
        a0.plot(t, trans[:, k], color=col, lw=1.4, label=lab)
    for k, (lab, col) in enumerate(zip(("pitch", "roll", "yaw"), CAT[:3])):
        a1.plot(t, rot[:, k], color=col, lw=1.4, label=lab)
    a0.set_ylabel("Translation (mm)")
    a1.set_ylabel("Rotation (°)")
    a1.set_xlabel("Time (s)")
    a0.set_title("Six rigid-body motion parameters (simulated)")
    for a in (a0, a1):
        a.axhline(0, color=LINE_STRONG, lw=0.8)
        a.legend(ncol=3, loc="upper left")
        a.set_xlim(0, t[-1])
    a0.annotate("sudden movement", (t[170], trans[171, 1]), (t[170] + 40, a0.get_ylim()[1] * 0.8),
                fontsize=9.5, color=INK, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
    save(fig, "motion-traces")


def smoothing_effects():
    from nilearn import image

    tmpl = mni_slices()
    tmpl2 = image.resample_img(tmpl, target_affine=np.diag([2, 2, 2]), force_resample=True,
                               copy_header=True)
    fig, axs = plt.subplots(1, 4, figsize=(WIDTH, 2.9))
    for ax, fwhm in zip(axs, (None, 4, 6, 8)):
        img = tmpl2 if fwhm is None else image.smooth_img(tmpl2, fwhm)
        d = img.get_fdata()
        z = int(round((np.linalg.inv(img.affine) @ np.array([0, 0, 8, 1]))[2]))
        sl = np.rot90(d[:, :, z])
        ax.imshow(sl, cmap=GRAYS, interpolation="nearest")
        ax.set_title("no smoothing" if fwhm is None else f"{fwhm} mm FWHM", loc="center")
        ax.axis("off")
    fig.tight_layout(w_pad=0.6)
    save(fig, "smoothing-effects", png=True)


# --------------------------------------------------------------------------------------
# Part 6
# --------------------------------------------------------------------------------------


def _fd(trans, rot):
    p = np.c_[trans, np.deg2rad(rot) * 50]
    return np.r_[0, np.abs(np.diff(p, axis=0)).sum(1)]


def fd_comparison():
    n, tr = 300, 2.0
    t = np.arange(n) * tr
    rng = np.random.default_rng(5)
    low_t, low_r = _sim_motion(n, rng, 0.6)
    high_t, high_r = _sim_motion(n, rng, 1.5, jerks=[(40, 0.25), (120, 0.3), (210, 0.35)])
    restless = ((t > 70) & (t < 110)) | ((t > 400) & (t < 470))
    high_t += gaussian_filter1d(rng.normal(0, 0.2, (n, 3)), 0.6, axis=0) * restless[:, None]
    fds = [_fd(low_t, low_r), _fd(high_t, high_r)]
    fig, axs = plt.subplots(2, 1, figsize=(WIDTH, 4.6), sharex=True, sharey=True,
                            gridspec_kw={"hspace": 0.45})
    for ax, fd, name in zip(axs, fds, ("Low-motion participant", "High-motion participant")):
        ax.fill_between(t, fd, 0, color=GREEN, alpha=0.12, step="mid")
        ax.plot(t, fd, color=GREEN, lw=1.2, drawstyle="steps-mid")
        ax.axhline(0.5, color=ORANGE, lw=1, ls=(0, (4, 3)))
        ax.axhline(0.2, color=MUTED, lw=0.9, ls=(0, (1, 2.5)))
        over = (fd > 0.5).mean() * 100
        ax.set_title(f"{name}:  mean FD {fd.mean():.2f} mm,  {over:.0f}% of volumes > 0.5 mm")
        ax.set_ylabel("FD (mm)")
        ax.set_xlim(0, t[-1])
    axs[0].text(t[-1], 0.53, "0.5 mm", color=ORANGE, ha="right", va="bottom", fontsize=9)
    axs[0].text(t[-1], 0.23, "0.2 mm", color=MUTED, ha="right", va="bottom", fontsize=9)
    axs[1].set_xlabel("Time (s)")
    axs[1].set_ylim(0, 2.0)
    save(fig, "fd-comparison")
    return fds


def fd_dvars_correlation():
    n, tr = 300, 2.0
    t = np.arange(n) * tr
    rng = np.random.default_rng(9)
    tr_, rot_ = _sim_motion(n, rng, 1.0, jerks=[(35, 0.5), (110, 0.35), (112, 0.4), (230, 0.6)])
    fd = _fd(tr_, rot_)
    dvars = 1.0 + 1.3 * fd + gaussian_filter1d(rng.normal(0, 0.35, n), 1.0) + np.abs(rng.normal(0, 0.15, n))
    r = np.corrcoef(fd, dvars)[0, 1]
    fig, (a0, a1) = plt.subplots(2, 1, figsize=(WIDTH, 4.2), sharex=True,
                                 gridspec_kw={"hspace": 0.35})
    a0.plot(t, fd, color=GREEN, lw=1.3)
    a0.set_ylabel("FD (mm)")
    a0.set_title("Framewise displacement: how much the head moved")
    a1.plot(t, dvars, color=BLUE, lw=1.3)
    a1.set_ylabel("DVARS (std.)")
    a1.set_title("Standardized DVARS: how much the image changed")
    a1.set_xlabel("Time (s)")
    for j in (35, 111, 230):
        for a in (a0, a1):
            a.axvspan(t[j] - 3, t[j] + 5, color=ORANGE, alpha=0.12, lw=0)
    a1.set_xlim(0, t[-1])
    note(a1, t[-1], dvars.max() * 0.85, f"simulated, r = {r:.2f}", ha="right")
    save(fig, "fd-dvars-correlation")


def carpet_plot():
    rng = np.random.default_rng(21)
    n_t = 240
    groups = [("Cortical GM", 260, GREEN), ("Subcortical GM", 60, BLUE), ("WM + CSF", 140, OCHRE)]
    n_v = sum(g[1] for g in groups)

    def make(bad):
        x = gaussian_filter1d(rng.normal(0, 1, (n_v, n_t)), 1.2, axis=1)
        fd = np.abs(rng.normal(0.08, 0.04, n_t))
        if bad:
            for j0, width in ((58, 3), (138, 4), (199, 2)):
                for j in range(j0, j0 + width):
                    amp = rng.uniform(2.5, 4)
                    x[:, j] += amp * rng.choice([-1, 1]) * rng.uniform(0.6, 1, n_v)
                    fd[j] = rng.uniform(0.6, 1.5)
            x[:, 140:170] += np.linspace(1.5, 0, 30)
        x = (x - x.mean(1, keepdims=True)) / x.std(1, keepdims=True)
        return x, fd

    fig = plt.figure(figsize=(WIDTH, 4.6))
    gs = fig.add_gridspec(2, 2, height_ratios=[1, 4], hspace=0.08, wspace=0.12)
    for col, (bad, title) in enumerate(((False, "Clean run"), (True, "Run with motion"))):
        x, fd = make(bad)
        a0 = fig.add_subplot(gs[0, col])
        a1 = fig.add_subplot(gs[1, col], sharex=a0)
        a0.plot(fd, color=ORANGE, lw=1.2)
        a0.set_ylim(0, 1.8)
        a0.set_title(title)
        a0.tick_params(labelbottom=False, bottom=False)
        a0.spines["bottom"].set_visible(False)
        if col == 0:
            a0.set_ylabel("FD", rotation=0, ha="right", va="center")
        else:
            a0.tick_params(labelleft=False)
        a1.imshow(x, aspect="auto", cmap=GRAYS.reversed(), vmin=-2.2, vmax=2.2,
                  interpolation="nearest")
        y = 0
        for name, nv, c in groups:
            a1.add_patch(plt.Rectangle((-6, y), 4, nv, fc=c, ec="none", clip_on=False))
            if col == 0:
                a1.text(-10, y + nv / 2, name, ha="right", va="center", fontsize=9, color=SECONDARY)
            y += nv
        a1.set_yticks([])
        a1.set_xlabel("Volume")
        a1.set_xlim(-6, n_t)
        a1.spines["left"].set_visible(False)
    fig.text(0.5, -0.03, "Simulated carpet plots. Each row is one voxel's z-scored time series. "
             "Motion shows up as vertical bands across all tissue classes.", ha="center",
             color=MUTED, fontsize=9)
    save(fig, "carpet-plot")


def registration_check():
    from nilearn import datasets, image

    tmpl = mni_slices()
    wm = datasets.load_mni152_wm_mask(resolution=1)
    epi = image.smooth_img(image.resample_img(tmpl, target_affine=np.diag([2.5, 2.5, 2.5]),
                                              force_resample=True, copy_header=True), 2)
    # Misaligned copy: shift and rotate the "functional" image
    th = np.deg2rad(7)
    rotm = np.array([[1, 0, 0, 0], [0, np.cos(th), -np.sin(th), 6], [0, np.sin(th), np.cos(th), 5],
                     [0, 0, 0, 1]])
    bad = image.resample_img(epi, target_affine=epi.affine, target_shape=epi.shape,
                             force_resample=True, copy_header=True)
    bad = image.new_img_like(epi, image.resample_img(
        image.new_img_like(epi, epi.get_fdata(), affine=rotm @ epi.affine),
        target_affine=epi.affine, target_shape=epi.shape, force_resample=True,
        copy_header=True).get_fdata())
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 4.2))
    wm_r = image.resample_to_img(wm, tmpl, interpolation="nearest", force_resample=True,
                                 copy_header=True)
    for ax, img, title in ((axs[0], epi, "Good: tissue boundaries line up"),
                           (axs[1], bad, "Failed: BOLD shifted and rotated relative to T1w")):
        r = image.resample_to_img(img, tmpl, force_resample=True, copy_header=True)
        i = int(round((np.linalg.inv(tmpl.affine) @ np.array([0, 0, 0, 1]))[0] - 30))
        bg = np.rot90(r.get_fdata()[i])
        cont = np.rot90(gaussian_filter(wm_r.get_fdata()[i].astype(float), 1.0))
        ax.imshow(bg, cmap=GRAYS, interpolation="bilinear")
        ax.contour(cont, levels=[0.5], colors=[ORANGE], linewidths=1.1)
        ax.set_title(title)
        ax.axis("off")
    fig.text(0.5, 0.0, "Orange: white-matter boundary from the anatomical image, drawn over the "
             "functional image (simulated misregistration).", ha="center", color=MUTED,
             fontsize=9)
    fig.tight_layout(w_pad=1.5)
    save(fig, "registration-check")


# --------------------------------------------------------------------------------------
# Part 7
# --------------------------------------------------------------------------------------


def design_matrix():
    import pandas as pd
    from nilearn.glm.first_level import make_first_level_design_matrix

    tr, n = 2.0, 160
    ft = np.arange(n) * tr
    rng = np.random.default_rng(4)
    ev = []
    for k, o in enumerate(range(10, 300, 40)):
        ev.append((o, 16, "face" if k % 2 == 0 else "house"))
    events = pd.DataFrame(ev, columns=["onset", "duration", "trial_type"])
    tr_, rot_ = _sim_motion(n, rng, 1.2)
    mot = pd.DataFrame(np.c_[tr_, rot_], columns=["trans_x", "trans_y", "trans_z", "rot_x",
                                                  "rot_y", "rot_z"])
    dm = make_first_level_design_matrix(ft, events, hrf_model="spm", drift_model="cosine",
                                        high_pass=0.01, add_regs=mot.values,
                                        add_reg_names=list(mot.columns))
    cols = list(dm.columns)
    x = dm.values.copy()
    rng_ = np.ptp(x, 0)
    x = np.where(rng_ > 0, (x - x.min(0)) / np.where(rng_ > 0, rng_, 1), 0.85)
    fig, ax = plt.subplots(figsize=(WIDTH * 0.75, 5.4))
    ax.imshow(x, aspect="auto", cmap=LinearSegmentedColormap.from_list("ink", [PAPER, INK]),
              interpolation="nearest")
    ax.set_xticks(range(len(cols)))
    ax.set_xticklabels(cols, rotation=55, ha="right", fontsize=9)
    ax.set_ylabel("Time (volumes)")
    ax.tick_params(axis="x", length=0)
    groups = [(0, 1, "task", GREEN), (2, 7, "motion", BLUE),
              (8, len(cols) - 2, "drift", OCHRE), (len(cols) - 1, len(cols) - 1, "const.", MUTED)]
    for a, b, lab, c in groups:
        ax.plot([a - 0.4, b + 0.4], [-4, -4], color=c, lw=3, clip_on=False,
                solid_capstyle="butt")
        ax.text((a + b) / 2, -8, lab, ha="center", color=c, fontsize=9.5, weight="medium")
    ax.set_ylim(n - 0.5, -0.5)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_title("Design matrix (simulated): each column is a regressor", pad=28)
    save(fig, "design-matrix")


def hrf_convolution_demo():
    dt = 0.05
    total = 40
    t = np.arange(0, total, dt)
    ons = [5, 15.5, 26]
    s = np.zeros_like(t)
    for o in ons:
        s[(t >= o) & (t < o + 2)] = 1
    th = np.arange(0, 30, dt)
    h = spm_hrf(th)
    y = np.convolve(s, h)[: len(t)] * dt
    fig, axs = plt.subplots(1, 3, figsize=(WIDTH, 2.9))
    axs[0].fill_between(t, s, 0, color=GREEN, alpha=0.15, step="pre")
    axs[0].plot(t, s, color=GREEN, lw=1.6)
    axs[0].set_title("Stimulus (boxcar)")
    axs[0].set_yticks([0, 1])
    axs[0].set_yticklabels(["off", "on"])
    axs[1].plot(th, h, color=BLUE)
    axs[1].axhline(0, color=LINE_STRONG, lw=0.8)
    axs[1].set_title("HRF")
    axs[1].set_yticks([])
    axs[2].plot(t, y / y.max(), color=ORANGE)
    axs[2].axhline(0, color=LINE_STRONG, lw=0.8)
    axs[2].set_title("Regressor (boxcar convolved with HRF)")
    axs[2].set_yticks([])
    for a in axs:
        a.set_xlabel("Time (s)")
    fig.text(0.355, 0.5, "*", fontsize=20, ha="center", va="center", color=MUTED)
    fig.text(0.675, 0.5, "=", fontsize=18, ha="center", va="center", color=MUTED)
    fig.tight_layout(w_pad=3.2)
    save(fig, "hrf-convolution-demo")


def design_matrix_collinearity():
    dt = 0.1
    total = 60
    t = np.arange(0, total, dt)
    h = spm_hrf(np.arange(0, 32, dt))

    def regs(ons):
        out = []
        for o in ons:
            s = np.zeros_like(t)
            s[(t >= o) & (t < o + 1)] = 1
            out.append(np.convolve(s, h)[: len(t)] * dt)
        return np.array(out)

    slow = regs([4, 16, 28, 40])
    fast = regs([4, 7, 10, 13])
    r_slow = np.corrcoef(slow[1], slow[2])[0, 1]
    r_fast = np.corrcoef(fast[1], fast[2])[0, 1]
    fig, axs = plt.subplots(1, 2, figsize=(WIDTH, 3.3), sharey=True)
    for ax, R, title, rr in ((axs[0], slow, "Slow design (12 s between trials)", r_slow),
                             (axs[1], fast, "Fast design (3 s between trials)", r_fast)):
        for k, reg in enumerate(R):
            ax.plot(t, reg / R.max(), color=CAT[k], lw=1.8)
        ax.axhline(0, color=LINE_STRONG, lw=0.8)
        ax.set_title(title)
        ax.set_xlabel("Time (s)")
        ax.set_xlim(0, total if R is slow else 35)
        ax.text(0.98, 0.97, f"r(trial 2, trial 3) = {rr:.2f}", ha="right", va="top",
                transform=ax.transAxes, color=INK, fontsize=10)
        ax.set_ylim(-0.2, 1.3)
    axs[0].set_ylabel("Single-trial regressors")
    axs[0].set_yticks([])
    save(fig, "design-matrix-collinearity")
    log.info("collinearity: slow r=%.2f fast r=%.2f", r_slow, r_fast)


# --------------------------------------------------------------------------------------
# Part 8
# --------------------------------------------------------------------------------------


def univariate_vs_multivariate():
    rng = np.random.default_rng(12)
    base = rng.normal(0, 1, (5, 5))
    a = 3 + base
    b = 3 + np.flipud(np.fliplr(base)) * 0.9 + rng.normal(0, 0.25, (5, 5))
    b += a.mean() - b.mean()
    fig = plt.figure(figsize=(WIDTH, 3.4))
    gs = fig.add_gridspec(1, 4, width_ratios=[1.1, 0.25, 1, 1], wspace=0.25)
    ax = fig.add_subplot(gs[0])
    ax.bar([0, 1], [a.mean(), b.mean()], width=0.55, color=[GREEN, BLUE])
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["faces", "houses"])
    ax.set_ylabel("Mean response in ROI")
    ax.set_title("Univariate: same mean")
    ax.set_ylim(0, 4)
    vmin, vmax = min(a.min(), b.min()), max(a.max(), b.max())
    for k, (m, name, c) in enumerate(((a, "faces", GREEN), (b, "houses", BLUE))):
        axm = fig.add_subplot(gs[2 + k])
        axm.imshow(m, cmap=SEQ, vmin=vmin, vmax=vmax)
        axm.set_xticks([])
        axm.set_yticks([])
        for s in axm.spines.values():
            s.set_visible(True)
            s.set_color(c)
            s.set_linewidth(2)
        axm.set_title(f"pattern for {name}", loc="center", color=INK)
    fig.canvas.draw()
    x0 = fig.axes[1].get_position().x0
    fig.text(x0, fig.axes[0].get_position().y1 + 0.075,
             "Multivariate: different patterns across the same 25 voxels", fontsize=11.5,
             weight="medium")
    fig.text(0.6, -0.02, "Simulated. A classifier can tell these apart even though the means "
             "are identical.", fontsize=9, color=MUTED)
    save(fig, "univariate-vs-multivariate")


def _rsa_data():
    """Items laid out in a designed 2D space; the RDM is their (noisy) distance."""
    rng = np.random.default_rng(1)
    layout = {
        "fruits": [("apple", -2.3, 1.7), ("banana", -1.6, 1.4), ("orange", -2.2, 0.9)],
        "vehicles": [("car", 2.0, 1.8), ("bus", 2.7, 1.1), ("truck", 1.8, 0.9)],
        "animals": [("dog", 0.4, -1.0), ("cat", 1.1, -0.8), ("horse", 1.3, -1.6)],
        "faces": [("face 1", -1.3, -1.9), ("face 2", -0.6, -1.7), ("face 3", -0.9, -2.5)],
    }
    items, labels, pts = [], [], []
    for k, its in layout.items():
        for name, x, y in its:
            items.append(name)
            labels.append(k)
            pts.append((x, y))
    pts = np.array(pts)
    d = np.linalg.norm(pts[:, None] - pts[None], axis=-1)
    noise = rng.normal(0, 0.12, d.shape)
    d = np.clip(d + (noise + noise.T) / 2, 0, None)
    np.fill_diagonal(d, 0)
    rdm = 1.2 * d / d.max()
    return items, labels, rdm


def rdm_matrix():
    items, labels, rdm = _rsa_data()
    fig, ax = plt.subplots(figsize=(WIDTH * 0.62, 5.0))
    im = ax.imshow(rdm, cmap=SEQ, vmin=0, vmax=rdm.max())
    ax.set_xticks(range(len(items)))
    ax.set_yticks(range(len(items)))
    ax.set_xticklabels(items, rotation=55, ha="right")
    ax.set_yticklabels(items)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    for b in (2.5, 5.5, 8.5):
        ax.axhline(b, color=PAPER, lw=2)
        ax.axvline(b, color=PAPER, lw=2)
    cb = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.03)
    cb.set_label("Dissimilarity")
    cb.outline.set_visible(False)
    ax.set_title("Representational dissimilarity matrix (simulated)")
    save(fig, "rdm-matrix")


def mds_representational_space():
    items, labels, rdm = _rsa_data()
    # classical MDS
    n = rdm.shape[0]
    j = np.eye(n) - np.ones((n, n)) / n
    b = -0.5 * j @ (rdm ** 2) @ j
    w, v = np.linalg.eigh(b)
    idx = np.argsort(w)[::-1][:2]
    y = v[:, idx] * np.sqrt(w[idx])
    cat_names = list(dict.fromkeys(labels))
    fig, ax = plt.subplots(figsize=(WIDTH * 0.7, 4.8))
    gc = y.mean(0)
    span = np.ptp(y, 0).max()
    for k, c in enumerate(cat_names):
        m = np.array(labels) == c
        ax.scatter(y[m, 0], y[m, 1], s=60, color=CAT[k], edgecolor=PAPER, lw=1.5, zorder=3,
                   label=c)
        cc = y[m].mean(0)
        out = (cc - gc) / (np.linalg.norm(cc - gc) + 1e-9)
        for (px, py), it in zip(y[m], np.array(items)[m]):
            d = np.array([px, py]) - cc
            d = d / (np.linalg.norm(d) + 1e-9)
            ax.text(px + d[0] * span * 0.045, py + d[1] * span * 0.045, it, fontsize=8.8,
                    color=SECONDARY, ha="left" if d[0] >= 0 else "right", va="center")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlabel("MDS dimension 1")
    ax.set_ylabel("MDS dimension 2")
    ax.set_title("The same RDM projected to 2D with MDS (simulated)", pad=30)
    ax.legend(loc="lower left", bbox_to_anchor=(0, 1.0), ncol=4, handletextpad=0.2,
              columnspacing=1.2, borderaxespad=0.2)
    pad = span * 0.3
    ax.set_xlim(y[:, 0].min() - pad, y[:, 0].max() + pad)
    ax.set_ylim(y[:, 1].min() - pad, y[:, 1].max() + pad)
    save(fig, "mds-representational-space")


def dnn_brain_heatmap():
    layers = ["conv1", "conv2", "conv3", "conv4", "conv5", "fc6", "fc7", "fc8"]
    rois = ["V1", "V2", "V3", "hV4", "LOC", "FFA", "PPA"]
    pos_l = np.linspace(0, 1, len(layers))
    pos_r = np.array([0.0, 0.1, 0.2, 0.38, 0.65, 0.8, 0.78])
    rng = np.random.default_rng(8)
    m = 0.12 + 0.3 * np.exp(-((pos_r[:, None] - pos_l[None, :]) ** 2) / (2 * 0.22 ** 2))
    m += rng.normal(0, 0.015, m.shape)
    fig, ax = plt.subplots(figsize=(WIDTH * 0.68, 4.4))
    im = ax.imshow(m, cmap=SEQ, vmin=0.08, vmax=0.45, aspect="auto")
    ax.set_xticks(range(len(layers)))
    ax.set_xticklabels(layers)
    ax.set_yticks(range(len(rois)))
    ax.set_yticklabels(rois)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    best = m.argmax(1)
    ax.plot(best, range(len(rois)), "o", color=PAPER, ms=5, mec=INK, mew=1)
    ax.set_xlabel("CNN layer  (early → late)")
    ax.set_ylabel("Visual area  (early → late)")
    cb = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.03)
    cb.set_label("Model–brain RDM correlation")
    cb.outline.set_visible(False)
    ax.set_title("Illustrative layer-to-area correspondence (simulated)")
    note(ax, 0, len(rois) + 0.55, "dots: best-matching layer for each area", va="top")
    save(fig, "dnn-brain-heatmap")


FIGURES = {
    "pipeline-overview": pipeline_overview,
    "visual-hierarchy": visual_hierarchy,
    "visual-streams": visual_streams,
    "spatial-temporal-tradeoff": spatial_temporal_tradeoff,
    "proton-alignment": proton_alignment,
    "t1-t2-curves": t1_t2_curves,
    "hrf-curve": hrf_curve,
    "4d-volume": four_d_volume,
    "slice-orientations": slice_orientations,
    "block-design-bold": block_design_bold,
    "jittered-design": jittered_design,
    "design-types": design_types,
    "preprocessing-pipeline": preprocessing_pipeline,
    "motion-traces": motion_traces,
    "smoothing-effects": smoothing_effects,
    "fd-comparison": fd_comparison,
    "fd-dvars-correlation": fd_dvars_correlation,
    "carpet-plot": carpet_plot,
    "registration-check": registration_check,
    "design-matrix": design_matrix,
    "hrf-convolution-demo": hrf_convolution_demo,
    "design-matrix-collinearity": design_matrix_collinearity,
    "univariate-vs-multivariate": univariate_vs_multivariate,
    "rdm-matrix": rdm_matrix,
    "mds-representational-space": mds_representational_space,
    "dnn-brain-heatmap": dnn_brain_heatmap,
}


def main(argv):
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    setup_style()
    import extra_figures  # second batch; imports this module for shared style helpers

    FIGURES.update(extra_figures.FIGURES)
    names = argv or list(FIGURES)
    unknown = [n for n in names if n not in FIGURES]
    if unknown:
        raise SystemExit(f"unknown figures: {unknown}")
    for name in names:
        try:
            FIGURES[name]()
        except Exception:
            log.exception("failed: %s", name)


if __name__ == "__main__":
    main(sys.argv[1:])
