# Satellite & Remote-Sensing Pipeline for Vineyard Mildew Decision-Intelligence

> **Graft Spray Project — Category 10**  
> Umbrella goal: Pipeline satellite and remote-sensing data into the Graft Spray mildew decision platform to surface canopy vigor, soil moisture proxies, and microclimate signals—complementing on-vineyard sensors and the weather-network layer.

---

## Summary

Satellite remote sensing can supply Graft Spray with **three tiers of signal** that no on-vineyard sensor array can deliver at scale:

1. **Canopy vigor maps** — NDVI/NDRE time-series from Sentinel-2 or PlanetScope, delineated per vineyard block, reveal zones of anomalous low-vigor that correlate with disease pressure, water stress, or management-induced variability. These maps can trigger field scouting alerts and calibrate infection-model spatial weights.
2. **Soil moisture proxies** — Sentinel-1 SAR backscatter, SMAP downscaled products, and optical-trapezoid approaches (OPTRAM via Sentinel-2) provide spatially continuous soil-water estimates at 10–36 km resolution (SMAP native) or 10–20 m (SAR fusion), backfilling gaps where ground sensors are sparse.
3. **Precipitation / humidity back-fill** — GPM IMERG (~10 km, 30-min) and ERA5-Land (~9 km, 1 h) reanalyses provide near-real-time precipitation and surface-layer humidity estimates usable as forcing data for downy mildew infection models in regions lacking dense weather networks.

The **primary satellite pipeline recommendation** for Phase 1 is: **Sentinel-2 L2A (10 m, ~5-day revisit) → s2cloudless cloud masking → NDRE + NDWI zonal stats per block → Δ-vigor alert** — all orchestrated via the Copernicus Data Space Ecosystem (CDSE) Sentinel Hub Statistical API at zero data cost. A Sentinel-1 SAR moisture layer and ERA5-Land precipitation gap-fill layer complete the Phase 1 stack.

---

## 1. Relevant Satellite Missions for Viticulture Mildew Context

### 1.1 Sentinel-2 (Copernicus) — **Primary recommendation**

| Parameter | Value |
|---|---|
| Operator | ESA / Copernicus (EU) |
| Constellation | Sentinel-2A + 2B (third satellite Sentinel-2C launched 2024) |
| Spatial resolution | 10 m (B2, B3, B4, B8); 20 m (B5–B7 red-edge, B8A, B11–B12 SWIR) |
| Revisit | ~5 days (two-satellite constellation) at mid-latitudes; effective cloud-free cadence ≈ 10–16 days [S1] |
| Key bands for viticulture | B4 (Red, 665 nm), B5 (Red-Edge 1, 705 nm), B6 (Red-Edge 2, 740 nm), B7 (Red-Edge 3, 783 nm), B8A (NIR narrow, 865 nm), B11 (SWIR1, 1610 nm) |
| Cost | **Free and open** |

Sentinel-2 is the most validated and most widely recommended free satellite platform for precision viticulture research. Di Gennaro, Matese et al. demonstrated high NDVI correlation between S2 and UAV unfiltered pixels in overhead-trellis vineyards (R² = 0.80, 0.60 across two vineyards) [S2]. Tisseyre et al. showed S2 can track block-level management operations (weeding, trimming) via NDVI time-series at territorial scale across a Mediterranean region [S1]. Daret et al. used S2 NDVI to detect heatwave damage zones (intra- and inter-annual criteria) with 91–99 % correct classification of undamaged plots [S3].

**Viticulture-specific constraint**: S2's 10 m pixel typically contains significant inter-row soil/grass signal, reducing sensitivity in narrow-row or hedgerow-trained systems. Matese et al. showed S2 spatial autocorrelation (Moran Index) is lower than Pleiades (1.5 m) in heterogeneous vineyards [S4]. Spectral unmixing or canopy fraction correction (e.g., beta-regression models) improves Kc and VI accuracy at row level [S5].

### 1.2 Landsat 8 / 9 (USGS / NASA)

| Parameter | Value |
|---|---|
| Spatial resolution | 30 m (multispectral), 15 m panchromatic |
| Revisit | 16 days per satellite; 8 days with both in orbit |
| Key bands | B4 Red (655 nm), B5 NIR (865 nm), B6 SWIR1 (1610 nm) |
| Cost | **Free and open** |
| Cloud archive | AWS (us-west-2, Collection 2 COG) |

Landsat is primarily useful for **temporal depth** (Landsat 8 archive since 2013, Landsat 9 since 2021; full archive back to 1972 via TM/ETM+). Balafoutis et al. demonstrated NDVI and GNDVI from Landsat 8 correlate with table grape yield and quality at veraison across three seasons [S6]. Ryan et al. used Landsat-derived NDVI to build NDVI3 sampling protocols for grape maturation monitoring across California blocks [S7]. The 30 m resolution is often too coarse for individual-block precision analytics in small European appellations; its primary value in Graft Spray is as a **long-term baseline** for anomaly detection. Sentinel-2 + Landsat can be harmonized via HLS (Harmonized Landsat Sentinel) products available on NASA Earthdata to achieve ~3-day effective revisit.

### 1.3 Planet (PlanetScope / SkySat)

| Platform | Resolution | Revisit | Cost |
|---|---|---|---|
| PlanetScope (Dove constellation, ~200 satellites) | 3–4 m | ~Daily | Commercial (NICFI free-tier for tropics; otherwise subscription) |
| SkySat | 0.5 m | ~Daily tasking | Commercial (premium) |

PlanetScope's daily cadence at 3 m is transformative for disease surveillance. Kanaley, Combs, Gold et al. (Cornell, 2024) — a highly relevant landmark study — assessed PlanetScope and SkySat for season-long grapevine downy mildew (GDM) surveillance in New York. Random forest models achieved **maximum AUC 0.85 (SkySat) and 0.92 (PlanetScope)** for classifying high vs. low GDM incidence/severity zones, but significance only emerged **late July–early August** (late-season), not in early epidemic phases [S8]. Cloud cover, image co-registration, and low spectral resolution (PlanetScope: 4–8 bands, no red-edge in standard Dove) remain key operational challenges.

