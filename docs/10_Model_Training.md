# 10 — Model Training

> Overview. This document describes the **implemented** training pipeline that
> fine-tunes the `MODEL_ARCH`-selected classifier (DenseNet-121 or
> EfficientNet-B0) for chest X-ray pneumonia detection, evaluates it, writes
> artifacts, and registers the resulting checkpoint so the inference engine
> **auto-loads** it with no code change. It cross-links
> [AI Architecture](09_AI_Architecture.md), [Model Inference](11_Model_Inference.md)
> and [AI Providers](16_AI_Providers.md).
>
> _Clinical decision-support only — not a medical device._

## 1. Dataset

**Primary dataset:** Kaggle "Chest X-Ray Images (Pneumonia)" (Kermany et al.,
`paultimothymooney/chest-xray-pneumonia`), ~5,856 frontal chest radiographs in
two classes: `NORMAL` and `PNEUMONIA`.

**Expected layout** (Kaggle `ImageFolder` structure):

```
data/datasets/chest_xray/
├── train/{NORMAL,PNEUMONIA}/*.jpeg
├── val/{NORMAL,PNEUMONIA}/*.jpeg
└── test/{NORMAL,PNEUMONIA}/*.jpeg
```

**Acquisition:**
- `python scripts/train.py --download` — best-effort download via `kagglehub`
  (requires Kaggle credentials), or
- download the archive manually and unzip into `data/datasets/chest_xray/`.

**Loading & validation** (`app/infrastructure/ml/training/dataset.py`): the loader
discovers either the split layout or a flat `NORMAL`/`PNEUMONIA` layout, validates
that both classes exist and are non-empty (raising a clear `ValidationError`
otherwise), and — because the Kaggle `val` split is tiny (16 images) — by default
merges all provided splits and performs a **deterministic, stratified re-split**
(`resplit: true`) into train/val/test using `val_split`/`test_split`.

**Statistics & imbalance:** per-split and per-class counts are computed and logged;
inverse-frequency **class weights** are derived from the training split and passed
to the loss to counter the dataset's pneumonia skew (~3:1).

**Verification dataset:** to prove the pipeline without the ~1 GB download / GPU,
`generate_synthetic_dataset` creates a small, learnable two-class set (smooth
gradients for `NORMAL`, bright opacity blobs for `PNEUMONIA`). This is used by the
tests and the `--synthetic` flag; it verifies the pipeline, it does **not** replace
the real dataset.

## 2. Training process

Pipeline stages (`training/pipeline.py`):

1. **Select architecture** through the shared `MODEL_ARCH` registry — the same
   registry the inference engine uses.
2. **Build dataloaders** with augmentation (train) and deterministic transforms
   (val/test) that mirror inference preprocessing (224², ImageNet normalisation).
3. **Transfer learning** (`training/trainer.py`): load the ImageNet-pretrained
   backbone, replace the head with a 2-class linear layer, **freeze the backbone**
   for the first `freeze_backbone_epochs` (train the head only), then **unfreeze**
   and fine-tune end-to-end.
4. **Optimise** with AdamW + weighted cross-entropy, a cosine (or plateau) LR
   scheduler, **gradient clipping**, and **mixed precision** when CUDA is available.
5. **Validate each epoch**, track the best model by validation loss, apply
   **early stopping** (`early_stopping_patience`), and checkpoint `last.ckpt`,
   `best.ckpt` (resumable bundles) plus `model.pt` (serving state-dict).
6. **Evaluate** on the held-out test split.
7. **Write artifacts** and **register** the model.

**Reproducibility:** Python/NumPy/torch seeds and cuDNN determinism are set from
`config.seed`. **Resume:** `Trainer.fit(..., resume_from=<ckpt>)` restores model,
optimizer, scheduler and epoch.

## 3. Hyperparameters

