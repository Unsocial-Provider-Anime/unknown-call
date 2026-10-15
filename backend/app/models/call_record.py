from datetime import date, time
from pydantic import BaseModel, Field
from datetime import datetime

class CallRecordDB(BaseModel):
    id: int = Field(..., description="The unique identifier of the call record")
    date: date = Field(..., description="The date of the call")
    time: time = Field(..., description="The time of the call")
    country_code: str = Field(..., description="The country code of the caller")
    caller_number: str = Field(..., description="The caller's phone number")
    created_at: datetime = Field(..., description="The timestamp when the record was created")

class CallRecordCreate(BaseModel):
    date: date = Field(..., description="The date of the call")
    time: time = Field(..., description="The time of the call")
    country_code: str = Field(..., description="The country code of the caller")
    caller_number: str = Field(..., description="The caller's phone number")