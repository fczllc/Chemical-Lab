/** ===== 搜索模块 ===== */
import { applyFilters } from './renderTable.js';

export function initSearch(elements) {
  const searchInput = document.getElementById('element-search');
  const clearBtn = document.getElementById('search-clear');
  
  let searchTimeout;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applyFilters({ query: e.target.value });
      }, 200);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        applyFilters({ query: '' });
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        applyFilters({ query: '' });
        searchInput.focus();
      }
    });
  }
}
