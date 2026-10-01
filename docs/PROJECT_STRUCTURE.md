# Project structure review

## Current tree (after this change)

```
src/
├─ api/                      # one module per backend resource, plain axios calls
│  ├─ axiosInstance.ts       # baseURL + auth header + global 401 handling
│  ├─ auth.ts
│  ├─ customers.ts
│  ├─ dashboard.ts           # NEW — aggregates dashboard numbers
│  ├─ masters.ts             # generic master CRUD + banks + type lookup + bootstrap
│  └─ personalLoans.ts       # slug → endpoint map, list/detail per product
├─ assets/                   # logos
├─ components/
│  ├─ common/                # ConfirmDialog, ProtectedRoute
│  ├─ layout/                # AdminLayout (sidebar + topbar)
│  └─ masters/               # GroupSwitcher, NewMasterModal, ValueListEditor
├─ constants/
│  ├─ loanTypes.ts           # slug ↔ label registry (single source of truth)
│  └─ masterTypes.ts         # NEW — master type keys + location type set
├─ context/                  # AuthContext, ToastContext
├─ pages/
│  ├─ applications/          # LoanApplicationsList, PersonalLoanDetail
│  ├─ customers/             # CustomersList
│  ├─ dashboard/             # Dashboard
│  ├─ masters/               # MastersList, MasterDetail, LocationsManager (NEW)
│  ├─ Login.tsx
│  ├─ ForgotPassword.tsx
│  └─ Profile.tsx
├─ utils/                    # apiError, masterValidation
├─ App.tsx
├─ main.tsx
└─ index.css
docs/
├─ BACKEND_API.md            # NEW — backend contract
└─ PROJECT_STRUCTURE.md      # NEW — this file
```

## Verdict: the layout is sound

The layering is correct and conventional: `api` (transport) → `pages`
(screens) → `components` (reusable UI) with `constants` / `utils` / `context`
supporting them. Imports only ever flow downward, and each backend resource has
exactly one api module. **No reorganisation is needed.**

### Fixed in this pass

| Issue | Resolution |
|---|---|
| `src/data/dummyApplications.ts` — fake dashboard data | Deleted. The dashboard now reads real API data via `api/dashboard.ts`. |
| Master lists hard-coded as `EXCLUDE_TYPES` inside `MastersList.tsx` | Moved to `constants/masterTypes.ts` so pages and the API layer agree on one list. |
| `LoanTypeSlug` union and `LOAN_TYPES` array could drift apart | Note only — they are already typed together in one file; keep edits there. |
| Location master types only existed as string literals in one page | Extracted to `constants/masterTypes.ts`. |

### Remaining nitpicks (optional, low value)

1. **Auth pages sit at the root of `pages/`** while every other screen is in a
   feature folder. Either leave it (these are true one-offs) or move them to
   `pages/auth/`. Cosmetic only.
2. **`api/masters.ts` now has four sections** (generic CRUD, type lookup,
   banks, bootstrap). If it keeps growing, split into `api/masters.ts` +
   `api/locations.ts`. Today it is ~250 lines and still readable — splitting now
   would cost more than it saves.
3. **No path alias.** `../../api/...` chains appear everywhere. Adding
   `@/*` → `src/*` in `tsconfig.app.json` + `vite.config.ts` would shorten
   imports and make files movable. Worth doing as a single mechanical pass.
4. **No tests.** There is currently no test runner configured. The
   `masterValidation.ts` helpers and the dashboard aggregation are pure
   functions and would be the cheapest first targets (Vitest).
5. **One inline hook.** `useActiveSection` lives inside
   `PersonalLoanDetail.tsx`. Extract to `src/hooks/` only when a second screen
   needs it — not before.

## Where to add things from here

| You are adding… | Put it in |
|---|---|
| A new backend call | `src/api/<resource>.ts` (add the slug to `SLUG_ENDPOINT` for loan products) |
| A new screen | `src/pages/<feature>/<Name>.tsx`, wired in `App.tsx` inside `ProtectedRoute` |
| A new loan product | `constants/loanTypes.ts` + `SLUG_ENDPOINT`, then it appears in the sidebar and dashboard automatically |
| A shared widget | `src/components/common/` |
| A new master type | `src/constants/masterTypes.ts` (+ the backend per `docs/BACKEND_API.md`) |
