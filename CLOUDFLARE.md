# Deploy HandNav.js demo to Cloudflare

This project is static. You can host the whole library plus demo on Cloudflare Pages or Cloudflare Workers Static Assets.

## Cloudflare Pages from GitHub/GitLab

1. Push this project to a Git repository.
2. Open Cloudflare Dashboard.
3. Go to **Workers & Pages** → **Create** → **Pages**.
4. Connect your repository.
5. Use these settings:

```text
Framework preset: None
Build command:    leave blank
Build output:     .
Root directory:   /
```

If this project is inside a subfolder, set the root directory to that subfolder.

6. Deploy.
7. Visit:

```text
https://YOUR-PROJECT.pages.dev/demo/
```

Because Cloudflare serves over HTTPS, browser camera permission works after the user approves it.

## If the browser does not ask for camera permission

1. Open the actual deployed URL in a normal browser tab, for example:

```text
https://YOUR-PROJECT.pages.dev/demo/
```

Do not test from a Cloudflare dashboard iframe preview or any embedded iframe unless that iframe explicitly allows camera access.

2. Confirm the page is HTTPS.
3. Click the browser site settings icon near the address bar and set Camera to Allow.
4. Refresh the page and click Start again.
5. Check the diagnostic panel in the demo. It should say:

```text
Secure context: yes
Camera API: available
```

This repo includes `_headers` for Cloudflare Pages:

```text
/*
  Permissions-Policy: camera=(self), microphone=()
```

## Wrangler CLI deploy to Cloudflare Pages

```bash
npm install
npx wrangler login
npm run deploy:pages
```

The package script runs:

```bash
npx wrangler pages deploy . --project-name=handnav-js-demo
```

## Wrangler CLI deploy as Worker Static Assets

This repository includes `wrangler.jsonc`:

```jsonc
{
  "name": "handnav-js-demo",
  "compatibility_date": "2026-06-19",
  "assets": {
    "directory": ".",
    "html_handling": "auto-trailing-slash"
  }
}
```

Deploy:

```bash
npm install
npx wrangler login
npm run deploy:cloudflare
```

## Use the hosted library in another app

After deployment, import from your hosted URL:

```html
<script type="module">
  import HandNav from 'https://YOUR-PROJECT.pages.dev/src/handnav.js';

  const nav = new HandNav({
    showVideo: false,
    overlay: false,
    onSwipeLeft: () => console.log('next'),
    onSwipeRight: () => console.log('previous')
  });

  document.querySelector('#start').addEventListener('click', () => nav.start());
</script>
```

## Production note

For production apps, disable visual debugging unless needed:

```js
const nav = new HandNav({
  showVideo: false,
  overlay: false
});
```

Keep `showVideo` and `overlay` available in your own developer/debug settings if useful.
