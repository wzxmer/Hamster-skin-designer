local config = std.parseYaml(importstr '../../config.yaml');
local keyboard26 = import '../keyboard/keyboard26Template.libsonnet';
local numericPortrait = import '../keyboard/numeric_9_portrait.jsonnet';
local numericLandscape = import '../keyboard/numeric_9_landscape.jsonnet';
local symbolic = import '../keyboard/symbolic_portrait.jsonnet';
local symbolicLandscape = import '../keyboard/symbolic_landscape.jsonnet';
local emojiPortrait = import '../keyboard/emoji_portrait.jsonnet';
local emojiLandscape = import '../keyboard/emoji_landscape.jsonnet';
local panel = import '../keyboard/panel.jsonnet';

local modules = {
  keyboard26: function(theme, orientation, variant) keyboard26.new(theme, orientation, variant),
  numericPortrait: function(theme) numericPortrait.new(theme),
  numericLandscape: function(theme) numericLandscape.new(theme),
  symbolic: function(theme) symbolic.new(theme),
  symbolicLandscape: function(theme) symbolicLandscape.new(theme),
  emojiPortrait: function(theme) emojiPortrait.new(theme),
  emojiLandscape: function(theme) emojiLandscape.new(theme),
  panel: function(theme, orientation) panel.new(theme, orientation),
};

local render(spec) =
  local fn = modules[spec.module];
  if std.length(spec.args) == 1 then
    fn(spec.args[0])
  else if std.length(spec.args) == 2 then
    fn(spec.args[0], spec.args[1])
  else
    fn(spec.args[0], spec.args[1], spec.args[2]);

local slot(name, module, args) =
  if name == null then null else { name: name, module: module, args: args };

local toList(item) = if item == null then [] else [item];

local outputs =
  toList(slot(std.get(std.get(std.get(config, 'pinyin', {}), 'iPhone', {}), 'portrait', null), 'keyboard26', ['portrait', 'pinyin'])) +
  toList(slot(std.get(std.get(std.get(config, 'pinyin', {}), 'iPhone', {}), 'landscape', null), 'keyboard26', ['landscape', 'pinyin'])) +
  toList(slot(std.get(std.get(std.get(config, 'pinyin', {}), 'iPad', {}), 'portrait', null), 'keyboard26', ['landscape', 'pinyin'])) +
  toList(slot(std.get(std.get(std.get(config, 'pinyin', {}), 'iPad', {}), 'landscape', null), 'keyboard26', ['landscape', 'pinyin'])) +
  toList(slot(std.get(std.get(std.get(config, 'pinyin', {}), 'iPad', {}), 'floating', null), 'keyboard26', ['portrait', 'pinyin'])) +

  toList(slot(std.get(std.get(std.get(config, 'alphabetic', {}), 'iPhone', {}), 'portrait', null), 'keyboard26', ['portrait', 'alphabetic'])) +
  toList(slot(std.get(std.get(std.get(config, 'alphabetic', {}), 'iPhone', {}), 'landscape', null), 'keyboard26', ['landscape', 'alphabetic'])) +
  toList(slot(std.get(std.get(std.get(config, 'alphabetic', {}), 'iPad', {}), 'portrait', null), 'keyboard26', ['landscape', 'alphabetic'])) +
  toList(slot(std.get(std.get(std.get(config, 'alphabetic', {}), 'iPad', {}), 'landscape', null), 'keyboard26', ['landscape', 'alphabetic'])) +
  toList(slot(std.get(std.get(std.get(config, 'alphabetic', {}), 'iPad', {}), 'floating', null), 'keyboard26', ['portrait', 'alphabetic'])) +

  toList(slot(std.get(std.get(std.get(config, 'numeric', {}), 'iPhone', {}), 'portrait', null), 'numericPortrait', [])) +
  toList(slot(std.get(std.get(std.get(config, 'numeric', {}), 'iPhone', {}), 'landscape', null), 'numericLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'numeric', {}), 'iPad', {}), 'portrait', null), 'numericPortrait', [])) +
  toList(slot(std.get(std.get(std.get(config, 'numeric', {}), 'iPad', {}), 'landscape', null), 'numericLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'numeric', {}), 'iPad', {}), 'floating', null), 'numericPortrait', [])) +

  toList(slot(std.get(std.get(std.get(config, 'emoji', {}), 'iPhone', {}), 'portrait', null), 'emojiPortrait', [])) +
  toList(slot(std.get(std.get(std.get(config, 'emoji', {}), 'iPhone', {}), 'landscape', null), 'emojiLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'emoji', {}), 'iPad', {}), 'portrait', null), 'emojiPortrait', [])) +
  toList(slot(std.get(std.get(std.get(config, 'emoji', {}), 'iPad', {}), 'landscape', null), 'emojiLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'emoji', {}), 'iPad', {}), 'floating', null), 'emojiPortrait', [])) +

  toList(slot(std.get(std.get(std.get(config, 'symbolic', {}), 'iPhone', {}), 'portrait', null), 'symbolic', [])) +
  toList(slot(std.get(std.get(std.get(config, 'symbolic', {}), 'iPhone', {}), 'landscape', null), 'symbolicLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'symbolic', {}), 'iPad', {}), 'portrait', null), 'symbolic', [])) +
  toList(slot(std.get(std.get(std.get(config, 'symbolic', {}), 'iPad', {}), 'landscape', null), 'symbolicLandscape', [])) +
  toList(slot(std.get(std.get(std.get(config, 'symbolic', {}), 'iPad', {}), 'floating', null), 'symbolic', [])) +

  toList(slot(std.get(std.get(std.get(config, 'panel', {}), 'iPhone', {}), 'portrait', null), 'panel', ['portrait'])) +
  toList(slot(std.get(std.get(std.get(config, 'panel', {}), 'iPhone', {}), 'landscape', null), 'panel', ['landscape']));

local uniqueOutputs =
  std.foldl(
    function(acc, spec) acc + { [spec.name]: spec },
    outputs,
    {}
  );

{
  [theme + '/' + spec.name + '.yaml']: std.toString(render({
    module: spec.module,
    args: [theme] + spec.args,
  }))
  for theme in ['light', 'dark']
  for specName in std.objectFields(uniqueOutputs)
  for spec in [uniqueOutputs[specName]]
}
