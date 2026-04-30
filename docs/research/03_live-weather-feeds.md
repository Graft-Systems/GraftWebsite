# Live Weather & Climate Data Feeds for Vineyard Mildew Forecasting

> **Document version:** 2025-01-26  
> **Category:** Brain §3 — Live Weather Feeds  
> **Project:** Graft Spray — Powdery & Downy Mildew Decision Support  
> **Umbrella goal:** Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

---

## Summary

This dossier evaluates **23 weather data sources** for integration into a mildew spray-decision platform targeting four priority wine regions: Napa/Sonoma (California), Burgundy and Bordeaux (France), and Mendoza (Argentina). Sources range from free government APIs to premium commercial feeds and proprietary on-farm sensor networks. The single most critical variable for mildew modelling — **leaf wetness duration** — is available natively from only a minority of grid-model APIs; most require either on-farm hardware sensors or derived estimates from temperature, RH, dew point, and wind. The recommended production stack pairs a global NWP backbone (Tomorrow.io or Meteomatics) with in-appellation sensor networks (Davis WeatherLink / Sencrop / Pessl FieldClimate) and free government data layers for validation.

---

## Key Findings

1. **Leaf wetness is the bottleneck.** Only Visual Crossing, Meteomatics, Pessl FieldClimate, Davis WeatherLink (hardware sensor), Onset HOBOlink (hardware sensor), Sencrop (hardware sensor), METER Zentra (hardware sensor), and Cornell NEWA provide real or derived leaf wetness data. Most consumer weather APIs (OpenWeather, AccuWeather, Tomorrow.io Core, Weatherbit Standard/Plus) do not.

2. **Free government data is excellent for California and France.** NOAA NWS/NDFD and UC IPM cover Napa/Sonoma; Météo-France (free since 2024 via meteo.data.gouv.fr) provides hourly analysis for Burgundy/Bordeaux; AEMET OpenData covers Spain. These are strong calibration and fallback layers.

3. **Argentina is the hardest region to serve.** SMN provides WRF 4-km forecasts on AWS Open Data (free) but no leaf wetness. INTA's agroclimatic network is the best in-country source but lacks a public REST API. Commercial providers (Tomorrow.io, Meteomatics, Visual Crossing) all cover Mendoza but with lower station density.

4. **Commercial leaders for vineyard-grade forecasting:** Tomorrow.io (agriculture plan), Meteomatics (leaf wetness + phytophthora model), and Visual Crossing (leaf wetness CART model, corporate tier) offer the best combination of leaf wetness, global coverage, and developer-friendly APIs.

5. **ECMWF ERA5** is essential for **historical backfill** (80+ years, global, 31 km resolution, free via Copernicus CDS) but not for real-time operations due to ~5-day processing latency.

6. **Copernicus/Sentinel Hub** provides valuable satellite-derived soil moisture and NDVI proxies but operates on a 2–5 day revisit cadence — useful for seasonal risk context, not hourly spray decisions.

7. **Pricing is highly variable and changes rapidly.** All per-call pricing below is sourced from provider documentation as of **January 2025** — check linked pricing pages before budgeting.

---

## Comparison Matrix

| # | Provider | Leaf Wetness? | Coverage (Napa/Sonoma, Burgundy, Bordeaux, Mendoza) | Spatial Res | Temporal Res | Pricing (Free / Paid) | Best Region(s) | Source |
|---|----------|--------------|------------------------------------------------------|-------------|-------------|----------------------|---------------|--------|
| 1 | NOAA NWS / NDFD | ✗ No | **Napa/Sonoma: High** / Burgundy: No / Bordeaux: No / Mendoza: No | 2.5 km (CONUS) | 1 h forecast, 7-day | Free (US Gov) | Napa/Sonoma | [S1] |
| 2 | OpenWeather One Call 3.0 | ✗ No | Med / Med / Med / Med | ~5 km | 1 h / 8-day | Free 1,000 calls/day; $0.0015/call over | Global | [S2] |
| 3 | Tomorrow.io | ✗ Core; Soil $$$ | High / High / High / High | 1 km | 1 min–15 min / 21-day | Free 500 req/day; paid tiers custom | Global | [S3] |
| 4 | Visual Crossing | ✓ **Yes (CART model)** | High / High / High / High | ~5 km | 1 h / 15-day | Free 1,000 rec/day; $0.0001/rec; ~$35/mo Pro | Global | [S4] |
| 5 | Meteomatics | ✓ **Yes (binary idx)** | High / High / High / High | 90 m–1 km | 30 min–1 h / 14-day | Free basic; Business by config | Global | [S5] |
| 6 | Météo-France | ✗ No | N/A / **Burgundy: High** / **Bordeaux: High** / N/A | 1.3 km (AROME) | 1 h / 4-day | **Free** (public data 2024) | Burgundy, Bordeaux | [S6] |
| 7 | AEMET OpenData | ✗ No | N/A / N/A / N/A / N/A (Spain only) | Station-based | 1 h obs / 7-day NWP | **Free** (API key) | Spain (not priority) | [S7] |
| 8 | SMN Argentina + INTA | ✗ No | N/A / N/A / N/A / **Mendoza: High** | 4 km (WRF) | 1 h / 72-h forecast | **Free** (AWS Open Data) | Mendoza | [S8] |
| 9 | Davis WeatherLink | ✓ **Yes (sensor)** | Napa: High / Med / Med / Med | Hyperlocal | 1 min–15 min | Free basic; $3.95–$8.95/mo/device | All (hardware req.) | [S9] |
| 10 | METER ATMOS-41 / Zentra | ✓ **Yes (sensor)** | Napa: High / Med / Med / Med | Hyperlocal | 5–60 min | $230/yr+hardware | All (hardware req.) | [S10] |
| 11 | Adcon / OTT HydroMet | ✓ **Yes (sensor)** | Med / Med / Med / Med | Hyperlocal | Configurable | Hardware + subscription, quote | All (hardware req.) | [S11] |
| 12 | Onset HOBOlink | ✓ **Yes (sensor)** | Napa: High / Med / Med / Med | Hyperlocal | 5 min–1 h | $99–$399/yr/device | All (hardware req.) | [S12] |
| 13 | Cornell NEWA | ✓ **Yes (meas. + calc.)** | **Napa: Med** / No / No / No | Station network | 1 h / 5-day | **Free** | NE US / Napa (partial) | [S13] |
| 14 | UC IPM Weather | ✓ **Yes (CIMIS calc.)** | **Napa/Sonoma: High** / No / No / No | Station network | 1 h / daily | **Free** | Napa/Sonoma | [S14] |
| 15 | Sencrop | ✓ **Yes (sensor)** | N/A / **High** / **High** / N/A | Hyperlocal | 15–20 min | ~€18.9/mo; hardware £300–350 | Burgundy, Bordeaux | [S15] |
| 16 | Pessl / Metos FieldClimate | ✓ **Yes (sensor + virtual)** | Napa: Med / **High** / **High** / Med | Hyperlocal | 15 min | Hardware + FieldClimate sub | Global (best EU) | [S16] |
| 17 | ECMWF ERA5 | ✗ No (reanalysis only) | High / High / High / High | ~31 km | 1 h (historical) | **Free** via CDS | Global (historical) | [S17] |
| 18 | Sentinel Hub / Copernicus | ✗ No (proxy via SWI) | High / High / High / High | 10 m–1 km | 2–5 day revisit | Free trial; Basic ~€100/mo | Global (satellite) | [S18] |
| 19 | AccuWeather | ✗ No | High / High / High / High | City/grid | 1 h / 15-day | Free 500 calls/day; $25–$500/mo | Global | [S19] |
| 20 | Weatherbit | ✗ Standard; Ag data $$$ | High / High / High / High | 0.25° (~28 km) | 1 h / 16-day | Free 50 req/day; Business req. for Ag | Global | [S20] |
| 21 | AgroMonitoring | ✗ No | High / High / High / High | 0.25° | 3 h / 5-day | Free <500/day; £20–£200/mo | Global | [S21] |
| 22 | John Deere Ops Center | ✗ No | Napa: High / Med / Med / Med | Machine-level | Machine telematics | Free (JD ecosystem only) | Napa/Sonoma (JD farms) | [S22] |
| 23 | Open-Meteo | ✗ No | High / High / High / High | 1–11 km | 1 h / 16-day | **Free** (non-commercial); from ~€29/mo commercial | Global | [S23] |

---

## Detailed Notes

### 1. NOAA NWS / NDFD
**Owner:** U.S. National Oceanic and Atmospheric Administration (federal)

- **Coverage:** Continental US only (CONUS); excellent density for Napa Valley and Sonoma County. No international coverage.
  - Napa/Sonoma: ★★★ High — dense station network, NWS forecast offices in Sacramento and Bay Area
  - Burgundy: ✗ None
  - Bordeaux: ✗ None
  - Mendoza: ✗ None
