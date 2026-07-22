"""Guard the small, shared Python scraper architecture."""

import ast
from pathlib import Path

SCRAPER_ROOT = Path(__file__).parents[1] / "scraper"
BLOCKOUT_ADAPTER = SCRAPER_ROOT / "infrastructure" / "blockout"


def test_generated_contracts_stay_inside_the_blockout_adapter() -> None:
    """Keep generated transport details out of domain and application code."""
    violations = []
    for path in SCRAPER_ROOT.rglob("*.py"):
        if path.is_relative_to(BLOCKOUT_ADAPTER):
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            module = node.module if isinstance(node, ast.ImportFrom) else None
            names = (
                [item.name for item in node.names]
                if isinstance(node, ast.Import)
                else []
            )
            if (module and module.startswith("blockout_contract_clients")) or any(
                name.startswith("blockout_contract_clients") for name in names
            ):
                violations.append(str(path.relative_to(SCRAPER_ROOT)))
    assert violations == []


def test_scraper_owns_no_handwritten_internal_transport_models() -> None:
    """Prevent local mirrors from returning after generated client adoption."""
    forbidden = []
    for path in SCRAPER_ROOT.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name.endswith(
                ("InternalRequest", "InternalResponse")
            ):
                forbidden.append(f"{path.relative_to(SCRAPER_ROOT)}:{node.name}")
    assert forbidden == []
