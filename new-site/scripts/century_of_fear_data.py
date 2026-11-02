"""Copy the Horrorverse timeline data for the "A century of fear" essay.

Reads Horrorverse's `data/v2/timeline.json`, adds a `tmdb` map from every film id the data
references to its TMDB id, and writes `public/writing/a-century-of-fear/timeline.json`.
Ids are either `tmdb:<id>` or catalogue ids, resolved through Horrorverse's catalogue
(opened read-only). Films without a TMDB id are left out of the map, so they get no link.

    python3 scripts/century_of_fear_data.py [--horrorverse ~/repos/horrorshow]
"""

import argparse
import json
import logging
import re
import sqlite3
from pathlib import Path

log = logging.getLogger("century_of_fear_data")

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "public" / "writing" / "a-century-of-fear" / "timeline.json"
FILM_ID = re.compile(r"^(tmdb|ml):\S+$")


def film_ids(node, found):
    """Collect every string in the data that looks like a film id."""
    if isinstance(node, dict):
        for value in node.values():
            film_ids(value, found)
    elif isinstance(node, list):
        for value in node:
            film_ids(value, found)
    elif isinstance(node, str) and FILM_ID.match(node):
        found.add(node)
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--horrorverse", type=Path, default=Path.home() / "repos" / "horrorshow"
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    source = args.horrorverse / "data" / "v2" / "timeline.json"
    catalogue = args.horrorverse / "data" / "v3" / "catalogue.sqlite"
    data = json.loads(source.read_text())
    ids = film_ids(data, set())

    tmdb = {}
    lookup = []
    for film_id in ids:
        prefix, _, rest = film_id.partition(":")
        if prefix == "tmdb" and rest.isdigit():
            tmdb[film_id] = int(rest)
        else:
            lookup.append(film_id)
    if lookup:
        con = sqlite3.connect(f"file:{catalogue}?mode=ro", uri=True)
        try:
            for start in range(0, len(lookup), 500):
                chunk = lookup[start : start + 500]
                rows = con.execute(
                    f"SELECT movie_id, tmdb_id FROM movies WHERE movie_id IN ({','.join('?' * len(chunk))})",
                    chunk,
                )
                tmdb.update(
                    {
                        movie_id: int(tmdb_id)
                        for movie_id, tmdb_id in rows
                        if tmdb_id is not None
                    }
                )
        finally:
            con.close()

    missing = sorted(ids - tmdb.keys())
    data["tmdb"] = dict(sorted(tmdb.items()))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    log.info(
        "%d film ids, %d with a TMDB id, %d without", len(ids), len(tmdb), len(missing)
    )
    if missing:
        log.warning("No TMDB id: %s", ", ".join(missing))
    log.info("Wrote %s (%.0f KB)", OUT.relative_to(SITE), OUT.stat().st_size / 1024)


if __name__ == "__main__":
    main()
