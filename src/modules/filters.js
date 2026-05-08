/** ===== 筛选模块 ===== */
import { applyFilters } from './renderTable.js';

const CURRICULUM_SCOPE_FIELDS = ['grade', 'chapter', 'topic'];

export function initFilters() {
  const periodFilter = document.getElementById('period-filter');

  if (periodFilter) {
    periodFilter.dataset.curriculumFilterFields = CURRICULUM_SCOPE_FIELDS.join(',');
    periodFilter.addEventListener('change', (e) => {
      applyFilters({ period: e.target.value });
    });
  }
}

export function normalizeCurriculumMetadata(metadata = {}) {
  const curriculumTags = normalizeCurriculumTags(metadata.curriculumTags);
  const normalized = {
    curriculumTags,
    difficulty: normalizeCurriculumField(metadata.difficulty)
  };

  CURRICULUM_SCOPE_FIELDS.forEach((field) => {
    normalized[field] = normalizeCurriculumField(metadata[field]);
  });

  return normalized;
}

export function matchesCurriculumMetadata(source = {}, filters = {}) {
  const normalizedSource = normalizeCurriculumMetadata(source);
  const normalizedFilters = normalizeCurriculumMetadata(filters);

  if (normalizedFilters.difficulty && normalizedSource.difficulty !== normalizedFilters.difficulty) {
    return false;
  }

  if (normalizedFilters.curriculumTags.length > 0) {
    const sourceTags = new Set(normalizedSource.curriculumTags);
    if (!normalizedFilters.curriculumTags.every((tag) => sourceTags.has(tag))) {
      return false;
    }
  }

  return CURRICULUM_SCOPE_FIELDS.every((field) => !normalizedFilters[field] || normalizedSource[field] === normalizedFilters[field]);
}

function normalizeCurriculumTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()))];
}

function normalizeCurriculumField(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
