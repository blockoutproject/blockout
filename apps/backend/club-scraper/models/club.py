from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Club:
    id: str
    rawName: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    postalCode: Optional[str] = None
    email: Optional[str] = None
    phoneNumber: Optional[str] = None
    website: Optional[str] = None
    logoUrl: Optional[str] = None
    active: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    createdAt: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None
