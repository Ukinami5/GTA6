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

## Round 3

- Work started: extending the existing systems with Vera Solano's five-job story, repeatable taxi fares, local saves, synthesized audio, fuller menus, a twelve-minute day cycle, and chase/mission showcase scenes.
- Controls planned: existing movement/combat keys retained; M toggles sound, Escape opens the pause menu. Mission and taxi stops trigger by approaching marked locations.
- Build and all four screenshots: pending. Known gaps and verification results will be appended below as work lands.

- Added `missions/story.js` and `missions/missions.js`: five sequential Vera Solano jobs (First Errand, Hot Ice, Loud Exit, Collections, Neon Tide), original dialogue, timed deliveries, two-/three-star scripted heat, world pillars, gold minimap targets including off-map direction blips, payouts, failure/retry flow, and a marina club sign. The finale supplies Vera's Solstice. All locations are reachable road stops; the cooler pickup is at the pier entrance. Yellow ! pedestrians offer repeatable taxi fares in any car, with distance fares and a $40 collision-free tip.
- Added `save/savegame.js`: guarded `neontide-save-v1` localStorage data for cash, completed jobs/story progress, position, occupied vehicle, playtime and day time. Mission completion autosaves; pause offers manual saving. Continue restores cash/car/progress across reloads and starts with clear wanted/police state; New Game clears the save.
- Added `audio/synth.js`: gesture-unlocked WebAudio engine, proximity siren, filtered noise combat sounds, cash/UI cues, success/fail melodies, and a scheduled bass/pad loop. No audio assets or runtime external requests. M and the pause button mute all sound.
- Added title New Game/Continue, controls and original-game credits, plus pause Resume/Save Game/Controls/Restart/Mute and mission result overlays. Escape pauses; Enter or Continue closes a mission result. Existing movement/combat keys are retained. Missions start by entering Vera's gold V at the marina; delivery stops trigger on approach, requiring a car where indicated. Taxi pickups/dropoffs require slow driving.
- Wired `setTimeOfDay` to a roughly twelve-minute day starting at golden hour, with sky/sun/fill changes, brighter night bulbs/neon, a HUD clock, and saved day time. No mission has time-of-day restrictions.
- Browser smoke test (`node scripts/test-round3.mjs`) passed all five objective chains and exact cumulative payouts ($600/$1,250/$2,150/$3,250/$5,750), two-/three-star mission heat, actual E vehicle entry, autosave and manual save, reload/Continue with restored car/cash/progress and cleared police, clean/damaged taxi tips, timer/wasted/busted/restart failure paths, audio context startup/scheduling, M mute, pause controls, and New Game clearing storage. No page exceptions or console errors. The deterministic chain test moves actors between road stops; it does not claim a continuous manual driving playthrough or a subjective audio listening test.
- Visual QA found and corrected a chase camera inside palm foliage. Screenshot capture now waits for the first rendered scene rather than a fixed short page-load delay. Final four-scene regeneration and packaging are running below.
- Known limits: interrupted jobs restart from Vera's marker after loading (completed jobs remain saved); taxi passengers use a hidden model while aboard; no vehicle health/destruction failure; original simple traffic/police routing and on-foot physics remain. A blocked localStorage browser reports a save failure without crashing. Audio balance is modest but has not been subjectively listening-tested.
- Final screenshot regeneration succeeded for all four deterministic 1280×720 JPEGs: `1-cover.jpg` 81,718 bytes; `2-vista.jpg` 140,929 bytes; `3-chase.jpg` 99,168 bytes; `4-mission.jpg` 107,194 bytes. Every entry in `shots.json` exists and is strictly below 256 KiB. Browser page console: no errors. Visually inspected all four final images, including the chase's two cruisers/headlights/blue minimap blips and the club's pillar/subtitle/gold blip.
- All game modules and both browser scripts passed `node --check`. Final `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeded and refreshed `out/game/`, all four `out/screenshots/` captures and `out/dossier.json`. The game remains fully static/offline with procedural visuals and synthesized audio. No git commands were used, and the protected owner, license and vendor submission files were not edited.
