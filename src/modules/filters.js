/** ===== 筛选模块 ===== */
import { filterCells } from './renderTable.js';

export function initFilters(elements) {
  const categoryFilter = document.getElementById('category-filter');
  const periodFilter = document.getElementById('period-filter');
  const resetBtn = document.getElementById('reset-filters');
  
  let currentCategory = 'all';
  let currentPeriod = 'all';
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      filterCells(currentCategory, currentPeriod);
    });
  }
  
  if (periodFilter) {
    periodFilter.addEventListener('change', (e) => {
      currentPeriod = e.target.value;
      filterCells(currentCategory, currentPeriod);
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (categoryFilter) categoryFilter.value = 'all';
      if (periodFilter) periodFilter.value = 'all';
      currentCategory = 'all';
      currentPeriod = 'all';
      filterCells('all', 'all');
      
      // 清空搜索
      const searchInput = document.getElementById('element-search');
      if (searchInput) searchInput.value = '';
    });
  }
}
