# 元素故事图片上传功能设计说明

## 目标

为元素故事页的两张故事媒体卡增加本地替换能力。用户双击发现故事或元素样品图片卡后，打开弹窗查看大图，上传本机图片，填写图片来源，保存后当前卡片立即更新。图片只保存在浏览器本地状态中，不写入 `src/data/storyMedia`，不上传服务器。

## 现状依据

* `src/modules/storyMode.js` 从 `../data/index.js` 导入 `storyMediaByAtomicNumber`，在 `renderStoryMediaGrid()` 中渲染两张卡。
* `renderStoryMediaCard(media, label, side)` 当前只接受 `LOCAL_STORY_MEDIA_PATTERN` 匹配的 `/assets/elements/(discovery|specimens)/*.webp`。
* `bindStoryActions()` 已集中绑定故事页交互，可扩展双击，键盘激活，弹窗行为。
* `src/modules/storage.js` 使用 `STORAGE_KEY = 'element-explorer-kids-state'` 与 `SCHEMA_VERSION = 'v2'` 保存状态，核心路径是 `serializeState()`，`migratePersistedEnvelope()`，`normalizePersistedData()`，以及导出的 mutation API。
* 项目没有后端上传入口，本功能必须使用 browser local persistence。

## 功能范围

1. 故事页每张媒体卡支持双击打开编辑弹窗。
2. 弹窗显示当前图片的大预览，用户可把它当作“播放”查看。
3. 用户可选择本机图片替换当前卡片图片。
4. 用户必须填写图片来源文本。
5. 保存后图片和来源写入浏览器本地状态，当前卡片重新渲染并显示替换结果。
6. 用户可清除本地替换，回到 canonical story media 记录。

## 非目标

* 不增加后端，云同步，账号同步，服务端上传接口。
* 不新增 npm 依赖。
* 不写入或改动 `src/data/storyMedia` canonical 数据。
* 不增加图片编辑，裁剪，压缩工具。
* 不保存二进制资产到仓库。

## 数据模型

在 `src/modules/storage.js` 的 app state 增加 `storyMediaOverrides`。

```js
storyMediaOverrides: {
  "29": {
    discovery: {
      src: "data:image/png;base64,...",
      source: "用户填写的图片来源",
      altZh: "铜发现故事图片",
      updatedAt: "2026-05-18T00:00:00.000Z"
    },
    specimen: {
      src: "data:image/jpeg;base64,...",
      source: "用户填写的图片来源",
      altZh: "铜元素样品图片",
      updatedAt: "2026-05-18T00:00:00.000Z"
    }
  }
}
```

Key 规则：

* 一级 key 是 atomic number 的字符串形式。
* 二级 key 只允许 `discovery` 或 `specimen`。
* `src` 只允许 `data:image/png`，`data:image/jpeg`，`data:image/webp` 的 data URL。
* `source` 是 trim 后的中文或英文来源文本，保存时不能为空。
* `altZh` 可由当前元素名和卡片类型生成。

建议导出 API：

```js
export function getStoryMediaOverride(atomicNumber, side) {}
export function getStoryMediaOverrides() {}
export function setStoryMediaOverride(atomicNumber, side, override) {}
export function clearStoryMediaOverride(atomicNumber, side) {}
```

`setStoryMediaOverride()` 成功时触发 `emitStateChange('storyMediaOverrides', oldValue, appState.storyMediaOverrides, 'storymediaoverridechange', { atomicNumber, side })`，并沿用现有 debounce save 行为。

## 上传校验

上传流程必须按这个顺序执行：

1. 检查文件存在。
2. 检查 MIME type 是 `image/png`，`image/jpeg`，或 `image/webp`。
3. 检查 `file.size <= 1024 * 1024`。
4. 用 `URL.createObjectURL(file)` 创建临时 URL。
5. 用 `new Image()` 解码临时 URL，读取 `naturalWidth` 和 `naturalHeight`。
6. 检查宽高都不大于 800。
7. 释放 object URL。
8. 通过 `FileReader.readAsDataURL(file)` 读取 data URL。
9. 保存前再次确认来源文本不为空。

