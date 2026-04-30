# Miscellaneous Supporting Documentation

> **Graft Spray Research Dossier — Category 7**
> Geographic priority: Napa & Sonoma > Burgundy > Bordeaux > Mendoza > global
> Umbrella goal: Tell winegrowers when to spray (and when not to) for powdery and downy mildew, saving money vs. indiscriminate spraying.

---

## Summary

This category consolidates seven cross-cutting domains that underpin the Graft Spray app but do not fit the disease-model, weather, or agronomy categories: alerting design, spatial data standards, GPS hardware, spray machinery, regulatory compliance, outdoor mobile UX, and applicator safety. Together they define the operational envelope within which the core disease-risk engine must communicate its outputs to growers.

Key findings in brief:
- **Notifications**: 3–5 push alerts/day is the fatigue threshold; spray-timing alerts should lead the optimal window by 12–24 h; multi-channel (push + SMS) doubles confirmation rates in field contexts.
- **Vineyard mapping**: GeoJSON (RFC 7946) + PostGIS (WGS84/EPSG:4326 storage, EPSG:32610/32611 for area math) is the de-facto standard; AgGateway ADAPT and ISO 11783-10 (ISOXML PFD) are the dominant interchange schemas.
- **GPS**: Standard smartphone = 3–5 m open-sky, up to 10 m under canopy. RTK closes this to 2–4 cm; VineView PinPoint RTK (released Napa 2024) targets vineyard-scale precision mapping.
- **Spray equipment**: Airblast sprayers dominate vineyards; water volumes range 500–1,000 L/ha for vine canopies; drone rules (FAA Part 107 + Part 137 + 44807 exemption for >55 lb) are increasingly relevant in California hillsides.
- **Compliance**: California DPR requires 14 fields, monthly county submission by the 10th, 3-year retention (5 years if bonded winery TTB). France requires machine-readable digital records effective 1 Jan 2027, 5-year retention. EU Reg 2023/564 mandates electronic records across all Member States from 1 Jan 2026 (France delay to 2027).
- **Outdoor UX**: Minimum 1,000 nits brightness for field readability; minimum 44 × 44 pt / 48 dp tap targets — increase to 60 dp for gloved/moving users. High-contrast yellow/black or white-on-dark palettes outperform default themes outdoors.
- **Licensing & PPE**: California QAL/QAC required for restricted-use pesticides. EU Sustainable Use Directive mandates competency certification. PPE is label-driven by FRAC group; systemic fungicides (SDHI FRAC 7, DMI FRAC 3) generally require chemical-resistant gloves, eye protection, and respiratory protection during mixing/loading.

---

## Key Findings

| Domain | Critical Number / Fact |
|---|---|
| Notification fatigue threshold | ≤ 5 push/day; cap spray alerts at 2–3/event [S1] |
| Alert lead time for spray windows | 12–24 h before optimal window opens [S2, S3] |
| Smartphone GPS open-sky accuracy | 3–5 m typical; 10 m under canopy [S4] |
| RTK GPS accuracy (vineyard) | 2–4 cm (VineView PinPoint RTK, Napa 2024) [S5] |
| Standard vine-canopy water volume | 500–1,000 L/ha for small canopies [S6] |
| Drone max height above canopy | 2.0 m to minimize drift [S7] |
| CA DPR required PUR fields | 14 mandatory fields, submit by 10th of following month [S8] |
| CA retention period | 3 years (DPR), 5 years if TTB-bonded winery [S9] |
| US Federal RUP retention | 2 years (USDA 1990 Farm Bill) [S10] |
| France registre phytosanitaire | Machine-readable from 1 Jan 2027; retain 5 years [S11] |
| EU Reg 2023/564 | Electronic records mandatory Jan 2026 (France delayed to 2027) [S12] |
| Argentina SENASA | BPA documentation; national registration via Resolution 350/99 [S13] |
| Outdoor display readability | ≥ 1,000 nits; ≥ 4.5:1 contrast (WCAG AA); target 7:1 for sunlight [S14] |
| Gloved tap target | ≥ 60 dp / 1 cm × 1 cm physical minimum; Apple HIG: 44 pt [S15, S16] |
| CA pesticide applicator license | QAL (qualified applicator license) or QAC required for restricted-use [S17] |

---

## Detailed Notes

### Notification & Alerting Best Practices

#### 1.1 Spray-Alert Timing Relative to Weather Windows

The core purpose of a spray-timing notification is **actionable lead time**: the grower must be able to act before the window closes. Research from WSU's AgWeatherNet spray guidance tool [S2] defines optimal spray conditions as: temperature inversion Tz ≤ 0 °F, Delta-T 3.6–14.4 °F (2–8 °C), wind speed 4–10 mph. These conditions are forecastable 24–72 h in advance, giving a realistic alert horizon.

**Recommended alert schedule for high-risk disease windows:**

| Alert type | Timing | Channel | Content |
|---|---|---|---|
| "High-risk window opening" | 18–24 h before onset | Push + SMS | Disease model score, forecasted window duration |
| "Spray now" | 2–4 h before optimal conditions | Push | Current conditions, recommended product, PHI |
| "Window closing" | 1 h before wind/temp violation | Push | Urgent; suppress if already sprayed |
| "Post-spray confirmation" | 30 min after expected spray time | Push | Confirm spray logged; triggers PUR pre-fill |
| "Missed window" | 6 h after window closure | Low-priority push | Rescheduling suggestion |

The Farmdeck app [S3] uses a four-factor model (wind, rain probability, Delta-T, wind direction) giving "Preferred / Unsuitable" classification — a binary that reduces cognitive load in the field.

Arable's in-field monitoring approach [S18] integrates leaf wetness, humidity, and temperature as hyperlocal triggers — avoid sending weather-station-derived alerts when grower is >5 km from station; always caveat with confidence interval.

#### 1.2 Notification Fatigue

Alert fatigue is a well-documented phenomenon: users receiving >5 alerts/day show significantly elevated opt-out rates [S1]. Practical guidance:

- **Frequency cap**: ≤ 2–3 spray-specific alerts per high-risk event (warn → confirm → follow-up).
- **Personalization over broadcasting**: Segment by block risk level; do not alert growers with no high-risk blocks.
- **User-controlled thresholds**: Let growers set their own risk score trigger (e.g., only alert if EIP index > 60). This single setting dramatically reduces irrelevant alerts.
- **Progressive urgency**: Use quiet notification for low-risk forecasts (badge update only); standard push for moderate; rich push with sound for imminent high-risk windows.
- **Respect "do not disturb" hours**: No spray alerts 10 PM–5 AM. Growers cannot spray in the dark.

From the Guidebook event-app research [S19], messages capped at 50–100 characters and sent 15–30 min before action windows achieve the best engagement; translate: spray alerts should state a single action, e.g., "Block B powdery risk HIGH — spray window opens 6 AM tomorrow."

#### 1.3 Multi-Channel Best Practices

