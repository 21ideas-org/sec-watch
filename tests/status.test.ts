import assert from 'node:assert/strict';
import test from 'node:test';

import { ogFor, urgencyAccent, urgencyClass } from '../src/consts.ts';
import { displayUrgency, isUnpatched, unrecognizedStatuses } from '../src/status.ts';

test('canonical exploitation and fix axes produce simultaneous independent labels', () => {
  assert.deepEqual(
    displayUrgency({
      urgency: ['#патча_нет'],
      exploitationStatus: 'active',
      fixStatus: 'available',
      updateSufficiency: 'additional_action_required',
      actionTiming: 'now',
    }),
    ['#эксплуатируется', '#патч_есть'],
  );
});

test('each missing canonical axis falls back to its legacy presentation only', () => {
  assert.deepEqual(
    displayUrgency({ urgency: ['#эксплуатируется', '#патча_нет'], fixStatus: 'available' }),
    ['#эксплуатируется', '#патч_есть'],
  );
  assert.deepEqual(
    displayUrgency({ urgency: ['#эксплуатируется', '#патча_нет'], exploitationStatus: 'none_observed' }),
    ['#патча_нет'],
  );
});

test('unknown canonical values remain visible without inheriting a legacy label or green state', () => {
  const urgency = displayUrgency({
    urgency: ['#эксплуатируется', '#патч_есть'],
    exploitationStatus: 'future_exploitation_state',
    fixStatus: 'future_fix_state',
    updateSufficiency: 'future_sufficiency_state',
    actionTiming: 'future_timing_state',
  });

  assert.deepEqual(urgency, []);
  assert.deepEqual(unrecognizedStatuses({
    exploitationStatus: 'future_exploitation_state',
    fixStatus: 'future_fix_state',
    updateSufficiency: 'future_sufficiency_state',
    actionTiming: 'future_timing_state',
  }), [
    { axis: 'exploitationStatus', value: 'future_exploitation_state' },
    { axis: 'fixStatus', value: 'future_fix_state' },
    { axis: 'updateSufficiency', value: 'future_sufficiency_state' },
    { axis: 'actionTiming', value: 'future_timing_state' },
  ]);
  assert.equal(urgencyAccent(urgency), 'var(--dim)');
  assert.equal(ogFor(urgency), '/og/default.png');
});

test('known unknown-like values invent neither urgency labels nor diagnostic metadata', () => {
  const status = {
    urgency: [],
    exploitationStatus: 'unknown',
    fixStatus: 'not_applicable',
    updateSufficiency: 'unknown',
    actionTiming: 'none',
  };

  assert.deepEqual(displayUrgency(status), []);
  assert.deepEqual(unrecognizedStatuses(status), []);
});

test('partial fix has an explicit warning presentation', () => {
  const urgency = displayUrgency({ urgency: [], fixStatus: 'partial' });

  assert.deepEqual(urgency, ['#патч_частичный']);
  assert.equal(urgencyClass(urgency[0]!), 'u-warn');
  assert.equal(urgencyAccent(urgency), 'var(--warn-fg)');
  assert.equal(ogFor(urgency), '/og/unpatched.png');
});

test('unpatched statistics are status-first with legacy fallback only when fixStatus is absent', () => {
  assert.equal(isUnpatched({ urgency: ['#патч_есть'], fixStatus: 'unavailable' }), true);
  assert.equal(isUnpatched({ urgency: ['#патч_есть'], fixStatus: 'partial' }), true);
  assert.equal(isUnpatched({ urgency: ['#патча_нет'], fixStatus: 'available' }), false);
  assert.equal(isUnpatched({ urgency: ['#патча_нет'], fixStatus: 'future_fix_state' }), false);
  assert.equal(isUnpatched({ urgency: ['#патча_нет'] }), true);
});
