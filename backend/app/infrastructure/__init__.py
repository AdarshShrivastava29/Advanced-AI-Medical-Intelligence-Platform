"""Infrastructure layer: concrete adapters for the domain ports.

Contains the MongoDB client + repositories, provider adapters (LLM, embeddings,
vector store, cache, task queue) and their ENV-driven factories. Nothing here is
imported by the domain layer.
"""
