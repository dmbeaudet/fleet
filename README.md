# Fleet — maintenance log

A single-page maintenance tracker for autos, equipment, boats and recreational
vehicles. No server, no build step, no dependencies. Three files and a browser.

## Put it on GitHub Pages

1. Create a repo (e.g. `fleet`) and drop `index.html`, `styles.css`, `plans.js`
   and `app.js` in the root.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`,
   folder `/ (root)`. Save.
3. A minute later it's at `https://<your-username>.github.io/fleet/`.

Add it to your phone's home screen and it behaves like an app.

## Where the data lives

In your browser's local storage, on whichever device you're using. Nothing is
uploaded and nothing is shared between devices. Two consequences:

- **Back it up.** Settings → Export backup writes a JSON file. Import restores
  it, on any device.
- A public Pages URL exposes the code, never your data.

If you'd rather have one shared list across phone and shop computer, the
simplest upgrade is to commit the exported JSON to the repo and have `load()`
fetch it as the starting point, then keep using local storage for edits.

## How due dates are worked out

Every maintenance item carries a usage interval, a calendar interval, or both.
Whichever arrives first is what's due. An item goes amber at 80% of its
interval and red once it's past.

When a plan is first built, each item's last service is assumed to have
happened at the previous interval boundary below your current reading — a
7,500 mile oil change on a car showing 96,400 miles is assumed done at 90,000.
That's a guess, and it's flagged as estimated so the to-do list is useful on
day one. Logging a service or editing an item replaces the guess with the real
figure and clears the flag.

## The template library

`plans.js` holds the baseline schedules — 17 machine types across the four
categories, each with typical manufacturer intervals. Pick the closest type on
the add-vehicle page and the schedule is generated for you. Edit `plans.js` to
change the baseline for every vehicle you add afterwards; edit an individual
item in the app to change just that one.

## Procedure links

Each item links out to the job. Leave the link field blank and it opens a
search scoped to that exact vehicle and task. Paste a URL — a manual page, a
forum write-up, a video you trust — and it uses that instead.

## Looking up a specific model

Optional. Settings takes an Anthropic API key; with one saved, the
add-vehicle page's **Research this exact model** button searches for the
published schedule for that year, make and model and builds the plan from it
instead of the generic template. The key is stored in this browser only, and
is readable by anything else running in this browser profile — a personal
machine is fine, a shared one isn't.

Without a key everything else works normally.

## Files

| File | What's in it |
|---|---|
| `index.html` | Page shell, fonts, dialog markup |
| `styles.css` | All styling |
| `plans.js` | Maintenance templates by machine type |
| `app.js` | State, due-date math, views, import/export |
