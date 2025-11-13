# Siliguri College Notice Board

A modern, automated notice board that scrapes and displays college notices in real-time. The website features a clean, professional design with smart filters for easy navigation.

## 🌟 Features

- **Auto-updating notices** - Scrapes college website every 6 hours via GitHub Actions
- **Smart filtering** - Filter by department, date range, and document availability
- **Mobile-friendly** - Responsive design with off-canvas filters on mobile
- **Clean UI** - Professional, minimalist design optimized for readability
- **Real-time search** - Instant search across notice titles and dates
- **Quick access** - Direct links to notice details and Google Drive PDFs

## 🚀 Live Demo

Visit: `https://<your-username>.github.io/<your-repo-name>/`

## 📁 Project Structure

```
.
├── .github/
│   └── workflows/
│       └── scrape.yml          # GitHub Actions workflow for auto-scraping
├── index.html                   # Main HTML page
├── styles.css                   # Stylesheet
├── script.js                    # Frontend logic
├── scraper.py                   # Python scraper
├── notices.json                 # Auto-generated notices data
├── requirements.txt             # Python dependencies
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🛠️ Setup Instructions

### Step 1: Fork/Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on **Settings** → **Actions** → **General**
3. Under "Workflow permissions", select **Read and write permissions**
4. Click **Save**

### Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Select branch: **main** and folder: **/ (root)**
4. Click **Save**
5. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`

### Step 4: Test the Workflow

You can manually trigger the scraper:

1. Go to **Actions** tab
2. Click on **Scrape College Notices** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for it to complete (green checkmark)
5. The `notices.json` file will be updated automatically

### Step 5: Verify Auto-Updates

The scraper runs automatically every 6 hours:
- 12:00 AM UTC (5:30 AM IST)
- 6:00 AM UTC (11:30 AM IST)
- 12:00 PM UTC (5:30 PM IST)
- 6:00 PM UTC (11:30 PM IST)

Check the **Actions** tab to see workflow runs and logs.

## 🔧 Local Development

### Run the Scraper Locally

1. Install Python 3.11+
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the scraper:
   ```bash
   python scraper.py
   ```
4. This will update `notices.json`

### Test the Frontend Locally

Simply open `index.html` in a modern web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## 📝 Customization

### Change Scraping Frequency

Edit `.github/workflows/scrape.yml` and modify the cron schedule:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  # Examples:
  # '0 */4 * * *'   # Every 4 hours
  # '0 0 * * *'     # Once daily at midnight UTC
  # '0 8,20 * * *'  # Twice daily at 8 AM and 8 PM UTC
```

### Customize Colors

Edit `styles.css` and change the CSS variables at the top:

```css
:root {
    --bg: #f6f8fb;        /* Background color */
    --panel: #ffffff;     /* Card/panel color */
    --accent: #1f6feb;    /* Accent color (links, buttons) */
    --success: #16a34a;   /* Success color (Drive button) */
    --border: #e6eef8;    /* Border color */
}
```

### Modify Filters

Edit `script.js` to customize department extraction or add new filters.

## 🐛 Troubleshooting

### Workflow fails with "permission denied"
- Go to **Settings** → **Actions** → **General**
- Enable "Read and write permissions"

### GitHub Pages shows 404
- Ensure `index.html` is in the root folder
- Check Pages settings: branch should be `main`, folder should be `/ (root)`
- Wait 2-3 minutes after enabling Pages

### Notices not updating
- Check **Actions** tab for workflow runs
- Click on a workflow run to see logs
- Ensure the scraper completes without errors

### Old cached version showing
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try incognito/private mode

## 📊 Monitoring

- **Workflow Status**: Check the **Actions** tab for green checkmarks
- **Last Updated**: The website displays "Last updated" timestamp from `notices.json`
- **Commit History**: View commits to see when notices were updated

## 🤝 Contributing

Feel free to:
- Report bugs via Issues
- Suggest features
- Submit pull requests
- Improve the design or functionality

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- College notices sourced from [Siliguri College Official Website](https://siliguricollege.org.in)
- Built with vanilla HTML, CSS, and JavaScript
- Automated with GitHub Actions

## 📧 Support

For questions or issues, please open an issue on GitHub.

---

**Note**: This is an unofficial student project. For official information, always refer to the college's official website.
