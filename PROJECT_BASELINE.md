# 项目基线

## 一句话结论

这是一个“皮肤设计器 + 模板构建器”项目，不是单纯的皮肤仓库。

当前核心链路是：

`项目数据(project) -> 写回模板目录(config/lib) -> jsonnet 编译 -> 导出 yaml / cskin`

后续如果要重构成“网站直接生成纯 yaml”，建议保留当前 `project` 数据模型，逐步替换“jsonnet 作为最终编译器”的位置，而不是先推翻编辑器。

新增硬约束：

后续默认以“可部署到 GitHub 并直接供用户使用”为目标，因此用户主流程必须优先满足静态站可运行。

## 当前目录角色

### 产品与运行时

- `apps/web/`
  前端编辑器与预览界面。
- `apps/builder/`
  本地 HTTP 服务、构建、打包、导入导出。
  现在应视为开发辅助层，不应再作为用户主运行链。
- `packages/shared-schema/`
  编辑器可编辑模块清单。
- `packages/template-adapters/`
  模板注册、版本归一、模板元数据。
- `packages/preview-engine/`
  预览层的标签解析与图标映射。

### 模板与产物

- `templates/hamster-ios/`
  当前系统真正使用的模板源。
- `示例生成的皮肤/`
  目标皮肤样例，包含 jsonnet 源和已生成 yaml，可作为目标验收对照。
- `蝦米輸入法/`
  更早的参考网站/参考皮肤源码，结构更原始，功能更全，但不是当前构建链直接依赖的模板。

## 已确认的数据链路

### 编辑器内部数据模型

前端和构建服务围绕统一 `project` 对象工作，主要结构是：

- `meta`
  项目名、作者、描述。
- `mapping`
  `config.yaml` 的键盘文件映射。
- `config.fontFace`
  字体资源配置。
- `lib.*`
  各功能模块配置。

其中当前可编辑模块由 `packages/shared-schema/index.js` 固定：

- `color`
- `fontSize`
- `theme`
- `others`
- `layout`
- `keyboard26`
- `numeric`
- `symbolic`
- `toolbar`
- `panel`
- `hintSymbolsData`
- `swipeData`
- `swipeDataEn`
- `collectionData`

### 模板加载

当前模板默认只有一个：`hamster-ios`。

加载流程：

1. `apps/builder/extract-template.jsonnet` 读取 `templates/hamster-ios/config.yaml`
2. 再把 `templates/hamster-ios/jsonnet/lib/*.libsonnet` 组装成前端使用的 `project`
3. 前端编辑后，把改动继续保存在这个 `project` 对象中

### 构建流程

构建入口在 `apps/builder/template-service.js`：

1. 校验 `project`
2. 复制 `templates/hamster-ios/` 到临时目录 `.work/build-*/template`
3. 用 `project.mapping/meta/config` 重新生成 `config.yaml`
4. 用 `project.lib.*` 覆盖模板目录下对应的 `jsonnet/lib/*.libsonnet`
5. 执行：
   `jsonnet -S -m <outputDir> <templateDir>/jsonnet/main.jsonnet`
6. 输出 `light/*.yaml`、`dark/*.yaml`
7. 打包时再补 `README.md`、`project.json`、`demo.png` 等

结论：当前网站并不是“直接生成 yaml”，而是“编辑 project 后驱动 jsonnet 生成 yaml”。

## 三套源码/产物的关系

### 1. `templates/hamster-ios/`

这是当前正式模板源，构建系统直接依赖它。

它已经不是最早那套皮肤源码的原样复制，而是被整理成了模板化结构：

- `jsonnet/core/`
  通用构建与渲染层
- `jsonnet/lib/`
  可编辑配置层
- `jsonnet/keyboard/`
  各键盘渲染入口
- `config.yaml`
  导出映射源

### 2. `示例生成的皮肤/`

这是你后续要让网站产出的目标样例。

它同时包含：

- `config.yaml`
- `light/`、`dark/` 已生成 yaml
- `jsonnet/` 生成这些 yaml 的历史源

结论：它本质上是“目标皮肤快照 + 可追溯旧源”，非常适合作为重构验收基准。

