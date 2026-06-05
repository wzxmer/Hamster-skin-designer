# 下一步开发计划

## 目标

补齐新版皮肤工作台从默认模板到可导出皮肤的闭环：

```text
project.sample.json -> 预览 -> YAML 导出 -> Jsonnet 源码导出 -> 浏览器本地保存
```

本项目不保留 `HamsterDoc`、`示例皮肤`、`蝦米輸入法` 等旧项目参考资料目录；需要追溯字段来源时回旧项目查看。

## 当前已完成基础

- 维护 `packages/project-schema/defaults/project.sample.json`。
- 维护最小 validator。
- 默认模板已固化旧示例皮肤的 `config.yaml`、`collectionData`、`swipeData` 和 `swipeData-en` 数据。
- `apps/workbench` 已作为新版入口，预览接近 Hamster3 CALayer 实际效果。
- 已覆盖 light/dark、insets、键盘高度、26 键布局、数字键盘、候选栏、toolbar、划动显示和导出目标校验。

验收：

```powershell
rtk npm run validate:project-schema
```

## 第一阶段：导出核心

- `project.json -> YAML files`
- `project.json -> Jsonnet source tree`
- `project.json + assets -> zip`
- 增加最小测试样例。

验收：

```powershell
rtk npm run test:exporter
```

## 第二阶段：预览引擎

- 继续校准 `project.json` 到实际预览的比例关系。
- 补符号键盘、面板、长按候选和 collection 预览。
- 保持 `center.x/y` 与实际 CALayer 相对坐标等比例。

验收：

```powershell
rtk npm run test:preview
```

## 第三阶段：网页功能补齐

- 对照字段映射归档和默认模板审查剩余可调项。
- 为缺失字段补可视化编辑模块。
- 导出 YAML zip 和 Jsonnet zip。
- 手动保存到浏览器本地缓存，刷新后恢复。

验收：

```powershell
rtk npm run build
```

## 最终校验

每阶段通过后才能进入下一阶段。最终执行全量校验，若失败则修复后重跑。
