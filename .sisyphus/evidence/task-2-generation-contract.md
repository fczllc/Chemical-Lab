# AI MCQ Generation Contract and Prompt Template

## 1. Generated MCQ Record JSON Shape

Each generated MCQ record is a single object that replaces the original `shortAnswer` placeholder in the runtime quiz data. The shape is defined below with required and optional fields, field types, and constraints.

### Required Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` | Copied unchanged from the original runtime record. Must be a non-empty string. | Runtime identifier used for deterministic mapping. |
| `question` | `string` | Non-empty, trimmed, no placeholder text (see forbidden patterns in Section 4). Must be a complete Chinese question suitable for children. | The MCQ question stem. |
| `options` | `string[]` | Exactly 4 elements. Each element is a non-empty, trimmed, unique string. No duplicates after trimming. | Four answer choices. |
| `correctIndex` | `integer` | Must be exactly `0`, `1`, `2`, or `3`. Must point to a valid option in the `options` array. | Zero-based index of the correct answer. |
| `category` | `string` | Non-empty, trimmed. Must be one of the existing runtime category values or a new chemistry-specific category. For generated textbook MCQs, recommended values include: `教材概念识别`, `教材结构识别`, `教材公式应用`, `反应概念`, `分类判断`, `comparison-topic`. | Question category for UI grouping and filtering. |
| `difficulty` | `string` | Must be exactly one of: `基础`, `进阶`, `挑战`. No other values allowed. | Difficulty level for mixed layering. |
| `curriculumTags` | `string[]` | Non-empty array of non-empty strings. Must preserve at least the original runtime `curriculumTags`. Additional tags may be added. | Curriculum and topic tags for search and filtering. |
| `explanation` | `string` | Non-empty, trimmed, no placeholder text. Must be a child-friendly Chinese explanation of why the correct answer is right and why distractors are wrong. | Explanation shown after answering. |
| `generatedFromShortAnswer` | `boolean` | Must be exactly `true`. | Flag indicating this record was generated from a `shortAnswer` placeholder. |
| `generationSource` | `string` | Non-empty, trimmed. Recommended format: `ai-mcq-generation-v1` or a model identifier string. | Identifies the generation pipeline or model version. |

### Optional Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `relatedElement` | `integer\|null` | If present, must be a positive integer matching an element atomic number in the app's element data. May be `null` if no single element is directly relevant. | Links the question to a specific chemical element. |
| `sourceVolumeId` | `string` | Copied unchanged from the original runtime record. | Textbook volume identifier. |
| `sourceReviewStatus` | `string` | Copied unchanged from the original runtime record. | Review status from the promotion manifest. |
| `sourceReferences` | `object[]` | Copied unchanged from the original runtime record. Array of provenance objects. | Full provenance chain including `sourceVolumeId`, `volumeId`, `sourcePath`, `sourceHeading`, `lineRange`, `sourceHash`, `candidateId`, `reviewedBy`, `reviewedAt`, `assetReferences`, `note`. |
| `textbookAssetReferences` | `object[]` | Copied unchanged from the original runtime record if present. Array of asset reference objects with `assetId`, `usage`, `reviewedTextField`, `note`. | Links to textbook images or formulas. |
| `formulaText` | `string` | Copied unchanged from the original runtime record if present. Non-empty if present. | Chemical formula text for display. |
| `notationReviewStatus` | `string` | Copied unchanged from the original runtime record if present. | Review status for formula notation. |

### Fields That Must NOT Be Present

- `answer` (the original shortAnswer placeholder string) — must be replaced by `options` and `correctIndex`.
- Any field containing placeholder text such as `待复核：依据来源片段补全标准答案。`.

### Deterministic Mapping

The generated record is keyed by the original runtime `id`. The converter (Task 3) will look up the original `shortAnswer` record by `id`, replace it with the generated MCQ object, and preserve all provenance fields unchanged.

---

## 2. Field Mapping from Original Runtime Record to Generated Record

