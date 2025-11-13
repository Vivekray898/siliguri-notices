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
    Loads previously saved notices from notices.json if available.
    Returns:
        tuple: (set of URLs, list of existing notices)
    """
    if not os.path.exists("notices.json"):
        return set(), []

    try:
        with open("notices.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            existing_notices = data.get("notices", [])
            print(f"Loaded notices.json with {len(existing_notices)} existing notices")
            return {n["url"] for n in existing_notices}, existing_notices
    except Exception as e:
        print(f"✗ Error loading existing notices: {e}")
        return set(), []


def save_to_json(notices, filename="notices.json"):
    """
    Saves notices to notices.json file.
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

    existing_links, existing_notices = load_existing_notices()
    all_notices = get_notice_links()

    if not all_notices:
        print("\nNo notices found or error occurred.")
        return

    # Filter new notices only
    new_notices = [n for n in all_notices if n["url"] not in existing_links]

    if not new_notices:
        print("\nNo new notices found. Everything is up to date.")
        # Still save to update the scraped_at timestamp
        save_to_json(existing_notices)
        return

    print(
        f"\nFound {len(new_notices)} new notices. Fetching Google Drive links..."
    )
    for i, notice in enumerate(new_notices, 1):
        print(
            f"[{i}/{len(new_notices)}] Processing: {notice['title'][:50]}...")
        gdrive = get_google_drive_link(notice["url"])
        notice["google_drive"] = gdrive

    # Combine new notices at the beginning (most recent first) + existing notices
    combined = new_notices + existing_notices

    # Save to notices.json
    save_to_json(combined)

    print("\n" + "=" * 60)
    print(f"Added {len(new_notices)} new notice(s) to notices.json.")
    print(f"Total notices: {len(combined)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
