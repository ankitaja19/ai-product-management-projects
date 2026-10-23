(function (root) {
  'use strict';

  const STORAGE_KEY = 'prd-template-generator-drafts-v1';

  function createDraftRepository(storage) {
    function read() {
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function write(drafts) {
      storage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    }

    return {
      list() {
        return read().map(draft => ({ ...draft })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      },
      get(id) {
        const draft = read().find(item => item.id === id);
        return draft ? JSON.parse(JSON.stringify(draft)) : null;
      },
      save(document) {
        if (!document?.id || !document?.title || !Array.isArray(document.sections)) {
          throw new Error('Cannot save an invalid PRD draft');
        }
        const drafts = read();
        const saved = { ...JSON.parse(JSON.stringify(document)), updatedAt: new Date().toISOString() };
        const index = drafts.findIndex(item => item.id === saved.id);
        if (index >= 0) drafts[index] = saved;
        else drafts.push(saved);
        write(drafts);
        return JSON.parse(JSON.stringify(saved));
      },
      remove(id) {
        const drafts = read();
        const next = drafts.filter(item => item.id !== id);
        if (next.length === drafts.length) return false;
        write(next);
        return true;
      },
      clear() {
        storage.removeItem(STORAGE_KEY);
      }
    };
  }

  const PRDStorage = { STORAGE_KEY, createDraftRepository };
  if (typeof module === 'object' && module.exports) module.exports = PRDStorage;
  root.PRDStorage = PRDStorage;
})(typeof window !== 'undefined' ? window : globalThis);