| Channel | Strengths | Weaknesses | Ag context |
|---|---|---|---|
| Push notification | Free, immediate, rich media | Requires installed app, can be disabled | Primary channel; best for active-season growers |
| SMS | Universally received, no app needed | 160 char limit, per-message cost | Backup for critical alerts; works in low-connectivity areas |
| Email | Full content, archivable | Not real-time; often missed during field hours | Use for daily or weekly summaries, log confirmations |
| In-app feed | Durable record | Only seen when app opened | Audit trail; supplement not replace push |

For vineyard markets, SMS is particularly valuable because many hillside blocks (Napa hourglass district, Sonoma Coast, Mendoza Altamira) have poor cellular data but adequate 2G/SMS coverage.

#### 1.4 Permission Flows and Consent

**iOS**: Request push permission at a high-value moment (e.g., after first spray log is created or after first disease-risk alert is available). Apple's HIG recommends asking after demonstrating value — not on first launch. Use `UNAuthorizationOptions` with `.alert`, `.sound`, `.badge`. iOS 15+ supports Focus modes: use `UNNotificationInterruptionLevel.timeSensitive` for imminent spray-window alerts.

**Android**: Android 13+ requires explicit `POST_NOTIFICATIONS` permission. Use notification channels (e.g., `spray_alerts`, `weekly_summary`) so users can selectively disable lower-priority channels without losing critical alerts.

**GDPR/CCPA**: For EU growers, location-linked notifications constitute personal data processing. Include notification consent in GDPR consent flow; record lawful basis (legitimate interest or explicit consent). For California, CCPA applies if the app collects geolocation data.

---

### Vineyard Mapping Standards

#### 2.1 Block / Row / Panel / Vine Terminology

Industry-standard hierarchy (applied in Napa, Sonoma, Burgundy, Mendoza):

| Level | Definition | Typical ID scheme |
|---|---|---|
| **Farm / Estate** | Legal entity or property | Text name + FIPS/SIRET/CUIG |
| **Block** | Named management unit; typically one variety, rootstock, training system, or soil type [S20] | Alphanumeric (e.g., "B3", "Cab-North") |
| **Row** | Single trellis line within a block | Integer, 1-origin from reference end |
| **Panel** | Contiguous section of a row bounded by posts or drainage lines | Row# + Panel letter/number |
| **Vine** | Individual plant | Row# + Position# (e.g., R12V45) |

Blocks are the minimum spatial unit for pesticide use reporting (California DPR PUR requires block-level date-specific records) [S8]. App should store blocks as the primary polygon layer; rows and panels are sub-geometries derived from block boundary + row count + row spacing.

Alleyways (drives between blocks) and headlands (end-of-row turnaround space; minimum 30 ft / 9 m) [S21] should be represented as non-productive geometries to accurately compute treated area.

#### 2.2 GeoJSON Conventions for Vineyard Polygons

