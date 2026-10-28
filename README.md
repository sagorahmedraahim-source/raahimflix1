# RaahimFlix iOS PWA — account sync upgrade

A responsive personal-use media discovery PWA for Cloudflare Pages. Cinemeta metadata is handled independently from Stremio stream add-ons. Account-backed configuration uses Cloudflare D1; no MySQL is required.

## What's included

- Responsive dark PWA shell for iPhone Safari and desktop
- Cinemeta catalogs for both movies and series, remote search, and metadata detail lookup
- Private username/password accounts, server-side PBKDF2 password hashing, signed HttpOnly session cookie
- D1-backed per-account configuration sync for Stremio add-ons, CloudStream repositories, direct HTTPS sources, watchlist, and recent titles
- Separate Stremio add-on manager with manifest capability detection, enable/disable/remove, and account-authenticated server-side requests to avoid browser CORS failures
- Separate CloudStream repository manager with enable/disable/remove, adapter URL editing, per-provider test action, and a search panel for enabled compatible adapters. Repository records are saved independently; a repository's plugin code is not executed in Safari
- Optional documented HTTP adapter contract for compatible CloudStream bridges
- Direct HTTPS sources and best-effort VLC iOS URL-scheme handoff
- Cinemeta metadata API restricted to catalog/search/meta routes
- Service worker cache excludes API requests so login/config responses are not cached

## Important compatibility notes

1. **Cinemeta is metadata, not a stream provider.** Changing a Stremio add-on won't replace the metadata provider.
2. Stremio add-ons follow the manifest/resource protocol (`manifest.json`, `catalog`, `meta`, `stream`, `subtitles`). Only declared stream-capable add-ons are queried for playback sources.
3. **CloudStream plugins do not run directly in Safari.** This app stores repository URLs and can query a compatible HTTP adapter if you provide one. The adapter contract is described below; a raw CloudStream repository URL alone is not a playable source.
4. Only add sources you trust and are authorized to use. RaahimFlix does not host video, bypass DRM, or provide media itself.
5. VLC launch uses `vlc-x-callback://` as a best effort. iOS/VLC version and stream compatibility can affect handoff.
6. Accounts require Cloudflare Pages Functions, a D1 binding, and a `SESSION_SECRET`. The app cannot sync accounts until these are configured.
7. This is a starter implementation, not an independently audited authentication service. Before inviting other users, add rate limiting, account recovery, monitoring, and a privacy policy.

## Deploy on Cloudflare Pages

### 1. Upload to GitHub

1. Extract this project ZIP.
2. Upload the **contents of the `RaahimFlix-iOS` folder** to the root of a GitHub repository. `index.html`, `app.js`, `styles.css`, `functions/`, `migrations/`, and `wrangler.toml` must be at the repository root.
3. In Cloudflare Dashboard, open **Workers & Pages → Create application → Pages → Connect to Git** and select the repository.
4. Build command: `exit 0`.
5. Build output directory: `.`.
6. Deploy once; continue the setup steps below before using account registration.

### 2. Create the D1 database

From a terminal with Node.js and Wrangler installed, run in the project folder:

```bash
npx wrangler d1 create raahimflix-users
```

Cloudflare prints a `database_id`; you do not need to put it in the repository when you bind D1 through the dashboard.

Apply the schema to the production database:

```bash
npx wrangler d1 execute raahimflix-users --remote --file=./migrations/0001_init.sql
```

If you use the Cloudflare dashboard instead, create a D1 database named `raahimflix-users`, open its SQL console, and run the contents of `migrations/0001_init.sql`.

### 3. Bind D1 to the Pages project

In **Cloudflare Dashboard → Workers & Pages → your RaahimFlix project → Settings → Bindings**, add a **D1 database** binding:

- Variable name: `DB`
- Database: `raahimflix-users`

Save the binding and redeploy. The `DB` binding name must match exactly.

### 4. Add the session secret

Create a long random secret (at least 32 random bytes). For example, generate one locally with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

In **Settings → Variables and Secrets**, add an encrypted secret:

- Name: `SESSION_SECRET`
- Value: the generated random value

Set it for Production (and Preview only if you test accounts there). Never commit this secret to GitHub. Redeploy after setting it.

### 5. Redeploy and test

1. Open your `https://...pages.dev` address.
2. Open **Add-ons / Sources → Private account & sync**.
3. Create a username (3–32 letters/numbers/dot/underscore/hyphen) and password (10+ characters).
4. Add a Stremio manifest URL. It is inspected through `/api/addon`, so the add-on does not need browser CORS headers.
5. Add a direct HTTPS source or a CloudStream repository. Settings are stored on the account and load when you sign in from another device.
6. Test `/api/metadata?resource=catalog&type=movie&id=top` in a browser. It should return JSON, not the app's HTML page.

**If accounts fail:** check the `DB` binding, schema migration, `SESSION_SECRET`, and Pages deployment logs. Without all three, account registration intentionally returns a setup error.

## Compatible CloudStream HTTP adapter contract

The browser cannot safely execute Android CloudStream plugin code. If you control or have permission to use a bridge, configure its base HTTPS URL in the CloudStream form. RaahimFlix calls `GET {adapterUrl}/search?query=...&type=movie|series&id=...` through the authenticated `/api/cloudstream` endpoint.

Expected JSON:

```json
{
  "results": [
    {
      "name": "Authorized source label",
      "title": "Optional title",
      "url": "https://media.example/video.m3u8",
      "quality": "1080p",
      "language": "Hindi",
      "description": "Optional source detail"
    }
  ]
}
```

`results` is required. Each `url` must be a direct HTTPS media URL that the user is authorized to access. If no compatible adapter is configured, the repository is saved but is not queried for streams. In Settings, use **Edit adapter** to add or change an adapter, **Test** to query that provider with a sample title, or the **Search enabled CloudStream adapters** panel to search all enabled adapters for a movie or series. Test an adapter before relying on it for playback.

## How source persistence works

- Before sign-in, settings may exist in that browser's local storage only.
- After registration/sign-in, local settings are merged into your account and saved to D1.
- Future changes sync to the same account. Sign into the same account on your iPhone and desktop to share the configuration.
- Signing out clears the server session cookie; it does not delete your account or saved configuration.

## Local development

Configure the D1 database binding and secret in a local Wrangler environment, then run:

```bash
npx wrangler pages dev .
```

For production, ensure the `DB` binding points to the production D1 database and the secret is configured as an encrypted secret in Cloudflare.

## iPhone install

Open the deployed HTTPS address in Safari → Share → **Add to Home Screen**. Use the same account as your desktop for synced settings.
