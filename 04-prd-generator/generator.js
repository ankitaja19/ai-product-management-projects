(function (root) {
  'use strict';

  const SECTION_DEFINITIONS = [
    { id: 'overview', title: 'Product overview', source: 'mixed' },
    { id: 'problem', title: 'Problem statement', source: 'mixed' },
    { id: 'goals', title: 'Goals and non-goals', source: 'mixed' },
    { id: 'users', title: 'Target users and personas', source: 'mixed' },
    { id: 'pain-points', title: 'User pain points', source: 'user' },
    { id: 'solution', title: 'Proposed solution', source: 'mixed' },
    { id: 'requirements', title: 'Functional requirements', source: 'template' },
    { id: 'stories', title: 'User stories and acceptance criteria', source: 'template' },
    { id: 'non-functional', title: 'Non-functional requirements', source: 'template' },
    { id: 'scope', title: 'MVP scope and future enhancements', source: 'template' },
    { id: 'metrics', title: 'Success metrics and KPIs', source: 'template' },
    { id: 'risks', title: 'Dependencies, risks, and trade-offs', source: 'mixed' },
    { id: 'questions', title: 'Open questions', source: 'template' }
  ];

  const SOURCE_LABELS = {
    user: 'From your input',
    mixed: 'Input + template suggestions',
    template: 'Template suggestion — validate'
  };

  function createId() {
    return root.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sentence(value) {
    const text = clean(value);
    if (!text) return '';
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? '' : '.'}`;
  }

  function splitItems(value) {
    return String(value || '')
      .split(/\n|;|,(?=\s*[A-Za-z])/)
      .map(item => item.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);
  }

  function bulletList(items, fallback) {
    const values = items.length ? items : fallback;
    return values.map(item => `- ${sentence(item)}`).join('\n');
  }

  function truncate(value, length = 110) {
    const text = clean(value);
    return text.length <= length ? text : `${text.slice(0, length - 1).trim()}…`;
  }

  function normalizeInput(input) {
    return {
      name: clean(input.name),
      idea: clean(input.idea),
      problem: clean(input.problem),
      users: clean(input.users),
      goals: clean(input.goals),
      painPoints: clean(input.painPoints),
      solution: clean(input.solution),
      constraints: clean(input.constraints)
    };
  }

  function validateInput(input) {
    const normalized = normalizeInput(input);
    const required = ['name', 'idea', 'problem', 'users', 'goals', 'painPoints', 'constraints'];
    return {
      valid: required.every(field => normalized[field].length >= 3),
      missing: required.filter(field => normalized[field].length < 3),
      input: normalized
    };
  }

  function functionalRequirements(input, goals, painPoints, variant) {
    const requirements = [
      `The product must provide a clear entry point for ${input.users}.`,
      `The product must support the primary workflow described as: ${truncate(input.idea, 130)}.`,
      `The product must capture the minimum information needed to address: ${truncate(painPoints[0] || input.problem, 120)}.`,
      `The product must confirm successful completion and preserve the user's latest valid state.`,
      `The product must provide actionable validation and recovery messages when input is incomplete or invalid.`,
      `The product must allow users to review the outcome connected to: ${truncate(goals[0] || 'the primary business goal', 110)}.`
    ];
    if (variant % 3 === 1) requirements.push('The product should make the most common next action visible without requiring documentation.');
    if (variant % 3 === 2) requirements.push('The product should provide a lightweight way to revisit and revise a previous result.');
    return requirements.map((requirement, index) => `- **FR-${index + 1}:** ${requirement}`).join('\n');
  }

  function userStories(input, personas, goals, painPoints, variant) {
    const storyUsers = personas.slice(0, 3);
    const defaultGoal = goals[0] || `get value from ${input.name}`;
    const defaultPain = painPoints[0] || 'complete the core task efficiently';
    return storyUsers.map((persona, index) => {
      const goal = goals[index % Math.max(goals.length, 1)] || defaultGoal;
      const pain = painPoints[index % Math.max(painPoints.length, 1)] || defaultPain;
      const action = variant % 2 === 0
        ? `use ${input.name} to ${goal.toLowerCase()}`
        : `complete the core ${input.name} workflow with clear guidance`;
      return [
        `### US-${index + 1}: ${persona}`,
        `**Story:** As a ${persona}, I want to ${action}, so that I can make progress without ${pain.toLowerCase()}.`,
        '',
        '**Acceptance criteria**',
        `- Given I am a ${persona}, when I begin the core workflow, then I can understand the next action.`,
        '- Given I provide valid information, when I complete the workflow, then my result is saved and confirmed.',
        '- Given something prevents completion, when the issue occurs, then I receive a clear and actionable message.'
      ].join('\n');
    }).join('\n\n');
  }

  function buildSections(input, variant = 0) {
    const personas = splitItems(input.users);
    const goals = splitItems(input.goals);
    const painPoints = splitItems(input.painPoints);
    const constraints = splitItems(input.constraints);
    const primaryPersona = personas[0] || 'primary user';
    const solution = input.solution || `${input.name} will provide a focused workflow that helps ${primaryPersona} address the stated problem and reach the intended outcome.`;
    const variation = variant % 3;

    const content = {
      overview: [
        `**Product:** ${input.name}`,
        '',
        `**Concept:** ${sentence(input.idea)}`,
        '',
        `**Intended outcome:** Help ${primaryPersona} address ${truncate(input.problem, 150).toLowerCase()}.`,
        '',
        '> Validation note: The intended outcome is a template-generated interpretation of the supplied idea and should be confirmed with users and stakeholders.'
      ].join('\n'),
      problem: [
        sentence(input.problem),
        '',
        `This problem primarily affects ${personas.length ? personas.join(', ') : input.users}.`,
        '',
        '**Evidence to add before approval**',
        '- Baseline frequency and severity of the problem.',
        '- User research, behavioral data, or support evidence.',
        '- Current workaround and its measurable cost.'
      ].join('\n'),
      goals: [
        '**Goals supplied by the author**',
        bulletList(goals, ['Define the measurable outcome this product should achieve']),
        '',
        '**Suggested non-goals for the first release**',
        `- Replacing every adjacent workflow used by ${primaryPersona}.`,
        '- Supporting every edge case before validating the core journey.',
        `- Expanding beyond the stated constraints: ${truncate(constraints[0] || 'scope, time, and available resources', 110)}.`
      ].join('\n'),
      users: personas.map((persona, index) => [
        `### Persona ${index + 1}: ${persona}`,
        `- **Primary job:** Make progress on ${truncate(goals[index % Math.max(goals.length, 1)] || input.idea, 100).toLowerCase()}.`,
        `- **Current friction:** ${sentence(painPoints[index % Math.max(painPoints.length, 1)] || input.problem)}`,
        `- **Assumption to validate:** ${persona} has both the need and authority to use the proposed workflow.`
      ].join('\n')).join('\n\n'),
      'pain-points': [
        '**Pain points supplied by the author**',
        bulletList(painPoints, ['Add validated user pain points']),
        '',
        '> Research note: Prioritize these pain points by frequency, severity, and strategic relevance before committing scope.'
      ].join('\n'),
      solution: [
        sentence(solution),
        '',
        '**Suggested experience principles**',
        variation === 0 ? '- Make the primary action obvious and reduce avoidable decisions.' : '- Lead with the user outcome and reveal complexity only when needed.',
        '- Preserve context so users can safely pause, return, and revise.',
        '- Explain errors in plain language and provide a recovery path.',
        '',
        `**Constraints to respect:** ${constraints.length ? constraints.join('; ') : input.constraints}.`
      ].join('\n'),
      requirements: functionalRequirements(input, goals, painPoints, variant),
      stories: userStories(input, personas, goals, painPoints, variant),
      'non-functional': [
        '- **Performance:** Core interactions should acknowledge user actions immediately; measurable response-time targets must be agreed with engineering.',
        '- **Accessibility:** The primary journey should meet WCAG 2.2 AA expectations and support keyboard navigation.',
        '- **Reliability:** User input should not be lost after a recoverable interruption.',
        '- **Privacy:** Collect only data required for the stated outcome and define retention before launch.',
        '- **Security:** Complete threat assessment and access-control decisions before production release.',
        '- **Observability:** Define events for journey entry, completion, failure, and abandonment.'
      ].join('\n'),
      scope: [
        '**MVP — proposed**',
        `- Deliver the core workflow for ${primaryPersona}.`,
        `- Address the highest-priority pain point: ${sentence(painPoints[0] || input.problem)}`,
        '- Include input validation, success confirmation, and a recoverable error state.',
        '- Instrument the primary outcome and adoption funnel.',
        '',
        '**Future enhancements — candidates**',
        '- Personalization for additional personas and use cases.',
        '- Advanced collaboration, automation, and reporting.',
        '- Integrations with adjacent tools after the standalone workflow is validated.',
        '',
        '> Scope note: All items are template suggestions. Confirm feasibility, sequencing, and ownership with the delivery team.'
      ].join('\n'),
      metrics: [
        '**Primary outcome metric**',
        `- Progress toward: ${sentence(goals[0] || 'the main business goal')}`,
        '',
        '**Suggested leading indicators**',
        '- Activation: percentage of eligible users who begin the core workflow.',
        '- Completion: percentage who successfully reach the intended outcome.',
        '- Time to value: median time from entry to successful completion.',
        '- Quality: error, abandonment, and repeat-attempt rates.',
        '- Retention: percentage of users who return for the intended repeat behavior.',
        '',
        '**Guardrails**',
        '- User-reported effort or satisfaction does not materially decline.',
        '- Support contacts and critical failure rates remain within agreed thresholds.',
        '',
        '> Targets are intentionally unset. Establish baselines and agree target values before approval.'
      ].join('\n'),
      risks: [
        '**Known constraints and assumptions supplied by the author**',
        bulletList(constraints, ['Validate delivery, policy, data, and operating constraints']),
        '',
        '**Suggested risks**',
        `- **Desirability:** ${primaryPersona} may not view the problem as urgent enough to change behavior.`,
        '- **Feasibility:** The highest-value workflow may depend on capabilities or data not yet available.',
        '- **Viability:** Adoption may not create enough measurable value to justify ongoing investment.',
        '- **Usability:** Added flexibility could increase complexity and reduce completion.',
        '',
        '**Explicit trade-offs to decide**',
        '- Breadth of supported use cases versus speed to validated learning.',
        '- Automation versus user control and explainability.',
        '- Rich initial experience versus implementation and operational simplicity.'
      ].join('\n'),
      questions: [
        `- What evidence confirms that ${primaryPersona} experiences this problem frequently and severely?`,
        '- What is the current baseline for the primary outcome metric?',
        '- Which single user journey must the MVP solve exceptionally well?',
        '- What must be true for users to adopt this instead of their current workaround?',
        '- Which assumptions create the greatest product or delivery risk?',
        '- What data is required, who owns it, and what privacy constraints apply?',
        '- What is the launch, rollback, and learning plan?',
        '- Who makes the final scope decision when evidence, time, and feasibility conflict?'
      ].join('\n')
    };

    return SECTION_DEFINITIONS.map(definition => ({
      ...definition,
      sourceLabel: SOURCE_LABELS[definition.source],
      content: content[definition.id],
      iteration: variant
    }));
  }

  function generate(input) {
    const validation = validateInput(input);
    if (!validation.valid) throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    const now = new Date();
    return {
      id: createId(),
      title: validation.input.name,
      input: validation.input,
      sections: buildSections(validation.input, 0),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      generator: 'Deterministic template engine',
      isAIGenerated: false
    };
  }

  function regenerateSection(document, sectionId) {
    const current = document.sections.find(section => section.id === sectionId);
    if (!current) throw new Error('Section not found');
    const nextIteration = (current.iteration || 0) + 1;
    const replacement = buildSections(document.input, nextIteration).find(section => section.id === sectionId);
    return {
      ...document,
      sections: document.sections.map(section => section.id === sectionId ? replacement : section),
      updatedAt: new Date().toISOString()
    };
  }

  function toMarkdown(document) {
    const header = [
      `# ${document.title} — Product Requirements Document`,
      '',
      '> Generated with a deterministic PRD template. This is not AI-generated output. Validate all suggestions, assumptions, requirements, and targets.',
      '',
      `**Last updated:** ${new Date(document.updatedAt).toLocaleString()}`,
      ''
    ];
    const sections = document.sections.flatMap((section, index) => [
      `## ${index + 1}. ${section.title}`,
      '',
      `*Source: ${section.sourceLabel}*`,
      '',
      section.content.trim(),
      ''
    ]);
    return [...header, ...sections].join('\n');
  }

  const TemplatePRDProvider = { name: 'Template mode', mode: 'template', generate, regenerateSection };
  const PRDGenerator = {
    SECTION_DEFINITIONS,
    SOURCE_LABELS,
    TemplatePRDProvider,
    buildSections,
    generate,
    normalizeInput,
    regenerateSection,
    splitItems,
    toMarkdown,
    validateInput
  };

  if (typeof module === 'object' && module.exports) module.exports = PRDGenerator;
  root.PRDGenerator = PRDGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
