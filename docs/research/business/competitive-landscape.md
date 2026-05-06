# Graft Spray — Competitive Landscape & Business Research

> **Umbrella Project Goal:** Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew, and save money compared to indiscriminate spraying.
>
> *Last updated: 2025. All numeric claims carry source year tags. [S#] = open-access source; [P#] = paywalled source.*

---

## Executive Summary

The global vineyard mildew-spray-decision space is highly fragmented. European DSS tools (RIMpro, VitiMeteo, Vintel) dominate disease modelling but carry high hardware dependency, opaque pricing, and no US-market compliance. General vineyard management platforms (eVineyard, Sectormentor, Process2Wine) add spray logs and basic disease alerts but are built around record-keeping, not decision-making. No single player combines (a) calibrated downy + powdery mildew models, (b) US state compliance fields, (c) transparent per-acre SaaS pricing, and (d) a zero-hardware-required onboarding for Napa/Sonoma growers.

Key market facts:
- Global vineyard area: **7.1 million ha** (2024), four-year declining trend [S1].
- Global grape fungicide market: **~$1.6–1.71 billion** (2024), CAGR ~6.7% to 2032 [S2][S3].
- California wine-grape acreage: **590,000 acres** (2024) [S4]; Napa alone: ~**45,967 bearing acres** [S5].
- California PM management can account for up to **37%** of gross production value [P1].
- Average CA wine-grape pesticide spend: **$280–420/acre/season** [S6].
- Average fungicide applications per season, Napa/Sonoma: **7 (range 1–14)** [P2].

**Regulatory risk in California is the most critical go-to-market constraint.** Any app that "offers a recommendation on agricultural pesticide use" triggers California Food and Agricultural Code §11410–11411 PCA licensing requirements [S7]. Graft Spray must partner with or employ a licensed PCA, route all spray recommendations through a licensed advisor, or carefully position its output as "risk information" rather than a "spray recommendation." This is not a minor compliance detail — it is an existential design question.

---

## Direct Competitors

### Summary Table

| Product | Type | Pricing | Geographies | Key Strengths | Key Weaknesses | Source |
|---|---|---|---|---|---|---|
| Sectormentor (Vidacycle) | Vineyard mgmt + scouting | Per-acre, undisclosed | UK, US, NZ, AU | Integrations (Sencrop weather); strong UK focus; regenerative ag angle | No disease modelling; no spray-timing engine; UK-centric UX | [S8] |
| eVineyard | Vineyard mgmt + disease alerts | Lite $19/mo; Pro $49/mo; Estate $575/mo; Enterprise custom | EU-primary; weak US | Disease models + IoT integrations; affordable entry tier | No US weather integration; no CA DPR compliance; demo-gated Enterprise pricing | [S9] |
| RIMpro | Pure DSS / disease modelling | ~$280–299/station/year (+ NEWA data license $50/loc) | US, EU, AU, global | 20+ validated crop models; 30-min update cycle; hardware-agnostic (virtual station option) | No vineyard management features; separate hardware subscription required; no spray log or compliance output | [S10] |
| VitiMeteo (Agroscope/WBI) | Disease models (research spinout) | Free/low-cost (publicly funded) | Switzerland, Germany, Austria, parts of France | Scientifically rigorous; used for PIWI variety disease calibration | Research institution, not a product; no SaaS commercial model; limited English UI | [S11] |
| Vintel (iTK / Arvalis) | DSS + vineyard management | Quote-based; cooperative/regional model | France (primary), expanding EU | Comprehensive DSS for powdery + downy + botrytis; French wine cooperative distribution | French-language-first; cooperative distribution model limits direct DTC; no US presence | [S12] |
| VineView (Propel) | Aerial/satellite scouting + disease detection | Quote-based; per-flight or annual | California, Australia | Ultra-high-res leafroll + disease maps; strong Napa presence | Not a spray-timing tool; no mildew risk model; high cost per use | [S13] |
| Wildeye (My Wildeye) | Remote soil + weather monitoring | Hardware + subscription | AU (primary), global | Affordable monitoring for irrigation + weather; used by Australian vineyards | No disease modelling; not vineyard-disease-specific; no spray decisions | [S14] |
| Sencrop | Weather station network + API | Hardware + subscription; ~€200–500/year connectivity | EU, UK, AU, US (growing) | Dense station network; integrates with Sectormentor + Farmable; vineyard-specific alerts | No proprietary disease models; data relay platform, not a DSS | [S15] |
| Pessl Metos FieldClimate | Weather station + disease models | Station rental from €313/year; disease model license €96/crop/year; VWS €240–336/year | Global | Proven vineyard disease models; RIMpro integration; hardware+software bundle | Premium hardware cost; UX dated; disease model subscription separate | [S16] |
| Agrii Contour (RHIZA Connect) | DSS + weather + agronomic advice | Not publicly disclosed; UK agronomist-bundled | UK (primary) | Traffic-light disease risk; spray condition forecasts; linked to UK weather network | UK-only; tied to Agrii agronomist services; not standalone SaaS | [S17] |
| Process2Wine | Vineyard + winery ERP | From ~$57/month | France (primary), US, global | Full vineyard-to-cellar traceability; cost analytics; freemium entry | No disease modelling; not a spray-decision tool; winery-production focused | [S18] |
| Cropler | Field camera + visual monitoring | Hardware subscription | EU, global | Real-time photo monitoring for early disease detection | No disease modelling; visual only; no spray decision engine; not vineyard-specific | [S19] |
| VitiScribe | US vineyard spray compliance | Starter $49/mo (≤10 ac); Pro $99/mo (≤50 ac); Estate $199/mo; Large $399/mo | US (CA, OR, WA, NY, VA) | US state compliance built-in (CA DPR, OR ODA, WA WSDA); transparent pricing; spray window alerts | No disease models; compliance/log tool only, not a disease prediction DSS | [S20] |
| VineForecast (VitiMap) | Mildew forecast maps | Freemium; paid tiers (registration required) | Germany, Austria, France, Belgium, Luxembourg | 25m × 25m AI microclimate model; no hardware required; free overview map | Limited to DACH + adjacent markets; not in English for US market | [S21] |

---

### Per-Competitor Detail

#### 2.1 Sectormentor for Vines (Vidacycle)
**Description:** UK-founded vineyard management and scouting platform positioned around regenerative viticulture. Core features: block mapping, phenological recording, disease scouting observation logs, yield prediction, weather integration (Sencrop stations), and team coordination. Emphasises data-informed management rather than automated spray decisions.

**Target customer:** UK, NZ, AU, and (increasingly) US organic/regenerative vineyards; 30–500-acre operations; consultant-managed estates.

**Pricing (2025):** Per-acre-planted pricing model. Specific tier rates not publicly listed on website; contact for demo. Napagreen.org has hosted a public overview deck [S8]. Partner case studies suggest £/$ hundreds to low thousands/year for small-to-mid estates.

**Geographies:** Primary markets: UK, New Zealand, Australia. Growing US presence, including Napa Valley Vintners ecosystem (Napa Green partnership) [S8].

**Integrations:** Sencrop weather stations (direct API); manual data entry for other sensors; export to CSV.

**Funding/Team:** Bootstrapped/angel-stage; small UK team; Vidacycle parent company. Team size not publicly disclosed.

**Strengths:** Strong community in UK biodynamic/organic viticulture; excellent consultant workflow (multi-vineyard view); Sencrop integration; genuinely useful yield prediction tool.

**Weaknesses:** No automated disease model or spray-timing engine; no spray recommendation output; pricing opacity; US compliance gaps (no CA DPR fields); limited disease-specific functionality.

**Gap Graft Spray fills:** Automated mildew risk scoring with spray-timing output — Sectormentor records what happened but doesn't tell you what to do next. Graft Spray could integrate with Sectormentor's observation layer.

---

#### 2.2 eVineyard
**Description:** Ljubljana, Slovenia-based vineyard management platform. Offers disease models (downy mildew, powdery mildew, Botrytis), weather integration (own IoT devices or third-party stations), spray decision support ("treat with confidence" messaging), work planning, payroll, GPS tracking, and cost management. Strong IoT integration for connected devices.

**Target customer:** European vineyards 5–2,000+ ha; estate managers, cooperatives. US market positioning explicitly absent (per independent analysis) [S9].

**Pricing (2025):** Lite $19/mo; Professional $49/mo; Estate $575/mo; Enterprise: custom/quote. Free trial available. Estate tier requires demo for pricing in some markets [S9].

**Geographies:** EU-primary (Italy, Slovenia, Spain, France, Germany). No US weather integration; no US state pesticide compliance [S9].

**Integrations:** Own weather stations + third-party IoT devices; GPS tracking modules.

**Funding:** Bootstrapped; ~10–50 person team (Slovenian/EU SME).

**Strengths:** Affordable entry pricing; genuine disease models built in at Pro tier; strong IoT device ecosystem; full farm management + disease in one platform.

**Weaknesses:** No US weather integration; no CA DPR, OR ODA, WA WSDA compliance fields; pricing opacity at high tiers; EU regulatory focus incompatible with California market; English customer support may be limited [S9].

**Gap Graft Spray fills:** eVineyard is the closest global equivalent but has deliberately not invested in the US market. A US-native mildew DSS with CA DPR compliance would be structurally unaddressable by eVineyard without major re-architecture.

---

#### 2.3 Galileo / Trellis (mytrellis.com)
**Description:** US-based farm intelligence platform. Trellis markets itself as a "grow more, use less" platform with block mapping, operational management, and winery production modules. Limited evidence of vineyard-specific mildew modelling. Positioned as a general farm management + winery platform.

**Target customer:** US vineyard and winery operations; operational management focus, not disease-decision focus.

**Pricing:** Not publicly disclosed; quote-based.

**Geographies:** US (California, Pacific Northwest, New York).

**Strengths:** US-native; winery production integration.

**Weaknesses:** No documented disease modelling for mildew; operational/compliance focus; not differentiated on spray decisions.

**Gap Graft Spray fills:** Trellis handles operations and winery data flows; Graft Spray provides the disease intelligence layer it lacks.

---

#### 2.4 VineView (Propel Software)
**Description:** Aerial and satellite imaging platform for vineyard health mapping. Primary use case: leafroll virus detection, vigor mapping, canopy assessment. Not a spray-timing DSS.

**Target customer:** Mid-to-large Napa/Sonoma and Australian wine estates; vineyard consultants.

**Pricing:** Per-flight or annual contract; not publicly disclosed; premium pricing for high-res aerial surveys.

**Geographies:** California (Napa, Sonoma, Central Coast), Australia.

**Strengths:** Proven for disease-scouting (leafroll); excellent spatial resolution; established Napa Valley relationships.

**Weaknesses:** Not a spray-timing tool; no mildew epidemiological models; high cost per use; requires seasonal scheduling of flights.

**Gap Graft Spray fills:** VineView identifies where disease exists after visual expression — Graft Spray predicts when infection risk is occurring and when to act.

---

#### 2.5 Wildeye (My Wildeye)
**Description:** Australian IoT remote monitoring platform for soil moisture, flow meters, water levels, and weather stations. Primarily irrigation and farm monitoring. Used in Australian vineyards for microclimate monitoring per Wine Australia's AgTech recommendations [S14].

**Target customer:** Australian and global irrigated farms; vineyard use focused on environmental monitoring.

**Pricing:** Hardware + connectivity subscription; not publicly disclosed.

**Strengths:** Affordable sensor connectivity; mobile-first; used by Australian wine industry.

**Weaknesses:** No disease models; no mildew-specific algorithms; not a DSS.

---

#### 2.6 RIMpro
**Description:** Dutch/European cloud-based decision support system (DSS) for fruit tree and vineyard pests and diseases. Grape models include: downy mildew (*Plasmopara viticola*), powdery mildew (*Erysiphe necator*), Botrytis, black rot. Models update every 30 minutes using connected weather station or virtual satellite station. Used at Virginia Tech, Cornell NEWA, and European extension services.

**Target customer:** Professional growers, extension agents, PCAs seeking validated science-based spray models; both fruit and vine.

**Pricing (2024):** ~$280–299/station/year subscription; plus NEWA data license $50/location (US only) [S10]. Virtual weather station (satellite) available for ~€240–336/year (Pessl Metos offers a bundled version at €336 incl. 1 disease model) [S16].

**Geographies:** Global. US (via NEWA partnership), EU (Austria, France, Germany, Italy, Switzerland).

**Integrations:** Pessl Metos (FieldClimate), NEWA (Cornell), KestrelMet, Onset HOBO, Davis WeatherLink.

**Funding:** RIMpro B.V. (Netherlands-based SME); R&D funded partly by EU co-FREE project [S22].

**Strengths:** Most scientifically validated grape DSS on the market; 20+ peer-reviewed models; no proprietary hardware requirement; virtual station option removes sensor barrier.

**Weaknesses:** No vineyard management features; no spray log; no CA DPR compliance; UX is expert-oriented (not grower-friendly); pricing excludes hardware cost; no freemium/demo layer for new users.

**Gap Graft Spray fills:** RIMpro is the science backbone that Graft Spray can build UX and compliance on top of — or Graft Spray can license/partner on model science while providing the consumer-grade interface, compliance layer, and US market go-to-market that RIMpro lacks.

---

#### 2.7 VitiMeteo (Agroscope / Staatliches Weinbauinstitut Freiburg)
**Description:** Suite of publicly funded decision-support models for grape diseases developed by Agroscope (Swiss federal agricultural research) and the Staatliches Weinbauinstitut Freiburg (WBI) in Germany. Models include VitiMeteo-Plasmopara (downy mildew), VitiMeteo-Oidium (powdery mildew), and models calibrated for PIWI (fungal-resistant) grape varieties [S11].

**Target customer:** Swiss, German, and Austrian wine cooperatives and extension services; publicly distributed, not commercial.

**Pricing:** Free / publicly funded.

**Geographies:** Switzerland, Germany, Austria; some French deployment through regional cooperatives.

**Strengths:** Scientifically rigorous; open-source/public sector; specifically calibrated for PIWI varieties and disease pressure; recent integration into commercial platforms.

**Weaknesses:** Not a commercial product; no spray log; no SaaS model; limited English; no US presence; UI is academic.

**Gap Graft Spray fills:** VitiMeteo science is available to license or reference but has no commercial pathway. Graft Spray can commercialise equivalent model science for US/global markets.

---

#### 2.8 Vintel (iTK / Arvalis)
**Description:** French precision viticulture DSS developed by iTK (now part of Arvalis, the French arable crops research institute). Vintel integrates downy mildew, powdery mildew, and Botrytis risk models with vineyard mapping, weather data, and team management. Core differentiator: "save on the 1st treatment depending on the year" — economic framing of spray decisions [S12].

**Target customer:** French wine cooperatives, vineyard management companies, and large estates in Burgundy, Bordeaux, Languedoc.

**Pricing:** Not publicly disclosed; cooperative/enterprise licensing model through Arvalis network.

**Geographies:** France (primary); expanding in EU (Spain, Italy).

**Integrations:** Local French weather networks (Météo-France data); cooperative management systems.

**Funding/Team:** Part of Arvalis Group (major French applied agricultural research institute); significant institutional backing.

**Strengths:** Best-in-class French viticulture DSS; institutional distribution through Arvalis cooperative network; bilingual (French/Spanish) with potential for English; Botrytis + mildew + weather conditions all in one view; designed for French regulatory compliance.

**Weaknesses:** French-language-first; cooperative/institutional distribution model (not DTC SaaS); no US presence; pricing opaque.

**Gap Graft Spray fills:** Vintel is the blueprint competitor in Burgundy/Bordeaux. Graft Spray should study Vintel's UX, model the economic messaging ("save on treatments"), and differentiate by offering a bilingual DTC SaaS model with transparent pricing.

---

#### 2.9 Sencrop (with vineyard modules)
**Description:** French weather station network company. Sencrop sells compact, solar-powered micro-weather stations (Raincrop, Leafcrop) and a data connectivity platform. Integrations with Sectormentor, Farmable, and other platforms. Vineyard-specific data (leaf wetness, temperature, humidity) relevant to mildew risk. No proprietary disease model — data relay platform.

**Target customer:** European and global precision farmers; vineyard customers in France, UK, Germany, Italy, AU.

**Pricing:** Hardware + connectivity subscription. Station hardware not publicly priced; connectivity ~€100–300/year depending on plan. [S15]

**Geographies:** France (primary), UK, Germany, Italy, Belgium, Australia.

**Integrations:** Sectormentor, Farmable, eVineyard-compatible; API-available.

**Strengths:** Dense European network; rapid deployment; leaf wetness sensor directly relevant to mildew models; integration with multiple third-party platforms.

**Weaknesses:** No proprietary disease model; data relay only; does not produce spray decisions.

**Partnership angle for Graft Spray:** Sencrop is a strong hardware partner candidate for European deployment — Graft Spray could ingest Sencrop data via API and offer Sencrop customers automatic disease-risk scoring as a value-add.

---

#### 2.10 Pessl Instruments / Metos FieldClimate
**Description:** Austrian agro-meteorological instrument company (since 1980). Hardware: iMETOS weather stations, soil sensors, crop monitoring devices. Software: FieldClimate cloud platform with disease model library. Models cover 40+ crops including grapevine downy + powdery mildew. RIMpro integration available through FieldClimate [S16].

**Target customer:** Professional farmers, extension services, research institutions globally.

**Pricing (published):**
- nMETOS station rental: from €313/year [S16]
- Disease model license (1 crop, 1 year): €96 [S16]
- Virtual weather station + 1 disease model: €336/year [S16]
- Virtual weather station only (1 year): €240/year [S16]

**Geographies:** Global. Strong in EU, US (Metos North America), Latin America.

**Integrations:** RIMpro, xarvio Field Manager (Bayer); 20% cross-promotional discount with xarvio.

**Funding:** Private Austrian company; profitable, established market leader in precision ag instrumentation.

**Strengths:** Battle-tested hardware; wide model library; hardware-agnostic virtual station option; RIMpro integration; well-established dealer network.

**Weaknesses:** Hardware-first business model (software is secondary); disease model subscription priced on top of hardware; UX dated; no vineyard management or spray log; no US state compliance.

**Partnership angle for Graft Spray:** Metos is a strong partnership candidate for hardware distribution and data ingestion — Graft Spray could be positioned as a value-added layer atop Metos virtual station subscribers.

---

#### 2.11 Agrii Contour / RHIZA Connect
**Description:** UK crop input supplier Agrii offers agronomic decision support via its RHIZA Connect platform (joint initiative with RMA and Anglian Water). Features: localised weather forecasting, pest & disease models (traffic-light system), soil moisture monitoring, spray conditions forecast (5-day outlook) [S17].

**Target customer:** UK arable and specialty crop growers using Agrii agronomist services.

**Pricing:** Bundled with Agrii agronomist retainers; not standalone SaaS.

**Geographies:** UK only.

**Strengths:** Integrated with agronomist advice; spray conditions forecast; UK vineyard users.

**Weaknesses:** Bundled with agronomist services (not standalone); UK-only; not commercially available to non-Agrii customers.

---

#### 2.12 Process2Wine
**Description:** Cloud-based vineyard and winery management ERP. Features: vineyard block management, work orders, spray logging, cost tracking, harvest management, cellar operations. Freemium entry point. Strong cost analytics and traceability [S18].

**Target customer:** Vineyards and wineries 5–500+ ha; estate owners and vineyard managers; France and US primary markets.

**Pricing:** From ~$57/month (SelectHub data, 2024) [S18]; freemium tier available [S19].

**Geographies:** France (primary), US, and global.

**Strengths:** Full vineyard-to-cellar traceability; French regulatory compliance experience; growing US presence; freemium for adoption.

**Weaknesses:** No disease modelling; no spray decision engine; ERP/record-keeping focus, not DSS.

---

#### 2.13 Cropler
**Description:** Agri-camera and field monitoring platform. Solar-powered cameras with time-series photo monitoring, early disease visual detection, and satellite + camera data integration [S19].

**Target customer:** Arable and specialty crop farmers in EU; monitors visual disease symptoms.

**Pricing:** Hardware + subscription model; not publicly disclosed.

**Strengths:** Real-time visual monitoring; early visible disease detection.

**Weaknesses:** Visual only (post-infection detection); no epidemiological models; no spray decisions; not vineyard-specific; no US presence.

---

#### 2.14 VineForecast / VitiMap
**Description:** German startup (VineForecast UG) offering AI-powered mildew forecast maps at 25m × 25m resolution without requiring on-site weather stations. VitiMap is their free public map interface (Germany, Austria, France, Belgium, Luxembourg) covering downy + powdery mildew infection risk, BBCH stages, and leaf surface [S21].

**Target customer:** German, Austrian, and French winegrowers seeking mildew forecasts without hardware investment.

**Pricing:** Freemium map (VitiMap); full platform requires registration + subscription (30-day free trial). Pricing not publicly disclosed.

**Geographies:** Germany, Austria, France, Belgium, Luxembourg.

**Strengths:** No hardware required; 25m AI microclimate resolution; free public awareness layer; strong potential for US market model.

**Weaknesses:** DACH-market only; not available in English or US market; no spray log or compliance output.

**Strategic note for Graft Spray:** VineForecast is the closest conceptual analogue to what Graft Spray aims to do — AI microclimate + mildew risk without hardware. Study their product carefully.

---

## Adjacent Competitors

General farm management platforms with vineyard modules but limited disease-decision focus.

| Platform | Owner | Pricing | Vineyard Feature Depth | Spray DSS? |
|---|---|---|---|---|
| Climate FieldView | Bayer | Basic: free; Prime $249/yr; Plus $649/yr; Premium $1,399/yr | Row-crop focused; limited vineyard modules | No mildew modelling |
| Agworld | Semios | Quote-based (advisor pricing); no public retail pricing | Spray record + advisor integration; US focus | No mildew modelling |
| Granular Insights | Corteva | ~$300/mo + $500–1,000 onboarding; quote-based [S20] | Row-crop primary; limited vine-specific features | No |
| John Deere Ops Center | John Deere | Free basic; PRO service $4,995/yr license [S23] | Precision ag hardware integration; no vineyard disease | No |
| AgriWebb | AgriWebb | From $300 AUD/yr ($150 USD/yr add-ons); livestock-per-head pricing [S24] | Livestock/grazing primary; no vineyard features | No |
| Trimble FarmENGAGE | PTx Trimble | Entry $300–420/yr; Intermediate $600–720/yr; Advisor Prime $4,694/yr [S25] | Row-crop and scouting; limited vine-specific | No |
| Cropwise Spray Assist | Syngenta | Bundled with Syngenta agronomist/product services | Spray timing + field health; some vineyard in certain markets | Spray conditions only (not mildew models) |

**Strategic observation:** Adjacent platforms are not building toward vineyard mildew DSS. Their vineyard presence is largely record-keeping and logistics. They represent **potential distribution partners** (data integration) rather than direct threats in the spray-decision space.

---

## Hardware Competitors / Partners

In-canopy sensors and weather station companies relevant as data providers or bundled hardware partners.

| Company | Key Product | Vineyard Price (hardware) | Subscription/Data | Partnership Angle |
|---|---|---|---|---|
| METER Group | ATMOS 41W all-in-one weather station + ZL6 data logger | ~$600–900 (ATMOS 41W); ZL6 logger extra | ZENTRA Cloud; pricing via METER | Low-cost, high-accuracy; strong US distribution; Graft Spray could offer premium features for METER-connected users |
| Davis Instruments | WeatherLink stations (EnviroMonitor) | $995–1,600 hardware | $200–440/year connectivity [S26] | Established US install base in vineyards; WeatherLink API accessible |
| Sencrop | Raincrop / Leafcrop | ~€300–600 hardware (est.) | ~€100–300/year | EU partner; dense network; integrate via API |
| Pessl Instruments / Metos | iMETOS 3.3; nMETOS | iMETOS ~€2,375–2,600; nMETOS rental from €313/yr [S16] | €96/crop/year for disease models | Hardware-first; Graft Spray value-add on FieldClimate data |
| Adcon Telemetry / OTT HydroMet | ADCON telemetry stations | **Note:** OTT HydroMet announced phase-out of ADCON products in 2024 [S27] | N/A — discontinued | Not a viable partner |
| Onset HOBO | RX3000 Remote Weather Station | $2,499 starter kit incl. 1-year cellular plan ($399/yr after year 1) [S28] | $399/year cellular plan | US market leader in research-grade field monitoring; NEWA network compatible |
| Arable Mark | Arable Mark 3 (crop + climate sensor) | Mark 3: $780 hardware | $580/year subscription [S26] | Premium all-in-one canopy sensor; 3-year TCO ~$2,520; integrates with analytics platforms |

**Key hardware insight for Graft Spray:** The "no hardware required" value proposition (using gridded weather forecasts, virtual stations, or satellite microclimate) is the most powerful onboarding differentiator. Hardware-gated platforms face 6–12 week procurement cycles. Graft Spray should support hardware integration (for precision users) but never require it for baseline functionality.

---

## Market Sizing

### Global Wine-Grape Acreage

| Region | Area (2024) | Notes | Source |
|---|---|---|---|
| Global vineyard | 7.1 million ha | 4th consecutive year of decline; -0.6% vs 2023 | [S1] |
| California (wine-type) | 590,000 acres (~238,800 ha) | 550,000 bearing; estimated total incl. non-reported | [S4] |
| — Napa County | ~45,967 bearing acres (18,600 ha) | 2024 crop data | [S5] |
| — Sonoma County | ~60,000 acres (est.) | Derived from CA total; no single 2024 county figure available | [S4] |
| Bordeaux (all AOPs) | ~94,700 ha declared 2024; falling ~46,000 ha for Bordeaux AOC proper | 6,000 ha pulled up under subsidised scheme in 2024 | [S29][S30] |
| Burgundy (Côte d'Or) | ~9,500 ha (Côte d'Or alone); Burgundy total (incl. Mâconnais, Chablis) ~28,000 ha | Côte d'Or increasing 12% over 10 years | [S31][S32] |
| Mendoza, Argentina | ~145,393 ha planted (province total, 2023) | 70% of Argentina's wine production; Malbec 39,856 ha (27.9% of total) | [S33][S34] |

### Fungicide Spend

| Metric | Value | Year | Source |
|---|---|---|---|
| Global grape fungicide market | ~$1.6–1.71 billion | 2024–2025 | [S2][S3] |
| Projected global grape fungicide market | ~$2.7 billion | 2032 | [S3] |
| CAGR (grape fungicides) | ~6.7% | 2024–2032 | [S3] |
| CA wine-grape pesticide spend per acre/season | $280–420 | 2024 (UC Coop Extension baseline) | [S6] |
| Powdery mildew management as share of gross production value | Up to 37% | Central Coast Chardonnay (Sambucci et al., 2019) | [P1] |
| PM-model-triggered spray program savings vs. standard | ~13% cost reduction per acre | Edna Valley study | [P3] |
| Average fungicide applications/season, Napa/Sonoma | 5.8–8.0 sprays/season (avg) | 2009–2020 records | [P2] |

### TAM / SAM / SOM by Rollout Phase

The model below assumes Graft Spray targets winegrowers at **$4/acre/month** (≈ $48/acre/year) — below the lowest-cost alternative (RIMpro ~$280/station/year for ~50–100 acres = ~$3–6/acre/year) and well below the $280–420 pesticide spend it influences.

#### Phase 1 — Napa + Sonoma Launch

| Layer | Calculation | Value |
|---|---|---|
| Target universe | Napa ~46,000 bearing acres + Sonoma ~60,000 bearing acres = ~106,000 acres | 106,000 acres |
| TAM (all acres, $48/acre/yr) | 106,000 × $48 | **$5.1M/yr** |
| SAM (40% of growers likely tech-adopters) | 106,000 × 0.40 × $48 | **$2.0M/yr** |
| SOM Year 1 (5% of SAM) | | **~$100K ARR** |
| SOM Year 3 (20% of SAM) | | **~$400K ARR** |

#### Phase 2 — California Expansion + Burgundy

| Layer | Calculation | Value |
|---|---|---|
| California total wine-grape acres | 590,000 acres bearing | |
| TAM (CA, $48/acre/yr) | 590,000 × $48 | **$28.3M/yr** |
| Burgundy (28,000 ha = 69,000 acres, €40/ha/yr ≈ $45/acre/yr) | 69,000 × $45 | **$3.1M/yr** |
| Combined Phase 2 TAM | | **~$31M/yr** |
| SAM (30%) | | **~$9.3M/yr** |

#### Phase 3 — Bordeaux + Mendoza

| Layer | Calculation | Value |
|---|---|---|
| Bordeaux (~94,700 ha = 234,000 acres) | 234,000 × $45 | **$10.5M/yr** |
| Mendoza (~145,000 ha = 358,000 acres) | 358,000 × $30 (PPP-adjusted) | **$10.7M/yr** |
| Phase 3 incremental TAM | | **~$21.2M/yr** |

#### Global TAM

| Layer | Calculation | Value |
|---|---|---|
| Global vineyard area | 7.1M ha = 17.5M acres | |
| % susceptible to mildew (Vitis vinifera, excl. hybrids) | ~70% = ~12.3M acres | 12.3M acres |
| TAM ($40/acre/yr blended global) | 12.3M × $40 | **~$490M/yr** |
| SAM (20% addressable via mobile SaaS, 2025–2030) | 12.3M × 0.20 × $40 | **~$98M/yr** |

**Note:** TAM calculations are for illustrative strategic sizing only. Actual pricing, conversion rates, and competitive displacement will materially differ.

---

## Pricing Models in the Space

### Overview of Pricing Architectures

| Model | Examples | Typical Range | Notes |
|---|---|---|---|
| **Per-acre/ha SaaS** | Sectormentor, VitiScribe (implicit) | $1–6/acre/month; $48–72/acre/year | Most appropriate for small-to-mid vineyards; easy ROI calculation |
| **Flat monthly SaaS (tiered)** | eVineyard ($19–575/mo), Process2Wine ($57+/mo), VitiScribe ($49–399/mo) | $19–575/month | Dominant model for management platforms; tiers by features |
| **Station/location subscription** | RIMpro ($280–299/station/yr), Metos FieldClimate (€96/crop/yr + station) | €96–336+/location/year | DSS-native pricing; hardware cost additional |
| **Hardware + software bundle** | Metos, Davis WeatherLink, Onset HOBO, Arable Mark | Hardware $780–2,500 + $400–580/yr subscription | High upfront; 3-year TCO $1,500–4,000/station |
| **Enterprise/quote** | Agworld, Trimble, Granular, John Deere, Vintel | $300–5,000+/month | Large operations; agronomist-bundled; not DTC-friendly |
| **Freemium / public** | VitiMeteo, VineForecast VitiMap, Climate FieldView Basic, Process2Wine | Free basic tier | Awareness/acquisition; monetise on data or premium features |
| **Cooperative/institutional** | Vintel (through Arvalis), Agrii Contour | Bundled with agronomist subscription | Distribution through advisor network, not grower-direct |

### Published Pricing Examples (2024–2025)

- **eVineyard** Lite: $19/mo; Professional: $49/mo; Estate: $575/mo [S9]
- **VitiScribe** Starter: $49/mo (≤10 acres); Pro: $99/mo (≤50 acres); Mid: $199/mo (50–200 acres); Large: $399/mo (200+ acres) [S20]
- **RIMpro**: ~$280–299/station/year [S10]
- **Pessl Metos FieldClimate** VWS + 1 disease model: €336/year; disease model only: €96/crop/year [S16]
- **Climate FieldView** Prime: $249/year; Plus: $649/year; Premium: $1,399/year [S35]
- **Arable Mark 3**: $780 hardware + $580/year; 3-year TCO ~$2,520 [S26]
- **Onset HOBO RX3000** starter kit: $2,499 (incl. 1-year cellular plan); $399/year after [S28]
- **Process2Wine**: from $57/month [S18]
- **Agrian / Granular**: ~$200–300/month + $500–1,000 onboarding [S20]

### Bundling with Hardware

The dominant EU model bundles hardware stations with cloud subscriptions (Pessl, Davis). US market sees more software-first pricing (VitiScribe, FieldView). The highest-margin model is **per-acre pure SaaS** with no hardware dependency — if disease models can use satellite or gridded weather data without on-site stations, this is the superior go-to-market in Napa/Sonoma where growers are price-sensitive but high-value.

---

## Distribution Channels

### 6.1 University Extension Agents

University Cooperative Extension (UCE) is the dominant trusted information channel for California winegrowers.

- **UC Davis Department of Viticulture and Enology** publishes the UC Integrated Viticulture platform; powdery mildew prediction models (UC Davis PMI) are used by many PCAs [P3].
- **UC Farm Advisors** in Napa, Sonoma, Mendocino counties are active connectors between technology providers and growers.
- **Oregon State University Extension** publishes annual pest management guides for wine grapes [S36].
- **Cornell NEWA** (Network for Environment and Weather Applications) distributes RIMpro disease alerts to US fruit and wine growers [S10].

**Graft Spray strategy:** Academic endorsement (cite peer-reviewed model validation) + extension pilot programs = fastest credibility shortcut in California. Target UC Cooperative Extension viticulture advisors as early adopters.

### 6.2 Independent Farm Advisors / Pest Control Advisors (PCAs)

PCAs are the gatekeepers of California spray programs [S7]. An app that routes through a PCA (who countersigns recommendations) is legally cleaner than direct-to-grower spray advice.

- California has ~3,500 licensed PCAs statewide; concentrated in Napa, Sonoma, Monterey, San Luis Obispo.
- PCAs typically serve 10–50 grower clients per advisor.
- Distribution model: Graft Spray could offer a **PCA Pro tier** — the PCA licenses the platform, deploys to their grower clients, and countersigns spray recommendations. This converts the regulatory risk into a distribution asset.

### 6.3 Equipment Dealers and Input Retailers

- **Helena Agri-Enterprises, Wilbur-Ellis, Crop Production Services** are major California ag input dealers with vineyard specialisation.
- **Napa Valley Ag** and regional dealers attend Unified Symposium.
- Hardware partnerships (Metos NA, Davis Instruments) provide warm referral networks to growers already investing in weather infrastructure.

### 6.4 Winery Cooperative and Trade Association Networks

| Organisation | Geography | Membership | Relevance |
|---|---|---|---|
| Napa Valley Vintners (NVV) | Napa, CA | ~550 winery members | Technology program partnerships (Napa Green sustainability initiative) [S37] |
| Napa Valley Grapegrowers | Napa, CA | ~500 winegrape growers | Direct grower access; spray management education |
| Sonoma County Winegrowers | Sonoma, CA | ~1,800 grower members | Sustainability + tech adoption programs |
| BIVB (Bureau Interprofessionnel des Vins de Bourgogne) | Burgundy, France | All Burgundy appellation growers | WinePilot platform launch; digital adoption programs [S38] |
| CIVB (Conseil Interprofessionnel du Vin de Bordeaux) | Bordeaux, France | ~6,000 operators | Climate resilience + technology programs |
| COVIAR (Corporación Vitivinícola Argentina) | Mendoza, Argentina | National wine cooperatives | Government-backed innovation programs |

**Graft Spray strategy:** Approach NVV and Napa Valley Grapegrowers as pilot program sponsors for Phase 1. In Burgundy, approach BIVB whose WinePilot platform launch suggests institutional appetite for agtech.

### 6.5 Industry Events

| Event | Location | Timing | Attendees | Relevance |
|---|---|---|---|---|
| Unified Wine & Grape Symposium | Sacramento, CA | January (annual) | 6,000+ attendees; 675+ exhibitors in 2025 [S39] | Premier US wine industry + agtech event; critical for Napa/Sonoma launch |
| SITEVI | Montpellier, France | November (biennial, odd years) | 30,000+ viticulture professionals | European market; French cooperative and DSS vendor hub |
| Vinitech-Sifel | Bordeaux, France | November/December (biennial, even years) | 25,000+ visitors | Bordeaux-specific; ideal for Phase 3 market entry |
| Wine Australia Innovation Summit | Various AU | Annual | 500–1,000 | Australia entry; Wine Australia AgTech program partners (Metos, Wildeye, CropX are existing partners) [S14] |
| American Society for Enology and Viticulture (ASEV) Annual Meeting | Western US | June (annual) | 1,500+ researchers + industry | Science credibility; PCA and extension agent access |

---

## Regulatory & Liability Landscape

### 7.1 United States — California Focus

#### FIFRA (Federal Insecticide, Fungicide, and Rodenticide Act)

FIFRA governs the **sale, distribution, and use** of pesticides. Crucially, FIFRA **does not directly license advisors** — it regulates pesticide labels and use. However, FIFRA's structure means that states have broad authority to regulate pesticide **recommendations**, and California has exercised that authority aggressively [S40].

The critical threshold under FIFRA is use "inconsistent with labeling." An app that directs spray timing does not by itself trigger a FIFRA violation — but if an app's output caused a grower to apply a pesticide in a manner inconsistent with its label (wrong rate, wrong target, wrong timing), there is potential for secondary liability. Graft Spray should ensure its output never directs specific **product choices or rates** — only timing/risk windows.

#### California PCA License (CDPR — California Department of Pesticide Regulation)

This is the **critical constraint** for California market entry.

California Food and Agricultural Code §§11410–11411 define a **Pest Control Adviser (PCA)** as any person who:
- "Offers a recommendation on any agricultural use of pesticides,"
- "Holds himself/herself as an authority on any agricultural use," or
- "Solicits services or sales for any agricultural use." [S7]

A written pesticide recommendation in California **must** be prepared by a CDPR-licensed PCA or designated county official [S7].

**Exemptions are narrow:**
- Official federal/state/county Department of Agriculture personnel
- UC personnel in official duties
- **"Operator of the property"** — a grower recommending spray on their own land does not need a PCA license [S7]

**What this means for Graft Spray:**
- If Graft Spray outputs "Spray now with product X at rate Y," it is **acting as a PCA** and requires that output to be generated by (or countersigned by) a licensed PCA.
- If Graft Spray outputs "Disease risk is HIGH today — conditions favour infection," it is providing **information**, not a **recommendation** — potentially outside the PCA licensing trigger.
- The distinction between "risk information" and "spray recommendation" is a regulatory grey zone. Any commercial marketing claiming Graft Spray "tells you when to spray" risks being interpreted as offering PCA services.

**Recommended mitigation approaches:**
1. **Partnership model:** Partner with licensed PCAs who use Graft Spray to generate risk data, and who issue the actual written recommendations. PCA liability is then on the advisor, not Graft Spray.
2. **Risk-information framing:** Explicitly position output as "infection risk data" and "weather suitability information" — not spray recommendations. Include unambiguous disclaimers.
3. **Grower exemption leveraging:** Focus initially on growers using the tool for their own property (exempt from PCA requirement), but this limits scalability.
4. **Employ a PCA:** Have a licensed CA PCA on staff or as advisor to countersign outputs (as RIMpro effectively does through its extension partnerships).

**PCA examination and licensing:** Requires passing Laws/Regulations/Basic Principles exam + at least one pest control category exam (Plant Pathogens, Category B, is relevant) + educational prerequisites. Annual county registration required in every county where recommendations are made [S7].

**CA DPR spray record requirements:** Any written pesticide recommendation in California must include: product name/dosage, pest to be controlled, criteria used for determining need, operator/location/acreage, suggested schedule, warning of possible damage, signed by licensed PCA [S7]. Graft Spray's compliance module should be able to output this format.

---

### 7.2 European Union — France Focus (Burgundy and Bordeaux)

#### EU Sustainable Use Directive (SUD) 2009/128/EC

The SUD establishes a framework for sustainable pesticide use across EU member states. Key provisions for Graft Spray [S41]:

- **IPM requirement (Article 14):** Professional users must implement Integrated Pest Management. Use of decision-support tools and forecasting systems is explicitly cited as good IPM practice.
- **Advisor definition:** "Any person who has acquired adequate knowledge and advises on pest management and the safe use of pesticides, in the context of a professional capacity or commercial service."
- **Training/certification:** Professional users (farmers applying pesticides) must hold a certification (Certiphyto in France). This certification must be renewed periodically.
- **The SUD specifically enables and encourages** advisory services and DSS tools — it does **not** license them the way California does PCAs. The EU framework is more permissive for software-based advisory services.

**Note (2025 update):** The proposed revised SUD (Sustainable Use Regulation, SUR) to replace 2009/128/EC stalled in EU Parliament in 2023–2024; the original SUD remains in force.

#### France: Séparation de la Vente et du Conseil (SVC)

The Loi EGAlim (Law no. 2018-938), effective **1 January 2021**, required separation of pesticide sales and independent agronomic advice (conseil indépendant) [S42].

Under the 2021–2025 framework:
- Farm advisors had to be either sellers or advisors — not both
- Farmers were required to receive 2 Conseils Stratégiques Phytosanitaires (CSP) per 5-year Certiphyto renewal cycle

**Critical 2026 update:** The Arrêté of 22 December 2025 (within the "Loi Duplomb") **ended the mandatory separation** of sale and advice effective **1 January 2026** [S43]. Key implications:
- Cooperatives and dealers can now again provide both product sales AND specific advice
- The strategic advisory (CSP) is no longer mandatory for Certiphyto renewal
- The change was designed to enable "combinatory approaches" (biocontrol + conventional) without the conflict-of-interest bar

**Implication for Graft Spray in France:** The 2021–2025 separation created a market for independent advisors; that market is now partially collapsing back. However, the underlying demand for data-driven spray decisions persists, and BIVB cooperative programs (WinePilot) demonstrate appetite. Graft Spray should position as the **tool for independent advisors and digitally-enabled growers** — not as a replacement for advisory services.

**Certiphyto:** Every professional vineyard operator using pesticides in France must hold a valid Certiphyto. Renewal requires training. An app that helps growers document and justify spray decisions supports Certiphyto compliance.

---

### 7.3 Argentina — Mendoza

#### SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria)

SENASA is the Argentine national authority for plant protection product registration. Key framework [S44][S45]:

- All pesticides used in Argentina must be SENASA-registered. Registrations do not expire unless cancelled.
- **Resolution No. 458/2025** (effective November 2025) modernised Argentina's pesticide registration framework, allowing import of products already approved in countries with equivalent regulatory systems [S45].
- Argentina does not have a California-style PCA licensing system. Agronomy professionals provide advice under their professional engineering/agronomy licenses.
- **No specific app-recommendation regulation** comparable to California's PCA system has been identified in Argentina. This makes Mendoza a more permissive regulatory environment for launch.

**Implication:** Argentina is the most legally permissive of the four target markets for a spray-advice app. Market entry in Mendoza faces commercial and connectivity challenges (smaller growers, Spanish-language requirement) rather than regulatory ones.

---

### 7.4 App Store Implications

#### Apple App Store Guideline 1.4 — Physical Harm

Apple's App Store Review Guidelines §1.4.1 states:

> "Medical apps that could provide inaccurate data or information, or that could be used for diagnosing or treating patients may be reviewed with greater scrutiny... Apps must clearly disclose data and methodology to support accuracy claims relating to health measurements." [S46]

While §1.4.1 is specifically written for medical apps, the underlying principle applies: **any app making claims about risk or recommendations must:**
1. Clearly disclose methodology
2. Provide citations for any scientific claims
3. Include appropriate disclaimers about accuracy

Apple rejected apps in adjacent categories for "providing health or medical suggestions without citations" (per developer community reports) [S47].

**Graft Spray requirements for App Store compliance:**
- Include in-app citations for the epidemiological models used (Gubler-Thomas PMI, VitiMeteo-Plasmopara, etc.)
- Clear disclaimer: "Graft Spray provides disease risk information based on weather data and validated models. It is not a substitute for professional agronomic advice. Users are responsible for ensuring compliance with local pesticide regulations."
- Do not claim "we tell you when to spray" in App Store marketing copy — frame as "disease risk intelligence"

#### Competitor Liability Language

RIMpro (representative industry standard): "RIMpro is a decision support system... The models provide risk estimates based on weather data and validated algorithms. Users should consult qualified advisors before making spray decisions."

Graft Spray should adopt similar language, adding explicit California PCA advisory language for US market version.

---

## Strategic Recommendations for Graft Spray

### 8.1 Differentiation vs. Direct Competitors

| Competitor | Graft Spray Differentiation |
|---|---|
| RIMpro | Same scientific rigour, but: (a) mobile-first UX for growers (not agronomists), (b) no hardware required at launch, (c) CA DPR compliance integration, (d) transparent per-acre pricing |
| eVineyard | US-native weather integration; CA DPR / US state compliance built-in; explicit mildew-decision engine (not just alerts); transparent pricing |
| VitiMeteo | Commercial SaaS model with support; English-language UX; US market presence |
| Vintel | DTC SaaS model (not cooperative-gated); bilingual (English + French/Spanish); transparent pricing |
| Sectormentor | Add the "what to do next" layer — spray risk scoring on top of Sectormentor's observation data (potential integration partnership) |
| VineForecast/VitiMap | US market focus; CA state compliance; PCA-partnership model; winery ERP integrations |
| VitiScribe | Disease models — VitiScribe handles post-spray compliance, Graft Spray handles pre-spray decision |

### 8.2 Recommended Launch Wedge — Napa/Sonoma

**Phase 1 approach (Year 1):**
1. **Pilot with 5–10 Napa PCAs** as the distribution layer. Offer PCA Pro accounts free for 12 months. PCAs deploy Graft Spray to their ~10–30 grower clients each. Achieve 100–300 growers within 12 months.
2. **No-hardware launch:** Use UC Davis/NOAA gridded weather data + satellite microclimate for default risk scoring. Offer premium features for weather-station-connected users.
3. **Metric to optimize:** Spray events avoided per season per grower (vs. their historical calendar-spray baseline). Publish savings data at season end.
4. **Frame output as "risk information" not "spray recommendation"** — CA PCA licensing risk is the #1 legal threat in Year 1.

**Target users for Pilot:**
- Napa Valley Vintners members farming 20–150 acres organic or sustainable certified (highest disease pressure + sustainability motivation)
- Napa Green certified operations (sustainability documentation already required)

### 8.3 Partnership Candidates

| Partner Type | Candidate | Rationale |
|---|---|---|
| Weather data | UC Davis ICAMP / CIMIS | Free California microclimate grid; no hardware barrier |
| Weather hardware | METER Group | US market leader; ATMOS 41 popular in vineyards; SDK accessible |
| Disease science | RIMpro B.V. or Agroscope | License validated models rather than rebuild from scratch |
| Distribution (CA) | Napa Valley Vintners, Napa Valley Grapegrowers | Access to 500–1,800 growers; tech program infrastructure |
| Distribution (Burgundy) | BIVB (WinePilot ecosystem) | Already digitally-oriented; CSP advisory requirements create demand |
| Compliance layer | CDPR-licensed PCA network | Required for "recommendation" output; converts regulatory risk to distribution asset |
| Adjacent platform | Sectormentor | Sectormentor records + Graft Spray risk engine = compelling combined offering for UK/US organic vineyards |

### 8.4 Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **CA PCA licensing requirement** | Critical | Partner with licensed PCAs as distribution channel; frame output as risk information; legal review of marketing copy before launch |
| **France SVC reversal (2026)** | Medium | Reduced regulatory moat for independent advisors; shift to data quality + UX differentiation |
| **Hardware dependency perception** | High | Build satellite/gridded weather fallback as primary path; optional hardware integration |
| **RIMpro competing in US market** | Medium | RIMpro has NEWA partnership but poor UX; differentiate on consumer-grade mobile interface and compliance integration |
| **Agtech adoption lag (small growers)** | Medium | Price at <1% of fungicide spend to minimise adoption friction; freemium map layer for awareness |
| **Model accuracy validation** | High | Partner with UC Cooperative Extension for third-party validation season 1; publish accuracy metrics transparently |
| **App Store 1.4.1 rejection** | Low–Medium | Implement proper in-app citations; use "risk information" framing; review with Apple developer advisor |

---

## Sources (Open Access)

| Ref | Title | Organisation | Year | URL |
|---|---|---|---|---|
| S1 | State of the World Vine and Wine Sector 2024 | OIV | 2025 | https://www.oiv.int/sites/default/files/documents/OIV-State_of_the_World_Vine-and-Wine-Sector-in-2024.pdf |
| S2 | Grape Fungicides Market Size, Share & Forecast | Verified Market Research | 2025 | https://www.verifiedmarketresearch.com/product/grape-fungicides-market/ |
| S3 | Global Grape Fungicides Market | Data Insights Reports | 2026 | https://www.datainsightsreports.com/reports/global-grape-fungicides-market-33398 |
| S4 | California Grape Acreage Report 2024 | USDA NASS / CDFA | 2025 | https://www.nass.usda.gov/Statistics_by_State/California/Publications/Specialty_and_Other_Releases/Grapes/Acreage/2025/2024%20Crop%20Grape%20Acreage%20Report.pdf |
| S5 | 2024 Napa County Crop Report | Napa County Agricultural Commissioner | 2025 | https://www.napacounty.gov/civicalerts.aspx?AID=708 |
| S6 | Vineyard Spray Cost Per Acre | VitiScribe (citing UC Coop Extension data) | 2026 | https://vitiscribe.com/vineyard-spray-cost-per-acre/ |
| S7 | Agricultural Pest Control Adviser License Packet | California DPR | 2024 | https://www.cdpr.ca.gov/wp-content/uploads/2025/06/adviser.pdf |
| S8 | Sectormentor for Vines Overview (Napa Green) | Vidacycle / Napa Green | 2025 | http://napagreen.org/wp-content/uploads/2025/11/PUBLIC_-Sectormentor-for-Vines-Overview-Vidacycle.pdf |
| S9 | VitiScribe vs eVineyard: US Vineyard Management Software | VitiScribe | 2026 | https://vitiscribe.com/vitiscribe-vs-evineyard/ |
| S10 | Subscribe to RIMpro Disease Models | Virginia Tech Fruit Tree Pathology Lab | 2024 | https://treefruitpathology.spes.vt.edu/2024/03/07/1-join-partnership-on-using-rimpro/ |
| S11 | VitiMeteo YouTube — Adaptation and Application | Staatliches Weinbauinstitut Freiburg | 2025 | https://www.youtube.com/watch?v=SduxHl1Jfu4 |
| S12 | Vintel — The Solution | Vintel / iTK | 2025 | https://vintel-itk.com/en/the-software/ |
| S13 | VineView Data Products | VineView / Propel | 2024 | https://vineview.com/data-products/ |
| S14 | Botrytis Bunch Rot | Wine Australia | 2025 | https://www.wineaustralia.com/growing-making/pest-and-disease-management/botrytis |
| S15 | Sencrop and Farmable Integration | Farmable | 2024 | https://farmable.tech/sencrop-farmable-integrated/ |
| S16 | METOS Webshop Products | Pessl Instruments | 2024 | https://shop.metos.at/collections/all |
| S17 | Contour / RHIZA Connect | Agrii | 2026 | https://www.agrii.co.uk/our-services/decision-support/ |
| S18 | Process2Wine Reviews 2026 | SelectHub | 2026 | https://www.selecthub.com/p/food-and-beverage-software/process2wine/ |
| S19 | Cropler App Store | Apple App Store | 2025 | https://apps.apple.com/us/app/cropler/id6677052772 |
| S20 | Vineyard Spray Log Software Pricing | VitiScribe | 2026 | https://vitiscribe.com/vineyard-spray-log-pricing/ |
| S21 | VitiMap — VineForecast | VineForecast UG | 2023 | https://www.vineforecast.com/en/vitimap/ |
| S22 | RIMpro Downy Mildew Model (EU CO-FREE Project) | CORDIS / European Commission | 2016 | https://cordis.europa.eu/project/id/289497/reporting |
| S23 | John Deere Operations Center PRO Service | John Deere | 2025 | https://shop.deere.com/us/product/Operations-Center-PRO-Service--Annual-License-/p/PROSERVICE |
| S24 | AgriWebb Pricing FAQ | AgriWebb | 2026 | https://help.agriwebb.com/en/articles/8319220-pricing-and-subscription-faqs |
| S25 | PTx Trimble FarmENGAGE Pricing | Vantage Northeast / PTx Trimble | 2026 | https://vantagenortheast.com/collections/trimble-software |
| S26 | Best Field Sensor & Weather Station Systems 2026 | AgTecher | 2025 | https://agtecher.com/en/fieldsensors/ |
| S27 | ADCON Phase-Out Announcement | OTT HydroMet | 2024 | https://www.otthydromet.com/en/about/our-brands/adcon |
| S28 | HOBO RX3000 Remote Weather Station Starter Kit | Onset | 2024 | https://www.onsetcomp.com/products/kit/rx3004-sys-kit-813 |
| S29 | Bordeaux 2024 Weather and Crop Report | Jancis Robinson | 2025 | https://www.jancisrobinson.com/articles/bordeaux-2024-weather-and-crop-report |
| S30 | Bordeaux AOC Areas Fall Below 50,000 ha | Wein-Plus | 2025 | https://magazine.wein.plus/news/bordeaux-aoc-areas-fall-below-50-000-hectares |
| S31 | Burgundy Vineyard Prices Set New Records 2024 | Decanter | 2025 | https://www.decanter.com/wine/burgundy-vineyard-prices-set-new-records-in-2024-557625/ |
| S32 | Burgundy Market Update | TerroirSense Wine Review | 2024 | https://terroirsense.com/en/p/10326.html |
| S33 | Made in Mendoza: from Cuyo to the World | Grant Thornton Argentina | 2024 | https://www.grantthornton.com.ar/en/insights/articles/2024/made-in-mendoza-from-cuyo-to-the-world/ |
| S34 | Destination Mendoza | Vinexpo Explorer | 2024 | https://vinexpo-explorer.com/newfront/destination-mendoza |
| S35 | Climate FieldView Pricing Plans | Bayer / Climate Corp | 2025 | https://climate.com/en-us/pricing.html |
| S36 | 2024 Pest Management Guide for Wine Grapes in Oregon | Oregon State University Extension | 2024 | https://extension.oregonstate.edu/sites/extd8/files/documents/donnelja/2024-pest-management-guide-for-wine-grapes-in-oregon_0.pdf |
| S37 | Napa Valley Vintners — Partners | Napa Valley Vintners | 2025 | https://napavintners.com/about/partners.asp |
| S38 | Bourgogne Working on Climate Solutions / WinePilot | BIVB | 2024 | https://www.bourgogne-wines.com/press/n-264,2333,14430.html |
| S39 | Unified Wine & Grape Symposium Trade Show | Unified Symposium | 2025 | https://www.unifiedsymposium.org/trade-show/ |
| S40 | Federal Insecticide, Fungicide, and Rodenticide Act | US EPA | 2026 | https://www.epa.gov/enforcement/federal-insecticide-fungicide-and-rodenticide-act-fifra-and-federal-facilities |
| S41 | EU Directive 2009/128/EC Sustainable Use of Pesticides | European Parliament | 2009 | https://www.legislation.gov.uk/eudr/2009/128/data.xht |
| S42 | Séparation de la Vente et du Conseil des Produits Phytopharmaceutiques | French Ministry of Agriculture | 2024 | https://agriculture.gouv.fr/separation-de-la-vente-et-du-conseil-des-produits-phytopharmaceutiques-0 |
| S43 | Fin de la Séparation Vente-Conseil (Loi Duplomb 2026) | Phyteis | 2026 | https://phyteis.fr/actualites/fin-de-la-separation-vente-conseil-phytopharmaceutiques-ce-qui-change-en-2026/ |
| S44 | Argentina Pesticide Registration Regulations | Agribrasilis | 2025 | https://agribrasilis.com/2025/09/09/argentina-speeds-up-pesticide-registration/ |
| S45 | Argentina Pesticide Regulatory Framework | GPC Gateway | 2026 | https://gpcgateway.com/regulatory-regions/argentina/regulation/Mjc=?sector=Mw%3D%3D-agrochemicals-plant-protection-products |
| S46 | Apple App Store Review Guidelines | Apple | 2025 | https://developer.apple.com/app-store/review/guidelines/ |
| S47 | Developer help: Apple rejection 1.4.1 Safety | Reddit r/iosdev | 2026 | https://www.reddit.com/r/iosdev/comments/1qmfl66/help_with_apple_rejection_due_to_141_safety/ |

---

## Sources (Paywalled — Retrieve via University Credentials)

| Ref | Title | Authors | Journal/Source | Year | DOI/URL |
|---|---|---|---|---|---|
| P1 | Fungicide Use Patterns in Select United States Wine Grape Regions | Broome et al. | Plant Disease (APS) | 2024 | https://apsjournals.apsnet.org/doi/10.1094/PDIS-04-23-0798-RE |
| P2 | Predictive models for grape downy mildew as a DSS in Mediterranean conditions | Rossi et al. | ScienceDirect | 2023 | https://www.sciencedirect.com/science/article/abs/pii/S0261219423002739 |
| P3 | Powdery Mildew Cost Comparison (Edna Valley) | Hyde, C. (Cal Poly) | Cal Poly Digital Commons | 2010 | https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1011&context=agbsp |
| P4 | The Value of Powdery Mildew Resistance in Grapes: Evidence from California | Fuller, Alston, Sambucci | Wine Economics and Policy | 2014 | https://www.econstor.eu/bitstream/10419/194486/1/1-s2.0-S2212977414000234-main.pdf |
| P5 | To what extent can a phase-out of pesticides in viticulture be achieved? DEPHY network | Various | OENO One | 2024 | https://oeno-one.eu/article/view/7885 |
| P6 | EU Directive 2009/128/EC — EPRS Study | European Parliament Research Service | EPRS | 2018 | https://www.europarl.europa.eu/RegData/etudes/STUD/2018/627113/EPRS_STU(2018)627113_EN.pdf |
