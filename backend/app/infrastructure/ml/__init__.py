"""Machine-learning infrastructure: classifiers, preprocessing, Grad-CAM, inference.

Everything torch-specific lives here. The application layer depends only on the
``InferenceEngine`` port; this package provides the concrete engine plus the
``MODEL_ARCH``-selected classifier registry (see ``docs/09_AI_Architecture.md``).
"""
