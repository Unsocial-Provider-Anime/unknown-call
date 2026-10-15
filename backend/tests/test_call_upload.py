import os
import unittest
from datetime import date, time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}):
    from app.main import app
    from database.local_db_client import engine


class CallUploadTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock(spec=Connection)
        connect = self.enterContext(patch.object(engine, "connect"))
        connect.return_value.__enter__.return_value = self.db
        self.client = self.enterContext(TestClient(app))

    def upload(self, content, filename="calls.csv"):
        return self.client.post(
            "/api/calls/upload",
            files={"file": (filename, content, "text/csv")},
        )

    def test_valid_batch_uses_typed_parameters_and_preserves_phone_strings(self):
        response = self.upload(
            b"\xef\xbb\xbfdate,time,country_code,caller_number,extra\r\n"
            b"2026-10-15,12:30:00,001,0012345,ignored\r\n"
            b"2026-10-16,09:15:00,+44,0098765,ignored\r\n",
            filename="calls.CSV",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "filename": "calls.CSV",
            "count": 2,
            "records": [
                {"date": "2026-10-15", "time": "12:30:00",
                 "country_code": "001", "caller_number": "0012345"},
                {"date": "2026-10-16", "time": "09:15:00",
                 "country_code": "+44", "caller_number": "0098765"},
            ],
        })
        self.db.begin.assert_called_once_with()
        self.db.execute.assert_called_once()
        statement, parameters = self.db.execute.call_args.args
        self.assertIn("INSERT INTO call_records", str(statement))
        self.assertEqual(parameters, [
            {"date": date(2026, 10, 15), "time": time(12, 30),
             "country_code": "001", "caller_number": "0012345"},
            {"date": date(2026, 10, 16), "time": time(9, 15),
             "country_code": "+44", "caller_number": "0098765"},
        ])
        self.db.begin.return_value.__exit__.assert_called_once_with(
            None, None, None
        )

    def test_invalid_later_row_rejects_entire_batch(self):
        for invalid_date, invalid_time, field in (
            ("not-a-date", "12:30:00", "date"),
            ("2026-10-15", "25:30:00", "time"),
        ):
            with self.subTest(field=field):
                content = (
                    "date,time,country_code,caller_number\n"
                    "2026-10-15,12:30:00,001,0012345\n"
                    f"{invalid_date},{invalid_time},001,0012345\n"
                ).encode()
                response = self.upload(content)

                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["detail"][0]["loc"], [1, field])
                self.db.begin.assert_not_called()
                self.db.execute.assert_not_called()

    def test_missing_columns(self):
        response = self.upload(b"date,time\n2026-10-15,12:30:00\n")

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], {
            "missing_columns": ["country_code", "caller_number"]
        })
        self.db.execute.assert_not_called()

    def test_invalid_files(self):
        for content, filename in (
            (b"anything", "calls.txt"),
            (b"", "calls.csv"),
            (b"\xff", "calls.csv"),
            (b'date,time,country_code,caller_number\n"unfinished', "calls.csv"),
        ):
            with self.subTest(content=content, filename=filename):
                response = self.upload(content, filename)

                self.assertEqual(response.status_code, 400)
                self.db.execute.assert_not_called()

    def test_header_only_upload_skips_insert(self):
        response = self.upload(b"date,time,country_code,caller_number\n")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "filename": "calls.csv", "count": 0, "records": []
        })
        self.db.begin.assert_not_called()
        self.db.execute.assert_not_called()

    def test_database_failure_exits_transaction_and_returns_503(self):
        failure = SQLAlchemyError("simulated insert failure")
        self.db.execute.side_effect = failure

        response = self.upload(
            b"date,time,country_code,caller_number\n"
            b"2026-10-15,12:30:00,001,0012345\n"
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Database unavailable"})
        exit_args = self.db.begin.return_value.__exit__.call_args.args
        self.assertIs(exit_args[0], SQLAlchemyError)
        self.assertIs(exit_args[1], failure)


if __name__ == "__main__":
    unittest.main()