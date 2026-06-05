local collectionData = import '../lib/collectionData.libsonnet';
local symbolicPortrait = import './symbolic_portrait.jsonnet';

local keyboard(theme) =
  symbolicPortrait.getKeyboard(theme) + {
    keyboardStyle+: {
      insets: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    descriptionCollection+: {
      maximumColumn: 5,
      maximumRow: 4,
    },
  };

{
  new(theme):
    keyboard(theme) + collectionData.symbolicDataSource,
}
