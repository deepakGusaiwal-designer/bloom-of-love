# The rose model

`public/models/rose.glb` is already in place — a single red rose with stem and leaves, built from the OBJ + textures you provided (leather-grain red for the petals, paper-green for the stem, a grass texture for the leaves). It was converted to glTF binary, geometry-compressed with Draco, and its textures resized to 1024px, bringing it from ~13 MB down to ~700 KB.

If you'd like to swap in a different rose, here's how.

## Where to get one (free)

1. **Sketchfab** — https://sketchfab.com/search?q=red+rose&type=models
   Turn on the **Downloadable** filter. Sort by likes. Pick a realistic single red rose, download **glTF (.glb)**. Most are CC Attribution — note the author for your credits.
2. **Poly Pizza** — https://poly.pizza/search/rose
   One-click GLB downloads, license shown on each model (many CC0 / CC-BY).
3. **Kenney** — https://kenney.nl/assets (nature packs include flowers; stylized rather than realistic).

Pick a model that is a **single rose** (head + stem). Realistic, mid-poly (10k–100k triangles) looks best with the lighting in this project.

## Install it

Rename the file and place it here:

```
public/models/rose.glb
```

Reload — it blooms. No code changes needed: the loader auto-centers, auto-scales, and detects petals by mesh/material names, falling back to "the red parts."

## Notes

- **Draco-compressed** GLBs work out of the box (decoder loads automatically).
- **KTX2/Basis textures**: supported by three.js, but this project doesn't wire a KTX2 transcoder by default — prefer a model with standard PNG/JPEG textures, or add `KTX2Loader` in `Rose.jsx` if your model needs it.
- If petal detection ever misses (unusual names + non-red materials), add a word from your model's mesh names to `PETAL_WORDS` in `src/Rose.jsx`.
- **Attribution**: for CC-BY models, credit the author somewhere visible (e.g., a small line in the final section or your site footer).
