# DeeGee Games

The game-selection home of DeeGee Games at [deegeegames.com](https://deegeegames.com/). Static HTML and CSS with a browser launcher, built with Vite, and optional Google Analytics. Artwork is bundled locally; typography uses system fonts. All games and their destinations remain available without JavaScript.

## Development

Install [Bun](https://bun.sh/), then run:

```sh
bun install --frozen-lockfile
bun run dev
```

The development server prints its local and LAN URLs. For production output:

```sh
bun run check
bun run test
bun run build
bun run preview
```

`check` validates the HTML; `build` writes the deployable site to `dist/`. There is no TypeScript to typecheck. Run all three checks before submitting a pull request. GitHub Actions runs these checks on pull requests and pushes to `master`.

## Game launcher

`index.html` remains the source of truth for names, statuses, artwork, screenshots, and destinations. `game-select.js` builds the rotating circular wheel from those articles. The original scrollable catalog remains available without JavaScript. No runtime dependencies were added.

The launcher uses the available viewport directly. TV/desktop places the title left of a circular wheel; portrait centers the selected disc with adjacent discs on an arc and stacked Play/Details controls; short landscape keeps text left and the wheel right. Cinema view changes the wheel into a depth carousel. Background artwork crossfades only after decoding successfully. There is no automatic selection/attract mode to compete with input. Screenshot galleries live in Details, retain captions, and support previous/next controls and horizontal keyboard navigation.

- **Keyboard:** focus the launcher; arrows browse, Enter/Space activates the focused control, X opens Details, Y changes view, F toggles fullscreen, Escape/Backspace closes a launcher dialog. Tab reaches each action. Enter on the selected disc launches; clicking a neighbor selects it. Returning from Details or a game restores focus.
- **Controller:** a standard-mapping gamepad uses D-pad/left stick to browse, A to activate the focused control, B to go back, X for Details, Y for view, and shoulders to browse. The launcher must own browser focus; a newly connected/focused controller must return to neutral before commands are accepted. Stick engagement uses a 0.55 deadzone with 0.30 release hysteresis, 360 ms initial repeat, and 155 ms subsequent repeats.
- **Touch/pointer:** drag the wheel horizontally; the TV wheel also accepts vertical drags (down brings in the title above). The wheel follows the actual pointer continuously with capture after 8 CSS px of axis intent. Portrait ignores predominantly vertical gestures. Selection/title semantics commit only on release. A slow drag under 28% of a disc step returns; a deliberate drag or flick advances at most one neighbor. Flicks require at least 10 px and 0.45 px/ms recent velocity; the last 90 ms of motion projects 160 ms forward so a reversal can cancel or reverse intent. A step is 65% of disc width, with a 110 px minimum. Held displacement is capped at 0.92 steps. These tunable judgments live in `wheel-gesture.js`; physical feel still requires owner testing. Settling starts from the actual held angle. Release clicks, extra fingers, pointer cancellation, focus loss, resize/orientation changes, and page suspension are handled without launching a title.

Existing `#games`, `#arcade`, `#experiments`, `#experiments-heading`, and game-heading fragments remain supported; `#heavy-rig-title` also accepts the existing `#iron-wake-title` entry. Selection replaces the fragment without adding history entries. Steam, source, playground, and standalone links retain their destinations. Prototype/status labels remain explicit.

## Embedded games

`game-host.js` creates one iframe for the selected HTTPS catalog URL. Launch expands from the selected disc, starts the actual request immediately, and offers **Show game**, **Open standalone**, and **Game menu**. A real iframe `load` event changes the wording to **Game page loaded / Enter game**; it never establishes asset readiness. After 18 seconds without that event the host reports a slow connection, with the same escape routes. An observable iframe error reports failure. Browsers can dispatch `load` for an error document and cannot expose every cross-origin certificate, framing-policy, network, or application error: standalone remains available at every stage. No screenshot, timer, or invented messaging event is used as playable readiness.

A persistent 48 px host bar keeps Game menu available. Enter transfers focus to the frame. The frame allows gamepad, autoplay, fullscreen and pointer lock, and is sandboxed to prevent top-level navigation while permitting scripts, origin storage, forms and external popups. A game entering its own fullscreen can cover the host bar; browser Escape returns from that fullscreen. Launcher fullscreen expands the complete host. Browser restrictions or user settings may deny either operation.

Normal keyboard/controller commands belong to a running game. Hold controller **View + Menu** for 550 ms to open the launcher menu, or use its persistent button. Keyboard events inside a cross-origin frame cannot be intercepted by the launcher. Gamepad state is shared across frames, so a game can also receive the host chord or continue polling while the launcher menu is open. The menu explicitly says the game may keep running. The launcher does not pause or save games. Exit requires a separate confirmation that unsaved progress may be lost; confirmation removes the frame/browsing context, restores the selected title and Play focus, and clears the host timeout. Page teardown also removes the frame. Opening standalone starts a separate game session; progress transfer is not promised.

No independent game repos or integration contracts are changed. For fully coordinated readiness, pause/resume, controller ownership and safe-to-exit reporting, each game would need an agreed opt-in `postMessage` contract with validated source/origin, an explicit ready signal after its assets/save initialization, and acknowledged pause/resume/save state. The host intentionally does not infer these states today. Embedded storage/fullscreen/audio behavior and cross-origin availability require game/browser testing; standalone avoids many embedding restrictions.

Local Chromium verification on 2026-11-15 loaded real embedded documents for Math Marsh, Starward Tide, Gateward, Heavy Rig, Dreadwake and Power Up; this is not full gameplay/hardware acceptance. Reactionator failed TLS hostname validation (`ERR_CERT_COMMON_NAME_INVALID`): its domain/certificate configuration needs repair in its hosting setup. All or Nothing returned a Cloudflare challenge (HTTP 403) with `X-Frame-Options: SAMEORIGIN`, which Chromium refused to embed. Its owner needs an edge/challenge configuration that permits the intended launcher origin before embedding can work; the catalog and standalone destination are preserved. Both failures can still dispatch iframe `load`. Cross-origin autofocus was also blocked in Starward Tide during initial loading; Enter game transfers frame focus explicitly.

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

Gateward has its own destination at [gateward.deegeegames.com](https://gateward.deegeegames.com/). Heavy Rig (formerly Iron Wake) is at [heavyrig.deegeegames.com](https://heavyrig.deegeegames.com/). The playground at [experiments.deegeegames.com](https://experiments.deegeegames.com/) hosts Dreadwake (`/games/dreadwake/`) and Power Up (`/games/power-up/`). Keep these entries aligned with the playground catalog when projects are added, renamed, or removed. Starward Tide, Gateward, Dreadwake, and Heavy Rig use fresh gameplay thumbnails. Heavy Rig’s gallery includes the current battlefield, Mech Bay, and frontier contracts.

## Artwork and credits

All artwork is bundled locally. See [assets/README.md](assets/README.md) for provenance and retained notices. Layout follows the approved rotating circular wheel, with the official logo, per-game artwork and accents, a persistent launcher, and a separate Details screen. Gameplay screenshots use a contained gallery in Details so the complete interface remains visible. Power Up retains its single-image presentation. The no-JavaScript catalog includes the same screenshots as static images.
