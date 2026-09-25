# Publishing guide

How to put Viikko Nro on the Chrome Web Store, Microsoft Edge Add-ons and Firefox Add-ons (AMO), then ship updates. Paste-ready texts and the file for each form field are in [store-listing.md](store-listing.md).

Store dashboards change their layout from time to time. If a field has moved, look for the same label nearby.

---

## 1. Prepare a release

Run these in the project folder:

```sh
VIIKKONRO_SITE_DIR=~/Documents/Projects/weekdays pnpm data:sync   # latest holiday and flag day data
pnpm check                                                        # typecheck, lint, tests, both builds, lint
pnpm store:assets                                                 # promo tiles and screenshots in store/
pnpm zip && pnpm zip:firefox                                      # store packages
```

The last command writes three files to `.output/`:

| File | Upload to |
| --- | --- |
| `viikkonro-extension-<version>-chrome.zip` | Chrome Web Store and Edge Add-ons |
| `viikkonro-extension-<version>-firefox.zip` | Firefox AMO |
| `viikkonro-extension-<version>-sources.zip` | Firefox AMO, as the source code |

For later releases, first raise `version` in `package.json`. The stores reject a package whose version isn't higher than the published one.

### Checklist before the first submission

- [ ] The privacy policy section from [store-listing.md](store-listing.md#privacy-policy-section-for-viikkonrofitietosuoja) is live on https://viikkonro.fi/tietosuoja.
- [ ] You have tried the build locally in Chrome and Firefox (next section).
- [ ] The screenshots in `store/fi/` and `store/en/` look right.
- [ ] `https://viikkonro.fi/ota-yhteytta` works. It is the support URL and the page shown after uninstall.

## 2. Try it locally first

**Chrome or Edge**
1. Run `pnpm build`.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select `.output/chrome-mv3`, not the project folder.

If Chrome says **"Manifest file is missing or unreadable"**, you selected the project folder. The source has no `manifest.json`; the build creates one in `.output/chrome-mv3`. `.output` is hidden on macOS: in the folder picker press **Cmd+Shift+G** and paste `/Applications/Dixeam/viikkonro-extension/.output/chrome-mv3`.

**Firefox**
1. Run `pnpm build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `.output/firefox-mv3/manifest.json`.

Check that the badge shows the week, the popup opens, the settings save, and typing `vk 42` in the address bar suggests week 42.

---

## 3. Chrome Web Store

### One-time account setup
1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that should own the extension. A shared company account is better than a personal one.
2. Accept the developer agreement and pay the **one-time USD 5 registration fee**.
3. Turn on **2-Step Verification** for that Google account. Publishing requires it.
4. Under **Account**, set the publisher name (Viikko Nro), verify the **contact email**, and complete the **trader / non-trader declaration**. The EU requires it, and a business publishing in Finland is normally a trader.
5. Optional but worthwhile: verify `viikkonro.fi` in Google Search Console with the same account, so the listing can show viikkonro.fi as the verified official site.

### Submit the extension
1. Click **New item** and upload `viikkonro-extension-<version>-chrome.zip`.
2. **Store listing** tab: fill in the fields from [store-listing.md → Chrome Web Store](store-listing.md#chrome-web-store-fields).
   - Paste the Finnish description, add the screenshots, store icon and both promo tiles.
   - Click **Add language**, choose English, and paste the English description with the English screenshots.
   - The name and short description come from the package, so there is nothing to type for them.
3. **Privacy** tab: paste the single purpose statement and the `storage` and `alarms` justifications, answer **No** to remote code, tick no data types, tick the three certifications, and enter the privacy policy URL.
4. **Distribution** tab: visibility **Public**, regions **All regions**. You can restrict this to Finland, but English users abroad search for ISO week numbers too.
5. Click **Save draft**, then **Submit for review**. Leave **Publish automatically after review** on, or turn it off to publish by hand.

Review usually takes from a few days to a couple of weeks. It can take longer for a new developer account. You get an email when it's done. The public page is `https://chromewebstore.google.com/detail/<extension-id>`. Put that link on viikkonro.fi.

---

## 4. Microsoft Edge Add-ons

Edge uses the same Chrome zip. Edge is 11% of desktop browsing in Finland, so it's worth the extra 20 minutes.

1. Go to https://partner.microsoft.com/dashboard/microsoftedge/overview and register for the Microsoft Edge program with a Microsoft account. It's free.
2. Click **Create new extension** and upload `viikkonro-extension-<version>-chrome.zip`.
3. **Availability:** Public, all markets.
4. **Properties:** category Productivity, privacy policy URL, website and support URL. Mature content: No.
5. **Store listings:** add Finnish and English. For each, paste the description, then upload the 300×300 logo, promo tiles and screenshots for that language, and add the search terms. All values are in [store-listing.md → Edge](store-listing.md#microsoft-edge-add-ons-fields).
6. **Submit.** In *Notes for certification*, paste `REVIEWER_NOTES.md`.

Certification takes up to 7 business days.

---

## 5. Firefox Add-ons (AMO)

1. Go to https://addons.mozilla.org/developers/ and sign in with (or create) a Mozilla account. It's free.
2. Click **Submit a New Add-on**. For "How to distribute this version", choose **On this site**.
3. Upload `viikkonro-extension-<version>-firefox.zip`. Keep both **Firefox** and **Firefox for Android** ticked.
4. When asked **"Do you need to submit source code?"**, answer **Yes** and upload `viikkonro-extension-<version>-sources.zip`. The package is bundled with Vite, so Mozilla requires the readable source.
5. Describe the add-on:
   - The name comes from the package.
   - URL slug `viikko-nro`.
   - Paste the Finnish summary and description.
   - Category Other, support contact, license (All Rights Reserved unless you want open source).
6. In **Notes to reviewer**, paste `REVIEWER_NOTES.md`. It has the build commands.
7. Submit. Then open **Edit Product Page** to upload the screenshots under **Images**, and use **Manage translations** to add the English summary and description.

Automatic validation runs in minutes, and the add-on appears once it is signed. Because source code is attached, a human reviewer may also check it, which can take days to a few weeks. The page is `https://addons.mozilla.org/firefox/addon/viikko-nro/`.

---

## 6. Updates

1. Run `pnpm data:sync` and raise `version` in `package.json`.
2. Run `pnpm check`, then `pnpm store:assets` if the UI changed, then `pnpm zip && pnpm zip:firefox`.
3. Upload the new packages:
   - **Chrome:** open the item → **Package** → **Upload new package** → **Submit for review**.
   - **Edge:** open the extension → **Packages** → replace the package → **Publish**.
   - **Firefox:** **Manage Status & Versions** → **Upload a New Version**, with the new sources zip and reviewer notes.

Tagging `vX.Y.Z` on GitHub runs CI. It checks that the tag matches `package.json` and attaches the zips as a build artifact.

### Optional: upload from the command line

After the first manual release, WXT can submit to all three stores at once:

```sh
pnpm wxt submit init      # asks for store API credentials and saves them in .env.submit (git-ignored)
pnpm wxt submit \
  --chrome-zip .output/*-chrome.zip \
  --edge-zip .output/*-chrome.zip \
  --firefox-zip .output/*-firefox.zip \
  --firefox-sources-zip .output/*-sources.zip
```

The credentials it asks for:
- **Chrome:** an OAuth client ID, client secret and refresh token (Google Cloud console, Chrome Web Store API).
- **Edge:** a product ID, client ID and API key (Partner Center → Publish API).
- **Firefox:** a JWT issuer and secret (AMO → Tools → Manage API Keys).

---

## 7. Common rejection reasons

| Store message | Fix |
| --- | --- |
| "Excessive or unused permissions" | The package asks only for `storage` and `alarms`. Make sure the justifications are filled in on the Privacy tab. |
| "Spam and Placement in the Store: excessive keywords" (for example violation Yellow Argon) | Remove lists of place names, search terms or synonyms from the description and give a count instead. Paste the corrected text in the **Store listing** tab (every language) and click **Submit for review**. No new package or version bump is needed. |
| "Privacy policy missing or doesn't cover the extension" | Publish the extension section on `/tietosuoja` before submitting. |
| AMO: "source code doesn't build" / "doesn't match" | Upload the sources zip from the same `pnpm zip:firefox` run as the package. If a reviewer builds after New Year, they need `SKIP_DATA_COVERAGE_CHECK=1` (explained in `REVIEWER_NOTES.md`). |
| Screenshots rejected | Use the files from `store/` unchanged. They are the required 1280×800 size with no transparency. |
