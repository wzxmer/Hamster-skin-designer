# 元书输入法皮肤工作台

元书输入法 Hamster3 皮肤工作台重构项目。

默认模板数据已固化到 `packages/project-schema/defaults/project.sample.json`，工作台以 `project.json` 中间模型重新实现皮肤编辑、预览和导出。

## 当前决策

- 工作台内部维护 `project.json`，只暴露受控可调参数。
- 预览和导出共用 `packages/skin-effect`，链路为 `project.json -> SkinEffectModel -> preview / Jsonnet / YAML`。
- 默认导出完整皮肤包，用于实际安装与后续编辑，包内同时包含 YAML、Jsonnet 和 demo 预览图。
- 优先做 GitHub Pages 可部署的纯前端网页工作台。
- 已部署测试地址：<https://wzxmer.github.io/Hamster-skin-designer/apps/workbench/>
- 后续支持浏览器本地缓存，用户可手动保存模板而不必下载文件。

## 当前重点

1. 审查默认模板中尚未 UI 化的可调项，并同步到网页功能模块。
2. 维护 `packages/project-schema/defaults/project.sample.json`。
3. 继续压实 `project.json -> SkinEffectModel -> YAML / Jsonnet` 的一致性。
4. 继续完善新版 `apps/workbench`。

## 本地启动

```powershell
rtk npm run dev
```

默认打开 `http://127.0.0.1:4317/`，该入口加载新版 `apps/workbench`。旧 builder 服务保留为 `rtk npm run dev:builder`，仅作历史参考。

详细计划见：

- [docs/WORKBENCH_REBUILD_PLAN.md](./docs/WORKBENCH_REBUILD_PLAN.md)
- [docs/WORKBENCH_ARCHITECTURE.md](./docs/WORKBENCH_ARCHITECTURE.md)
- [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)
- [docs/PROJECT_SCHEMA.md](./docs/PROJECT_SCHEMA.md)
- [docs/SAMPLE_SKIN_FIELD_MAP.md](./docs/SAMPLE_SKIN_FIELD_MAP.md)
- [docs/NEXT_DEVELOPMENT_PLAN.md](./docs/NEXT_DEVELOPMENT_PLAN.md)

## 目录说明

- `apps/workbench/`：新版纯前端工作台，当前根入口会跳转到这里。
- `apps/web/data/templates/`：导出仍需复用的历史模板资源数据；旧网页运行代码已移除。
- `tools/visitor-stats-server/`：访问人数统计服务，用于 GitHub Pages 页面显示唯一访客数。
- `packages/project-schema/`：`project.json` 样例和校验。
- `packages/skin-effect/`：预览和导出共享的 resolved effect 模型。
- `packages/exporter/`：YAML、Jsonnet 与 zip 导出核心。
- `packages/preview-engine/`：预览模型生成。
