# 10 — Model Training

> **AIMIP** chest X-ray pneumonia classifier — training pipeline.
>
> **Disclaimer:** AIMIP is clinical **decision-support**, **not a medical device**; outputs are
> informational, not a diagnosis, and must be reviewed by a licensed clinician. Not FDA/CE cleared.
>
> **Training is optional.** The application ships with a **pretrained-inference fallback**: if no
> weights exist at `MODEL_PATH`, inference uses the ImageNet-pretrained backbone with a fresh 2-class
> head, so the app runs without the dataset or a training run. See
> [Model Inference](11_Model_Inference.md).

**Related docs:** [AI Architecture](09_AI_Architecture.md) · [Model Inference](11_Model_Inference.md) ·
[Grad-CAM](12_GradCAM.md) · [Database Design](17_Database_Design.md) ·
[Environment Configuration](31_Environment_Configuration.md)

---

## 1. Dataset

**Source:** Kaggle "Chest X-Ray Images (Pneumonia)" (Kermany et al.). Frontal chest radiographs
labeled `NORMAL` or `PNEUMONIA` (bacterial and viral cases collapsed into a single `PNEUMONIA`
class), pre-split into `train` / `val` / `test`. See the dataset datasheet summary in
[AI Architecture §6.2](09_AI_Architecture.md).

The class index order is **contractual** across training, inference and Grad-CAM:

```
0 → NORMAL
1 → PNEUMONIA
```

### 1.1 Directory layout

The archive is extracted under `PDF_PATH`'s sibling `data/` tree; the trainer reads a dataset root
via `--data-dir` (default `./data/chest_xray`):

```
data/chest_xray/
├── train/
│   ├── NORMAL/       *.jpeg
│   └── PNEUMONIA/    *.jpeg
├── val/
│   ├── NORMAL/
│   └── PNEUMONIA/
└── test/
    ├── NORMAL/
    └── PNEUMONIA/
```

This is exactly the `torchvision.datasets.ImageFolder` convention, so folder names map directly to
class indices (alphabetical → `NORMAL=0`, `PNEUMONIA=1`, matching the contract above).

---

## 2. Preprocessing & transforms

Input spec is fixed by the `Classifier` port and the canon: **RGB `224×224`, ImageNet mean/std**.
Chest X-rays are single-channel; they are expanded to 3 channels so the ImageNet-pretrained backbone
applies unchanged.

```python
# backend/app/infrastructure/ml/training/transforms.py
from torchvision import transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
IMG_SIZE = 224

train_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),      # X-ray → 3-channel
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=10),
    transforms.ColorJitter(brightness=0.10, contrast=0.10),
    transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

# val/test: deterministic, NO augmentation — identical to the inference transform
eval_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])
```

**Augmentation rationale:** flips/small rotations/translation and mild brightness-contrast jitter
model realistic positioning and exposure variation without introducing anatomically implausible
transforms (no vertical flip — a chest X-ray has a fixed superior/inferior orientation). The
**`eval_transform` is byte-for-byte the transform used at inference time** so there is no train/serve
skew; [Model Inference](11_Model_Inference.md) imports the same function.

---

## 3. Transfer-learning strategy

Three-phase transfer learning on the ImageNet-pretrained backbone selected by `MODEL_ARCH`
(`densenet121` default, or `efficientnet_b0`), built through the `Classifier` port and
`ClassifierFactory` (see [AI Architecture §3–4](09_AI_Architecture.md)):

1. **Freeze backbone → train head.** Freeze all pretrained parameters; train only the fresh 2-class
   head. Fast, stabilizes the randomly-initialized head against the strong pretrained features.
2. **Fine-tune head (+ upper blocks).** Keep training the head; optionally unfreeze the last
   convolutional block at a low LR to adapt high-level features to radiographs.
3. **Optional full unfreeze.** Unfreeze the whole network at a very small LR (discriminative LR: head
   > body) for a few epochs to squeeze out remaining accuracy. Guarded by `--unfreeze-all` and used
   only when the val metrics plateau in phase 2.

```python
def set_trainable(model, arch: str, phase: str) -> None:
    for p in model.parameters():
        p.requires_grad = False
    # head is always trainable
    head = model.classifier if arch == "densenet121" else model.classifier[1]
    for p in head.parameters():
        p.requires_grad = True
    if phase in ("finetune", "unfreeze_all"):
        last_block = (model.features.denseblock4 if arch == "densenet121"
                      else model.features[-1])
        for p in last_block.parameters():
            p.requires_grad = True
    if phase == "unfreeze_all":
        for p in model.parameters():
            p.requires_grad = True
```

---

## 4. Optimizer, loss, scheduler, early stopping

