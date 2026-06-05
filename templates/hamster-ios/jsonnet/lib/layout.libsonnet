{
  // 统一的布局 DIY 配置。
  // 结构区尽量只写短键名，keyboard 层会自动映射成真正的 Button / Collection 名称。
  keyboard26: {
    portrait: {
      frame: {
        insets: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      // 26 键竖屏布局，按行直接改这里即可。
      layout: {
        top: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        middle: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        bottom: ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
        footer: ['123', 'cnen', 'space', 'spaceRight', 'enter'],
      },
    },
    landscape: {
      frame: {
        insets: {
          top: 3,
          bottom: 3,
          left: 4,
          right: 4,
        },
      },
      split: {
        left: '2/5',
        gap: '1/5',
        right: '2/5',
      },
      // 26 键横屏布局，左右两侧分别调整。
      layout: {
        left: {
          top: ['q', 'w', 'e', 'r', 't'],
          middle: ['a', 's', 'd', 'f', 'g'],
          bottom: ['shift', 'z', 'x', 'c', 'v'],
          footer: ['123', 'cnen', 'space'],
        },
        right: {
          top: ['y', 'u', 'i', 'o', 'p'],
          middle: ['g', 'h', 'j', 'k', 'l'],
          bottom: ['v', 'b', 'n', 'm', 'backspace'],
          footer: ['space', 'spaceRight', 'enter'],
        },
      },
    },
    keyMetrics: {
      portrait: {
        letters: {
          default: {
            width: {
              percentage: 0.1,
            },
          },
          t: {
            width: {
              percentage: 0.1,
            },
          },
          y: {
            width: {
              percentage: 0.1,
            },
          },
          a: {
            width: {
              percentage: 0.15,
            },
          },
          l: {
            width: {
              percentage: 0.15,
            },
          },
        },
        system: {
          shift: {
            width: {
              percentage: 0.15,
            },
          },
          backspace: {
            width: {
              percentage: 0.15,
            },
          },
          cnen: {
            width: {
              percentage: 0.1,
            },
          },
          symbol: {
            width: {
              percentage: 0.1,
            },
          },
          numeric: {
            width: {
              percentage: 0.18,
            },
          },
          space: {
            width: {
              percentage: 0.44,
            },
          },
          spaceRight: {
            width: {
              percentage: 0.1,
            },
          },
          enter: {
            width: {
              percentage: 0.18,
            },
          },
        },
        bounds: {
          a: {
            width: '2/3',
            alignment: 'right',
          },
          l: {
            width: '2/3',
            alignment: 'left',
          },
        },
      },
      landscape: {
        letters: {
          default: {
            width: '146/784',
          },
          t: {
            width: '200/784',
          },
          y: {
            width: '200/784',
          },
          a: {
            width: '200/784',
          },
          l: {
            width: '200/784',
          },
        },
        system: {
          shift: {
            width: '200/784',
          },
          backspace: {
            width: '200/784',
          },
          cnen: {
            width: '173/784',
          },
          symbol: {
            width: '173/784',
          },
          numeric: {
            width: '173/784',
          },
          space: {
            width: '438/784',
          },
          spaceRight: {
            width: '173/784',
          },
          enter: {
            width: '173/784',
          },
        },
        bounds: {
          t: {
            width: '146/200',
            alignment: 'left',
          },
          y: {
            width: '146/200',
            alignment: 'right',
          },
          a: {
            width: '146/200',
            alignment: 'right',
          },
          l: {
            width: '146/200',
            alignment: 'left',
          },
        },
      },
    },
  },

  numeric: {
    portrait: {
      frame: {
        insets: {
          top: 3,
          bottom: 3,
          left: 4,
          right: 4,
        },
      },
      columns: {
        side: '29/183',
        main: '125/549',
      },
      collection: {
        height: '3/4',
      },
      buttonSizes: {},
      // 数字键盘竖屏布局，按列直接改这里即可。
      layout: {
        left: ['collection', 'return'],
        main1: ['1', '4', '7', 'symbol'],
        main2: ['2', '5', '8', '0'],
        main3: ['3', '6', '9', 'space'],
        right: ['equal', 'period', 'backspace', 'enter'],
      },
    },
    landscape: {
      frame: {
        insets: {
          top: 3,
          bottom: 3,
          left: 4,
          right: 4,
        },
      },
      split: {
        symbolArea: '9/20',
        gap: '2/20',
        numberArea: '9/20',
      },
      rows: {
        content: '227/281',
        actions: '54/281',
      },
      numberArea: {
        columns: {
          side: '29/183',
          main: '125/549',
        },
      },
      // 横屏数字键盘 = 左侧符号区 + 中间留白 + 右侧数字区。
      layout: {
        symbolArea: {
          top: ['category', 'description'],
          bottom: ['return', 'pageUp', 'pageDown', 'lock', 'backspace'],
        },
        numberArea: {
          left: ['collection', 'return'],
          main1: ['1', '4', '7', 'symbol'],
          main2: ['2', '5', '8', '0'],
          main3: ['3', '6', '9', 'space'],
          right: ['equal', 'period', 'backspace', 'enter'],
        },
      },
    },
  },

  symbolic: {
    portrait: {
      frame: {
        insets: {
          top: 3,
          bottom: 3,
          left: 4,
          right: 4,
        },
      },
      sections: {
        contentHeight: '227/281',
        actionsHeight: '54/281',
        categoryWidth: '56/375',
        descriptionWidth: '319/375',
      },
      buttonSizes: {
        action: { width: '87/375' },
        backspace: { width: '60/375' },
      },
      // 符号键盘竖屏布局，上面是分类与内容，下面是功能键。
      layout: {
        top: ['category', 'description'],
        bottom: ['return', 'pageUp', 'pageDown', 'lock', 'backspace'],
      },
    },
  },

  toolbar: {
    candidates: {
      horizontalWidth: '7/8',
    },
    expandedActions: {
      rowHeight: '1/5',
      columnWidth: '29/183',
    },
  },

  panel: {
    grid: {
      rowSpacing: 3,
      buttonHeight: '1/4',
    },
    frame: {
      insets: {
        top: 15,
        left: 15,
        bottom: 15,
        right: 15,
      },
      cornerRadius: 15,
    },
  },
}
