# DeeGee Games

The thumbnail-based home of DeeGee Games at [deegeegames.com](https://deegeegames.com/). Static HTML and CSS, built with Vite, with optional Google Analytics. The page remains usable without JavaScript; fonts and images are bundled locally.

## Development

Install [Bun](https://bun.sh/), then run:

```sh
bun install --frozen-lockfile
bun run dev
```

The development server prints its local and LAN URLs. For production output:

```sh
bun run check
bun run build
bun run preview
```

`check` validates the HTML; `build` writes the deployable site to `dist/`. There is no TypeScript to typecheck. Run both checks before submitting a pull request. GitHub Actions runs both checks on pull requests and pushes to `master`.

## Analytics

The site uses the standard [Google tag for GA4](https://developers.google.com/tag-platform/gtagjs) to record page views. Enable [Enhanced measurement](https://support.google.com/analytics/answer/9216061) in the GA4 web data stream to also measure outbound game/Steam/source links and scrolls without custom event code.

Set the public repository Actions variable `VITE_GA_MEASUREMENT_ID` in **Settings → Secrets and variables → Actions → Variables**. The Pages workflow passes it to Vite for builds from `master`; pull-request builds omit it. Changing the variable requires a new deployment to take effect. The ID is public in the generated browser bundle and is not a secret.

For a local production preview, copy `.env.example` to `.env.local`, fill in the measurement ID, then run `bun run build` and `bun run preview`. Normal `bun run dev` never loads analytics. Blank or invalid IDs disable tracking. To disable production analytics, clear the Actions variable and redeploy.

After deploying, visit the site and check **Reports → Realtime** in Google Analytics to confirm receipt. Browser tracking protection or ad blockers can prevent collection.

## Hosting

GitHub Pages serves `dist/` at the root of `https://deegeegames.com/`. The workflow in `.github/workflows/pages.yml` deploys successful builds from `master`; it can also be run manually from that branch. Pull requests validate and build without deploying. No SPA routing or server runtime is required.

In the repository's **Settings → Pages**, select **GitHub Actions** as the source, set the custom domain to `deegeegames.com`, and enable **Enforce HTTPS** once GitHub provisions the certificate. The custom domain must be set in Pages settings; `public/CNAME` also carries it into the build output.

Namecheap BasicDNS hosts the zone. The apex (`@`) uses GitHub Pages A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. The `www` CNAME points to `deegeegames.github.io`; GitHub Pages redirects it to the canonical apex domain. Preserve the existing Google email/verification and `mathmarsh` records when updating DNS.

## Game availability

Each card in `index.html` has independent web and Steam actions, with a GitHub source link underneath. Keep unavailable destinations as native disabled buttons. Replace a disabled button with a labeled link only when the destination is public and ready.

- **All or Nothing:** browser release at `https://allornothing.app/`; Steam app `4537590`. Keep the existing web address until a migration is agreed.
- **Math Marsh:** browser release at `https://mathmarsh.deegeegames.com/`. Steam is coming soon. Steam app `4927380` redirected to the Steam homepage when checked on 2026-10-20, so the page does not advertise an active wishlist link yet.
- **Galaxy Conquest:** working title, in development. No public web or Steam destination is advertised. The source repository currently belongs to `david0178418`.

When a web game launches, replace “Web coming soon” with the same browser icon and “Play now” link as All or Nothing. For a public unreleased Steam listing, use the Steam logo and “Wishlist on Steam”; for a released game, use “View on Steam”.

## Artwork and credits

All artwork is bundled locally. See [assets/README.md](assets/README.md) for provenance and retained notices. Layout follows the approved dark game-shelf mockup with full-width stacked platform buttons, smaller source links, and one column on narrow screens.
