(function (root) {
  'use strict';

  const STORAGE_KEY = 'product-roadmap-builder-features-v1';
  const VIEW_KEY = 'product-roadmap-builder-view-v1';
  const STATUSES = ['Planned', 'In Progress', 'Launched'];
  const PRIORITIES = ['High', 'Medium', 'Low'];
  const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };
  const DAY_MS = 24 * 60 * 60 * 1000;

  function createId() {
    return root.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseDate(value) {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function toDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function createSampleFeatures(today = new Date()) {
    const date = days => toDateInput(addDays(today, days));
    return [
      {
        id: createId(),
        name: 'Mobile onboarding refresh',
        description: 'Reduce time-to-value with guided setup, clearer milestones, and contextual tips.',
        owner: 'Maya Chen',
        priority: 'High',
        status: 'In Progress',
        startDate: date(-35),
        releaseDate: date(28)
      },
      {
        id: createId(),
        name: 'Customer feedback hub',
        description: 'Bring interview notes, survey themes, and feature requests into one searchable workspace.',
        owner: 'Noah Williams',
        priority: 'High',
        status: 'Planned',
        startDate: date(20),
        releaseDate: date(105)
      },
      {
        id: createId(),
        name: 'Analytics workspace',
        description: 'Help teams build and share focused product dashboards without analyst support.',
        owner: 'Priya Shah',
        priority: 'Medium',
        status: 'In Progress',
        startDate: date(-58),
        releaseDate: date(52)
      },
      {
        id: createId(),
        name: 'AI release notes assistant',
        description: 'Turn shipped work into concise, audience-specific release communications.',
        owner: 'Leo Martin',
        priority: 'Medium',
        status: 'Planned',
        startDate: date(48),
        releaseDate: date(142)
      },
      {
        id: createId(),
        name: 'Team permissions',
        description: 'Give workspace admins clear role controls and safer access management.',
        owner: 'Priya Shah',
        priority: 'High',
        status: 'Launched',
        startDate: date(-145),
        releaseDate: date(-32)
      },
      {
        id: createId(),
        name: 'CSV export improvements',
        description: 'Make exports faster, configurable, and easier to use in downstream reporting.',
        owner: 'Noah Williams',
        priority: 'Low',
        status: 'Launched',
        startDate: date(-118),
        releaseDate: date(-51)
      }
    ];
  }

  function normalizeFeature(input) {
    return {
      id: input.id || createId(),
      name: String(input.name || '').trim(),
      description: String(input.description || '').trim(),
      owner: String(input.owner || '').trim(),
      priority: PRIORITIES.includes(input.priority) ? input.priority : 'Medium',
      status: STATUSES.includes(input.status) ? input.status : 'Planned',
      startDate: String(input.startDate || ''),
      releaseDate: String(input.releaseDate || '')
    };
  }

  function validateFeature(input) {
    const feature = normalizeFeature(input);
    const hasFields = feature.name && feature.description && feature.owner && feature.startDate && feature.releaseDate;
    const hasValidDates = /^\d{4}-\d{2}-\d{2}$/.test(feature.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(feature.releaseDate) &&
      parseDate(feature.releaseDate) >= parseDate(feature.startDate);
    return Boolean(hasFields && hasValidDates);
  }

  function createRoadmapStore(storage, seedFeatures = []) {
    let features;
    try {
      const saved = storage.getItem(STORAGE_KEY);
      if (saved === null) {
        features = seedFeatures.map(normalizeFeature).filter(validateFeature);
      } else {
        const parsed = JSON.parse(saved);
        features = Array.isArray(parsed) ? parsed.map(normalizeFeature).filter(validateFeature) : [];
      }
    } catch {
      features = seedFeatures.map(normalizeFeature).filter(validateFeature);
    }

    function persist() {
      storage.setItem(STORAGE_KEY, JSON.stringify(features));
    }

    if (storage.getItem(STORAGE_KEY) === null) persist();

    return {
      getAll() {
        return features.map(feature => ({ ...feature }));
      },
      add(input) {
        const feature = normalizeFeature(input);
        if (!validateFeature(feature)) throw new Error('Invalid feature');
        features.push(feature);
        persist();
        return { ...feature };
      },
      update(id, changes) {
        const index = features.findIndex(feature => feature.id === id);
        if (index < 0) throw new Error('Feature not found');
        const updated = normalizeFeature({ ...features[index], ...changes, id });
        if (!validateFeature(updated)) throw new Error('Invalid feature');
        features[index] = updated;
        persist();
        return { ...updated };
      },
      remove(id) {
        const before = features.length;
        features = features.filter(feature => feature.id !== id);
        if (features.length !== before) persist();
        return features.length !== before;
      },
      move(id, status) {
        if (!STATUSES.includes(status)) throw new Error('Invalid status');
        return this.update(id, { status });
      },
      replaceAll(nextFeatures) {
        features = nextFeatures.map(normalizeFeature).filter(validateFeature);
        persist();
        return this.getAll();
      }
    };
  }

  function filterAndSortFeatures(features, filters = {}, today = new Date()) {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const search = String(filters.search || '').trim().toLowerCase();
    const filtered = features.filter(feature => {
      const matchesSearch = !search || [feature.name, feature.description, feature.owner]
        .some(value => value.toLowerCase().includes(search));
      const matchesPriority = !filters.priority || filters.priority === 'all' || feature.priority === filters.priority;
      const matchesStatus = !filters.status || filters.status === 'all' || feature.status === filters.status;
      const matchesOwner = !filters.owner || filters.owner === 'all' || feature.owner === filters.owner;
      const release = parseDate(feature.releaseDate);
      const daysUntilRelease = Math.ceil((release - todayStart) / DAY_MS);
      let matchesRelease = true;
      if (filters.release === 'overdue') matchesRelease = daysUntilRelease < 0 && feature.status !== 'Launched';
      if (filters.release === 'next30') matchesRelease = daysUntilRelease >= 0 && daysUntilRelease <= 30;
      if (filters.release === 'next90') matchesRelease = daysUntilRelease >= 0 && daysUntilRelease <= 90;
      if (filters.release === 'later') matchesRelease = daysUntilRelease > 90;
      return matchesSearch && matchesPriority && matchesStatus && matchesOwner && matchesRelease;
    });

    const sort = filters.sort || 'release-asc';
    return filtered.sort((a, b) => {
      if (sort === 'priority-desc') {
        return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || parseDate(a.releaseDate) - parseDate(b.releaseDate);
      }
      if (sort === 'start-asc') return parseDate(a.startDate) - parseDate(b.startDate);
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      return parseDate(a.releaseDate) - parseDate(b.releaseDate);
    });
  }

  function getDashboardMetrics(features, today = new Date()) {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const completed = features.filter(feature => feature.status === 'Launched').length;
    const upcoming = features.filter(feature => {
      const days = Math.ceil((parseDate(feature.releaseDate) - todayStart) / DAY_MS);
      return feature.status !== 'Launched' && days >= 0 && days <= 60;
    }).length;
    return {
      total: features.length,
      completed,
      upcoming,
      progress: features.length ? Math.round((completed / features.length) * 100) : 0
    };
  }

  function periodKey(date, scale) {
    if (scale === 'quarter') return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function getTimelinePeriods(features, scale = 'month') {
    if (!features.length) return [];
    let start = features.reduce((earliest, feature) => Math.min(earliest, parseDate(feature.startDate).getTime()), Infinity);
    let end = features.reduce((latest, feature) => Math.max(latest, parseDate(feature.releaseDate).getTime()), -Infinity);
    const cursor = new Date(start);
    cursor.setDate(1);
    if (scale === 'quarter') cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3);
    const endDate = new Date(end);
    const periods = [];

    while (cursor <= endDate) {
      periods.push({
        key: periodKey(cursor, scale),
        label: scale === 'quarter'
          ? `Q${Math.floor(cursor.getMonth() / 3) + 1} ${cursor.getFullYear()}`
          : cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      });
      cursor.setMonth(cursor.getMonth() + (scale === 'quarter' ? 3 : 1));
    }
    return periods;
  }

  const RoadmapCore = {
    STORAGE_KEY,
    STATUSES,
    PRIORITIES,
    createSampleFeatures,
    createRoadmapStore,
    filterAndSortFeatures,
    getDashboardMetrics,
    getTimelinePeriods,
    periodKey,
    parseDate,
    toDateInput,
    validateFeature
  };

  if (typeof module === 'object' && module.exports) module.exports = RoadmapCore;
  root.RoadmapCore = RoadmapCore;

  if (typeof document === 'undefined') return;

  const elements = {
    addFeatureButton: document.querySelector('#addFeatureButton'),
    resetDataButton: document.querySelector('#resetDataButton'),
    totalFeatures: document.querySelector('#totalFeatures'),
    completedFeatures: document.querySelector('#completedFeatures'),
    upcomingReleases: document.querySelector('#upcomingReleases'),
    progressValue: document.querySelector('#progressValue'),
    progressRing: document.querySelector('#progressRing'),
    progressRingValue: document.querySelector('#progressRingValue'),
    searchInput: document.querySelector('#searchInput'),
    priorityFilter: document.querySelector('#priorityFilter'),
    statusFilter: document.querySelector('#statusFilter'),
    ownerFilter: document.querySelector('#ownerFilter'),
    releaseFilter: document.querySelector('#releaseFilter'),
    sortSelect: document.querySelector('#sortSelect'),
    resultsSummary: document.querySelector('#resultsSummary'),
    clearFiltersButton: document.querySelector('#clearFiltersButton'),
    emptyClearButton: document.querySelector('#emptyClearButton'),
    kanbanView: document.querySelector('#kanbanView'),
    timelineView: document.querySelector('#timelineView'),
    timelineContent: document.querySelector('#timelineContent'),
    timelineControls: document.querySelector('#timelineControls'),
    emptyResults: document.querySelector('#emptyResults'),
    featureDialog: document.querySelector('#featureDialog'),
    featureForm: document.querySelector('#featureForm'),
    featureId: document.querySelector('#featureId'),
    featureName: document.querySelector('#featureName'),
    featureDescription: document.querySelector('#featureDescription'),
    featureOwner: document.querySelector('#featureOwner'),
    featurePriority: document.querySelector('#featurePriority'),
    featureStatus: document.querySelector('#featureStatus'),
    featureStartDate: document.querySelector('#featureStartDate'),
    featureReleaseDate: document.querySelector('#featureReleaseDate'),
    descriptionCount: document.querySelector('#descriptionCount'),
    dialogKicker: document.querySelector('#dialogKicker'),
    dialogTitle: document.querySelector('#dialogTitle'),
    closeDialogButton: document.querySelector('#closeDialogButton'),
    cancelButton: document.querySelector('#cancelButton'),
    saveFeatureButton: document.querySelector('#saveFeatureButton'),
    deleteFeatureButton: document.querySelector('#deleteFeatureButton'),
    dateError: document.querySelector('#dateError'),
    toast: document.querySelector('#toast')
  };

  const lists = {
    Planned: document.querySelector('#plannedList'),
    'In Progress': document.querySelector('#inProgressList'),
    Launched: document.querySelector('#launchedList')
  };
  const counts = {
    Planned: document.querySelector('#plannedCount'),
    'In Progress': document.querySelector('#inProgressCount'),
    Launched: document.querySelector('#launchedCount')
  };

  const store = createRoadmapStore(localStorage, createSampleFeatures());
  let activeView = localStorage.getItem(VIEW_KEY) === 'timeline' ? 'timeline' : 'kanban';
  let timelineScale = 'month';
  let toastTimer;

  function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    return parseDate(value).toLocaleDateString(undefined, options);
  }

  function getFilters() {
    return {
      search: elements.searchInput.value,
      priority: elements.priorityFilter.value,
      status: elements.statusFilter.value,
      owner: elements.ownerFilter.value,
      release: elements.releaseFilter.value,
      sort: elements.sortSelect.value
    };
  }

  function hasActiveFilters() {
    const filters = getFilters();
    return Boolean(filters.search.trim()) || [filters.priority, filters.status, filters.owner, filters.release].some(value => value !== 'all');
  }

  function ownerInitials(owner) {
    return owner.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  function ownerColor(owner) {
    const colors = ['#6754d9', '#4678d6', '#21916e', '#b87519', '#b8588d', '#457f8c'];
    const value = [...owner].reduce((total, character) => total + character.charCodeAt(0), 0);
    return colors[value % colors.length];
  }

  function isOverdue(feature) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return feature.status !== 'Launched' && parseDate(feature.releaseDate) < todayStart;
  }

  function updateOwnerFilter(features) {
    const current = elements.ownerFilter.value;
    const owners = [...new Set(features.map(feature => feature.owner))].sort((a, b) => a.localeCompare(b));
    elements.ownerFilter.replaceChildren(new Option('All owners', 'all'));
    owners.forEach(owner => elements.ownerFilter.add(new Option(owner, owner)));
    elements.ownerFilter.value = owners.includes(current) ? current : 'all';
  }

  function renderDashboard(features) {
    const metrics = getDashboardMetrics(features);
    elements.totalFeatures.textContent = metrics.total;
    elements.completedFeatures.textContent = metrics.completed;
    elements.upcomingReleases.textContent = metrics.upcoming;
    elements.progressValue.textContent = `${metrics.progress}%`;
    elements.progressRingValue.textContent = `${metrics.progress}%`;
    elements.progressRing.style.setProperty('--progress', `${metrics.progress * 3.6}deg`);
  }

  function makeButton(label, symbol, handler, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card-action ${extraClass}`.trim();
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = symbol;
    button.addEventListener('click', event => {
      event.stopPropagation();
      handler();
    });
    return button;
  }

  function createFeatureCard(feature) {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.draggable = true;
    card.dataset.id = feature.id;

    const top = document.createElement('div');
    top.className = 'card-topline';
    const priority = document.createElement('span');
    priority.className = `priority-badge ${feature.priority.toLowerCase()}`;
    priority.textContent = feature.priority;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      makeButton(`Edit ${feature.name}`, '✎', () => openFeatureDialog(feature)),
      makeButton(`Delete ${feature.name}`, '×', () => deleteFeature(feature.id), 'delete')
    );
    top.append(priority, actions);

    const title = document.createElement('h4');
    title.textContent = feature.name;
    const description = document.createElement('p');
    description.textContent = feature.description;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const owner = document.createElement('div');
    owner.className = 'owner';
    const avatar = document.createElement('span');
    avatar.className = 'owner-avatar';
    avatar.style.setProperty('--avatar', ownerColor(feature.owner));
    avatar.textContent = ownerInitials(feature.owner);
    const ownerName = document.createElement('span');
    ownerName.className = 'owner-name';
    ownerName.textContent = feature.owner;
    owner.append(avatar, ownerName);
    const release = document.createElement('span');
    release.className = `release-date${isOverdue(feature) ? ' overdue' : ''}`;
    release.textContent = isOverdue(feature) ? `Overdue · ${formatDate(feature.releaseDate, { month: 'short', day: 'numeric' })}` : formatDate(feature.releaseDate, { month: 'short', day: 'numeric' });
    meta.append(owner, release);

    const mover = document.createElement('select');
    mover.className = 'status-mover';
    mover.setAttribute('aria-label', `Move ${feature.name} to another status`);
    STATUSES.forEach(status => mover.add(new Option(`Move to ${status}`, status, false, status === feature.status)));
    mover.addEventListener('click', event => event.stopPropagation());
    mover.addEventListener('change', () => moveFeature(feature.id, mover.value));

    card.append(top, title, description, meta, mover);
    card.addEventListener('dblclick', () => openFeatureDialog(feature));
    card.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', feature.id);
      event.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    return card;
  }

  function renderKanban(features) {
    STATUSES.forEach(status => {
      const items = features.filter(feature => feature.status === status);
      lists[status].replaceChildren();
      counts[status].textContent = items.length;
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'column-empty';
        empty.textContent = 'Drop a feature here';
        lists[status].append(empty);
      } else {
        items.forEach(feature => lists[status].append(createFeatureCard(feature)));
      }
    });
  }

  function renderTimeline(features) {
    elements.timelineContent.replaceChildren();
    if (!features.length) return;
    const periods = getTimelinePeriods(features, timelineScale);
    const width = timelineScale === 'quarter' ? 170 : 120;
    const board = document.createElement('div');
    board.className = 'timeline-board';
    board.style.setProperty('--period-count', periods.length);
    board.style.setProperty('--period-width', `${width}px`);

    const header = document.createElement('div');
    header.className = 'timeline-header';
    const featureHeading = document.createElement('div');
    featureHeading.className = 'timeline-feature-heading';
    featureHeading.textContent = 'Feature';
    const periodGrid = document.createElement('div');
    periodGrid.className = 'period-grid';
    periods.forEach(period => {
      const cell = document.createElement('div');
      cell.className = 'period-cell';
      cell.textContent = period.label;
      periodGrid.append(cell);
    });
    header.append(featureHeading, periodGrid);
    board.append(header);

    features.forEach(feature => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      const info = document.createElement('div');
      info.className = 'timeline-feature';
      const name = document.createElement('strong');
      name.textContent = feature.name;
      name.title = feature.name;
      const details = document.createElement('span');
      details.textContent = `${feature.owner} · ${feature.priority}`;
      info.append(name, details);

      const track = document.createElement('div');
      track.className = 'bar-grid';
      const startIndex = periods.findIndex(period => period.key === periodKey(parseDate(feature.startDate), timelineScale));
      const endIndex = periods.findIndex(period => period.key === periodKey(parseDate(feature.releaseDate), timelineScale));
      const bar = document.createElement('div');
      bar.className = `timeline-bar ${feature.status.toLowerCase().replace(' ', '-')}`;
      bar.style.gridColumn = `${startIndex + 1} / ${endIndex + 2}`;
      bar.title = `${feature.name}: ${formatDate(feature.startDate)} – ${formatDate(feature.releaseDate)}`;
      bar.textContent = feature.status;
      track.append(bar);
      row.append(info, track);
      board.append(row);
    });
    elements.timelineContent.append(board);
  }

  function render() {
    const allFeatures = store.getAll();
    updateOwnerFilter(allFeatures);
    const visibleFeatures = filterAndSortFeatures(allFeatures, getFilters());
    renderDashboard(allFeatures);
    renderKanban(visibleFeatures);
    renderTimeline(visibleFeatures);

    const filtersOn = hasActiveFilters();
    elements.resultsSummary.textContent = filtersOn
      ? `Showing ${visibleFeatures.length} of ${allFeatures.length} features`
      : `Showing all ${allFeatures.length} features`;
    elements.clearFiltersButton.classList.toggle('hidden', !filtersOn);

    const hasResults = visibleFeatures.length > 0;
    elements.emptyResults.classList.toggle('hidden', hasResults);
    elements.kanbanView.classList.toggle('hidden', !hasResults || activeView !== 'kanban');
    elements.timelineView.classList.toggle('hidden', !hasResults || activeView !== 'timeline');
    elements.timelineControls.classList.toggle('hidden', activeView !== 'timeline' || !hasResults);

    document.querySelectorAll('[data-view]').forEach(button => {
      const selected = button.dataset.view === activeView;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function clearFilters() {
    elements.searchInput.value = '';
    elements.priorityFilter.value = 'all';
    elements.statusFilter.value = 'all';
    elements.ownerFilter.value = 'all';
    elements.releaseFilter.value = 'all';
    elements.sortSelect.value = 'release-asc';
    render();
  }

  function formValues() {
    return {
      name: elements.featureName.value,
      description: elements.featureDescription.value,
      owner: elements.featureOwner.value,
      priority: elements.featurePriority.value,
      status: elements.featureStatus.value,
      startDate: elements.featureStartDate.value,
      releaseDate: elements.featureReleaseDate.value
    };
  }

  function openFeatureDialog(feature = null) {
    elements.featureForm.reset();
    elements.dateError.classList.add('hidden');
    elements.featureId.value = feature?.id || '';
    elements.dialogKicker.textContent = feature ? 'Edit roadmap item' : 'New roadmap item';
    elements.dialogTitle.textContent = feature ? 'Edit feature' : 'Add a feature';
    elements.saveFeatureButton.textContent = feature ? 'Save changes' : 'Add feature';
    elements.deleteFeatureButton.classList.toggle('hidden', !feature);

    if (feature) {
      elements.featureName.value = feature.name;
      elements.featureDescription.value = feature.description;
      elements.featureOwner.value = feature.owner;
      elements.featurePriority.value = feature.priority;
      elements.featureStatus.value = feature.status;
      elements.featureStartDate.value = feature.startDate;
      elements.featureReleaseDate.value = feature.releaseDate;
    } else {
      const today = new Date();
      elements.featureStartDate.value = toDateInput(today);
      elements.featureReleaseDate.value = toDateInput(addDays(today, 30));
      elements.featurePriority.value = 'Medium';
      elements.featureStatus.value = 'Planned';
    }
    elements.featureReleaseDate.min = elements.featureStartDate.value;
    elements.descriptionCount.textContent = elements.featureDescription.value.length;
    elements.featureDialog.showModal();
    elements.featureName.focus();
  }

  function closeFeatureDialog() {
    elements.featureDialog.close();
  }

  function deleteFeature(id) {
    const feature = store.getAll().find(item => item.id === id);
    if (!feature || !root.confirm(`Delete “${feature.name}” from the roadmap?`)) return;
    store.remove(id);
    if (elements.featureDialog.open) closeFeatureDialog();
    render();
    showToast('Feature deleted');
  }

  function moveFeature(id, status) {
    const feature = store.getAll().find(item => item.id === id);
    if (!feature || feature.status === status) return;
    store.move(id, status);
    render();
    showToast(`Moved to ${status}`);
  }

  function showToast(message) {
    root.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    toastTimer = root.setTimeout(() => elements.toast.classList.remove('show'), 2200);
  }

  elements.addFeatureButton.addEventListener('click', () => openFeatureDialog());
  elements.closeDialogButton.addEventListener('click', closeFeatureDialog);
  elements.cancelButton.addEventListener('click', closeFeatureDialog);
  elements.featureDescription.addEventListener('input', () => {
    elements.descriptionCount.textContent = elements.featureDescription.value.length;
  });
  elements.featureStartDate.addEventListener('change', () => {
    elements.featureReleaseDate.min = elements.featureStartDate.value;
    elements.dateError.classList.add('hidden');
  });

  elements.featureForm.addEventListener('submit', event => {
    event.preventDefault();
    const values = formValues();
    if (parseDate(values.releaseDate) < parseDate(values.startDate)) {
      elements.dateError.classList.remove('hidden');
      elements.featureReleaseDate.focus();
      return;
    }
    if (!elements.featureForm.reportValidity() || !validateFeature(values)) return;

    const id = elements.featureId.value;
    if (id) {
      store.update(id, values);
      showToast('Feature updated');
    } else {
      store.add(values);
      showToast('Feature added');
    }
    closeFeatureDialog();
    render();
  });

  elements.deleteFeatureButton.addEventListener('click', () => deleteFeature(elements.featureId.value));
  elements.resetDataButton.addEventListener('click', () => {
    if (!root.confirm('Replace your current roadmap with the sample roadmap?')) return;
    store.replaceAll(createSampleFeatures());
    clearFilters();
    showToast('Sample roadmap restored');
  });

  [elements.searchInput, elements.priorityFilter, elements.statusFilter, elements.ownerFilter, elements.releaseFilter, elements.sortSelect]
    .forEach(control => control.addEventListener(control === elements.searchInput ? 'input' : 'change', render));
  elements.clearFiltersButton.addEventListener('click', clearFilters);
  elements.emptyClearButton.addEventListener('click', clearFilters);

  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    activeView = button.dataset.view;
    localStorage.setItem(VIEW_KEY, activeView);
    render();
  }));

  document.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click', () => {
    timelineScale = button.dataset.scale;
    document.querySelectorAll('[data-scale]').forEach(scaleButton => {
      const selected = scaleButton.dataset.scale === timelineScale;
      scaleButton.classList.toggle('active', selected);
      scaleButton.setAttribute('aria-pressed', String(selected));
    });
    render();
  }));

  Object.entries(lists).forEach(([status, list]) => {
    list.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', event => {
      if (!list.contains(event.relatedTarget)) list.classList.remove('drag-over');
    });
    list.addEventListener('drop', event => {
      event.preventDefault();
      list.classList.remove('drag-over');
      moveFeature(event.dataTransfer.getData('text/plain'), status);
    });
  });

  elements.featureDialog.addEventListener('click', event => {
    const bounds = elements.featureDialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closeFeatureDialog();
  });

  render();
})(typeof window !== 'undefined' ? window : globalThis);