- **Spatial resolution:** 2.5 km grid for NDFD (digital forecast); point observations from ASOS/AWOS/CoCoRaHS stations
- **Temporal resolution:** Current observations near-real-time; hourly forecasts 1 h intervals; 7-day forecast horizon; 15-minute data from some ASOS stations
- **Leaf wetness:** ✗ Not available natively. No NDFD element for leaf wetness; must derive from RH + dew point + temp.
- **Other key variables:** Temperature (2m), RH, dew point, precipitation (QPF), wind speed/direction, sky cover, PoP, surface pressure. Solar radiation via US National Solar Radiation Database (NSRDB, separate). Soil moisture not available.
- **API endpoints:**
  - REST: `https://api.weather.gov/points/{lat},{lon}` → gridpoint → hourly/daily forecast [S1]
  - Legacy SOAP/XML NDFD: `https://digital.weather.gov/xml/rest.php` [S1b]
  - Authentication: None (public API key optional via registration for higher rate limits)
  - Rate limits: Unspecified; unofficial ~1,000 req/day per IP recommended; no SLA
  - Formats: JSON (api.weather.gov), XML/DWML (legacy NDFD)
- **Pricing:** **Free** — US federal government open data. No commercial restrictions for US-only use.
- **Latency:** Near-real-time observations (5–15 min delay); forecasts updated every hour
- **Historical data:** NCEI Climate Data Online (CDO) provides historical observations; automated API access via NCEI Web Services (`https://www.ncdc.noaa.gov/cdo-web/webservices/v2`). Backfill: unlimited (century+).
- **Suitability:** Napa/Sonoma ★★★ High — best free baseline for California. No use for EU or Argentina.
- **Reliability/SLA:** No formal SLA. Generally very high uptime but occasional maintenance windows. Not recommended as sole production source.
- **License:** U.S. Government public domain (17 U.S.C. § 105). Commercial use permitted.

---

### 2. OpenWeather One Call API 3.0
**Owner:** OpenWeather Ltd (private, UK-based)

- **Coverage:** Global via NWP model fusion. All four priority regions covered.
  - Napa/Sonoma: ★★ Med — grid interpolation; local station obs included
  - Burgundy: ★★ Med — model data good; regional station density adequate
  - Bordeaux: ★★ Med — same
  - Mendoza: ★★ Med — sparser station coverage; model-based
- **Spatial resolution:** ~5 km proprietary model; station obs within ~1 km
- **Temporal resolution:** Current + 1-min nowcast (48h); hourly (96h); daily (8-day); historical archive 47+ years [S2]
- **Leaf wetness:** ✗ **Not available** in any One Call 3.0 tier. Standard variables only.
- **Other key variables:** Temperature, humidity, dew point, precipitation, wind, UV index, cloud cover, visibility. No soil moisture, ET₀, or solar radiation in standard tiers. Agriculture-specific data requires separate [AgroMonitoring API] (Provider #21).
- **API endpoints:**
  - `https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&appid={key}` [S2]
  - Authentication: API key (Bearer token in query string)
  - Rate limits: Free — 1,000 calls/day; calls reset daily at midnight UTC [S2]
  - Formats: JSON
- **Pricing:** (as of Jan 2025, [S2])
  - Free: 1,000 calls/day; 1.5 years historical included
  - Pay-as-you-go: $0.0015 per call over daily free limit
  - Professional plans ($40–$200+/mo) unlock higher rate limits, 10-min update cycle, 99.5–99.9% SLA
- **Latency:** Real-time (every 10 min update cycle on paid; every 2 h on free)
- **Historical:** 47+ years via One Call 3.0 Timemachine endpoint; daily aggregation available
- **Suitability:** All regions ★★ Med — good general weather; lack of leaf wetness limits direct use in mildew models. Useful as secondary source.
- **Reliability/SLA:** 95% (free/starter), 99.5–99.9% (professional)
- **License:** Commercial use permitted on paid plans. Free tier is non-commercial by ToS for production apps.

---

### 3. Tomorrow.io
**Owner:** Tomorrow.io Inc. (private, Boston MA); formerly ClimaCell

- **Coverage:** Global; strong hyperlocal model (1 km) based on fused NWP + satellite + crowd data
  - Napa/Sonoma: ★★★ High
  - Burgundy: ★★★ High
  - Bordeaux: ★★★ High
  - Mendoza: ★★★ High (though sparser in-situ observations)
- **Spatial resolution:** 1 km
- **Temporal resolution:** 1-min nowcast (6 h); 5-min (next few hours); hourly (21-day forecast) [S3]
- **Leaf wetness:** ✗ **Not in Core plan.** Core 25 parameters do not include leaf wetness [S3b]. Soil moisture is a **Premium Layer** requiring sales contact (price undisclosed) [S3c]. No official leaf wetness parameter documented as of Jan 2025.
- **Other key variables (Core):** Temperature, feels-like, dew point, humidity, precipitation, accumulation, snow depth, wind speed/direction/gust, sea-level pressure, visibility, cloud cover, UV index, thunder probability [S3b]. Premium: soil moisture at 0–200 cm depths, soil temperature [S3c], air quality, pollen.
- **API endpoints:**
  - Realtime: `https://api.tomorrow.io/v4/weather/realtime?location={lat,lon}&apikey={key}` [S3]
  - Forecast: `https://api.tomorrow.io/v4/weather/forecast`
  - Authentication: API key in header or query string
  - Rate limits (Free): 500 req/day; 25 req/hr; 3 req/sec [S3d]
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S3a])
  - Free: 500 req/day; core parameters only
  - API Plan: tiered by call volume; pricing custom/quote-based (contact sales)
  - Enterprise: Agriculture Plan with custom premium layers; pricing by negotiation
- **Latency:** Near-real-time (updates every 1–10 min)
- **Historical:** Available via historical endpoint; 7+ years
- **Suitability:** All four regions ★★★ High for general weather; downgraded to ★★ Med for mildew if leaf wetness unavailable without agriculture premium
- **Reliability/SLA:** Advertised 99.9% uptime on enterprise plans [S3]
- **License:** Commercial use on paid plans; free plan not for commercial production

---

### 4. Visual Crossing Weather
**Owner:** Visual Crossing Corporation (private, US)

- **Coverage:** Global
  - Napa/Sonoma: ★★★ High
  - Burgundy: ★★★ High
  - Bordeaux: ★★★ High
  - Mendoza: ★★★ High
- **Spatial resolution:** ~5 km grid interpolated from global NWP + station obs
- **Temporal resolution:** Hourly current + sub-hourly history (paid); 15-day forecast; 50+ years historical [S4]
- **Leaf wetness:** ✓ **YES** — binary hourly leaf wetness (`leafwetness`, 0/1) and daily hours of leaf wetness (`leafwetnesshours`) calculated via CART model (Gleason et al. 1994) using temperature, dew point, RH, and wind speed [S4a]. Available in all plan tiers including free.
- **Other key variables:** Temperature, dew point, RH, precipitation, wind, UV index, cloud cover, solar radiation, soil temperature (0–100 cm, Corporate+), soil moisture (Corporate+), ET₀ (Corporate+), degree days (Corporate+) [S4]
- **API endpoints:**
  - `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{location}` [S4a]
  - Parameters: `elements=leafwetness,leafwetnesshours,temp,humidity,...`
  - Authentication: API key in query string
  - Rate limits: Free — 1,000 records/day; Metered — unlimited (pay per record); Professional — 10M records/mo
  - Formats: JSON, CSV
- **Pricing:** (as of Jan 2025 [S4b])
  - **Free:** 1,000 records/day; commercial use permitted
  - **Metered:** $0.0001 per record (pay-as-you-go)
  - **Professional:** ~$35/mo (10M records/mo, single-user) [S4c]
  - **Corporate:** ~$150/mo (unlimited, includes soil + ET₀)
  - **Enterprise:** Custom
- **Latency:** Near-real-time (observations ~10–15 min lag)
- **Historical:** 50+ years; sub-hourly history on Metered/Corporate
- **Suitability:** All regions ★★★ High — best value option with leaf wetness included in free tier. One of only two consumer APIs with derived leaf wetness.
- **Reliability/SLA:** 99.9% uptime guarantee [S4d]
- **License:** Commercial use permitted on all tiers with attribution

---

### 5. Meteomatics
**Owner:** Meteomatics AG (private, St. Gallen, Switzerland)

- **Coverage:** Global; strong in Europe; 90 m downscaling available for select regions
  - Napa/Sonoma: ★★★ High
  - Burgundy: ★★★ High (European high-resolution model)
  - Bordeaux: ★★★ High
  - Mendoza: ★★ Med
- **Spatial resolution:** 90 m–1 km (downscaled); native NWP 1–5 km
- **Temporal resolution:** 30-min for most parameters; 1-min nowcast; forecasts to 14 days; climate scenarios to 2100 [S5]
- **Leaf wetness:** ✓ **YES** — `leaf_wetness:idx` binary index at 30-min resolution [S5a]. Calculated from atmospheric dewfall/fog model.
- **Other key variables:** All standard met variables + evapotranspiration, growing degree days, grassland temperature sum, phytophthora negative prognosis (disease prevention model), most-similar-year climate analog, soil moisture, soil frost depth, ET₀, solar radiation [S5a]
- **API endpoints:**
  - URL format: `https://api.meteomatics.com/{valid_time_period}/{parameter}/{lat,lon}/json` [S5a]
  - Authentication: HTTP Basic Auth (username:password)
  - Rate limits: Free tier — limited daily call budget; Business — configurable
  - Formats: JSON, CSV, NetCDF, PNG/GeoTIFF
- **Pricing:** (as of Jan 2025 [S5b])
  - **Free Basic Package:** Limited access, non-commercial
  - **14-day Free Trial:** Full access
  - **Business API Package:** Price based on configuration (call volume + parameter set); contact sales
  - Weather Data Shop: one-time dataset downloads
