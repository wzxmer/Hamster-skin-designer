# Skin Effect Model Design

## Decision

The workbench will converge on one runtime chain:

```text
project.json -> SkinEffectModel -> preview -> Jsonnet source -> YAML package
```

`project.json` remains the only editable workbench model. `SkinEffectModel` is the resolved effect model used by preview and export. Jsonnet is the exported source representation of that effect model. YAML is an application artifact generated from the same effect model.

## Non-goals For First Cut

- Do not rewrite every keyboard type at once.
- Do not remove the existing exporter immediately.
- Do not remove legacy `nativeKeyboardPayloads` before the 26-key path is stable.

## First Cut Scope

The first implementation covers the native 26-key path first:

- portrait pinyin 26
- alphabetic 26 fallback
- toolbar icons and actions
- candidate styles
- space row and comma key
- swipe display and actions
- key surface, font size, color, center, and metrics

## Source Ownership

- Left-side modules write only to `project.json`.
- Preview reads `SkinEffectModel`, not raw `nativeKeyboardPayloads`.
- Export reads `SkinEffectModel`, not DOM or UI state.
- `nativeKeyboardPayloads` is a preset seed and compatibility input, not the long-term runtime source.
- `jsonnet/main.jsonnet` must become real source output for the effect model. It must not remain only an `importstr` wrapper around pre-rendered YAML.

## Migration Plan

1. Add `packages/skin-effect` as the single effect-model entrypoint.
2. Route preview native payload reads through `packages/skin-effect`.
3. Route exporter native payload reads through `packages/skin-effect`.
4. Move effective payload construction from exporter into `packages/skin-effect`.
5. Make Jsonnet render from `SkinEffectModel`.
6. Make YAML render from the same `SkinEffectModel` or from evaluated Jsonnet.
7. Remove duplicate native payload logic from preview and exporter after parity tests pass.

## Verification

Required checks:

```powershell
rtk npm run validate:project-schema
rtk npm run test:skin-effect
rtk npm run test:exporter
rtk npm run test:preview
rtk npm run build
```

Manual smoke:

- Change a left-side key metric, font size, color, or toolbar value.
- Confirm preview changes.
- Export `.cskin`.
- Confirm the exported Jsonnet/YAML reflects the same value.
- Import on device and compare against preview.
