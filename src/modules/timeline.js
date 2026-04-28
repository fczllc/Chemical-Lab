/** ===== 时间线模块（最小页面壳） ===== */
let timelineElements = [];

export function initTimeline(elements = []) {
  timelineElements = Array.isArray(elements) ? [...elements] : [];
  renderTimelinePage();
}

function renderTimelinePage() {
  const container = document.getElementById('timeline-container');
  if (!container) {
    return;
  }

  const items = timelineElements
    .filter((element) => Number.isFinite(Number(element.discoveryYear)))
    .sort((left, right) => Number(right.discoveryYear) - Number(left.discoveryYear))
    .slice(0, 12);

  container.innerHTML = `
    <div class="timeline-page-shell">
      <p class="timeline-page-intro">先用最近进入现代化学视野的元素热身，完整交互时间线会在后续任务中补齐。</p>
      <div class="timeline-page-list">
        ${items.map((element) => `
          <article class="timeline-page-card" style="--timeline-accent: ${element.color || '#b829ff'}">
            <span class="timeline-page-year">${element.discoveryYear}</span>
            <div>
              <strong>${element.symbol} · ${element.chineseName}</strong>
              <p>${element.discoveredBy || '发现者资料整理中'}</p>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}