- **Latency:** Real-time (updates every 30 min–1 h); includes ECMWF AIFS-ENS 90 m downscaling (Dec 2025) [S5]
- **Historical:** 50+ years via ERA5 integration; seamless historical/forecast API
- **Suitability:**
  - Napa/Sonoma: ★★★ High
  - Burgundy: ★★★ High — best European NWP resolution
  - Bordeaux: ★★★ High
  - Mendoza: ★★ Med
- **Reliability/SLA:** Enterprise SLA available; Swiss-hosted infrastructure
- **License:** Commercial use on paid plans; strict ToS for free tier (non-commercial only)

---

### 6. Météo-France (meteo.data.gouv.fr + API portail)
**Owner:** Météo-France (French state meteorological service); data open since 1 Jan 2024 [S6]

- **Coverage:** Metropolitan France + overseas territories
  - Napa/Sonoma: ✗ None
  - Burgundy: ★★★ High — AROME 1.3 km hourly model; dense station network
  - Bordeaux: ★★★ High — same; CIMEL agroclimatic stations
  - Mendoza: ✗ None
- **Spatial resolution:** AROME NWP: 1.3 km; ARPEGE global: ~5 km; station obs: point data
- **Temporal resolution:** AROME updates every 1 h; hourly forecasts to 48 h; ARPEGE to 5 days; observations at 1–6 h intervals [S6a]
- **Leaf wetness:** ✗ **Not available** as explicit variable. Must derive from RH, dew point, precipitation, and wind via algorithms such as those in NEWA or Visual Crossing. Agroclimatic network data (IFV/CIMEL) occasionally includes leaf wetness sensors but no public API.
- **Other key variables:** Temperature, RH, dew point, precipitation, wind, solar radiation, snow cover, cloud base; some SYNOP stations include soil temperature. ET₀ derivable.
- **API endpoints:**
  - Public API portal: `https://portail-api.meteofrance.fr/` (requires free registration)
  - Also accessible via Open-Meteo Météo-France endpoint: `https://api.open-meteo.com/v1/meteofrance` [S6b]
  - Authentication: API key (free registration on portail-api.meteofrance.fr)
  - Rate limits: 50 req/min (data.gouv.fr API) [S6c]
  - Formats: JSON, GRIB2, NetCDF
- **Pricing:** **Free** (all public data open under Licence Ouverte 2.0 as of Jan 2024) [S6]. Commercial reuse permitted.
- **Latency:** Near-real-time; AROME 1-h update cycle
- **Historical:** Archive via meteo.data.gouv.fr; climatological station data unlimited backfill (decades)
- **Suitability:** Burgundy/Bordeaux ★★★ High for temperature/RH/rain; leaf wetness gap must be bridged with algorithm.
- **Reliability/SLA:** State service; high availability; no formal SLA for public API
- **License:** Licence Ouverte 2.0 (compatible with CC BY); commercial use permitted

---

### 7. AEMET OpenData
**Owner:** Agencia Estatal de Meteorología (AEMET), Spain (government)

- **Coverage:** Spain + Balearic and Canary Islands only
  - Napa/Sonoma: ✗ None
  - Burgundy: ✗ None
  - Bordeaux: ✗ None (French side only)
  - Mendoza: ✗ None
  - Note: Covers Rioja, Ribera del Duero, and other Spanish wine regions for future expansion
- **Spatial resolution:** Station obs (point); NWP grid ~3–5 km (HARMONIE-AROME)
- **Temporal resolution:** Hourly observations; 7-day forecasts; 10-min data (planned per EU regulation)
- **Leaf wetness:** ✗ Not available. Observation variables include temperature, precipitation, humidity, pressure, wind, visibility, fog — no leaf wetness.
- **Other key variables:** Temperature (air, soil, subsoil), precipitation, wind speed/direction, humidity, pressure, solar radiation via SIAR (separate). SIAR (Sistema de Información Agroclimática para el Regadío) provides ET₀.
- **API endpoints:**
  - REST API: `https://opendata.aemet.es/opendata/api/` [S7]
  - Authentication: Free API key from `https://opendata.aemet.es/centrodedescargas/obtencionAPIKey`
  - Rate limits: Not published; de-facto ~50–100 req/min
  - Formats: JSON, GRIB
- **Pricing:** **Free** — open data under AEMET terms (commercial reuse permitted per EU regulation)
- **Latency:** Observations updated every 30 min to 2 h; forecast products daily
- **Historical:** Climatological values unlimited backfill (1920s+); validated daily data 4-day lag
- **Suitability:** Spain wine regions ★★★ High; four priority regions ★ Low (no coverage)
- **Reliability/SLA:** State service; good uptime; no formal SLA
- **License:** Reutilización de información del sector público (RISP Plan); commercial use permitted

---

### 8. SMN Argentina + INTA Agroclimatic Network
**Owner:** Servicio Meteorológico Nacional (SMN) — Argentine federal government; INTA — Instituto Nacional de Tecnología Agropecuaria

- **Coverage:** Argentina, Chile, Uruguay, Paraguay, parts of Bolivia and Brazil (WRF domain)
  - Napa/Sonoma: ✗ None
  - Burgundy: ✗ None
  - Bordeaux: ✗ None
  - Mendoza: ★★★ High — SMN offices in Mendoza; INTA Mendoza Experimental Station; EEA San Juan
- **Spatial resolution:** WRF forecast: 4 km; station obs: point data (~100 active SMN stations; ~50+ INTA agroclimatic stations in Cuyo region)
- **Temporal resolution:** Hourly surface variables (temperature, RH, wind, precipitation); 72-h forecast horizon; 00 and 12 UTC initialization [S8]
- **Leaf wetness:** ✗ **Not available** via public API. Some INTA field stations may have physical sensors; no programmatic access confirmed.
- **Other key variables:** 2m temperature, 2m RH, 10m wind magnitude/direction, precipitation (hourly + daily), min/max temperature. INTA adds ET₀, soil temperature, some soil moisture at experimental stations.
- **API endpoints:**
  - **AWS Open Data (free):** `s3://smn-ar-wrf/` (us-west-2) [S8] — WRF NetCDF files; no AWS account required
  - `aws s3 ls --no-sign-request s3://smn-ar-wrf/`
  - SMN station observations: `https://www.smn.gob.ar/` (manual download; no full REST API)
  - INTA Red Agrometeorológica: `https://inta.gob.ar/red-agrometeoeologica` — data accessible via regional portals; no universal REST API
  - Authentication: None (S3 open data)
  - Formats: NetCDF (WRF); CSV (station observations via web)
- **Pricing:** **Free** — both SMN and INTA are government public services
- **Latency:** WRF forecast files posted ~3–4 h after initialization; station obs 1–6 h lag
- **Historical:** Limited public archive; SMN historical station data available on request
- **Suitability:** Mendoza ★★★ High for core met variables; leaf wetness requires algorithm or hardware supplement
- **Reliability/SLA:** Good for forecast file ingestion via S3; station API informal only
- **License:** Argentine government public data; commercial reuse generally permitted per national open data policy
- **Contact:** odp-aws@smn.gov.ar (per AWS registry)

---

### 9. Davis Instruments WeatherLink Live + WeatherLink Cloud API
**Owner:** Davis Instruments (private, now owned by Harvest Technology Group; Hayward, CA)

- **Coverage:** Hyperlocal on-farm hardware. WeatherLink Network has ~30,000+ public stations globally; high density in California wine country. European and Argentine coverage depends on user-deployed hardware.
  - Napa/Sonoma: ★★★ High (dense Davis network; many vineyards already equipped)
  - Burgundy: ★★ Med (some user stations; not systematic)
  - Bordeaux: ★★ Med
  - Mendoza: ★ Low (sparse)
- **Spatial resolution:** Per-station (exact vineyard block location)
- **Temporal resolution:** 1-min raw logging; API upload at 5-min (Pro) or 1-min (Pro+); 15-min (Basic) [S9]
- **Leaf wetness:** ✓ **YES** — via optional Leaf & Soil Moisture/Temperature Station (hardware add-on). 0–15 resistance scale (0 = dry, 15 = saturated). Up to 2 sensors per station. Must purchase sensor (~$150–200 USD).
- **Other key variables:** Temperature, RH, dew point, barometric pressure, precipitation (rain + snow), wind speed/direction, solar radiation, UV index, soil moisture (optional sensor), soil temperature (optional sensor)
- **API endpoints:**
  - v2 REST API: `https://api.weatherlink.com/v2/current/{station-id}?api-key={key}&api-secret={secret}` [S9b]
  - Authentication: API key + secret; HMAC-SHA256 signature
  - Rate limits: 15-min (Basic); 5-min (Pro); 1-min (Pro+) for API access
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S9])
  - **Basic:** Free (15-min 3rd-party interval)
  - **Pro:** $3.95/mo per device (5-min interval, 6 pro shares)
  - **Pro+:** $8.95/mo per device (1-min interval, 10 pro shares)
  - Hardware: Vantage Pro2 station ~$895–$1,200; Leaf Wetness sensor ~$145; WeatherLink Live ~$300
- **Latency:** Real-time (1–15 min depending on plan)
- **Historical:** Full archive on WeatherLink.com; depends on account plan
- **Suitability:** Best where hardware already deployed; ideal for Napa/Sonoma vineyards
- **Reliability/SLA:** No published SLA; cloud platform generally reliable
- **License:** User data; API commercial use permitted on paid plans

---

