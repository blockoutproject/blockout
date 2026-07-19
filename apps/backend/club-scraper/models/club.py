from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Club:
    id: str
    rawName: str
    name: str
    city: Optional[str] = None
    postalCode: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phoneNumber: Optional[str] = None
    website: Optional[str] = None
    logoUrl: Optional[str] = None
    active: bool = True
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None