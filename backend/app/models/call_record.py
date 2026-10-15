from datetime import date as Date, time as Time
from pydantic import BaseModel, Field
from datetime import datetime

class CallRecordDB(BaseModel):
    id: int = Field(..., description="The unique identifier of the call record")
    date: Date = Field(..., description="The date of the call")
    time: Time = Field(..., description="The time of the call")
    country_code: str = Field(..., description="The country code of the caller")
    caller_number: str = Field(..., description="The caller's phone number")
    created_at: datetime = Field(..., description="The timestamp when the record was created")

class CallRecordCreate(BaseModel):
    date: Date = Field(..., description="The date of the call")
    time: Time = Field(..., description="The time of the call")
    country_code: str = Field(..., description="The country code of the caller")
    caller_number: str = Field(..., description="The caller's phone number")

class CallRecordRead(CallRecordCreate):
    id: int = Field(..., description="The unique identifier of the call record")
    created_at: datetime = Field(..., description="The timestamp when the record was created")