The following fields are copied **unchanged** from the original runtime `shortAnswer` record:

| Original Field | Generated Field | Notes |
|----------------|-----------------|-------|
| `id` | `id` | Exact copy. This is the deterministic key. |
| `sourceVolumeId` | `sourceVolumeId` | Exact copy. |
| `sourceReviewStatus` | `sourceReviewStatus` | Exact copy. |
| `sourceReferences` | `sourceReferences` | Exact deep copy of the entire array and all nested objects. |
| `curriculumTags` | `curriculumTags` | Exact copy. Additional tags may be appended. |
| `textbookAssetReferences` | `textbookAssetReferences` | Exact deep copy if present in the original. |
| `formulaText` | `formulaText` | Exact copy if present in the original. |
| `notationReviewStatus` | `notationReviewStatus` | Exact copy if present in the original. |

The following fields are **generated** and replace the original placeholder values:

| Original Field | Generated Field | Generation Rules |
|----------------|-----------------|------------------|
| `question` | `question` | Rewritten or adapted from the original `question` and source context into a child-friendly Chinese MCQ stem. |
| `options` (placeholder array with 1 item) | `options` | Generated as exactly 4 unique, trimmed strings. |
| `correctIndex` (placeholder `0`) | `correctIndex` | Generated as a valid index `0-3`. |
| `category` (`shortAnswer`) | `category` | Replaced with a meaningful chemistry category (not `shortAnswer`). |
| `difficulty` | `difficulty` | Replaced with one of `基础`, `进阶`, `挑战`. |
| `explanation` (placeholder text) | `explanation` | Generated as a child-friendly Chinese explanation. |
| `relatedElement` (usually `null`) | `relatedElement` | May be set to a relevant element atomic number, or left as `null`. |
| N/A | `generatedFromShortAnswer` | Added as `true`. |
| N/A | `generationSource` | Added to identify the generation pipeline. |

### Provenance Preservation Rules

- All `sourceReferences` objects must be preserved in full, including nested `assetReferences`.
- `sourceHash`, `sectionHash`, `lineRange`, `sourcePath`, `sourceHeading`, `candidateId`, `reviewedBy`, `reviewedAt`, and `note` must not be modified.
- `textbookAssetReferences` and `formulaText` must be preserved if present, as they represent human-reviewed assets.

---

## 3. AI Prompt Template (Chinese)

The following prompt template is used by the executing AI agent to generate MCQs from textbook source context. Placeholders are marked with `{{placeholder}}`.

