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
