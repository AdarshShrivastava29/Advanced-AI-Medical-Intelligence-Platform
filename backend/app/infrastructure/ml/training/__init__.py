"""Model training pipeline (Phase 5).

Consumes the Kaggle Chest X-Ray Pneumonia dataset (or any ``ImageFolder`` layout),
fine-tunes the ``MODEL_ARCH``-selected classifier via transfer learning, evaluates
it, writes artifacts, and registers the resulting checkpoint so the inference
engine auto-loads it (see ``docs/10_Model_Training.md``).
"""
