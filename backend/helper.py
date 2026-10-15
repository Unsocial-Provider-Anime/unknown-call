from pathlib import Path

import pandas as pd

def mask_caller_number(value):
    if pd.isna(value):
        return value

    digit_count = 0
    masked = []
    for character in str(value):
        if character.isdigit():
            digit_count += 1
            masked.append(character if digit_count <= 4 else "X")
        else:
            masked.append(character)

    return "".join(masked)

def read_call_log(filename:str) -> pd.DataFrame:
    file_path = Path(__file__).with_name(filename)
    if not file_path.is_file():
        raise FileNotFoundError(f"Workbook not found: {file_path}")

    return pd.read_excel(file_path, engine="openpyxl")


if __name__ == "__main__":
    raw_call_log = read_call_log("raw_Spam_Call_Log.xlsx")

    processed_call_records = raw_call_log[
        ["Date", "Time", "Country Code", "Caller Number"]
    ].rename(columns={
        "Date": "date",
        "Time": "time",
        "Country Code": "country_code",
        "Caller Number": "caller_number",
    })

    processed_call_records["caller_number"] = processed_call_records["caller_number"].apply(mask_caller_number)

    output_path = Path(__file__).with_name("processed_unknown_call_log.xlsx")
    processed_call_records.to_excel(output_path, index=False, engine="openpyxl")
    csv_path = Path(__file__).with_name("processed_unknown_call_log.csv")
    processed_call_records.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"Processed call log saved to: {output_path}")
    print(f"Processed call log CSV saved to: {csv_path}")
    print(f"Number of records: {len(processed_call_records)}")
    print("Processed call log preview:")
    print(processed_call_records.head())
    