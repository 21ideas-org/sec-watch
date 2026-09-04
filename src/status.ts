export interface StatusPresentationInput {
  urgency?: readonly string[];
  exploitationStatus?: string;
  fixStatus?: string;
  updateSufficiency?: string;
  actionTiming?: string;
}

const EXPLOITATION_LABEL = '#эксплуатируется';
const FIX_LABELS = ['#патча_нет', '#патч_частичный', '#патч_есть'] as const;
const CONTROLLED_LABELS = new Set<string>([EXPLOITATION_LABEL, ...FIX_LABELS]);

function addOnce(labels: string[], label: string | undefined) {
  if (label !== undefined && !labels.includes(label)) labels.push(label);
}

/**
 * Legacy tags are presentation only. Each canonical axis replaces only its own
 * legacy fact, so partially migrated content stays readable without letting an
 * unknown new value inherit a misleading old green/red label.
 */
export function displayUrgency(input: StatusPresentationInput): string[] {
  const legacy = input.urgency ?? [];
  const labels: string[] = [];

  if (input.exploitationStatus === undefined) {
    if (legacy.includes(EXPLOITATION_LABEL)) addOnce(labels, EXPLOITATION_LABEL);
  } else if (
    input.exploitationStatus === 'active' ||
    input.exploitationStatus === 'observed'
  ) {
    addOnce(labels, EXPLOITATION_LABEL);
  }

  if (input.fixStatus === undefined) {
    for (const label of FIX_LABELS) {
      if (legacy.includes(label)) addOnce(labels, label);
    }
  } else {
    addOnce(labels, {
      unavailable: '#патча_нет',
      partial: '#патч_частичный',
      available: '#патч_есть',
    }[input.fixStatus]);
  }

  for (const label of legacy) {
    if (!CONTROLLED_LABELS.has(label)) addOnce(labels, label);
  }

  return labels;
}

/** Canonical fix state owns statistics when present; legacy tags are old-content fallback. */
export function isUnpatched(input: StatusPresentationInput): boolean {
  if (input.fixStatus !== undefined) {
    return input.fixStatus === 'unavailable' || input.fixStatus === 'partial';
  }
  return (input.urgency ?? []).some(
    (label) => label === '#патча_нет' || label === '#патч_частичный',
  );
}