### 10. METER Group ATMOS-41 / ZL6 + Zentra Cloud API
**Owner:** METER Group Inc. (private, Pullman, WA; subsidiary of METER Group AG, Germany)

- **Coverage:** On-farm hardware (global deployment). ATMOS-41 is a 10-variable compact all-in-one weather station.
  - Napa/Sonoma: ★★★ High (popular in California research vineyards)
  - Burgundy: ★★ Med
  - Bordeaux: ★★ Med
  - Mendoza: ★ Low
- **Spatial resolution:** Per-station hyperlocal
- **Temporal resolution:** 5-min or 60-min upload on cellular ZL6; unrestricted on WiFi [S10]
- **Leaf wetness:** ✓ **YES** — METER PHYTOS 31 leaf wetness sensor compatible with ZL6; measures electrical capacitance 0–100% wetness. Also: ATMOS 41 includes precipitation + RH for derived wetness. Hardware add-on (~$135) [S10b]
- **Other key variables (ATMOS-41):** Solar radiation, precipitation, barometric pressure, RH, temperature (air + wetbulb), wind speed/direction/gust, lightning count/distance, vapor pressure deficit (VPD)
- **API endpoints:**
  - Zentra Cloud API: `https://zentracloud.com/api/v4/` [S10]
  - Authentication: Token-based (Bearer)
  - Rate limits: Standard plan includes API access; 15-min plan for near real-time
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S10b])
  - **Standard Cellular:** $180/yr per device (60-min upload)
  - **15-Minute Cellular:** $230/yr per device
  - **Hardware:** ZL6 data logger ~$650; ATMOS-41 ~$1,820; complete system ~$2,700+
  - For AgWeatherNet integration (WA state): same pricing
- **Latency:** Near-real-time (5–60 min upload intervals)
- **Historical:** Full data archive in Zentra Cloud; user-controlled retention
- **Suitability:** Best for research-grade point monitoring; widely used in viticulture research [S10]
- **Reliability/SLA:** Research-grade hardware; Zentra Cloud platform generally reliable; no public SLA
- **License:** User data; API commercial use permitted

---

### 11. Adcon Telemetry / OTT HydroMet
**Owner:** ADCON Telemetry GmbH — now part of OTT HydroMet (a Xylem company), Vienna, Austria

- **Coverage:** Hardware deployable globally; European distributor network strong in France, Germany, Austria, Italy
  - Napa/Sonoma: ★ Low (limited US presence)
  - Burgundy: ★★★ High (strong European distributor network; addVANTAGE Pro platform)
  - Bordeaux: ★★★ High
  - Mendoza: ★ Low
- **Spatial resolution:** Hyperlocal per-station
- **Temporal resolution:** Configurable; 15–60 min typical; real-time with GPRS/GSM telemetry
- **Leaf wetness:** ✓ **YES** — physical leaf wetness sensor included in standard Adcon agricultural station configuration [S11]. Measures via resistance grid.
- **Other key variables:** Temperature, RH, precipitation intensity + total, wind speed/direction, solar radiation, soil moisture (multiple depths), soil temperature, ET₀ (calculated by addVANTAGE Pro platform)
- **API endpoints:**
  - addVANTAGE Pro platform: web-based cloud at `https://addvantage-pro.com` [S11b]
  - API access: REST API available to platform subscribers; requires contacting local distributor
  - Authentication: Username/password (HTTP Basic or session token)
  - Formats: JSON, CSV (per export)
- **Pricing:** Hardware purchase + annual software subscription; quote-based (contact local OTT HydroMet distributor). No published public pricing.
- **Latency:** Real-time (data posted within 1–5 min of collection)
- **Historical:** Full archive on addVANTAGE Pro; unlimited retention
- **Suitability:** Burgundy/Bordeaux ★★★ High if hardware deployed; offers disease models (Plasmopara, powdery mildew) within addVANTAGE Pro
- **Reliability/SLA:** Commercial support contract; SLA available; enterprise hardware is industrial-grade
- **License:** Commercial use; hardware + software EULA

---

### 12. Onset HOBOlink (LI-COR Cloud IoT Platform)
**Owner:** Onset Computer Corporation (acquired by LI-COR Biosciences); Bourne, MA, USA

- **Coverage:** Hardware-dependent; RX stations deployable globally; wide country list for cellular coverage [S12]
  - Napa/Sonoma: ★★★ High (popular in US research vineyards; integrates with NEWA)
  - Burgundy: ★★ Med (European deployments possible)
  - Bordeaux: ★★ Med
  - Mendoza: ★★ Med (Argentina listed in cellular coverage)
- **Spatial resolution:** Hyperlocal per-station
- **Temporal resolution:** 5-min (RX-Standard/Premium); hourly (RX-Basic) [S12]
- **Leaf wetness:** ✓ **YES** — S-LWA-M003 Leaf Wetness Smart Sensor (~$189) uses capacitive grid; less prone to surface residues than resistive sensors; integrates with RX3000 station [S12b]. Data exported via HOBOlink API.
- **Other key variables:** Temperature, RH, barometric pressure, precipitation, wind speed/direction, solar radiation, PAR, soil moisture (HOBO MX series), soil temperature
- **API endpoints:**
  - REST API (self-service): `https://api.hobolink.com/v1/` → now at LI-COR Cloud
  - Authentication: OAuth 2.0 (single endpoint)
  - Rate limits: Not published
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S12])
  - **RX-Basic Plan:** $99/yr per device (hourly upload, up to 10 measurements)
  - **RX-Standard Plan:** $199/yr per device (5-min upload, up to 25 measurements)
  - **RX-Premium Plan:** $399/yr per device (max logging rate, max sensors)
  - Hardware: RX3000 station ~$1,025; complete starter kit ~$1,899–$2,499
  - NEWA integration: HOBOlink station can feed Cornell NEWA directly (free); supports grape disease models
- **Latency:** Near-real-time (5-min on Standard/Premium)
- **Historical:** Full archive in HOBOlink/LI-COR Cloud
- **Suitability:** Napa/Sonoma ★★★ (NEWA integration, US grape disease models); Europe/Argentina ★★ (hardware deployable, no free model integration)
- **Reliability/SLA:** Commercial platform; no formal SLA published
- **License:** User data; API commercial use permitted

---

### 13. Cornell NEWA (Network for Environment and Weather Applications)
**Owner:** Cornell University, NY (public university); federally and state-funded cooperative extension program

- **Coverage:** Primarily US Northeast (New York, Pennsylvania, Vermont, etc.) + some Midwest and California stations. Free and open to all US users.
  - Napa/Sonoma: ★★ Med — some CIMIS + NOAA stations connected; grape models available for CA
  - Burgundy: ✗ None
  - Bordeaux: ✗ None
  - Mendoza: ✗ None
- **Spatial resolution:** Station network (~30 km spacing in NY; sparser elsewhere); uses NWS data to fill gaps
- **Temporal resolution:** Hourly observations + 5-day NWS-based forecast for model extension [S13]
- **Leaf wetness:** ✓ **YES** — physical sensor data where stations equipped; algorithm calculates leaf wetness from RH (>90% = wet) for stations without sensor [S13]. Used directly in grape powdery mildew, downy mildew, black rot, and Phomopsis models.
- **Other key variables:** Temperature, RH, precipitation, wind speed/direction, solar radiation, soil temperature (some stations)
- **API endpoints:**
  - No formal public REST API documented. Data accessible via web UI at `https://newa.cornell.edu`
  - Some data accessible via NRCC (Northeast Regional Climate Center) tools
  - The grape disease model outputs (infection risk by date) are web-accessible, not API
  - Authentication: None (public web platform)
  - Formats: CSV download via web
- **Pricing:** **Free** — university public service, no commercial licensing
- **Latency:** Hourly updates; 5-day forecast model runs daily
- **Historical:** Station data archived for several years; downloadable CSV
- **Suitability:** Napa/Sonoma ★★ Med; Cornell grape disease models (Powdery Mildew RI, 4DMcast Downy Mildew) are scientifically validated and directly relevant [S13b]
- **Reliability/SLA:** Academic service; generally reliable; no formal SLA
- **License:** Free for any use; no commercial restrictions stated

---

### 14. UC IPM Weather (UCIPM / CIMIS)
**Owner:** UC Cooperative Extension + California Department of Water Resources (CIMIS); public

- **Coverage:** California only, with ~135 NOAA sites, ~100 CIMIS stations, ~40 volunteer stations [S14]
  - Napa/Sonoma: ★★★ High — multiple CIMIS stations in Napa and Sonoma counties; UC Cooperative Extension vineyard monitoring
  - Burgundy: ✗ None
  - Bordeaux: ✗ None
  - Mendoza: ✗ None
- **Spatial resolution:** Station-based; CIMIS stations spaced ~10–20 km in agricultural areas
- **Temporal resolution:** Hourly; daily summaries; UC IPM grape disease model outputs updated daily
- **Leaf wetness:** ✓ **YES** — CIMIS stations calculate leaf wetness from RH/dew/precip; used directly in UC Davis Powdery Mildew Risk Index (RI model) and UC Grape Downy Mildew model [S14b]
- **Other key variables:** Temperature, RH, dew point, precipitation, wind, solar radiation, ET₀ (CIMIS provides reference ET₀ — best-in-class for California); soil moisture (some stations)
- **API endpoints:**
  - CIMIS REST API: `https://et.water.ca.gov/api/data?appKey={key}&targets={station-id}&startDate={}&endDate={}` (JSON)
  - UC IPM models: web-based at `https://ipm.ucanr.edu/weather/` — no REST API for model outputs; downloadable CSV
  - Authentication: CIMIS — free API key; UC IPM — no auth
  - Formats: JSON (CIMIS API); CSV (UC IPM download)