Configured via `configs/training.yaml` (overridable by CLI flags). Defaults:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `arch` | `densenet121` | or `efficientnet_b0` |
| `pretrained` | `true` | ImageNet transfer learning |
| `image_size` | `224` | matches inference |
| `epochs` | `15` | early-stopping usually ends sooner |
| `batch_size` | `32` | |
| `learning_rate` | `3e-4` | AdamW |
| `weight_decay` | `1e-4` | |
| `freeze_backbone_epochs` | `2` | head-only warmup |
| `grad_clip_norm` | `1.0` | |
| `scheduler` | `cosine` | `cosine` \| `plateau` \| `none` |
| `early_stopping_patience` | `4` | on val loss |
| `mixed_precision` | `true` | honoured only on CUDA |
| `val_split` / `test_split` | `0.15` / `0.15` | stratified |
| `seed` | `42` | reproducible |

## 4. Evaluation

`training/evaluation.py` (scikit-learn) computes on the test split: **accuracy**,
**precision**, **recall**, **F1** (pneumonia + macro), **ROC-AUC**, the
**confusion matrix**, a full **classification report**, and **per-class** metrics.

**Artifacts** written to `data/training/<arch>_v<version>_<timestamp>/`:
`loss_curve.png`, `accuracy_curve.png`, `confusion_matrix.png`, `metrics.json`,
`best.ckpt`, `last.ckpt`, `model.pt`, and a human-readable `training_summary.md`.

## 5. Model registry & automatic loading

Each run appends an entry to `data/weights/registry.json`
(`app/infrastructure/ml/model_registry.py`) recording: **version**,
**architecture**, **dataset**, **training date**, **metrics**, checkpoint
**SHA-256**, **checkpoint path**, full **config**, class names and an **approved**
flag. The best weights are also copied to `MODEL_PATH`.

At load time the inference engine resolves, in order: (1) the newest **approved**
registry entry for the active `MODEL_ARCH`, (2) a raw checkpoint at `MODEL_PATH`,
(3) the pretrained backbone fallback. Training a new model therefore upgrades
serving **without a code change** — see [Model Inference](11_Model_Inference.md).

## 6. Results

Verification run on the synthetic dataset (DenseNet-121, transfer learning, 6
epochs, CPU) — demonstrating the pipeline learns and that inference improves:

| Metric | Value |
|--------|-------|
| Test accuracy | 1.00 |
| Precision / Recall / F1 (PNEUMONIA) | 1.00 / 1.00 / 1.00 |
| ROC-AUC | 1.00 |
| Registered version | `densenet121` v1 |

Inference auto-load impact (same synthetic image):

| Model source | Predicted | Confidence |
|--------------|-----------|-----------|
| Pretrained/untrained fallback | PNEUMONIA | ~0.52 (≈ chance) |
| **Registered trained v1** | PNEUMONIA | **~0.90** |

> These numbers reflect a deliberately-separable synthetic set used to validate
> the pipeline. Real Kaggle-dataset numbers depend on the run; the same commands
> produce them once the dataset is placed under `data/datasets/chest_xray/`.

## 7. Model comparison

Both architectures share the identical pipeline, transforms and evaluation, so
they are directly comparable. Switch with a single flag — no code change:

```bash
python scripts/train.py --config configs/training.yaml --arch densenet121
python scripts/train.py --config configs/training.yaml --arch efficientnet_b0
```

| Architecture | Params | Notes |
|--------------|--------|-------|
| DenseNet-121 | ~8.0 M | strong feature reuse; default |
| EfficientNet-B0 | ~5.3 M | lighter, mobile-friendly |

Compare their registered `metrics` (accuracy / F1 / ROC-AUC) in
`data/weights/registry.json`; promote the better one by keeping it `approved`.

## 8. Running the pipeline

```bash
# Real dataset (place under data/datasets/chest_xray/ first)
python scripts/train.py --config configs/training.yaml

# Pipeline verification without any download
python scripts/train.py --synthetic --arch densenet121 --epochs 6

# Then start the API — inference auto-loads the registered model
uvicorn app.main:app --reload
```