Ben-Gal et al. used PlanetScope GNDVI, NDVI, EVI, and SAVI time-series across 81 commercial vineyards in Israel to estimate stem water potential (Ψstem) as a water-stress proxy — an indirect mildew risk moderator [S9].

**Planet API** access: `planet.com/pricing`; the Planet Insights Platform starts with a 30-day trial; production tiers from non-commercial (30,000 PU/month) to Enterprise Large (1 M PU/month). PlanetScope can also be ingested via Sentinel Hub TPDI (Third-Party Data Integration) endpoint, enabling unified Processing API workflows.

### 1.4 MODIS (Terra/Aqua — legacy / continental scale)

| Parameter | Value |
|---|---|
| Resolution | 250 m (NDVI MOD13), 500 m (NDWI/EVI MOD13), 1 km (LST MOD11) |
| Revisit | Daily (composites: 8-day, 16-day) |
| Archive | 2000–present (Terra), 2002–present (Aqua) |
| Status | Operational but end-of-life; MODIS on Terra ended Feb 2023; VIIRS (NPP/NOAA-20) is the successor |

MODIS is too coarse for per-block analysis in most European wine regions where median block size is < 5 ha. Its primary remaining value is **multi-year baseline climatology** of NDVI trajectories and regional drought indices. Castro et al. demonstrated MODIS NDVI time-series can distinguish vineyard vs. other woody crop phenological signatures for parcel-level mapping [S10]. For Graft Spray, MODIS data can inform regional-scale context but is **not recommended** for block-level analytics in Phase 1.

### 1.5 Sentinel-1 SAR — Soil Moisture and All-Weather Coverage

| Parameter | Value |
|---|---|
| Sensor | C-band SAR, 5.405 GHz |
| Modes | IW (Interferometric Wide Swath), 10 m ground range |
| Revisit | 6 days per satellite (12-day single), typically 6-day operational |
| Polarizations | VV + VH (dual-pol, most common); some passes VV-only |
| Cost | **Free and open** |

Sentinel-1 is the primary **cloud-penetrating, all-weather** satellite for moisture sensing. Unlike optical satellites, it operates day/night regardless of cloud cover — critical during the critical March–June downy mildew season when Atlantic cloud cover can exceed 50 % in Western Europe. Shorachi et al. showed Sentinel-1 VV and VH backscatter were 1–2 dB lower during 2018 European drought vs. 2017, demonstrating sensitivity to soil moisture anomalies over agricultural crops [S11]. Trivedi et al. demonstrated Sentinel-1 SAR + Sentinel-2 NDVI stratification for vineyard nutrient sampling, showing SAR captures spatial variability independent of optical artifacts [S12].

The standard workflow for soil moisture retrieval from Sentinel-1 involves Water Cloud Model (WCM) inversion to separate vegetation and soil backscatter contributions, then empirical or ANN inversion of soil dielectric to volumetric water content. Albergel et al. achieved reasonable soil moisture accuracy via hybrid S1+S2 neural network methodology [S13].

**Limitation**: S1 SAR backscatter under dense vine canopies is dominated by vegetation volume scatter; bare-soil models should not be applied directly. Synergistic use with S2 optical for vegetation correction is recommended.

---

## 2. Vegetation Indices Relevant to Mildew Pressure

The table below documents what each index measures, its known correlations with viticulture parameters, and its specific (honest) relationship to mildew risk per the published literature.

| Index | Formula | Bands | What it Measures | Mildew Relevance | Literature Evidence | Caveats |
|---|---|---|---|---|---|---|
| **NDVI** | (NIR − Red) / (NIR + Red) | B8/B8A, B4 | Green biomass / canopy density | Proxy only: dense canopies = higher evaporative cooling = lower temperature stress; also correlated with yield density, which influences local microclimate | Widely validated for vineyard vigor zoning [S1, S2, S7]; weak direct correlation to mildew incidence in Kanaley et al. 2024 — no significance until late-season damage [S8] | Saturates at LAI > 3; soil/inter-row contamination at 10 m; no disease specificity |
| **NDRE** | (RE2 − RE1) / (RE2 + RE1) | B7, B5 | Chlorophyll content via red-edge slope | Mildew-infected leaves show chlorophyll degradation → NDRE decline precedes NDVI decline by days to weeks | Taylor & Bates showed NDRE better predicts pruning weight than NDVI from proximal sensors [S14]; Acosta et al. showed NDRE sensitive to powdery mildew stress in hyperspectral [S15] | Requires 20 m S2 bands (downsampled to 10 m); not available on standard Dove PlanetScope |
| **NDWI** | (Green − NIR) / (Green + NIR) | B3, B8 | Leaf water content / canopy water | Mildew-affected leaves lose cell turgor → NDWI should decrease; drought stress → NDWI decrease increases susceptibility window | Comparetti & Marques da Silva used S2 NDWI to track phenological phases in Sicilian vineyard [S16]; Costard et al. used S2 indices to monitor vineyard water status across five French estates [S17] | NDWI conflates canopy water with leaf area; Gao's version (NIR − SWIR) / (NIR + SWIR) is more specific for canopy moisture but requires SWIR band |
| **GNDVI** | (NIR − Green) / (NIR + Green) | B8A, B3 | Chlorophyll content (less saturating than NDVI) | Similar to NDVI but less saturating at high biomass; more sensitive to chlorophyll concentration changes | Ben-Gal et al. found GNDVI best correlated with vine stem water potential across 81 Israeli commercial vineyards [S9]; Balafoutis et al. used GNDVI + NDVI from Landsat 8 for table grape quality | Slightly noisier than NDVI at low biomass early season |
| **MCARI** | [(ρ700 − ρ670) − 0.2(ρ700 − ρ550)] × (ρ700/ρ670) | Narrow bands ~700, 670, 550 nm | Chlorophyll absorption relative to reflectance | Chlorophyll degradation under both biotic stress (mildew) and abiotic (water, N); MCARI responds to subtle chlorophyll changes before NDVI change | Wei et al. showed MCARI (as TCARI variant) sensitive to grapevine water status via UAV; Oerke & Steiner documented spectral differentiation of whitish leaf diseases (powdery mildew, downy mildew) at 700 nm region [S18] | MCARI narrow bands not directly available on Sentinel-2 (B5 = 705 nm is closest red-edge proxy); full MCARI requires hyperspectral or fieldwork; limited satellite-scale validation in viticulture |
| **CWSI** | 1 − (Tc − Ta_dry) / (Ta_wet − Ta_dry) | Thermal infrared (not Sentinel-2) | Crop Water Stress Index via canopy-air temperature difference | Vine water stress amplifies susceptibility to both mildew pathogens; drought canopy → elevated Tc detected via CWSI | Antichi et al. validated CWSI correlation with stem water potential (R² = 0.89) and LAI in Chianti vineyards [S19]; Pádua et al. used CWSI (thermal drone) in Douro region [S20] | Requires thermal IR band; not available on Sentinel-2 (10/20 m); Landsat (100 m thermal) too coarse; operational CWSI from satellite requires Landsat thermal or specialized missions (ECOSTRESS, future LSTM) |

