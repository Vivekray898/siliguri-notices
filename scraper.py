import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime

BASE_URL = "https://siliguricollege.org.in/"
NEWS_URL = BASE_URL + "news.php"


def get_notice_links():
    """
    Scrapes the news page and extracts all notice information.
    Returns:
        list: List of dictionaries containing notice details
    """
    try:
        res = requests.get(NEWS_URL, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        notices = []
        for panel in soup.select(".panel.panel-default"):
            title_tag = panel.select_one(".panel-title a")
            date_tag = panel.select_one(".panel-footer span")

            if title_tag:
                link = str(title_tag.get("href", ""))
                title = title_tag.get_text(strip=True)
                date = date_tag.get_text(strip=True) if date_tag else None

                notices.append({
                    "title":
                    title,
                    "url":
                    link if link.startswith("http") else BASE_URL + link,
                    "date":
                    date
                })

        print(f"✓ Found {len(notices)} notices")
        return notices

    except requests.RequestException as e:
        print(f"✗ Error fetching notices: {e}")
        return []


def get_google_drive_link(notice_url):
    """
    Extracts Google Drive link from a notice page.
    Returns:
        str or None: Google Drive link if found
    """
    try:
        res = requests.get(notice_url, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        gdrive_link = soup.select_one('a[href*="drive.google.com"]')
        return gdrive_link["href"] if gdrive_link else None

    except requests.RequestException as e:
        print(f"  ✗ Error fetching Google Drive link: {e}")
        return None


def load_existing_notices():
    """
    Loads previously saved notices (latest JSON file) if available.
    Returns:
        set: URLs of existing notices
    """
    json_files = [
        f for f in os.listdir()
        if f.startswith("notices_") and f.endswith(".json")
    ]
    if not json_files:
        return set()

    latest_file = sorted(json_files)[-1]
    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"Loaded {latest_file} for comparison")
            return {n["url"] for n in data.get("notices", [])}
    except Exception as e:
        print(f"✗ Error loading existing notices: {e}")
        return set()


def get_next_filename():
    """
    Generates next numbered filename like notices_1.json, notices_2.json, etc.
    """
    existing = [
        f for f in os.listdir()
        if f.startswith("notices_") and f.endswith(".json")
    ]
    if not existing:
        return "notices_1.json"
    numbers = []
    for f in existing:
        try:
            num = int(f.split("_")[1].split(".")[0])
            numbers.append(num)
        except:
            pass
    next_num = max(numbers, default=0) + 1
    return f"notices_{next_num}.json"


def save_to_json(notices, filename):
    """
    Saves notices to a JSON file.
    """
    try:
        data = {
            "scraped_at": datetime.now().isoformat(),
            "total_notices": len(notices),
            "notices": notices
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Data saved to {filename}")

    except Exception as e:
        print(f"\n✗ Error saving to JSON: {e}")


def main():
    print("=" * 60)
    print("Siliguri College Notice Scraper")
    print("=" * 60)
    print(f"\nScraping from: {NEWS_URL}\n")

    existing_links = load_existing_notices()
    all_notices = get_notice_links()

    if not all_notices:
        print("\nNo notices found or error occurred.")
        return

    # Filter new notices only
    new_notices = [n for n in all_notices if n["url"] not in existing_links]

    if not new_notices:
        print("\nNo new notices found. Everything is up to date.")
        return

    print(
        f"\nFound {len(new_notices)} new notices. Fetching Google Drive links..."
    )
    for i, notice in enumerate(new_notices, 1):
        print(
            f"[{i}/{len(new_notices)}] Processing: {notice['title'][:50]}...")
        gdrive = get_google_drive_link(notice["url"])
        notice["google_drive"] = gdrive

    # Combine old + new
    combined = []
    if existing_links:
        latest_file = sorted([
            f for f in os.listdir()
            if f.startswith("notices_") and f.endswith(".json")
        ])[-1]
        with open(latest_file, "r", encoding="utf-8") as f:
            old_data = json.load(f)
        combined = old_data.get("notices", []) + new_notices
    else:
        combined = new_notices

    # Save into next numbered file
    new_filename = get_next_filename()
    save_to_json(combined, new_filename)

    print("\n" + "=" * 60)
    print(f"Added {len(new_notices)} new notice(s). Saved as {new_filename}.")
    print("=" * 60)


if __name__ == "__main__":
    main()
