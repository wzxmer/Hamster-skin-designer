# RTK - Rust Token Killer (Codex CLI)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with `rtk`.

Examples:

```bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
```

## Meta Commands

```bash
rtk gain            # Token savings analytics
rtk gain --history  # Recent command savings history
rtk proxy <cmd>     # Run raw command without filtering
```

## Verification

```bash
rtk --version
rtk gain
which rtk
```

## Memory And Docs

项目记忆与文档存放规则见 [PROJECT_MEMORY_RULES.md](./PROJECT_MEMORY_RULES.md)。

默认约定：

- 长期记忆只保存在使用者本地环境。
- 不要把个人电脑绝对路径写入公开仓库。