| Concern | Choice | Notes |
|---------|--------|-------|
| **Optimizer** | `AdamW` | decoupled weight decay; `lr=1e-3` (head phase), `lr=1e-4`/`1e-5` (fine-tune / unfreeze), `weight_decay=1e-4` |
| **Loss** | Weighted cross-entropy | class weights inversely proportional to class frequency, to correct the `NORMAL`/`PNEUMONIA` imbalance |
| **Scheduler** | `CosineAnnealingLR` (or `ReduceLROnPlateau` on val F1) | smooth LR decay per phase |
| **Early stopping** | patience on val F1 | restores best checkpoint; halts when val F1 stops improving for `--patience` epochs |
| **AMP** | `torch.cuda.amp` autocast + `GradScaler` | mixed precision when CUDA is available |

```python
# class weights from train-split counts (higher weight for the minority class)
import torch
counts = torch.tensor([n_normal, n_pneumonia], dtype=torch.float)
class_weights = counts.sum() / (len(counts) * counts)     # inverse-frequency
criterion = torch.nn.CrossEntropyLoss(weight=class_weights.to(device))
optimizer = torch.optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=1e-3, weight_decay=1e-4,
)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
```

---

## 5. Metrics

Evaluated on `val` each epoch (for early stopping / checkpoint selection) and once on the held-out
`test` split for the model card. `PNEUMONIA` (index 1) is the **positive** class.

- **Accuracy**, **Precision**, **Recall (sensitivity)**, **F1** — via `sklearn.metrics`.
- **AUROC** — `roc_auc_score` on the softmax probability of the positive class.
- **Confusion matrix** — 2×2 `[[TN, FP], [FN, TP]]`.

In a clinical triage context **recall on `PNEUMONIA` is prioritized** (a false negative is the costly
error), which is another reason the loss is class-weighted and the checkpoint is selected on F1
rather than raw accuracy.

```python
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix,
)

def evaluate(model, loader, device) -> dict:
    model.eval()
    y_true, y_pred, y_prob = [], [], []
    with torch.no_grad():
        for x, y in loader:
            logits = model(x.to(device))
            prob_pneu = torch.softmax(logits, dim=1)[:, 1]  # positive class
            y_true += y.tolist()
            y_pred += logits.argmax(1).cpu().tolist()
            y_prob += prob_pneu.cpu().tolist()
    return {
        "accuracy":  accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall":    recall_score(y_true, y_pred, zero_division=0),
        "f1":        f1_score(y_true, y_pred, zero_division=0),
        "auroc":     roc_auc_score(y_true, y_prob),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
```

---

## 6. Checkpointing to `MODEL_PATH`

The best checkpoint (highest val F1) is written to `MODEL_PATH` (`./data/weights/model.pt`) as a
self-describing bundle, alongside a `model_card.json` and the `model_version` string (see
[AI Architecture §5](09_AI_Architecture.md)).

```python
def save_checkpoint(model, arch, metrics, model_version, path):
    torch.save(
        {
            "model_arch": arch,                 # densenet121 | efficientnet_b0
            "model_version": model_version,     # e.g. densenet121-v1.2.0+a1b9f3c
            "class_names": ["NORMAL", "PNEUMONIA"],
            "input_spec": {"size": 224, "mean": IMAGENET_MEAN, "std": IMAGENET_STD},
            "state_dict": model.state_dict(),
            "metrics": metrics,                 # test-split metrics for the model card
        },
        path,                                   # MODEL_PATH
    )
```

Inference loads this bundle at `MODEL_PATH`, verifies `model_arch` matches the running `MODEL_ARCH`,
and records `model_version` on each `predictions` document. See
[Model Inference](11_Model_Inference.md) and [Database Design](17_Database_Design.md).

---

## 7. Reproducibility

All entropy sources are seeded, and cuDNN is put in deterministic mode. The seed and the resolved
config are logged so a run can be reproduced.

```python
import os, random, numpy as np, torch

def seed_everything(seed: int = 42) -> None:
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
```

The DataLoader is seeded via a `generator` and a `worker_init_fn`. The `model_version` embeds the
training-code git SHA so weights are tied to exact code (see [AI Architecture §5.1](09_AI_Architecture.md)).

---

## 8. Representative training loop (PyTorch pseudo-code)

