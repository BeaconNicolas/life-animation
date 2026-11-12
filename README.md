# A Month in Hatfield

A 3D animated month in Hatfield, Pretoria: remote days at the desk, Uber to the office,
the evening wine run, cooking, cards on the couch, and weekend groove at Drama, Ekhaya and Blue Room.

Plain HTML + [Three.js](https://threejs.org) loaded from a CDN. No build step.

- `index.html` — the page and the on-screen story panel
- `main.js` — the town (four streets), the characters and the list of chapters

To change the story, edit the `chapters` list in `main.js`. Each chapter has a clock range, a caption
and a `run` function that places the characters and the camera.

## People

The characters are from the [Microsoft Rocketbox avatar library](https://github.com/microsoft/Microsoft-Rocketbox)
(MIT licence, see `assets/ROCKETBOX-LICENSE.txt`), with its motion-captured animations converted to a compact format in `assets/`.

## Map

The street grid is Hatfield, Pretoria. Street names and positions come from
[OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL), straightened slightly.
The apartment's position on Prospect Street is a placeholder, and the office sits off the Hatfield map.
