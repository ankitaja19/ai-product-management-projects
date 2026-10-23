(() => {
  'use strict';

  const STORAGE_KEY = 'rice-prioritization-features-v1';
  const EXAMPLES = [
    { name: 'Self-serve onboarding', reach: 2400, impact: 2, confidence: 90, effort: 4 },
    { name: 'Advanced analytics dashboard', reach: 900, impact: 3, confidence: 75, effort: 6 },
    { name: 'Bulk editing', reach: 1300, impact: 1, confidence: 85, effort: 2 },
    { name: 'Dark mode', reach: 3200, impact: 0.5, confidence: 80, effort: 3 }
  ];

  const elements = {
    form: document.querySelector('#featureForm'),
    featureName: document.querySelector('#featureName'),
    reach: document.querySelector('#reach'),
    impact: document.querySelector('#impact'),
    confidence: document.querySelector('#confidence'),
    effort: document.querySelector('#effort'),
    scorePreview: document.querySelector('#scorePreview'),
    submitButton: document.querySelector('#submitButton'),
    cancelEditButton: document.querySelector('#cancelEditButton'),
    formKicker: document.querySelector('#formKicker'),
    formTitle: document.querySelector('#formTitle'),
    tableBody: document.querySelector('#featureTableBody'),
    emptyState: document.querySelector('#emptyState'),
    searchInput: document.querySelector('#searchInput'),
    totalFeatures: document.querySelector('#totalFeatures'),
    topScore: document.querySelector('#topScore'),
    totalEffort: document.querySelector('#totalEffort'),
    loadExamplesButton: document.querySelector('#loadExamplesButton'),
    emptyExampleButton: document.querySelector('#emptyExampleButton'),
    clearButton: document.querySelector('#clearButton'),
    exportButton: document.querySelector('#exportButton'),
    toast: document.querySelector('#toast')
  };

  let features = loadFeatures();
  let editingId = null;
  let toastTimer;

  function newId() {
    return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function calculateScore(feature) {
    const { reach, impact, confidence, effort } = feature;
    if (![reach, impact, confidence, effort].every(Number.isFinite) || effort <= 0) return 0;
    return (reach * impact * (confidence / 100)) / effort;
  }

  function formatNumber(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
  }

  function getFormValues() {
    return {
      name: elements.featureName.value.trim(),
      reach: Number(elements.reach.value),
      impact: Number(elements.impact.value),
      confidence: Number(elements.confidence.value),
      effort: Number(elements.effort.value)
    };
  }

  function isCompleteFeature(feature) {
    return Boolean(feature.name) &&
      Number.isFinite(feature.reach) && feature.reach >= 0 &&
      Number.isFinite(feature.impact) && feature.impact > 0 &&
      Number.isFinite(feature.confidence) && feature.confidence >= 1 && feature.confidence <= 100 &&
      Number.isFinite(feature.effort) && feature.effort > 0;
  }

  function updatePreview() {
    const values = getFormValues();
    elements.scorePreview.textContent = isCompleteFeature(values)
      ? formatNumber(calculateScore(values))
      : '—';
  }

  function saveFeatures() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  }

  function loadFeatures() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(saved)) return [];
      return saved.filter(isCompleteFeature).map(feature => ({ ...feature, id: feature.id || newId() }));
    } catch {
      return [];
    }
  }

  function sortedFeatures() {
    return [...features].sort((a, b) => calculateScore(b) - calculateScore(a));
  }

  function confidenceClass(value) {
    if (value >= 80) return 'high';
    if (value >= 50) return 'medium';
    return 'low';
  }

  function impactLabel(value) {
    return ({ 3: 'Massive', 2: 'High', 1: 'Medium', 0.5: 'Low', 0.25: 'Minimal' })[value] || `${value}×`;
  }

  function createCell(content, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    return cell;
  }

  function createFeatureRow(feature, rank) {
    const row = document.createElement('tr');

    const rankBadge = document.createElement('span');
    rankBadge.className = `rank${rank === 1 ? ' top' : ''}`;
    rankBadge.textContent = rank;
    row.append(createCell(rankBadge));

    const nameCell = createCell(feature.name, 'feature-name');
    nameCell.title = feature.name;
    row.append(nameCell);
    row.append(createCell(formatNumber(feature.reach, 0)));

    const impactBadge = document.createElement('span');
    impactBadge.className = 'impact-badge';
    impactBadge.textContent = `${feature.impact}× ${impactLabel(feature.impact)}`;
    row.append(createCell(impactBadge));

    const confidenceBadge = document.createElement('span');
    confidenceBadge.className = `confidence-badge ${confidenceClass(feature.confidence)}`;
    confidenceBadge.textContent = `${feature.confidence}%`;
    row.append(createCell(confidenceBadge));

    row.append(createCell(`${formatNumber(feature.effort)} mo.`));
    row.append(createCell(formatNumber(calculateScore(feature)), 'score'));

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.append(
      createActionButton('Edit feature', '✎', () => startEditing(feature.id)),
      createActionButton('Delete feature', '×', () => deleteFeature(feature.id), 'delete')
    );
    row.append(createCell(actions));
    return row;
  }

  function createActionButton(label, symbol, handler, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `row-action ${extraClass}`.trim();
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = symbol;
    button.addEventListener('click', handler);
    return button;
  }

  function render() {
    const ranked = sortedFeatures();
    const query = elements.searchInput.value.trim().toLowerCase();
    const visible = ranked.filter(feature => feature.name.toLowerCase().includes(query));

    elements.tableBody.replaceChildren();
    visible.forEach(feature => {
      const rank = ranked.findIndex(item => item.id === feature.id) + 1;
      elements.tableBody.append(createFeatureRow(feature, rank));
    });

    const isEmpty = features.length === 0;
    const noResults = !isEmpty && visible.length === 0;
    elements.emptyState.classList.toggle('hidden', visible.length > 0);
    elements.emptyState.querySelector('h3').textContent = noResults ? 'No matching features' : 'Your priorities will appear here';
    elements.emptyState.querySelector('p').textContent = noResults
      ? 'Try a different search term.'
      : 'Add your first feature or load examples to see RICE ranking in action.';
    elements.emptyExampleButton.classList.toggle('hidden', noResults);

    elements.totalFeatures.textContent = features.length;
    elements.topScore.textContent = ranked.length ? formatNumber(calculateScore(ranked[0])) : '—';
    const effort = features.reduce((sum, feature) => sum + feature.effort, 0);
    elements.totalEffort.innerHTML = `${formatNumber(effort)} <small>person-mo.</small>`;
    elements.exportButton.disabled = isEmpty;
    elements.clearButton.disabled = isEmpty;
  }

  function resetForm() {
    editingId = null;
    elements.form.reset();
    elements.confidence.value = 80;
    elements.impact.value = 1;
    elements.formKicker.textContent = 'New feature';
    elements.formTitle.textContent = 'Add an initiative';
    elements.submitButton.innerHTML = '<span aria-hidden="true">＋</span> Add to priority list';
    elements.cancelEditButton.classList.add('hidden');
    updatePreview();
  }

  function startEditing(id) {
    const feature = features.find(item => item.id === id);
    if (!feature) return;

    editingId = id;
    elements.featureName.value = feature.name;
    elements.reach.value = feature.reach;
    elements.impact.value = feature.impact;
    elements.confidence.value = feature.confidence;
    elements.effort.value = feature.effort;
    elements.formKicker.textContent = 'Editing feature';
    elements.formTitle.textContent = 'Update initiative';
    elements.submitButton.textContent = 'Save changes';
    elements.cancelEditButton.classList.remove('hidden');
    updatePreview();
    elements.featureName.focus();
    window.scrollTo({ top: elements.form.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  function deleteFeature(id) {
    const feature = features.find(item => item.id === id);
    if (!feature || !window.confirm(`Delete “${feature.name}”?`)) return;
    features = features.filter(item => item.id !== id);
    if (editingId === id) resetForm();
    saveFeatures();
    render();
    showToast('Feature deleted');
  }

  function loadExamples() {
    const existingNames = new Set(features.map(feature => feature.name.toLowerCase()));
    const additions = EXAMPLES.filter(example => !existingNames.has(example.name.toLowerCase()))
      .map(example => ({ ...example, id: newId() }));

    if (!additions.length) {
      showToast('Examples are already loaded');
      return;
    }
    features.push(...additions);
    saveFeatures();
    render();
    showToast(`${additions.length} example${additions.length === 1 ? '' : 's'} added`);
  }

  function clearAll() {
    if (!features.length || !window.confirm('Clear every feature from your priority list?')) return;
    features = [];
    saveFeatures();
    resetForm();
    render();
    showToast('Priority list cleared');
  }

  function escapeCsv(value) {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv() {
    const header = ['Rank', 'Feature', 'Reach', 'Impact', 'Confidence (%)', 'Effort (person-months)', 'RICE Score'];
    const rows = sortedFeatures().map((feature, index) => [
      index + 1, feature.name, feature.reach, feature.impact, feature.confidence, feature.effort,
      calculateScore(feature).toFixed(1)
    ]);
    const csv = [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rice-priorities.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2200);
  }

  elements.form.addEventListener('input', updatePreview);
  elements.form.addEventListener('change', updatePreview);
  elements.form.addEventListener('submit', event => {
    event.preventDefault();
    const values = getFormValues();
    if (!elements.form.reportValidity() || !isCompleteFeature(values)) return;

    if (editingId) {
      features = features.map(feature => feature.id === editingId ? { ...values, id: editingId } : feature);
      showToast('Feature updated');
    } else {
      features.push({ ...values, id: newId() });
      showToast('Feature added');
    }
    saveFeatures();
    resetForm();
    render();
  });

  elements.searchInput.addEventListener('input', render);
  elements.cancelEditButton.addEventListener('click', resetForm);
  elements.loadExamplesButton.addEventListener('click', loadExamples);
  elements.emptyExampleButton.addEventListener('click', loadExamples);
  elements.clearButton.addEventListener('click', clearAll);
  elements.exportButton.addEventListener('click', exportCsv);

  resetForm();
  render();
})();