- **Pricing:** **Free** — California state service and UC public extension
- **Latency:** Daily (CIMIS standard); some near-real-time via telemetry stations
- **Historical:** CIMIS archive back to 1982 for some stations; UC IPM archive available for model re-runs
- **Suitability:** Napa/Sonoma ★★★ High — purpose-built for California viticulture; includes validated powdery and downy mildew models. Cannot be used for EU or Argentina.
- **Reliability/SLA:** State service; good uptime; no SLA
- **License:** California state public data; free commercial use

---

### 15. Sencrop (European Farm Sensor Network)
**Owner:** Sencrop SAS (private, Lille, France; founded 2016)

- **Coverage:** Hardware-dependent community network with strong coverage in France, Belgium, Netherlands, UK, Germany, and expanding Europe
  - Napa/Sonoma: ✗ Low (some US users; no systematic coverage)
  - Burgundy: ★★★ High (dense network in French wine regions; active viticultural user base)
  - Bordeaux: ★★★ High
  - Mendoza: ★ Low (hardware deployable but sparse community)
- **Spatial resolution:** Hyperlocal per-station; community data sharing allows access to nearby stations within ~15 km radius
- **Temporal resolution:** Every 15–20 min (triple sensor averaging) [S15]
- **Leaf wetness:** ✓ **YES** — via dedicated sensor module (separate hardware). Capacitive leaf wetness sensor included in Leafcrop/Vineycrop add-ons. Also derives wetness from temperature + dew point for stations without sensor.
- **Other key variables:** Temperature (air, wet-bulb), RH, precipitation, wind speed/direction, dew point, leaf wetness, soil temperature (10/20/40/60 cm via Soilcrop), soil moisture [S15]
- **Disease models:** Integrated powdery mildew (Erysiphe necator) and downy mildew (Plasmopara viticola) alerts for vineyards [S15b]
- **API endpoints:**
  - Developer API: `https://developer.sencrop.com/` (early state; beta)
  - Authentication: OAuth 2.0
  - Formats: JSON; CSV export
- **Pricing:** (as of Jan 2025 [S15c])
  - App subscription: ~€18.9/mo (£79–229/yr depending on plan and features)
  - Hardware: Station modules £300–350 + add-ons; Leafcrop/Vineycrop additional
- **Latency:** Near-real-time (15–20 min)
- **Historical:** Full station archive; community data accessible within subscription
- **Suitability:** Burgundy/Bordeaux ★★★ High — purpose-built for French viticulture; has disease models; community network dense
- **Reliability/SLA:** Commercial platform; no formal SLA published; startup risk (seed-funded)
- **License:** User + community data; commercial API use permitted on subscription

---

### 16. Pessl Instruments / Metos FieldClimate
**Owner:** Pessl Instruments GmbH (private, Weiz, Austria); brand METOS

- **Coverage:** Hardware deployable globally; strong presence in European viticulture (France, Germany, Austria, Italy, Spain), Australia, US
  - Napa/Sonoma: ★★ Med (some US vineyard installations)
  - Burgundy: ★★★ High (IFV and BIVB-affiliated stations)
  - Bordeaux: ★★★ High
  - Mendoza: ★ Low (hardware possible; sparse)
- **Spatial resolution:** Hyperlocal per-station
- **Temporal resolution:** 15-min default; configurable [S16]
- **Leaf wetness:** ✓ **YES** — physical sensor on all iMETOS 3.3 and standard METOS stations (resistance-based); **virtual leaf wetness sensor** also available for stations without physical sensor (calculated from T, RH, precip) [S16]; directly drives Plasmopara viticola and Erysiphe necator disease models within FieldClimate.
- **Other key variables:** Temperature, RH, precipitation, wind speed/direction, solar radiation, soil temperature, soil moisture (Sentek probe available), ET₀ (calculated), VPD, delta T
- **Disease models:** FieldClimate includes Plasmopara viticola (Downy Mildew), Erysiphe necator (Powdery Mildew), Botrytis, and others [S16b]
- **API endpoints:**
  - FieldClimate REST API: `https://api.fieldclimate.com/v2/` [S16]
  - Authentication: HMAC-SHA256 signature
  - Formats: JSON
  - API subscription required separately from hardware subscription
- **Pricing:**
  - Hardware: iMETOS 3.3 station ~£2,375; optional software subscription £75–150/yr [S16c]
  - FieldClimate API: separate subscription; contact Pessl Instruments
  - Complete 3-year cost estimate: £2,600–2,825 (hardware + basic sub)
- **Latency:** Near-real-time (15-min upload intervals)
- **Historical:** Full archive in FieldClimate; years of data retained
- **Suitability:** Burgundy/Bordeaux ★★★ High — premium choice for France; integrated disease models reduce development burden
- **Reliability/SLA:** Commercial product; 20+ years operational; hardware units from 2005 still running [S16c]
- **License:** Commercial EULA; API use permitted on subscription

---

### 17. ECMWF ERA5 (Historical Reanalysis)
**Owner:** European Centre for Medium-Range Weather Forecasts (ECMWF); Copernicus Climate Change Service (C3S)

- **Coverage:** Global, seamless land + sea surface
  - All four priority regions: ★★★ High (global)
- **Spatial resolution:** ERA5: 0.25° (~31 km); ERA5-Land: 0.1° (~9 km) [S17]
- **Temporal resolution:** Hourly (ERA5 and ERA5-Land); daily aggregations available [S17]
- **Leaf wetness:** ✗ **Not available** as direct variable. ERA5 provides high-resolution skin temperature, surface latent heat flux, total precipitation, 2m dew point, 2m temperature, RH — all inputs needed to derive a leaf wetness model.
- **Other key variables:** 2m temperature, 2m RH, 2m dew point, 10m wind, precipitation, surface solar radiation, surface pressure, total cloud cover, skin temperature, soil moisture (4 layers), ET (evapotranspiration), snow depth
- **API endpoints:**
  - CDS API (new, post Sep 2024): `https://cds.climate.copernicus.eu/api` [S17]
  - Python: `cdsapi` library; JSON request format
  - Authentication: Free CDS account + API key at `https://cds.climate.copernicus.eu/how-to-api`
  - Formats: GRIB (default), NetCDF (conversion available)
- **Pricing:** **Free** — Copernicus open data; available under CC-BY-4.0 license [S17b]
  - ECMWF real-time data: transitioning to fully open (CC-BY-4.0) in October 2025 [S17c]
- **Latency:** ~5 days behind real-time (reanalysis pipeline delay); not suitable for operational forecasting
- **Historical:** **1940 to present** (ERA5); ERA5-Land from 1950; global coverage [S17]
- **Suitability:** Historical baseline and calibration ★★★ High for all regions. Not for real-time operations.
- **Reliability/SLA:** Extremely high (30+ year operational ECMWF archive); no downtime issues
- **License:** CC-BY-4.0; commercial use unrestricted

---

### 18. Sentinel-2 / Copernicus (Sentinel Hub)
**Owner:** ESA (European Space Agency) + Copernicus Programme; Sentinel Hub operated by Sinergise (now part of Planet)

- **Coverage:** Global satellite imagery
  - All four priority regions: ★★★ High (global satellite)
- **Spatial resolution:** 10 m (Sentinel-2 optical); Soil Water Index at 1 km (daily) or 12.5 km (global daily) [S18b]
- **Temporal resolution:** 2–5 day revisit (Sentinel-2 optical, cloud-dependent); Soil Water Index daily [S18]
- **Leaf wetness:** ✗ **Not directly available.** Soil Water Index (SWI) via Sentinel-1 radar + METOP ASCAT fusion is a soil moisture proxy (not leaf wetness). NDVI and other vegetation indices provide canopy health context. Not suitable for real-time hourly spray decisions.
- **Other key variables via CLMS:**
  - Soil Water Index (SWI) — 0–100 scale; 1 km daily Europe; 12.5 km global daily [S18b]
  - NDVI, EVI, NDWI — vegetation health indices
  - Evapotranspiration + heat flux (new 2026 CLMS products) [S18c]
  - Land Surface Temperature (LST) — 10-day products
- **API endpoints:**
  - Sentinel Hub Process API: `https://sh.dataspace.copernicus.eu/api/v1/process`
  - CLMS datasets via BYOC API
  - Authentication: OAuth 2.0 (Copernicus Data Space Ecosystem account)
  - Processing Units (PU) model: charged per km² processed [S18]
  - Formats: GeoTIFF, PNG, JPEG2000, NetCDF
- **Pricing:** (as of Jan 2025 [S18])
  - **Exploratory (free):** 30,000 req/mo; 30,000 PU/mo
  - **Basic:** ~€100/mo; 700,000 req/mo; 70,000 PU/mo
  - **Enterprise-S:** ~€500/mo; 8M req/mo; 400,000 PU/mo
  - **Enterprise-L:** custom
  - Sentinel-2 NDVI at 10m: 1 PU covers ~39 km² → Napa Valley (~500 km²) = ~13 PU/request
