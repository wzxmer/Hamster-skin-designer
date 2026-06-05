local normalizeLabel(label) =
  if label == null then
    null
  else if std.objectHas(label, 'kind') then
    label
  else if std.objectHas(label, 'systemImageName') then
    label + { kind: 'systemImage' }
  else
    label + { kind: 'text' };

local normalizeButton(spec) =
  local base =
    spec +
    {
      [if std.objectHas(spec, 'repeat') then 'repeatAction']: spec.repeat,
      [if std.objectHas(spec, 'swipes') then 'swipeUpAction']: std.get(spec.swipes, 'up', null),
      [if std.objectHas(spec, 'swipes') then 'swipeDownAction']: std.get(spec.swipes, 'down', null),
      repeat: null,
      swipes: null,
    };
  local withForeground =
    if std.objectHas(base, 'label') then
      base + {
        foreground: normalizeLabel(base.label),
        label: null,
      }
    else if std.objectHas(base, 'foreground') then
      base + {
        foreground: normalizeLabel(base.foreground),
      }
    else
      base;
  local withForegrounds =
    if std.objectHas(withForeground, 'labels') then
      withForeground + {
        foregrounds: [normalizeLabel(item) for item in withForeground.labels],
        labels: null,
      }
    else if std.objectHas(withForeground, 'foregrounds') then
      withForeground + {
        foregrounds: [normalizeLabel(item) for item in withForeground.foregrounds],
      }
    else
      withForeground;
  local withUnlocked =
    if std.objectHas(withForegrounds, 'unlockedLabel') then
      withForegrounds + {
        unlockedForeground: normalizeLabel(withForegrounds.unlockedLabel),
        unlockedLabel: null,
      }
    else if std.objectHas(withForegrounds, 'unlockedForeground') then
      withForegrounds + {
        unlockedForeground: normalizeLabel(withForegrounds.unlockedForeground),
      }
    else
      withForegrounds;
  if std.objectHas(withUnlocked, 'lockedLabel') then
    withUnlocked + {
      lockedForeground: normalizeLabel(withUnlocked.lockedLabel),
      lockedLabel: null,
    }
  else if std.objectHas(withUnlocked, 'lockedForeground') then
    withUnlocked + {
      lockedForeground: normalizeLabel(withUnlocked.lockedForeground),
    }
  else
    withUnlocked;

{
  normalizeLabel: normalizeLabel,
  normalizeButton: normalizeButton,
  resolveSize(spec, sizeRefs={}, fallback=null):
    if std.objectHas(spec, 'size') then
      spec.size
    else if std.objectHas(spec, 'sizeRef') then
      std.get(sizeRefs, spec.sizeRef, fallback)
    else
      fallback,
  normalizeButtons(buttons):
    {
      [name]: normalizeButton(buttons[name])
      for name in std.objectFields(buttons)
    },
}
