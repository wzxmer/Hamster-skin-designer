# AGENTS.md

@RTK.md

## 项目协作规则

- 回复用户必须使用中文，并以“浮生，”开头。
- 用户已确认不需要每次先说明操作方案、不需要修改文件前等待同意、不需要展开判断过程；默认直接执行并给结论。
- 没有要求细节时只给结论，避免啰嗦。
- 执行 shell 命令时优先使用 `rtk`；PowerShell 自带文件读取、枚举命令不需要强行套 `rtk`。

## 当前项目边界

- 不保留旧项目参考资料目录；需要查阅时回旧项目目录查看。
- 新版工作台以 `project.json` 为唯一内部模型。
- 默认导出 YAML 皮肤包，同时支持导出 Jsonnet 源码包。
- 首要产品形态是 GitHub Pages 可部署的纯前端网页工作台。
- 所有功能完成都必须满足 `github.io` / GitHub Pages 运行标准：纯静态可部署，不依赖本地 Node 服务、后端接口、绝对本机路径或只在开发服务器中成立的行为。
- 用户没有自有服务器，项目必须支持直接上传到 GitHub 并通过 GitHub Pages 部署运行；新增功能的设计、依赖、资源路径、数据保存和导入导出流程都必须以这个约束为验收标准。
- 布局编辑能力应逐步统一为同一套可视化编辑器；改造任一键盘模块后，需要检查 26 键、数字键盘、符号键盘等相关模块是否可复用并做模块级验收。
- 后续必须支持浏览器本地模板缓存，用户可手动保存模板，不必下载文件。
- 新版工作台必须自包含运行，不依赖旧项目中的示例皮肤、HamsterDoc 或蝦米輸入法目录。

## 开发入口

- 总览：`README.md`
- 开发入口文档：`docs/DEVELOPMENT_GUIDE.md`
- 架构：`docs/WORKBENCH_ARCHITECTURE.md`
- Schema 草案：`docs/PROJECT_SCHEMA.md`
- 示例皮肤字段映射归档：`docs/SAMPLE_SKIN_FIELD_MAP.md`
- 下一步计划：`docs/NEXT_DEVELOPMENT_PLAN.md`
- 验证命令：

```powershell
rtk npm run validate:project-schema
rtk npm run test:exporter
rtk npm run test:preview
rtk npm run build
```

## 记忆规则

- 项目记忆与文档存放规则见 `PROJECT_MEMORY_RULES.md`。
- 长期记忆只保存在使用者本地环境，不把个人电脑绝对路径写入公开仓库。
- 用户说“记住这个”“更新记忆”“梳理一下”“同步一下”“收尾”时，需要同步项目文档和记忆。
