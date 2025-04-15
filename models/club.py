from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Club:
    id: str
    name: str
    city: Optional[str] = None
    postal_code: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    last_update: datetime = field(default_factory=datetime.now)
    active: bool = True