### Honest Assessment of Direct Mildew–Index Correlations

The literature is **thin on direct causal links** between satellite-derived vegetation indices and mildew incidence at the block level. Key honest findings:

- **No satellite-based index reliably detects early mildew infection** before symptomatic canopy damage at the spatial scales of Sentinel-2 or PlanetScope. Kanaley et al. (2024) — the most rigorous field study — found no significant VI differences between high/low GDM severity zones until late July, well after infection was established [S8].
- **NDRE responds earlier than NDVI** to chlorophyll degradation, making it more suitable for early-season stress detection, but this has not been specifically validated against mildew infection dates at satellite scale.
- **NDWI decreases correlated with pre-infection susceptibility windows** (soil/canopy moisture) represent an *indirect* pathway — Portela, Pádua et al. (2024 systematic review of 104 studies) confirmed that satellite remote sensing can detect **late-stage disease expression** but generally cannot distinguish disease type from other stresses [S21].
- The primary value of satellite VIs for Graft Spray is thus **contextual and epidemiological**: (a) spatial zoning of vigor that predicts where infections will be most severe, (b) water-stress signals that prime the mildew susceptibility window, and (c) temporal anomaly detection of unexpected vigor decline that triggers scouting.

---

## 3. Access Mechanisms

### 3.1 Copernicus Data Space Ecosystem (CDSE)

