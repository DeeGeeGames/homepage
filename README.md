# DeeGee Games

The thumbnail-based home of DeeGee Games at [deegeegames.com](https://deegeegames.com/). Static HTML and CSS, built with Vite. The production page requires no JavaScript, remote fonts, or remotely hosted images.

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

`check` validates the HTML; `build` writes the deployable site to `dist/`. There is no application JavaScript or TypeScript to typecheck. Run both checks before submitting a pull request. GitHub Actions runs both checks on pull requests and pushes to `master`.

## Hosting

GitHub Pages serves `dist/` at the root of `https://deegeegames.com/`. The workflow in `.github/workflows/pages.yml` deploys successful builds from `master`; it can also be run manually from that branch. Pull requests validate and build without deploying. No SPA routing or server runtime is required.

In the repository's **Settings → Pages**, select **GitHub Actions** as the source, set the custom domain to `deegeegames.com`, and enable **Enforce HTTPS** once GitHub provisions the certificate. The custom domain must be set in Pages settings; `public/CNAME` also carries it into the build output.

Namecheap BasicDNS hosts the zone. The apex (`@`) uses GitHub Pages A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. The `www` CNAME points to `deegeegames.github.io`; GitHub Pages redirects it to the canonical apex domain. Preserve the existing Google email/verification and `mathmarsh` records when updating DNS.

## Game availability

Each card in `index.html` has independent web and Steam actions, with a GitHub source link underneath. Keep unavailable destinations as native disabled buttons. Replace a disabled button with a labeled link only when the destination is public and ready.

- **All or Nothing:** browser release at `https://allornothing.app/`; Steam app `4537590`. Keep the existing web address until a migration is agreed.
- **Math Marsh:** coming soon on both platforms. Its planned web destination is `https://mathmarsh.deegeegames.com/`. Steam app `4927380` redirected to the Steam homepage when checked on 2026-10-20, so the page does not advertise an active wishlist link yet.
- **Galaxy Conquest:** working title, in development. No public web or Steam destination is advertised. The source repository currently belongs to `david0178418`.

When a web game launches, replace “Web coming soon” with the same browser icon and “Play now” link as All or Nothing. For a public unreleased Steam listing, use the Steam logo and “Wishlist on Steam”; for a released game, use “View on Steam”.

## Artwork and credits

All artwork is bundled locally. See [assets/README.md](assets/README.md) for provenance and retained notices. Layout follows the approved dark game-shelf mockup with full-width stacked platform buttons, smaller source links, and one column on narrow screens.
