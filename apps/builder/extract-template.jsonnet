local config = std.parseYaml(importstr '../../templates/hamster-ios/config.yaml');

{
  template: {
    name: 'hamster-ios',
    displayName: '基础模板01',
    version: '0.1.0',
  },
  project: {
    version: '0.1.0',
    template: {
      name: 'hamster-ios',
      displayName: '基础模板01',
      version: '0.1.0',
    },
    meta: {
      projectName: config.name,
      author: config.author,
      description: '基于基础模板01创建',
    },
    config: {
      fontFace: if std.objectHas(config, 'fontFace') then config.fontFace else [],
    },
    mapping: {
      [key]: config[key]
      for key in std.objectFields(config)
      if key != 'author' && key != 'name' && key != 'fontFace'
    },
    lib: {
      color: import '../../templates/hamster-ios/jsonnet/lib/color.libsonnet',
      fontSize: import '../../templates/hamster-ios/jsonnet/lib/fontSize.libsonnet',
      theme: import '../../templates/hamster-ios/jsonnet/lib/theme.libsonnet',
      others: import '../../templates/hamster-ios/jsonnet/lib/others.libsonnet',
      layout: import '../../templates/hamster-ios/jsonnet/lib/layout.libsonnet',
      keyboard26: import '../../templates/hamster-ios/jsonnet/lib/keyboard26.libsonnet',
      numeric: import '../../templates/hamster-ios/jsonnet/lib/numeric.libsonnet',
      symbolic: import '../../templates/hamster-ios/jsonnet/lib/symbolic.libsonnet',
      toolbar: import '../../templates/hamster-ios/jsonnet/lib/toolbar.libsonnet',
      panel: import '../../templates/hamster-ios/jsonnet/lib/panel.libsonnet',
      hintSymbolsData: import '../../templates/hamster-ios/jsonnet/lib/hintSymbolsData.libsonnet',
      swipeData: import '../../templates/hamster-ios/jsonnet/lib/swipeData.libsonnet',
      swipeDataEn: import '../../templates/hamster-ios/jsonnet/lib/swipeData-en.libsonnet',
      collectionData: import '../../templates/hamster-ios/jsonnet/lib/collectionData.libsonnet',
    },
  },
}
