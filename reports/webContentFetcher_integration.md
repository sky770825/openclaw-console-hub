# WebContentFetcher Integration Report

## Overview
A new module `webContentFetcher.ts` has been developed to allow OpenClaw Server to safely scrape text content from external URLs.

## Implementation Details
- **Location**: `server/src/utils/webContentFetcher.ts`
- **Dependencies**: `axios`, `cheerio`
- **Features**:
  - Protocol validation (HTTP/HTTPS only).
  - Timeout management (10s).
  - Size limiting (5MB).
  - Intelligent extraction: Identifies `<main>`, `<article>`, or specific content classes.
  - Boilerplate removal: Strips `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, and common ad selectors.

## How to Integrate
1. Copy `webContentFetcher.ts` to `server/src/utils/`.
2. Ensure dependencies are installed in the server directory:
   ```bash
   npm install axios cheerio
   npm install --save-dev @types/cheerio
   
3. In `server/src/index.ts` (or your routes file), import and use:
   ```typescript
   import { fetchWebContent } from './utils/webContentFetcher';

   router.get('/fetch-web-content', async (req, res) => {
     const { url } = req.query;
     try {
       const result = await fetchWebContent(url as string);
       res.json(result);
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });
   ```

## Security Considerations
- The module currently restricts protocols to HTTP/HTTPS.
- To prevent internal network scanning (SSRF), it is recommended to add an IP blacklist check if the server is in a cloud environment.
