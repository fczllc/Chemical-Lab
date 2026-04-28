/** ===== 对比模块（最小页面壳） ===== */
import { getCompareList } from './storage.js';

let listenersBound = false;

export function initCompare() {
  renderComparePage();
  bindCompareEvents();
}

function bindCompareEvents() {
  if (listenersBound) {
    return;
  }

  window.addEventListener('compareupdated', renderComparePage);
  window.addEventListener('statereset', renderComparePage);
  listenersBound = true;
}

function renderComparePage() {
  const slots = document.querySelector('#compare-container .compare-slots');
  if (!slots) {
    return;
  }

  const compareList = getCompareList();
  slots.innerHTML = compareList.length > 0
    ? compareList.map((element) => `
      <article class="compare-page-card" style="--compare-accent: ${element.color || '#38bdf8'}">
        <div class="compare-page-topline">
          <span class="compare-page-symbol">${element.symbol}</span>
          <span class="compare-page-number">#${element.atomicNumber}</span>
        </div>
        <strong>${element.chineseName}</strong>
        <span>${element.englishName}</span>
        <small>${element.category} · 第 ${element.period} 周期</small>
      </article>
    `).join('')
    : `
      <div class="compare-page-empty">
        <strong>对比列表还是空的</strong>
        <p>在右侧详情面板点击“加入对比”，最多可放入 3 个元素，这里和首页预览会同步刷新。</p>
      </div>
    `;
}
