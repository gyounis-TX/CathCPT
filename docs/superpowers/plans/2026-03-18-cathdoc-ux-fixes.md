# CathDoc UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three targeted UX fixes — make DOB optional, remove accidental-logout icon, fix scroll-induced UI shaking.

**Architecture:** All changes are isolated to existing files. No new files, no schema changes. The scroll fix removes a dead state variable that triggers unnecessary re-renders.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Capacitor

**Spec:** `docs/superpowers/specs/2026-03-18-cathdoc-ux-fixes-design.md`

---

### Task 1: Make DOB Optional in AddPatientDialog

**Files:**
- Modify: `src/components/AddPatientDialog.tsx:198-201` (remove validation)
- Modify: `src/components/AddPatientDialog.tsx:393` (update label)
- Modify: `src/components/AddPatientDialog.tsx:404` (remove required attr)
- [ ] **Step 1: Remove DOB validation block**

In `src/components/AddPatientDialog.tsx`, delete lines 198-201:

```tsx
// DELETE this block:
    if (!dob) {
      alert('Date of birth is required');
      return;
    }
```

- [ ] **Step 2: Update label text**

In `src/components/AddPatientDialog.tsx` line 393, change:

```tsx
// FROM:
                  Date of Birth *
// TO:
                  Date of Birth (optional)
```

- [ ] **Step 3: Remove required attribute**

In `src/components/AddPatientDialog.tsx` line 404, remove the `required` attribute from the DOB input:

```tsx
// FROM:
                    required
// TO:
                    (delete the line)
```

**Note:** `findPatientMatches` accepts `candidateDob: string` (non-optional). Passing `""` is safe — it will never match any patient's DOB, so no spurious matches occur. No type or call-site change needed.

- [ ] **Step 4: Verify the app builds**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -5`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/gyounis/Desktop/LumenInnovations/CathDoc
git add src/components/AddPatientDialog.tsx
git commit -m "feat: make date of birth optional in patient dialog"
```

---

### Task 2: Remove Header Logout Icon (Individual Mode)

**Files:**
- Modify: `src/App.tsx:1228-1237` (delete logout button block)

- [ ] **Step 1: Delete the individual-mode logout button**

In `src/App.tsx`, delete lines 1228-1237 (the entire conditional block):

```tsx
// DELETE this block:
            {/* Sign Out button (individual mode only — pro users have logout in blue bar) */}
            {!isProMode && (
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} className="text-gray-600" />
              </button>
            )}
```

- [ ] **Step 2: Verify the app builds**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -5`
Expected: Build succeeds. `LogOut` import is still used elsewhere (pro header line ~1303, settings).

- [ ] **Step 3: Commit**

```bash
cd /Users/gyounis/Desktop/LumenInnovations/CathDoc
git add src/App.tsx
git commit -m "fix: remove accidental logout icon from individual mode header"
```

---

### Task 3: Fix UI Shaking on Scroll

**Files:**
- Modify: `src/App.tsx:73-74` (remove dead state)
- Modify: `src/App.tsx:213-228` (remove scroll listener)
- Modify: `src/App.tsx:230-234` (remove tab-change reset)

**Root cause:** `headerVisible` state is set on every scroll direction change but never read in JSX. Each `setHeaderVisible` call triggers a full re-render of the 1600-line App component, causing visible jitter.

**Spec deviation note:** The spec prescribed replacing DOM-removal with CSS-based collapse animation. However, code review revealed that `headerVisible` is never consumed in JSX — the collapsing header feature was never wired up. There is no DOM removal to replace. The correct fix is simply removing the dead state and its scroll listener, which eliminates the unnecessary re-renders. `RoundsScreen.tsx` (listed in spec) requires no changes — confirmed by code review. HIPAA banner and GPU-promotion (spec secondary/optional items) are deferred — the banner only shows on first launch and is not a scroll-time issue.

- [ ] **Step 1: Remove the headerVisible state declaration**

In `src/App.tsx`, delete lines 72-74:

```tsx
// DELETE:
  // Collapsing header state
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
```

Keep `scrollRef` (line 75) — it may be used for scroll-to-top elsewhere.

- [ ] **Step 2: Remove the scroll event listener effect**

In `src/App.tsx`, delete lines 213-228:

```tsx
// DELETE:
  // Collapsing header — hide Row 1 on scroll down, show on scroll up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const y = el.scrollTop;
      if (y > lastScrollYRef.current && y > 60) {
        setHeaderVisible(false);
      } else if (y < lastScrollYRef.current) {
        setHeaderVisible(true);
      }
      lastScrollYRef.current = y;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);
```

- [ ] **Step 3: Remove the tab-change header reset**

In `src/App.tsx`, lines 230-234 — remove only the `setHeaderVisible(true)` call. Keep the scroll-to-top:

```tsx
// FROM:
  // Reset header visibility on bottom tab change
  useEffect(() => {
    setHeaderVisible(true);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [cathLabBottomTab]);

// TO:
  // Reset scroll position on bottom tab change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [cathLabBottomTab]);
```

- [ ] **Step 4: Verify the app builds**

Run: `cd /Users/gyounis/Desktop/LumenInnovations/CathDoc && npx vite build 2>&1 | tail -5`
Expected: Build succeeds with no errors. No references to `headerVisible` or `lastScrollYRef` remain.

- [ ] **Step 5: Commit**

```bash
cd /Users/gyounis/Desktop/LumenInnovations/CathDoc
git add src/App.tsx
git commit -m "fix: remove dead headerVisible state causing scroll-triggered re-renders

The headerVisible state was set on scroll direction changes but never read
in JSX. Each setState call re-rendered the entire 1600-line App component,
causing visible UI jitter during scrolling."
```