### 3. `蝦米輸入法/`

这是更老、更完整的一套参考源码，里面还保留了：

- `emoji_landscape`
- `symbolic_landscape`
- 更原始的多键盘导出逻辑

结论：它更像“参考站源码/参考实现”，适合挖功能细节和历史设计，但不应直接当作当前模板真源。

## 当前模板与目标样例的差异

已确认的关键差异：

- 当前模板 `templates/hamster-ios/` 的导出范围比 `蝦米輸入法/` 收缩了。
- 当前模板 `jsonnet/main.jsonnet` 只导出：
  - `pinyin_26_portrait`
  - `pinyin_26_landscape`
  - `alphabetic_26_portrait`
  - `alphabetic_26_landscape`
  - `numeric_9_portrait`
  - `numeric_9_landscape`
  - `symbolic_portrait`
  - `panel_portrait`
  - `panel_landscape`
- `蝦米輸入法/jsonnet/main.jsonnet` 还导出：
  - `symbolic_landscape`
  - `emoji_portrait`
  - `emoji_landscape`
- `示例生成的皮肤/` 当前目录里已经存在 `emoji_portrait.yaml`，说明目标交付物覆盖范围比当前模板更大。

这意味着后续重构前，必须先做一件事：

先定义“最终要支持的键盘集合”，不能默认以当前 `templates/hamster-ios/` 为完整真相。

## 当前网站能力边界

前端编辑器已具备：

- 模板加载
- 项目导入导出
- cskin 导入导出
- 分享码导入导出
- 预设加载
- 可视化编辑
- JSON 编辑兜底
- 实时预览
- 版本归一与兼容校验

但它的编辑能力本质上仍然受限于 `project.lib.*` 的结构设计。

结论：后续如果你要“逐一实现功能模块”，重点不应先写页面，而应先确认：

- 哪些功能只是前端缺入口
- 哪些功能是 `project` 模型里就还没有
- 哪些功能只有旧 jsonnet 有，当前模板没有

## GitHub 约束

后续请同时参考：

- `GITHUB_RUNTIME_CONSTRAINTS.md`

当前新的优先顺序已经变成：

1. 静态站可运行
2. 模板能力完整
3. 前端结构可维护
4. 本地 builder 仅作开发辅助

## 重构建议顺序

### 第一阶段：冻结基线

先把下面三者明确为基准：

- 当前运行系统：`templates/hamster-ios/`
- 功能参考源：`蝦米輸入法/`
- 最终目标样例：`示例生成的皮肤/`

### 第二阶段：做差异清单

逐项比对：

- 导出文件集合差异
- `config.yaml` 映射差异
- `jsonnet/lib/*` 模块字段差异
- 资源文件差异
- 网站现有编辑入口缺口

### 第三阶段：先统一中间模型

在“直接输出纯 yaml”之前，先稳定统一的中间层：

- 统一 `project` 字段定义
- 明确每个 `lib.*` 的职责
- 明确哪些字段是模板私有，哪些字段要升级成通用 schema

### 第四阶段：替换编译器

等中间模型稳定后，再做两种路线二选一：

- 路线 A：保留 jsonnet 模板，仅把网站导出链条整理干净
- 路线 B：把 `project -> yaml` 直接渲染器实现出来，逐步摆脱 jsonnet

如果目标是“网站生成的可以是纯 yaml”，更推荐路线 B，但必须在基线和 schema 固定后再动。

考虑到 GitHub 运行约束，路线 B 的长期优先级已经高于路线 A。

## 当前风险

### 风险 1：把参考源、模板源、目标样例混成一套

后果：

- 改一处不知道影响哪条链
- 后续很容易出现“页面能配，导出不一致”

### 风险 2：过早删除 jsonnet

后果：

- 会丢掉现成的规则表达能力
- 很难验证新 yaml 渲染器是否与旧行为一致

### 风险 3：直接围绕页面表单重构

后果：

- UI 会先膨胀
- 但底层 `project` 模型仍然混乱
- 后面还得返工

### 风险 4：目标功能集合不明确

目前至少存在这些未对齐点：