- **Latency:** Satellite-dependent; 2–5 days revisit; SWI daily product ~1-2 day lag
- **Historical:** Sentinel-2 archive from 2015; ERA5-based soil moisture products from 1990s
- **Suitability:** Supplementary for seasonal NDVI canopy monitoring ★★★; not suitable for hourly spray decisions ✗
- **Reliability/SLA:** ESA operational satellite; Copernicus guarantees continuity
- **License:** Free for Sentinel data; open access under Copernicus Data Policy

---

### 19. AccuWeather APIs
**Owner:** AccuWeather Inc. (private, State College, PA)

- **Coverage:** Global (proprietary + NWP fusion)
  - Napa/Sonoma: ★★★ High
  - Burgundy: ★★★ High
  - Bordeaux: ★★★ High
  - Mendoza: ★★★ High
- **Spatial resolution:** City/sub-city resolution; sub-1 km claims for some forecast products
- **Temporal resolution:** Current conditions; minutely (MinuteCast); hourly (15-day); daily (15-day) [S19]
- **Leaf wetness:** ✗ **Not available** in any published tier. AccuWeather indices include agriculture-adjacent metrics (Growing Degree Days, various daily indices) but leaf wetness is absent.
- **Other key variables:** Temperature, dew point, RH, precipitation, wind, UV index, cloud cover, pressure, growing degree days (indices), MinuteCast (hyperlocal precipitation timing)
- **API endpoints:**
  - `https://dataservice.accuweather.com/currentconditions/v1/{locationKey}?apikey={key}` [S19]
  - Authentication: API key in query string
  - Rate limits: Free — 50 req/day (trial); Standard — 225K calls/mo; Prime — 1.8M calls/mo
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S19])
  - **Free (trial):** $0/mo; 500 calls/day for 14 days
  - **Starter:** $2/mo; 15,000 calls/mo; $0.25/CPM overage
  - **Standard:** $25/mo; 225,000 calls/mo; $0.12/CPM overage
  - **Prime:** $250/mo; 1.8M calls/mo; $0.15/CPM overage
  - **Elite:** $500/mo; 2.4M calls/mo; full API suite, 15-day forecast
  - **Enterprise:** Custom; 1-year minimum contract; contact sales@accuweather.com
- **Latency:** Real-time updates (varies by product; ~10–30 min)
- **Historical:** Limited historical data; not primary use case
- **Suitability:** General weather ★★★; agriculture ★★ (no leaf wetness limits direct mildew use)
- **Reliability/SLA:** 99.9% uptime on enterprise plans; strong reputation for forecast accuracy
- **License:** Commercial use permitted on paid plans; strict ToS

---

### 20. Weatherbit
**Owner:** Weatherbit LLC (private, US)

- **Coverage:** Global (NWP model + satellite + station fusion)
  - Napa/Sonoma: ★★ Med
  - Burgundy: ★★ Med
  - Bordeaux: ★★ Med
  - Mendoza: ★★ Med
- **Spatial resolution:** 0.25° (~28 km) for Ag-Weather API (ERA5 + GLDAS based) [S20]
- **Temporal resolution:** Current + hourly forecast (16-day); daily; 8-day Ag forecast [S20a]
- **Leaf wetness:** ✗ **Not available** in any published tier. Ag-Weather API includes soil moisture, soil temperature, ET₀, precipitation — but not leaf wetness.
- **Other key variables (Ag tier):** Soil temperature (multiple depths), soil moisture (0–200 cm), ET₀ reference evapotranspiration, precipitation, surface temperature, solar radiation, VPD [S20b]
- **API endpoints:**
  - `https://api.weatherbit.io/v2.0/forecast/agweather?lat={}&lon={}&key={}` [S20a]
  - Authentication: API key in query string
  - Rate limits: Free — 50 req/day; Business — 2M req/day; Enterprise — custom
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S20c])
  - **Free:** $0/mo; 50 req/day; non-commercial only; 7-day forecast
  - **Standard:** Price not published ($/mo); 25,000 req/day; commercial
  - **Plus:** $/mo; 250,000 req/day; historical (5 years)
  - **Business:** $/mo; 2M req/day; Ag-Weather API + historical (25 years)
  - **Enterprise:** Custom; dedicated support
  - Note: Exact prices for Standard/Plus/Business not published on pricing page; contact sales
- **Latency:** Real-time; Ag data updated 2× daily (model-based)
- **Historical:** Ag-Weather API sourced from ERA5 + GLDAS — global, 10-year historical depth [S20b]
- **Suitability:** Ag data ★★★ for soil/ET; leaf wetness gap limits mildew use
- **Reliability/SLA:** No published SLA
- **License:** Commercial on paid plans; free tier non-commercial

---

### 21. AgroMonitoring (OpenWeather Agriculture)
**Owner:** OpenWeather Ltd (same parent as OpenWeatherMap, UK)

- **Coverage:** Global satellite + weather fusion
  - All four priority regions: ★★ Med (grid-based; 0.25° weather; satellite for NDVI)
- **Spatial resolution:** 0.25° weather; 10–100 m satellite imagery (Sentinel-2/Landsat)
- **Temporal resolution:** Weather: every 1–2 h; satellite: 2–4 days revisit; soil: 2× daily [S21]
- **Leaf wetness:** ✗ **Not available** — no leaf wetness parameter documented
- **Other key variables:** NDVI, EVI, EVI2, NRI, DSWI, NDWI indices; soil temperature + moisture (multiple depths); accumulated temperature + precipitation; 5-day weather forecast (3-h steps) [S21]
- **API endpoints:**
  - `https://agromonitoring.com/api/image/search` (polygon-based NDVI query)
  - Weather data via AgroMonitoring API (separate from OWM One Call)
  - Authentication: API key
  - Formats: JSON; GeoTIFF for imagery
- **Pricing:** (as of Jan 2025 [S21b])
  - **Free:** <500 weather API calls/day; satellite near-real-time imagery
  - **Starter:** £20/mo; <1,000 weather calls/day; <500 historical calls/day; 1-year history
  - **Small Kit:** £200/mo; <10,000 calls/day; <5,000 historical/day; 1-year history
  - **Corporate:** On request
- **Latency:** Weather data: <2 h (paid); satellite: 2–4 day revisit
- **Historical:** 1-year history on paid; total archive on corporate request [S21b]
- **Suitability:** NDVI + soil moisture context ★★★; weather/leaf wetness for mildew ★★ (missing key variable)
- **Reliability/SLA:** 99% SLA (paid); OpenWeather infrastructure
- **License:** Commercial on paid plans

---

### 22. John Deere Operations Center Weather
**Owner:** Deere & Company (NYSE: DE; publicly traded, Moline, IL)

- **Coverage:** Integration layer for JD-connected farm equipment; pulls in external weather data layers. Native weather data limited.
  - Napa/Sonoma: ★★ Med (JD equipment density varies in wine country; available where JD machinery used)
  - Burgundy: ★ Low (European farm integration possible)
  - Bordeaux: ★ Low
  - Mendoza: ★ Low
- **Spatial resolution:** Machine-level (GPS telemetry); external weather layers at whatever resolution the integrated provider delivers
- **Temporal resolution:** Machine data: continuous during operations; weather overlay: external provider schedule
- **Leaf wetness:** ✗ **Not available** natively. Field Connect sensor (optional add-on hardware) can report field-level weather including temperature, RH, precipitation — but no dedicated leaf wetness sensor documented in Field Connect spec [S22].
- **Other key variables (via API):** Air temperature, wind direction/speed, sky conditions, humidity, soil moisture (qualitative), soil temperature — recorded during machine operations [S22]
- **API endpoints:**
  - Developer Portal: `https://developer.deere.com` [S22]
  - OAuth 2.0 authentication required; ag2 scope for field data
  - Field Operations API: `GET https://sandboxapi.deere.com/platform/organizations/{orgId}/fields/{fieldId}/fieldOperations`
  - Authentication: OAuth 2.0 (JD account)
  - Formats: JSON
- **Pricing:** Free for JD customers with connected machines. Developer API requires JD account + approved app registration.
- **Latency:** Machine telematics: near-real-time during field operations
- **Historical:** Per field operations history within JD Operations Center account
- **Suitability:** JD equipment owners in CA: ★★ Med; not designed as primary weather API for disease modelling
- **Reliability/SLA:** Enterprise-grade JD infrastructure; formal SLA for equipment subscribers
- **License:** JD customer data; third-party integration requires developer agreement

---

### 23. Open-Meteo
**Owner:** Open-Meteo (open-source project; commercial entity in Switzerland; founded by Patrick Zippenfenig)

- **Coverage:** Global via aggregation of NOAA, ECMWF, Météo-France AROME, DWD, MeteoSwiss, UKMO models
  - Napa/Sonoma: ★★★ High (GFS + HRRR)
  - Burgundy: ★★★ High (Météo-France AROME + ECMWF)
  - Bordeaux: ★★★ High (same)
  - Mendoza: ★★ Med (GFS; no high-res South American model)
- **Spatial resolution:** 1–11 km depending on model selected
- **Temporal resolution:** Hourly; minutely (coming); daily; 16-day forecast
- **Leaf wetness:** ✗ **Not available** — not in any model API parameter list. Derives temperature, RH, dew point, precipitation — inputs for derived leaf wetness calculation.
- **Other key variables:** Temperature, RH, dew point, apparent temperature, precipitation, wind, cloud cover, solar radiation (direct + diffuse), ET₀ (FAO Penman-Monteith), soil moisture (multiple depths), soil temperature, VPD [S23]
- **API endpoints:**
  - Free: `https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&hourly=temperature_2m,relativehumidity_2m,...`
  - Météo-France specifically: `https://api.open-meteo.com/v1/meteofrance`
  - Authentication: None (free); API key for commercial plans
  - Rate limits: Free — 10,000 calls/day; 300,000/month [S23]
  - Formats: JSON