CDSE ([dataspace.copernicus.eu](https://dataspace.copernicus.eu)) is the primary European open-access portal for all Copernicus satellite data, launched February 2023. It provides:

- **Data access**: Free registration; full global Sentinel-2 L1C + L2A archive (L2A from April 2017 Europe-wide, December 2018 global); Sentinel-1 GRD and SLC.
- **APIs available**:
  - **STAC API**: `catalogue.dataspace.copernicus.eu/stac` — standard SpatioTemporal Asset Catalog for spatiotemporal queries
  - **OData API**: product download via OASIS OData protocol
  - **Sentinel Hub API** (embedded): Process API, Statistical API, Catalog API — same as commercial Sentinel Hub but free-tier included with CDSE registration
  - **openEO API**: standardized process-graph-based EO analysis; Python/R clients available
  - **OGC API**: WMS/WMTS for GIS visualization

- **Authentication**: OAuth 2.0 (client credentials grant); registration at `dataspace.copernicus.eu` provides free access credentials.
- **Cost**: Data download is **free**; Sentinel Hub processing unit (PU) allocation is provided free for non-commercial use (30,000 PU/month for the non-commercial tier as of 2024). Processing costs are measured in PUs per request depending on image size, bands requested, and operation type.
- **COG support**: Sentinel-2 L2A products on CDSE are available as Cloud Optimized GeoTIFFs via the Sentinel Hub API and direct STAC catalog links.

### 3.2 Sentinel Hub (Process API + Statistical API)

Sentinel Hub ([sentinel-hub.com](https://www.sentinel-hub.com)) is now integrated within CDSE but also operates as a standalone commercial service (Sinergise/Planet). Key APIs:

- **Process API**: On-the-fly satellite image rendering + custom EvalScript processing per pixel; supports arbitrary multi-band band math; returns PNG, TIFF, or JSON.
- **Statistical API**: Returns per-polygon time-series of custom statistics (mean, median, percentiles, histogram) from arbitrary EvalScript over a GeoJSON AOI and date range. **This is the critical endpoint for Graft Spray's per-block zonal stats pipeline.** The Statistical API directly enables: `POST /api/v1/statistics` with GeoJSON vineyard block, date range, and NDRE/NDWI EvalScript → returns daily/weekly per-block statistics.
- **Rate limits**: Enterprise S: 600 requests/min, 1,000 PU/min; unused PUs do not accumulate. The non-commercial tier is sufficient for a pilot deployment across ~100–500 vineyard blocks [S22].
- **EO Browser**: Browser-based no-code equivalent at `apps.sentinel-hub.com/eo-browser`; useful for visual validation and prototyping before API deployment.

### 3.3 Google Earth Engine (GEE)

GEE ([earthengine.google.com](https://earthengine.google.com)) provides:
- Full Sentinel-2 L2A collection (`COPERNICUS/S2_SR_HARMONIZED`)
- Full Landsat Collection 2 Surface Reflectance (`LANDSAT/LC09/C02/T1_L2`)
- MODIS products, SMAP, ERA5-Land — all within the same computing environment
- Free for non-commercial research / academic use; commercial use requires Google Cloud billing
- **Python and JavaScript SDKs** (via `earthengine-api` pip package)
- Zonal statistics via `image.reduceRegions()` with GeoJSON FeatureCollection input
- **No data egress if analysis stays in GEE**; results exported to Google Drive or GCS

GEE is the **fastest route** to a multi-year historical baseline and multi-mission fusion pipeline. The `ee.ImageCollection` API makes time-series extraction over vineyard blocks straightforward. A key limitation is that GEE's terms of service prohibit direct productization without a commercial agreement.

### 3.4 Planet APIs

Planet provides:
- **Data API** (`api.planet.com/data/v1`): Search catalog, filter by AOI, cloud cover, date range, item type (PSScene = PlanetScope)
- **Orders API** (`api.planet.com/compute/ops/orders/v2`): Bulk download with atmospheric correction (SR product), clip to AOI, cloud mask
- **Subscriptions API**: Automated daily delivery pipeline to S3/GCS for specified AOI — the ideal integration pattern for operational mildew monitoring
- **Sentinel Hub TPDI**: Unified access to PlanetScope within Sentinel Hub workflows

Planet data requires commercial agreement; pricing at `planet.com/pricing`. For Phase 1, Planet is recommended as a **secondary high-resolution layer** to confirm anomalies detected in Sentinel-2 — not as the primary daily data stream.

### 3.5 AWS Open Data (COG / STAC)

Both Sentinel-2 L2A and Landsat Collection 2 are available as Cloud Optimized GeoTIFFs on AWS S3 (us-west-2):

- **Sentinel-2 COGs**: `s3://sentinel-cogs/` (Element84 / Earth Search STAC API: `earth-search.aws.element84.com/v1`)
- **Landsat Collection 2 COGs**: via USGS and AWS — `aws s3 ls --no-sign-request s3://usgs-landsat/`
- **Authentication**: No AWS account required for `--no-sign-request` read access
- **COG structure**: Allows range requests (HTTP GET with byte ranges) to read only the spatial tiles needed, avoiding full scene download; critical for large-scale per-block workflows without cloud compute lock-in
- **STAC API** at `earth-search.aws.element84.com` supports spatiotemporal queries with GeoJSON filter → returns direct S3 URLs

The AWS COG path is optimal for **serverless cloud functions** (Lambda/Cloud Functions) that need to extract pixel statistics over vineyard blocks without paying Sentinel Hub PU costs.

---

## 4. Cloud + Atmospheric Correction Pipeline

### 4.1 Sen2Cor

**Provider**: ESA (official)  
**What it does**: Converts Sentinel-2 L1C (top-of-atmosphere reflectance) to L2A (surface reflectance + Scene Classification Layer, SCL).  
**Deployment**: Standalone CLI (`Sen2Cor` v2.11+); also runs automatically at CDSE to produce the L2A product.  
**Cloud masking accuracy (SCL)**: Overall accuracy ~84 % in independent validation vs. ALCD reference masks [S23]. Machine learning comparisons give Sen2Cor a Dice coefficient of ~59 %, underperforming KappaMask (80 %) and s2cloudless (63 %) on North European test sets [S24].  
**Recommendation for Graft Spray**: Use **pre-computed CDSE L2A product** (already Sen2Cor-corrected) rather than running Sen2Cor locally. The SCL cloud mask is adequate for cloud-free compositing but should be supplemented with s2cloudless for edge cases and partially-cloudy images.

### 4.2 MAJA (Multi-sensor Atmospheric Correction and Cloud Screening)

**Provider**: CNES / Theia / German EOC  
**What it does**: Multi-temporal atmospheric correction using slow surface reflectance change assumption to detect clouds and aerosols; also produces Level-3A monthly cloud-free composites (via WASP).  
**Performance**: Comparable to FMask (~91 % accuracy) in mid-latitude clear-sky conditions; produces fewer false positives than Sen2Cor but more omission errors in tropical settings [S23]. Hagolle et al. (2021) describe CNES/DLR L2A and L3A production workflow [S25].  
**Deployment**: Available via the Theia portal (theia.cnes.fr) for France + several other regions; not globally real-time.  
**Recommendation**: MAJA is the **best choice** for European vineyard regions where Theia coverage applies; use Theia L2A downloads in preference to CDSE L2A where latency allows (~3-day lag at Theia).

### 4.3 FORCE (Framework for Operational Radiometric Correction for Environmental monitoring)

**Provider**: David Frantz (GFZ Potsdam); open-source  
**What it does**: End-to-end ARD (Analysis Ready Data) processing chain for Landsat + Sentinel-2; atmospheric correction, cloud screening, spatial co-registration, and time-series generation.  
**Strengths**: Produces consistent cross-sensor ARD from Landsat + S2 simultaneously; built-in cloud shadow detection and time-series algorithms (FORCE-L3 for compositing, FORCE-TSA for time-series analysis).  
**Performance**: Kganyago et al. validated FORCE (via iCOR) alongside MAJA and Sen2Cor under partly-cloudy conditions, finding broadly comparable surface reflectance accuracy [S26].  
**Recommendation**: FORCE is ideal if the Graft Spray pipeline requires **multi-sensor consistency** (fusing Landsat + S2 time-series) and runs on its own cloud infrastructure. Adds operational complexity vs. CDSE-precomputed L2A.

### 4.4 s2cloudless (Sentinel Hub / Sinergise)

**Provider**: Sinergise (Planet) — open-source Python package  
**What it does**: Machine-learning-based cloud probability map for Sentinel-2 L1C or L2A at 160 m resolution (interpolated to 10 m); output: per-pixel cloud probability score + binary cloud mask at user-defined threshold.  
**Performance**: Dice coefficient ~63 % on North European test set [S24]; tends to underclassify semi-transparent/thin clouds but has fewer false positives over bright vineyard soils than Sen2Cor SCL. Matese et al.'s AgroShadow tool (precision agriculture-specific) showed lowest overall error of any S2 cloud/shadow method tested in Italian farmland in 2020 [S27].  
**Integration**: Natively integrated in Sentinel Hub EvalScripts as `CLM` layer; also available as standalone Python package (`pip install s2cloudless`).  
**Recommendation**: **Use as primary cloud mask** in the Graft Spray Sentinel Hub Statistical API EvalScripts, supplementing with SCL for cloud shadow detection.

### Pipeline Summary

```
CDSE STAC API
  ↓ spatiotemporal query (AOI bbox + date range + max_cloud_cover=80)
S2 L2A (Sen2Cor pre-corrected)
  ↓ s2cloudless cloud probability mask (threshold=0.4)
  ↓ SCL cloud shadow mask (classes 3, 8, 9, 10, 11)
Clear-pixel composite (median, 30-day rolling window)
  ↓ EvalScript: compute NDRE, NDWI, NDVI per pixel
Sentinel Hub Statistical API → per-block JSON statistics
  ↓ time-series store (PostgreSQL/TimescaleDB or InfluxDB)
Δ-vigor detection (CUSUM or Z-score vs. rolling baseline)
  ↓ alert generation
```

---

## 5. Per-Block Analytics Pipeline

### 5.1 Vector Parcel Definition

- **Format**: GeoJSON FeatureCollection; each Feature = one vineyard block polygon with properties: `block_id`, `variety`, `training_system`, `grower_id`, `area_ha`.
- **Sources**: Grower-submitted KML/Shapefile (digitized from EO Browser or Google Earth); national cadastral databases (France: Registre Parcellaire Graphique / RPG via data.gouv.fr; Italy: Agea SIAN; Spain: SIGPAC); Copernicus LUCAS/CLC for initial block identification.
- **Resolution constraint**: Sentinel-2 pixel = 10 m × 10 m = 100 m² = 0.01 ha. Blocks smaller than ~0.5 ha yield fewer than 50 pure pixels; minimum block size for reliable statistics is ~0.3 ha at 10 m [S1]. Mixed pixels at block boundaries should be masked using a 10 m negative buffer.

### 5.2 Zonal Statistics Framework

For each block polygon and each clear-sky satellite acquisition:

| Statistic | Use |
|---|---|
| **Median** NDRE | Primary vigor metric; robust to remaining cloud noise |
| **P10 NDRE** | Identifies within-block low-vigor zones (disease-pressure sentinel zones) |
| **P90 NDRE** | Within-block high-vigor reference |
| **Median NDWI** | Water content proxy |
| **Coefficient of variation** (σ/μ) | Intra-block heterogeneity; high CV = patchy stress |
| **Valid pixel count** | QC flag for cloud coverage |

Sentinel Hub Statistical API directly returns these stats per `geometry` + `evalscript` combination — no local raster processing required.

### 5.3 Time-Series Construction and Change Detection

Recommended cadence: **all available clear scenes** (~5–16 days effective); supplement with 30-day rolling composites for gap-filling.

**Anomaly detection approaches**:

1. **Z-score vs. rolling 3-year same-DOY baseline**: `z = (VI_current − μ_baseline) / σ_baseline`. Alert threshold: z < −1.5 (moderate) or z < −2.0 (severe vigor decline).
2. **CUSUM (Cumulative Sum)**: Tracks progressive drift from expected trajectory; better for slow-developing mildew-related stress. Used in Daret et al. 2022 to detect heatwave vineyard damage [S3].
3. **Phenological trajectory matching**: Expected NDVI/NDRE curves per variety × training system × region are established from 2–5 years of historical S2 data; current-season deviations flagged [S1].
4. **Change detection ratio**: `Δ-VI = VI_t − VI_{t−1}` standardized by seasonal rate; detects rapid drop events consistent with disease damage.

Ryan et al. demonstrated that NDVI-stratified sampling protocols (NDVI3 method) can accurately capture population-level within-block variability over multiple seasons, confirming time-series stability [S7]. Zanchin et al. tracked S2 VI across a large Italian vineyard dataset (2017–2022), identifying latitude and vintage as dominant variability drivers [S28].

### 5.4 Integration into Graft Spray Ensemble Engine

The per-block satellite layer inputs to the mildew decision engine as:

1. **Spatial weighting modifier**: Low-NDRE blocks receive a higher prior probability weight for early infection models (the disease model score is spatially stratified by block vigor).
2. **Canopy density correction**: NDRE-derived LAI proxy adjusts the leaf wetness duration estimate from the on-vineyard weather stations (denser canopies retain moisture longer).
3. **Scouting trigger**: Δ-NDRE z-score < −1.5 raises a "field visit recommended" alert in the dashboard, independent of the model spray recommendation.

---

## 6. Soil Moisture & Precipitation

### 6.1 SMAP (NASA Soil Moisture Active Passive)

- **Resolution**: L3 Passive: 36 km; L4 (SMAP + GEOS model assimilation): 9 km; SMAP-HydroBlocks downscaling achieves 30 m for CONUS [S29].
- **Latency**: Near-real-time (< 24 h for L3; 3-day lag for L4).
- **Temporal coverage**: April 2015 – present.
- **Access**: NASA Earthdata (search.earthdata.nasa.gov); also via GEE (`NASA/SMAP/SPL3SMP_E/006`).
- **Vineyard relevance**: SMAP L4 provides soil moisture anomalies (departure from climatology) at 9 km — sufficient to identify regional drought episodes that alter mildew susceptibility windows. Reynolds et al. showed SMAP assimilation improves root-zone soil moisture monitoring for agricultural drought [S30]. Dari et al. demonstrated SMAP downscaled to 1 km accurately detects irrigation events in Mediterranean perennial crops [S31].
- **Limitation**: SMAP overestimates moisture under dense vegetation and underestimates in deserts; vineyard-specific calibration is needed for accurate volumetric water content in vineyards.

### 6.2 GPM IMERG (Global Precipitation Measurement Integrated Multi-satellitE Retrievals)

- **Resolution**: 0.1° × 0.1° (~10 km) at 30-minute time step.
- **Products**: Early Run (4-h latency), Final Run (3.5-month latency with gauge correction).
- **Coverage**: 60°S–60°N continuous; near-global.
- **Access**: NASA Earthdata; GEE (`NASA/GPM_L3/IMERG_V06`).
- **Vineyard mildew relevance**: GPM IMERG Early Run provides near-real-time precipitation forcing for downy mildew infection models (DMCast, Caffi primary infection) where on-site rain gauges are absent. Brocca et al. demonstrated GPM-derived products outperform rain gauges in sparsely gauged West African basins [S32].
- **Validation note**: IMERG tends to overestimate light precipitation and underestimate convective storms; ground-station correction (gauge merging) improves accuracy. For Graft Spray, IMERG serves as a **gap-fill layer** only where station density drops below 1 gauge per ~25 km².

### 6.3 ERA5-Land (ECMWF)

| Parameter | Value |
|---|---|
| Spatial resolution | ~9 km (0.1°) |
| Temporal resolution | Hourly |
| Variables relevant to mildew | 2 m air temperature, 2 m dewpoint temperature, surface pressure, 10 m wind, total precipitation, soil temperature (layers 1–4), volumetric soil water (layers 1–4) |
| Latency | 5-day lag (production); preliminary 2-day lag available |
| Archive | 1950–present |
| Access | Copernicus Climate Data Store (CDS API: `cdsapi`); also GEE (`ECMWF/ERA5_LAND/HOURLY`) |

ERA5-Land is the **recommended back-fill data source** for Graft Spray in regions where on-vineyard weather stations or third-party networks have gaps. Its 9 km, hourly resolution provides sufficient fidelity to drive hourly mildew infection models (Gubler-Thomas, Caffi). Rolle et al. used ERA5-Land for global crop irrigation requirement estimation, validating reasonable accuracy of its soil water balance [S33]. The ERA5-based global drought monitoring system provides SPEI indices for crop-growing regions [S34].

**Key limitation**: ERA5-Land is a reanalysis (model + observations blend); it can miss localized convective rainfall events relevant to downy mildew primary infection. Always prefer on-vineyard stations or dense weather network data where available; ERA5-Land fills gaps.

### Summary of Moisture/Precipitation Stack

| Layer | Resolution | Latency | Primary Use in Graft Spray |
|---|---|---|---|
| On-site weather station (Stream 3 layer) | Point | Real-time | Primary forcing |
| Weather network (Stream 3 layer) | ~5–20 km | 15 min | Secondary forcing |
| GPM IMERG Early | 10 km / 30 min | 4 h | Gap-fill precipitation, remote regions |
| ERA5-Land | 9 km / 1 h | 5 days | Historical gap-fill, multi-year climatology |
| SMAP L4 | 9 km / 3 days | 3 days | Regional drought pre-conditioning |
| Sentinel-1 SAR (S1) | 10 m / 6 days | ~24 h | Local soil moisture proxy, spatial heterogeneity |

---

## 7. Recommended Phase-1 Stack

### 7.1 Minimum Viable Satellite Pipeline

| Component | Specification | Rationale |
|---|---|---|
| **Primary optical mission** | Sentinel-2 L2A (CDSE, free) | Free, 10 m, ~5-day revisit, validated in viticulture; NDRE available via 20 m red-edge bands |
| **Primary VI** | NDRE (B7–B5 ratio) | Earlier chlorophyll stress signal than NDVI; better disease/stress sensitivity per Taylor & Bates [S14] |
| **Secondary VI** | NDWI (B3–B8A ratio) | Canopy water proxy; water stress = mildew susceptibility precursor |
| **Cloud mask** | s2cloudless (probability < 0.4) + SCL shadow mask | Best combined cloud/shadow detection for precision agriculture use-case [S27] |
| **Access path** | CDSE Sentinel Hub Statistical API | Zero data cost; per-polygon JSON stats without full scene download |
| **Parcel layer** | GeoJSON blocks (grower-submitted + RPG/SIGPAC) | Required input; 1 JSON per block, >0.3 ha threshold |
| **Cadence** | All available clear scenes (effective ~10–16 days) + 30-day median composite fill | Balances freshness with cloud contamination |
| **Time-series storage** | PostgreSQL/TimescaleDB with per-block stats | Enables z-score baseline computation and anomaly queries |
| **Alert logic** | NDRE z-score < −1.5 vs. rolling 3-yr DOY-matched baseline | Simple, interpretable; triggers field scout recommendation |

### 7.2 Moisture / Precipitation Supplement

- **ERA5-Land** via CDS API (Python `cdsapi` library): hourly T2m, Td2m, precipitation for all vineyard centroids not covered by on-site stations.
- **SMAP L4** via GEE (weekly, for drought pre-conditioning indicator): included in the decision engine as a regional susceptibility modifier.

### 7.3 Optional Phase-2 Upgrades

| Upgrade | Benefit | Cost |
|---|---|---|
| PlanetScope daily mosaic (3 m) | Detects late-stage disease expression earlier than S2; daily cadence captures rapid events | Commercial subscription (Planet) |
| Sentinel-1 SAR (10 m) synergy | All-weather soil moisture; vineyard-scale spatial variability; supplements during cloudy periods | Free (CDSE) |
| FORCE multi-sensor fusion (S2 + Landsat) | ~3-day effective revisit via harmonized compositing | Own cloud compute |
| ECOSTRESS / future LSTM | 70 m thermal IR for CWSI estimation | Not yet operational at daily cadence |

### 7.4 Where it Plugs into the Ensemble Engine

```
Sentinel-2 Statistical API (per-block NDRE, NDWI, z-score)
       ↓
 [Satellite Layer] — inputs to ensemble model:
       ├── Vigor modifier:     low-NDRE z-score → prior disease probability ↑
       ├── Canopy density:     NDRE-derived LAI → leaf wetness model correction
       ├── Scout trigger:      Δ-NDRE < −1.5σ → "visit recommended" flag
       └── Drought pre-cond:  NDWI + SMAP anomaly → susceptibility window
             ↕
 [Weather/Model Layer] (Streams 3 + 6) — hourly T, RH, precipitation
             ↕
 [Mildew Model Layer] (Stream 6) — Caffi DM, Gubler-Thomas PM
             ↕
 [Spray Recommendation Output]
```

---

## Sources

| Ref | Title | Authors | Year | Access | URL / DOI |
|---|---|---|---|---|---|
| S1 | Potential of Sentinel-2 satellite images to monitor vine fields grown at a territorial scale | Tisseyre B, Leroux C, Devaux N, Crestey T | 2019 | Open | https://doi.org/10.20870/OENO-ONE.2019.53.1.2293 |
| S2 | Sentinel-2 Validation for Spatial Variability Assessment in Overhead Trellis System Viticulture Versus UAV and Agronomic Data | Di Gennaro SF, Dainelli R, Palliotti A, Toscano P, Matese A | 2019 | Open | https://doi.org/10.3390/rs11212573 |
| S3 | Can we detect the damage of a heatwave on vineyards using Sentinel-2 optical remote sensing data? | Daret E, Amin G, Bazzi H, El Hajj M, Baghdadi N et al. | 2022 | Open | https://doi.org/10.20870/oeno-one.2022.56.1.4632 |
| S4 | Comparison and Ground Truthing of Different Remote and Proximal Sensing Platforms to Characterize Variability in a Hedgerow-Trained Vineyard | Squeri C, Poni S, Di Gennaro SF, Matese A, Gatti M | 2021 | Open | https://doi.org/10.3390/rs13112056 |
| S5 | Improving the Accuracy of Seasonal Crop Coefficients in Grapevine from Sentinel-2 Data | Guevara-Torres DR, Luo H, Do C, Ostendorf B, Pagay V | 2025 | Open | https://doi.org/10.3390/rs17193365 |
| S6 | Satellite and Proximal Sensing to Estimate the Yield and Quality of Table Grapes | Balafoutis A, Biniari A, Anastasiou E, Xanthopoulos G, Darra N, Fountas S, Psiroukis V | 2018 | Open | https://doi.org/10.3390/AGRICULTURE8070094 |
| S7 | A New, Satellite NDVI-Based Sampling Protocol for Grape Maturation Monitoring | Ryan C, Bioni C, Meyers J, Van Heuvel JE, Dokoozlian N | 2020 | Open | https://doi.org/10.3390/rs12071159 |
| S8 | Assessing the Capacity of High-Resolution Commercial Satellite Imagery for Grapevine Downy Mildew Detection and Surveillance in New York State | Kanaley K, Combs DB, Paul A, Jiang Y, Bates TL, Gold K | 2024 | **Paywalled** | https://doi.org/10.1094/PHYTO-11-23-0432-R |
| S9 | Using Time Series of High-Resolution Planet Satellite Images to Monitor Grapevine Stem Water Potential in Commercial Vineyards | Ben-Gal A, Peeters A, Helman D, Bahat I, Alchanatis V, Cohen Y, Netzer Y | 2018 | Open | https://doi.org/10.3390/RS10101615 |
| S10 | Mapping Crop Calendar Events and Phenology-Related Metrics at the Parcel Level by OBIA of MODIS-NDVI Time-Series | Castro A, Peña J, Six J, Plant R | 2018 | Open | https://doi.org/10.3390/rs10111745 |
| S11 | Sentinel-1 SAR Backscatter Response to Agricultural Drought in The Netherlands | Shorachi M, Kumar V, Steele-Dunne S | 2022 | Open | https://doi.org/10.3390/rs14102435 |
| S12 | Box Sampling: a New Spatial Sampling Method for Grapevine Macronutrients Using Sentinel-1 and Sentinel-2 Satellite Images | Trivedi MB, Bates TR, Meyers J, Shcherbatyuk N, Davadant P, Chancia R, Lohman R, Van Heuvel JE | 2025 | **Paywalled** | https://doi.org/10.1007/s11119-025-10225-5 |
| S13 | Hybrid Methodology Using Sentinel-1/Sentinel-2 for Soil Moisture Estimation | Albergel C, Ayari E, Zribi M, Baghdadi N, Rodríguez-Fernández N, Madelon R, Nativel S | 2022 | Open | https://doi.org/10.3390/rs14102434 |
| S14 | Comparison of Different Vegetative Indices for Calibrating Proximal Canopy Sensors to Grapevine Pruning Weight | Taylor J, Bates T | 2021 | **Paywalled** | https://doi.org/10.5344/ajev.2021.20042 |
| S15 | Investigating the Potential of UAV-Based Hyperspectral Sensor in Detecting Powdery Mildew in Grapes | Acosta MD, Pena J, Sherafat A, Gonzalez CC, Sherman TM, Bhandari S, Raheja A | 2024 | **Paywalled** | https://doi.org/10.1117/12.3014667 |
| S16 | Use of Sentinel-2 Satellite for Spatially Variable Rate Fertiliser Management in a Sicilian Vineyard | Comparetti A, Marques da Silva J | 2022 | Open | https://doi.org/10.3390/su14031688 |
| S17 | Monitoring Vineyard Water Status Using Sentinel-2 Images: Qualitative Survey on Five Wine Estates in South of France | Costard AD, Laroche-Pinel E, Clenet H, Hourdel J, Rousseau J, Vidal-Vigneron M, Duthoit S, Chéret V | 2021 | Open | https://doi.org/10.20870/oeno-one.2021.55.4.4752 |
| S18 | Spectral Differentiation of Whitish Leaf Diseases — Impact of Host Tissue, Symptom Variability and Scale | Oerke EC, Steiner U | 2026 | Open | https://doi.org/10.3390/rs18070976 |
| S19 | Application of Remote Sensing Techniques to Discriminate the Effect of Different Soil Management Treatments over Rainfed Vineyards in Chianti Terroir | Antichi D, Raffa D, Rallo G, Puig-Sirera À | 2021 | Open | https://doi.org/10.3390/rs13040716 |
| S20 | Vineyard Variability Analysis through UAV-Based Vigour Maps to Assess Climate Change Impacts | Pádua L, Sousa A, Peres E, Sousa J, Guimarães N, Marques P, Adão T | 2019 | Open | https://doi.org/10.3390/agronomy9100581 |
| S21 | A Systematic Review on the Advancements in Remote Sensing and Proximity Tools for Grapevine Disease Detection | Portela F, Sousa JJ, Araújo-Paredes C, Peres E, Morais R, Pádua L | 2024 | Open | https://doi.org/10.3390/s24248172 |
| S22 | Sentinel Hub API Documentation — Rate Limiting | Sinergise/Planet | 2024 | Open | https://docs.sentinel-hub.com/api/latest/api/overview/rate-limiting/ |
| S23 | Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask | Baetens L, Desjardins C, Hagolle O | 2019 | Open | https://doi.org/10.3390/RS11040433 |
| S24 | KappaMask: AI-Based Cloudmask Processor for Sentinel-2 | Domnich M, Sünter I, Trofimov H et al. | 2021 | Open | https://doi.org/10.3390/rs13204100 |
| S25 | Sentinel-2 Surface Reflectance Products Generated by CNES and DLR: Methods, Validation and Applications | Hagolle O, Colin J, Coustance S, Kettig P, d'Angelo P et al. | 2021 | Open | https://doi.org/10.5194/isprs-annals-v-1-2021-9-2021 |
| S26 | Validation of Atmospheric Correction Approaches for Sentinel-2 under Partly-Cloudy Conditions | Kganyago M, Ovakoglou G, Mhangara P, Alexandridis T, Odindi J, Adjorlolo C, Mashiyi N | 2020 | Open | https://doi.org/10.1117/12.2572293 |
| S27 | AgroShadow: A New Sentinel-2 Cloud Shadow Detection Tool for Precision Agriculture | Magno R, Rocchi L, Dainelli R, Matese A, Di Gennaro SF, Chen CF, Son N, Toscano P | 2021 | Open | https://doi.org/10.3390/rs13061219 |
| S28 | Satellite Monitoring of Italian Vineyards and Spatio-Temporal Variability Assessment | Zanchin A, Cogato A, Sozzi M, Tomasi D, Marinello F | 2024 | Open | https://doi.org/10.3390/agriengineering6040232 |
| S29 | SMAP-HydroBlocks, a 30-m Satellite-Based Soil Moisture Dataset for the Conterminous US | Vergopolan N, Chaney NW, Wood EF, Sheffield J, Beck HE et al. | 2021 | Open | https://doi.org/10.1038/s41597-021-01050-2 |
| S30 | Agricultural Drought Monitoring via the Assimilation of SMAP Soil Moisture Retrievals | Reynolds C, Mladenova I, Bolten J, Sazib N, Crow W | 2020 | Open | https://doi.org/10.3389/fdata.2020.00010 |
| S31 | Exploiting High-Resolution Remote Sensing Soil Moisture to Estimate Irrigation Water Amounts over a Mediterranean Region | Dari J, Brocca L, Escorihuela MJ, Quintana-Seguí P, Morbidelli R, Stefan V | 2020 | Open | https://doi.org/10.3390/rs12162593 |
| S32 | River Flow Prediction in Data Scarce Regions: Soil Moisture Integrated Satellite Rainfall Products | Brocca L, Massari C, Pellarin T, Filippucci P, Ciabatta L et al. | 2020 | Open | https://doi.org/10.1038/s41598-020-69343-x |
| S33 | ERA5-Based Global Assessment of Irrigation Requirement and Validation | Rolle M, Claps P, Tamea S | 2021 | Open | https://doi.org/10.1371/journal.pone.0250979 |
| S34 | A Global Drought Monitoring System and Dataset Based on ERA5 Reanalysis: A Focus on Crop-Growing Regions | El Kenawy A, Latorre B, Peña-Angulo D et al. | 2022 | **Paywalled** | https://doi.org/10.1002/gdj3.178 |
| S35 | Satellite Remote Sensing Tools for Drought Assessment in Vineyards and Olive Orchards: A Systematic Review | Crespo N, Pádua L, Santos JA, Fraga H | 2024 | Open | https://doi.org/10.3390/rs16112040 |

---

## Appendix: Key Gaps and Limitations

1. **No satellite index reliably detects pre-symptomatic mildew at the block level.** All VI-based approaches respond to canopy damage expression, not infection itself. The 5–14 day latency between primary infection and symptom expression (visual or spectral) limits early-warning utility.
2. **10 m resolution mixes vine rows with inter-row soil/grass.** Pure-vine pixel extraction requires spectral unmixing or very narrow row spacing (< 1 m, rare in wine production). Graft Spray Phase 1 should apply a canopy fraction correction factor (from grower-reported training system + row spacing) to normalize per-block VI values.
3. **Cloud cover in Atlantic/continental Europe can exceed 50–70 % during March–June** (the critical downy mildew primary infection season). A 30-day rolling composite with s2cloudless masking is the most practical mitigation; Sentinel-1 SAR provides the cloud-penetrating backup.
4. **PlanetScope's most capable sensor configuration (SuperDove, 8-band including red-edge) is not universally available**; standard Dove PlanetScope lacks red-edge bands needed for NDRE, limiting its direct comparison to Sentinel-2 for chlorophyll-sensitive indices.
5. **SMAP and ERA5-Land coarse spatial resolution** (9–36 km) cannot resolve block-level soil moisture differences within complex terroir mosaics. Local soil moisture sensors (Stream 3) remain essential for fine-scale canopy wetness duration estimates.
