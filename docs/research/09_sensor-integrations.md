# 09 — Sensor Integrations Deep Dive
**Graft Spray Decision-Intelligence Platform | Stream 2**
*Research compiled: April 2026*

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Davis Instruments WeatherLink v2 API](#2-davis-instruments-weatherlink-v2-api)
3. [Pessl Instruments FieldClimate API v2](#3-pessl-instruments-fieldclimate-api-v2)
4. [METER Group ZENTRA Cloud API](#4-meter-group-zentra-cloud-api)
5. [Sencrop API — Phase 2 (High Level)](#5-sencrop-api--phase-2-high-level)
6. [Comparison Matrix](#6-comparison-matrix)
7. [Recommended Ingestion Architecture](#7-recommended-ingestion-architecture)
8. [Onboarding UX Implications](#8-onboarding-ux-implications)
9. [Sources](#9-sources)

---

## 1. Overview & Scope

Each Graft Spray grower subscribes to a central cloud hub. Their existing field stations need to stream data into Graft Spray automatically — without requiring manual export/import workflows. Three platforms are confirmed for MVP integration; one moves to Phase 2.

| Platform | MVP / Phase | Primary hardware |
|---|---|---|
| Davis Instruments WeatherLink v2 API | **MVP** | Vantage Pro2/Vue + WeatherLink Live/Console/EnviroMonitor |
| Pessl Instruments FieldClimate API v2 | **MVP** | iMETOS IMT300, iMETOS 3.3, MeteoHelix, LoRaWAN nodes |
| METER Group ZENTRA Cloud API (v4/v5) | **MVP** | ATMOS-41 weather station, ZL6/EM60 dataloggers |
| Sencrop | Phase 2 | Raincrop, Windcrop, Leafcrop |

**Key mildew sensors to ingest per station:** air temperature (°C), relative humidity (%), leaf wetness (minutes wet per interval), precipitation (mm), canopy temperature (where available), dew point, wind speed.

---

## 2. Davis Instruments WeatherLink v2 API

### 2.1 Auth Model

The WeatherLink v2 API uses a **two-key scheme**: an `API Key` + an `API Secret` [S1].

- **API Key** — unique ID, passed as query parameter `?api-key=<key>` in every request.
- **API Secret** — secret value passed as HTTP request header `X-Api-Secret` (case-insensitive). This is the *current preferred* method [S1].
- **Legacy HMAC signature** — older approach: parameter `api-signature` computed via HMAC-SHA256 over sorted parameter string; the API Key and a timestamp `t` (Unix seconds) are included in the query string. A 300-second clock-skew tolerance is enforced [S1]. **The HMAC signature is no longer the preferred method** but remains supported [S2].
- Keys are generated at `https://www.weatherlink.com/account` → "Generate v2 Key". The secret can be regenerated (API Key stays fixed).
- **Account scope:** Keys are tied to one WeatherLink account. All stations owned by or **shared with** that account become visible via the API [S3].

**Multi-tenant pattern:** Davis provides no OAuth delegation mechanism. Each grower must share their station with a dedicated Graft Spray WeatherLink account ("Shared" access), or Graft Spray manages per-grower key/secret pairs stored in a secrets vault. The `GET /stations` endpoint returns every station accessible to the calling key, so a single Graft Spray service account can see many growers' stations if each grower performs a share step [S3].

### 2.2 Relevant Endpoints

Base URL: `https://api.weatherlink.com/v2/`

| Endpoint | Description |
|---|---|
| `GET /stations` | List all stations accessible to the API key (name, location, timezone, station_id) |
| `GET /stations/{station-id}` | Metadata for one station |
| `GET /sensors` | All sensors across accessible stations |
| `GET /sensor-catalog` | Master catalog of all sensor types and their data fields (>2 MB JSON; cache this) |
| `GET /current/{station-id}` | Current conditions — returns latest data record per sensor |
| `GET /historic/{station-id}` | Historical archive records — requires `start-timestamp` + `end-timestamp` (Unix); max window 24 hours per call [S4] |

**Mildew-relevant sensor types and fields:**

| Sensor Type | Product | Key Fields |
|---|---|---|
| 45 | Vantage Pro2 Plus ISS | `temp` (°F), `hum` (% RH), `rain_rate_last`, `rainfall_last_15_min`, `dew_point`, `wind_speed_last`, `wind_dir_last` |
| Data Structure 25 | Leaf/Soil Current Conditions Record (WeatherLink Console) | `wet_leaf_1`, `wet_leaf_2` (leaf wetness, 0–15 scale), `temp_leaf_1`, `temp_leaf_2` (canopy/leaf temp) |
| Data Structure 26 | Leaf/Soil Archive Record | Same fields, historical |
| 108 | Soil Moisture Sensor (#6440) | `moist_soil_last` (centibars) |

*Note: Davis leaf wetness sensor (#6345/6470) reports on a 0–15 resistance-count scale. Wet = 0–2; dry = 14–15. This requires normalization to minutes-wet before comparison with other platforms [S4].*

All temperatures are returned in **degrees Fahrenheit** by default; no unit override parameter exists — conversion must be done client-side.

### 2.3 Data Schema & Sampling Intervals

Readings are wrapped in a `sensors` array; each entry carries `lsid` (sensor instance ID), `sensor_type`, `data_structure_type`, and a `data` array of timestamped records [S4].

```json
{
  "station_id": 123456,
  "sensors": [
    {
      "lsid": 9876543,
      "sensor_type": 45,
      "data_structure_type": 10,
      "data": [
        {
          "ts": 1718000000,
          "temp": 68.2,
          "hum": 82.5,
          "dew_point": 62.1,
          "rainfall_last_15_min": 0.0,
          "rain_rate_last": 0.0,
          "wind_speed_last": 3.1
        }
      ]
    }
  ]
}
```

**Sampling / recording intervals:** Vantage Pro2 and WeatherLink Live stations support 1, 5, 10, 15, 30, 60, or 120-minute archive intervals (set on station). The `/current` endpoint returns the "most recent record" relative to subscription level (see §2.4). The `/historic` endpoint returns all archive records within the time window [S5].

**Latency:** Data is uploaded from the station to WeatherLink Cloud; upload interval and propagation lag are typically 2–5 minutes for WeatherLink Live hardware on Wi-Fi. Cellular hardware may have higher latency.

### 2.4 Rate Limits & Pricing Tiers

**Rate limits [S6]:**
- Default: **1,000 API calls/hour**, **10 calls/second** per API Key
- Higher limits available on request via WeatherLink Developers Discord

**Subscription tiers (per-station, per-year) [S5]:**

| Tier | Current Conditions Resolution | Historic Data |
|---|---|---|
| Basic | Most recent 15-min record | No |
| Pro | Most recent 5-min record | Yes |
| Pro+ | Most recent record (per upload interval) | Yes |

EnviroMonitor stations (used by large ag deployments with node sensors for leaf wetness, soil) require at minimum **Pro** subscription for ISS data and node sensor data [S5].

*Pricing: Not publicly listed; contact Davis sales. EnviroMonitor hardware is substantially more expensive (~$3,000+ base system).*

### 2.5 Webhook / Push Support

**No native webhook or push API exists for the REST API.** Davis provides two push mechanisms for advanced use:

1. **WeatherLink Live Local UDP broadcast** — the physical WeatherLink Live device broadcasts data on UDP port 22222 every 2.5 seconds on the local network. Requires local network access (not cloud-to-cloud) [S7].
2. **Real-time Data Feed (RDF)** — enterprise-only streaming service. Data is written to an **Amazon Kinesis Data Stream** in the customer's own AWS account. The grower (or Graft Spray, with the grower's permission) creates the Kinesis stream and coordinates with Davis to grant write access. Intended only for large-scale deployments with hundreds of stations [S7].

**For Graft Spray MVP:** polling the `/historic` endpoint on a schedule is the practical approach. A 15-minute polling interval per station is sufficient and well within rate limits.

### 2.6 SDK Availability

No official SDK from Davis. Community Python implementation available [S8]:
- HMAC signature helper in Python (using `hashlib.hmac`)
- `requests` library calls to `/stations` and `/current`
- Example: `https://gist.github.com/grfiv/b92970891211c55f4b9e1faba50ba3a6`

Third-party integrations exist for Home Assistant, Node-RED, and Universal Devices ISY (Node.js-based) [S9].

### 2.7 Multi-Tenant / Farm-of-Farms

Davis has no OAuth or programmatic delegation. Options for Graft Spray:

1. **Station Share (recommended for MVP):** Grower shares their station to a dedicated `ingest@graftspray.com` WeatherLink account. Graft Spray stores one API key/secret. The `/stations` response lists all shared stations, disambiguated by `station_id`, `station_name`, and `user_email` fields [S4].
2. **Per-account key vault:** Grower provides their own WeatherLink API key/secret during onboarding. Graft Spray stores per-grower credentials in a secrets manager (e.g., AWS Secrets Manager). More complex but avoids requiring an additional WeatherLink account share.

The station-share approach is simpler for growers but requires them to navigate the WeatherLink web UI to perform the share.

### 2.8 Known Gotchas & Deprecations

- **Legacy HMAC signature:** Old Python/PHP code that builds `api-signature` as a URL parameter still works but generates a confusing `401` timestamp error if the `X-Api-Secret` header is also absent. Always use the header method [S1].
- **Data units in Fahrenheit** with no override; requires explicit °F→°C conversion for EU/global users.
- **Historic endpoint 24-hour max window:** Backfill of >1 day requires multiple paginated calls. Budget the rate limit accordingly (≤1,000/hr).
- **Sensor type catalog is large** (>2 MB). Cache it; do not fetch on every request.
- **EnviroMonitor leaf/soil nodes** require Pro or Pro+ subscription on that specific device; Basic shares expose no node data.
- **Station "sharing" is one-direction** — once shared, the owner can revoke access at any time. Build graceful degradation for when a station disappears from the `/stations` list.
- **No station deletion event or webhook**: if a grower disconnects, Graft Spray will simply see zero records returned. Implement a "station last seen" heartbeat check.

**API docs:** `https://weatherlink.github.io/v2-api/` [S1]

---

## 3. Pessl Instruments FieldClimate API v2

### 3.1 Auth Model

FieldClimate supports **two authentication methods** [S10]:

#### HMAC (preferred for single-account server-side integration)

Signature is computed from: `METHOD + REQUEST_PATH + RFC2616_TIMESTAMP + PUBLIC_KEY`, then hashed with HMAC-SHA256 using the private key.

Required HTTP headers:
```
Authorization: hmac <PUBLIC_KEY>:<SIGNATURE>
Date: Wed, 09 Aug 2017 20:32:38 GMT
```

Keys are obtained from the FieldClimate web UI: **User menu → API services → FieldClimate**. The HMAC key pair is permanently bound to the user account and cannot expire (unless revoked) [S11]. DEV routes (admin/user management) are **not available** via HMAC.

#### OAuth 2.0 (for multi-tenant / partner applications)

- OAuth server: `https://oauth.fieldclimate.com`
- Authorize: `https://oauth.fieldclimate.com/authorize`
- Token: `https://oauth.fieldclimate.com/token`
- Supported grants: **Authorization Code**, **Client Credentials**, **Refresh Token**
- Access token TTL: **1 hour** (3600 s); refresh token used to renew.
- Client app registration provides a **Client ID** and **Client Secret**.

**Multi-tenant model:** A master OAuth application can have **multiple sub-applications**, each with multiple users. All users share the Pessl user base but can be scoped to specific applications. This is the correct pattern for Graft Spray's farm-of-farms hub [S10].

### 3.2 Relevant Endpoints

Base URL: `https://api.fieldclimate.com/v2/`

**Station & Sensor Discovery:**

| Endpoint | Method | Description |
|---|---|---|
| `GET /user/stations` | GET | All stations accessible to the authenticated user |
| `GET /station/{station-id}` | GET | Station metadata |
| `GET /station/{station-id}/sensors` | GET | List sensors attached to station |
| `GET /system/sensors` | GET | Full sensor type catalog with codes, units, aggregation methods |

**Data Retrieval:**

| Endpoint | Method | Description |
|---|---|---|
| `GET /data/{station-id}/{group}/last/{period}` | GET | Last N hours/days of data (`group`: raw, hourly, daily, monthly) |
| `GET /data/{station-id}/{group}/from/{ts}/to/{ts}` | GET | Historical data for a time window |
| `POST /data/{station-id}/{group}/last/{period}` | POST | Custom view — filter to specific sensor codes |
| `POST /data/{station-id}/{group}/from/{ts}/to/{ts}` | POST | Custom view historical |

**Mildew-relevant sensor codes [S10]:**

| Code | Name | Unit | Aggregation |
|---|---|---|---|
| 0 | Air temperature | °C (or °F) | avg, max, min |
| 1 | Relative humidity | % | avg |
| 4 | **Leaf wetness** | **minutes** | time (total wet minutes per interval) |
| 6 | Precipitation | mm | sum |
| 5 | Wind speed | m/s | avg, max, min |
| 143 | Wind direction | deg | avg, last |
| 2 | Solar radiation | W/m² | avg |
| 506 | HC Air temperature (high-accuracy variant) | °C | avg, max, min |
| 507 | HC Relative humidity | % | avg |

*Leaf wetness (code 4) is reported as **minutes wet** within the aggregation interval — directly usable by mildew models without conversion.*

**Response format (optimized/recommended):**
```json
{
  "dates": ["2024-07-21 05:00:00", "2024-07-21 05:15:00"],
  "data": {
    "1_X_X_4": {
      "name": "Leaf Wetness",
      "unit": "min",
      "ch": 1,
      "code": 4,
      "aggr": { "time": [0, 12] }
    },
    "1_X_X_0": {
      "name": "Air temperature",
      "unit": "°C",
      "aggr": { "avg": [18.2, 19.1], "max": [19.0, 19.5], "min": [17.8, 18.6] }
    }
  }
}
```

Data field keys follow the pattern `{channel}_{pos1}_{pos2}_{sensor_code}`.

### 3.3 Data Schema & Sampling Intervals

Stations can be configured to log at **10, 15, 20, 30, 60, or 120 minutes** [S12]. Transfer to the FieldClimate server can be set every 10–60 minutes, or on a scheduler. Hourly and daily aggregates are computed server-side.

**Maximum records per call:** 10,000 data points.

**Data groups:**
- `raw` — station-logging-interval data (e.g., 15-min)
- `hourly` — 60-min aggregates
- `daily` — daily aggregates
- `monthly` — monthly aggregates

**Latency:** Dependent on station upload schedule; minimum is near-real-time if set to 10-min transfer. Typical field deployments use 30–60 min.

### 3.4 Rate Limits & Pricing Tiers [S13]

| Tier | Daily API calls (per station) | Data access window |
|---|---|---|
| Tier 1 | 48 req/station/day | Last 30 days |
| Tier 2 | 500 req/station/day | Last 365 days |
| Tier 3 | 1,500 req/station/day | Full history (10 years) |

**Per-call limits:**
- Raw data: max 7-day window per request
- Hourly/Daily: max 30-day window per request
- Monthly: up to 10-year window (Tier 3 only)

**Pricing:** Contact `subscriptions@metos.global`. Not publicly listed [S13].

**Planning note for Graft Spray MVP:** With 15-minute polling of current + hourly data, 48 calls/station/day (Tier 1) will be **exhausted in under 3 hours** (~3.3 calls/15 min × 96 intervals/day ≈ 320 calls). **Tier 2 or Tier 3 is required** for real-time monitoring use cases.

### 3.5 Webhook / Push Support

**No documented push/webhook mechanism exists** in the FieldClimate API v2 as of the documentation reviewed [S10, S13]. FieldClimate does offer third-party platform integrations (John Deere Operations Center, etc.) via their UI, but these are pre-built connectors, not configurable webhooks.

**Implication:** Graft Spray must poll on a schedule. Recommend 15-minute polling using the `raw/last/1h` endpoint to catch each transmission window.

### 3.6 SDK Availability

No official SDK. Community implementations:

- **Python:** `python-fieldclimate` package (agrimgt/python-fieldclimate on GitHub, Python 3.5+; uses `asks` + `pycryptodome`). An older SatAgro implementation also exists (`metos-fieldclimate`). [S14]
- **R:** `rfieldclimate` package (CRAN) [S14]
- Code examples provided in official docs for: PHP, Python 2.7/3.5, JavaScript, Java, C#, Ruby, Dart.
- Postman collection: `https://docsdev.fieldclimate.com/#intro`

### 3.7 Multi-Tenant / Farm-of-Farms

The **OAuth 2.0** path is the correct solution for Graft Spray:

1. Register a Graft Spray **client application** at Pessl (`api@metos.at`). Receive a client ID and secret.
2. Each grower authenticates via the OAuth **Authorization Code** flow, granting Graft Spray read access to their stations.
3. Graft Spray receives a per-grower `access_token` + `refresh_token`. Store securely.
4. Call `GET /user/stations` with the grower's token to enumerate their devices.
5. Refresh tokens before expiry (1 hour TTL for access tokens).

DEV routes (user management, sub-application administration) are available only under OAuth, not HMAC [S10].

### 3.8 Known Gotchas & Deprecations

- **HMAC clock sensitivity:** The signature includes the `Date` header in RFC2616 format. If client clock is off by more than a few minutes, requests will fail with 401. Use NTP-synchronized clocks and set `Date` header from system time.
- **Rate limit is per-station, per-day** — not aggregate. With 50 growers × 50 stations = 2,500 devices, even Tier 2 (500 calls/station/day) is generous, but must not batch requests naively.
- **Data key format** (`{ch}_{p1}_{p2}_{code}`) is not documented as stable; always use `/system/sensors` to decode rather than hard-coding field names.
- **Leaf wetness aggregation** is `time` (total minutes), not a continuous signal — this is convenient for mildew model inputs but means you cannot reconstruct sub-interval wetness patterns.
- **10,000-point limit per call:** A 30-day raw window at 15-min intervals = ~2,880 records × sensors; may require chunking.
- **No v1→v2 migration guide** is publicly prominent; v1 API (`api.fieldclimate.com/v1/`) is still accessible but considered legacy.

**API docs:** `https://api.fieldclimate.com/v2/docs/` [S10]

---

## 4. METER Group ZENTRA Cloud API

### 4.1 Auth Model

ZENTRA Cloud uses **per-user Bearer token** authentication [S15, S16]:

```http
Authorization: Token <YOUR_TOKEN_ID>
```

- Token is generated/visible at `zentracloud.com` → **User Account → Integrations → Show Token**.
- Each token is scoped to a **user account** and inherits that user's organization memberships.
- Access to a device requires: (a) user is a member of the organization that owns the device, **and** (b) user role is **Editor** or **Administrator** [S16].
- Tokens can be regenerated (old token immediately invalidated).

**API versions in parallel operation:**
- **v3/v4** — legacy, currently operational. US server: `https://zentracloud.com/api/v4/`. TAHMO server: `https://tahmo.zentracloud.com/api/v4/`. Rate limit: 60 calls/minute total, 1 call/minute per device [S17].
- **v5** — latest (released early 2026, powers ZENTRA Cloud 2.0). Additional publish/subscribe capabilities planned. Rate limit: burst = 5 calls, steady-state = 1 call/minute (GCRA algorithm) [S16]. **All clients will need to migrate to v5** when ZENTRA Cloud 1.0 is deprecated [S18].

### 4.2 Relevant Endpoints

**v4 API (current production):**

| Endpoint | Description |
|---|---|
| `GET /api/v4/get_readings/?device_sn=<sn>&start_date=<dt>&end_date=<dt>` | Time-series readings for one device |

Parameters:
- `device_sn` — device serial number (e.g., `z6-12345` for ZL6, `A4100000` for ATMOS-41W)
- `start_date` / `end_date` — ISO datetime strings (or `start_mrid`/`end_mrid` record IDs)
- `output_format` — `json`, `df` (pandas), or `csv`
- `per_page` — up to **2,000** records per page (default 500)
- `page_num` — pagination
- `sort_by` — `ascending` or `descending`
- `location` — boolean; include lat/lon history [S17]

The v5 API uses a device-identifier path parameter with calendar-month pagination and ISO datetime / Unix timestamp query parameters [S16].

**Mildew-relevant ATMOS-41 output variables [S19, S20]:**

| Parameter | Unit | Range | Resolution | Accuracy |
|---|---|---|---|---|
| Air temperature | °C | –40 to +50 °C | 0.1 °C | ±0.6 °C |
| Relative humidity | % RH | 0–100% | 0.1% | ±3% RH typical |
| Vapor pressure | kPa | — | — | — |
| Precipitation | mm | 0–400 mm/h | **0.017 mm** | ±5% (0–50 mm/h) |
| Wind speed | m/s | 0–60 m/s | 0.01 m/s | ±3% or 0.3 m/s |
| Wind direction | ° | 0–360° | 1° | — |
| Wind gust | m/s | — | — | — |
| Solar radiation | W/m² | 0–1,750 | 1 W/m² | ±5% |
| Barometric pressure | kPa | 50–110 | 0.01 kPa | ±0.1 kPa |
| Lightning strikes / distance | count / km | — | — | — |

**Leaf wetness:** The ATMOS-41 does **not** include a native leaf wetness electrode sensor. Leaf wetness can be added as a separate METER **PHYTOS-31** or **Decagon S-LWS** sensor connected to a spare ZL6 port. Without this add-on, Graft Spray must infer leaf wetness from humidity + precipitation + dew point (see §7 for gap-fill strategy).

The ZL6 datalogger accepts up to **6 sensor ports** and logs data at configurable intervals (**5 min to 12 hours**) [S21].

### 4.3 Data Schema & Sampling Intervals

Response format (v4, JSON):
```json
{
  "metadata": {
    "device_sn": "A4100000",
    "sensor_name": "ATMOS 41W",
    "units": "°C",
    "errors": []
  },
  "readings": [
    {
      "timestamp_utc": 1718000000,
      "datetime": "2024-06-10 08:00:00-06:00",
      "tz_offset": -21600,
      "value": 18.4,
      "precision": 1,
      "mrid": 2500,
      "error_flag": false
    }
  ]
}
```

Each parameter is returned as a **separate readings array** in the response. The `error_flag: true` field marks suspect or invalid measurements and must be filtered before use in mildew models [S17].

**Sampling:** ATMOS-41 sensors are measured every minute internally; the ZL6 stores averages at the configured measurement interval. Standard cellular subscription uploads every **60 minutes**; the 15-minute plan uploads every **15 minutes** [S22].

**Latency:** Cellular upload lag is typically <5 minutes after the scheduled interval.

### 4.4 Rate Limits & Pricing Tiers

**v4 rate limits [S17]:**
- **60 calls/minute** (total per user token)
- **1 call/minute per device**

**v5 rate limits [S16]:**
- Burst: 5 calls immediately
- Steady-state: 1 call/minute (resets after 300 s idle)

**Subscription plans (per-device, per-year) [S22]:**

| Plan | Upload interval | API access | Notes |
|---|---|---|---|
| Standard (cellular/WiFi) | 60-min cellular; unrestricted WiFi | 12 months included | Base tier |
| 15-min High Data (cellular) | 15-min cellular | 12 months included | Separate purchase or upgrade |
| Cellular Upgrade | Upgrade 60→15 min for ZL6 | — | Add-on |

ZENTRA Cloud 2.0 introduced **organization-wide billing**: one unified 12-month cycle for all devices in an organization, with prorated mid-cycle activations and a shared usage pool [S18].

*Pricing: not publicly listed; contact METER Group sales.*

### 4.5 Webhook / Push Support

**Yes — ZENTRA Cloud Push API** [S15]:

- Configuration: `zentracloud.com` → **API → Endpoints → + Add Endpoint**
- Enter a target **HTTPS URL** + at least one header key/value (custom auth header).
- Subscribe specific devices to the endpoint.
- Data is sent as **HTTP POST with `www-formdata`** encoding.
- Payload received in Python Flask: `request.form`; in Node.js/Express: `request.body` (with `urlencoded` middleware).
- Optional metadata headers: add `extra: sensor_depth` and/or `extra: location` to receive depth and GPS data.
- **Auto-disable on failure:** After 5 consecutive connection failures, the endpoint is disabled and the account owner is notified by email [S15].
- **Permission required:** Editor or Administrator role to configure push endpoints.

**This is the only MVP platform with native push support** — enabling Graft Spray to receive data as it arrives rather than polling.

*Note: ZENTRA Cloud 2.0 / v5 has additional "publish/subscribe capabilities planned" but not yet available as of the docs reviewed [S18].*

### 4.6 SDK Availability

No official Python or Node.js SDK. However, METER provides:
- **Python code example** using `requests` + `pandas` in the v4 documentation [S17].
- Swagger/OpenAPI spec available at `https://zentracloud.com/api/v4/documentation/`.

Community: no widely-adopted open-source wrapper found.

### 4.7 Multi-Tenant / Farm-of-Farms

ZENTRA Cloud's architecture is **organization-centric** [S16, S18]:

- Each device belongs to an **organization**. A user can be a member of multiple organizations.
- Graft Spray's hub pattern requires growers to **invite a Graft Spray service account** (e.g., `ingest@graftspray.com`) as an **Editor** (minimum) in their ZENTRA Cloud organization.
- The service account then has API token access to all devices in that organization.
- Alternatively, growers can provide their own API token (paste-based onboarding), which Graft Spray stores per-grower in a secrets vault.

**The organization-invite approach is cleaner** because METER handles the permission model. The paste-token approach trades simplicity for the risk of the grower later deleting or regenerating their token.

### 4.8 Known Gotchas & Deprecations

- **v3/v4 API will be deprecated** in favor of v5. All new integrations should target v5. No deprecation date set as of early 2026 but migration is required [S18].
- **ATMOS-41 lacks leaf wetness** electrode — the most critical mildew sensor input is absent without a separate PHYTOS-31 add-on sensor. Must document this gap prominently in grower onboarding.
- **Per-device rate limit (1 call/min):** With 50 devices per organization, the 60-call/minute limit fills exactly. Add devices → stagger polling intervals or switch to push API.
- **Token is per-user, not per-application:** If the service account's token is regenerated, all device integrations break simultaneously. Monitor token expiry/rotation events.
- **Push endpoint auto-disable:** If Graft Spray's ingestion endpoint experiences downtime, ZENTRA disables push after 5 failures. Build a re-enable flow triggered by an alert.
- **No sensor depth for leaf wetness** in standard ATMOS-41 response; depth metadata requires the `extra: sensor_depth` push header.
- **error_flag: true** values must be treated as missing and interpolated/flagged rather than forwarded to mildew models.

**API docs:** `https://docs.zentracloud.com/l/en/article/zbv2iyxhar-api-v-3-0-us` (v4) [S17]; `https://docs.zentracloud.com/l/en/article/zjky832943-api-v5` (v5) [S16]

---

## 5. Sencrop API — Phase 2 (High Level)

Sencrop is a French agri-IoT company with ~35,000+ IoT weather stations deployed across Europe and beyond, primarily targeting viticulture and field crops [S23]. The Sencrop Leafcrop sensor provides leaf wetness measurements.

### 5.1 Auth Model

**OAuth 2.0 Partners API** [S24]:

- Apply for partner credentials (`api@sencrop.com`): receive `APPLICATION_ID` and `APPLICATION_SECRET`.
- Authenticate as the partner via `client_credentials` grant → receive `PARTNER_ACCESS_TOKEN`.
- Access individual growers' devices via **delegation** (`grant_type: module`), using the grower's email. This is a clean OAuth impersonation flow requiring the grower to activate at least one "partner module" on their Sencrop account.

### 5.2 Key Endpoints

Base URL: `https://api.sencrop.com/v1/`

| Endpoint | Description |
|---|---|
| `GET /partners/{partnerId}/devices` | All grower devices that have granted access to the partner |
| `GET /users/{userId}/devices` | Devices for a specific user |
| `GET /users/{userId}/devices/{deviceId}/data/raw` | Raw time-series readings |
| `GET /users/{userId}/devices/{deviceId}/statistics` | Aggregated statistics by time bucket |

### 5.3 Data Schema & Measure Names [S25]

| Measure | Unit |
|---|---|
| `TEMPERATURE` | °C |
| `RELATIVE_HUMIDITY` | % |
| `RAIN_FALL` | mm |
| `LEAF_WETNESS` | minutes |
| `LEAF_SENSOR_CONDUCTIVITY` | mV |
| `WIND_SPEED` / `WIND_GUST` | km/h |
| `WIND_DIRECTION` | ° |
| `WET_TEMPERATURE` | °C (wet bulb) |

Leaf wetness is reported as **minutes** per interval — consistent with FieldClimate (code 4) and usable by standard mildew accumulation models.

**Sampling:** Devices transmit every 15 minutes typically.

### 5.4 Rate Limits & SDK

Rate limits are not published. The guide states "you will not reach the limit until you make a hundred calls per minutes" [S25] — so ~100 calls/minute is the soft ceiling. An official **JavaScript SDK** (`sencrop-js-api-client`, npm) exists [S26]. No Python SDK.

### 5.5 Webhook / Push

No webhook mechanism documented in the Partner API. Data retrieval is polling-based.

### 5.6 Multi-Tenant

The partner delegation model (module activation per grower) is the cleanest multi-tenant flow of all four platforms — growers explicitly grant access by activating the Graft Spray module in their Sencrop account [S24].

### 5.7 Phase 2 Development Notes

- Sencrop's primary markets are Europe (France, Germany, Italy). Limited US presence.
- Leafcrop sensor is particularly relevant: dedicated leaf wetness + canopy temperature sensing in grapevine canopy.
- Implement Phase 2 after validating canonical schema compatibility with MVP platforms.
- Contact `api@sencrop.com` for partner onboarding before planning Phase 2 sprint.

---

## 6. Comparison Matrix

### 6.1 Capabilities Side-by-Side

| Dimension | Davis WeatherLink v2 | Pessl FieldClimate v2 | METER ZENTRA Cloud v4/v5 | Sencrop (Phase 2) |
|---|---|---|---|---|
| **Auth mechanism** | API Key + Secret header | HMAC-SHA256 *or* OAuth 2.0 | Bearer token (per-user) | OAuth 2.0 (partner delegation) |
| **Multi-tenant / farm-of-farms** | Station share to central account (manual by grower) | OAuth client app with user delegation ✓ | Org invite → service account | Module activation per grower ✓ |
| **Push / webhook** | ❌ (Kinesis RDF for enterprise) | ❌ (polling only) | ✓ (HTTPS Push API, formdata) | ❌ (polling only) |
| **Air temp** | ✓ `temp` (°F → needs convert) | ✓ code 0 (°C) | ✓ (°C) | ✓ `TEMPERATURE` (°C) |
| **Relative humidity** | ✓ `hum` | ✓ code 1 | ✓ | ✓ `RELATIVE_HUMIDITY` |
| **Leaf wetness (native)** | ✓ `wet_leaf_1/2` (0–15 scale — needs normalize) | ✓ code 4 (minutes) ✓ best | ❌ ATMOS-41 lacks; add PHYTOS-31 | ✓ `LEAF_WETNESS` (minutes) |
| **Precipitation** | ✓ `rain_rate_last`, `rainfall_last_15_min` | ✓ code 6 (mm) | ✓ ATMOS-41 0.017 mm res | ✓ `RAIN_FALL` (mm) |
| **Canopy / leaf temp** | ✓ `temp_leaf_1/2` (Leaf/Soil station add-on) | ✓ (with dedicated sensor) | ✓ (with separate IR sensor on ZL6) | ✓ Leafcrop |
| **Dew point** | ✓ `dew_point` | Calculated (not native field) | Derivable from RH + T | Not listed |
| **Data latency** | 2–15 min (upload interval dependent) | 10–60 min (configurable) | 15–60 min (plan dependent) | ~15 min |
| **Historical access** | Yes (Pro/Pro+) | Yes (Tier 2/3) | Yes (all plans) | Yes |
| **Min polling interval** | 5 min (Pro) / 1 min (Pro+) | 15 min (practical; raw data) | 15 min (15-min plan) | 15 min |
| **Rate limits** | 1,000/hr total | 48–1,500/station/day | 60/min total; 1/min/device | ~100/min |
| **Tiered pricing** | Basic/Pro/Pro+ (per station) | Tier 1/2/3 (per station) | Standard/15-min (per device) | Partner program |
| **Python SDK** | No (community HMAC helper) | Community (`python-fieldclimate`) | No (examples provided) | No (JS only) |
| **Node.js SDK** | No | No | No | ✓ (`sencrop-js-api-client`) |
| **API docs quality** | Good (GitHub Pages) | Good (Swagger + narrative) | Good (Swagger + help docs) | Adequate |

### 6.2 Mildew-Relevance Scoring

Scoring 1–5 per dimension (5 = best):

| Dimension | Davis | Pessl | METER ZENTRA | Sencrop |
|---|---|---|---|---|
| Native leaf wetness | 3 (0–15 scale, normalize needed) | **5** (minutes, direct) | 1 (absent; add-on required) | **5** (minutes) |
| Precipitation resolution | 3 (variable by sensor) | 4 | **5** (0.017 mm ATMOS-41) | 4 |
| RH & temperature | 4 | **5** | **5** | 4 |
| Data latency | 3 | 4 | 4 (15-min plan) / 2 (60-min plan) | 4 |
| Push/streaming | 2 (Kinesis only) | 1 (none) | **5** (push API) | 1 (none) |
| Multi-tenant ease | 2 (station share manual) | **5** (OAuth delegation) | 4 (org invite) | **5** (module activation) |
| Integration complexity | 3 | 3 | 4 | 4 |
| **Total (max 35)** | **20** | **27** | **26** | **28** |

**Summary:** Pessl and METER are roughly equivalent for mildew monitoring. Pessl has the best native leaf wetness field; METER ZENTRA has the only push API. Davis is adequate but requires normalization work and has the weakest multi-tenant story. Sencrop (Phase 2) would score highest overall.

---

## 7. Recommended Ingestion Architecture

### 7.1 Strategy: Webhook-First with Polling Fallback

```
                 ┌─────────────────────────────────────────────┐
                 │         GRAFT SPRAY CLOUD HUB               │
                 │                                              │
  ZENTRA Push ──►│  /ingest/zentra   ─────────────────────────►│
  (formdata)     │                        ↓                     │
                 │                  Normalization               │
  Davis Poll ───►│  Scheduler       Layer (Canonical            │
  (15 min)       │  (per-grower,    Timeseries Schema)  ───────►│  TimescaleDB /
                 │   per-station)        ↓                      │  InfluxDB
  Pessl Poll ───►│                  Gap-Fill Engine             │
  (15 min)       │                       ↓                      │
                 │                  Disease Model               │
  Sencrop Poll ─►│                  Inputs (Phase 2)            │
  (Phase 2)      └─────────────────────────────────────────────┘
```

**Rationale:**
- METER ZENTRA is the only platform with push support → receive it server-side immediately (lowest latency for ZL6-equipped growers).
- Davis and Pessl require polling. 15-minute polling intervals per station are sufficient for mildew models (which typically compute risk on hourly windows) and within all platforms' rate limits.
- Sencrop (Phase 2) will follow the same polling pattern.

### 7.2 Normalized Canonical Timeseries Schema

All ingested records are transformed to a single schema before writing to the time-series store:

```json
{
  "event_ts": "2024-07-21T05:15:00Z",          // UTC ISO8601
  "received_ts": "2024-07-21T05:17:43Z",        // when Graft Spray received it
  "station_id": "gs-grower-abc123",             // internal Graft Spray ID
  "source_platform": "davis|pessl|zentra|sencrop",
  "source_device_id": "vendor-native-id",       // e.g. Davis station_id or Pessl serial
  "interval_min": 15,                           // data aggregation interval in minutes
  "air_temp_c": 18.4,                           // °C
  "rh_pct": 82.3,                               // 0–100 %
  "dew_point_c": 15.6,                          // °C (derived if not provided)
  "precip_mm": 0.0,                             // mm accumulated this interval
  "precip_rate_mm_h": 0.0,                      // mm/h
  "leaf_wetness_min": 12,                       // minutes wet in interval (0–interval_min)
  "leaf_wetness_raw": null,                     // platform-native value (pre-normalization)
  "canopy_temp_c": null,                        // if available
  "wind_speed_ms": 2.1,                         // m/s
  "wind_dir_deg": 245,                          // degrees
  "solar_rad_w_m2": 512.0,                      // W/m² (if available)
  "quality_flag": "ok|gap_filled|error",        // see below
  "gap_filled_fields": ["leaf_wetness_min"]     // which fields were imputed
}
```

**Leaf wetness normalization table:**

| Platform | Native format | Canonical minutes conversion |
|---|---|---|
| Davis (Leaf/Soil sensor) | 0–15 scale | `wet_leaf` ≤ 2 → full interval; ≤ 7 → ~half interval; ≥ 14 → 0. Use empirical linear mapping or threshold. [S27] |
| Pessl FieldClimate | Minutes (code 4) | Direct: no conversion needed |
| METER (PHYTOS-31) | Resistance / voltage | Manufacturer calibration; typically threshold-based minutes |
| Sencrop Leafcrop | Minutes | Direct |

### 7.3 Gap-Filling with Weather Network Fallback

When a station goes offline (connectivity failure, sensor fault, `error_flag: true` readings), Graft Spray must decide whether to:
1. **Hold the last known value** (appropriate for slow-changing variables like air temp over <1 hour)
2. **Interpolate** linearly between last good and next good reading
3. **Substitute from a nearby weather network** (best for precipitation; reasonable for temperature and humidity)
4. **Flag as missing** and exclude from mildew model computation (safest; used when gap > threshold)

**Gap-filling strategy by variable:**

| Variable | Gap < 1 h | Gap 1–4 h | Gap > 4 h |
|---|---|---|---|
| Air temp | Linear interpolate | Interpolate + flag | NWS/ERA5 grid substitute |
| RH | Linear interpolate | Interpolate + flag | NWS/ERA5 substitute |
| Precipitation | Zero-fill (no rain assumption) | Consult NWS hourly | Consult NWS hourly |
| Leaf wetness | Derive from RH + precip heuristic | Derive from RH + precip | Derive or flag missing |
| Wind | Last-value carry-forward | Interpolate | NWS/ERA5 substitute |

**Leaf wetness fallback heuristic (when sensor absent or offline):**
A simple threshold model: if `rh_pct ≥ 90` *or* `precip_mm > 0` for the interval, set `leaf_wetness_min = interval_min × min(1, (rh_pct - 85)/15)`. This approximates the well-established Wallin LWD regression and is referenced by [S28, S29] as acceptable for mildew risk scoring in the absence of direct measurement.

**Literature support for sensor fusion / gap-fill in ag IoT:**
- Pascoal et al. (2024) demonstrate that IoT sensor fusion for viticulture disease detection requires combining air temperature, RH, leaf wetness, precipitation, and solar radiation [S30] — exactly the canonical schema above.
- Vinetur (2026) reports a published preprint showing graph autoencoder ML can reconstruct missing temperature and humidity series from vineyard sensor networks more reliably than simpler methods [S31].
- Deep learning SADF-Net (2025) integrates multi-modal ag IoT sources (in-situ sensors + satellite + NWP) via spatial attention mechanisms for precision crop protection decisions [S32].
- The AIoT micro-climate project at TU Wien demonstrates that sensor fusion at the edge (micro-controllers) can reduce data volumes while preserving inference quality for disease prediction in vineyards [S33].

**Recommended fallback stack:**
1. Primary: platform sensor data (Davis / Pessl / METER)
2. Secondary: nearest National Weather Service / Deutscher Wetterdienst SYNOP station data (free, open APIs)
3. Tertiary: ERA5 reanalysis (hourly, 0.25° grid, via Copernicus CDS API) — 5-day delay but useful for back-computation

### 7.4 Polling Architecture for Davis & Pessl

```python
# Pseudocode: per-platform poller using scheduler (e.g., APScheduler)

@scheduler.scheduled_job('interval', minutes=15, id='davis_poll')
def poll_davis(grower_id: str, station_id: str):
    end_ts = int(time.now())
    start_ts = end_ts - 900  # 15 minutes
    records = davis_client.get_historic(station_id, start_ts, end_ts)
    for rec in records:
        canonical = normalize_davis(rec)
        timeseries_db.upsert(canonical)  # idempotent upsert on (station_id, event_ts)

@app.post("/ingest/zentra")
def zentra_push_handler(request: Request):
    # Immediately acknowledge to prevent ZENTRA auto-disable
    data = await request.form()
    background_tasks.add_task(process_zentra_push, data)
    return Response(status_code=200)
```

**Key design principles:**
- **Idempotent upsert** on `(station_id, event_ts)` — polling may re-fetch records already received; duplicates must be harmless.
- **Immediate 200 ACK** for ZENTRA push before any processing — prevents the 5-failure auto-disable.
- **Stagger polling** across growers to avoid simultaneous burst against rate limits.
- **Exponential backoff** on 429 / 503 responses.

---

## 8. Onboarding UX Implications

The onboarding flow differs by platform's auth architecture:

### 8.1 Davis WeatherLink

**Recommended flow (Station Share):**
1. During signup, Graft Spray UI prompts: *"Do you use Davis WeatherLink? Share your station with us."*
2. Provides a simple step-by-step guide (with screenshots) to log into weatherlink.com → Device Info → Share Station → enter `ingest@graftspray.com`.
3. Graft Spray polls for the new station to appear in `/stations` response (check every 5 min, timeout after 24 h).
4. Once detected, auto-configure polling job and send grower a confirmation email.

**Alternative (Grower provides API key):**
1. Grower generates API Key/Secret at `weatherlink.com/account`.
2. Pastes both into Graft Spray onboarding form (secure input).
3. Graft Spray validates by calling `/stations` — if ≥1 station returned, store credentials.

Station share is preferable because it avoids Graft Spray handling the grower's full API credentials.

### 8.2 Pessl FieldClimate

**OAuth 2.0 Authorization Code flow (cleanest):**
1. Graft Spray onboarding displays "Connect FieldClimate" button.
2. User is redirected to `https://oauth.fieldclimate.com/authorize?response_type=code&client_id=<GS_CLIENT_ID>&state=xyz`.
3. Grower logs in to FieldClimate and clicks "Allow".
4. Redirected back to Graft Spray callback URL with `?code=<auth_code>`.
5. Graft Spray exchanges code for access + refresh tokens; stores securely.
6. Calls `GET /user/stations` to enumerate devices.

**Alternative (HMAC key paste):**
1. Grower navigates FieldClimate UI: User menu → API services → FieldClimate → Copy public/private HMAC keys.
2. Pastes both into Graft Spray form.
3. Graft Spray validates by calling `GET /user` — if 200 returned, store keys.

The OAuth button is strongly preferred for user experience and security (no credential copy-paste).

### 8.3 METER ZENTRA Cloud

**Organization invite (recommended):**
1. Graft Spray onboarding: *"Invite our service account to your ZENTRA Cloud organization."*
2. Provides the email `ingest@graftspray.com` to invite.
3. Grower logs into ZENTRA Cloud → Organization Settings → Invite User → enters the email with Editor role.
4. Graft Spray service account accepts the invite (automated via email verification flow).
5. Service account token can now query all devices in the organization.

**Alternative (token paste):**
1. Grower copies their ZENTRA API token from ZENTRA Cloud → User Account → Integrations.
2. Pastes into Graft Spray form. Graft Spray stores per-grower.

The invite approach is better long-term but METER does not currently support OAuth; the org-invite flow requires some manual steps on both sides.

**Critical UX note for METER:** During onboarding, prominently inform growers with ATMOS-41 (no leaf wetness) that Graft Spray will use estimated leaf wetness and explain the fallback algorithm. Growers with PHYTOS-31 sensors should be prompted to note their ZL6 port assignment.

### 8.4 Universal Onboarding Principles

- **Progressive disclosure:** Ask for station credentials only after the grower has confirmed their hardware type in a previous step.
- **Test & confirm:** Always make a test API call during onboarding and show the grower which stations/devices were found before finalizing.
- **Platform-specific help links:** Each platform has its own UI quirks; provide step-by-step guides per platform with up-to-date screenshots.
- **Credential rotation handling:** Prompt growers to notify Graft Spray when they regenerate API keys/tokens (all three platforms require this).
- **Sensor inventory display:** After linking, show growers which sensors Graft Spray found, which are mildew-relevant, and which are missing (e.g., leaf wetness gap on ZENTRA ATMOS-41-only deployments).

---

## 9. Sources

| ID | Type | Title / Description | URL | Access |
|---|---|---|---|---|
| S1 | Vendor doc | WeatherLink v2 API — Authentication | https://weatherlink.github.io/v2-api/authentication | Open |
| S2 | Vendor doc | WeatherLink v2 API — API Signature Calculator (legacy) | https://weatherlink.github.io/v2-api/api-signature-calculator | Open |
| S3 | Vendor doc | WeatherLink v2 API — Introduction & Station Access | https://weatherlink.github.io/v2-api/ | Open |
| S4 | Vendor doc | WeatherLink v2 API — API Use Cases | https://weatherlink.github.io/v2-api/api-use-cases | Open |
| S5 | Vendor doc | WeatherLink v2 API — Data Permissions (Basic/Pro/Pro+) | https://weatherlink.github.io/v2-api/data-permissions | Open |
| S6 | Vendor doc | WeatherLink v2 API — Rate Limits | https://weatherlink.github.io/v2-api/rate-limits | Open |
| S7 | Vendor doc | WeatherLink Real-time Data Feed — Introduction | https://weatherlink.github.io/real-time-data-feed/ | Open |
| S8 | Community | WeatherLink v2 API in Python 3 (Gist) | https://gist.github.com/grfiv/b92970891211c55f4b9e1faba50ba3a6 | Open |
| S9 | Forum | Davis WeatherLink API v2 node server beta (Universal Devices Forum) | https://forum.universal-devices.com/topic/41842-davis-weatherlink-api-v2-node-server-available-in-beta-store/ | Open |
| S10 | Vendor doc | FieldClimate API v2 Documentation | https://api.fieldclimate.com/v2/docs/ | Open |
| S11 | Vendor doc | FieldClimate HMAC Authentication Guide | https://support.metos.at/support/solutions/articles/15000046769-hmac | Open |
| S12 | Vendor doc | FieldClimate Manual — Data Transfer & Logging Intervals | https://metos.global/en/fieldclimate-manual/ | Open |
| S13 | Vendor doc | FieldClimate API — Tiers, Data Access & Pricing | https://support.metos.at/support/solutions/articles/15000057116-fieldclimate-api-tiers-data-access-pricing | Open |
| S14 | Community | python-fieldclimate (agrimgt GitHub); rfieldclimate (CRAN) | https://github.com/agrimgt/python-fieldclimate | Open |
| S15 | Vendor doc | ZENTRA Cloud — Push API (Endpoint Configuration) | https://docs.zentracloud.com/l/en/article/39tw3ctj9n-api-endpoint | Open |
| S16 | Vendor doc | ZENTRA Cloud v5 API Documentation | https://docs.zentracloud.com/l/en/article/zjky832943-api-v5 | Open |
| S17 | Vendor doc | ZENTRA Cloud US Server API v4 | https://docs.zentracloud.com/l/en/article/gbv2iyxhar-api-v-3-0-us | Open |
| S18 | Vendor doc | ZENTRA Cloud 2.0 — FAQ & Subscriptions | https://docs.zentracloud.com/l/en/article/dpas1gauha-zentra-cloud-2-0-frequently-asked-questions-faq | Open |
| S19 | Vendor doc/manual | ATMOS 41 Integrator Guide — Measurement Specifications | https://www.labcell.com/media/136777/atmos-41%20integrators%20guide.pdf | Open |
| S20 | Product page | METER ATMOS 41 Gen 2 Product Page | https://metergroup.com/products/atmos-41/ | Open |
| S21 | Vendor doc | ZL6 Manual — Datalogger Specifications | https://www.labcell.com/media/145541/zl6%20manual.pdf | Open |
| S22 | Vendor doc | ZENTRA Cloud Subscription Plans | https://docs.zentracloud.com/l/en/article/zp98kwg184-subscription-plans | Open |
| S23 | Company | Sencrop — Confluent Case Study (35,000 IoT stations) | https://www.confluent.io/customers/sencrop/ | Open |
| S24 | Vendor doc | Sencrop Partners API | https://developer.sencrop.com/partners/ | Open |
| S25 | Vendor doc | Sencrop API Guide — Measures, Units, Rate Limits | https://developer.sencrop.com/guide/ | Open |
| S26 | Vendor doc | Sencrop Developer Tools — JS SDK | https://developer.sencrop.com/tools/ | Open |
| S27 | Product manual | Davis Leaf Wetness Sensor 0–15 Scale (GroWeather manual) | https://envcoglobal.com/wp-content/uploads/2014/10/leafwetnesssensor-manual-2008.pdf | Open |
| S28 | Review paper | Pascoal D et al. (2024). IoT Sensors for Precision Agriculture/Viticulture — sensor selection, leaf wetness, sensor fusion. *Scientific Reports* 14:29551. | https://www.nature.com/articles/s41598-024-80924-y | Open |
| S29 | IoT/disease | Trilles S et al. (2018/2019). IoT sensor suite for real-time vineyard disease prediction (downy mildew, powdery mildew, botrytis, black rot) using air temperature, RH, wind, precipitation, soil temperature. Cited in [S28]. | — | Paywalled [P1] |
| S30 | IoT/disease | Bălăceanu et al. (2021). Multi-sensor platform: climatic + leaf wetness + soil parameters for pest/disease prevention. Cited in [S28]. | — | Paywalled [P2] |
| S31 | Ag ML | Machine Learning Rebuilds Missing Vineyard Sensor Data (Graph Autoencoder; Vinetur report on Preprints.org preprint, 2026). | https://www.vinetur.com/en/2026042899821/machine-learning-rebuilds-missing-vineyard-sensor-data.html | Open |
| S32 | Deep learning | SADF-Net: Deep learning timeseries prediction for precision field crop protection (SADF-Net + RAADA; Frontiers in Plant Science, 2025). | https://pmc.ncbi.nlm.nih.gov/articles/PMC12183171/ | Open |
| S33 | Vineyard IoT | TU Wien AIoT — Agricultural IoT infrastructure for microclimate monitoring in vineyards; sensor fusion at edge. | https://publik.tuwien.ac.at/files/publik_275936.pdf | Open |
| S34 | LoRa vineyard | LoRa-Based IoT Multi-Hop Architecture for Smart Vineyard Monitoring (PMC, 2026). | https://pmc.ncbi.nlm.nih.gov/articles/PMC12944410/ | Open |
| S35 | Ag IoT review | Systematic Review of IoT Solutions for Smart Farming (Sensors, Basel, 2020). | https://pmc.ncbi.nlm.nih.gov/articles/PMC7436012/ | Open |
| S36 | Vendor doc | WeatherLink v2 API — Data Structure Types | https://weatherlink.github.io/v2-api/data-structure-types | Open |
| S37 | Vendor doc | WeatherLink v2 API — Sensor Catalog | https://weatherlink.github.io/v2-api/sensor-catalog | Open |
| S38 | Forum | Weatherlink.com API frequency — 1,000 calls/hr confirmed | https://discourse.weather-watch.com/t/weatherlink-com-api-frequency/75317 | Open |
| S39 | Vendor doc | FieldClimate API documentation (METOS support center) | https://support.metos.at/support/solutions/articles/15000061601-fieldclimate-api-documentation | Open |
| S40 | Product brochure | ATMOS 41 All-in-One Weather Station Brochure (Campbell Sci reseller) | https://s.campbellsci.com/documents/ca/product-brochures/atmos41_br.pdf | Open |

---

*Paywalled references [P1], [P2] appended to `/home/user/workspace/graft-spray/research/paywalled_queue.md` with tag `[09-sensors]`.*
