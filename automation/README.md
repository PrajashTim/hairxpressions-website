# Content Studio automation

This is the secure draft-first layer for the Hair Xpressions Content Pipeline.

## What it does

1. In the Google Sheet, open **Content Studio → Open draft generator**.
2. Select a topic marked **Ready** and click **Create review draft**.
3. GitHub creates a new branch and a **draft pull request** with the article plus the two blog discovery-page updates.
4. Review the draft. Only merging that pull request publishes the post.

## One-time setup

### 1. Add the OpenAI secret to GitHub

In `PrajashTim/hairxpressions-website`, open **Settings → Secrets and variables → Actions** and add a repository secret named `OPENAI_API_KEY`.

Optionally add a repository variable named `OPENAI_MODEL`; the workflow defaults to `gpt-5.6-luna`, the efficient GPT-5.6 model. Never add the API key to a Sheet cell or to this repository.

### 2. Add the Sheet dashboard UI

Open the Content Operations Sheet, choose **Extensions → Apps Script**, and replace the starter files with:

- `automation/google-apps-script/Code.gs`
- `automation/google-apps-script/Sidebar.html`

Save the project, reload the Sheet, and authorize the script for your Google account. The **Content Studio** menu will then appear.

### 3. Connect the Sheet to GitHub

Create a fine-grained GitHub personal access token limited to the `PrajashTim/hairxpressions-website` repository with **Actions: Read and write** permission. In the sheet, click **Content Studio → Connect GitHub** and paste it there. The Apps Script stores it in your private user properties, not in the spreadsheet cells.

## Measurement in version one

Use Square bookings and attributed revenue as the weekly outcome fields in **Performance Log**. Square can show booking outcomes; it cannot by itself prove every website booking-button click. Add GA4 later only if you want automated click attribution or broader website-traffic reporting.

## Safety rules built into the generator

- creates a draft PR only—never a direct production publish;
- limits claims to current, supported Hair Xpressions services;
- does not claim hair-extension services, fixed prices, guaranteed availability, or medical outcomes;
- uses only existing gallery images and existing internal service links;
- stops without changing files if the generated response is malformed or unsafe.