```
你是一位擅长化学教育的AI出题助手。你的任务是把教材中的简答题转换成适合中国儿童学习化学的选择题（MCQ）。

## 输入信息

- 原始题目ID: {{runtimeId}}
- 教材来源: {{sourceVolumeId}}
- 教材路径: {{sourcePath}}
- 章节标题: {{sourceHeading}}
- 行号范围: {{lineRange}}
- 原始简答题: {{originalQuestion}}
- 教材原文片段: {{sourceExcerpt}}
- 候选ID: {{candidateId}}
- 关联知识点标签: {{curriculumTags}}

## 出题要求

1. **题干**: 根据原始简答题和教材原文，改写成一个完整、清晰、适合儿童理解的选择题题干。语言要活泼、通俗，但不要失去化学准确性。
2. **选项**: 必须提供 **恰好4个** 选项。每个选项必须是独特的字符串，trim后不能重复。选项长度尽量相近，避免某个选项明显过长或过短。
3. **正确答案**: 在4个选项中指定唯一正确答案，给出其零基索引（0、1、2或3）。
4. **难度**: 必须为以下三者之一：
   - `基础` — 直接考查教材原文中的显性知识，儿童只要读了相关片段就能答对。
   - `进阶` — 需要理解概念之间的联系，或进行简单推理。
   - `挑战` — 需要综合运用多个知识点，或进行一定的分析判断。
5. **分类**: 使用以下分类之一：
   - `教材概念识别` — 识别、定义或区分化学概念。
   - `教材结构识别` — 识别分子结构、实验装置或物质结构。
   - `教材公式应用` — 应用化学方程式或计算公式。
   - `反应概念` — 考查化学反应类型、条件或现象。
   - `分类判断` — 对物质或反应进行分类。
   - `comparison-topic` — 比较不同物质、概念或方法。
6. **解释**: 提供一段儿童友好的中文解释，说明为什么正确答案是正确的，以及为什么其他选项是干扰项。解释要具体，不能泛泛而谈。
7. **知识点标签**: 保留原始 `curriculumTags`，可根据内容补充额外标签。
8. **关联元素**: 如果题目明显涉及某个具体化学元素，填写其原子序数（如碳填6）；否则填 `null`。

## 禁止事项

- 禁止在题干、选项或解释中出现任何占位符文本，例如 `待复核`、`TODO`、`请补充`、`待填写` 等。
- 禁止生成3个或5个选项；必须是恰好4个。
- 禁止选项在trim后出现重复内容。
- 禁止 `correctIndex` 超出 0-3 范围。
- 禁止难度值使用 `基础`、`进阶`、`挑战` 以外的任何字符串。
- 禁止生成空字符串或仅含空白的选项或解释。
- 禁止把原始简答题的占位符答案（如 `待复核：依据来源片段补全标准答案。`）当作正确答案使用。这些占位符没有实际答案信息，必须根据教材原文和化学常识自行构造正确答案和干扰项。占位符答案不可重用，也不可作为选项或解释的一部分。
- 禁止在输出中要求人工复核、用户确认或进入 `待复核` 状态。低置信度的题目应直接跳过，并在跳过原因中说明。

## 输出格式

请输出一个严格的 JSON 对象，不要包含任何 markdown 代码块标记或其他说明文字：

{
  "id": "{{runtimeId}}",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 0,
  "category": "...",
  "difficulty": "...",
  "curriculumTags": ["..."],
  "explanation": "...",
  "relatedElement": null,
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1",
  "sourceVolumeId": "{{sourceVolumeId}}",
  "sourceReviewStatus": "{{sourceReviewStatus}}",
  "sourceReferences": {{sourceReferencesJson}}
}

注意：
- `sourceReferences` 必须完整保留原始 JSON 结构，不得修改任何字段。
- 如果原始记录包含 `textbookAssetReferences`、`formulaText` 或 `notationReviewStatus`，也必须完整保留。
- 如果原始 `curriculumTags` 包含教材标签，必须全部保留，可追加新标签。

## 低置信度处理

如果你对某道题目没有足够把握生成高质量的MCQ（例如教材原文过于晦涩、涉及超纲内容、或无法构造合理的干扰项），请不要勉强生成。此时应跳过该题目，并记录跳过原因，例如：

{
  "skipped": true,
  "runtimeId": "{{runtimeId}}",
  "reason": "教材原文涉及大学有机化学机理，超出儿童化学学习范围，无法构造合理的儿童友好选项。"
}

跳过原因必须具体、诚实，不得使用模糊的借口。
```

---

## 4. Malformed Sample Cases and Validator Rejection Rules

The following malformed cases must be rejected by the validator (Task 4). Each case includes a description, a sample malformed record, and the rejection rule.

### Case 1: Only 3 Options

