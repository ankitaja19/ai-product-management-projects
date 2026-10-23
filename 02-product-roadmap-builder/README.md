# Product Roadmap Builder

A modern, interactive roadmap workspace for Product Managers. Plan features, assign ownership, manage delivery status, and communicate release timing through Kanban and timeline views.

## Live demo

[Launch the Product Roadmap Builder](https://ankitaja19.github.io/ai-product-management-projects/02-product-roadmap-builder/)

## What it does

- Add, edit, and delete features with descriptions, owners, priorities, statuses, and dates
- Move work between **Planned**, **In Progress**, and **Launched** using drag-and-drop or a status selector
- Switch between a delivery-focused Kanban board and a month/quarter timeline
- Search, filter, and sort by priority, status, owner, and release date
- Track total features, completed work, upcoming releases, and overall progress
- Start with realistic sample data and reset the demo at any time
- Save roadmap changes in browser `localStorage`, with no account or backend required
- Use the responsive interface on desktop, tablet, or mobile

## Run locally

From this project folder:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Stop the server with `Control+C`.

You can also open `index.html` directly in a browser:

```bash
open index.html
```

## How it is built

This is a dependency-free static application:

- `index.html` provides the accessible page structure, dashboard, views, filters, and feature form.
- `styles.css` provides the visual system, Kanban layout, responsive behavior, and timeline styling.
- `script.js` contains both the roadmap data model and browser interface logic.
- Browser `localStorage` persists changes under a project-specific key.

The core data functions are kept separate from DOM rendering inside `script.js`. This makes the main behavior easier to understand and allows the feature lifecycle, filters, timeline periods, dashboard metrics, and persistence to be tested without a framework.

## Key product decisions

1. **Two complementary views:** the Kanban board supports day-to-day delivery conversations, while the timeline supports sequencing and stakeholder communication.
2. **Status movement works two ways:** drag-and-drop is fast on desktop; the status selector remains usable on touch devices and with assistive technology.
3. **Dates are deliberately lightweight:** target dates communicate intent without pretending to be a detailed project plan.
4. **Local-first storage:** the portfolio demo remains free, private, and simple to run. Clearing browser site data will remove custom roadmap changes.
5. **Relative sample dates:** demo releases stay relevant whenever the app is first opened.

## Rerun the sample

Choose **Reset demo** in the header. This replaces the current browser data with fresh sample features after confirmation.
