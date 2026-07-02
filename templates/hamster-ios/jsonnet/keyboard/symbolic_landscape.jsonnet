local collectionData = import '../lib/collectionData.libsonnet';
local others = import '../lib/others.libsonnet';
local symbolicPortrait = import './symbolic_portrait.jsonnet';

local keyboard(theme) =
  symbolicPortrait.getKeyboard(theme) + {
    keyboardHeight: others['横屏']['键盘总高度'],
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
