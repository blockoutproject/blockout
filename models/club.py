from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Club:
    id: str
    raw_name: str   
    name: str
    city: Optional[str] = None
    postal_code: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    last_update: Optional[datetime] = None