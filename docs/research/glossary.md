# Graft Spray Dossier — Glossary & Acronyms

Consolidated terminology across the seven brain categories.

## Diseases & Pathogens

| Term | Definition |
|---|---|
| **Powdery mildew (PM)** | Fungal disease caused by *Erysiphe necator* (formerly *Uncinula necator*). Appears as white-grey powdery growth on leaves, shoots, and berries. Does not require free water for infection — high humidity (~85% RH) is sufficient. |
| ***Erysiphe necator*** | The pathogen causing grape powdery mildew. Two genotypes: A (flag-shoot overwintering) and B (chasmothecia overwintering). |
| **Downy mildew (DM)** | Disease caused by *Plasmopara viticola*, an oomycete (water mold). Appears as yellow "oil spots" on upper leaf surfaces with white sporulation on the underside. Requires free water on leaves to infect. |
| ***Plasmopara viticola*** | The oomycete pathogen causing grape downy mildew. Overwinters as oospores in leaf litter. |
| **Sporulation** | The production and release of spores by a pathogen — the contagious phase. |
| **Conidia** | Asexual spores produced by *E. necator* during the season; primary engine of secondary infections. |
| **Ascospores** | Sexual spores released from chasmothecia of *E. necator* in spring; primary inoculum for the season. |
| **Chasmothecia** | Overwintering fruiting bodies of *E. necator* (formerly called cleistothecia). |
| **Oospores** | Sexual, thick-walled overwintering spores of *P. viticola*. |
| **Zoospores** | Motile, swimming spores released by *P. viticola* sporangia in free water; the actual infectious unit. |
| **Sporangia** | Asexual reproductive structures of *P. viticola* that release zoospores. |
| **Latent period** | Time from infection to the appearance of new sporulation; varies with temperature. |
| **Esca / Black rot / Anthracnose** | Common look-alike grape diseases the visual classifier must not confuse with mildew. |

## Weather & Microclimate

| Term | Definition |
|---|---|
| **Leaf wetness duration (LWD)** | Hours per day a leaf surface is wet. Critical input for nearly every infection model. Most consumer weather APIs do not provide it. |
| **VPD (Vapor Pressure Deficit)** | Difference between saturation and actual vapor pressure; governs evapotranspiration and sporangia mortality. |
| **Dew point** | Temperature at which air becomes saturated; closely tracks leaf wetness onset. |
| **ET₀ (Reference evapotranspiration)** | Standardized water-loss reference used by some weather feeds. |
| **NDVI** | Normalized Difference Vegetation Index, derived from satellite imagery (e.g., Sentinel-2) to estimate canopy vigor. |
| **ERA5** | ECMWF reanalysis dataset; gold-standard historical hourly weather. |
| **NDFD** | NOAA's National Digital Forecast Database. |
| **CART** | Classification and Regression Tree — model used by Visual Crossing to derive leaf wetness. |

## Forecasting Models

| Term | Definition |
|---|---|
| **Gubler-Thomas (GT)** | UC Davis powdery mildew risk index (0–100). Original 1994; revised 2013 to add 38°C/2h lethality threshold. |
| **Mills Table** | Apple-derived leaf wetness × temperature table for ascospore infection; extended to grapes via the Modified Mills Table. |
| **DMCast** | Downy mildew forecasting model (Park et al., Wisconsin). |
| **EPI (Effective Prediction of Infection)** | Strizyk 1983 downy mildew energy-based model used in France. |
| **PLASMO / Goidanich** | Semi-mechanistic incubation model for *P. viticola*. |
| **Caffi Primary / Secondary** | Mechanistic *P. viticola* infection models (Caffi, Rossi, Bugiani 2009 + 2021). |
| **RIMpro** | Commercial decision-support service running multiple disease models. |
| **Magarey infection model** | Generic temperature-and-wetness infection function (Magarey et al.). |
| **Snyder-Sall PMI** | Daily Mildew Index for powdery mildew. |

## Recommendation Engine Inputs

