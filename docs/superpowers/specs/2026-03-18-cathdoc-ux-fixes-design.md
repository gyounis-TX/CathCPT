# CathDoc UX Fixes Design Spec

**Date:** 2026-03-18
**Scope:** Three targeted UX improvements to the CathDoc app

---

## 1. Make Date of Birth Optional in Patient Dialog

**File:** `src/components/AddPatientDialog.tsx`

**Current behavior:** DOB is a required field. Submitting without it triggers an alert: "Date of birth is required."

**New behavior:**
- Remove the validation that requires DOB
- Change label from "Date of Birth" to "Date of Birth (optional)"
- Keep existing auto-formatting (MM/DD/YYYY display, YYYY-MM-DD storage)
- If left blank, store as empty string `""`
- No type/interface changes — `dob` field remains `string`

---

## 2. Remove Header Logout Icon (Individual Mode)

**File:** `src/App.tsx` (~lines 1228-1236)

**Current behavior:** In individual mode, a small `LogOut` icon button (18px, lucide-react) sits in the top-right header next to the "Individual" badge. Easy to accidentally tap, causing unexpected logout.

**New behavior:**
- Remove the `LogOut` button from the individual-mode header entirely
- No replacement element in that position
- Users log out via Settings screen, which already has a "Log Out" button at the bottom
- `LogOut` import stays (used in pro mode header and settings)

**Rationale:** The icon is small and positioned near frequently-tapped areas. Accidental taps cause data disruption. Settings-based logout is intentional and sufficient.

---

## 3. Fix UI Shaking on Scroll

**Files:** `src/App.tsx`, `src/CardiologyCPTApp.tsx`, `src/screens/RoundsScreen.tsx`, `src/index.css`

**Symptom:** The entire UI occasionally shakes/jitters briefly when scrolling down. No explicit shake animation exists in the codebase.

**Approach (layered):**

1. **Audit scroll containers** — Identify elements that cause layout reflow during scroll:
   - Conditionally rendered elements entering/leaving the DOM
   - Sticky/fixed headers without explicit dimensions
   - Percentage-based widths recalculating

2. **Pin header/nav dimensions** — Add explicit heights to fixed/sticky elements to prevent reflow

3. **GPU-promote scroll containers** — Apply `will-change: transform` or `transform: translateZ(0)` to main scrollable areas for compositor-layer isolation

4. **Debounce scroll-triggered state updates** — If `onScroll` handlers update state, debounce them or replace with CSS-only solutions

**Note:** Exact fixes depend on audit findings. This spec commits to the approach; specific changes determined during implementation.

---

## Out of Scope

- No changes to pro mode header or logout behavior
- No changes to patient data types or Firestore schema
- No new features or UI additions
