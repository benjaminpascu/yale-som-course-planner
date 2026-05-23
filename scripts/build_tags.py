"""
build_tags.py

Merges the per-requirement filter CSVs from som.yale.edu into a single
course_number -> tag mapping ready to import into Supabase.

USAGE:
  1. Download all 7 requirement-filter CSVs from the URLs below.
  2. Place them in ./csvs/ named MGAM.csv, MGBA.csv, etc.
  3. Also place the unfiltered "All.csv" in the same folder.
  4. Run: python build_tags.py
  5. Outputs: course_tags.csv (tag mapping). Course timing data lives in
     docs/data-samples/courses_master_new.csv (maintained separately).

FILTER URLS (replace SESSION_CODES per semester):
  https://som.yale.edu/elective-core-courses?sessions=SESSION_CODES&courseAttributes=MGAM
  ...etc for each of the 7 codes below.

To get fresh SESSION_CODES, go to the SOM site, check the boxes for the
semesters you want, and copy the `sessions=` value from the URL.
"""

import os
import pandas as pd

CSV_DIR = "./csvs"
OUTPUT_DIR = "."

# The 7 active requirement tags. Subject categories like Finance/Marketing
# come back empty from Yale's filter and live in the `category` field
# of the master CSV instead.
REQUIREMENT_TAGS = {
    "MGAM": "SOM MAM Req",
    "MGBA": "SOM MMS Asset Management Req",
    "MGGB": "SOM MMS Global Business & Society Req",
    "MGGS": "SOM MBA Global Studies Req",
    "MGLD": "SOM MBA Leadership Dist Req",
    "MGMS": "SOM Management Science Req",
    "MGSR": "SOM MMS Systemic Risk Req",
}


def build_tag_table():
    """course_number -> [tag_code]"""
    tag_map = {}
    for code in REQUIREMENT_TAGS:
        path = os.path.join(CSV_DIR, f"{code}.csv")
        if not os.path.exists(path):
            print(f"  WARN: missing {path}")
            continue
        try:
            df = pd.read_csv(path)
        except pd.errors.EmptyDataError:
            print(f"  {code}: empty file, skipping")
            continue
        if len(df) == 0:
            print(f"  {code}: 0 rows, skipping")
            continue
        n_unique = df["Course Number"].nunique()
        print(f"  {code}: {len(df)} rows, {n_unique} unique course numbers")
        for course_num in df["Course Number"].unique():
            tag_map.setdefault(course_num, set()).add(code)
    return tag_map


def main():
    print("Building tag table...")
    tag_map = build_tag_table()
    print(f"\nTotal courses with at least one tag: {len(tag_map)}")

    rows = []
    for course_num in sorted(tag_map):
        for code in sorted(tag_map[course_num]):
            rows.append({
                "course_number": course_num,
                "tag_code": code,
                "tag_label": REQUIREMENT_TAGS[code],
            })
    tags_df = pd.DataFrame(rows)
    tags_out = os.path.join(OUTPUT_DIR, "course_tags.csv")
    tags_df.to_csv(tags_out, index=False)
    print(f"Wrote {len(tags_df)} tag assignments to {tags_out}")
    print(
        "\nCourse list: update docs/data-samples/courses_master_new.csv "
        "(not produced by this script)."
    )


if __name__ == "__main__":
    main()