| Term | Definition |
|---|---|
| **FRAC** | Fungicide Resistance Action Committee. Defines numbered groups by mode of action; required for resistance-management rotation. |
| **Active ingredient (a.i.)** | The chemically active fungicide compound. |
| **Trade name** | The branded product name (e.g., Quintec, Pristine, Revus). |
| **PHI (Pre-Harvest Interval)** | Minimum days between last application and harvest, by product and region. |
| **REI (Re-Entry Interval)** | Hours after application before workers may re-enter without PPE. |
| **DMI** | FRAC Group 3 demethylation inhibitors. |
| **SDHI** | FRAC Group 7 succinate dehydrogenase inhibitors. |
| **QoI / strobilurins** | FRAC Group 11 quinone outside inhibitors. |
| **Bordeaux mixture** | Copper sulfate + lime; classic copper fungicide. |
| **SAR / ISR** | Systemic / Induced Systemic Acquired Resistance — plant defense activation. |

## App Architecture

| Term | Definition |
|---|---|
| **On-device inference** | ML model runs on the iPhone via Core ML / TensorFlow Lite. Instant, offline, private; size-limited. |
| **Cloud inference** | Photo uploaded to server; larger model runs there. Slower, needs signal; more accurate, easier to update. |
| **Hybrid inference** | Lightweight on-device first pass + cloud "second opinion" — the recommended Graft Spray pattern. |
| **PostGIS** | Spatial extension to PostgreSQL; stores vineyard polygons. |
| **GeoJSON RFC 7946** | Standard JSON format for geographic features. |
| **Block** | A discrete sub-unit of a vineyard (industry standard). One vineyard contains many blocks. |
| **Panel / Vine** | Finer subdivisions inside a row. |
| **Severity 1–10** | Graft Spray's chosen severity scale. Maps to EPPO PP 1/004, Horsfall–Barratt, and the GDCNet 7-level scale; full mapping in §01. |

## Regulatory & Compliance

| Term | Definition |
|---|---|
| **PCA (Pest Control Adviser)** | California license required to recommend pesticides for compensation. The #1 go-to-market risk for Graft Spray in California. |
| **CDFA / DPR** | California Department of Food and Agriculture / Department of Pesticide Regulation. |
| **PUR (Pesticide Use Report)** | California's monthly use-report submitted to county Ag Commissioners by the 10th. |
| **WPS (Worker Protection Standard)** | US EPA pesticide worker safety regulation. |
| **FIFRA** | US Federal Insecticide, Fungicide, and Rodenticide Act. |
| **SUD (Sustainable Use Directive)** | EU Directive 2009/128/EC governing pesticide use; superseded in 2023. |
| **BSV (Bulletin de Santé du Végétal)** | French regional plant-health bulletins. |
| **IFV (Institut Français de la Vigne et du Vin)** | French wine and vine institute. |
| **INRAE** | French National Research Institute for Agriculture, Food and Environment. |
| **AWRI** | Australian Wine Research Institute. |
| **SENASA** | Argentine national agri-food health and quality service. |
| **INTA** | Argentine National Agricultural Technology Institute. |
| **Loi Duplomb (2026)** | French law affecting fungicide registration. |

## Acronym Quick Reference

ADAPT · AEMET · APNs · ASABE · ASVO · AUC · BPA · BSV · CAC · CART · CCPA · CDFA · CIVB · COVIAR · DGAL · DM · DPR · DSS · ECMWF · EPI · EPPO · ETo · F1 · FAA · FIFRA · FRAC · GDPR · GT · HOBO · IFV · INRAE · INTA · INV · IPM · ISO 11783 · LSTM · LWD · MAE · MLflow · NDVI · NDFD · NEWA · NOAA · NOP · NWS · OIV · PCA · PHI · PM · PUR · QAC · QAL · QoI · REI · RH · RIMpro · RTK · SAR · SDHI · SDS · SENASA · SUD · TAM · TTB · UV-B / UV-C · VPD · WCAG · WPS · WSP

(Full expansions appear in the relevant category files.)
