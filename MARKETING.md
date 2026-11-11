# Glance launch plan

**Next action:** verify a working Windows/macOS release before announcing downloads. Owner: Glance contributors. Calendar starts after that release gate.

## Positioning

Free, open-source desktop attention prediction for designers who need a first visual hierarchy check and want images processed locally. Explain the model, formula and limits beside the result.

Primary promise: find competing elements before the next design review. Evidence: a real input/output walkthrough, reproducible model identity and published research. No claim of conversion lift, emotion detection or “94% accuracy.”

## People and first job

| Audience | First useful job | Next action |
|---|---|---|
| Freelance designers | Check headline vs main action before client review | Drop one screenshot; draw two areas |
| Small agencies | Compare a client's two variants privately | Export overlays with model and limitations |
| UX students | Understand saliency and metric limits | Follow the illustrated explainer, then inspect formulas |
| Marketers | Form a visual hierarchy hypothesis for a campaign | Change one element; test with real participants |

## Channels, ranked by likely fit

Ranking is a launch hypothesis, not measured channel performance. Verify current community rules before posting. Keep the first post useful without requiring a download.

| Rank | Channel | First action |
|---:|---|---|
| 1 | ShareX community | Demonstrate one capture-to-local-analysis workflow after verifying the custom action |
| 2 | Hacker News Show HN | Publish a runnable release, architecture explanation and honest benchmark note; answer technical questions |
| 3 | r/web_design | Ask moderators if a screenshot-led hierarchy walkthrough is welcome; disclose affiliation |
| 4 | r/userexperience | Share a limitations-first comparison of prediction vs usability research, subject to posting rules |
| 5 | Figma Community | Publish only after localhost permissions and packaging work; show a selected-frame walkthrough |
| 6 | YouTube comparison video | Analyze the same assets with named models; show pricing sources and uncertainty, not a winner without evidence |
| 7 | Product Hunt | Prepare a real screenshot, short demo and clear availability; coordinate a day for replies |
| 8 | Awesome-lists PRs | Find maintained saliency/design lists; submit one relevant entry matching contribution rules |
| 9 | Designer News | Verify whether submissions remain active; share a useful design case if eligible |

## 30-day calendar

| Days | Deliverable | Visible completion check |
|---|---|---|
| 1–3 | Verify installers, licenses, model exports, domain and download paths | New user completes install and first map on both OS targets |
| 4–6 | Capture real screenshot/demo; publish science and citation pages | Screenshot identifies model; formulas and limits linked |
| 7 | ShareX workflow and feedback request | Reproducible custom action documented |
| 8–10 | Show HN launch; triage install issues | Replies answered; confirmed bugs tracked |
| 11–13 | Moderator-approved Reddit walkthroughs | Each post teaches one hierarchy decision |
| 14–16 | Figma workflow validation and Community listing if ready | Selected frame reaches authenticated local API |
| 17–19 | Record comparison video; refresh competitor sources | Same input assets and metrics visible |
| 20–22 | Product Hunt launch and replies | Real download/demo works from a fresh browser |
| 23–25 | Relevant awesome-list PRs; eligible Designer News post | Contribution rules followed; no mass submissions |
| 26–28 | Publish first two SEO articles; fix recurring setup friction | Each article contains a reproducible example |
| 29–30 | Review feedback and aggregate download/referral evidence | Pick one next improvement; publish resolved issues |

Track aggregate release downloads, referral sources where available, confirmed first-run failures and actionable issues. Do not add app telemetry to measure this launch. Stars alone do not establish successful use.

## SEO content queue

Before drafting, inspect current results and add a concrete example or clearer method that existing pages lack. These are proposed titles, not published pages or search-volume claims.

| Priority | Article title | Intent / keyword | Distinct contribution |
|---:|---|---|---|
| 1 | Free attention heatmap: check a headline and CTA locally | Practical / free attention heatmap | Real annotated input/output with model identity |
| 2 | AI eye tracking free: what a prediction can actually tell you | Informational / AI eye tracking free | Separate predicted density from measured gaze |
| 3 | An open source Attention Insight alternative for private design reviews | Commercial / open source attention insight alternative | Dated workflow and license comparison |
| 4 | Predictive eye tracking explained with one screenshot | Informational / predictive eye tracking | Step-by-step fixation and map explanation |
| 5 | Saliency map generator: a local desktop walkthrough | Practical / saliency map generator | Reproducible installation and export steps |
| 6 | Neuromarketing heatmap free: attention without emotion claims | Informational / neuromarketing heatmap free | Evidence boundaries with citations |
| 7 | What AUC, CC and NSS mean for attention heatmaps | Informational / saliency accuracy metrics | Hand-worked metric examples, distinct denominators |
| 8 | Compare two designs using predicted attention share | Practical / attention share comparison | AOI definitions and percentage-point differences |
| 9 | ShareX attention heatmaps without uploading client screenshots | Practical / ShareX heatmap workflow | Verified local action and privacy boundary |
| 10 | Why “94% accurate” needs a metric and a human ceiling | Informational / predictive eye tracking accuracy | Worked ratio, dataset and protocol checklist |

Link practical articles to download/integrations, educational articles to science/citations, commercial articles to dated comparison pages. One clear next action per article; use meaningful headings and visible FAQs matching structured data.

## GitHub growth

- Topics: `saliency-prediction`, `attention-heatmap`, `predictive-eye-tracking`, `onnx`, `tauri`, `design-tools`, `privacy`, `open-source`.
- Social preview: use docs/social-preview.png (1280 × 640); replace schematic with a real, permission-cleared result when ready.
- README badges: MIT, Windows/macOS, latest release and CI only after their targets exist. Never add fabricated downloads, stars or build status.
- Keep README's first screen focused on purpose, current availability and one install action. Credit research and show limitations before accuracy claims.
- Use issue templates for reproducible install/model failures; ask for OS, model and redacted error, never confidential images by default.

## Message discipline

Reduce uncertainty with a real walkthrough and visible progress: install, select a model, inspect the result. Use published research as evidence for the method, not implied institutional endorsement. Avoid urgency, fake social proof and claims that a heatmap proves design success.

## Persuasion playbook (true claims only)

1. Real loss, real numbers: "€2,388 a year for a heatmap (Attention Insight Team plan). Glance: same kind of research model, €0." Recheck prices at launch; cite the pricing page and date.
2. Decode their "94%": one graphic. Their number = share of the human-agreement ceiling. Glance shows raw AUC/CC next to the ceiling. Readers who feel misled switch and share.
3. Privacy, checkable: "Your unreleased ads never leave your laptop." Agencies under client NDA care most.
4. Ladder, not nag: web/extension instant result -> side-by-side shows what SUM (UI/e-commerce mode), video and batch add -> "Free desktop app, runs offline, 10× faster".
5. Deadline urgency, not fake scarcity: "Launching Friday? Check the hero in 10 seconds."
6. Squint-test hook: "Painters have squinted at their canvas for 500 years. Glance adds what the squint can't see: faces and text, learned from real eye-tracking data." Demo squint vs model on the same ad.

Never: invented losses, fake counters/timers, insulting any audience.

Publication blockers: placeholder domain, unavailable release details, model rights/export verification and incomplete source metadata are listed in docs/NOTES.md. Recheck competitor pricing at launch.
