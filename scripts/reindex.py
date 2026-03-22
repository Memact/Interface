from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from core.database import list_events_batch
from core.network import build_network
from core.vector_store import is_available, reset_collection, upsert_events


def main() -> int:
    if not is_available():
        print("ChromaDB is not available. Install dependencies and try again.")
        return 1

    reset_collection()
    batch_size = 1000
    offset = 0
    total = 0
    while True:
        batch = list_events_batch(offset=offset, limit=batch_size)
        if not batch:
            break
        upsert_events(batch)
        total += len(batch)
        offset += len(batch)
        print(f"Indexed {total} events...")

    print(f"Done. Indexed {total} events.")
    print("Building experience network...")
    result = build_network(full_rebuild=True)
    print(
        f"Network built: {result['sessions_created']} sessions, "
        f"{result['links_created']} links, "
        f"{result['events_scored']} events scored."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
