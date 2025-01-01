from enum import IntEnum

class DataSourcePriority(IntEnum):
    DB = 0
    FFVB = 1
    LNV_XML = 2
    LNV_HTML = 3 