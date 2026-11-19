# ROUND 1 — Neon Tide City

Progress log (updated as work lands).

- Started from the starter repository; replaced its game source and screenshots.
- Building Port Solana as an original offline three.js harbor-city prototype.
- Play keys: WASD move/drive, Shift run, E enter/exit vehicle, Space brake, Escape pause.
- Known gaps for this round: no traffic, pedestrians, police, missions, combat, or save system yet.
- three.js download: pending. main.ts build: pending. cover/vista screenshots: pending.


## Round 1 completion

- Built a deterministic, procedural three.js Port Solana scene with textured road grid, district buildings, emissive window patterns, a coastal boulevard, beach, animated ocean, pier, palm rows, and streetlights. Added three car silhouettes, Kai Marlow, walking/running, E to enter/exit the nearest parked car, arcade driving, collision bounds, chase camera, HUD, and minimap. The title screen starts the playable mode; `?shot=cover&seed=1` and `?shot=vista&seed=1` select frozen showcase compositions.
- Controls: WASD or arrows move/steer, Shift runs, E enters/exits a nearby parked vehicle, Space brakes/reverses, Escape pauses/resumes. Click the title screen to begin.
- three.js download succeeded: `game/vendor/three.module.min.js` (three@0.160.0). Chrome Headless Shell download succeeded. SwiftShader flags `--use-gl=swiftshader --enable-unsafe-swiftshader` rendered both scenes.
- Screenshots succeeded: `screenshots/1-cover.jpg` and `screenshots/2-vista.jpg`, each 1280×720 JPEG and below 256 KiB.
- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeded; it copied the static game and screenshots and wrote the dossier.
- Known gaps carried to later rounds: traffic, pedestrians, police/wanted system, missions, combat, persistence, audio, pause menu, and richer traffic-aware minimap are not part of this skeleton.

## Round 2 gameplay

- Added the road patrol routes for ten civilian cars, with lane spacing, intersection pauses, traffic avoidance and offscreen recycling. Added marina sheds to the city collision data.
- Added the $250 cash balance and the five-star wanted state, with a twenty-second hiding timer.
- Added seeded sidewalk pedestrians, collision avoidance, fleeing, and temporary knockdowns. E enters or exits any car in range. A first theft adds a star, and an occupied car's driver gets out and flees.
- Added PD Interceptor pursuit, siren lights, flanking at three stars, impact damage, and a three-second arrest when Kai stops on foot beside a cruiser.
- Added fists, an unlimited-ammo pistol, ray hits, muzzle flash, and health regeneration after ten seconds without damage.
- Wired cash, health, stars, prompts and minimap markers into the HUD. Busted deducts 15% and wasted deducts 10%, rounded to whole dollars, with a marina respawn. Cover and vista freeze seeded ambient actors.
- Controls added this round are Q for the pistol and left click or F to attack on foot. E works for both NPC and parked cars.
- Browser gameplay smoke test passed from title through occupied-car theft, the first star, vehicle exit, pistol toggle and firing, police pursuit, and arrest. The arrest reset the stars and returned Kai to the marina with full health and $212. The browser reported no page errors.
- All game JavaScript passed syntax checks. `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeded. The existing screenshot script captured cover (86,272 bytes) and vista (158,183 bytes) at 1280×720, with no browser page errors. Rebuilt `out/` with the refreshed captures.
- Known limits: civilian cars follow short loops around city blocks and police use simple pursuit and flanking. The browser smoke test exercised arrest but did not exercise the wasted flow or every pursuit variant. Missions, save, audio, and additional screenshot scenes are scheduled for Round 3.
