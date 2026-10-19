import type { DocumentData } from 'firebase-admin/firestore';
import type { CloudStore } from './store.js';

export const hasRestorationGuide = (control: DocumentData | undefined) =>
  !!control?.restorationGuideEnc || Array.isArray(control?.restorationGuide) && control.restorationGuide.length > 0;

/** Public enrollment saves the owner's original settings encrypted, never as a dialable default. */
export function readRestorationGuide(store: CloudStore, participantId: string, control: DocumentData | undefined): string[] {
  if (!control?.restorationGuideEnc) return control?.restorationGuide ?? [];
  const steps: unknown = JSON.parse(store.vault.open(control.restorationGuideEnc, `restoration:${participantId}`));
  if (!Array.isArray(steps) || steps.length !== 3 || steps.some(step => typeof step !== 'string' || !step.trim())) {
    throw new Error('invalid_saved_restoration_guide');
  }
  return steps;
}