- **Pricing:** (as of Jan 2025 [S23])
  - **Free (non-commercial):** Unlimited within fair use; 300,000 calls/mo cap
  - **API Standard (commercial):** Price not disclosed publicly; "from ~€29/mo" referenced in some community sources; contact for quote
  - **API Professional:** Higher monthly call limits
  - **Enterprise:** Custom
- **Latency:** Near-real-time (model-dependent; AROME 1 h, GFS 1–4 h)
- **Historical:** Historical Weather API (ERA5-based) available on all plans; climate API; previous model runs API (Professional+)
- **Suitability:** Excellent free baseline for all four regions; ET₀ and soil moisture included; leaf wetness must be derived
- **Reliability/SLA:** Reserved servers with higher reliability on paid plans; open-source project
- **License:** Free tier: non-commercial (CC BY 4.0 attribution required); commercial on paid plans

---

## Recommended Stack by Priority Region

### Napa & Sonoma

**Primary backbone:** UC IPM / CIMIS + NOAA NWS (free; California-specific ET₀, powdery mildew RI model, downy mildew 4DMcast already implemented) [S14][S1]

**Real-time leaf wetness:**
1. Existing hardware option: Davis WeatherLink Pro (vineyard-deployed) → WeatherLink Cloud API → real physical leaf wetness sensor data [$3.95/mo/device + hardware] [S9]
2. No-hardware option: Visual Crossing (CART-derived hourly leaf wetness, $0 for 1,000 rec/day) [S4]
3. Cornell NEWA (derived from CIMIS RH, free; integrates with HOBO stations already in many Napa vineyards) [S13]

**Forecast model:** Tomorrow.io (1 km, 21-day; agriculture premium for full soil layer) OR Open-Meteo (free; HRRR model for hourly 1-km CA forecasts)

**Historical backfill:** ECMWF ERA5 via CDS API (free, 80 years)

**Satellite context:** Sentinel Hub (NDVI, SWI — for seasonal disease pressure maps)

**Recommended production stack (Napa/Sonoma):**
```
UC IPM (free, validated disease models) +
CIMIS API (free, ET₀ + hourly met) +
Davis WeatherLink (vineyard-deployed, real leaf wetness) +
Visual Crossing (CART leaf wetness fallback, leaf-wetness API) +
ECMWF ERA5 (historical calibration)
```

---

### Burgundy

**Primary backbone:** Météo-France AROME via Open-Meteo or portail-api (free, 1.3 km hourly forecasts; best gridded resolution in France) [S6][S23]

**Real-time leaf wetness:**
1. Sencrop (dense French viticultural community network; 15-min; disease models for mildew; ~€18.9/mo + hardware) [S15]
2. Pessl FieldClimate / iMETOS (more instrumentation-intensive; best for research estates; leaf wetness sensor + disease models) [S16]
3. Visual Crossing CART leaf wetness (derived; no hardware needed; $0 free tier) [S4]

**Forecast model:** Meteomatics (90 m downscaling in Europe; `leaf_wetness:idx` at 30-min resolution; phytophthora model) — best for high-precision Burgundy pinot noir (highly mildew-susceptible)

**Historical backfill:** ECMWF ERA5 (free) + Météo-France historical station archive (free via meteo.data.gouv.fr)

**Recommended production stack (Burgundy):**
```
Météo-France AROME via Open-Meteo (free, 1.3 km hourly) +
Sencrop community data (hyperlocal leaf wetness + mildew alerts) +
Meteomatics leaf_wetness:idx (30-min model; phytophthora model) +
ECMWF ERA5 (historical calibration)
```

---

### Bordeaux

**Identical to Burgundy stack** with the following additions:
- ARPEGE global model (longer-range forecasts useful for Atlantic-influenced Bordeaux weather)
- IFV (Institut Français de la Vigne et du Vin) agroclimatic station network data (not public API; partnership may be required)
- Sencrop similarly well-established in Bordeaux viticultural community

**Note:** Bordeaux has a stronger maritime influence (Atlantic) and more variable precipitation → leaf wetness calculation from RH-only is less reliable than physical sensor data. Recommend hardware sensors (Sencrop Leafcrop or Pessl) for primary Bordeaux deployments.

---

### Mendoza

**Primary backbone:** SMN Argentina WRF forecast (4 km, 72 h, free via AWS Open Data [S8]) + INTA Mendoza station data (when accessible)

**Real-time leaf wetness:** No public source provides leaf wetness for Mendoza. Options:
1. Deploy on-farm hardware: Davis WeatherLink + leaf wetness sensor (HOBO or Davis; $150–200 sensor + WeatherLink Pro subscription)
2. Derived algorithm: Visual Crossing CART model covers global coordinates including Mendoza ($0 free tier) [S4] — acceptable accuracy for continental-climate conditions
3. Meteomatics commercial API (`leaf_wetness:idx` parameter; paid tier) [S5]

**Forecast model:** Tomorrow.io or Meteomatics (both provide global 1 km forecasts including Mendoza)

**Historical backfill:** ECMWF ERA5 (free, essential for model calibration in Southern Hemisphere)

**Key challenge:** Mendoza grows at altitude (700–1,500 m) with strong Zonda wind influence and diurnal temperature extremes. Standard boundary-layer leaf wetness models calibrated on European/US vineyards may need recalibration against local SMN/INTA data.

**Recommended production stack (Mendoza):**
```
SMN WRF on AWS (free, 4 km, 72 h; hourly met) +
Visual Crossing CART leaf wetness (global, free tier) +
Tomorrow.io or Meteomatics (1 km commercial for precision) +
On-farm Davis/METER hardware (leaf wetness sensor — critical for calibration)
ECMWF ERA5 (historical baseline)
```

---

### Global Default (any region, MVP/fast launch)

For an MVP launch covering all four regions before hardware deployments are in place:

| Layer | Provider | Cost |
|-------|----------|------|
| Current + forecast weather | Open-Meteo (GFS/ECMWF/AROME) | Free (non-commercial) |
| Derived leaf wetness | Visual Crossing Timeline API (`leafwetness` + `leafwetnesshours`) | Free (1,000 rec/day) |
| Historical backfill | ECMWF ERA5 via CDS | Free |
| Satellite NDVI/soil | Copernicus Sentinel Hub (Exploratory) | Free (30K PU/mo) |
| Upgrade path | Meteomatics (leaf_wetness:idx + phytophthora model) | Business plan (quote) |

**Total MVP cost: $0/month** for low-volume development and testing.

---

## Datasets & Live Resources

| Resource | URL | Notes |
|----------|-----|-------|
| NOAA NWS API | https://api.weather.gov | US only; free |
| NOAA NDFD REST | https://digital.weather.gov/xml/rest.php | US only; legacy |
| OpenWeather One Call 3.0 | https://openweathermap.org/api/one-call-3 | Global; 1,000 free/day |
| Tomorrow.io API Docs | https://docs.tomorrow.io | Global; 500 free/day |
| Visual Crossing Timeline | https://www.visualcrossing.com/weather-api | Global; leaf wetness CART |
| Meteomatics API Params | https://www.meteomatics.com/en/api/available-parameters/agricultural-parameters/ | EU-strong; leaf_wetness:idx |
| Météo-France portail API | https://portail-api.meteofrance.fr | France; AROME 1.3 km; free |
| meteo.data.gouv.fr | https://meteo.data.gouv.fr | France; open data since Jan 2024 |
| AEMET OpenData | https://opendata.aemet.es | Spain; free API key |
| SMN Argentina WRF AWS | s3://smn-ar-wrf | Argentina; WRF 4 km; free |
| AWS SMN Registry | https://registry.opendata.aws/smn-ar-wrf-dataset/ | Documentation |
| INTA Mendoza | https://inta.gob.ar | Manual; no unified REST API |
| Davis WeatherLink API | https://www.weatherlink.com/static/docs/APIdocumentation.pdf | Hardware-dependent |
| METER Zentra Cloud API | https://docs.zentracloud.com | Hardware-dependent |
| Onset HOBOlink | https://www.onsetcomp.com/products/software/hobolink | Hardware; NEWA-compatible |
| Cornell NEWA | https://newa.cornell.edu | Free; US Northeast + CA |
| Cornell Grape Disease Models | https://newa.cornell.edu/grape-diseases | Powdery + Downy mildew |
| UC IPM Grape Tools | https://ipm.ucanr.edu/weather/ | California; free |
| UC IPM Powdery Mildew RI | https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/ | CA; RI model |
| Sencrop Developer | https://developer.sencrop.com | EU farm sensors; beta API |
| Pessl FieldClimate API | https://api.fieldclimate.com/v2/ | EU; requires subscription |
| ECMWF ERA5 CDS | https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels | Global; free; 1940–present |
| Sentinel Hub Pricing | https://www.sentinel-hub.com/pricing/ | Satellite; PU-based billing |
| Copernicus CLMS | https://dataspace.copernicus.eu | Soil Water Index; NDVI |
| AccuWeather Developer | https://developer.accuweather.com | Global; $25/mo Standard |
| Weatherbit Pricing | https://www.weatherbit.io/pricing | Global; Ag API on Business |
| AgroMonitoring | https://agromonitoring.com | OWM agriculture layer |
| John Deere Developer | https://developer.deere.com | JD ecosystem only |
| Open-Meteo | https://open-meteo.com | Global; free non-commercial |
| Open-Meteo Météo-France | https://open-meteo.com/en/docs/meteofrance-api | France-specific endpoint |

