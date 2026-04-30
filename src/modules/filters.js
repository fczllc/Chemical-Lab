/** ===== 筛选模块 ===== */
import { applyFilters } from './renderTable.js';

export function initFilters() {
  const periodFilter = document.getElementById('period-filter');

  if (periodFilter) {
    periodFilter.addEventListener('change', (e) => {
      applyFilters({ period: e.target.value });
    });
  }
}
