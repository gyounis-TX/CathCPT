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
- Guard downstream calls: pass `dob || undefined` to `findPatientMatches` so the matching service isn't called with an empty DOB string
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

**Files:** `src/App.tsx`, `src/screens/RoundsScreen.tsx`

**Symptom:** The entire UI occasionally shakes/jitters briefly when scrolling down. No explicit shake animation exists in the codebase.

**Root cause (identified via code review):** The `headerVisible` state in `App.tsx` (line 73) is toggled by a scroll event listener (lines 214-228). When it changes, Row 1 of the header enters or leaves the DOM entirely, causing a full layout reflow — the rest of the page shifts up or down by the header row's height, producing visible jitter.

**Secondary cause:** The `showHipaaBanner` conditional inside the same header wrapper can also cause layout shifts if it dismisses during active use.

**Fix:**

1. **Primary:** Replace the DOM-removal approach for the collapsing header with a CSS-only collapse. Keep the element in the DOM at all times and animate visibility using `max-height`, `opacity`, or `transform: translateY(-100%)` with `overflow: hidden` so no layout reflow occurs.

2. **Secondary:** Apply the same CSS-collapse treatment to the HIPAA banner if it can dismiss during scroll.

3. **Optional:** GPU-promote the main scroll container with `will-change: transform` if jitter persists after the primary fix.

---

## Out of Scope

- No changes to pro mode header or logout behavior
- No changes to patient data types or Firestore schema
- No new features or UI additions
