# 双平台推送配置说明

## 当前配置

项目已配置同时推送到 **Gitea** 和 **GitHub** 两个平台：

| 平台 | 远程名称 | URL |
|---|---|---|
| Gitea | origin | https://gitea.fczllc.top/fczllc/Chemical-Lab.git |
| GitHub | github | https://github.com/fczllc/Chemical-Lab.git |

## 推送方式

### 方式一：同时推送（推荐）

```bash
# 推送当前分支到两个平台
./scripts/push-dual.sh

# 推送指定分支
./scripts/push-dual.sh develop

# 推送标签
./scripts/push-dual.sh v0.1.0
```

### 方式二：分别推送

```bash
# 推送到 Gitea
git push origin master

# 推送到 GitHub
git push github master
```

### 方式三：配置 origin 多推送（已配置）

当前 origin 已配置双推送 URL，执行以下命令会同时推送到两个平台：

```bash
git push origin master
```

> 注意：此方式需要两个平台都网络可达。如果其中一个平台不可达，推送会失败。

## 首次使用 GitHub

如果 GitHub 仓库尚未创建：

1. 在 GitHub 创建同名仓库 `Chemical-Lab`
2. 确保本地有 GitHub 认证（SSH key 或 Personal Access Token）
3. 执行推送命令

## 发布新版本

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 推送到双平台（包含标签）
./scripts/push-dual.sh master
./scripts/push-dual.sh v0.1.1
```

GitHub Actions 会自动检测到 `v*` 标签并创建 Release。
