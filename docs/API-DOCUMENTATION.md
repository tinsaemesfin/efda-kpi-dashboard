# MA API Documentation (Market Authorization KPI)

This document describes the **MA (Market Authorization) KPI API** currently used by the dashboard: `NEXT_PUBLIC_API_KPI` with **POST /api/kpi/tabular/8** and a form-urlencoded, DataTables-style body (`draw`, `start`, `length`, optional filters). The active integration is Medicine (`MDCN`) face data for MA-KPI-1..4 (no drilldown wiring).

---

## 1. Overview

- **Base URL:** from environment variable `NEXT_PUBLIC_API_KPI`
- **Path:** `POST /api/kpi/tabular/{reportId}`
- **Body:** `application/x-www-form-urlencoded`, DataTables-style: `draw`, `start`, `length`, and optional filters (`startDate`, `endDate`, `quarter`, `year`)
- **Authentication:** Bearer token (OIDC). All requests must include `Authorization: Bearer {access_token}`.

---

## 2. Environment Variables

```env
# Identity / Auth
NEXT_PUBLIC_STS_AUTHORITY=https://dev.id.eris.efda.gov.et
NEXT_PUBLIC_CLIENT_ID=eris-portal-spa
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth-callback
NEXT_PUBLIC_SILENT_REDIRECT_URI=...
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=...
NEXT_PUBLIC_CLIENT_SCOPE=openid profile
NEXT_PUBLIC_RESPONSE_TYPE=code

# MA KPI API base URL
NEXT_PUBLIC_API_KPI=<base URL of MA KPI API>
```

Example request URL: `{NEXT_PUBLIC_API_KPI}/api/kpi/tabular/8`

---

## 3. Authentication

- **Header:** `Authorization: Bearer {access_token}`
- **Token:** OIDC access token from the EFDA identity provider (e.g. `dev.id.eris.efda.gov.et`).
- **Storage:** Token is obtained via `oidc-client-ts` and stored in `localStorage` (e.g. via `WebStorageStateStore`).
- **401 handling:** The app may attempt token renewal and retry the request once.

Without a valid Bearer token, the server typically returns `401 Unauthorized`.

---

## 4. Request

- **Method:** `POST`
- **URL:** `{NEXT_PUBLIC_API_KPI}/api/kpi/tabular/{reportId}`
- **Headers:**
  - `Authorization: Bearer {access_token}`
  - `Content-Type: application/x-www-form-urlencoded`
  - `Accept: application/json`
- **Body:** Form-urlencoded (DataTables-style):

| Parameter | Required | Description |
|-----------|----------|-------------|
| `draw` | Yes | DataTables draw counter; use `1` |
| `start` | Yes | Pagination start index; use `0` for full data |
| `length` | Yes | Page size; face summary uses `25` |
| `startDate` | No | ISO date string (filter) |
| `endDate` | No | ISO date string (filter) |
| `quarter` | No | e.g. `"Q1"`, `"Q2"` |
| `year` | No | e.g. `2024` |

**Example body:**  
`draw=1&start=0&length=25`  
or with filters:  
`draw=1&start=0&length=25&year=2024&quarter=Q1`

---

## 5. Report IDs and Active Scope

| Report ID | Use | Description |
|-----------|-----|-------------|
| `8` | MA face data (active) | Face data used to populate MA-KPI-1..4 from one response |
| `2` | Legacy MA summary | Legacy summary payload (not the active page integration) |
| `3`–`7` | Legacy drilldown | Legacy drilldown endpoints by product type |

Current page behavior:
- **Medicine tab:** MA-KPI-1..4 use live API (`tabular/8`) and MA-KPI-5..8 remain seed/fallback.
- **No API drilldown wiring** in this phase.

---

## 6. Response Format

All responses use a **DataTables-style envelope** (same for summary and drilldown):

| Field | Type | Description |
|-------|------|-------------|
| `recordsTotal` | number | Total records (server-side) |
| `recordsFiltered` | number | Filtered count |
| `draw` | number | Same as request `draw` |
| `error` | string \| null | Error message if any |
| `totalRecords` | number | Total records |
| `totalRecordsFiltered` | number | Filtered total |
| `data` | array | Array of data rows (shape depends on report ID; see below) |

