"""Provider adapters and their ENV-driven factories.

Each subpackage exposes a ``factory.py`` with a ``get_<x>_provider(settings)``
function that returns the concrete adapter chosen by the relevant ENV selector.
Adapters requiring optional third-party SDKs lazy-import them so importing the
package never fails when those libraries are absent (see ``docs/16_AI_Providers.md``).
"""