```json
{
  "id": "quiz-bad-001",
  "question": "水是由什么组成的？",
  "options": ["氢和氧", "氮和氧", "碳和氧"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["water-composition"],
  "explanation": "水由氢和氧组成。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: `options.length !== 4` → REJECT with code `INVALID_OPTION_COUNT`.

### Case 2: Duplicate Options After Trim

```json
{
  "id": "quiz-bad-002",
  "question": "最常见的金属元素是？",
  "options": ["铁", "铜", " 铁 ", "铝"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["common-metals"],
  "explanation": "铁是最常见的金属元素之一。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: After trimming each option, if any two options are equal (`===`) → REJECT with code `DUPLICATE_OPTIONS`.

### Case 3: Invalid `correctIndex`

```json
{
  "id": "quiz-bad-003",
  "question": "氧气支持燃烧吗？",
  "options": ["支持", "不支持", "有时支持", "不确定"],
  "correctIndex": 4,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["oxygen-properties"],
  "explanation": "氧气支持燃烧。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: `correctIndex < 0 || correctIndex > 3 || correctIndex >= options.length` → REJECT with code `INVALID_CORRECT_INDEX`.

### Case 4: Placeholder Text in Question

```json
{
  "id": "quiz-bad-004",
  "question": "待复核：依据来源片段补全标准答案。",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["placeholder"],
  "explanation": "这是占位符。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `question` contains any forbidden placeholder pattern (`待复核`, `TODO`, `请补充`, `待填写`, `依据来源片段补全标准答案`) → REJECT with code `PLACEHOLDER_IN_QUESTION`.

### Case 5: Placeholder Text in Option

```json
{
  "id": "quiz-bad-005",
  "question": "下列哪种物质是酸？",
  "options": ["盐酸", "氢氧化钠", "氯化钠", "待补充"],
  "correctIndex": 0,
  "category": "分类判断",
  "difficulty": "基础",
  "curriculumTags": ["acid-base"],
  "explanation": "盐酸是酸。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If any option contains any forbidden placeholder pattern → REJECT with code `PLACEHOLDER_IN_OPTION`.

### Case 6: Placeholder Text in Explanation

```json
{
  "id": "quiz-bad-006",
  "question": "水的化学式是什么？",
  "options": ["H2O", "CO2", "O2", "N2"],
  "correctIndex": 0,
  "category": "教材公式应用",
  "difficulty": "基础",
  "curriculumTags": ["water-formula"],
  "explanation": "待复核：依据来源片段补全标准答案。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `explanation` contains any forbidden placeholder pattern → REJECT with code `PLACEHOLDER_IN_EXPLANATION`.

### Case 7: Empty Explanation

```json
{
  "id": "quiz-bad-007",
  "question": "铁生锈需要什么？",
  "options": ["水和氧气", "只有水", "只有氧气", "什么都不需要"],
  "correctIndex": 0,
  "category": "反应概念",
  "difficulty": "基础",
  "curriculumTags": ["iron-rust"],
  "explanation": "",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `explanation` is empty or contains only whitespace after trimming → REJECT with code `EMPTY_EXPLANATION`.

### Case 8: Invalid Difficulty

```json
{
  "id": "quiz-bad-008",
  "question": "原子核由什么组成？",
  "options": ["质子和中子", "电子和质子", "中子和电子", "只有质子"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "简单",
  "curriculumTags": ["atomic-structure"],
  "explanation": "原子核由质子和中子组成。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `difficulty` is not exactly one of `基础`, `进阶`, `挑战` → REJECT with code `INVALID_DIFFICULTY`.

### Case 9: Missing Provenance

```json
{
  "id": "quiz-bad-009",
  "question": "燃烧需要什么条件？",
  "options": ["可燃物、氧气、着火点", "只有可燃物", "只有氧气", "只有温度"],
  "correctIndex": 0,
  "category": "反应概念",
  "difficulty": "基础",
  "curriculumTags": ["combustion"],
  "explanation": "燃烧需要可燃物、氧气和达到着火点。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `sourceReferences` is missing, empty, or does not contain at least one object with `sourceVolumeId` and `candidateId` → REJECT with code `MISSING_PROVENANCE`.

### Case 10: Missing Generation Source

```json
{
  "id": "quiz-bad-010",
  "question": "酸和碱反应生成什么？",
  "options": ["盐和水", "盐和酸", "碱和水", "盐和碱"],
  "correctIndex": 0,
  "category": "反应概念",
  "difficulty": "基础",
  "curriculumTags": ["acid-base-reaction"],
  "explanation": "酸和碱反应生成盐和水。",
  "generatedFromShortAnswer": true
}
```

**Rejection Rule**: If `generationSource` is missing, empty, or not a string → REJECT with code `MISSING_GENERATION_SOURCE`.

### Case 11: Missing `generatedFromShortAnswer` Flag

```json
{
  "id": "quiz-bad-011",
  "question": "金属导电靠什么？",
  "options": ["自由电子", "质子", "中子", "原子核"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["metal-conductivity"],
  "explanation": "金属导电靠自由电子。",
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `generatedFromShortAnswer` is not exactly `true` → REJECT with code `MISSING_GENERATION_FLAG`.

### Case 12: Empty or Whitespace-Only Option

```json
{
  "id": "quiz-bad-012",
  "question": "哪种气体不支持燃烧？",
  "options": ["氮气", "氧气", "", "氢气"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["gas-properties"],
  "explanation": "氮气不支持燃烧。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If any option is empty or contains only whitespace after trimming → REJECT with code `EMPTY_OPTION`.

### Case 13: Empty or Whitespace-Only Question

```json
{
  "id": "quiz-bad-013",
  "question": "   ",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "category": "教材概念识别",
  "difficulty": "基础",
  "curriculumTags": ["empty-question"],
  "explanation": "占位符。",
  "generatedFromShortAnswer": true,
  "generationSource": "ai-mcq-generation-v1"
}
```

**Rejection Rule**: If `question` is empty or contains only whitespace after trimming → REJECT with code `EMPTY_QUESTION`.

### Forbidden Placeholder Patterns

The validator must scan `question`, `options`, and `explanation` for the following substrings (case-insensitive):

- `待复核`
- `TODO`
- `请补充`
- `待填写`
- `依据来源片段补全标准答案`
- `placeholder`

If any of these patterns are found, the record is rejected with the appropriate `PLACEHOLDER_IN_*` code.

---

## 5. Difficulty Layering Guidelines

To ensure a balanced mix of difficulty across generated MCQs, the AI agent should follow these approximate proportions per batch:

- `基础`: 50-60% of questions
- `进阶`: 30-40% of questions
- `挑战`: 10-20% of questions

The exact distribution may vary by batch depending on the source material, but the validator will flag batches with extreme skew (e.g., 100% `基础` or 0% `挑战`) as a warning, not a hard rejection.

---

## 6. Child-Friendly Language Guidelines

- Use simple Chinese sentences. Avoid overly technical jargon unless it is the learning objective.
- Use analogies and everyday examples where appropriate (e.g., "就像搭积木一样").
- Keep explanations positive and encouraging.
- Avoid negative or frightening examples involving dangerous chemicals.
- Use the second person ("你") to engage the child reader.
- Keep option lengths roughly balanced so that the longest option does not stand out as obviously correct.

---

## 7. Confidence and Skipping Policy

The AI agent must not generate low-confidence MCQs. If any of the following conditions apply, the agent must skip the record and provide a reason:

- The source text is too short (less than 20 characters) to construct a meaningful question.
- The source text is garbled, contains mostly LaTeX/MathML fragments, or is otherwise unreadable.
- The topic is clearly outside the scope of children's chemistry (e.g., advanced organic reaction mechanisms, quantum chemistry calculations).
- The agent cannot construct three plausible distractors that are clearly wrong but not obviously absurd.
- The source text contains a placeholder instruction like "围绕'思考与讨论'设计一道待审题目" with no actual content to base a question on.

Skip reasons must be specific and honest. The converter (Task 3) will collect skipped records and report them for operator visibility, with no human review gate.

---

## 8. Contract Version

- **Version**: 1.0
- **Created**: 2026-05-12
- **Depends on**: Task 1 (MCQ Batch Inventory)
- **Blocks**: Task 3 (Converter Implementation), Task 4 (Validator Implementation)
