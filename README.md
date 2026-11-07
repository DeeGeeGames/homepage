# DeeGee Games

The game-selection home of DeeGee Games at [deegeegames.com](https://deegeegames.com/). Static HTML and CSS with a small progressive-enhancement module, built with Vite, and optional Google Analytics. Artwork is bundled locally; typography uses system fonts. All games and their destinations remain available without JavaScript.

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

## Game selection

`index.html` remains the source of truth for names, statuses, artwork, and destinations. `game-select.js` derives the console selector and Details screen from those articles. If JavaScript is unavailable or initialization fails, the static catalog remains usable.

The enhanced interface fills the viewport without document scrolling. Desktop shows all eight games; phones show two larger tiles per bank. Select with the tiles, arrow buttons, arrow keys, Home/End, or a horizontal swipe over the scene. Tab reaches actions; Enter on the selected tile launches its game. Details is a native modal with Escape/Back and focus restoration. Keyboard focus has a white ring distinct from the selected game's accent.

Background changes crossfade over 360 ms; reduced motion switches immediately. Rapid selection cancels obsolete transitions; during a crossfade, a failed artwork load keeps the previous image. Fullscreen is optional and appears only where supported. There is no autoplay audio, video, or gamepad polling.

Existing `#games`, `#experiments`, `#arcade`, and game-heading fragments remain supported. Selection replaces the fragment instead of adding browser-history entries. Browser, Steam, source, and playground links retain their existing destinations and open in a new tab. The no-JavaScript catalog uses ordinary document scrolling so all content remains accessible.

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

The main game entries in `index.html` have independent web and Steam actions, with a GitHub source link underneath. Keep unavailable destinations as native disabled buttons. Replace a disabled button with a labeled link only when the destination is public and ready.

- **All or Nothing:** browser release at `https://allornothing.app/`; Steam app `4537590`. Keep the existing web address until a migration is agreed.
- **Math Marsh:** browser release at `https://mathmarsh.deegeegames.com/`. Public unreleased Steam listing at `https://store.steampowered.com/app/4927380/Math_Marsh/`, linked as “View on Steam”. Math Marsh is the first entry and the default selection.
- **Starward Tide:** in development, playable in the browser at `https://starwardtide.deegeegames.com/`. Source: `https://github.com/DeeGeeGames/starward-tide`. No Steam destination is advertised.

- **Reactionator:** in development, follows Starward Tide. Browser: `https://reactionator.deegeegames.com/`. Source: `https://github.com/DeeGeeGames/Reactionator`. Local multiplayer reaction challenges for 2–4 players.

When a web game launches, replace “Web coming soon” with the same browser icon and “Play in browser” link as All or Nothing. For a public Steam listing, use the Steam logo and “View on Steam”, including unreleased games.

## Prototypes and experiments

The four prototypes follow the four main games in the selector. Explicit prototype labels, work-in-progress notes, input hints, and “Try prototype” actions identify unfinished projects. Without JavaScript they remain a separate “Prototypes & experiments” section. Non-initial artwork in the fallback catalog is lazy-loaded.

Gateward has its own destination at [gateward.deegeegames.com](https://gateward.deegeegames.com/). Heavy Rig (formerly Iron Wake) is at [heavyrig.deegeegames.com](https://heavyrig.deegeegames.com/). The playground at [experiments.deegeegames.com](https://experiments.deegeegames.com/) hosts Dreadwake (`/games/dreadwake/`) and Power Up (`/games/power-up/`). Keep these entries aligned with the playground catalog when projects are added, renamed, or removed. Gateward uses the approved schematic illustration; the other cards use published prototype artwork.

## Artwork and credits

All artwork is bundled locally. See [assets/README.md](assets/README.md) for provenance and retained notices. Layout follows the approved cinematic console direction, with the official logo, per-game imagery and accents, a persistent selector, and a separate Details screen. Interface-heavy gameplay captures use a contained preview. Existing imagery and its provenance are retained; no new footage is implied.
