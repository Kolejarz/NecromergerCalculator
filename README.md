# Necromerger Time Machine Rune Optimizer (Static Web)

A static JavaScript tool to calculate the best way to spend runes on **max-level stations** before using the Time Machine.

It optimizes for **maximum restart bonus %** from legendaries and accounts for already-built max stations.

**No backend is required**: all logic runs in your browser and nothing is sent to a server.

## Run locally

Open `index.html` directly in your browser.

Optional: if your browser blocks local script loading from file URLs, use any static file server (still no backend logic), for example:

```bash
python3 -m http.server 4173
```

Then browse to `http://localhost:4173`.

## Inputs
- Current runes: `MANA`, `POISON`, `BLOOD`, `MOON`, `DARK`
- Already built max stations for each station type

## Outputs
- Best total bonus `%` you can gain now
- Which max stations to build
- Which legendaries those builds unlock
- Rune spending and leftovers
- Top farming suggestions to reach the next legendary

## Included station + legendary rules
- 2 max Graves = Lich (+5%)
- 2 max Supply Cupboards = Gorgon (+5%)
- 2 max Altars = Harpy (+5%)
- 2 max Lecterns = Reaper (+10%)
- 2 max Fridges = Cyclops (+10%)
- 2 max Portals = Archdemon (+10%)
- 2 max Chickens = Robo Chicken (+10%)
