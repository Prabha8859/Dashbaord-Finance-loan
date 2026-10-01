# BACKEND TASK PROMPT — Loan Portal Admin APIs

> Ye prompt backend developer / AI agent ko as-is de sakte ho. Sab kuch isi repo ke
> admin frontend (React) ke hisaab se likha hai. Detail contract: `docs/BACKEND_API.md`.

---

## 0) Context

Admin panel (React) already ban chuka hai aur ye APIs live call karta hai.
Backend: Node/Express + MongoDB. Base URL: `http://localhost:5000/api/admin`.

Sabhi responses JSON. Frontend in shapes ko tolerant hai, par inhi par standard karo.

### Global rules

- **Success:** `{ "success": true, ...payload }` — payload resource key se aata hai
  (`customers`, `masters`, `master`, `loans`, `loan`, `admin`).
- **Error:** non-2xx + `{ "success": false, "message": "human readable reason" }`.
  Message user ko verbatim dikhta hai, isliye user-safe rakho.
- **Auth:** login/forgot-password ke alawa har route par
  `Authorization: Bearer <token>`. `401` par frontend session clear karke `/login` bhejta hai.
- **Dates:** ISO-8601 UTC. **Money:** rupees as plain number (e.g. `250000`).
- **Master document:** `{ _id, type, label, values, createdAt, updatedAt }` jahan
  `values` = `string[]` (flat list) **ya** `{ "<group>": string[] }` (grouped).
  `type` unique hai. `kind` values ke shape se derive hota hai: array → `"list"`,
  object → `"grouped"`.

---

## 1) ⛔ P0 — BLOCKER (ye pehle fix karo, warna Location page kaam nahi karega)

Abhi DB me location masters ka shape galat hai:

```jsonc
// Aaj ka actual DB state
{
  "countries":       { "values": [] },   // theek hai (flat list expected)
  "statesByCountry": { "values": [] },   // ❌ grouped object hona chahiye: {}
  "citiesByState":   { "values": { "Andaman and Nicobar Islands": ["Port Blair"], ... } }, // ✅
  "pincodesByCity":  { "values": [] },   // ❌ grouped object hona chahiye: {}
  "states":          { "values": ["Andaman and Nicobar Islands", ... 22 states] } // legacy flat list
}
```

Backend grouped value likhne par reject karta hai:

```
PUT /api/admin/masters/6abb7ec2ccba76e5a43dbb98/values
→ 400 { "success": false, "message": "\"States by Country\" stores a flat list — cannot switch shape" }
```

Isi wajah se admin **Location** page par state/city/pincode add nahi ho paata.

**Fix — koi ek option chuno:**

- **(a) Recommended (chhota fix):** `PUT /masters/:id/values` par shape switch allow karo
  **jab current `values` khaali ho** (`[]` ya `{}`). Khaali master me data loss nahi hota.
- **(b)** `POST /masters` par `values: {}` ko object hi rakho (abhi `{}` → `[]` ban jaata hai),
  aur `statesByCountry` / `pincodesByCity` ko delete karke dobara create karo.
- **(c) Long-term:** neeche wale page-wise endpoints (section 3) bana do — tab generic
  shape rule ki problem hi khatam.

**Acceptance:** Location page par country add → state add → city add → pincode add —
sab `2xx`, aur page reload par data persist.

---