中文错误文案：

* 未选图片：`请选择一张图片。`
* 类型错误：`请上传 PNG、JPG 或 WebP 图片。`
* 文件过大：`图片不能超过 1 MiB。`
* 尺寸过大：`图片宽高不能超过 800 × 800 像素。`
* 来源为空：`请填写图片来源。`
* 读取失败：`图片读取失败，请换一张图片再试。`

## 渲染和交互设计

`storyMode.js` 应在渲染卡片前合并 canonical media 和本地 override：

```js
const override = getStoryMediaOverride(element.atomicNumber, side);
const effectiveMedia = override ? { ...canonicalMedia, ...override } : canonicalMedia;
```

本地 data URL 不能经过 `LOCAL_STORY_MEDIA_PATTERN` 拒绝。建议新增 `isSafeStoryMediaSrc(src)`：

```js
function isSafeStoryMediaSrc(src) {
  return isLocalStoryMediaSrc(src) || /^data:image\/(png|jpeg|webp);base64,/i.test(src);
}
```

卡片交互要求：

* 双击 `.story-media-card` 打开弹窗。
* 卡片可通过键盘打开，推荐 `tabindex="0"`，`role="button"`，`aria-label="编辑发现故事图片"` 或 `aria-label="编辑元素样品图片"`。
* Enter 或 Space 触发同一弹窗。
* 弹窗关闭方式：关闭按钮，Escape，点击 backdrop。
* 弹窗关闭后焦点回到触发卡片。
* 错误消息使用 `role="alert"` 或 `aria-live="polite"`。

## 弹窗内容

弹窗应包含：

* 标题：`编辑发现故事图片` 或 `编辑元素样品图片`。
* 大图预览，默认显示当前 effective media。
* 文件输入，`accept="image/png,image/jpeg,image/webp"`。
* 图片来源输入框，预填当前来源。
* 保存按钮。
* 清除本地图片按钮，仅有 override 时启用。
* 取消或关闭按钮。

## 显示 CSS 要求

卡片和弹窗预览都应裁剪溢出，并让图片从左上角对齐缩放。

```css
.story-media-frame,
.story-media-modal-preview {
  overflow: hidden;
}

.story-media-frame img,
.story-media-modal-preview img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: left top;
}
```

卡片容器应限制最大尺寸，避免 data URL 图片撑破布局。弹窗预览建议最大 800px 宽高，并在小屏幕使用 `max-width: min(800px, 90vw)` 与 `max-height: min(800px, 70vh)`。

## 测试策略

1. Storage 单元测试覆盖默认状态，迁移，保存，读取，清除。
2. Story UI Playwright 测试覆盖双击弹窗，上传校验，保存后卡片更新，重新加载后仍显示本地图片。
3. 数据验证继续运行 `npm run validate:story-media`，因为 canonical story media 仍需保持合法。
4. 构建运行 `npm run build`。
5. 手动浏览器检查铜 Cu 的两张故事卡，确认弹窗，上传，本地保存，缩放，对齐左上角，溢出隐藏。

## 风险和处理

* localStorage 容量有限，1 MiB 图片转 data URL 后会膨胀。每张卡最多 1 MiB，功能面向两张当前故事图，仍接受此限制。若保存失败，沿用 storage 的保存失败警告，并在 UI 显示保存失败文案。
* `LOCAL_STORY_MEDIA_PATTERN` 不能直接放宽到所有 URL，只允许 canonical local asset 和受控 data image URL。
* 来源文本必须 escape 后渲染，继续使用 `escapeHTML()` 与 `escapeAttribute()`。
* 不升级 `SCHEMA_VERSION`，因为当前 migration 对 `v2` payload 已通过 `migrateV0ToV1()` 归一化。新增字段应在默认值和归一化中补齐。
