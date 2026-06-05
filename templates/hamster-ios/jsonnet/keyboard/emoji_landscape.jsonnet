local collectionData = import '../lib/collectionData.libsonnet';
local symbolic = import './symbolic_landscape.jsonnet';

local keyboard(theme) =
  symbolic.new(theme) + {
    descriptionCollection+: {
      maximumColumn: 5,
      maximumRow: 4,
    },
  };

{
  new(theme):
    keyboard(theme) + collectionData.emojiDataSource,
}