## 2) Auth — `/auth`

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` | `{ success, message, token, admin }` |
| `GET` | `/auth/profile` | — | `{ success, admin }` |
| `PUT` | `/auth/profile` | `{ name, email }` | `{ success, message, admin }` |
| `PUT` | `/auth/change-password` | `{ currentPassword, newPassword }` | `{ success, message }` |
| `POST` | `/auth/forgot-password` | `{ email }` | `{ success, message }` (OTP bheje) |
| `POST` | `/auth/reset-password` | `{ email, otp, newPassword }` | `{ success, message }` |

`admin = { _id, name, email, role, isActive, lastLogin, createdAt, updatedAt }`.
Login par rate-limit rakho (abhi bahut attempts par `429` aata hai) — frontend `message` dikhata hai.

---

## 3) Masters — do pages

Admin me sirf **do** master pages hain. Har page ek page-shaped endpoint se chale,
aur neeche wala generic CRUD bhi support rahe (fallback + New Master modal isi se chalta hai).

### 3.1 Page 1 — Bank Details

```jsonc
// GET /api/admin/masters/banksdetails
{
  "success": true,
  "data": {
    "id": "6880f1c2a4b8e91d2c3f4455",
    "type": "banks",
    "label": "Banks",
    "kind": "list",
    "values": ["HDFC", "ICIC", "AXIS", "UION"],
    "updatedAt": "2026-09-29T10:00:00.000Z"
  }
}
```

```jsonc
{
  "POST   /api/admin/masters/banksdetails":         { "body": { "value": "Kotak" } },
  "PUT    /api/admin/masters/banksdetails/:value":  { "body": { "value": "Kotak Bank" } },
  "DELETE /api/admin/masters/banksdetails/:value":  {}
}
```

### 3.2 Custom bank flow (jaruri — hataana nahi)

Loan form me user kabhi apna bank list me na dhoondh kar **khud type** karta hai
(`salaryBankOther` / `otherBankList` / "Other"). Us value ko banks master me append karo,
taaki agla applicant use dropdown me dekh sake:

```jsonc
{
  "POST /api/admin/masters/banks":             { "body": { "value": "Kotak" } }          // ek custom bank append
  "PUT  /api/admin/masters/banks":             { "body": { "values": ["HDFC", "Kotak"] }} // poori list replace (admin save)
  "PUT  /api/admin/masters/banks/:value":      { "body": { "value": "Kotak Bank" } }      // rename
  "DELETE /api/admin/masters/banks/:value":    {}                                        // remove
}
```

Rules: duplicate (case-insensitive, trim) append na ho; value khaali na ho; max length ~80.

### 3.3 Page 2 — Location (Country → State → City → Pincode)

```jsonc
// GET /api/admin/masters/location
{
  "success": true,
  "data": {
    "countries":       { "id": "…", "type": "countries",       "label": "Countries",       "values": ["India"] },
    "statesByCountry": { "id": "…", "type": "statesByCountry", "label": "States by Country","values": { "India": ["Maharashtra", "Karnataka"] } },
    "citiesByState":   { "id": "…", "type": "citiesByState",   "label": "Cities by State",  "values": { "Maharashtra": ["Mumbai", "Pune"] } },
    "pincodesByCity":  { "id": "…", "type": "pincodesByCity",  "label": "Pincodes by City", "values": { "Mumbai": ["400001"] } }
  }
}
```

```jsonc
{
  "POST   /api/admin/masters/location/countries":                      { "body": { "value": "United Arab Emirates" } },
  "DELETE /api/admin/masters/location/countries/:country":             {},
  "POST   /api/admin/masters/location/countries/:country/states":      { "body": { "value": "Dubai" } },
  "PUT    /api/admin/masters/location/states/:state":                  { "body": { "value": "Maharashtra" } },   // rename
  "DELETE /api/admin/masters/location/states/:state":                  {},
  "POST   /api/admin/masters/location/states/:state/cities":           { "body": { "value": "Sharjah" } },
  "PUT    /api/admin/masters/location/cities/:city":                   { "body": { "value": "Sharjah City" } },  // rename
  "DELETE /api/admin/masters/location/cities/:city":                   {},
  "POST   /api/admin/masters/location/cities/:city/pincodes":          { "body": { "value": "00000" } },
  "DELETE /api/admin/masters/location/cities/:city/pincodes/:pincode": {}
}
```

**Cascade rules (backend authoritative rakho):**

- City rename → uske pincodes naye city key par move ho (frontend bhi karta hai).
- Country delete → us country ke states group hatao (frontend abhi yahi bhejta hai;
  states ke cities/pincodes ke liye `?force=true` ya `409` — jo chuno, document karo).
- State delete → us state ki cities (aur unke pincodes) hatao — ya `409`.
- Pincode validation: digits only (India = exactly 6). Country-agnostic ke liye frontend 3–10 digits bhejta hai.

### 3.4 Generic master CRUD (ye aaj frontend live use karta hai — todna nahi)

```jsonc
{
  "GET    /api/admin/masters":            // → { success, masters: [ { _id, type, label, kind, count, createdAt, updatedAt } ] }
  "POST   /api/admin/masters":            // body { type, label, values? } — type unique
  "GET    /api/admin/masters/:id":        // → { success, master }
  "PUT    /api/admin/masters/:id":        // body { label }
  "PUT    /api/admin/masters/:id/values": // body { values: string[] | { group: string[] } }
  "DELETE /api/admin/masters/:id"
}
```

> Note: `/masters/type/:type` route ki **zaroorat nahi** hai. Frontend type-addressed
> URLs khud resolve karta hai: `GET /masters` → `type` match → `GET /masters/:id`.

---

## 4) Customers — `/customers`

| Method | Path | Notes |
|---|---|---|
| `GET` | `/customers?search=` | `{ success, customers: [] }`, search name/email/mobile |
| `GET` | `/customers/:id` | `{ success, customer }` |
| **`DELETE`** | **`/customers/:id`** | **NAYA — admin Customers page me delete button (type-to-confirm) live hai. `404` unknown id, `409` agar open applications hain.** |

Recommended (baad me): `?page=&limit=&isActive=` server-side pagination, `PATCH /customers/:id/status`,
`GET /customers/:id/applications`.

`Customer = { _id, name, mobile, email, isVerified, isActive, role, lastLogin, createdAt, updatedAt }`.

---

## 5) Loan applications — 17 products

Har product ka apna resource:

```
personal-loans, business-loans, home-loans, loan-against-properties, balance-transfers,
project-loans, vehicle-loans, education-loans, credit-cards, working-capitals,
commercial-purchases, lease-rental-discountings, od-cc-limits, loan-against-shares,
npa-loans, gold-loans, fdi-loans
```

`gold-loans` and `fdi-loans` are required resources, not optional frontend-only entries.
Register both routes in the admin router and connect each to its own loan collection.
The frontend calls `GET /api/admin/gold-loans` for Gold Loan and
`GET /api/admin/fdi-loans` for FDI Loan; do not return FDI records from the Gold Loan route.

```jsonc
{
  "GET   /api/admin/{resource}":            // → { success, loans: [ …documents ] }
  "GET   /api/admin/{resource}/:id":        // → { success, loan: { …document, user, status } }
  "PATCH /api/admin/{resource}/:id/status": // body { status: "Approved" | "Rejected" | "Pending", note? }
}
```

- `PATCH` **abhi missing hai** — admin sirf dekh sakta hai, approve/reject nahi kar sakta.
  Isme `approvedBy` / `approvedAt` store karo aur illegal transitions reject karo.
- Status values: `"Submitted" | "Pending" | "Approved" | "Rejected"`.
- Recommended: list projection (`?fields=`) + `?page=&limit=&status=&search=&from=&to=&sort=-createdAt`.

---

## 6) Dashboard — optional

Frontend abhi 15 requests fan-out karta hai (1 customers + 14 products) har page view par.
Ek endpoint bana do:

```jsonc
// GET /api/admin/dashboard/stats
{
  "success": true,
  "stats": {
    "totalCustomers": 128,
    "totalApplications": 342,
    "submitted": 40, "pending": 120, "approved": 150, "rejected": 32,
    "requestedAmount": 187500000, "approvedAmount": 92500000,
    "approvalRate": 43.9,
    "products": [ { "slug": "personal-loan", "label": "Personal Loan", "total": 90, "submitted": 5,
                    "pending": 30, "approved": 45, "rejected": 10,
                    "requestedAmount": 45000000, "approvedAmount": 22500000 } ],
    "recent": [ /* latest applications, full document + { slug, label } */ ],
    "generatedAt": "2026-09-29T10:00:00.000Z"
  }
}
```

Swapping ke baad frontend me sirf `getDashboardStats()` badalna padega.

---

## 7) Priority order

1. **P0:** shape fix (section 1) — Location page isi se chalega.
2. **P0:** `DELETE /customers/:id` — UI already shipped hai, backend missing hai.
3. **P1:** `PATCH /{resource}/:id/status` — admin ka main action.
4. **P1:** page-wise masters endpoints (banksdetails / location) — chhote/fast requests.
5. **P2:** dashboard stats, customers pagination, list projections.

## 8) Quick acceptance tests (curl)

```bash
BASE=http://localhost:5000/api/admin
TOKEN=<login se>

# login
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@…","password":"…"}'

# P0a — grouped shape ab accept ho (khaali master me)
curl -s -X PUT $BASE/masters/<statesByCountryId>/values \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"values":{"India":["Maharashtra","Karnataka"]}}'   # → 200

# P0b — customer delete
curl -s -X DELETE $BASE/customers/<id> -H "Authorization: Bearer $TOKEN"   # → 200 / 404 / 409

# custom bank append
curl -s -X POST $BASE/masters/banks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"value":"Kotak"}'                # → 200

# status update
curl -s -X PATCH $BASE/personal-loans/<id>/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"Approved"}'
```

Definition of done: upar ke sab `2xx` dein, aur admin panel me
**Bank Details / Location / Customers / Applications / Dashboard** — paanchon pages
bina error ke real data dikhayein.