### 6.1 Face Data (Report ID 8) – `data` row

| Field | Type | Description |
|-------|------|-------------|
| `rowNumber` | number | Row index |
| `module_code` | string | Application type: `NMR` \| `REN` \| `VMIN` \| `VMAJ` (legacy `VAR` accepted as minor variation) |
| `submoduletype_code` | string | Product type: `MDCN` \| `FD` \| `FNT` \| `MD` \| `CO` |
| `target_days` | number | Target turnaround days |
| `on_time_count` | number | Count completed on time (numerator) |
| `total_count` | number | Total count (denominator) |
| `percentage` | number | On-time percentage |

### 6.2 Legacy Drilldown (Report IDs 3–7) – `data` row

| Field | Type | Description |
|-------|------|-------------|
| `rowNumber` | number | Optional row index |
| `category_name` | string | Category dimension name |
| `category_value` | string | Category value (e.g. breakdown label) |
| `module_code` | string | `NMR` \| `VAR` \| `REN` |
| `target_days` | number | Target days |
| `on_time_count` | number | On-time count |
| `total_count` | number | Total count |
| `percentage` | number | On-time percentage |

---

## 7. Abbreviations

**Module codes (application type):**

| Code | Meaning | KPI mapping in app |
|------|---------|--------------------|
| `NMR` | New Market Authorization | MA-KPI-1 |
| `REN` | Renewal | MA-KPI-2 |
| `VMIN` | Minor Variation | MA-KPI-3 |
| `VMAJ` | Major Variation | MA-KPI-4 |
| `VAR` | Variation (legacy/unsplit) | MA-KPI-3 |

**Submodule type codes (product type):**

| Code | Meaning |
|------|--------|
| `MDCN` | Medicine |
| `FD` | Food |
| `FNT` | Food Notification |
| `MD` | Medical Device |
| `CO` | Cosmetics |

The app uses these in **uppercase**. Normalize to uppercase when mapping to KPI cards or lookup tables.

Module code alias handling in app (temporary backend inconsistency support):
- `IMR -> NMR`
- `IEN -> REN`
- `IAR -> VMIN`

---

## 8. Implementation Notes

- **Case:** `module_code` and `submoduletype_code` are treated as uppercase in the app (e.g. `NMR`, `MDCN`).
- **Face vs drilldown:** Same envelope; only the shape of objects in `data` differs (face has `submoduletype_code`, drilldown has `category_name` / `category_value`).
- **Token & CORS:** Token comes from the same OIDC session (e.g. `localStorage`). If calling from the browser, the MA API must allow CORS for your origin; otherwise proxy via a backend and send the token from the server.
- **Errors:** On 401, treat as unauthenticated (refresh or redirect to login). For 4xx/5xx, the app may read `response.data.error` or `response.data.message` and show it in the UI.
- **Configurable mapping:** Module code -> KPI mapping is centralized and can be overridden via `NEXT_PUBLIC_MA_MODULE_KPI_MAPPING` (`NMR:MA-KPI-1,REN:MA-KPI-2,VAR:MA-KPI-3`).

---

## 9. Quick Reference – Endpoints

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `{NEXT_PUBLIC_API_KPI}/api/kpi/tabular/8` | `draw=1&start=0&length=25` [+ filters] | Active MA face data for KPI 1..4 |
| POST | `{NEXT_PUBLIC_API_KPI}/api/kpi/tabular/2` | legacy | Legacy summary |
| POST | `{NEXT_PUBLIC_API_KPI}/api/kpi/tabular/3..7` | legacy | Legacy drilldowns |

---

## 10. Source Files (reference)

- **MA types and labels:** `src/types/ma-api.ts`
- **MA API constants:** `src/lib/ma-api/constants.ts`
- **MA API client:** `src/lib/ma-api/client.ts`
- **MA mapping registry:** `src/lib/ma-api/mapping.ts`
- **MA face normalizer:** `src/lib/ma-api/normalizer.ts`
- **MA hooks/facade:** `src/hooks/useMAApi.ts` (`useMAKPIData`, `useMAKPIDataMedicineFacade`)

Use this doc to re-implement the MA API in another branch or stack with the same env and auth token.