GeoJSON RFC 7946 [S22] is the interchange standard. Key conventions for vineyard blocks:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-122.4194, 38.2978],
            [-122.4180, 38.2978],
            [-122.4180, 38.2965],
            [-122.4194, 38.2965],
            [-122.4194, 38.2978]
          ]
        ]
      },
      "properties": {
        "block_id": "B3",
        "name": "Cabernet North",
        "variety": "Cabernet Sauvignon",
        "rootstock": "110R",
        "row_count": 48,
        "row_spacing_m": 2.4,
        "vine_spacing_m": 1.1,
        "training_system": "VSP",
        "area_ha": 1.42,
        "planted_year": 2008
      }
    }
  ]
}
```

**Mandatory RFC 7946 rules:**
- Coordinate order: **[longitude, latitude]** (GeoJSON is lon-lat, not lat-lon — common inversion bug).
- Exterior ring winding: **counterclockwise**.
- CRS: RFC 7946 mandates **WGS84 (EPSG:4326)** — the `"crs"` member from the 2008 spec was removed.
- Polygon must close (first position = last position).
- Use `MultiPolygon` for non-contiguous blocks (e.g., block split by road).

#### 2.3 PostGIS Best Practices

**Storage vs. computation CRS:**
- Store all geometries in **EPSG:4326 (WGS84)** using the `geography` type in PostGIS. The `geography` type computes geodesically correct areas and distances without reprojection.
- For area calculations (e.g., treated hectares for PUR), either use `ST_Area(geom::geography)` (returns m²) directly, or project to a local UTM zone:
  - Napa/Sonoma: **EPSG:32610** (UTM Zone 10N)
  - Burgundy/Bordeaux: **EPSG:32631** (UTM Zone 31N)
  - Mendoza: **EPSG:32719** (UTM Zone 19S)

**Indexing:**
- Use **GiST spatial index** for vineyard block polygons (frequently updated geometries, point-in-polygon queries). Syntax: `CREATE INDEX idx_blocks_geom ON blocks USING GIST(geom)` [S23].
- Use **BRIN index** only for large static datasets (e.g., archived field boundary history ordered by creation date).

**Schema pattern for Graft Spray:**

```sql
CREATE TABLE vineyard_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id),
    block_code TEXT NOT NULL,
    block_name TEXT,
    variety TEXT,
    rootstock TEXT,
    planted_year SMALLINT,
    row_count INTEGER,
    row_spacing_m NUMERIC(4,2),
    vine_spacing_m NUMERIC(4,2),
    training_system TEXT,
    area_ha NUMERIC(6,3) GENERATED ALWAYS AS (
        ROUND(ST_Area(geom::geography) / 10000, 3)
    ) STORED,
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_blocks_geom ON vineyard_blocks USING GIST(geom);
CREATE INDEX idx_blocks_farm ON vineyard_blocks(farm_id);
```

#### 2.4 AgGateway ADAPT Standard

AgGateway's ADAPT (Agricultural Data Transfer) standard [S24] defines a canonical Field schema:
- **Field**: Named, farmer-accepted physical space; has `Id`, `Name`, `FarmId`, `ActiveBoundaryId`, `ArableArea`, `GuidanceGroupId`, `TimeZone`.
- **FieldBoundary**: Four categories (operational, legal, physical, administrative); geometry is always `Polygon` or `MultiPolygon`. AgGateway published field boundary categorization guidelines in Dec 2023 [S25].
- ADAPT also defines GNSS accuracy metrics as part of field boundary metadata (standard under development per Q3 2023 portfolio update).

For Graft Spray, ADAPT compatibility is valuable for importing boundaries from John Deere Operations Center, Climate FieldView, or CNH AFS — all of which support ADAPT-format exports.

#### 2.5 ISO 11783 (ISOBUS) / ISOXML

ISO 11783-10 defines **ISOXML / TASKDATA** format [S26], the standard for farm-management-to-machine data exchange:
- **PFD (Partfield)**: The field element; contains boundary polygons, lines, and points. This is the ISO equivalent of a vineyard block.
- **TSK (Task)**: Spray application job; references PFD, DVC (device), WKR (worker), PDT (product), TZN (treatment zone).
- **TIM + PTN + DLV**: GPS track log capturing actual spray coverage.
- **GRD**: Binary prescription grid files for variable-rate application maps.
- Version 3.3 is widely deployed; Version 4.3 adds guidance patterns and product mixtures.

ISOXML is relevant for Graft Spray when integrating with precision sprayers that support ISOBUS task controllers (most commercial airblast sprayers built after 2015 can be equipped with ISOBUS terminals).

---

### GPS Accuracy in Vineyard Settings

#### 3.1 Standard Smartphone GPS

Under open sky, standard smartphone GNSS provides **3–5 m accuracy** (horizontal, 95th percentile) [S4, S27]. Under vine canopy:
- Multipath errors from leaf and wire reflection can degrade this to **5–10 m** [S4].
- A Cal Poly study (n=30 control points, ArcGIS Field Maps, multiple phone models) found overall mean error of 10.6 ft (3.2 m); best performers were iPhone SE 3 (4.87 ft / 1.5 m) and iPhone 15 Pro (5.10 ft / 1.6 m) [S28].
- Dual-frequency GNSS phones (L1 + L5) significantly reduce multipath errors; available in flagship phones since ~2019.

**Practical implication for Graft Spray block-drawing**: At 3–5 m accuracy, users drawing block boundaries by walking the perimeter will introduce errors of similar magnitude to the vine row spacing (2–2.4 m typical). For small blocks (<1 ha), a 5 m positional error on one corner can create >5% area calculation error — material for PUR treated-area reporting. Recommend:
1. Enable position averaging (collect 5–10 fixes per vertex).
2. Warn users if reported accuracy (HDOP × base error) exceeds 8 m.
3. Offer satellite imagery snap-to-edge correction in the UI.

#### 3.2 RTK / DGPS Options

| System | Accuracy | Cost range | Use case |
|---|---|---|---|
| Standard smartphone GNSS | 3–5 m open, 5–10 m under canopy | Included | Block boundary drawing (general use) |
| SBAS/WAAS-corrected GNSS | 1–3 m | Minimal (receiver upgrade) | Improved mapping without infrastructure |
| DGPS (post-processed) | 0.2–1 m | $500–$2,000 (receiver) | Field boundary submission to county, precise area |
| RTK (network, NTRIP) | 2–4 cm | $3,000–$10,000 + subscription | Row-by-row prescription, autosteering, density maps |
| RTK (dedicated vineyard) | 2–5 cm | ~$5,000 (VineView PinPoint RTK [S5]) | Block mapping, disease spread tracking, yield maps |

**VineView PinPoint RTK** (released Napa, CA, July 2024) is purpose-built for vineyard operators, integrating with the VineView disease mapping platform. It offers 2–5 cm accuracy, enabling precise vine-level data collection [S5].

For Graft Spray, RTK is not required for core block-drawing but should be supported as an optional Bluetooth GNSS receiver input (via `ExternalGPS` on iOS or `MockLocation` provider on Android) for growers who want precise treated-area records for premium compliance.

#### 3.3 Implications for Block Boundary Drawing Accuracy

The critical compliance question is: **does GPS error materially affect treated-area calculation used in PUR submissions?**

- A 2 ha block with a 5 m GPS error on all four corners will have area error of approximately ±0.5–1% — acceptable.
- A 0.1 ha block (very small) with same GPS error could have ±5–10% area error — potentially material.

**Design recommendation**: For blocks < 0.5 ha, prompt users to verify the computed area against their own records or satellite imagery measurement before submitting.

---

### Spray Equipment Basics

#### 4.1 Airblast Sprayers (Most Common)

Airblast (axial-fan) sprayers are the dominant equipment type in vineyards globally. They force spray droplets into the canopy using high-velocity air (30–80 m/s typical) [S29].

**Key operational parameters for app recommendations:**

| Parameter | Typical range | Notes |
|---|---|---|
| Travel speed | 3–5 mph (4.8–8 km/h) | Faster = less coverage per unit length |
| Operating pressure | 80–150 psi | Affects droplet size; higher pressure = finer droplets |
| Water volume (small/vine canopy) | 500–1,000 L/ha (55–110 US gal/ac) [S6] | Scale to canopy size using Tree Row Volume method |
| Water volume (dilute, full canopy) | 700–1,000 L/ha | Used mid-season for fungicides |
| Water volume (concentrated) | 300–500 L/ha | Increased product concentration, fewer passes |
| Nozzle positions | 5–8 per side | Distributed vertically to match canopy height |

**Tree Row Volume (TRV) method** for calibration: TRV (L/ha) = (canopy height m × canopy width m × coverage factor) ÷ row spacing m. Coverage factors for vine canopies (deciduous): 0.007–0.1 L/m³. This is the standard method referenced by UC Cooperative Extension [S30].

Graft Spray should capture `canopy_stage` (pre-shoot, shoot elongation, flowering, fruit set, veraison, post-harvest) to dynamically recommend water volume adjustment — canopy density doubles from bud break to flowering, requiring proportionally higher volumes for equivalent coverage.

**Water-sensitive paper (WSP)** verification: The PNW 749 calibration guide [S29] recommends WSP cards placed at multiple canopy positions to confirm spray penetration after any calibration change. App could prompt: "Did you verify coverage today? [Yes / Set reminder]."

#### 4.2 Tower / Over-Row Sprayers

Tower sprayers (upright boom) distribute spray from multiple fixed boom arms:
- Better suited to high-wire training systems (GDC, Geneva Double Curtain) and taller canopies.
- For tower sprayers, distribute nozzle flow evenly across the boom (vs. ½ flow in upper ⅓ for low-profile axial sprayers) [S31].
- More common in flat, irrigated vineyards (San Joaquin Valley, Mendoza, Languedoc) than in hillside Napa/Sonoma.

#### 4.3 Recycling Tunnel Sprayers

Tunnel sprayers collect and recycle overspray, achieving 20–40% reduction in chemical use. Common in Bordeaux and southern France; rare in California. Require minimum row spacing of ~1.8 m. App should flag when recommending reduced-dose application in tunnel sprayer context.

#### 4.4 Drone Application

**US regulations (FAA):**
- Drones < 55 lbs: **14 CFR Part 107** (Remote Pilot Certificate) + **Part 137** (Agricultural Aircraft Operator Certificate) [S7].
- Drones > 55 lbs (common agricultural models): **Section 44807 exemption** + N-number registration required [S7].
- **Approved states**: California hillside vineyards are a primary early-adopter market. FAA has approved specific drone models under case-by-case waivers for steep terrain.

**Operational drift parameters:**

| Parameter | Optimal value | Rationale |
|---|---|---|
| Height above canopy | 1.5–2.0 m | Each additional meter doubles drift index [S7] |
| Flight speed | 2.5 m/s (5.6 mph) for most models | Higher speed creates vortices |
| Wind speed limit | ≤ 10 km/h (Swiss standard) | Operators avoid spraying above this threshold |
| Temperature | < 85°F; humidity > 50% | Reduces droplet evaporation |
| Preferred nozzle | Air-induction (e.g., Airmix 110-015) | Very Coarse (VC) droplets, DV50 ≈ 462 µm, 1.44% < 100 µm [S7] |

DJI Agras T30/T100, Talos T60X, and XAG P150 are the leading models in California vineyard use [S7]. Drones use 96% less water per hectare than conventional sprayers (4–10 L/ha vs 500–1000 L/ha) but require higher product concentration accordingly.

**Graft Spray app equipment flag**: When `equipment_type = drone`, swap concentration-factor display, enforce 5 mph max wind advisory, and prompt for Part 137 operator credential recording in the spray log.

#### 4.5 Nozzle Types and Droplet Size

Droplet size classification (ASABE S572.3):

| Class | Symbol | DV50 range (µm) | Drift risk | Typical use |
|---|---|---|---|---|
| Very Fine | VF | < 100 | Very high | Aerial (special) |
| Fine | F | 100–175 | High | Difficult penetration needed |
| Medium | M | 175–250 | Moderate | General airblast |
| Coarse | C | 250–375 | Low | Drift-reduction standard |
| Very Coarse | VC | 375–450 | Very low | Drone, buffer zone |
| Extremely Coarse | XC | > 450 | Minimal | Herbicide near water |

For vineyard fungicide applications, **Medium to Coarse** is the standard target: fine enough for canopy penetration, coarse enough to minimize drift. Air-induction nozzles (TeeJet AI, AIXR, TTI; Lechler IDK; Agrotop Airmix) produce Coarse to Very Coarse droplets by entraining air.

In dry, windy Napa summers, shift to Coarse or Very Coarse nozzles to reduce evaporative drift loss (droplets < 150 µm can evaporate before reaching target at Delta-T > 10°C).

#### 4.6 Coverage Targets

| Target | Acceptable coverage | Ideal coverage |
|---|---|---|
| Powdery mildew (contact/protectant) | ≥ 30% surface coverage by WSP | 50–70% |
| Downy mildew (contact copper, mancozeb) | ≥ 40% coverage, both leaf surfaces | 60–80% |
| Botrytis (cluster treatment) | Cluster penetration: 20–40% minimum | > 50% |

Coverage assessment with WSP should be done at three canopy heights (bottom, middle, top wire) and both sides of the vine.

---

### Spray-Log Compliance by Region

#### 5.1 California — DPR, CAC, TTB

**Authority hierarchy**: California DPR (state) → County Agricultural Commissioner (enforcement, submission) → TTB (federal, if bonded winery).

**14 Required DPR PUR fields** [S8]:
1. Operator of record name and license
2. License type
3. Site location (block-level, not farm-level)
4. Commodity (e.g., "Grapes, Wine")
5. Product name (as on label)
6. EPA registration number
7. Amount applied (quantity and unit)
8. Rate per acre
9. Total acres treated
10. Application method (ground/aerial)
11. Date of application
12. Start and end times of application
13. Applicator name and license number
14. Applicator license type

**Deadlines and submission**:
- Record must be created within the timeframe on the pesticide label (typically 24–72 h post-application).
- **Monthly PUR submission** to county Ag Commissioner: due by the **10th of the following month** [S32].
- Submission via **CalAgPermits** (calagpermits.org) — free online portal now standard across all 58 counties.

**Retention periods** [S9]:
- California DPR minimum: **2–3 years** (3 years is common practice).
- TTB bonded winery requirement (27 CFR Part 186): **5 years** — controls if you are a bonded winery.
- Recommended: **7 years** (covers both with buffer).

**Restricted Materials Permits**: Certain fungicides (e.g., phosphine fumigants, some soil treatments) classified as California Restricted Materials require a permit from the County Ag Commissioner before purchase or use [S33]. Standard fungicide FRAC groups used for mildew (sulfur, copper, DMIs, SDHIs, QoIs) are generally not restricted materials in California — confirm per product label.

**Audit triggers**: TTB cross-references spray records against harvest dates to verify pre-harvest interval (PHI) compliance. Block-level, date-specific records are required — field-name-only logs fail TTB audit [S9].

#### 5.2 US Federal — EPA/FIFRA, WPS, USDA

**FIFRA requirements** [S34]:
- All pesticide products must bear an EPA Registration Number on the label; this number is a required PUR field.
- The label is the law (FIFRA §12); application must comply with label directions including PHI, REI, and PPE requirements.
- Records of restricted use pesticide (RUP) applications: 9 required elements, recorded within **14 days** of application, retained **2 years** [S10].

**EPA Worker Protection Standard (WPS)** [S35, S36]:
- Applies to any operation with hired agricultural workers exposed to pesticides.
- Defines **Restricted-Entry Interval (REI)**: period after application when untrained workers cannot enter treated areas.
- Spray record must be posted at a central location within 24 h of application completion, before workers re-enter.
- Required posting information (per WPS): pesticide name, active ingredient, EPA Reg. No., application dates/times, location, REI.
- Records retained for **2 years**.
- Handler training required before first exposure; Train-the-Trainer certification valid for instructors.

#### 5.3 EU — Sustainable Use Directive, Reg 1107/2009, Reg 2023/564

**Regulatory framework**:
- **Directive 2009/128/EC** (Sustainable Use Directive / SUD) [S37]: framework for sustainable pesticide use; requires Member State National Action Plans, applicator training, equipment inspection, aerial spray restrictions, buffer zones for water bodies.
- **Regulation (EC) No 1107/2009** [S38]: governs placement on market; Article 67 requires producers, distributors, importers to maintain records of PPPs; Member States control end-user records.
- **Regulation (EU) 2023/564** [S12]: mandates **electronic, machine-readable records** for all professional PPP users from **1 January 2026** (Member States may delay implementation; France delayed to 1 January 2027).

**Required EU record fields** (per Reg 2023/564) [S12]:
- Product name and authorisation number (AMM equivalent)
- Date/time of application, dosage, treated area size
- Geospatial identifiers or CAP-based field IDs (PAC parcel IDs in France)
- Crop/land use using EPPO codes and BBCH growth stages
- Format: electronic and machine-readable (XML, CSV, structured Excel)

**Record timing**: Within 30 days of application (before 2030); within 30 days as default (national law may shorten); France transitional: before 31 January of following year (until 2030).

**Retention**: Records must be retained for at least **3 years** under Reg 1107/2009; Reg 2023/564 effectively aligns with **5 years** in France.

#### 5.4 France — Registre Phytosanitaire, Carnet de Plaine, Mes Parcelles

**Carnet de plaine** vs **registre phytosanitaire**:
- **Carnet de plaine**: Field observation notebook (scouting notes, pest observations, weather, decisions). Not legally mandated but standard in French viticulture practice; supports IFT (Indice de Fréquence de Traitement) calculation.
- **Registre phytosanitaire** (phytosanitary register): **legally mandatory** since 2006 (arrêté du 16 juin 2009, Art. L. 257-3 code rural). Traces all PPP interventions.

**Digital mandate** [S11, S39]:
- From **1 January 2027** (delayed from 2026), registers must be machine-readable — paper, scanned PDFs, and non-structured Excel files are non-compliant.
- Accepted formats: structured .xls, .csv, .xml, or software-generated exports.

**8 required fields** (arrêté 16 juin 2009, updated under EU 2023/564) [S11]:
1. Localisation de la parcelle (ilot PAC + parcelle + commune, or GPS point)
2. Numéro SIRET de l'exploitant
3. Culture (type, label, open field/sheltered)
4. Nom et numéro AMM du produit
5. Surface traitée + identification de la parcelle
6. Date et heure d'application
7. Modalité d'application (equipment type)
8. Dose utilisée

**Optional but recommended**: météo (weather conditions), cible (pest/disease targeted), nom de l'applicateur.

**Retention**: **5 years**, available immediately on request by DRAAF, MSA, OFB, ANSES, or veterinary services [S11].

**Key platforms in France**:
- **Mes Parcelles** (Arvalis / Chambre d'Agriculture): dominant digital farm management platform; generates regulatory-compliant phytosanitary records; offline-capable smartphone app [S40].
- **Phytodata**: legacy data exchange format used by some French cooperative systems.
- **SMAG Farmer**, **Agryco**, **Farmable Enterprise**: other compliant solutions.

**IFT (Indice de Fréquence de Traitement)**: National indicator for pesticide reduction tracking under Écophyto 2030 (target: −50% by 2030). IFT = Σ(dose applied / reference dose) per ha. Graft Spray should compute and display IFT per block to help growers track against their Écophyto targets.

#### 5.5 Argentina — SENASA, BPA

**Regulatory authority**: SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria) is the sole national regulatory authority for phytosanitary products [S13].

**Registration framework**:
- **Resolution SENASA 350/99**: core regulation governing registration of crop protection products; requires GLP toxicological and efficacy data. New regulation 458/2025 (effective November 2025) streamlines this for products with recognized-country certificates (USA, EU, Canada, etc.) [S41].
- Registration is permanent (no expiry) unless SENASA revokes; annual/biannual fees required.
- Provinces may impose additional restrictions (e.g., buffer zones, agronomic prescription requirements).

**BPA (Buenas Prácticas Agrícolas)** [S13]:
- BPA documentation is mandatory for fruit/vegetable production under Argentine Alimentary Code (CAA) and for export certification.
- Spray records under BPA must document: product name, dose, date, application method, target pest, PHI, applicator identity, and equipment used.
- SENASA is developing a national traceability digital system (TDA — Trazabilidad Digital Agraria) linking container/packaging data with application records.

**No federal PUR-equivalent**: Unlike California, Argentina does not have a mandatory centralized spray use database. Records are maintained at the farm level and are subject to audit by SENASA and provincial agriculture offices.

**Mendoza-specific**: Mendoza's Instituto de Desarrollo Rural (IDR) and ISCAMEN (Instituto de Sanidad y Calidad Agropecuaria de Mendoza) regulate pesticide use in vineyards; growers must hold a carnet de aplicador (applicator credential).

---

### UX Patterns for Outdoor / Gloved / Sunlight-Readable Mobile Use

#### 6.1 Display Brightness and Contrast

Direct sunlight reaches luminance of >100,000 lux; standard smartphone screens (400–800 nits) become unreadable [S42]. Agricultural display standards:

| Environment | Required brightness | Source |
|---|---|---|
| Indoor / shaded | 400–600 nits | Standard LCD |
| Partial shade (vineyard rows) | 600–1,000 nits | Agricultural guidance [S42] |
| Open field, direct sun | ≥ 1,000–1,500 nits | Agricultural monitor specs [S43] |
| Smart tractor console | 1,200–2,000 nits | [S43] |

For a smartphone app (not a dedicated display), practical guidance:
- Use **auto-brightness** maximization when outdoor use is detected (accelerometer + ambient light sensor).
- Implement a **"Field Mode"** toggle that: maximizes brightness, switches to high-contrast theme, enlarges font to 20pt minimum, disables non-essential UI elements.
- Test actual readability at 1,000+ lux by holding phone at arm's length in direct sunlight.

**Contrast ratios** [S44, S45]:
- WCAG AA minimum: **4.5:1** for normal text, **3:1** for large text (≥ 18pt or 14pt bold).
- WCAG AAA: **7:1** — this is the target for outdoor agricultural apps.
- ISO 9241-3 / ANSI HFES-100: **3:1** minimum for standard text.
- **Outdoor recommendation**: Target **7:1 or higher** for critical information (spray decisions, disease alerts). Black text on white (#000000 / #FFFFFF = 21:1) is always safe but harsh; dark navy on white = ~18:1.

**High-visibility palettes for critical alerts:**
- **Red** (#CC0000 on white): 5.74:1 — meets AA, not AAA. Use for HIGH risk.
- **Black on amber** (#000000 / #FFBF00): 8.59:1 — AAA compliant. Highly visible outdoors. Use for WARNING states.
- **White on dark green** (#FFFFFF / #1B5E20): 12.7:1 — AAA. Use for spray-clear / LOW risk.
- Avoid light blue, light green, or light yellow on white — inadequate contrast outdoors.

#### 6.2 Tap Target Sizing for Gloved Use

| Standard | Minimum tap target | Notes |
|---|---|---|
| WCAG AAA | 44 × 44 px (CSS) | Minimum accessibility target |
| Apple HIG (iOS) | **44 × 44 pt** (≈ 59px at 1x) | Use 44pt minimum |
| Material Design (Android) | **48 × 48 dp** | Google recommends for broad user spectrum [S15] |
| Nielsen Norman Group | **1 cm × 1 cm physical** | Based on fingertip width; lab-validated [S16] |
| Gloved / moving use (recommendation) | **60 dp / 60 pt** | Equivalent to Apple VisionOS spatial target |
| Agricultural-specific (Kadi Display) | PCAP with glove mode | Hardware: industrial PCAP controllers handle thick gloves + rain [S43] |

For a **gloved vineyard worker** or operator in a tractor cab:
- **Primary action buttons** (Spray Now, Log Complete, Dismiss Alert): minimum **64 dp / 64 pt** physical target.
- **Secondary actions**: minimum **48 dp / 48 pt**.
- **Destructive actions** (Delete, Override): should require a **two-step confirmation** with large targets and 500 ms delay.
- **Swipe gestures**: avoid for primary actions; gloved fingers have poor swipe precision. Use large tap targets instead.

#### 6.3 Voice Input Alternatives

Voice is valuable when both hands are occupied (carrying a spray hose, operating equipment), but outdoor noise is severe:
- **Wind noise** in vineyards (5–15 mph typical spraying conditions) degrades consumer voice recognition.
- Use **close-field microphone** prompts: instruct user to hold phone 5–10 cm from mouth.
- Implement for **short-form inputs** only: "Block B3 done", "Override — spray complete", log time.
- Do not require voice for safety-critical confirmations (chemical identity, dose) — too error-prone outdoors.
- **iOS**: `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true` for offline field use.
- **Android**: Offline speech recognition via VOSK or on-device Google TensorFlow Lite models.

#### 6.4 Battery and Brightness Management

High brightness + GPS + cellular = significant battery drain:
- A typical spray shift runs 3–5 hours; smartphones lose 30–60% charge at max brightness with GPS active.
- **Recommendations**:
  - Default to 80% brightness in Field Mode (not 100%) — acceptable outdoors with high-contrast theme.
  - Implement **screen-off-between-interactions** timer: auto-lock after 90 s, but keep GPS awake in background.
  - Provide **low-battery alert** when <20% charge: "Battery low — spray log data may not save. Connect charger or sync now."
  - For CAB-mounted tablet use (tractor): recommend USB-C or 12V power connection.

#### 6.5 Field-Tested Agricultural App Case Studies

**John Deere Operations Center**:
- Uses large card-based UI with high-contrast black/green color scheme.
- Map layers toggle via persistent bottom sheet (accessible with one thumb).
- Block selection by map tap (large tap targets on polygon centroids) + list picker.
- Does not implement voice; focuses on physical button + stylus compatibility for cab terminals.

**Climate FieldView** [S46]:
- Google Play 100K+ installs; App Store 3.4/5 rating.
- Implements a persistent "Field Boundary" drawing mode with snap-to-satellite-imagery.
- Weather overlay uses colored bands (risk levels) — should be verified for outdoor contrast compliance.
- No documented gloved-use optimization; tap targets meet Material baseline (48 dp) but not outdoor-enhanced (60 dp).

**Graft Spray UX recommendations** (synthesis):
1. **Field Mode toggle**: one-tap switch in main nav; accessible without unlocking settings.
2. **Block map as primary UI**: make each block a tappable card ≥ 60 dp centroid target; risk level shown as colored border (not fill alone — colorblind accessible).
3. **Spray confirmation flow**: 3-step only (select block → confirm product → confirm done); total taps ≤ 5 from notification.
4. **Offline-first architecture**: all core flows (view alert, log spray, view block map) work without connectivity. Sync on reconnect.
5. **Language**: plain-language alerts in the grower's primary language (Spanish is primary for many California vineyard workers).

---

### Pesticide Applicator Licensing & PPE

#### 7.1 California — DPR Licensing

**License categories** [S17, S47]:
| License | Who needs it | Authority |
|---|---|---|
| Qualified Applicator License (QAL) | Any person applying or supervising application of restricted-use or California restricted materials for commercial use | CA DPR |
| Qualified Applicator Certificate (QAC) | Persons applying federally restricted-use pesticides on own/leased property | CA DPR |
| Agricultural Pest Control Adviser (PCA) | Persons recommending pesticide applications for compensation | CA DPR |
| Private Applicator | Growers applying on own/leased property (non-commercial) | USDA / county |

QAL requires:
- ≥ 18 years old
- Pass core laws/regulations exam + category-specific exam
- 2-year license cycle (renew by Dec 31 of odd/even year)
- Continuing education (CE) credits for renewal

**Penalty for unlicensed application**: misdemeanor; fine up to $5,000 + potential 6 months imprisonment [S47].

For Graft Spray: the spray log should capture `applicator_license_number` and `license_type` as required DPR fields. The app should not allow spray log submission without these fields populated for California operations.

#### 7.2 US Federal — EPA/FIFRA Certification

- Certified Applicator (private or commercial) required to purchase/use Restricted Use Pesticides (RUPs) [S35].
- **Private applicator**: applies RUPs on own/leased property for own use; must be certified by state agency.
- **Commercial applicator**: applies RUPs for hire; additional certification.
- **WPS Handler training**: Required before first exposure to pesticide application tasks; training documentation kept for 2 years.

#### 7.3 EU — Sustainable Use Directive Certification

Directive 2009/128/EC Article 5 requires Member States to establish **competency certification systems** for professional users:
- France: **Certiphyto** certificate (valid 5 years, renewal via training). Required for all professional PPP users. Obtained through approved training organizations or prior knowledge exam.
- Available as Certiphyto Opérateur (field applicator) or Certiphyto Décideur (agronomist/advisor).
- Mendoza, Argentina: **Carnet de aplicador** required in Mendoza province.

#### 7.4 PPE Requirements by FRAC Group

PPE requirements are **label-driven** — the specific product label supersedes general guidance. However, FRAC-group-level PPE patterns are consistent [S48, S36]:

| FRAC Group | Product class | Common examples | Typical PPE (mixing/loading) |
|---|---|---|---|
| M1 | Inorganic (copper) | Bordeaux mixture, copper hydroxide | Gloves, eye protection, dust mask |
| M2 | Inorganic (sulfur) | Wettable sulfur, micronized sulfur | Gloves, eye protection, respirator (dust) |
| M3 | Dithiocarbamates | Mancozeb, thiram, maneb | Gloves (nitrile), eye protection, respirator |
| 3 (DMI) | Triazoles/imidazoles | Tebuconazole, myclobutanil, fenarimol | Chemical-resistant gloves, eye protection |
| 7 (SDHI) | SDHI fungicides | Boscalid, fluxapyroxad, isopyrazam | Chemical-resistant gloves, eye protection, coveralls |
| 11 (QoI) | Strobilurins | Azoxystrobin, kresoxim-methyl | Gloves, eye protection |
| 12 (OSBPI) | Fludioxonil | Switch | Gloves, eye protection |
| 13 | Anilinopyrimidines | Cyprodinil, mepanipyrim | Gloves, eye protection |
| P (phosphonate) | Phosphonates | Fosetyl-Al, phosphorous acid | Gloves, eye protection |

**Key rule**: for mixing and loading (most hazardous task), PPE requirements are typically stricter than for application. FRAC groups 3 and 7 often require chemical-resistant (not just waterproof) gloves because DMI and SDHI active ingredients can penetrate latex or light nitrile.

**Respiratory protection**: Required when the label states, or when applying as an aerosol, misting, or ULV. Not required for most aqueous airblast applications with normal water volumes — but must be worn when mixing concentrated product.

**Eye protection**: Chemical splash goggles (not safety glasses) required for mixing/loading when label indicates. Standard wraparound safety glasses do not qualify as WPS eye protection [S36].

**Graft Spray app integration**: When user selects a product and reads FRAC group, surface a brief PPE reminder: "⚠️ Mixing [Product]: Chemical-resistant gloves, eye protection, and coveralls required per label." Link to full label PDF (EPA requires labels to be publicly accessible via cdms.net or greenbook.net).

---

## Datasets & Live Resources

| Resource | URL | Content |
|---|---|---|
| California CalPIP (PUR database) | https://calpip.cdpr.ca.gov | Statewide pesticide use data, searchable by commodity, county, chemical |
| CalAgPermits (electronic PUR submission) | https://calagpermits.org | Free online portal for California growers to submit PURs |
| CA DPR Pesticide Use Reporting | https://www.cdpr.ca.gov/pesticide-use-in-california/pesticide-use-reporting/ | Forms, regulations, column definitions |
| AgGateway ADAPT Standard | https://adaptstandard.org | Field boundary and agricultural data interchange schema |
| ISOXML.tools (ISO 11783-10) | https://isoxml.tools/docs/get-started/ | ISOXML/TASKDATA documentation and examples |
| GeoJSON.org | https://geojson.org | GeoJSON format reference |
| RFC 7946 GeoJSON | https://datatracker.ietf.org/doc/html/rfc7946 | Authoritative GeoJSON standard |
| EU Pesticide Database | https://ec.europa.eu/food/plants/pesticides | Authorised PPPs by Member State |
| Mes Parcelles (France) | https://mesparcelles.fr | French farm management / phytosanitary record platform |
| SENASA BPA Manual | https://biblioteca.senasa.gob.ar/items/show/3808 | Argentina BPA documentation requirements |
| AgWeatherNet Spray Guidance (WSU) | https://smallgrains.wsu.edu/spraytool/ | Spray timing decision tool; 72-hour advisory |
| Farmdeck Spraying Conditions | https://www.farmdeck.com/features/spraying-conditions/ | Weather-based spray advisory (Australia/global) |
| IVES Technical Reviews (drone drift) | https://ives-technicalreviews.eu/article/view/7212 | Peer-reviewed drone aerial drift assessment |
| FieldBee GPS Agriculture Guide | https://www.fieldbee.com/blog/how-accurate-is-gps-in-modern-agriculture | Comparative GPS accuracy table |
| VineView PinPoint RTK | https://harpers.co.uk/news/fullstory.php/aid/32959/ | RTK GPS device for vineyards (Napa launch 2024) |
| Sprayers 101 (carrier volume) | https://sprayers101.com/airblast-volume/ | Airblast volume calibration guidance |
| WCAG 1.4.3 Contrast | https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum | Contrast ratio accessibility standard |
| Nielsen Norman Group (touch targets) | https://www.nngroup.com/articles/touch-target-size/ | Lab-validated minimum 1 cm × 1 cm |
| ContextSDK push fatigue | https://contextsdk.com/blogposts/avoiding-push-fatigue-common-user-turn-offs | Notification fatigue mitigation |
| EPA WPS training video | https://www.youtube.com/watch?v=z2RGYppZw_E | 38-min EPA-approved WPS handler training |
| USDA Pesticide Recordkeeping | https://www.ams.usda.gov/rules-regulations/pesticide-records | Federal RUP recordkeeping requirements |

---

## Sources (Open Access)

[S1] Reddit/ITV News, "Rise in 'alert fatigue' risks phone users disabling notifications" (2025-06-20). https://www.reddit.com/r/technology/comments/1lg34hl/rise_in_alert_fatigue_risks_phone_users_disabling/

[S2] AgWeatherNet / WSU Small Grains, "AWN Spray Guidance Tool" (2025). https://smallgrains.wsu.edu/spraytool/

[S3] Farmdeck, "Spraying Conditions Feature" (2025). https://www.farmdeck.com/features/spraying-conditions/

[S4] GPS World, "How to achieve 1-meter accuracy in Android" (2018). https://www.gpsworld.com/how-to-achieve-1-meter-accuracy-in-android/

[S5] HarpersWine / VineView, "VineView launches precision GPS for vineyard management — PinPoint RTK" (2024). https://harpers.co.uk/news/fullstory.php/aid/32959/VineView_launches_precision_GPS_for_vineyard_management.html

[S6] Sprayers 101, "Establishing an Optimal Airblast Carrier Volume" (2026). https://sprayers101.com/airblast-volume/

[S7] Drone Spray Pro, "Spray Drone Guide for Vineyards: Row Spacing, Drift Control" (2026). https://dronespraypro.com/blogs/news/vineyard-drone-spraying-guide-row-spacing-drift-control

[S8] VitiScribe, "California Vineyard Spray Record Format: Required Fields" (2026). https://vitiscribe.com/vineyard-spray-record-format-california/

[S9] VitiScribe, "Digital Spray Logs for TTB Compliance" (2026). https://vitiscribe.com/digital-spray-logs-ttb-compliance/

[S10] USDA AMS, "Pesticide Record Keeping — Understanding Federal Requirements" https://www.ams.usda.gov/rules-regulations/pesticide-records/understanding

[S11] Chambres d'Agriculture PACA, "Registre phytosanitaire — nouvelle réglementation à compter de 2027" (2026). https://paca.chambres-agriculture.fr/toutes-les-actualites/detail-de-lactualite/registre-phytosanitaire-une-nouvelle-reglementation-a-compter-de-2026

[S12] Farmable, "Understanding Regulation EU 2023/564: Key Changes for Pesticide Records" (2025). https://farmable.tech/digital-pesticide-record-keeping-for-eu-cooperatives-achieve-compliance-with-farmable-enterprise/

[S13] Argentina.gob.ar, "Buenas Prácticas Agrícolas (BPA)" (2019). https://www.argentina.gob.ar/agricultura/buenas-practicas-agricolas-bpa

[S14] Riverdi, "Sunlight Readable Displays — Parameters of Outdoor LCD Displays" (2024). https://riverdi.com/blog/sunlight-readable-displays-the-most-important-parameters-of-outdoor-lcd-displays-you-need-to-know

[S15] LogRocket Blog, "All accessible touch target sizes" (2024). https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/

[S16] Nielsen Norman Group, "Touch Targets on Touchscreens" (2019). https://www.nngroup.com/articles/touch-target-size/

[S17] FieldRoutes, "California Pest Control License & Certification (2024)" https://www.fieldroutes.com/blog/california-pest-control-license

[S18] Arable, "Best Time to Spray: 4 Ways In-Field Crop Monitoring Can Help" (2023). https://www.arable.com/blog/four-ways-in-field-crop-monitoring-can-help-determine-the-best-time-to-spray/

[S19] Guidebook, "When are push notifications most effective in event apps?" (2026). https://www.guidebook.com/glossary/push-notifications-in-event-apps

[S20] University of Georgia Viticulture, "Chapter 5 — Vineyard Establishment: Partitioning into Blocks" (2022). https://viticulture.uga.edu/files/2022/02/Vineyard-Establishment-NC-Grape-Growers-Guide.pdf

[S21] Double A Vineyards, "Vineyard Design — Row Orientation, Row and Vine Spacing, and Trellis Height" (2014). https://doubleavineyards.com/blogs/field-notes/vineyard-design-row-orientation-row-and-vine-spacing-and-trellis-height

[S22] IETF, "RFC 7946 — The GeoJSON Format" (2016). https://datatracker.ietf.org/doc/html/rfc7946

[S23] GeoWGS84.ai / Alibaba Cloud, "Postgres Geospatial: PostGIS Spatial Indexes (GiST, BRIN)" (2020). https://www.alibabacloud.com/blog/postgresql-best-practices-selection-and-optimization-of-postgis-spatial-indexes-gist-brin-and-r-tree_597034

[S24] AgGateway ADAPT Standard, "Field" schema definition (2025). https://adaptstandard.org/docs/field/

[S25] AgGateway, "Field Boundary Flyer" (2023). https://aggateway.org/Portals/1010/WebSite/About%20Us/FIELD%20BOUNDARY%20FLYER%20122123.pdf

[S26] ISOXML.tools, "What Is ISOXML? A Guide to ISO 11783 TASKDATA.XML" https://isoxml.tools/docs/get-started/

[S27] FieldBee, "How Accurate is GPS in Modern Agriculture?" (2025). https://www.fieldbee.com/blog/how-accurate-is-gps-in-modern-agriculture

[S28] Cal Poly / Digital Commons, "GPS Accuracy of Smartphones for Crowdsourcing Research" (2024). https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1052&context=nres_rpt

[S29] UGA Viticulture / PNW 749, "Six Steps to Calibrate and Optimize Airblast Sprayers for Orchards and Vineyards" https://viticulture.uga.edu/files/2025/04/PNW749_Six-Steps-to-Calibrate-and-Optimize-Airblast-Sprayers-for-Orchards-and-Vineyards.pdf

[S30] Sprayers 101, "Airblast Nozzle Process" (2026). https://sprayers101.com/airblast-nozzle-process/

[S31] Sprayers 101, "Establishing an Optimal Airblast Carrier Volume" (2026). [same as S6]

[S32] Fresno County Agricultural Commissioner, "Pesticide Use Permits — Reporting Deadlines" (2025). https://www.fresnocountyca.gov/Departments/Agricultural-Commissioner/Pesticide-Safety/Pesticide-Use-Permits

[S33] Yolo County Agriculture, "Permit and Licensing Information — Restricted Materials" https://www.yolocounty.gov/government/general-government-departments/agriculture/pesticide-use-enforcement/permit-and-licensing-information

[S34] EPA, "Label Review Manual" (2024). https://www.epa.gov/system/files/documents/2024-12/label_review_manual_12122024.pdf

[S35] Tennessee Pesticide Safety and Education Program, "Worker Protection Standard (WPS)" https://psep.tennessee.edu/wps/

[S36] EPA WPS Handler Training Video (38 min, EPA-approved, 2018). https://www.youtube.com/watch?v=z2RGYppZw_E

[S37] EU, "Directive 2009/128/EC on the sustainable use of pesticides" https://www.legislation.gov.uk/eudr/2009/128/data.xht

[S38] EU, "Regulation (EC) No 1107/2009 — plant protection products" https://www.legislation.gov.uk/eur/2009/1107/introduction

[S39] SMAG, "Registre phytosanitaire numérique" (2026). https://smag.tech/blog/registre-phytosanitaire-numerique/

[S40] Le Mas Numérique / AgrOTIC, "Mes Parcelles — EN" https://lemasnumerique.agrotic.org/en/mes-parcelles-2/

[S41] AgriBrasilis, "Argentina Speeds Up Pesticide Registration with New Legislation (Resolution 458/2025)" (2025). https://agribrasilis.com/2025/09/11/argentina-acelera-registro-de-pesticidas-com-nova-legislacao-2/

[S42] Faytech North America, "Best Sunlight Readable Touch Screen Monitors for Farming" (2025). https://www.faytech.us/touchscreen-monitor/high-brightness/sunlight-readable/best-sunlight-readable-touch-screen-monitors-for-farming-agriculture/

[S43] Kadi Display, "Sunlight Readable TFT LCDs for Outdoor Vehicles / Agricultural" (2026). https://www.kadidisplay.com/blog-news/sunlight-readable-tft-lcds-essential-for-outdoor-vehicles-agricultural/

[S44] W3C/WAI, "Understanding Success Criterion 1.4.3: Contrast (Minimum)" (2026). https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum

[S45] Lollypop Design, "12 Best Color Contrast Tools for WCAG Accessibility Testing" (2026). https://lollypop.design/blog/2026/april/12-best-color-contrast-tools-for-wcag-accessibility-testing/

[S46] Climate FieldView App (Google Play / App Store) https://climate.com/en-us.html

[S47] Housecall Pro, "Pest Control License Requirements in California" (2023). https://www.housecallpro.com/licensing/pest-control/california/

[S48] Lake Erie Regional Grape Program, "Herbicides, Insecticides & Fungicides Respirator Requirements" (2018). https://lergp.com/respirator-requirements

[S49] Virginia Tech Cooperative Extension, "Fungicide Spray Guidelines for Non-bearing Vineyards" (2021). https://www.pubs.ext.vt.edu/SPES/SPES-315/SPES-315.html

[S50] IVES Technical Reviews, "Evaluation of aerial drift during drone spraying of an artificial vineyard" (2022). https://ives-technicalreviews.eu/article/view/7212

[S51] CA DPR CalPIP, "PUR Database Column Definitions" https://calpip.cdpr.ca.gov/infodocs.cfm?page=columndefs

[S52] USDA Forest Service, "Comparison of GPS Receivers Under a Forest Canopy" (Technical Report). https://www.fs.usda.gov/t-d/pubs/pdfpubs/pdf01712809/pdf01712809dpi300.pdf

[S53] ContextSDK, "Avoiding Push Fatigue: Common User Turn-Offs" (2025). https://contextsdk.com/blogposts/avoiding-push-fatigue-common-user-turn-offs

---

## Sources (Paywalled — Retrieve via University Credentials)

[P1] Valente et al. (2020), "Accuracy and precision evaluation of two low-cost RTK global navigation satellite systems," *Computers and Electronics in Agriculture*. DOI: 10.1016/j.compag.2018.12.033. (ScienceDirect abstract at https://www.sciencedirect.com/science/article/abs/pii/S0168169918312602)

[P2] Parhi, Karlson & Bederson, "Target size study for one-handed thumb use on small touchscreen devices," *MobileHCI 2006 Proceedings*. (Referenced in NN/g touch target article [S16]; original via ACM Digital Library)

[P3] EFSA Journal, "Training in the evaluation of pesticides (plant protection products)" (2023). PMC10687746. https://pmc.ncbi.nlm.nih.gov/articles/PMC10687746/ (open via PMC but paywalled at source journal)

[P4] MIT Touch Lab, "Human fingertip width study." (Referenced in NN/g [S16]; original data in MIT thesis archives)

[P5] AgGateway, ISO 11783-1:2017 Standard (full text). https://cdn.standards.iteh.ai/samples/57556/ (preview only; full text via ASABE or ISO)