```python
# backend/app/infrastructure/ml/training/trainer.py (representative)
import torch
from torch.utils.data import DataLoader
from torchvision.datasets import ImageFolder
from app.infrastructure.ml.classifier.factory import ClassifierFactory
from .transforms import train_transform, eval_transform

def train(data_dir, arch, model_path, epochs=15, batch_size=32,
          patience=4, unfreeze_all=False, seed=42, device="cuda"):
    seed_everything(seed)

    train_ds = ImageFolder(f"{data_dir}/train", transform=train_transform)
    val_ds   = ImageFolder(f"{data_dir}/val",   transform=eval_transform)
    test_ds  = ImageFolder(f"{data_dir}/test",  transform=eval_transform)
    train_dl = DataLoader(train_ds, batch_size, shuffle=True,  num_workers=4)
    val_dl   = DataLoader(val_ds,   batch_size, shuffle=False, num_workers=4)
    test_dl  = DataLoader(test_ds,  batch_size, shuffle=False, num_workers=4)

    classifier = ClassifierFactory.create(arch, pretrained=True)   # MODEL_ARCH
    model = classifier.build().to(device)

    class_weights = compute_class_weights(train_ds).to(device)
    criterion = torch.nn.CrossEntropyLoss(weight=class_weights)
    scaler = torch.cuda.amp.GradScaler(enabled=(device == "cuda"))

    best_f1, epochs_no_improve, best_state = -1.0, 0, None
    phases = [("head", 3), ("finetune", epochs - 3)]               # phase schedule

    for phase, phase_epochs in phases:
        set_trainable(model, arch, "unfreeze_all" if unfreeze_all else phase)
        optimizer = torch.optim.AdamW(
            filter(lambda p: p.requires_grad, model.parameters()),
            lr=1e-3 if phase == "head" else 1e-4, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=phase_epochs)

        for epoch in range(phase_epochs):
            model.train()
            for x, y in train_dl:
                x, y = x.to(device), y.to(device)
                optimizer.zero_grad(set_to_none=True)
                with torch.cuda.amp.autocast(enabled=(device == "cuda")):
                    loss = criterion(model(x), y)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            scheduler.step()

            val_metrics = evaluate(model, val_dl, device)
            if val_metrics["f1"] > best_f1:
                best_f1, best_state, epochs_no_improve = (
                    val_metrics["f1"], {k: v.cpu() for k, v in model.state_dict().items()}, 0)
            else:
                epochs_no_improve += 1
                if epochs_no_improve >= patience:
                    break                                           # early stopping

    model.load_state_dict(best_state)                              # restore best
    test_metrics = evaluate(model, test_dl, device)
    save_checkpoint(model, arch, test_metrics, make_model_version(arch), model_path)
    return test_metrics
```

---

## 9. Running training via `scripts/train.py`

Training is exposed as a CLI entrypoint at `backend/scripts/train.py`, which reads defaults from
`Settings` (so `MODEL_ARCH` and `MODEL_PATH` come from the canonical ENV) and allows overrides via
flags.

```python
# backend/scripts/train.py (entrypoint)
import argparse
from app.core.config import Settings
from app.infrastructure.ml.training.trainer import train

def main() -> None:
    settings = Settings()
    ap = argparse.ArgumentParser(description="Train the AIMIP chest X-ray classifier")
    ap.add_argument("--data-dir", default="./data/chest_xray")
    ap.add_argument("--arch", default=settings.MODEL_ARCH,     # densenet121|efficientnet_b0
                    choices=["densenet121", "efficientnet_b0"])
    ap.add_argument("--model-path", default=settings.MODEL_PATH)
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--patience", type=int, default=4)
    ap.add_argument("--unfreeze-all", action="store_true")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--device", default="cuda")
    args = ap.parse_args()

    metrics = train(args.data_dir, args.arch, args.model_path,
                    args.epochs, args.batch_size, args.patience,
                    args.unfreeze_all, args.seed, args.device)
    print("Test metrics:", metrics)

if __name__ == "__main__":
    main()
```

**Invocation (from `backend/`):**

```bash
# default: densenet121 from ENV, best checkpoint → MODEL_PATH (./data/weights/model.pt)
python scripts/train.py --data-dir ./data/chest_xray

# alternative architecture + optional full unfreeze
python scripts/train.py --arch efficientnet_b0 --unfreeze-all --epochs 20
```

On completion the checkpoint at `MODEL_PATH` is immediately picked up by the inference service on the
next model load; there is no separate deployment step for a local run. See
[Model Inference](11_Model_Inference.md).

---

## 10. Cross-references

- Port / factory / versioning → [AI Architecture](09_AI_Architecture.md)
- Loading and serving the checkpoint → [Model Inference](11_Model_Inference.md)
- Explanations over the trained model → [Grad-CAM](12_GradCAM.md)
- Where predictions are persisted → [Database Design](17_Database_Design.md)
- `MODEL_ARCH`, `MODEL_PATH` and paths → [Environment Configuration](31_Environment_Configuration.md)
