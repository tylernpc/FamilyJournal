# New Developer Setup

## Prerequisites

- [Git](https://git-scm.com/downloads) installed
- Access to the [FamilyJournal Azure DevOps organization](https://dev.azure.com/FamilyJournal)

## Clone the Main Repo

1. In Azure DevOps, navigate to **Repos**.
2. Click **Clone** and copy the HTTPS URL.
3. In a terminal, run:

   ```
   git clone <https-url>
   ```

4. **Authentication** — one of two paths:
   - **Microsoft sign-in (recommended):** Git Credential Manager will open a browser window — sign in with your Microsoft account and you're done.
   - **Git credentials:** In the Clone dialog, click **Generate Git Credentials**, then paste the generated password when the terminal prompts for one.

## Clone the Wiki Repo

The wiki is a plain git repo — edit pages locally and push, or use the wiki editor in the browser.

```
git clone "https://dev.azure.com/FamilyJournal/Family%20Journal/_git/Family-Journal.wiki"
```

Authentication works the same as the main repo.

## Notes

- Wiki pages are markdown files; the file name is the page title (dashes become spaces).
- Page ordering is controlled by the `.order` file in the repo root.
