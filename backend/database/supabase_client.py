import os
from supabase import Client, create_client

from dotenv import load_dotenv

load_dotenv()

def get_supabase() -> Client:
  """Dependency function that provides a Supabase client instance."""
  SUPABASE_URL = os.getenv("SUPABASE_URL")
  SUPABASE_KEY = os.getenv("SUPABASE_KEY")
  if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Supabase URL and Key must be set in environment."
    )
  return create_client(SUPABASE_URL, SUPABASE_KEY)
