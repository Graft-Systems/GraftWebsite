# 13 — Advisory Feeds Inventory
*Graft Spray Research Dossier · Stream 6*

Public and government advisory feeds for grape powdery and downy mildew, organized by rollout region. Each feed carries institutional authority, costs nothing, and adds cited weight to Graft Spray recommendations. 25 feeds documented below.

---

## Table of Contents

1. [California (Napa, Sonoma)](#1-california-napa-sonoma)
2. [Burgundy / Bordeaux (France)](#2-burgundy--bordeaux-france)
3. [Mendoza (Argentina)](#3-mendoza-argentina)
4. [Global / Supranational](#4-global--supranational)
5. [Feeds Table](#feeds)
6. [Sources Table](#sources)
7. [Aggregation Strategy](#aggregation-strategy)
8. [Translation Pipeline](#translation-pipeline)

---

## 1. California (Napa, Sonoma)

### F01 · UC IPM Grape Powdery Mildew Pest Management Guidelines
**[S1]** The UC Statewide IPM Program's authoritative Pest Notes for *Erysiphe necator* on grapevine include the Gubler-Thomas Risk Index protocol, fungicide treatment tables (PHI, REI, FRAC group), and resistance management guidance. Updated 2014–2025. Freely browsable HTML; no native RSS, but the URL structure is stable for programmatic scraping. Language: English.

- Primary URL: `https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/`
- Companion (Downy Mildew): `https://ipm.ucanr.edu/agriculture/grape/downy-mildew/`
- Mildew relevance: **5/5**
- Integration: weekly HTML diff scrape; extract treatment-table rows into `advisory_event` objects with `hazard_type=powdery` or `downy`.

### F02 · UC IPM Grape Powdery Mildew Risk Assessment Index (Live RAI)
**[S2]** A near-real-time risk table updated from CIMIS-linked weather stations across California wine counties (Amador, Calaveras, El Dorado, Fresno, Lake, Madera, Mendocino, Napa, Sonoma, San Joaquin, and others). Columns: station name, active weather stations indicator, Risk Assessment Index (0–100), disease pressure category, pathogen status, and bud-break notes. HTML table—no native API. Last verified active as of 2025-09-30. Language: English.

- URL: `https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/`
- Cadence: updated weekly in-season (approx. April–October)
- Mildew relevance: **5/5**
- Integration: weekly HTML parse; map station rows to `advisory_event` with `severity` derived from RAI bucket (0–30 = low, 40–50 = moderate, ≥60 = high).

### F03 · CIMIS Web API (California Irrigation Management Information System)
**[S3]** REST/JSON and REST/XML API providing daily and hourly ETo, air temperature (min/avg/max), humidity, precipitation, dew point, solar radiation, and wind from ~145 stations statewide, plus Spatial CIMIS gridded data for all CA zip codes. Registration yields a free `appKey`. License: public domain, no restrictions per CA Open Data Portal. Critical upstream input for computing Gubler-Thomas index on a per-vineyard basis.

- Base URL: `https://et.water.ca.gov/api/data?appKey=<KEY>&targets=<station>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>&dataItems=<items>`
- REST docs: `https://et.water.ca.gov/rest/index`
- CA Open Data record: `https://data.ca.gov/dataset/cimis-weather-station-spatial-cimis-data-web-api`
- Cadence: daily (hourly available)
- Mildew relevance: **5/5** (weather input for models, not advisory text)
- Integration: pull daily; derive PM Risk Index, leaf wetness proxy, VPD; attach to `advisory_event` as `hazard_type=powdery`.

### F04 · UC Cooperative Extension Napa County — Vineyard Views Newsletter
**[S4]** "Vineyard Views & Events: Viticulture and Weed Science Updates from Napa" is the principal newsletter from the UCCE Napa Vit Team. Covers powdery mildew scouting, spray timing, and PCA guidance. Subscription by email; issues posted to the UCCE Napa ANR page. Language: English.

- UCCE Napa Newsletter hub: `https://ucanr.edu/county/napa-county-ucce/newsletters`
- UCCE Napa Vit Team site: `https://ucceviticulturenapa.wixsite.com/uccevitnapa`
- Cadence: irregular, typically 4–8 issues/season
- Mildew relevance: **4/5**
- Integration: monitor newsletter page for new PDF/HTML issues; parse for mildew-related spray recommendations.

### F05 · UC Cooperative Extension Sonoma County — Viticulture Newsletter
**[S5]** The Sonoma/Lake/Mendocino counties viticulture newsletter covers disease pressure, spray program guidance, and vineyard research updates. Hosted on the `cesonoma.ucanr.edu` domain. Language: English.

- Current newsletter: `https://ucanr.edu/county/ucce-sonoma-county/current-newsletter`
- Archive base: `https://cesonoma.ucanr.edu/viticulture717/Viticulture_Newsletter/`
- Cadence: ~monthly in-season
- Mildew relevance: **4/5**
- Integration: monitor archive URL for new issues; extract mildew severity language.

### F06 · UC Cooperative Extension Central Sierra — Powdery Mildew Bulletin
**[S6]** A dedicated powdery mildew bulletin page for the Sierra Foothills AVA. Covers season-specific pressure summaries, conidial sporulation timing, and berry susceptibility guidance. Language: English.

- URL: `https://ucanr.edu/site/ucce-central-sierra-agriculture/powdery-mildew-bulletin`
- Cadence: seasonal, 2–5 posts/year
- Mildew relevance: **4/5**
- Integration: HTML scrape; severity language maps to `severity` field.

### F07 · California Department of Pesticide Regulation (CDPR) — Pesticide Use Reports
**[S7]** CalPIP portal provides county-level annual pesticide use by crop/pesticide, including fungicide use on wine grapes (Napa, Sonoma). Archived zipped text files from 1974 onward. CalPIP API-style queries available (non-standard). License: public domain. Mildew-adjacent (validates spray intensity by region rather than issuing real-time alerts).

- Main page: `https://www.cdpr.ca.gov/pesticide-use-in-california/pesticide-use-reporting/`
- CalPIP portal: `https://calpip.cdpr.ca.gov`
- PUR data files (archives): `https://www.cdpr.ca.gov/report-category/pesticide-use-report/`
- Cadence: annual (June–September for prior year)
- Mildew relevance: **2/5** (retrospective signal, not alert)
- Integration: annual batch download; parse wine-grape fungicide use to model historical spray pressure.

### F08 · National Plant Diagnostic Network / Western Plant Diagnostic Network (NPDN/WPDN)
**[S8]** The NPDN is the US's national diagnostic surveillance network; WPDN covers 10 western states including California. Issues email alerts (listservs: `members@npdn.org`, `wpdn@npdn.org`) for new or unusual disease detections. No formal RSS, but a web portal at `npdn.org` lists reports. Language: English.

- NPDN home: `https://www.npdn.org`
- WPDN section: `https://www.npdn.org/wpdn`
- Subscribe: `members@npdn.org` (email listserv)
- Cadence: event-driven
- Mildew relevance: **3/5** (broadscope, but grape mildew outbreaks would appear)
- Integration: subscribe to listserv; parse incoming email text for mildew-related keywords; push as `advisory_event`.

### F09 · CDFA Pierce's Disease Control Program
**[S9]** The Pierce's Disease & Glassy-Winged Sharpshooter Board (within CDFA) issues research and management updates. Infrastructure is adjacent to mildew: the program runs the same county advisor and PCA network that distributes mildew alerts, and the board's annual research updates contain disease-management sections.

- URL: `https://piercesdisease.cdfa.ca.gov`
- CDFA PD page: `https://www.cdfa.ca.gov/pdcp/Pierce's_Disease.html`
- Cadence: annual research summaries; ad hoc management alerts
- Mildew relevance: **1/5** (primarily PD/GWSS; listed here as network infrastructure node)
- Integration: monitor for broadscale Napa/Sonoma disease alerts that may bundle mildew updates.

---

## 2. Burgundy / Bordeaux (France)

### F10 · BSV Vigne Bourgogne-Franche-Comté (DRAAF BFC)
**[S10]** The *Bulletin de Santé du Végétal Vigne* for the Bourgogne-Franche-Comté (BFC) region, coordinated by the Chambre d'Agriculture de Saône-et-Loire (CA71), FREDON BFC, and IFV. Each issue covers downy mildew (mildiou) and powdery mildew (oïdium) risk by subregion, current vegetative stage (stade phénologique), rainfall in preceding 7 days, and spray recommendations. Issued from April to September. Format: PDF, freely downloadable from DRAAF BFC.

- Hub page: `https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/bulletins-de-sante-du-vegetal-bsv-r345.html`
- Current campaign: `https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/bsv-bourgogne-franche-comte-campagne-en-cours-r32.html`
- Example bulletin (2025 N°1): `https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/IMG/pdf/bsv_vigne_1_du_08-04-2025.pdf`
- Language: French
- Cadence: ~weekly in-season (April–September)
- Mildew relevance: **5/5**
- Integration: monitor hub page; wget new PDFs; run French PDF parser → extract mildiou/oïdium paragraphs → translate → `advisory_event`.

### F11 · BSV Vigne Nouvelle-Aquitaine / Nord Aquitaine (Bordeaux) (DRAAF NA / Chambre NA)
**[S11]** Bulletin covering the Bordeaux-area (Nord-Aquitaine, Sud-Aquitaine, Charentes, Limousin, Haut-Poitou) vine growing zones. Issued weekly April–September. PDFs hosted on Chambre Régionale Nouvelle-Aquitaine. Among the highest mildew relevance of any public bulletin (Bordeaux historically >70% of treatments are fungicides). Vigicultures platform is used for network data entry.

- Chambre NA BSV hub: `https://nouvelle-aquitaine.chambres-agriculture.fr/produire/filieres-vegetales/bsv`
- DRAAF NA hub: `https://draaf.nouvelle-aquitaine.agriculture.gouv.fr/bulletin-de-sante-du-vegetal-r71.html`
- Example (Nord-Aquitaine): `https://nouvelle-aquitaine.chambres-agriculture.fr/.../BSV_NA_VIGNE_Nord_Aquitaine_N__6_20260505.pdf`
- Language: French
- Cadence: weekly in-season
- Mildew relevance: **5/5**
- Integration: scrape Chambre NA BSV page weekly; detect new PDFs by filename date suffix (`_YYYYMMDD.pdf`); parse for mildiou/oïdium sections.

### F12 · Vigicultures — BSV Data Entry & Dissemination Platform
**[S12]** Vigicultures (vigicultures.fr) is the national tool used by BSV networks to collect, analyse, and disseminate vineyard surveillance data. Acts as the upstream aggregation layer for BSV outputs; some regional networks expose bulletin links directly through the platform. Limited public API; primary access is via PDF links published to the platform. Language: French.

- URL: `https://www.vigicultures.fr`
- Cadence: synchronised with BSV cadence (weekly in-season)
- Mildew relevance: **4/5**
- Integration: monitor for new bulletin links; downstream of BSV PDF pipeline.

### F13 · INRAE — Vine & Mildew Research News
**[S13]** France's National Institute for Agronomic Research issues press releases and research briefs on grapevine mildew resistance, epidemic modelling, and resistant variety deployment (INRAE-ResDur programme). Not a spray advisory, but adds mechanistic context. HTML / RSS feed available via INRAE news portal. License: open. Language: English and French.

- INRAE mildew news: `https://www.inrae.fr/en/news?keyword=mildew`
- Example: `https://www.inrae.fr/en/news/thriving-vine`
- RSS: `https://www.inrae.fr/rss.xml` (full INRAE feed; filter by keyword)
- Cadence: irregular, typically 4–10 posts/year
- Mildew relevance: **3/5** (research context, not operational alert)
- Integration: subscribe to INRAE RSS; keyword-filter for *mildiou*, *downy mildew*, *Plasmopara*, *oïdium*, *Erysiphe*; publish as `advisory_event` with `hazard_type=research_update`.

### F14 · IFV — Note Technique Commune Résistances (Annual Fungicide Resistance Note)
**[S14]** The Institut Français de la Vigne et du Vin (IFV) publishes an annual joint technical note (Note Technique Commune) on fungicide resistance status for mildiou, oïdium, Botrytis, and black rot in French vineyards. The 2025 edition (released January 2025) covers all approved active ingredients, FRAC codes, resistance classifications, and spray-limit recommendations. PDF, open access. Language: French.

- Landing page: `https://www.vignevin.com/article/note-technique-2025-sur-les-resistances-aux-maladies/`
- PDF (2025): `https://www.vignevin.com/wp-content/uploads/2025/01/Note-technique-commune-vigne-2025-VDef.pdf`
- Cadence: annual (January)
- Mildew relevance: **5/5**
- Integration: annual scrape; map FRAC group entries to `advisory_event` with `hazard_type=powdery` or `downy`, `recommended_action=rotation_protocol`.

### F15 · e-Phy — ANSES Catalogue des Produits Phytopharmaceutiques Autorisés
**[S15]** The French national authorisation database for plant protection products, maintained by ANSES (national food/environment safety agency) under DGAL authority. Searchable by crop (vigne), disease (mildiou, oïdium), and active ingredient. No public REST API; HTML interface only (JavaScript-rendered). Licensed as public database under French law. Language: French.

- URL: `https://ephy.anses.fr`
- Cadence: continuously updated on each AMM decision
- Mildew relevance: **4/5** (product authorisation data; links spray recommendations to legal products)
- Integration: periodic HTML scrape for "vigne × mildiou" and "vigne × oïdium" queries; cache approved products list; cross-reference against recommendation engine.

### F16 · Météo-France Open Data API (AROME/ARPEGE)
**[S16]** Météo-France's public API portal (portail-api.meteofrance.fr) provides AROME (1.5 km, France-specific) and ARPEGE (global) forecast data as JSON, including hourly temperature, precipitation, humidity, and wind. The open-meteo.com proxy endpoint (`/v1/meteofrance`) provides free access without registration. Official Météo-France portal now at `portail-api.meteofrance.fr` (migrated from `donneespubliques.meteofrance.fr`). Also accessible via `meteo.data.gouv.fr`. No agro-specific layer; Graft Spray must post-process for VPD and leaf wetness. License: Etalab (open data).

- Open-Meteo proxy: `https://api.open-meteo.com/v1/meteofrance?latitude=47.8&longitude=4.8&hourly=temperature_2m,precipitation,relativehumidity_2m`
- Official portal: `https://portail-api.meteofrance.fr`
- Open data: `https://meteo.data.gouv.fr`
- Cadence: hourly, 4-day forecast
- Mildew relevance: **4/5** (weather input for infection models)
- Integration: pull hourly; compute DMCast/EPI inputs.

### F17 · Chambre Régionale d'Agriculture Nouvelle-Aquitaine — Vigne Nord-Aquitaine Guide
**[S17]** The Chambre Régionale publishes an observateur guide for BSV Vigne in the Bordeaux zone, detailing protocol for monitoring mildiou and oïdium observation parcels. Additionally, FREDON Nouvelle-Aquitaine hosts BSV under the epidemio-surveillance mission. Language: French.

- DRAAF NA: `https://draaf.nouvelle-aquitaine.agriculture.gouv.fr/vigne-nord-aquitaine-a3625.html`
- FREDON NA BSV: `https://www.fredon.fr/nouvelle-aquitaine/nos-missions/epidemiosurveillance/bulletin-sante-du-vegetal`
- Cadence: season-start and weekly in-season
- Mildew relevance: **4/5**
- Integration: see F11 above (same distribution channel).

---

## 3. Mendoza (Argentina)

### F18 · INTA EEA Mendoza / CR Mendoza–San Juan — Viticulture Technical Notes
**[S18]** Argentina's National Institute of Agricultural Technology (INTA) Mendoza Experimental Station and the CR Mendoza–San Juan Regional Center publish technical sheets (hojas de información técnica) on viticulture, including mildew management. EEA Rama Caída (southern Mendoza) has a dedicated viticulture/ciruelos team. Publications available via the INTA website but not through a structured feed; discovery requires periodic scraping. Language: Spanish.

- EEA Mendoza: `https://inta.gob.ar/unidades/mendoza-eea-mendoza`
- EEA Rama Caída viticultura: `https://www.argentina.gob.ar/inta/cr-mendoza-sanjuan/area-de-viticultura-y-ciruelos-eea-rama-caida`
- INTA EEA Mendoza (SINAVIMO): `https://www.sinavimo.gob.ar/organismos-en-argentina/inta-eea-mendoza`
- Cadence: irregular, typically 4–8 publications/year
- Mildew relevance: **4/5**
- Integration: monitor publication page; PDF download and parse for mildiou/oídio content.

### F19 · SENASA — Registro Nacional de Terapéutica Vegetal (Phytosanitary Product Registry)
**[S19]** Argentina's National Service for Agrifood Health and Quality (SENASA) maintains the national registry of authorised phytosanitary products. A periodically updated spreadsheet ("Productos Inscriptos") is accessible from the registry page. Additionally, SENASA issues phytosanitary alerts and inspection bulletins for grape-growing regions. Language: Spanish.

- Registry page: `https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal`
- SENASA main: `https://www.argentina.gob.ar/senasa`
- Cadence: monthly registry updates; alerts are event-driven
- Mildew relevance: **3/5** (product authorisation; adjacent to spray advisory)
- Integration: monthly scrape of Productos Inscriptos list; cross-reference active ingredients with FRAC database.

### F20 · SMN — Servicio Meteorológico Nacional Open Data
**[S20]** Argentina's national meteorological service provides open-data downloads including: hourly surface observations (temperature, pressure, humidity, wind), daily extreme temperatures, and 5-day forecasts. Available as zip files via `datos.gob.ar` and REST-accessible through Argentina's `apis.datos.gob.ar/series/` time-series API. ~200 stations nationwide, including Mendoza (ICAO: SAME), San Martín, and San Juan. License: open government data (Argentina). Language: Spanish; variable names in Spanish.

- datos.gob.ar SMN datasets: `https://datos.gob.ar/dataset?organization=smn`
- SMN download portal: `https://www.smn.gob.ar/descarga-de-datos`
- Argentina time-series API: `http://apis.datos.gob.ar/series/`
- Cadence: hourly observations, daily update
- Mildew relevance: **4/5** (weather input for infection models)
- Integration: pull Mendoza station data daily; compute primary infection risk for *P. viticola* (Rule of Three: ≥10 mm rain + soil temp ≥10°C + 10 cm soil T°).

### F21 · INV — Instituto Nacional de Vitivinicultura (Statistical & Technical Reports)
**[S21]** The INV is Argentina's wine and viticulture regulatory body. Publishes annual harvest and production statistics (with varietal and regional breakdowns for Mendoza and San Juan), and maintains a specialized library and digital repository. While not a phytosanitary alert service, the INV's varietal and productivity data contextualize disease-pressure reports from INTA and SENASA. Language: Spanish.

- INV home: `https://www.argentina.gob.ar/inv`
- Annual report example (2024): `https://www.argentina.gob.ar/sites/default/files/2018/10/anuario_cosecha_y_elaboracion_2024.pdf`
- Statistics: `https://www.argentina.gob.ar/inv/estadisticas-vitivinicolas/mercado-externo/informes-mensuales`
- Cadence: monthly statistics; annual harvest report
- Mildew relevance: **2/5** (context only; not an advisory)
- Integration: annual batch ingest; use varietal data to calibrate susceptibility weighting in per-vineyard mildew risk model.

---

## 4. Global / Supranational

### F22 · EPPO Reporting Service
**[S22]** The European and Mediterranean Plant Protection Organization's monthly newsletter covers new pest outbreaks, new host records, new diagnostic methods, and phytosanitary events across 52 member countries. Published in English and French. Available by email subscription (free). Full archive (1951–present) in the EPPO Global Database. Relevant when exotic mildew strains or resistance mutations are reported in Europe or North America.

- Reporting Service page: `https://www.eppo.int/RESOURCES/eppo_publications/eppo_reporting_service`
- EPPO GD current issue: `https://gd.eppo.int/reporting/Rse-2025-11`
- Subscribe: by email at `https://www.eppo.int/`
- Language: English and French
- Cadence: monthly
- Mildew relevance: **3/5** (broader pest alerts; relevant for new virulent strains)
- Integration: email subscription + monthly GD scrape; keyword-filter for *Plasmopara*, *Erysiphe*, *powdery mildew*, *downy mildew*; push as `advisory_event`.

### F23 · EPPO Global Database (GD) — Pest Datasheets & Standards
**[S23]** The EPPO GD is a live online database with pest categorization, distribution maps, host lists, and links to EPPO PP1 efficacy standards. The EPPO PP1 standards PP 1/4(4) (*Erysiphe necator* / powdery mildew) and PP 1/31(3) (*Plasmopara viticola* / downy mildew) define international efficacy evaluation protocols—relevant for validating fungicide label data. GD is freely accessible; batch query tool available post-registration.

- GD home: `https://gd.eppo.int`
- PP1 standards list: `https://www.eppo.int/RESOURCES/eppo_standards/pp1_list`
- Language: English
- Cadence: continuously updated
- Mildew relevance: **4/5** (reference standard)
- Integration: API-style batch query for new publications; ingest PP1 standard PDFs for treatment-recommendation metadata.

### F24 · OIV — International Organisation of Vine and Wine (Technical Documents)
**[S24]** The OIV issues multilingual technical resolutions and expert reports covering vine health, phytosanitary regulations, and sustainability. Of direct relevance: the 2023 OIV resolution VITI-704-2023 on grapevine decline monitoring networks, and ongoing documents on flavescence dorée and fungal diseases. All PDFs are open access. Not a real-time alert but provides regulatory/policy framing that Graft Spray recommendations must respect. Languages: EN, FR, ES, IT, DE, RU.

- Technical documents hub: `https://www.oiv.int/what-we-do/technical-documents`
- OIV home: `https://www.oiv.int`
- Relevant 2023 resolution: `https://www.oiv.int/node/3027/download/pdf`
- Cadence: annual (biennial General Assembly) + working-group papers
- Mildew relevance: **2/5** (policy/regulatory, not operational)
- Integration: annual scrape; tag phytosanitary-related documents for compliance layer.

### F25 · CABI Compendium — *Plasmopara viticola* and *Erysiphe necator* Datasheets
**[S25]** The CABI Compendium provides peer-reviewed datasheets for both major grape mildew pathogens, covering identity, biology, host range, distribution, impacts, and management. Licensed CC BY-NC-ND 4.0. Full text freely accessible at the CABI Digital Library. Includes decision-support tool links (Horizon Scanning Tool, Pest Risk Analysis Tool, Invasive Species Discovery Tool). No native API or RSS; static pages suitable for one-time ETL.

- *Plasmopara viticola* datasheet: `https://www.cabidigitallibrary.org/doi/full/10.1079/cabicompendium.41918`
- *Erysiphe necator* datasheet: `https://www.cabidigitallibrary.org/doi/full/10.1079/cabicompendium.55705`
- Compendium home: `https://www.cabidigitallibrary.org/journal/cabicompendium`
- Language: English
- Cadence: updated periodically (last *P. viticola*: December 2021)
- Mildew relevance: **4/5** (authoritative reference for ETL into knowledge base)
- Integration: one-time scrape + annual refresh; ingest into glossary and species profile layer.

---

## Feeds

| # | Feed Name | Region | URL | Language | Access Method | Cadence | License | PM Relevance | DM Relevance | Integration Approach |
|---|-----------|--------|-----|----------|--------------|---------|---------|-------------|-------------|---------------------|
| F01 | UC IPM Grape PM Pest Notes | CA — statewide | https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ | EN | HTML scrape | Seasonal updates | Open (UC) | 5 | 2 | Weekly diff scrape; extract treatment table |
| F02 | UC IPM PM Risk Assessment Index (RAI) | CA — statewide | https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/ | EN | HTML scrape | Weekly in-season | Open (UC) | 5 | 1 | Weekly HTML parse; map RAI to severity |
| F03 | CIMIS Weather REST API | CA — statewide | https://et.water.ca.gov/api/data | EN | REST JSON/XML (free API key) | Daily/hourly | Public domain | 5 | 5 | Daily pull; compute GT index & VPD |
| F04 | UCCE Napa — Vineyard Views | CA — Napa | https://ucanr.edu/county/napa-county-ucce/newsletters | EN | HTML + email | ~8×/season | Open (UC) | 4 | 3 | Monitor page; parse new PDF/HTML issues |
| F05 | UCCE Sonoma — Viticulture Newsletter | CA — Sonoma | https://cesonoma.ucanr.edu/viticulture717/ | EN | HTML + email | ~Monthly in-season | Open (UC) | 4 | 3 | Monitor archive URL; extract spray alerts |
| F06 | UCCE Central Sierra — PM Bulletin | CA — Sierra Foothills | https://ucanr.edu/site/ucce-central-sierra-agriculture/powdery-mildew-bulletin | EN | HTML | 2–5×/year | Open (UC) | 4 | 1 | Seasonal HTML scrape |
| F07 | CDPR Pesticide Use Reports (CalPIP) | CA — statewide | https://calpip.cdpr.ca.gov | EN | Web portal / zip download | Annual | Public domain | 2 | 2 | Annual batch; parse wine-grape fungicide use |
| F08 | NPDN/WPDN Email Listserv | CA + Western US | https://www.npdn.org | EN | Email listserv | Event-driven | Open | 3 | 3 | Subscribe; keyword-filter incoming emails |
| F09 | CDFA Pierce's Disease Board | CA — Napa/Sonoma | https://piercesdisease.cdfa.ca.gov | EN | HTML | Annual + ad hoc | Open (CA Gov) | 1 | 1 | Annual review only |
| F10 | BSV Vigne BFC (Burgundy) | FR — BFC | https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/bsv-bourgogne-franche-comte-campagne-en-cours-r32.html | FR | PDF scrape | ~Weekly Apr–Sep | Open (French Gov) | 5 | 5 | Weekly PDF diff; French parse + translate |
| F11 | BSV Vigne Nouvelle-Aquitaine (Bordeaux) | FR — NA | https://nouvelle-aquitaine.chambres-agriculture.fr/produire/filieres-vegetales/bsv | FR | PDF scrape | ~Weekly Apr–Sep | Open (French Gov) | 5 | 5 | Weekly PDF detect by filename date; parse + translate |
| F12 | Vigicultures BSV Platform | FR — national | https://www.vigicultures.fr | FR | HTML scrape | Weekly in-season | Open | 4 | 4 | Monitor for new bulletin links |
| F13 | INRAE Vine Research News (RSS) | FR / Global | https://www.inrae.fr/rss.xml | EN/FR | RSS | Irregular (~6–10/yr) | Open (INRAE) | 3 | 3 | RSS subscribe; keyword-filter |
| F14 | IFV Note Technique Commune (Resistance Note) | FR — national | https://www.vignevin.com/article/note-technique-2025-sur-les-resistances-aux-maladies/ | FR | PDF download | Annual (January) | Open (IFV) | 5 | 5 | Annual scrape; map FRAC entries |
| F15 | e-Phy ANSES (DGAL) Product Authorisations | FR — national | https://ephy.anses.fr | FR | HTML scrape (JS) | Continuous | Open (ANSES) | 4 | 4 | Monthly scrape; parse approved products |
| F16 | Météo-France AROME/ARPEGE API | FR / Europe | https://portail-api.meteofrance.fr (or open-meteo proxy) | FR/EN | REST JSON | Hourly | Etalab open | 4 | 5 | Hourly pull; compute DMCast/EPI inputs |
| F17 | Chambre NA / FREDON NA BSV Observateur | FR — NA / Bordeaux | https://www.fredon.fr/nouvelle-aquitaine/nos-missions/epidemiosurveillance/bulletin-sante-du-vegetal | FR | HTML + PDF | Weekly in-season | Open | 4 | 4 | Part of F11 pipeline |
| F18 | INTA EEA Mendoza Technical Notes | AR — Mendoza | https://inta.gob.ar/unidades/mendoza-eea-mendoza | ES | HTML + PDF | ~6–8/year | Open (INTA) | 4 | 4 | Monitor publications; PDF parse + translate |
| F19 | SENASA Plant Protection Product Registry | AR — national | https://www.argentina.gob.ar/senasa/programas-sanitarios/... | ES | HTML / spreadsheet download | Monthly | Open (SENASA) | 3 | 3 | Monthly scrape + spreadsheet ingest |
| F20 | SMN Open Data (Mendoza weather stations) | AR — Mendoza | https://datos.gob.ar/dataset?organization=smn | ES | REST / zip download | Daily/hourly | Open gov | 4 | 5 | Daily pull; compute DM primary infection risk |
| F21 | INV Vitivinicultural Statistics & Reports | AR — national | https://www.argentina.gob.ar/inv | ES | HTML + PDF | Monthly/annual | Open (INV) | 2 | 2 | Annual context ingest |
| F22 | EPPO Reporting Service (monthly newsletter) | Global | https://www.eppo.int/RESOURCES/eppo_publications/eppo_reporting_service | EN/FR | Email / HTML | Monthly | Open (EPPO) | 3 | 3 | Email subscribe + monthly GD scrape |
| F23 | EPPO Global Database — Pest Datasheets & PP1 Standards | Global | https://gd.eppo.int | EN | HTML (batch query post-registration) | Continuous | Open (EPPO) | 4 | 4 | Batch query; ingest PP1 PDFs |
| F24 | OIV Technical Documents | Global | https://www.oiv.int/what-we-do/technical-documents | EN/FR/ES/IT/DE/RU | HTML + PDF download | Annual | Open (OIV) | 2 | 2 | Annual scrape; tag phytosanitary docs |
| F25 | CABI Compendium — *P. viticola* & *E. necator* | Global | https://www.cabidigitallibrary.org/doi/full/10.1079/cabicompendium.41918 | EN | HTML scrape | Periodic (~1×/yr) | CC BY-NC-ND 4.0 | 4 | 4 | One-time ETL + annual refresh |

---

## Sources

| Ref | Feed | Type | URL | Access | Status |
|-----|------|------|-----|--------|--------|
| S1 | UC IPM Grape PM Guidelines | HTML | https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ | Open | Live ✓ |
| S2 | UC IPM PM Risk Assessment Index | HTML | https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/ | Open | Live ✓ |
| S3 | CIMIS Web API (DWR) | REST API | https://et.water.ca.gov/rest/index | Free (API key) | Live ✓ |
| S3b | CIMIS on CA Open Data | Dataset | https://data.ca.gov/dataset/cimis-weather-station-spatial-cimis-data-web-api | Open | Live ✓ |
| S4 | UCCE Napa Newsletters hub | HTML | https://ucanr.edu/county/napa-county-ucce/newsletters | Open | Live ✓ |
| S4b | UCCE Napa Vit Team site | HTML | https://ucceviticulturenapa.wixsite.com/uccevitnapa | Open | Live ✓ |
| S5 | UCCE Sonoma Newsletter | HTML | https://ucanr.edu/county/ucce-sonoma-county/current-newsletter | Open | Live ✓ |
| S6 | UCCE Central Sierra PM Bulletin | HTML | https://ucanr.edu/site/ucce-central-sierra-agriculture/powdery-mildew-bulletin | Open | Live ✓ |
| S7 | CDPR Pesticide Use Reporting | HTML + zip | https://www.cdpr.ca.gov/pesticide-use-in-california/pesticide-use-reporting/ | Open | Live ✓ |
| S7b | CalPIP Portal | Web portal | https://calpip.cdpr.ca.gov | Open | Live ✓ |
| S8 | NPDN / WPDN | HTML + email | https://www.npdn.org | Open | Live ✓ |
| S9 | CDFA Pierce's Disease | HTML | https://piercesdisease.cdfa.ca.gov | Open | Live ✓ |
| S10 | BSV BFC current campaign | HTML + PDF | https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/bsv-bourgogne-franche-comte-campagne-en-cours-r32.html | Open | Live ✓ |
| S10b | BSV BFC hub | HTML | https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/bulletins-de-sante-du-vegetal-bsv-r345.html | Open | Live ✓ |
| S11 | BSV Nouvelle-Aquitaine (Chambre NA) | HTML + PDF | https://nouvelle-aquitaine.chambres-agriculture.fr/produire/filieres-vegetales/bsv | Open | Live ✓ |
| S11b | DRAAF NA hub | HTML | https://draaf.nouvelle-aquitaine.agriculture.gouv.fr/bulletin-de-sante-du-vegetal-r71.html | Open | Live ✓ |
| S12 | Vigicultures platform | HTML | https://www.vigicultures.fr | Open | Live ✓ |
| S13 | INRAE RSS | RSS | https://www.inrae.fr/rss.xml | Open | Live ✓ |
| S14 | IFV Note Technique 2025 (landing page) | HTML + PDF | https://www.vignevin.com/article/note-technique-2025-sur-les-resistances-aux-maladies/ | Open | Live ✓ |
| S14b | IFV Note Technique 2025 (PDF) | PDF | https://www.vignevin.com/wp-content/uploads/2025/01/Note-technique-commune-vigne-2025-VDef.pdf | Open | Live ✓ |
| S15 | e-Phy ANSES | HTML (JS) | https://ephy.anses.fr | Open | Live ✓ |
| S16 | Météo-France Open API (open-meteo) | REST JSON | https://open-meteo.com/en/docs/meteofrance-api | Open (non-commercial) | Live ✓ |
| S16b | Météo-France portail API (official) | REST | https://portail-api.meteofrance.fr | Open (Etalab) | Live ✓ |
| S17 | FREDON NA / Chambre NA Vigne Guide | HTML + PDF | https://www.fredon.fr/nouvelle-aquitaine/nos-missions/epidemiosurveillance/bulletin-sante-du-vegetal | Open | Live ✓ |
| S18 | INTA EEA Mendoza | HTML | https://inta.gob.ar/unidades/mendoza-eea-mendoza | Open | Live ✓ |
| S18b | INTA Rama Caída Viticultura | HTML | https://www.argentina.gob.ar/inta/cr-mendoza-sanjuan/area-de-viticultura-y-ciruelos-eea-rama-caida | Open | Live ✓ |
| S19 | SENASA Registro Nacional Terapéutica Vegetal | HTML + xlsx | https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal | Open | Live ✓ |
| S20 | SMN Datos Abiertos (datos.gob.ar) | REST / zip | https://datos.gob.ar/dataset?organization=smn | Open gov | Live ✓ |
| S20b | Argentina Time-Series API | REST | http://apis.datos.gob.ar/series/ | Open | Live ✓ |
| S21 | INV Statistics | HTML + PDF | https://www.argentina.gob.ar/inv | Open | Live ✓ |
| S22 | EPPO Reporting Service | HTML + email | https://www.eppo.int/RESOURCES/eppo_publications/eppo_reporting_service | Open | Live ✓ |
| S23 | EPPO Global Database | HTML | https://gd.eppo.int | Open (reg. for batch) | Live ✓ |
| S23b | EPPO PP1 Standards list | HTML | https://www.eppo.int/RESOURCES/eppo_standards/pp1_list | Open | Live ✓ |
| S24 | OIV Technical Documents | HTML + PDF | https://www.oiv.int/what-we-do/technical-documents | Open | Live ✓ |
| S25 | CABI Compendium *P. viticola* | HTML | https://www.cabidigitallibrary.org/doi/full/10.1079/cabicompendium.41918 | CC BY-NC-ND 4.0 | Live ✓ |
| S25b | CABI Compendium *E. necator* | HTML | https://www.cabidigitallibrary.org/doi/full/10.1079/cabicompendium.55705 | CC BY-NC-ND 4.0 | Live ✓ |

---

## Aggregation Strategy

### Problem
Feeds arrive in four fundamentally different formats: REST JSON (CIMIS, SMN, open-meteo), HTML tables (UC IPM RAI), PDF reports (all BSV bulletins, IFV technical notes, INTA publications), and email/RSS (NPDN, INRAE, EPPO). Languages are English, French, and Spanish. Cadences range from hourly (weather APIs) to annual (CDPR, OIV). Some feeds are pure weather data; others are structured advisory text; others are unstructured long-form PDFs.

### Unified `advisory_event` Schema

```json
{
  "event_id":          "string (UUID)",
  "source":            "string (feed F-code, e.g. F10)",
  "source_name":       "string (human name)",
  "region":            "enum [napa_sonoma | burgundy | bordeaux | mendoza | global]",
  "issued_at":         "ISO 8601 datetime",
  "valid_through":     "ISO 8601 datetime | null",
  "hazard_type":       "enum [powdery | downy | both | weather | research_update | product_registry]",
  "severity":          "enum [low | moderate | high | extreme | unknown]",
  "recommended_action":"string (free text, normalised to English)",
  "raw_url":           "string (URL of source document)",
  "raw_text_excerpt":  "string (first 500 chars of extracted text, original language)",
  "language_original": "enum [en | fr | es | multi]",
  "license":           "string",
  "ingest_method":     "enum [rest_json | rest_xml | rss | html_scrape | pdf_parse | email]",
  "confidence":        "float 0–1 (extraction quality score)",
  "created_at":        "ISO 8601 datetime (pipeline timestamp)"
}
```

### Normalisation Pipeline by Feed Type

#### 1. REST JSON / XML Feeds (F03 CIMIS, F16 Météo-France, F20 SMN)
- Pull on schedule via cron job; parse JSON/XML directly.
- Compute derived mildew-relevant variables: Gubler-Thomas index (PM), DMCast daily value (DM), VPD, leaf wetness proxy (dewpoint crossing).
- Map computed risk tier to `severity`; set `hazard_type=powdery` or `downy` per model.
- No translation needed (data not linguistic).

#### 2. HTML Table Scrapes (F02 UC IPM RAI, F15 e-Phy)
- Fetch page weekly with `requests` + `BeautifulSoup`.
- Detect table changes via SHA-256 hash of extracted text; trigger new `advisory_event` only on change.
- For UC IPM RAI: map RAI bucket → `severity`; each station row becomes a separate event keyed by station ID.
- For e-Phy: scan for new product additions or revocations on "vigne × mildiou/oïdium" queries.

#### 3. PDF Feeds (F10 BSV BFC, F11 BSV NA, F14 IFV Note, F18 INTA)
- Monitor parent HTML page for new PDF links (detect by filename date suffix pattern, e.g., `_YYYYMMDD.pdf` or `_N__\d+_YYYYMMDD.pdf`).
- Download new PDFs; extract text with `pdfplumber` (tables) + `pypdf` (paragraphs).
- Identify disease sections via keyword regex: `mildiou|oïdium|mildew|downy|powdery|Plasmopara|Erysiphe|mildiu|oídio`.
- Extract paragraph(s) containing the match; run through translation pipeline (see §8 below) if non-English.
- Map French risk language to `severity`: *risque nul* → low; *risque faible* → low; *risque moyen/modéré* → moderate; *risque élevé/fort* → high; *risque très élevé/exceptionnel* → extreme.
- Map Spanish equivalents similarly.

#### 4. RSS Feeds (F13 INRAE, F22 EPPO Reporting Service)
- Subscribe via standard RSS client; poll every 6 hours.
- Keyword-filter items for mildew-relevant entries.
- For INRAE: flag as `hazard_type=research_update`; `severity=unknown`.
- For EPPO: flag as `hazard_type=powdery|downy` when keywords match; `severity=unknown` unless outbreak explicitly mentioned.

#### 5. Email Listservs (F08 NPDN/WPDN)
- Configure a dedicated inbound email address (e.g., `advisory-ingest@graftsystems.io`).
- IMAP-based ingest worker; keyword-filter for grape/vine mildew terms.
- Parse plain-text or HTML email body; create `advisory_event`.

### Deduplication
- For feeds with overlapping coverage (e.g., F10 BFC and F11 NA both covering parts of Burgundy/Bordeaux zones), set a 7-day dedup window keyed on `(region, hazard_type, issued_at_date)`.
- Store `source` as array to allow multi-source events.

### Latency Targets
| Feed Class | Pull Frequency | Max Acceptable Latency |
|-----------|--------------|----------------------|
| Weather APIs (CIMIS, SMN, open-meteo) | Hourly | 2 hours |
| UC IPM RAI, e-Phy | Daily | 24 hours |
| BSV PDFs (F10, F11) | Every 12h | 24 hours |
| RSS (INRAE, EPPO) | Every 6h | 12 hours |
| Email listservs | On arrival | 30 minutes |
| Annual batch (CDPR, OIV, INV) | Annual | 7 days |

---

## Translation Pipeline

### Scope
- French (FR → EN): BSV bulletins (F10, F11, F17), IFV technical notes (F14), e-Phy (F15), Vigicultures (F12), INRAE French editions (F13), Météo-France forecast labels.
- Spanish (ES → EN): INTA (F18), SENASA (F19), SMN field names (F20), INV reports (F21).
- No translation needed for EN-native feeds (F01–F09, F22–F25).

### Architecture

```
Raw text (FR|ES)
       │
       ▼
[Terminology Protector]
  • Regex-replace known technical terms with placeholder tokens BEFORE translation
  • Examples:
      mildiou           → <MILDIOU>
      oïdium            → <OIDIUM>
      Plasmopara viticola → <PLASMOPARA_VITICOLA>
      Erysiphe necator  → <ERYSIPHE_NECATOR>
      stade E–L [N]     → <STAGE_EL_N>     (phenology codes)
      AMM               → <AMM>            (Autorisation de Mise sur le Marché)
       │
       ▼
[LLM Translation Layer]
  • Model: GPT-4o or equivalent, prompted with:
    "You are a plant pathology technical translator (FR→EN or ES→EN).
     Preserve all placeholder tokens exactly. Translate with agronomic precision."
  • System prompt includes:
    - Glossary snapshot from /home/user/workspace/graft-spray/research/glossary.md
    - FRAC code registry (active ingredients)
       │
       ▼
[Terminology Restorer]
  • Replace placeholder tokens with canonical English terms from glossary
  • <MILDIOU>            → "downy mildew"
  • <OIDIUM>             → "powdery mildew"
  • <PLASMOPARA_VITICOLA>→ "Plasmopara viticola"
  • <ERYSIPHE_NECATOR>   → "Erysiphe necator"
  • <STAGE_EL_N>         → "E-L stage [N]" (Eichhorn-Lorenz)
  • <AMM>                → "marketing authorisation"
       │
       ▼
[Quality Checks]
  • Verify placeholders round-trip (no orphan tokens)
  • Check translated `severity` keyword appears in {low, moderate, high, extreme}
  • Flag for human review if confidence < 0.7
       │
       ▼
advisory_event.recommended_action (EN)
```

### Glossary Integration
The existing glossary at `/home/user/workspace/graft-spray/research/glossary.md` contains EN definitions for all key pathogens, weather variables, forecasting models, and fungicide classes. The translation pipeline injects the glossary as system-prompt context, so technical terms receive consistent English equivalents.

#### Key French → English Term Mappings (extend glossary as needed)

| French Term | English Equivalent | Glossary Section |
|-------------|-------------------|-----------------|
| mildiou (de la vigne) | downy mildew | Diseases & Pathogens |
| oïdium (de la vigne) | powdery mildew | Diseases & Pathogens |
| risque élevé | high risk | — (add to glossary) |
| risque nul | no risk | — |
| stade phénologique | phenological stage | — |
| humectation foliaire | leaf wetness duration (LWD) | Weather & Microclimate |
| AMM | marketing authorisation (product approval) | — |
| BSV | Bulletin de Santé du Végétal (crop health bulletin) | — (add) |
| FREDON | Regional Federated Network for Plant Health Observation | — (add) |
| DRAAF | Regional Directorate for Food, Agriculture, and Forestry | — (add) |

#### Key Spanish → English Term Mappings

| Spanish Term | English Equivalent | Glossary Section |
|-------------|-------------------|-----------------|
| mildiu (de la vid) | downy mildew | Diseases & Pathogens |
| oídio (de la vid) | powdery mildew | Diseases & Pathogens |
| mildiú polvoriento | powdery mildew | — |
| nota técnica | technical note | — |
| riesgo alto | high risk | — |
| registro fitosanitario | phytosanitary registry | — |
| INTA | Instituto Nacional de Tecnología Agropecuaria | — (add) |
| SENASA | Servicio Nacional de Sanidad y Calidad Agroalimentaria | — (add) |
| INV | Instituto Nacional de Vitivinicultura | — (add) |

### Fallback for Low-Quality Translations
If `confidence < 0.7` (assessed by checking that >90% of known agronomic terms are correctly rendered) the event is stored with `language_original` unchanged and flagged in a human-review queue. The raw Spanish/French excerpt is always stored in `raw_text_excerpt`.

---

*Last updated: 2026-05-06 | Feeds total: 25 (F01–F25) | Regions: California, Burgundy/Bordeaux, Mendoza, Global*
