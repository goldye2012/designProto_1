import argparse
import math
import os
import sys
from pathlib import Path

import serial
from dotenv import load_dotenv
from supabase import create_client


BAUD_RATE = 9600


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read numeric values from an Arduino and upload them to Supabase."
    )
    parser.add_argument(
        "port",
        nargs="?",
        default="/dev/cu.usbmodem11201",
        help="Arduino serial port (default: /dev/cu.usbmodem11201)",
    )
    args = parser.parse_args()

    load_dotenv(Path(__file__).with_name(".env"))
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        parser.error(
            "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env"
        )

    supabase = create_client(supabase_url, supabase_key)

    try:
        with serial.Serial(args.port, BAUD_RATE, timeout=1) as arduino:
            print(f"Reading from {args.port} at {BAUD_RATE} baud. Press Ctrl+C to stop.")
            while True:
                line = arduino.readline()
                if not line:
                    continue

                try:
                    value = float(line.decode("utf-8").strip())
                except (UnicodeDecodeError, ValueError):
                    print(f"Skipping invalid serial value: {line!r}", file=sys.stderr)
                    continue

                if not math.isfinite(value):
                    print(f"Skipping non-finite serial value: {line!r}", file=sys.stderr)
                    continue

                supabase.table("readings").insert({"value": value}).execute()
                print(f"Uploaded value: {value}")
    except serial.SerialException as error:
        print(f"Could not open/read serial port {args.port}: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nStopped.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
