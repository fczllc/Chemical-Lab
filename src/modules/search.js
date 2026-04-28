/** ===== 搜索模块 ===== */
import { searchElements } from './renderTable.js';

export function initSearch(elements) {
  const searchInput = document.getElementById('element-search');
  const clearBtn = document.getElementById('search-clear');
  
  let searchTimeout;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchElements(e.target.value);
      }, 200);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchElements('');
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchElements('');
        searchInput.focus();
      }
    });
  }
}