- `emoji` 键盘是否是正式目标
- `symbolic_landscape` 是否要恢复
- `iPad portrait` / `floating` 的最终输出策略
- 示例皮肤中的资源与当前模板资源是否完全一致

## 后续执行建议

后面正式开始重构时，建议按下面顺序推进：

1. 先做“差异盘点文档/脚本”
2. 再补齐目标模板能力边界
3. 再拆 `project` schema
4. 再逐模块重构前端编辑器
5. 最后再把导出链从 jsonnet 迁到纯 yaml

## 当前可直接作为事实依据的关键文件

- `apps/builder/template-service.js`
- `apps/builder/extract-template.jsonnet`
- `apps/web/template-runtime.js`
- `packages/shared-schema/index.js`
- `packages/template-adapters/index.js`
- `templates/hamster-ios/config.yaml`
- `templates/hamster-ios/jsonnet/main.jsonnet`
- `示例生成的皮肤/config.yaml`
- `示例生成的皮肤/jsonnet/main.jsonnet`
- `蝦米輸入法/jsonnet/main.jsonnet`

## 已完成的功能补齐

截至当前，已经补齐并验证通过的功能缺口：

- `symbolic` 竖屏映射补回
- `symbolic_landscape` 模板导出补回
- `emoji_portrait` 模板导出补回
- `emoji_landscape` 模板导出补回
- 前端静态模板默认映射已同步补齐
- 前端静态模板内置 jsonnet 资产已同步补齐

已验证当前模板可导出：

- `light/symbolic_portrait.yaml`
- `dark/symbolic_portrait.yaml`
- `light/symbolic_landscape.yaml`
- `dark/symbolic_landscape.yaml`
- `light/emoji_portrait.yaml`
- `dark/emoji_portrait.yaml`
- `light/emoji_landscape.yaml`
- `dark/emoji_landscape.yaml`

## 当前补齐后的状态

### 导出文件集合

当前 `templates/hamster-ios` 已能导出：

- `pinyin_26_portrait`
- `pinyin_26_landscape`
- `alphabetic_26_portrait`
- `alphabetic_26_landscape`
- `numeric_9_portrait`
- `numeric_9_landscape`
- `symbolic_portrait`
- `symbolic_landscape`
- `emoji_portrait`
- `emoji_landscape`
- `panel_portrait`
- `panel_landscape`

这意味着当前模板在“键盘文件种类”上，已经追平目标样例所需主集合。

### 默认映射状态

当前默认模板映射已包含：

- `alphabetic`
- `pinyin`
- `numeric`
- `symbolic`
- `emoji`
- `panel`

其中：

- `symbolic.iPhone/iPad.portrait` 指向 `symbolic_portrait`
- `symbolic.iPhone/iPad.landscape` 指向 `symbolic_landscape`
- `emoji.iPhone.portrait/landscape` 指向 `emoji_portrait` / `emoji_landscape`
- `emoji.iPad.portrait/landscape/floating` 已补齐

## 继续重构前的最新判断

### 已不是优先缺口的部分

经过检查，以下部分目前已经基本对齐，不适合作为下一优先项：

- `panel` 主按钮集合
- `panel` 布局行结构
- `toolbar` 主按钮集合
- `toolbar` 默认布局
- `light/dark resources` 资源文件清单

### 现在更适合做的事

接下来的高价值工作，不再是继续零散补按钮，而是：

1. 做 `project schema` 收敛
2. 做“模块职责边界”清理
3. 拆分前端编辑器的功能模块
4. 准备从 `jsonnet` 迁移到纯 `yaml` 渲染链

## 剩余差异的本质

当前剩余差异主要不是“有没有某个键盘文件”，而是下面这些结构性问题：

- 当前模板和参考源码使用了两套不同层级的实现组织方式
- 参考源码中部分逻辑还耦合旧的 `animation/center/utils/toolbar-en` 等拆分
- 当前模板已经把不少能力折叠进 `core/` 和统一 `lib.*` 结构
- 前端编辑器虽然能编辑很多字段，但 `schema` 仍偏模板内聚，不够抽象

结论：

后续应该从“架构整理”切入，而不是继续堆补丁式功能恢复。
