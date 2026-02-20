// Help content for the in-app help panel

export interface HelpItem {
  id: string;
  section: 'cathlab' | 'rounds' | 'admin' | 'billing' | 'general';
  question: string;
  answer: string;
  tags: string[];
}

export const sectionLabels: Record<string, string> = {
  cathlab: 'Cath Lab',
  rounds: 'Rounds',
  admin: 'Admin',
  billing: 'Billing Rules',
  general: 'General'
};

export const helpItems: HelpItem[] = [
  // === Cath Lab ===
  {
    id: 'cl-1',
    section: 'cathlab',
    question: 'How do I select CPT codes for a cath case?',
    answer: 'Tap on code categories (Diagnostic Cardiac, PCI, etc.) to expand them, then tap individual codes to select. Selected codes appear in the summary at the bottom with RVU and payment estimates.',
    tags: ['cpt', 'codes', 'select', 'cath']
  },
  {
    id: 'cl-2',
    section: 'cathlab',
    question: 'What are code groups and how do I customize them?',
    answer: 'Code groups let you show/hide code categories based on your specialty. Go to Settings and select your specialty preset (Interventional, EP, General) or customize individual categories. Your settings sync across devices.',
    tags: ['code groups', 'settings', 'specialty', 'customize']
  },
  {
    id: 'cl-3',
    section: 'cathlab',
    question: 'How do case templates work?',
    answer: 'Templates pre-fill common code combinations. Built-in templates cover standard cases (diagnostic cath, PCI, etc.). You can also save your own custom templates from the current selection.',
    tags: ['templates', 'case', 'custom', 'preset']
  },
  {
    id: 'cl-4',
    section: 'cathlab',
    question: 'What does the billing rules indicator mean?',
    answer: 'Billing rules automatically check for common coding errors. Red indicators are hard blocks (e.g., mutually exclusive codes), amber warnings suggest review, and suggestions are informational.',
    tags: ['billing', 'rules', 'validation', 'errors']
  },
  {
    id: 'cl-5',
    section: 'cathlab',
    question: 'How do I assign a cath case to a rounds patient?',
    answer: 'In Pro mode, the cath lab shows a patient selector. Search for an existing patient or create a new one. The case codes will be saved as a charge linked to that patient.',
    tags: ['patient', 'assign', 'pro', 'link']
  },
  {
    id: 'cl-6',
    section: 'cathlab',
    question: 'What is sedation tracking?',
    answer: 'When sedation is included in your case, the app tracks moderate sedation units (99152/99153). These are automatically calculated based on the sedation time entered.',
    tags: ['sedation', 'moderate', 'units', 'time']
  },
  {
    id: 'cl-7',
    section: 'cathlab',
    question: 'What are CCI edit warnings?',
    answer: 'CCI (Correct Coding Initiative) edits flag code pairs that should not typically be billed together. These are warnings only — some combinations are valid with proper modifiers and documentation.',
    tags: ['cci', 'edits', 'bundling', 'warnings']
  },

  // === Rounds ===
  {
    id: 'r-1',
    section: 'rounds',
    question: 'How do I add a patient to my rounds list?',
    answer: 'Tap the "+" button on the Rounds screen. Enter the patient name, DOB, MRN (optional), and select a hospital. You can also add diagnosis codes during patient creation.',
    tags: ['add', 'patient', 'rounds', 'list']
  },
  {
    id: 'r-2',
    section: 'rounds',
    question: 'What is the difference between My List, Practice, and Call?',
    answer: 'My List shows your patients. Practice shows all patients in the organization. Call shows patients you are cross-covering for another physician.',
    tags: ['list', 'practice', 'call', 'coverage']
  },
  {
    id: 'r-3',
    section: 'rounds',
    question: 'How do I submit a charge for an inpatient?',
    answer: 'Tap the charge icon next to a patient. Select E/M codes (Initial, Subsequent, Discharge, etc.), add diagnosis codes, choose the date of service, and tap Save.',
    tags: ['charge', 'submit', 'em', 'inpatient']
  },
  {
    id: 'r-4',
    section: 'rounds',
    question: 'How does first encounter detection work?',
    answer: 'The app checks if you have any prior charges for a patient (across all dates). If this is your first charge, it shows Initial Hospital Care and Consult codes. Otherwise, it defaults to Subsequent codes.',
    tags: ['first', 'encounter', 'initial', 'subsequent']
  },
  {
    id: 'r-5',
    section: 'rounds',
    question: 'How do I handle cross-coverage patients?',
    answer: 'Use the Call List to add patients you are covering. Tap "Add to Call List" and select existing patients, or create new cross-coverage patients with the covering physician noted.',
    tags: ['cross', 'coverage', 'call', 'list']
  },

  // === Admin ===
  {
    id: 'a-1',
    section: 'admin',
    question: 'How does the charge queue work?',
    answer: 'The Charge Queue shows all pending and entered charges. Admins can mark charges as "Entered" (submitted to billing system) and then "Billed" (locked). Billed charges cannot be edited.',
    tags: ['charge', 'queue', 'entered', 'billed']
  },
  {
    id: 'a-2',
    section: 'admin',
    question: 'How do I invite physicians to the practice?',
    answer: 'Go to the Physicians tab and tap "Invite". Enter the physician email, select their role (Physician or Admin), and an invite code will be generated for them to join.',
    tags: ['invite', 'physician', 'practice', 'code']
  },
  {
    id: 'a-3',
    section: 'admin',
    question: 'What is the audit log?',
    answer: 'The audit log records all significant actions: patient additions/removals, charge submissions/modifications, physician invitations, and practice changes. It is immutable for HIPAA compliance.',
    tags: ['audit', 'log', 'hipaa', 'compliance']
  },
  {
    id: 'a-4',
    section: 'admin',
    question: 'How do I merge duplicate patients?',
    answer: 'In the Patient Roster, select two patients you believe are duplicates. Use the "Merge" option to combine their records. All charges from the duplicate will be moved to the primary record.',
    tags: ['merge', 'duplicate', 'patient', 'dedup']
  },
  {
    id: 'a-5',
    section: 'admin',
    question: 'How do report schedules work?',
    answer: 'Set up recurring report reminders (daily, weekly, or monthly) from the Reports tab. When a report is due, a notification badge appears. Exporting a CSV report marks it as generated.',
    tags: ['report', 'schedule', 'reminder', 'csv']
  },

  // === Billing Rules ===
  {
    id: 'b-1',
    section: 'billing',
    question: 'What is Modifier -25?',
    answer: 'Modifier -25 indicates a significant, separately identifiable E/M service performed by the same physician on the same day as a procedure. It is required when billing E/M + Critical Care together.',
    tags: ['modifier', '25', 'em', 'procedure']
  },
  {
    id: 'b-2',
    section: 'billing',
    question: 'Can I bill Critical Care and E/M on the same day?',
    answer: 'Yes, but only if the E/M service was performed prior to and separately from the critical care episode. The E/M code requires modifier -25, and separate documentation is needed.',
    tags: ['critical', 'care', 'em', 'same day']
  },
  {
    id: 'b-3',
    section: 'billing',
    question: 'What codes can be add-ons?',
    answer: 'Add-on codes (marked with "+") can only be billed with their corresponding primary code. For example, 99292 (additional critical care) requires 99291, and prolonged services require a primary E/M code.',
    tags: ['addon', 'primary', 'code', 'required']
  },
  {
    id: 'b-4',
    section: 'billing',
    question: 'What are mutually exclusive codes?',
    answer: 'Some code categories cannot be billed together. For example, Initial Hospital Care and Subsequent Care are mutually exclusive (you cannot bill both on the same day for the same patient).',
    tags: ['mutually', 'exclusive', 'conflict', 'same day']
  },
  {
    id: 'b-5',
    section: 'billing',
    question: 'How do I enter critical care time?',
    answer: 'When Critical Care (99291) is selected, enter the total face-to-face time in minutes. 99291 covers 30-74 minutes. Each additional 30 minutes uses 99292 (add-on).',
    tags: ['critical', 'care', 'time', 'minutes']
  },

  // === General ===
  {
    id: 'g-1',
    section: 'general',
    question: 'What happens when the app is offline?',
    answer: 'The app stores all data locally and syncs when connectivity returns. An amber banner appears when offline, and a green indicator shows when you are back online.',
    tags: ['offline', 'sync', 'connectivity', 'data']
  },
  {
    id: 'g-2',
    section: 'general',
    question: 'Why does the session lock after inactivity?',
    answer: 'For HIPAA compliance, the app locks after 5 minutes of inactivity. Enter your password or use biometric authentication (Face ID/Touch ID on supported devices) to unlock.',
    tags: ['lock', 'inactivity', 'hipaa', 'security']
  },
  {
    id: 'g-3',
    section: 'general',
    question: 'How is patient data protected?',
    answer: 'All local data is encrypted with AES-256-GCM. Patient names are stored as initials in audit logs. The privacy overlay hides data in the app switcher.',
    tags: ['encryption', 'phi', 'privacy', 'hipaa']
  },
  {
    id: 'g-4',
    section: 'general',
    question: 'What is the difference between Individual and Pro mode?',
    answer: 'Individual mode provides cath lab CPT code selection with RVU calculations. Pro mode adds patient management, inpatient rounds, charge submission, and admin features for practices.',
    tags: ['individual', 'pro', 'mode', 'features']
  },
  {
    id: 'g-5',
    section: 'general',
    question: 'Can I use Face ID or Touch ID?',
    answer: 'Yes, on iOS devices with Face ID or Touch ID. Enable biometric unlock in the lock screen settings. This provides quick access while maintaining HIPAA-compliant session security.',
    tags: ['face id', 'touch id', 'biometric', 'unlock']
  },
  {
    id: 'g-6',
    section: 'general',
    question: 'How do I export data?',
    answer: 'Admins can export charge reports as CSV from the Reports tab. Select your date range, grouping, and filters, then tap Export CSV. The export is logged in the audit trail.',
    tags: ['export', 'csv', 'reports', 'data']
  },
];

export function searchHelp(query: string): HelpItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return helpItems.filter(item =>
    item.question.toLowerCase().includes(q) ||
    item.answer.toLowerCase().includes(q) ||
    item.tags.some(tag => tag.includes(q))
  );
}
