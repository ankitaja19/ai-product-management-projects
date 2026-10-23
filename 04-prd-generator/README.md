# PRD Studio — AI-Ready Template PRD Generator

A private, browser-based tool that turns an early product idea into a structured, editable Product Requirements Document. It currently uses transparent, deterministic JavaScript templates—not an AI model—and clearly identifies suggestions that require validation.

## Live demo

[Launch PRD Studio](https://ankitaja19.github.io/ai-product-management-projects/04-prd-generator/)

## Features

- Guided product brief covering the idea, problem, users, goals, pain points, solution hypothesis, and constraints
- Comprehensive PRD with 13 editable sections
- Goals and non-goals, functional and non-functional requirements, user stories, acceptance criteria, MVP scope, metrics, risks, trade-offs, and open questions
- Per-section deterministic regeneration
- Clear labels separating user input from template suggestions
- Local draft saving, reopening, editing, and deletion with `localStorage`
- Markdown download and browser Print / Save as PDF
- Fictional sample brief and generated sample PRD
- Loading, validation, empty, and error states
- Responsive and print-friendly interface

## Important: current output is not AI-generated

PRD Studio does not call an AI model, server, analytics service, or external API. Output is produced by deterministic rules in `generator.js`. The same input and regeneration iteration produce the same structure and suggestions.

Template-generated requirements and assumptions are starting points—not customer evidence, technical commitments, approved scope, or guaranteed outcomes. Validate them with users and relevant delivery partners.

## Architecture

```text
index.html                 Accessible form, PRD workspace, and draft dialog
styles.css                Responsive UI and print/PDF presentation
generator.js              Pure deterministic generation provider
storage.js                Browser draft repository
script.js                 UI controller, editing, exports, and autosave
tests/generator.test.js   Dependency-free model and persistence tests
```

The UI depends on a provider with two operations:

```javascript
provider.generate(input)
provider.regenerateSection(document, sectionId)
```

The current provider is `TemplatePRDProvider`. A future organization-approved AI service can implement the same contract without replacing the editor, storage, or exports. A secure implementation would call that provider through an authenticated server-side gateway; credentials must never be placed in this frontend or committed to GitHub.

## Run locally

From the `04-prd-generator` folder:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), and stop the server with `Control+C`.

The app also works by opening `index.html` directly:

```bash
open index.html
```

## Run tests

Node.js is needed only for tests, not for the application:

```bash
node tests/generator.test.js
```

Tests cover validation, all PRD sections, deterministic regeneration, Markdown export, and draft persistence.

## Exporting

- **Markdown:** choose **Markdown** to download an editable `.md` file.
- **PDF:** choose **Print / PDF**, then select **Save as PDF** in the browser print dialog.

## Privacy and storage

- Product inputs and PRDs never leave the browser.
- Drafts use the project-specific `prd-template-generator-drafts-v1` localStorage key.
- Clearing browser site data removes saved drafts.
- Export important work before clearing browser data or moving devices.

## Fictional sample

The sample describes `FocusFlow`, a fictional planning assistant for independent professionals. It contains no personal, employer, client, or internal company information.
