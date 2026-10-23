(() => {
  'use strict';

  const provider = window.PRDGenerator.TemplatePRDProvider;
  const repository = window.PRDStorage.createDraftRepository(localStorage);
  const SAMPLE_INPUT = {
    name: 'FocusFlow',
    idea: 'A guided weekly planning workspace that helps independent professionals turn goals into a realistic, focused schedule.',
    problem: 'Independent professionals lose focus and spend too much time reorganizing work because priorities are spread across notes, calendars, messages, and complex task tools.',
    users: 'Independent consultants\nFreelance designers\nSmall agency owners',
    goals: 'Increase weekly planning completion\nReduce time spent reorganizing tasks\nImprove confidence that the highest-value work is scheduled',
    painPoints: 'Priorities are fragmented across tools\nPlans become outdated as client work changes\nExisting planning tools require too much setup\nUsers overcommit because capacity is unclear',
    solution: 'A lightweight weekly planning flow that captures outcomes, available capacity, and commitments, then creates a focused plan users can revise as work changes.',
    constraints: 'Browser-based MVP\nNo calendar integration in the first release\nMust work well on mobile\nValidate willingness to change existing planning habits'
  };

  const elements = {
    ideaForm: document.querySelector('#ideaForm'), productName: document.querySelector('#productName'), productIdea: document.querySelector('#productIdea'),
    problemStatement: document.querySelector('#problemStatement'), targetUsers: document.querySelector('#targetUsers'), businessGoals: document.querySelector('#businessGoals'),
    painPoints: document.querySelector('#painPoints'), proposedSolution: document.querySelector('#proposedSolution'), constraints: document.querySelector('#constraints'),
    generateButton: document.querySelector('#generateButton'), sampleButton: document.querySelector('#sampleButton'), emptySampleButton: document.querySelector('#emptySampleButton'),
    newPrdButton: document.querySelector('#newPrdButton'), emptyState: document.querySelector('#emptyState'), loadingState: document.querySelector('#loadingState'),
    errorState: document.querySelector('#errorState'), errorMessage: document.querySelector('#errorMessage'), retryButton: document.querySelector('#retryButton'),
    prdDocument: document.querySelector('#prdDocument'), prdTitle: document.querySelector('#prdTitle'), prdMeta: document.querySelector('#prdMeta'),
    sectionsContainer: document.querySelector('#sectionsContainer'), documentScroll: document.querySelector('#documentScroll'), saveButton: document.querySelector('#saveButton'),
    markdownButton: document.querySelector('#markdownButton'), printButton: document.querySelector('#printButton'), saveStatus: document.querySelector('#saveStatus'),
    draftsButton: document.querySelector('#draftsButton'), draftCount: document.querySelector('#draftCount'), draftsDialog: document.querySelector('#draftsDialog'),
    closeDraftsButton: document.querySelector('#closeDraftsButton'), draftList: document.querySelector('#draftList'), toast: document.querySelector('#toast')
  };

  let currentDocument = null;
  let generationTimer;
  let saveTimer;
  let toastTimer;
  let dirty = false;

  function getInput() {
    return { name: elements.productName.value, idea: elements.productIdea.value, problem: elements.problemStatement.value, users: elements.targetUsers.value,
      goals: elements.businessGoals.value, painPoints: elements.painPoints.value, solution: elements.proposedSolution.value, constraints: elements.constraints.value };
  }

  function setInput(input) {
    elements.productName.value = input.name || ''; elements.productIdea.value = input.idea || ''; elements.problemStatement.value = input.problem || '';
    elements.targetUsers.value = input.users || ''; elements.businessGoals.value = input.goals || ''; elements.painPoints.value = input.painPoints || '';
    elements.proposedSolution.value = input.solution || ''; elements.constraints.value = input.constraints || ''; clearValidation();
  }

  function clearValidation() {
    elements.ideaForm.querySelectorAll('.invalid').forEach(field => field.classList.remove('invalid'));
    elements.ideaForm.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
  }

  function validateForm() {
    clearValidation();
    const fields = [elements.productName, elements.productIdea, elements.problemStatement, elements.targetUsers, elements.businessGoals, elements.painPoints, elements.constraints];
    let firstInvalid = null;
    fields.forEach(field => {
      if (field.value.trim().length < 3) {
        field.classList.add('invalid');
        const error = field.parentElement.querySelector('.field-error');
        if (error) error.textContent = 'Add at least 3 characters.';
        if (!firstInvalid) firstInvalid = field;
      }
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function showState(state) {
    elements.emptyState.classList.toggle('hidden', state !== 'empty'); elements.loadingState.classList.toggle('hidden', state !== 'loading');
    elements.errorState.classList.toggle('hidden', state !== 'error'); elements.prdDocument.classList.toggle('hidden', state !== 'document');
  }

  function setDocumentActions(enabled) {
    [elements.saveButton, elements.markdownButton, elements.printButton].forEach(button => { button.disabled = !enabled; });
  }

  function autoSize(textarea) {
    textarea.style.height = 'auto'; textarea.style.height = `${Math.max(120, textarea.scrollHeight + 2)}px`;
  }

  function createSection(section, index) {
    const wrapper = document.createElement('section'); wrapper.className = 'prd-section'; wrapper.dataset.sectionId = section.id;
    const top = document.createElement('div'); top.className = 'section-topline';
    const heading = document.createElement('div'); const number = document.createElement('span'); number.className = 'section-number';
    number.textContent = `Section ${String(index + 1).padStart(2, '0')}`; const title = document.createElement('h3'); title.textContent = section.title; heading.append(number, title);
    const tools = document.createElement('div'); tools.className = 'section-tools'; const source = document.createElement('span');
    source.className = `source-badge ${section.source}`; source.textContent = section.sourceLabel;
    const regenerate = document.createElement('button'); regenerate.type = 'button'; regenerate.className = 'regenerate-button';
    regenerate.innerHTML = '<span aria-hidden="true">↻</span> Regenerate template'; regenerate.setAttribute('aria-label', `Regenerate ${section.title}`);
    regenerate.addEventListener('click', () => regenerateSection(section.id, regenerate)); tools.append(source, regenerate); top.append(heading, tools);
    const editor = document.createElement('textarea'); editor.className = 'section-editor'; editor.value = section.content; editor.setAttribute('aria-label', `Edit ${section.title}`);
    editor.addEventListener('input', () => {
      const target = currentDocument.sections.find(item => item.id === section.id); if (target) target.content = editor.value;
      currentDocument.updatedAt = new Date().toISOString(); dirty = true; elements.saveStatus.textContent = 'Unsaved changes';
      elements.saveStatus.classList.remove('saved'); autoSize(editor); scheduleAutosave();
    });
    const hint = document.createElement('small'); hint.className = 'section-hint'; hint.textContent = 'Editable · Review suggestions before sharing';
    wrapper.append(top, editor, hint); requestAnimationFrame(() => autoSize(editor)); return wrapper;
  }

  function renderDocument() {
    if (!currentDocument) { showState('empty'); setDocumentActions(false); return; }
    elements.prdTitle.textContent = currentDocument.title;
    elements.prdMeta.textContent = `Draft · Updated ${new Date(currentDocument.updatedAt).toLocaleString()} · ${currentDocument.generator}`;
    elements.sectionsContainer.replaceChildren();
    currentDocument.sections.forEach((section, index) => elements.sectionsContainer.append(createSection(section, index)));
    showState('document'); setDocumentActions(true);
  }

  function generateDocument() {
    if (!validateForm()) return;
    window.clearTimeout(generationTimer); showState('loading'); setDocumentActions(false); elements.generateButton.disabled = true;
    elements.generateButton.querySelector('.button-label').textContent = 'Structuring PRD…';
    generationTimer = window.setTimeout(() => {
      try {
        currentDocument = provider.generate(getInput()); dirty = true; renderDocument(); saveCurrentDraft(false);
        elements.documentScroll.scrollTo({ top: 0, behavior: 'smooth' }); showToast('Template PRD generated');
      } catch (error) { elements.errorMessage.textContent = error.message || 'Check the form and try again.'; showState('error'); }
      finally { elements.generateButton.disabled = false; elements.generateButton.querySelector('.button-label').textContent = 'Generate template PRD'; }
    }, 550);
  }

  function regenerateSection(sectionId, button) {
    if (!currentDocument) return;
    button.disabled = true; button.classList.add('spinning');
    window.setTimeout(() => {
      try {
        currentDocument = provider.regenerateSection(currentDocument, sectionId); dirty = true; renderDocument(); scheduleAutosave();
        elements.sectionsContainer.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Section template refreshed');
      } catch (error) { showToast(error.message || 'Could not regenerate section'); }
    }, 300);
  }

  function scheduleAutosave() { window.clearTimeout(saveTimer); saveTimer = window.setTimeout(() => saveCurrentDraft(false), 700); }

  function saveCurrentDraft(showConfirmation = true) {
    if (!currentDocument) return;
    try {
      currentDocument = repository.save(currentDocument); dirty = false;
      elements.saveStatus.textContent = `Saved locally · ${new Date(currentDocument.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      elements.saveStatus.classList.add('saved'); updateDraftCount(); if (showConfirmation) showToast('Draft saved in this browser');
    } catch (error) { elements.saveStatus.textContent = 'Could not save locally'; elements.saveStatus.classList.remove('saved'); if (showConfirmation) showToast(error.message || 'Draft save failed'); }
  }

  function fillSample(generateAfter = false) {
    setInput(SAMPLE_INPUT); elements.productName.focus(); showToast('Fictional sample loaded'); if (generateAfter) generateDocument();
  }

  function startNewDocument() {
    if (dirty && !window.confirm('Start a new PRD and discard unsaved changes?')) return;
    window.clearTimeout(generationTimer); window.clearTimeout(saveTimer); currentDocument = null; dirty = false; elements.ideaForm.reset(); clearValidation();
    elements.saveStatus.textContent = 'No draft open'; elements.saveStatus.classList.remove('saved'); renderDocument(); elements.productName.focus();
  }

  function downloadMarkdown() {
    if (!currentDocument) return;
    const markdown = window.PRDGenerator.toMarkdown(currentDocument); const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
    link.download = `${currentDocument.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prd'}.md`;
    link.click(); URL.revokeObjectURL(url); showToast('Markdown downloaded');
  }

  function createDraftItem(draft) {
    const item = document.createElement('article'); item.className = 'draft-item'; const icon = document.createElement('span'); icon.className = 'draft-icon'; icon.textContent = '▤';
    const info = document.createElement('div'); info.className = 'draft-info'; const title = document.createElement('strong'); title.textContent = draft.title;
    const date = document.createElement('span'); date.textContent = `Updated ${new Date(draft.updatedAt).toLocaleString()}`; info.append(title, date);
    const actions = document.createElement('div'); actions.className = 'draft-actions';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'icon-button'; open.title = `Open ${draft.title}`; open.setAttribute('aria-label', `Open ${draft.title}`); open.textContent = '↗'; open.addEventListener('click', () => openDraft(draft.id));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button delete'; remove.title = `Delete ${draft.title}`; remove.setAttribute('aria-label', `Delete ${draft.title}`); remove.textContent = '×'; remove.addEventListener('click', () => deleteDraft(draft.id, draft.title));
    actions.append(open, remove); item.append(icon, info, actions); return item;
  }

  function renderDrafts() {
    const drafts = repository.list(); elements.draftList.replaceChildren();
    if (!drafts.length) { const empty = document.createElement('div'); empty.className = 'draft-empty'; empty.textContent = 'No saved PRDs yet. Generate a PRD to create your first local draft.'; elements.draftList.append(empty); }
    else drafts.forEach(draft => elements.draftList.append(createDraftItem(draft)));
  }

  function openDraft(id) {
    const draft = repository.get(id); if (!draft) { showToast('Draft could not be found'); return; }
    currentDocument = draft; dirty = false; setInput(draft.input); renderDocument();
    elements.saveStatus.textContent = `Opened local draft · ${new Date(draft.updatedAt).toLocaleString()}`; elements.saveStatus.classList.add('saved');
    elements.draftsDialog.close(); elements.documentScroll.scrollTo({ top: 0 }); showToast('Draft opened');
  }

  function deleteDraft(id, title) {
    if (!window.confirm(`Delete the saved draft “${title}”?`)) return;
    repository.remove(id); if (currentDocument?.id === id) { elements.saveStatus.textContent = 'Open document is no longer saved'; elements.saveStatus.classList.remove('saved'); dirty = true; }
    renderDrafts(); updateDraftCount(); showToast('Draft deleted');
  }

  function updateDraftCount() { elements.draftCount.textContent = repository.list().length; }
  function showToast(message) { window.clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('show'); toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2200); }

  elements.ideaForm.addEventListener('submit', event => { event.preventDefault(); generateDocument(); });
  elements.ideaForm.addEventListener('input', event => { event.target.classList.remove('invalid'); const error = event.target.parentElement.querySelector('.field-error'); if (error) error.textContent = ''; });
  elements.sampleButton.addEventListener('click', () => fillSample(false)); elements.emptySampleButton.addEventListener('click', () => fillSample(true));
  elements.retryButton.addEventListener('click', generateDocument); elements.newPrdButton.addEventListener('click', startNewDocument);
  elements.saveButton.addEventListener('click', () => saveCurrentDraft(true)); elements.markdownButton.addEventListener('click', downloadMarkdown);
  elements.printButton.addEventListener('click', () => { if (currentDocument) { saveCurrentDraft(false); window.print(); } });
  elements.draftsButton.addEventListener('click', () => { renderDrafts(); elements.draftsDialog.showModal(); });
  elements.closeDraftsButton.addEventListener('click', () => elements.draftsDialog.close());
  elements.draftsDialog.addEventListener('click', event => {
    const bounds = elements.draftsDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) elements.draftsDialog.close();
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  updateDraftCount(); renderDocument();
})();
