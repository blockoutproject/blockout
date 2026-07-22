"""Define precedence between competition data providers."""

from enum import IntEnum


class DataSourcePriority(IntEnum):
    """Order provider values from the least to the most authoritative source."""

    DB = 0
    FFVB = 1
    LNV_XML = 2
    LNV_HTML = 3
