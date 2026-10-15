from datetime import date, time
from pydantic import BaseModel, Field

class CallRecord(BaseModel):
    date: date = Field(..., description="The date of the call")
    time: time = Field(..., description="The time of the call")
    country_code: str = Field(..., description="The country code of the caller")
    caller_number: str = Field(..., description="The caller's phone number")