from datetime import date as Date, datetime as DateTime, time as Time

from pydantic import BaseModel, ConfigDict, Field

class CallRecordCreate(BaseModel):
    date: Date
    time: Time
    country_code: str = Field(min_length=1)
    caller_number: str = Field(min_length=1)


class CallRecordRead(CallRecordCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: DateTime