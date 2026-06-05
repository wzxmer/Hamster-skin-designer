{
  floatTargetScale: {
    portrait: { x: 0.8, y: 0.6 },
    landscape: { x: 0.5, y: 0.85 },
  },

  layout: [
    ['Hamster', 'Switcher', 'settings', 'Phrase', 'Finder'],
    ['HamsterSkin', 'Upload', 'Deploy', 'emoji', 'Lenovo'],
  ],

  buttons: {
    Hamster: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/' },
      label: { systemImageName: 'keyboard', text: '元书' },
    },
    Switcher: {
      action: { shortcut: '#RimeSwitcher' },
      label: { systemImageName: 'switch.2', text: 'Switcher' },
    },
    settings: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/keyboardSettings' },
      label: { systemImageName: 'slider.horizontal.3', text: '键盘设置' },
    },
    Phrase: {
      action: { shortcut: '#toggleEmbeddedInputMode' },
      label: { systemImageName: 'square.and.pencil', text: '内嵌开关' },
    },
    Finder: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/finder' },
      label: { systemImageName: 'folder', text: '文件' },
    },
    HamsterSkin: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/keyboardSkins' },
      label: { systemImageName: 'tshirt', text: '皮肤设置' },
    },
    Upload: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/clipboard?action=openPictureInPicture' },
      label: { systemImageName: 'rectangle.center.inset.filled.badge.plus', text: '画中画' },
    },
    Deploy: {
      action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/rime?action=deploy' },
      label: { systemImageName: 'command.circle', text: '部署' },
    },
    emoji: {
      action: { shortcut: '#简繁切换' },
      label: { systemImageName: 'character.textbox', text: '简繁' },
    },
    Lenovo: {
      action: { sendKeys: 'Shift+p' },
      label: { systemImageName: 'bolt.horizontal.circle', text: '联想' },
    },
  },
}