---

## Sources (Open Access)

[S1] NOAA NWS NDFD REST Web Service — https://graphical.weather.gov/xml/rest.php (accessed Jan 2025)  
[S1b] NWS API — https://api.weather.gov (accessed Jan 2025)  
[S2] OpenWeather One Call 3.0 Documentation — https://openweathermap.org/api/one-call-3 (Jan 2025)  
[S2b] OpenWeather Pricing — https://openweathermap.org/price (Jan 2025)  
[S3] Tomorrow.io Weather API — https://www.tomorrow.io/weather-api/ (Jan 2025)  
[S3a] Tomorrow.io Pricing Overview — https://support.tomorrow.io/hc/en-us/articles/23554984091156-Tomorrow-io-Pricing-Overview (Jan 2025)  
[S3b] Tomorrow.io Core Parameters — https://support.tomorrow.io/hc/en-us/articles/38449010323476-Core-Weather-Parameters-Included (Jan 2025)  
[S3c] Tomorrow.io Soil Premium Layer — https://support.tomorrow.io/hc/en-us/articles/38449629271188-Soil-Premium-Layer (Jan 2025)  
[S3d] Tomorrow.io Free Plan Rate Limits — https://support.tomorrow.io/hc/en-us/articles/20273728362644-Free-API-Plan-Rate-Limits (Jan 2025)  
[S4] Visual Crossing Agriculture Elements — https://www.visualcrossing.com/resources/documentation/weather-api/agriculture-elements-in-the-timeline-weather-api/ (Jan 2025)  
[S4a] Visual Crossing Weather API — https://www.visualcrossing.com/weather-api/ (Jan 2025)  
[S4b] Visual Crossing Pricing — https://www.visualcrossing.com/weather-data-editions/ (Jan 2025)  
[S4c] Visual Crossing pricing blog — https://www.visualcrossing.com/resources/blog/best-weather-api-for-2025/ (Jan 2025)  
[S4d] Visual Crossing enterprise — https://www.visualcrossing.com/resources/blog/enterprise-weather-api-scaling-your-business-with-reliable-high-volume-data-and-support/ (Jan 2025)  
[S5] Meteomatics Agricultural Parameters — https://www.meteomatics.com/en/api/available-parameters/agricultural-parameters/ (Jan 2025)  
[S5a] Meteomatics Product Updates Sept 2024 — https://www.meteomatics.com/en/news/product-updates-september-2024/ (Jan 2025)  
[S5b] Meteomatics Pricing — https://www.meteomatics.com/en/pricing/ (Jan 2025)  
[S6] Météo-France Open Data (data.gouv.fr) — https://labo.societenumerique.gouv.fr/en/articles/dossier-ouverture-des-donnees-publiques-en-france-where-are-we/ (Jan 2025)  
[S6a] Météo-France API — https://donneespubliques.meteofrance.fr (Jan 2025)  
[S6b] Open-Meteo Météo-France API — https://open-meteo.com/en/docs/meteofrance-api (Jan 2025)  
[S6c] API Données climatologiques — https://www.data.gouv.fr/dataservices/api-donnees-climatologiques (Jan 2025)  
[S7] AEMET OpenData — https://www.aemet.es/en/datos_abiertos/AEMET_OpenData (Jan 2025)  
[S7b] AEMET high-value datasets — https://datos.gob.es/en/blog/high-value-meteorological-datasets (Jan 2025)  
[S8] SMN Argentina WRF AWS — https://registry.opendata.aws/smn-ar-wrf-dataset/ (Jan 2025)  
[S9] Davis WeatherLink Cloud — https://www.davisinstruments.com/pages/weatherlink-cloud (Jan 2025)  
[S9b] Davis WeatherLink API PDF — https://www.weatherlink.com/static/docs/APIdocumentation.pdf  
[S10] METER Group Zentra Cloud — https://metergroup.com/platform/zentra-cloud/ (Jan 2025)  
[S10b] METER AgWeatherNet pricing — https://metergroup.com/agweathernet-setup/ (Jan 2025)  
[S11] Adcon/BEIA telemetry — http://eng.beia-telemetrie.ro/?page_id=2406 (Jan 2025)  
[S11b] addVANTAGE Pro LiveData — https://addvantage-pro.com/livedata (Jan 2025)  
[S12] Onset HOBOlink (LI-COR Cloud) — https://www.onsetcomp.com/products/software/hobolink (Jan 2025)  
[S12b] HOBO S-LWA-M003 Leaf Wetness Sensor — https://www.onsetcomp.com/products/sensors/s-lwa-m003 (Jan 2025)  
[S13] Cornell NEWA — https://newa.cornell.edu/how-newa-handles-weather-data (accessed Jan 2025)  
[S13b] Cornell NEWA Grape Diseases — https://newa.cornell.edu/grape-diseases (Jan 2025)  
[S14] UC IPM Powdery Mildew Risk Assessment — https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/ (Jan 2025)  
[S14b] Farm Progress UC IPM Article — https://www.farmprogress.com/grapes/making-the-most-of-weather-reports-to-improve-pest-management-in-your-vineyard (Jan 2025)  
[S15] Sencrop AgTecher Review — https://agtecher.com/en/hardware/sencrop/ (Jan 2025)  
[S15b] Sencrop AgriExpo — https://www.agriexpo.online/prod/sencrop/product-177143-175107.html  
[S15c] AgTecher field sensor comparison — https://agtecher.com/en/fieldsensors/ (Jan 2025)  
[S16] Pessl FieldClimate Manual — https://metos.global/en/fieldclimate-manual/ (Jan 2025)  
[S16b] Pessl Product Portfolio PDF — https://metos.global/wp-content/uploads/2022/07/Software-catalog-EN.pdf  
[S16c] AgTecher field sensor comparison — https://agtecher.com/en/fieldsensors/ (Jan 2025)  
[S17] ECMWF ERA5 CDS Dataset — https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels (Jan 2025)  
[S17b] ECMWF ERA5 CDS API — https://confluence.ecmwf.int/plugins/viewsource/viewpagesrc.action?pageId=129135000  
[S17c] ECMWF Open Data 2025 — https://www.ecmwf.int/en/about/media-centre/news/2025/ecmwf-achieve-fully-open-data-status-2025 (Jan 2025)  
[S18] Sentinel Hub Pricing — https://www.sentinel-hub.com/pricing/ (Jan 2025)  
[S18b] Copernicus CLMS Soil Water Index — https://dataspace.copernicus.eu/cases/straight-point-copernicus-land-monitoring-services-data (Jan 2025)  
[S18c] Copernicus new CLMS datasets — https://dataspace.copernicus.eu/news/2026-2-18-guide-newly-launched-clms-datasets  
[S19] AccuWeather Developer Documentation — https://developer.accuweather.com/documentation/overview (Jan 2025)  
[S19b] AccuWeather Pricing — https://developer.accuweather.com/pricing (Jan 2025)  
[S20] Weatherbit Ag Weather Forecast API — https://www.weatherbit.io/api/ag-weather-api-forecast (Jan 2025)  
[S20a] Weatherbit AgWeather API — https://www.weatherbit.io/api/agweather-api (Jan 2025)  
[S20b] Weatherbit Ag Historical API — https://www.weatherbit.io/api/ag-weather-api (Jan 2025)  
[S20c] Weatherbit Pricing — https://www.weatherbit.io/pricing (Jan 2025)  
[S21] AgroMonitoring — https://agromonitoring.com (Jan 2025)  
[S21b] AgroMonitoring Pricing — https://agromonitoring.com/price (Jan 2025)  
[S22] John Deere Field Operations API — https://developer.deere.com/dev-docs/field-operations (Jan 2025)  
[S23] Open-Meteo Pricing — https://open-meteo.com/en/pricing (Jan 2025)  
[S23b] Open-Meteo Météo-France — https://open-meteo.com/en/docs/meteofrance-api (Jan 2025)  

---

## Sources (Paywalled — Retrieve via University Credentials)

[P1] Gleason, M.L. et al. (1994). "Validation of a method to estimate leaf wetness duration." *Phytopathology* 84(5):520–526. DOI:10.1094/Phyto-84-520 — The foundational CART model used by Visual Crossing for leaf wetness estimation.  
[P2] Bois, B. et al. (2018). "Temperature-based zoning of the Bordeaux wine region." *OENO One* 52(4). DOI:10.20870/oeno-one.2018.52.4.1580 — Spatial analysis of Météo-France station network in Bordeaux; relevant for calibrating grid vs. station data.  
[P3] Mills, S. et al. (1999). "DMCAST: A prediction model for grape downy mildew development." *Viticulture and Enology Science* 52:182–189 — Foundational model integrated in Cornell NEWA 4DMcast.  
[P4] Willocquet, L. et al. (1996). "A model for forecasting the development of Uncinula necator, causal agent of powdery mildew on grapevines." *EPPO Bulletin* 26:601–607 — Foundational European powdery mildew model.  

---

*Pricing data retrieved January 2025. Provider pricing changes frequently — always verify at the linked pricing page before signing contracts or building cost models.*
