# Location Master API

Location data uses two separate namespaces. Do not mix them.

| | Admin | Public applicant API |
|---|---|---|
| Prefix | `/api/admin/masters/location` | `/api/masters/location` |
| Authentication | `Authorization: Bearer <admin JWT>` | None |
| Consumer | Admin Location Master page | Loan application form |
| Records returned | All statuses | Active records only |

The admin Axios client uses `VITE_API_BASE_URL` (default
`http://localhost:5000/api/admin`) and automatically adds the admin token. The
public client has no auth interceptor. It uses `VITE_PUBLIC_API_BASE_URL` when
set, otherwise it derives the API root by removing `/admin` from the admin base
URL.

## Initial Data

The backend owns the one-time import task, for example:

```bash
npm run import:location
```

The import is expected to seed India with 36 states, about 641 cities, and about
19,097 pincodes. This command belongs to the backend project, not this Vite
admin frontend.

## Admin Workflow

On page load the admin UI requests counts only:

```http
GET /api/admin/masters/location
Authorization: Bearer <admin JWT>
```

```json
{
  "success": true,
  "data": {
    "totalContinents": 1,
    "totalCountries": 1,
    "totalStates": 36,
    "totalCities": 641,
    "totalPincodes": 19097
  }
}
```

Records are fetched only when browsing, one level at a time:

```http
GET /api/admin/masters/location/continents
GET /api/admin/masters/location/countries?continentId=<continentId>
GET /api/admin/masters/location/states?countryId=<countryId>
GET /api/admin/masters/location/cities?stateId=<stateId>
GET /api/admin/masters/location/pincodes?cityId=<cityId>
GET /api/admin/masters/location/pincodes?stateId=<stateId>
```

All hierarchy list endpoints accept `status`, `search`, `page`, and `limit`.
Status is omitted by the admin UI to show `active`, `inactive`, and
`coming_soon` records. The backend supports a default limit of 500, maximum
5000, and `limit=all`. The deployed backend currently rejects `limit=all` on
the pincodes list even when a parent ID is supplied, so the admin client sends
`limit=5000` for that endpoint. The unscoped pincode table is separately
paginated at 50 rows by default and 500 maximum.

### Admin Endpoints

Every route below is relative to `/api/admin/masters/location` and requires an
admin JWT.

| # | Method | Path | Body / query |
|---|---|---|---|
| 1 | GET | `/` | Counts only |
| 2 | GET | `/continents` | `?status=&search=&page=&limit=` |
| 3 | POST | `/continents` | `{ name, status? }` |
| 4 | PATCH | `/continents/:id` | `{ name?, status? }` |
| 5 | DELETE | `/continents/:id` | `?force=&hard=` |
| 6 | GET | `/countries` | `?continentId=&status=&search=&page=&limit=` |
| 7 | POST | `/countries` | `{ name, continentId, status? }` |
| 8 | PATCH | `/countries/:id` | `{ name?, status? }` |
| 9 | DELETE | `/countries/:id` | `?force=&hard=` |
| 10 | GET | `/states` | `?countryId=&status=&search=&page=&limit=` |
| 11 | POST | `/states` | `{ name, countryId, status? }` |
| 12 | PATCH | `/states/:id` | `{ name?, status? }` |
| 13 | DELETE | `/states/:id` | `?force=&hard=` |
| 14 | GET | `/cities` | `?stateId=&status=&search=&page=&limit=` |
| 15 | POST | `/cities` | `{ name, stateId, status? }` |
| 16 | PATCH | `/cities/:id` | `{ name?, status? }` |
| 17 | DELETE | `/cities/:id` | `?force=&hard=` |
| 18 | GET | `/pincodes` | `?cityId=` or `?stateId=`, plus `status/search/page/limit` |
| 19 | POST | `/pincodes` | `{ pincode, cityId, prefix?, status? }` |
| 20 | PATCH | `/pincodes/:id` | `{ pincode?, prefix?, status? }` |
| 21 | DELETE | `/pincodes/:id` | `?force=&hard=` |
| 22 | GET | `/pincodes/table` | `?search=&page=&limit=` (default 50, max 500) |

The pincode table is the flat admin view. It searches pincode, city, and state
names and returns joined city/state/country names with pagination metadata:

```json
{
  "success": true,
  "count": 50,
  "total": 19097,
  "page": 1,
  "limit": 50,
  "totalPages": 382,
  "data": [
    {
      "id": "...",
      "pincode": "400001",
      "prefix": "400",
      "status": "active",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    }
  ]
}
```

Adding a child requires an active parent. A pincode is linked by `cityId`; the
backend resolves its state from the city. Rename or status updates should only
change the supplied fields.

Deletes are soft by default. A parent with live children may return `409`;
`force=true` deactivates its subtree. The admin UI only exposes reversible
deactivation; inactive rows remain visible and can be restored by setting their
status to `active`. Permanent deletion is deliberately unavailable in the UI.

Statuses are `active`, `inactive`, and `coming_soon`. Common errors use
`{ "success": false, "message": "..." }`: `400` validation, `401` auth,
`404` missing record/parent, `409` duplicate or live children.

## Public Applicant Workflow

The applicant typically enters a pincode and does not need to choose state or
city manually. All public endpoints below are relative to `/api/masters/location`
and require no token. They return active data only.

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/pincode/:pincode` | Resolve pincode to city, state, country, continent, and IDs |
| 2 | GET | `/pincode?q=&limit=` | Type-ahead by pincode digits or city name |
| 3 | GET | `/countries` | Active countries |
| 4 | GET | `/states?countryId=` | Active states |
| 5 | GET | `/cities?stateId=` | Active cities |

Successful pincode lookup:

```json
{
  "success": true,
  "message": "Pincode matched successfully",
  "data": {
    "pincode": "403001",
    "prefix": "403",
    "status": "active",
    "city": "North Goa",
    "cityId": "...",
    "state": "Goa",
    "stateId": "...",
    "country": "India",
    "countryId": "...",
    "continent": "Asia",
    "continentId": "..."
  }
}
```

No match returns `{ "success": false, "message": "Pincode ... not found" }`.
The form can then offer manual entry. Type-ahead example:

```http
GET /api/masters/location/pincode?q=4000&limit=10
GET /api/masters/location/pincode?q=mum&limit=10
```

The current workspace is the admin portal and does not contain an applicant
form; the public client helpers are available in `src/api/locationMasters.ts`
for a future/public-form integration.
