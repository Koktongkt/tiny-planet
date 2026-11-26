# Optional Face Builder (developer-only)

Use the existing Tiny Planet character renderer to tune faces without asking an agent to make every small change. The feature is an isolated, loopback-only local Vite server. No editor dependencies, routes, preview code or UI are included in the normal game build; `npm run dev` and `npm run build` remain unchanged.

## Agent-assisted design workflow

1. An agent prepares the initial character and saves its current code in the working tree. Start the optional editor from that same checkout:

   ```sh
   npm run facebuilder -- --char ishi --wait
   ```

   Other IDs: `her`, `fuku`. Use an interactive terminal or a background process with output capture so the agent can wait for the completion message. Open the printed local URL, normally http://127.0.0.1:5191/facebuilder?char=ishi. If the agent runs in a remote/virtual environment, forward the loopback port using its trusted development preview feature; do not expose this write-capable server publicly.

2. Make edits in the right inspector. The 3D viewport is the real existing character studio rendered in an iframe. The preview shader, rig, hair and baked meshes are unchanged; changing an input triggers a debounced iframe reload with dev-only in-memory value overrides. It's a refresh-based preview, not instant continuous sculpting.
3. Check front, both 3/4 and side views, full body and elevated studio angle. Compare original/draft; add a concept image overlay if helpful. Lock individual controls against accidental edits. Undo or reset unlocked controls as necessary.
4. Select **Approve & submit design** and confirm. Only the selected character's mapped numeric/color values are written to its existing source, along with a dated JSON receipt under `docs/characters/facebuilder-submissions/`. No other source file is edited. The receipt records source hashes, before/after differences, final values, parameter locks and user notes. With `--wait`, the process prints `FACE_BUILDER_SUBMITTED { ... }` and exits successfully after the browser receives the result.
5. The waiting coding agent reads the receipt and the source diff and continues the user's task. Treat approved values as locked; don't change them without explicit user approval. Run `npm run build`, `npm run test:unit` and the existing capture workflow (`node tools/chibi-shots.mjs <outDir>`) to review the approved design with production rendering. Keep the receipt with the source changes when committing. No automatic Git commit is made.

Omit `--wait` to keep the server running after approval. Reload the editor to start another design review. Cancel without submitting to make no source changes.

## Design and safeguards

- `tools/facebuilder/schema.mjs` maps human-readable controls to existing source constants. Existing values are the baseline; there are no separate runtime character presets. Her nose profile, eyes, cheeks, ears and hair; Fuku's cheeks, eyes, blush, ears, bun and palette; Ishi's skull, crown, chin, cheeks, occiput, nose, moustache, ears and palette are covered.
- Preview transforms run only in the dedicated Vite server, without writing source. The server listens on 127.0.0.1:5191; submissions require a random per-session token, known character and bounded numeric/color controls. A source hash prevents clobbering concurrent agent edits. If an existing geometry constant is restructured, the adapter fails closed and must be updated.
- Fuku shares the default cheek with other characters. On the first changed submission we create a Fuku-specific cheek constant connected to both the SDF body and projected face, preserving the other characters. The preview applies the equivalent adapter.
- Feature locks protect editor controls; the submitted receipt declares the mapped design parameters approved and locked for the agent. This is an agent review contract, not an immutable filesystem permission. Do not alter shared rendering functions in ways that change a locked character's appearance without review.
- This version deliberately uses existing procedural parameters, not arbitrary mesh sculpting or curve point manipulation. New controls should be added to the adapter and tested with current source. It does not install browser packages, auto-commit, or require an AI/API integration.

### Verification

`npm run test:unit` includes adapter round-trip tests covering each editable field, invalid values and untouched source. Full browser visual review and game regression checks are still required in the checkout because the editor relies on the game's WebGL rendering.
