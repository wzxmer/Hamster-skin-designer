# 皮肤工作台重建计划

## 当前判断

旧版 `apps/web` 已不适合作为继续开发基础，当前运行代码和旧数据壳已移除；需要追溯时看历史提交或归档文档。新版工作台以 `apps/workbench` 为准。

主要原因：

- 前端入口存在语法错误，当前无法稳定启动。
- 旧 UI 和旧编辑模型围绕 Jsonnet/lib 直接编辑展开，和新的 `project.json` 中间模型路线不一致。
- 旧代码多次改造后职责混杂，继续修补会增加后续维护成本。

## 新路线

新版工作台采用：

```text
project.json 中间模型
  -> YAML 皮肤包导出
  -> Jsonnet 源码包导出
```

Jsonnet 是模板工程能力，不作为工作台唯一用户模型。工作台只暴露受控参数。

## 开发阶段

### 阶段 0：示例皮肤收口

- 完成 `示例皮肤/jsonnet/lib/config` 的可调参数集中。
- 把 `keyboard` 中残留的可调参数继续迁入 `lib/config`。
- 梳理哪些字段应进入 `project.json` schema。

### 阶段 1：Schema 与映射

- 定义 `project.json` schema。
- 建立“示例皮肤字段 -> project.json 字段 -> YAML/Jsonnet 输出”的映射表。
- 明确 light/dark 差异字段。

### 阶段 2：导出核心

- 实现 `project.json -> YAML`。
- 实现 `project.json -> Jsonnet 源码包`。
- 实现 `project.json + assets -> zip`。

### 阶段 3：新版网页 MVP

- 模板载入。
- 配色、字体、insets、文案、素材引用编辑。
- 预览。
- 导出 zip。
- 浏览器本地保存模板。

### 阶段 4：增强

- 长按、划动、数据源编辑。
- 多模板管理。
- 模板库与 IndexedDB 本地缓存。
- 可选 Tauri / exe 版本。

## 旧代码处理

- 仅保留当前链路仍依赖的旧数据资源；旧 `apps/builder` 本地服务已移除。
- 当前新版已落在 `apps/workbench`；后续重构应围绕现有工作台继续拆分和收敛。
