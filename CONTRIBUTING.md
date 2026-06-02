# 贡献指南

感谢你对「元素探索者」项目的兴趣！我们欢迎各种形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请通过 GitHub Issues 报告：

1. 检查是否已有相关 Issue
2. 使用 Bug 报告模板创建新 Issue
3. 提供详细的复现步骤和环境信息

### 提出新功能

1. 检查是否已有相关功能请求
2. 使用功能请求模板创建新 Issue
3. 描述清楚功能的用途和预期行为

### 提交代码

1. Fork 这个仓库
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/fczllc/Chemical-Lab.git
cd Chemical-Lab

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行验证
npm run validate:all:safe
```

## 代码规范

- 遵循项目现有的代码风格
- 使用有意义的变量和函数名
- 添加必要的注释
- 确保所有验证通过

## 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(home): add new game mode
fix(quiz): correct answer validation
```

## 行为准则

参与本项目即表示你同意遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。

## 问题？

如有任何问题，欢迎通过 GitHub Issues 联系我们。
