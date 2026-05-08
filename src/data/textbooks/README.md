# 教材 Markdown 规范与课程编写指南

本指南说明如何向本仓库添加教材源文件、图片资产和课程标签。所有内容以中文为主，机器标识使用稳定 kebab-case ID。

## 目录

1. [教材源文件目录结构](#教材源文件目录结构)
2. [教材 Markdown 规范](#教材-markdown-规范)
3. [教材图片资产](#教材图片资产)
4. [运行时教材来源审核合同](#运行时教材来源审核合同)
5. [课程标签（curriculumTags）](#课程标签)
6. [校验命令](#校验命令)
7. [范围说明](#范围说明)

---

## 教材源文件目录结构

每一册教材对应一个独立的目录，放在 `src/data/textbooks/` 下：

```
src/data/textbooks/
  {volumeDirectory}/
    book.md          # 教材正文（Markdown）
    images/          # 教材配图
      *.jpg
      *.png
```

即每册教材的正文文件路径为 `src/data/textbooks/{volumeDirectory}/book.md`，配图放在同目录的 `images/` 下。

- `volumeDirectory` 可以是中文目录名，例如 `2024版人教版九年级化学上册`。
- 同一册教材的 `book.md` 和 `images/` 必须放在同一目录下。
- 运行时模块**禁止**直接导入 `book.md` 或 `images/` 中的原始文件。它们只是源资产，运行时通过 `src/data/index.js` 导出的已审核数据来引用。

### 必需的前言元数据

每册教材的 `book.md` 顶部必须包含如下 YAML frontmatter：

```yaml
---
volumeId: pep-chemistry-g9-2024
schoolLevel: 初中
grade: 九年级
bookTitle: 2024版人教版九年级化学上册
publisher: 人民教育出版社
edition: "2024"
chapters:
  - 第一单元 走进化学世界
  - 第二单元 我们周围的空气
  - ...
---
```

| 字段 | 说明 |
|------|------|
| `volumeId` | 稳定的 kebab-case 机器 ID，全局唯一，不能变更。 |
| `schoolLevel` | `入门` / `初中` / `高中` 之一。 |
| `grade` | 具体年级，例如 `九年级`、`高一`。 |
| `bookTitle` | 人可读的完整书名。 |
| `publisher` | 出版社名称。 |
| `edition` | 版次（字符串）。 |
| `chapters` | 章节列表，顺序与教材一致。 |

---

## 教材 Markdown 规范

### 标题约定

标题层级映射到稳定的标签路径和中文显示路径：

```markdown
# 第一单元 走进化学世界

## 课题1 物质的变化和性质

### 一、化学变化和物理变化

#### 实验1-1 水的沸腾
```

- 一级标题（`#`）对应**单元**。
- 二级标题（`##`）对应**课题**。
- 三级标题（`###`）对应**小节**。
- 四级标题（`####`）对应**实验/例题/观察活动**。

标题文本会被用来生成 `sourceHeading`，并参与 curriculum tag 的 `displayPath` 推导。因此标题文本一旦确定，就不要随意修改；如果必须修改，需要同步更新引用它的 curriculum tag。

### 图片链接

Markdown 中的图片链接必须使用**相对路径**，且必须指向本册目录下的 `images/` 文件夹：

```markdown
<!-- 正确 -->
![](images/figure-1-1.jpg)
![](./images/figure-1-1.jpg)

<!-- 错误 -->
![](/absolute/path/to/figure-1-1.jpg)
![](https://example.com/figure-1-1.jpg)
![](../other-book/images/figure-1-1.jpg)
```

- 只允许 `images/...` 或 `./images/...` 开头的相对路径。
- 图片路径不能跳出本册教材目录（不能包含 `..`）。
- 如果图片引用无法解析或路径格式错误，`npm run validate:textbook-assets` 会报错并失败。

### 已知损坏的占位符

如果源文件里存在已知的损坏图片占位符（例如 `![](images/![image]())`），不要直接删除，而是把它们登记到 `src/data/textbookAssets.js` 的 `sourceIssues` 数组中，标记为 `resolutionStatus: 'rejected'`。这样校验器会跳过这些已知问题，同时保留原始文本供追溯。

---

## 教材图片资产

教材图片可能包含以下内容：

- **化学式**（formula）
- **实验流程图**（experiment-flow）
- **装置图**（apparatus-diagram）
- **表格**（table）
- **实物照片**（photo）
- **其他**（other）

这些图片是**源资产**，用于后续人工审核和草稿编写，**不是**运行时自动信任的内容。

### 审核工作流

1. **OCR / 视觉提取** 可以从图片中提出候选内容（例如化学式文本、实验步骤摘要）。
2. 候选内容必须经过**人工审核**后，才能写入 `src/data/textbookAssets.js` 的 `assets` 数组，并标记为 `extractionStatus: 'reviewed'`。
3. 只有 `reviewed` 状态的资产，才能被测验题目、实验引用等运行时模块正式引用。

### 运行时引用

运行时模块（如 quiz、reaction、experiment）通过 `textbookAssetReferences` 引用教材资产：

```javascript
{
  id: 'some-quiz-question',
  textbookAssetReferences: [
    {
      assetId: 'pep-g9-2024-up-figure-1-3-naoh-cuso4',
      usage: 'experiment-flow',
      note: '参考九年级上册实验流程图'
    }
  ]
}
```

- `usage` 为 `formula`、`experiment-flow`、`apparatus-diagram` 时，被引用的资产必须是 `reviewed` 状态。
- `usage` 为 `photo`、`other` 时，允许引用 `unreviewed` 或 `machine-extracted` 状态的资产，但建议在正式题目中使用 `reviewed` 资产。

---

## 运行时教材来源审核合同

任何运行时可见、且内容来自教材正文或教材图片人工复核结果的记录（例如 quiz、reaction、learning path 或 game metadata）必须声明同一套已审核来源字段：

```javascript
{
  sourceReviewStatus: 'reviewed',
  sourceReferences: [
    {
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineRange: '3494-3504',
      assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
      reviewedTextField: 'formulaText',
      note: 'C60 公式来自九年级上册第六单元正文与图6-4相邻教材行。'
    }
  ]
}
```

字段约定：

| 字段 | 必填 | 说明 |
|------|------|------|
| `sourceReviewStatus` | 是 | 目前只接受 `reviewed`。只要记录带有 `sourceReferences`，就必须同时声明该字段。 |
| `sourceReferences` | 是 | 非空数组；每个条目对应一个人工复核过的教材来源。 |
| `sourceReferences[].volumeId` | 是 | 必须匹配 `src/data/textbookAssets.js` 中的教材卷 ID。 |
| `sourceReferences[].sourcePath` | 是 | 必须匹配该 `volumeId` 的 `sourcePath`，禁止运行时直接导入该 Markdown。 |
| `sourceReferences[].lineRange` | 是 | 教材行号范围，格式为 `起始行-结束行`，例如 `3494-3504`。 |
| `sourceReferences[].assetId` | 否 | 当记录使用已审核教材图片/公式资产时填写；资产必须存在且为 `extractionStatus: 'reviewed'`。 |
| `sourceReferences[].reviewedTextField` | 否 | 当来源支撑当前记录的 `formulaText` 或 `equationText` 时填写，必须指向当前记录中的已审核字段。 |
| `sourceReferences[].note` | 是 | 人工审核说明，说明该来源如何支撑当前记录。 |

C60 试点记录必须使用以下来源元数据：`volumeId: 'pep-chemistry-g9-2024'`、`sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md'`、`lineRange: '3494-3504'`，并在引用图6-4公式资产时使用 `assetId: 'pep-g9-2024-up-figure-6-4-c60-formula'`。

---

## 课程标签

课程标签（`curriculumTags`）定义在 `src/data/curriculum.js` 中，是运行时模块识别知识点、控制解锁和生成学习路径的核心元数据。

### 标签结构示例

```javascript
'g9-acid-base-salt-neutralization': {
  id: 'g9-acid-base-salt-neutralization',
  grade: '九年级',
  schoolLevel: '初中',
  chapter: '酸碱盐',
  topic: '中和反应',
  displayPath: '九年级/酸碱盐/中和反应',
  difficulty: '初中',
  aliases: ['中和反应', '酸碱中和', '酸和碱的反应'],
  sourceVolumeId: 'pep-chemistry-g9-2024',
  sourceHeading: '酸和碱的中和反应',
  prerequisites: ['intro-element-symbols'],
  status: 'seed'
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `id` | 稳定的 kebab-case 机器 ID，与对象 key 一致。 |
| `grade` | 年级，如 `九年级`、`高一`。 |
| `schoolLevel` | `入门` / `初中` / `高中`。 |
| `chapter` | 章节名称（中文）。 |
| `topic` | 具体知识点名称（中文）。 |
| `displayPath` | 中文显示路径，例如 `九年级/酸碱盐/中和反应`。 |
| `difficulty` | 难度等级：`入门`、`初中`、`高中基础`、`高中进阶`。 |
| `aliases` | 别名数组，用于搜索和匹配。 |
| `sourceVolumeId` | 来源教材的 `volumeId`。 |
| `sourceHeading` | 来源教材中的对应标题文本。 |
| `prerequisites` | 前置知识点 ID 数组，不能循环引用。 |
| `status` | `seed` / `draft` / `reviewed` / `published`。 |

### 种子标签示例

当前仓库已定义以下种子标签：

- `intro-element-symbols` — 入门/元素基础/元素符号
- `g9-acid-base-salt-neutralization` — 九年级/酸碱盐/中和反应
- `g10-redox-valence-change` — 高一/氧化还原/化合价变化

这些标签的 `displayPath` 分别对应：

- `入门/元素基础/元素符号`
- `九年级/酸碱盐/中和反应`
- `高一/氧化还原/化合价变化`

---

## 校验命令

以下命令用于验证教材和课程数据的完整性：

```bash
# 校验课程标签、前置依赖、解锁元数据和游戏挑战规则
npm run validate:curriculum

# 校验教材 Markdown 图片链接、资产清单路径和运行时引用状态
npm run validate:textbook-assets

# 安全聚合校验（不包含 story-media）
npm run validate:all:safe
```

- `validate:curriculum` 会检查标签字段是否合法、前置依赖是否无环、实验解锁和游戏挑战元数据是否一致。
- `validate:textbook-assets` 会检查 Markdown 中的图片链接是否可解析、资产路径是否存在、运行时引用是否指向已审核资产。
- 两个校验命令都必须在持续集成中通过，才能合并涉及教材或课程数据的改动。

---

## 范围说明

本指南只描述教材源文件的目录结构、Markdown 规范、图片资产管理和课程标签编写约定。**不包含完整教材内容的编写**。向本仓库添加教材时，应遵循以下原则：

- 只添加当前实现所需的最小教材源文件和标签。
- 完整的教材数字化、内容校对和题目编写属于后续任务范围，不在当前实现之内。
- 教材图片资产需要经过审核后才能成为运行时可信内容；OCR 和视觉提取的输出在审核前不得直接用于测验或实验引用。
