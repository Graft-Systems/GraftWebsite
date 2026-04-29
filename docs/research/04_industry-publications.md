# Wine-Industry Mildew Publications and Decision-Support Resources

## Summary

This category documents the full landscape of resources that winegrowers actively use to make spray decisions for powdery mildew (*Erysiphe necator*) and downy mildew (*Plasmopara viticola*). Coverage spans US university extension programs, French and EU national institutions, Spanish and Argentine viticulture bodies, Southern Hemisphere research institutes, and the commercially deployed decision-support system (DSS) market. Key fungicide resistance management guidance (FRAC) and pre-harvest/re-entry interval (PHI/REI) regulatory tables per priority region are also documented.

**Core finding**: The industry is converging on three overlapping approaches — (1) model-based infection-period forecasting using microclimate weather station data (temperature, leaf wetness, relative humidity, rainfall), (2) integrated phenology-gating that defines critical spray windows (pre-bloom to 4 weeks post-bloom), and (3) risk-index systems that adjust spray intervals to disease pressure rather than a fixed calendar. Validated DSS use reduces fungicide treatments by 30–50% without yield compromise. Resistance to FRAC 11 (QoI/strobilurins) in *E. necator* is widespread globally; CAA resistance in *P. viticola* is present across European vineyards.

---

## Key Findings

1. **UC Davis Powdery Mildew Risk Index** is the dominant US model for *E. necator* — a running temperature-based index (0–100) that prescribes spray intervals at three disease pressure tiers (low/moderate/high), directly translatable into software logic. [S1]
2. **DMCast** (Cornell/NEWA) is the primary US model for *P. viticola* — deployed on the NEWA web platform and validated for primary infection prediction in New York state for nine consecutive years. [S2]
3. **French BSV bulletins** (weekly, region-specific) integrate the **SOV model** (powdery mildew) and oospore maturity monitoring for downy mildew, and are the primary advisory communication vehicle for Burgundy and Bordeaux growers. [S3]
4. **IFV's Décitrait / EPICURE** platform uses IFV-validated models for both mildews and is co-deployed via Chambres d'Agriculture; the OSCAR network monitors PIWI (resistant variety) plots. [S4]
5. **EPI model** (France, 1983) remains a standard decision heuristic for downy mildew primary infection across France and Italy; integrated into Epicure/VitiMeteo. [S5]
6. **RIMpro** is the only commercially available fully-dynamic (non-event-based) seasonal model for both pathogens — quantifies cumulative disease load including secondary infection cycles. [S6]
7. **VitiMeteo** (Germany/KIT Karlsruhe) is the dominant DSS in German-speaking viticulture; now adapted for PIWI varieties and organic viticulture under the VITIFIT project. [S7]
8. **FRAC Code 11 (QoI/strobilurin) resistance** in powdery mildew is confirmed in California, Virginia, Michigan, Oregon, and widespread globally; growers in high-resistance zones must limit to 0–2 applications/season. [S8]
9. **AWRI "Lag-Phase Control"** strategy (Australia) emphasizes early-season inoculum reduction over calendar spraying, reducing 6–7 applications to 3–4 with no yield penalty. [S9]
10. **Argentina INTA EEA Mendoza** has published baseline factsheets on *E. necator* biology and management but does not yet operate a DSS-based advisory system comparable to NEWA or VitiMeteo. [S10]
11. **PHI/REI tables** for California are fully documented on UC IPM; the EU Pesticides Database is the authoritative registry for authorized EU substances; Argentina's SENASA registry is the national authority. [S11]

---

## Detailed Notes

### University Extension — United States

#### UC Davis / UC IPM

**Resource type**: Web-hosted pest management guidelines (free, continuously updated).

**Powdery Mildew** [S1]:
- Full URL: https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/
- Describes the **UC Davis Powdery Mildew Risk Index (RI)** in complete algorithmic detail:
  - Phase 1 (Epidemic initiation): After primary ascospore infection confirmed, start index at 0. Add 20 pts/day for ≥6 continuous hours at 70–85°F. Reset to 0 if fewer than 6 hours; continue until RI reaches 60 (epidemic underway).
  - Phase 2 (Spray timing): Running daily index, capped 0–100. ≥6 hrs at 70–85°F → +20; <6 hrs → −10; ≥95°F for ≥15 min → −10.
- RI-based spray interval table:

| RI | Disease Pressure | Biologicals/SARs | Sulfur | DMI (Group 3) | QoI/Quinoline (Groups 11/13) |
|----|-----------------|------------------|--------|----------------|-------------------------------|
| 0–30 | Low | 7–14 day | 14–21 day | 21-day or label | 21-day or label |
| 40–50 | Moderate | 7 day | 10–17 day | 21 day | 21 day |
| 60+ | High | Not recommended | 7 day | 10–14 day | 14 day |

- PHI/REI table for California grape fungicides included in full on page (see §PHI/REI tables below).

**Downy Mildew** [S12]:
- Full URL: https://ipm.ucanr.edu/agriculture/grape/downy-mildew/
- Guidance is largely calendar/phenology-gated: azoxystrobin from budbreak; mefenoxam+copper (Ridomil Gold Copper) up to 4× pre-bloom only; copper for late-season.
- No standalone model explicitly cited for downy mildew in California (rainfall infrequent in Napa/Sonoma, limiting primary infection events).
- Rotation rule: do not apply >2 sequential applications of single mode-of-action products.

#### Cornell University / NEWA (Network for Environment and Weather Applications)

**Resource type**: Free online web platform with automated weather station feeds and crop disease model outputs.

**DMCast** (Grape Downy Mildew Forecast Model) [S2]:
- URL: https://newa.cornell.edu/ (grape disease section)
- Original development: Robert Seem and colleagues, Geneva, NY. Re-programmed by Northeast Regional Climate Center (NRCC) to access NEWA weather database.
- **Inputs**: Hourly air temperature, relative humidity, leaf wetness, precipitation from NEWA weather stations.
- **Outputs**: Primary infection risk (based on oospore maturation conditions — temperature + rainfall + leaf wetness hours); secondary infection cycle incubation tracking.
- **Underlying model**: Uses same environmental parameters as POM model; strong performance for primary infection prediction (9 consecutive years correct for NY state); validated for NY but known to underpredict in Italian Mediterranean conditions.
- **Deployment**: Freely accessible via NEWA web interface by growers and extension educators in NY, PA, MI, MD, and neighboring states.
- **Reference**: Carroll, J. et al. Cornell AgriExt; see [S2].

**Grape Powdery Mildew Model (NEWA)** [S2]:
- Underlying algorithm: Excel-based formulas derived from UC Davis Risk Index, adapted by Cornell scientists.
- Same model logic as UC IPM Risk Index but integrated into NEWA web interface with automatic weather station data.
- Also models black rot and Phomopsis alongside powdery mildew.

**Cornell NY/PA Pest Management Guidelines for Grapes** [S13]:
- Annual publication: 2025 edition previewed at https://cropandpestguides.cce.cornell.edu/Preview/2025/2025_Grape_Guide_Preview.pdf
- Covers powdery mildew, downy mildew, black rot, Phomopsis, Botrytis, and sour rot.
- Detailed phenology-gated spray tables: 3–5 inch shoot growth, 10-inch, immediate pre-bloom, first post-bloom, second post-bloom, midsummer.
- Peak intensity from just before bloom through fruit set: emphasizes full-rate, full-coverage, maximum FRAC rotation during this window.
- References DMCast (NEWA) for downy mildew spray timing.

#### Oregon State University (OSU) Extension

**Resource type**: Online extension articles and Pest Management Guide for Wine Grapes in Oregon.

**Powdery mildew outbreak management** [S14]:
- URL: https://extension.oregonstate.edu/crop-production/wine-grapes/how-deal-vineyard-powdery-mildew-outbreak
- Three-step rescue protocol: (1) Water bath (200–400 gal/acre + surfactant to lyse conidia), (2) mineral oil (1–2%, within 2 days), (3) protective fungicide.
- Resistance management: Under epidemic conditions, use low-resistance-risk materials (sulfur, mineral oil, Group UN/M2); avoid using Group 3, 7, 11 on active epidemic if possible.
- References OSU Pest Management Guide for Wine Grapes in Oregon for full product listings and FRAC groups.

#### Washington State University (WSU) Viticulture

**Resource type**: Extension factsheets, HortSense online guide, Washington Wine Commission technical documents.

**Powdery mildew** [S15]:
- HortSense URL: https://hortsense.cahnrs.wsu.edu/fact-sheet/grape-powdery-mildew/
- First fungicide application: when new growth is 6 inches long; repeat at 10–14 day intervals.
- Washington Wine Commission "Basic Training for Combating Mildew" [S16]:
  - URL: https://www.washingtonwine.org/wp-content/uploads/2021/05/PM-PWV-2.pdf
  - FRAC 11 resistance confirmed in WA; detailed resistance management: pre-plan FRAC rotation, alternate with low-risk products (sulfur, oil); do not stretch interval beyond 14 days; avoid FRAC 11 during rachis elongation to fruit set.
  - Emphasizes "let the vines tell you when to spray" — shoot growth rate, weather conditions, canopy development dictate interval tightening.
- WSU FRAME Networks [S17]: https://framenetworks.wsu.edu/grower-information/ — annual FRAC code list updates and resistance testing resources for grape powdery mildew FRAC 11 (G143A mutation).

#### Penn State Extension

**Resource type**: Blog posts (Penn State Extension Wine & Grapes University), annual NY/PA guidelines (co-published with Cornell).

**Key resource** [S18]:
- URL: https://psuwineandgrapes.wordpress.com/2020/06/24/mid-to-late-season-control-of-downy-and-powdery-mildew-and-bunch-and-sour-rots-in-2020/
- Author: Bryan Hed, Grape Pathology Research Technologist, Penn State Lake Erie Regional Grape Research and Extension Center.
- Downy mildew: Monitor for white sporulation, use DMCast model on NEWA in conjunction with field scouting. Fruit susceptible until ~3 weeks post-capfall.
- Powdery mildew: Fruit susceptible until 3–4 weeks post-capfall. Reduce overwintering inoculum by controlling PM through Labor Day.
- Sulfur note: discontinue ≥5 weeks before harvest for red varieties destined for skin-contact fermentation (H₂S risk).
- 2020 NY/PA Pest Management Guidelines for Grapes referenced; 2025 edition at Cornell eCommons.

#### Virginia Tech (VT)

**Resource type**: Extension factsheets, online Fungicide Guide for Grapes, non-bearing vineyard spray guide.

**Powdery mildew factsheet** [S19]:
- URL: https://www.arec.vaes.vt.edu/content/dam/arec_vaes_vt_edu/alson-h-smith/grapes/pathology/extension/factsheets/powdery_mildew.pdf
- Season-long program required for V. vinifera; high disease year prior → more important early sprays.
- Oils: excellent eradicant at 100 gal/acre; horticultural oils warned for phytotoxicity >90°F.

**Fungicide guide** [S20]:
- URL: https://www.arec.vaes.vt.edu/content/dam/arec_vaes_vt_edu/alson-h-smith/grapes/pathology/extension/fungicide/fungicides.pdf
- QoI strobilurins (FRAC 11): max 2 seasonal sprays in Virginia due to resistance. Not to be used on full-blown PM or DM infections.

**Non-bearing vineyard spray guide** [S21]:
- URL: https://www.pubs.ext.vt.edu/SPES/SPES-315/SPES-315.html
- Detailed spray schedule from 3–5" shoot growth; during outbreak, revert to M-group multisite products only.

---

### French and EU Institutions

#### INRAE (Institut national de recherche pour l'agriculture, l'alimentation et l'environnement)

**Key publication** [S22]:
- Delière, L. et al. (2014). "Field evaluation of an expertise-based formal decision system for fungicide management of grapevine downy and powdery mildews." *Pest Management Science* 71(3):339–49. DOI: 10.1002/ps.3917
- URL: https://sante-agroecologie-vignoble.bordeaux-aquitaine.hub.inrae.fr/media/publications/acl/2015-acl/deliere-pms
- **Mildium® DSS**: Assessed over 4 years in 83 French vineyard plots. Combines bioclimatic risk models with field assessments; synchronized treatments for both mildews in a single pass.
- Results: Reduced treatments by **30–50%** vs. grower practices while maintaining effective control.
- Earlier designation in publications: **GrapeMilDeWS** (Grape Mildews Decision Workflow System).

**Machine learning model for Bordeaux GDM** [S23]:
- Delière et al. / INRAE Bordeaux (2020). "Forecasting severe grape downy mildew attacks using machine learning." *PLoS ONE* 15(3):e0230136.
- URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7067461/
- Dataset: 153 plots × 9 years in Bordeaux region (untreated rows, weekly scouting).
- Best model: LASSO/gradient boosting using onset date + spring precipitation and temperature.
- **Decision rule**: Triggering first spray only when predicted probability of severe attack exceeds threshold → 50–80% reduction vs. current practice (avg. 10.1 treatments/season in 2013).

**Participatory IPM study** [S24]:
- INRAE/IFV (2024). "A participatory approach to involve winegrowers in pesticide use reduction." *HAL INRAE*, hal-04474605.
- URL: https://hal.inrae.fr/hal-04474605v1/document
- IPM strategy with −14% to −57% TFI reduction (mean −25%) vs. High Environmental Value (HEV) reference in participating French winegrowers.

#### IFV (Institut Français de la Vigne et du Vin)

**Oïdium practical guide** [S25]:
- URL: https://www.vignevin.com/publications/fiches-pratiques/oidium/
- Treatment strategy based on variety sensitivity and BSV disease pressure.
- Early treatments (stage C–D) for plots with "flag shoots" (drapeaux); normally sensitive plots: start at separated floral buttons (boutons floraux séparés).
- No numerical thresholds; integrates BSV monitoring.

**Note technique résistances (annual)** [S26]:
- 2026 edition: Note technique commune résistances 2026, published January 2026.
- Available via: DRAAF Bourgogne BSV bulletins; IFV via UGVC: https://ugvc.fr/2025/01/22/ifv-note-technique-2025-sur-les-resistances-aux-maladies-de-la-vigne/
- Lists all authorized active substances for mildiou, oïdium, Botrytis, black rot.
- Describes resistance status per substance (mancozeb withdrawn EU 2021; dimethomorph grace period expired May 2025; OSBPI first resistance in 2021, redetected 2024).
- Strategic guidance: no more than 3–4 same-MOA applications/season; alternate MOA each spray; prioritize multisite products under high epidemic conditions.

**Décitrait / EPICURE platform** [S4]:
- URL: https://chambres-agriculture.fr/etre-accompagne/nos-solutions-numeriques/decitrait
- Operator: Chambres d'Agriculture France, built on IFV models.
- **Inputs**: Parcel-level weather data, spatially interpolated weather forecasts.
- **Outputs**: Real-time risk analysis for mildiou, oïdium, black rot; optimal intervention windows; guides dose adjustment; IFT (Treatment Frequency Index) reduction.
- **Underlying models**: IFV-validated bioclimatic models (not publicly described in detail).
- **User base**: French viticultural advisory network.

**OSCAR network** [S27]:
- URL: https://www.vignevin.com/article/publication-de-la-note-technique-nationale-oscar-2026/
- Coordinated by INRAE and IFV with Chambres d'Agriculture; monitors PIWI (resistant variety) plots for disease break-through.
- 2025 data: 88% of OSCAR plots received ≥1 fungicide; median 5 fungicides, IFT 2.5.
- Includes virulence studies on *P. viticola* populations from resistant variety plots.

#### BSV (Bulletins de Santé du Végétal) — Regional Vine Bulletins

**Bourgogne-Franche-Comté** [S3]:
- Publisher: Chambre Régionale d'Agriculture de Bourgogne-Franche-Comté (CRA BFC).
- Frequency: Weekly during growing season.
- 2026 BSV Vigne N°02 (08/04/2026): https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/IMG/pdf/bsv2026-vigne_02_du_08-04-2026.pdf
- Structure:
  - **Mildiou**: Oospore maturity monitoring (19 sites; maturity confirmed on 3/19 sites in Jura, Côte de Beaune, Côte Chalonnaise as of April 2026). Infection model requires simultaneous: (a) oospore maturity, (b) vine at ≥1-leaf stage, (c) contaminating rain >2mm at ≥10–11°C.
  - **Oïdium**: Uses **SOV model** (Système Oïdium Vigne) for early-season risk tendency.
  - Signed by supervisory authority (SRAL — Service Régional de l'Alimentation), under Ecophyto 2030.

**Occitanie-Cahors BSV** [S28]:
- URL: https://occitanie.chambres-agriculture.fr/fileadmin/user_upload/265_chambre_dagriculture_-_occitanie/BSV/Midi-Pyrenees/Viticulture_Cahors/2025/BSV_VITI_MP_Cahors_N6_06052025.pdf
- Includes the same note technique commune résistances as national reference.

**Bordeaux / Aquitaine INRAE hub**:
- Regional publications available at: https://sante-agroecologie-vignoble.bordeaux-aquitaine.hub.inrae.fr/

#### Chambres d'Agriculture — Viticulture Publications

- Each region produces technical sheets and crop calendars for viticulture disease management.
- Chambres d'Agriculture national portal: https://chambres-agriculture.fr/
- Key viticulture content varies by region; Décitrait DSS (see above) is the national platform.

---

### Spanish and Argentine Institutions

#### ICVV (Instituto de Ciencias de la Vid y del Vino, Spain — La Rioja)

**Oidio Detection project** [S29]:
- URL: http://www.icvv.es/english/oidio-detection-project-sustainable-application-phytosanitary-treatments
- Objective: Develop a bioclimatic model-based tool for optimizing *E. necator* treatment applications for Spanish growers.
- Status: Research project stage as of 2018; no public-facing commercial deployment confirmed.

**IOBC integrated protection in viticulture** [S30]:
- Abstracts: https://www.icvv.es/english/sites/default/files/archivos/abstracts_book_integrated_protection_in_viticulture.pdf
- ICVV participates in international integrated protection research; contributions to downy mildew resistant variety durability studies.

**Predictive models for Mediterranean conditions** [P1]:
- Puelles, M. et al. (2024). "Predictive models for grape downy mildew (*Plasmopara viticola*) as a decision support system in Mediterranean conditions." *Crop Protection* 175. DOI: 10.1016/j.cropro.2023.106484
- Compared Goidanich, MILVIT, VitiMeteo-Plasmopara, and improved UR-model in Spain.
- Result: UR-model performed best under Mediterranean conditions (56% matching, 75% in humid years); MILVIT and VitiMeteo provided both over- and under-prediction. Goidanich consistently over-predicted.

#### INTA (Instituto Nacional de Tecnología Agropecuaria), Argentina

**EEA Mendoza — Oídio factsheet** [S10]:
- URL: https://repositorio.inta.gob.ar/bitstream/handle/20.500.12123/13114/INTA_CRMendozaSanJuan_EEAMendoza_Arias,%20MF_O%C3%ADdio%20de%20la%20vid%20Uncinula%20necator.pdf
- Author: M. Fernanda Arias, INTA EEA Mendoza.
- Disease present practically every year in Mendoza regardless of conditions. Optimal temperature 20–27°C (range 6–32°C). Cloudy cool days favor infection; rain halts it.
- Spray guidance: Preventive treatments most effective; consult specialist for product selection.
- Cultural: training systems that favor aeration/insolation; avoid excess nitrogen; timely leaf removal after fruit set.
- Key references: Lucero et al. 2009, INTA Manual de tratamientos fitosanitarios, Sección III: Vid.

**INTA Catamarca — Disease management strategies** [S31]:
- URL: https://www.argentina.gob.ar/noticias/estrategias-para-el-manejo-de-enfermedades-en-el-cultivo-de-vid
- Collaborative work between INTA Catamarca, Salta, Rama Caída, COVIAR, FCA-UNCa on wood diseases and virus management.
- Emphasis on diagnosis first, then management strategy; includes screening for tolerant germplasm.

**INV (Instituto Nacional de Vitivinicultura)**:
- Regulatory authority for Argentine wine sector; does not publish spray advisory materials.
- URL: https://www.inv.gov.ar/

---

### Other Wine-Producing Regions

#### AWRI (Australian Wine Research Institute)

**Managing Powdery Mildew — AWRI technical guide** [S9]:
- URL: https://www.awri.com.au/wp-content/uploads/powdery_mildew_manage.pdf (also Wine Australia: https://www.wineaustralia.com/getmedia/c1d730e3-7a9a-4d43-b254-d271f1f24d2c/201003-Managing-powdery-mildew)
- **Lag-Phase Control strategy**: Apply fungicides during the early-season "lag phase" (first 40 days from budburst) when inoculum is low. Prevents formation of overwintering cleistothecia and reduces disease pressure in subsequent seasons. This is the defining strategic contribution of AWRI vs. US/EU approaches.
- **Epi-season concept**: PM is a "two-season disease" — disease managed in Season 1 determines inoculum available in Season 2.
- Key window: First 40 days from budburst; flag shoot detection 3–6 weeks post-budburst.
- Sulfur: Apply at 600 g/100L in large Australian canopies; best timing is calm evening after hot day (volatilization into canopy).
- Three T's: Type, Timing, Technique.
- ~15 active ingredients registered (~65 products) in Australia for powdery mildew control.

**AWRI wet season update — downy mildew** [S32]:
- URL: https://www.awri.com.au/information_services/ebulletin/2024/01/11/a-wet-season-update-managing-fungal-diseases-between-veraison-and-harvest/
- Preventive sprays before infection event critical for DM. Most registered products are protectants.
- Mefenoxam (Group 4) for curative control after infection event: two applications 7–10 days apart.
- Phosphorous acid: 0-day PHI but sensitive to export market residue tolerances.
- AWRI "Dog Book" (annual fungicide recommendations for export wine) is the primary product selection reference.

**ASVO (Australian Society of Viticulture and Oenology)** [S33]:
- "Overview of powdery mildew and chemical control" proceedings paper.
- URL: https://www.asvo.com.au/sites/default/files/uploaded-content/website-content/asvo_proceedings_335_overview_of_powdery_mildew_and_chemical_control.pdf
- Documents Australian spray interval norms: 7–10 days during flowering for DMIs and strobilurins.

**Barossa Wine / GWRDC Factsheet** [S34]:
- "Powdery Mildew Q&A" — https://www.barossawine.com/wp-content/uploads/2020/10/GWRDC_Powdery-Mildew_QA.pdf
- Spray to protect buds at basal shoot nodes (Days 0–40 from budburst); berries resistant 3–4 weeks after flowering.
- Spray intervals can be lengthened in lag phase with good early control.

#### New Zealand — NZ Winegrowers / Plant & Food Research (now Bragato Research Institute)

**NZ PM and Botrytis integrated management** [S35]:
- Agnew, R. et al. (2004). "Effects of spraying strategies based on monitored disease risk on grape disease control and fungicide usage in Marlborough." *NZ Plant Protection Society*.
- URL: https://nzpps.org/_journal/index.php/nzpp/article/download/6937/6765/9139
- Disease monitoring system developed by HortResearch (now Plant & Food Research): field monitoring + **Bacchus** Botrytis model (software).
- Powdery mildew thresholds: **5% leaf incidence** and **3% bunch incidence** trigger DMI curative spray.
- Result: Target spraying approach reduced from 4 to 1–2 DMI applications/season; no unacceptable disease levels.
- Protectant sulfur sprays at 2, 4, 6 weeks after budbreak; weekly monitoring from 8 weeks post-budbreak.

**NZ fungicide resistance** [S36]:
- BRI/Plant & Food Research (2026). "Rapid detection of fungicide-resistance in grapevine powdery mildew." *Bragato Research Institute*.
- URL: https://bri.co.nz/2026/01/27/rapid-detection-of-fungicide/
- QoI (FRAC 11) resistance widespread in Marlborough. Moderate resistance in FRAC groups 3, 5, 7 in Hawke's Bay and Marlborough. No high-level resistance in SDHI (Group 7) or amines (Group 5) detected.
- Recommends: limit SDHI applications per season; rotate FRAC groups; follow label resistance guidelines.

---

### Commercial Decision-Support Tools

| Tool | Inputs | Outputs | Underlying Model | Integrations | Pricing | Source |
|------|--------|---------|-----------------|--------------|---------|--------|
| DMCast (Cornell/NEWA) | T, RH, LW, precip (NEWA stations) | Primary infection risk; secondary cycle incubation | POM-derived mechanistic model | NEWA web platform, NRCC weather database | Free | [S2] |
| NEWA Powdery Mildew | T (hourly), BBCH phenology | Risk index 0–100; spray interval recommendation | UC Davis Risk Index (temperature-based) | NEWA web; stations across US northeast | Free | [S2] |
| RIMpro (Plasmopara) | T, RH, precip, LW; microclimate adj; variety susceptibility; fungicide records | Infection risk 0–100; disease simulation curve (oil spots, sporulation); fungicide protection estimate | Dynamic population model; non-event-based; seasonal history tracking | Cloud platform; station integration; multi-crop models | Subscription (price undisclosed) | [S6] |
| RIMpro (Powdery Mildew) | T, RH, LW, precip; BBCH; variety | Sporulation index; spore germination/infection periods; disease simulation on leaves and fruit | Ascospore release trigger → conidial cycle; infection based on T+RH | Cloud platform; rimpro.cloud | Subscription | [S6] |
| VitiMeteo | T, RH, LW, precip, phenology | Downy mildew infection events; incubation period; leaf area development; disease risk | VM-Plasmopara (mechanistic); VM-Oidium (T-based risk) | German viticulture extension; VITIFIT project for PIWI/organic; web platform | Free (public); licensed for commercial use | [S7] |
| EPI (État Potentiel d'Infection) | Temperature, humidity, rainfall historical data (≥30 yr recommended) | Low/medium/high infection risk (green/orange/red) | Empirical French model (Genet 1983); primary infection potential based on historical climate thresholds; Epicure implementation | EPICURE web platform (France/Italy); Sencrop (Vitimeto + Movida modules) | Via Epicure/VitiMeteo subscription | [S5] |
| MILVIT | Daily T, RH, rainfall | Infection blocks (5–7 day windows); primary and secondary infection assessment | Italian model adapted from Goidanich; tested in Mediterranean conditions | Research deployments in Spain; not confirmed as standalone commercial product | Research/institutional | [P1] |
| Vintel (iTK) | Station weather (Sencrop, Weenat, Pessl, Davis, etc.); phenology; plot history | Spray timing recommendations; dose adjustment guidance; spray window conditions; 1st treatment savings | IFV-validated models (disease-specific, not publicly disclosed) | Sencrop, Weenat, Pessl, Davis weather stations; traceability/plot management software | Subscription (price undisclosed) | [S37] |
| Sectormentor for Vines | Manual scouting data (field observations, phenology, disease incidence); RFID sampling points | Disease pressure records; spray scheduling recommendations; scouting history; yield estimates | Observational DSS (field data aggregation, not mechanistic infection model) | Farm management software; available iOS/Android; Napa Green partner | Subscription | [S38] |
| eVineyard | IoT weather station data (T, RH, LW, precip); grapevine growth stage; past management activities | Spray timing advice for PM, DM, Botrytis; fungicide timing optimization | Predictive analytics on combined weather+soil+phenology+activity data; meta-analysis basis: 50% treatment reduction vs. calendar | IoT sensor networks (own or 3rd party); cloud platform | Subscription | [S39] |
| Pessl Metos FieldClimate | T, RH, LW, precip (iMETOS 3.3, µMETOS NB-IoT Disease, µMETOS CLIMA LoRa sensors) | (a) Downy Mildew primary + secondary infection stages; (b) Powdery Mildew ascospore infection + Californian Risk Model (0–100) + Pessl RI (0–100 with LW adjustment); (c) Botrytis, black rot, anthracnose, Phomopsis models | California Risk Model (PM); Plasmopara primary/secondary mechanistic model (DM); Botrytis "wet points" accumulation model | iMETOS hardware ecosystem; FieldClimate web portal | Hardware purchase + subscription | [S40] |
| Sencrop | T, RH, LW, precip (own stations) | Crop-scale weather monitoring; disease forecasting via partner models (Vitimeto, Movida) | Data feed to EPI-based modules and partner DSS | Partnership with EPI/Vitimeto; web + mobile app; station network | Hardware + subscription | [S41] |
| Galileo (Trellis) | Not confirmed as vineyard disease DSS — Corteva product "Galileo Sensa" is an herbicide for woody weeds; no vineyard disease module confirmed | — | — | — | — | [Note: No vineyard disease DSS matching "Galileo (Trellis)" confirmed in research; may refer to Trellis vineyard management platform] |
| Wildeye | No confirmed commercial product for vineyard mildew DSS found; name appears in emerging AgriTech market discussions | — | — | — | — | [Not confirmed; recommend further verification] |
| Adama / Bayer / BASF advisory apps | Corteva Agriscience publishes product guides (Zorvec, Talendo, Systhane Star, Karathane Star) with PHI and spray interval tables [S42] — crop protection companies typically provide label-based recommendations rather than weather-model-driven DSS | Label-based spray intervals (e.g., Zorvec: 1×/season, 56-day PHI; Talendo: 3×/season, 14-day PHI) | Calendar/label-based | Company websites; agrodealer networks | Free (product guides) | [S42] |

#### Per-Tool Subsections

##### DMCast (Cornell/NEWA)

DMCast was developed by Robert Seem and colleagues at Cornell University's Geneva, NY experimental station and is deployed on the NEWA platform hosted by the Northeast Regional Climate Center (NRCC). The model uses hourly weather data (temperature, relative humidity, leaf wetness, and rainfall) to predict conditions favorable for primary *P. viticola* infection — specifically, oospore maturation conditions (warm, wet soil), followed by sufficient leaf wetness for zoospore release and infection. It has been validated for primary infection prediction in nine consecutive growing seasons in New York state. Performance in European or Mediterranean climates is weaker (typically underpredicts), requiring local recalibration. [S2]

##### RIMpro

Developed by René Grosman (IFPC/INRA) and colleagues; currently maintained as a cloud-based commercial platform at https://rimpro.cloud/. Unlike most "event-based" models that evaluate each rain event in isolation, RIMpro maintains a running quantitative disease estimate across the entire season, compounding secondary infection cycles to reflect true epidemic trajectory. Key innovation: the model accounts for exponential disease increase — more oil spots produce more zoospores, which produce more infections. Infection values <10 are negligible; approaching 100 indicates need to spray. The powdery mildew model separately tracks cleistothecia-driven primary release and conidial secondary cycles; sporulation index is tracked separately from infection index. Fungicide records are logged per vineyard, with protection estimates based on new unprotected leaf surface and washout rates. [S6]

##### VitiMeteo

Developed at KIT (Karlsruhe Institute of Technology / State Institute of Viticulture Freiburg, Germany). The VM-Plasmopara component calculates upcoming infection events, incubation period duration, and leaf area development. It has been the standard DSS in German-speaking viticulture for decades and is now being extended under the **VITIFIT** project (https://vitifit.de/en/) to adapt models for PIWI/fungus-resistant varieties and organic viticulture. A peer-reviewed study (Gessler et al., 2020, *Plants* 9(7), DOI: 10.3390/plants9070836) documents model improvement and strategy validation. [S7]

##### EPI Model

Developed in France in 1983 (Genet); based on historical climatological data to model *P. viticola* potential infection state. Simple two-equation model estimating primary infection potential and secondary infection risk. Widely deployed in France, Belgium, and northern Italy. Incorporated into the EPICURE web platform and accessible via Sencrop's "Vitimeto" and "Movida" disease modules. Limitation: requires ≥30 years of historical meteorological data for accurate calibration; known to generate false negatives in some studies and to overestimate risk for secondary infections. [S5]

##### MILVIT

Italian model developed from the Goidanich base model; designed for Mediterranean climatic conditions. Compared with VitiMeteo-Plasmopara, Goidanich, and the UR-model in a 2-year Spanish study (Puelles et al. 2024). Both MILVIT and VitiMeteo provided over- and under-prediction in Mediterranean conditions; the Goidanich model consistently over-predicted. An improved UR-model was the most accurate option for Spain. MILVIT is an institutional research model rather than a fully commercial product. [P1]

##### Vintel (iTK)

French company iTK (formerly ACTA group spinoff); Vintel at https://vintel-itk.com/. Described as "the most complete decision support tool for viticulture." Collaborative platform supporting winegrowers, advisors, vineyard managers, cultivation managers, and directors. Disease modules: powdery and downy mildew risk prediction, vine sensitivity visualization, spray window checking based on weather. Integrates with common French weather station brands (Sencrop, Weenat, Pessl, Davis) and traceability/plot management software. Emphasis on organic and biocontrol itineraries where repeat treatments closely track weather conditions. [S37]

##### Sectormentor for Vines

UK-based vineyard data platform (Vidacycle Ltd); https://vines.vidacycle.com/. Primary function is structured scouting data collection via mobile app with RFID sampling points. Generates historical disease pressure records, scouting histories, and yield estimates per block. Does not include a mechanistic infection model — disease management decisions are based on accumulated field observations rather than weather-driven infection prediction. Featured in Napa Green sustainability program. [S38]

##### eVineyard

Slovenian company; https://www.evineyardapp.com/. IoT-connected vineyard management platform. Disease forecasting models for powdery mildew, downy mildew, and Botrytis; applies predictive analytics combining IoT microclimate data, growth stage, and management history. Case study with Radgonske Gorice (Slovenia): 30–35% reduction in spray applications in 2015–2016 trials. Meta-analysis referenced: 80 independent experiments → DSS reduces fungicide treatments by ≥50% vs. calendar without compromising disease control. [S39]

##### Pessl Metos FieldClimate

Austrian company Pessl Instruments (METOS brand); hardware stations (iMETOS 3.3, µMETOS NB-IoT Disease, µMETOS CLIMA LoRa) feed the FieldClimate web platform. For grapevines, available models include:
- **Downy Mildew Primary Infection**: Checks conditions for sporangia development (leaf wet, RH ≥70% post-rain, continuous rain ≥5mm = strong zoospore dispersal event). Sporangia develop within 16–24 hours depending on temperature.
- **Downy Mildew Secondary Infection**: T >12°C and RH >95%; sporulation rate increases to 23°C; accumulated hourly T >50°C threshold for new sporangia.
- **Powdery Mildew Ascospore Infection Model**: ≥2.5mm rain → ascospore release; 8–12 hours leaf wetness at 10–15°C for infection; then switches to Californian Risk Model.
- **Californian Risk Model**: Same UC Davis algorithm (0–100 index); Low (0–30), Moderate (40–50), High (60+).
- **Pessl Instruments Risk Model**: Modified Californian model also incorporating leaf wetness — LW >8 hours reduces index by 10 points (antagonistic *Ampelomyces quisqualis* effect).
[S40]

##### Sencrop

French company; https://uk.blog.sencrop.com/. Weather station network with ~50,000 stations across Europe. Disease modules via partner integration (Vitimeto, Movida for EPI-based downy mildew; separate powdery mildew module). Provides ultra-localized weather data; disease model outputs are overlaid on weather data. Does not maintain its own disease model — relies on EPI-derived algorithms from partners. [S41]

---

### FRAC and Resistance Management

**Source**: FRAC Code List 2025 (https://www.frac.info/media/ljsi3qrv/frac-code-list-2025.pdf) [S43]; FRAC CAA Working Group recommendations 2024 (https://www.frac.info/media/vxijjl0d/minutes-of-the-2024-caa-meeting-recommendations-for-2024.pdf) [S44]; FRAC mode-of-action groups page (https://www.frac.info/fungicide-resistance-management/by-frac-mode-of-action-group/) [S45]; WSU FRAME Networks [S17]; South Africa IPW FRAC code list for wine grapes [S46].

#### Key FRAC Groups for Grape Mildew Management

| FRAC Code | Group Name | Mode of Action | Disease Target | Resistance Risk | Key Active Ingredients | Rotation Rules |
|-----------|-----------|---------------|---------------|----------------|----------------------|----------------|
| 3 | DMI (Demethylation Inhibitors) | SBI Class I — sterol 14α-demethylase (erg11/cyp51) | PM (primary); some DM activity | Medium; cross-resistance within triazoles against same fungus | Myclobutanil (Rally), Tebuconazole (Elite), Triflumizole (Viticure), Tetraconazole (Mettle), Flutriafol (Rhyme), Difenoconazole | Max 2 lb a.i./acre/season (some); do not use sequentially >2–3×; rotate with non-Group 3 |
| 4 | Phenylamides (Acylalanines) | RNA Polymerase I inhibitor | DM (Plasmopara); does NOT control PM | High; resistance well-known in Oomycetes; pre-bloom only | Mefenoxam (Ridomil Gold), Metalaxyl, Benalaxyl | Max 4× pre-bloom in CA; do not apply post-bloom; mix with multisite protectant; do not use >2 consecutive applications |
| 7 | SDHI (Succinate Dehydrogenase Inhibitors) | Mitochondrial complex II | PM; some DM activity (in mixtures) | Medium–High; target site mutations; monitor closely | Boscalid (Pristine, in mixture with Group 11); Fluopyram (Luna Experience, with Group 3); Penthiopyrad (Fontelis) | Max 2 sequential applications; max 2–4×/season; rotate with other groups |
| 11 | QoI (Quinone outside Inhibitors) — Strobilurins | Mitochondrial complex III (cytochrome bc1) | PM; DM; some black rot | **High; resistance widespread in E. necator globally; G143A mutation confirmed CA, VA, MI, OR, WA, NZ, Australia** | Azoxystrobin (Abound), Trifloxystrobin (Flint), Kresoxim-methyl (Sovran), Pyraclostrobin (in Pristine) | Maximum 2–4×/season (region-dependent); do not apply on full epidemic; rotate FRAC codes each spray; test for G143A resistance before use in affected regions |
| 13 | Quinolines | Aza-naphthalene (quinoline mechanism — signal transduction) | PM only | Medium; cross-resistance with E. necator confirmed; not Blumeria | Quinoxyfen (Quintec) | Max 33 fl oz/acre/season; alternate with other groups; 2-application max recommended |
| 40 | CAA (Carboxylic Acid Amides) | Cellulose synthase (phospholipid biosynthesis, cell wall deposition) | DM (Plasmopara) ONLY — not PM | Medium; **CAA resistance confirmed in P. viticola across European vineyards; cross-resistance to all CAA fungicides** | Dimethomorph (Forum — non-renewed EU 2025), Mandipropamid (Revus), Iprovalicarb, Benthiavalicarb, Valifenalate | Max 4 CAA sprays/season (3 in high-resistance areas); max 50% of total DM applications; apply preventively; always in mixture with multisite (e.g., copper, mancozeb where authorized); max 2 consecutive |
| 43 (OSBPI) | Fluopicolide class | Spectrin-like protein delocalization | DM (Plasmopara) | Medium; resistance isolates detected in grapevine DM | Fluopicolide (Presidio, in Zampro with dimethomorph) | Max 2 consecutive; rotate |
| 49 | OSBPI | OxySterol Binding Protein Inhibitors | DM | Medium | Oxathiapiprolin (Zorvec) — 1×/season EU; 1–4×/season US | Strict limits; **1 application/season in EU** |
| M1 | Inorganic copper | Multi-site | DM (primary); moderate PM | Low resistance risk | Copper hydroxide, copper oxychloride, Bordeaux mixture | EU: max 4 kg Cu/ha/year (28 kg/7 years); France: 19 Cu-based products withdrawn Jan 2026 (ANSES); organic standard; use as protectant |
| M2 | Elemental sulfur | Multi-site (oxidation/reduction) | PM only | Low resistance risk | Sulfur (wettable, micronized, flowable) | Do not apply within 2 weeks of oil; PHI varies (see table); primary backbone for PM management |
| U6 | Unknown | Unknown | PM | Low | Cyflufenamid (Torino) | Max 2×/season; do not use under DM pressure (no efficacy) |
| U8 | Unknown | Unknown | PM | Low | Metrafenone (Vivando) | Max 46.2 fl oz/acre/season |

#### Resistance Status Summary (2025–2026)

- **E. necator — FRAC 11 (QoI) resistance**: Widespread globally including California, Washington, Oregon, Virginia, Michigan, New Zealand (Marlborough), Australia. G143A point mutation in cytochrome b gene. In high-resistance regions, QoI fungicides should be avoided or limited to 0–2 applications outside critical windows.
- **E. necator — FRAC 3 (DMI) resistance**: Documented in Virginia, North Carolina, Oregon, Michigan; moderate level globally. Do not use as sole rotation partner to QoI.
- **P. viticola — FRAC 4 (Phenylamide) resistance**: High risk; well-documented in European Oomycete populations. Use only in mixtures.
- **P. viticola — FRAC 40 (CAA) resistance**: Confirmed across Europe (France, Germany, Italy, Spain). Cross-resistance to all CAA fungicides within the group. Maximum 3–4 applications/season in mixtures with multisite.
- **P. viticola — FRAC 43 (Fluopicolide) resistance**: First confirmed in French and European populations 2021; further detections 2024.
- **General principle**: Alternate FRAC codes with each spray. Never repeat same code consecutively. Prioritize multisite "M" products (copper, sulfur) as the backbone of any resistant variety or post-resistance program.

---

### PHI / REI Reference Tables (by Region)

#### California (UC IPM / California DPR)

**Source**: UC IPM Grape Powdery Mildew Guidelines [S1] with full PHI/REI table.

| Active Ingredient (Example Trade Name) | FRAC Code | Target | PHI (days) | REI (hours) | Notes |
|----------------------------------------|-----------|--------|-----------|-------------|-------|
| Tebuconazole (Elite 45WP) | 3 | PM | 14 | 12 | Max 2 lb product/acre/season |
| Triflumizole (Viticure) | 3 | PM | 7 | 12 | Max 32 fl oz/acre/season |
| Myclobutanil (Rally 40WSP) | 3 | PM | 14 | 24 | Max 1.5 lb/acre/season |
| Tetraconazole (Mettle 125ME) | 3 | PM | 14 | 12 | Max 10 fl oz/acre/season |
| Flutriafol (Rhyme) | 3 | PM | 14 | 12 | REI 5 days for girdling/turning |
| Azoxystrobin (Abound) | 11 | PM/DM | 14 | 4 | Ground equipment only; max 92.3 fl oz/season |
| Trifloxystrobin (Flint) | 11 | PM/DM | 14 | 12 | Not on Concord; max 24 oz/season |
| Kresoxim-methyl (Sovran) | 11 | PM/DM | 14 | 12 | Max 1.6 lb/acre/season |
| Quinoxyfen (Quintec) | 13 | PM | See label | 12 | Max 33 fl oz/season |
| Metrafenone (Vivando) | U8 | PM | 14 | 12 | Max 46.2 fl oz/season |
| Cyflufenamid (Torino) | U6 | PM | 3 | 4 | Max 2×/year; max 0.044 lb a.i./season |
| Fluopyram + Tebuconazole (Luna Experience) | 7+3 | PM | 14 | 12 | Wine grapes only; REI 5 days cane tying/girdling |
| Difenoconazole + Cyprodinil (Inspire Super) | 3+9 | PM | 14 | 12 | Max 80 fl oz/season |
| Difenoconazole + Azoxystrobin (Quadris Top) | 3+11 | PM/DM | 14 | 12 | Max 56 fl oz/season |
| Pyraclostrobin + Boscalid (Pristine) | 11+7 | PM/DM | 14 | 12 | Not on Concord/Worden/Fredonia/Niagara |
| Sulfur (various) | M2 | PM | See label | See label | County 3-day REI applies in some counties; no oil within 2 weeks |
| Bacillus pumilis (Sonata) | 44 | PM | 0 | 4 | Certified organic acceptable |
| Bacillus subtilis (Serenade Max) | 44 | PM | 0 | 4 | Certified organic acceptable |
| Narrow range oil (JMS Stylet Oil) | NC | PM | 0 | 4 | No oil within 2 weeks of sulfur |
| Potassium bicarbonate (Kaligreen, MilStop) | NC | PM | 1 / 0 | 4 / 1 | Do not combine with sulfur |
| Mefenoxam + copper hydroxide (Ridomil Gold Copper) | 4+M1 | DM | 42 | 48 | Pre-bloom only; max 4× |
| Azoxystrobin (Abound) | 11 | DM | 14 | 4 | Begin at budbreak |

**California DPR product database**: https://apps.cdpr.ca.gov/docs/label/labelque.cfm — searchable by active ingredient, crop, pest.

PHI/REI reporting: Growers must file monthly Pesticide Use Reports (PURs) with county agricultural commissioner by the 10th of the following month; includes EPA registration number, site code, amount, and application method. [S47]

#### EU (European Union Pesticides Database)

**Source**: European Commission Food Safety / EU Pesticides Database. [S48]

- URL: https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en
- **Key regulatory changes 2021–2026**:
  - Mancozeb (FRAC M3): Withdrawn EU-wide since 2021 (reprotoxic).
  - Dimethomorph (FRAC 40): Non-renewed by Commission Implementing Regulation (EU) 2024/1207; grace period expired 20 May 2025.
  - Meptyldinocap: EU withdrawal decided 2024.
  - **Copper**: Approved until mid-2029 at max 28 kg/ha per 7 years (4 kg/ha/year average); France: ANSES withdrew 19 Cu-based products July 2025.
  - Fluopicolide (FRAC 43): Under review.
  - SDHI (fluopyram, boscalid), QoI (pyraclostrobin, azoxystrobin), triazoles (tebuconazole, difenoconazole) approval expiry dates 2026–2028 — under re-evaluation.
- MRL (Maximum Residue Level) data available per active substance/commodity via database.
- PHI for EU uses: embedded in national product labels and EU registration; vary by country and product.

**Key PHI examples from EU registrations** (illustrative):
| Active Ingredient | Use | PHI (days) | Notes |
|---|---|---|---|
| Dimethomorph (FRAC 40) | DM, grapes, USA (import tolerance) | 14 | Non-renewed in EU; valid for US imports |
| Copper-based (various) | DM, grapes, organic | 3–30 | Varies by formulation; max 4 kg Cu/ha/year |
| Fosetyl-Al (FRAC 33) | DM, grapes | 28–35 (varies) | Systemic; low PHI in some registrations |
| Sulfur (M2) | PM, grapes | 5–7 (varies) | Low PHI; heat/burn risk at >35°C |

#### Argentina (SENASA)

**Source**: Argentina SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria). [S49]
- URL: https://www.argentina.gob.ar/senasa
- SENASA maintains the national registry of authorized plant protection products.
- Key registered active substances for *Plasmopara viticola* (mildiou) in Argentina include: azoxystrobin, benalaxyl, bentiavalicarb-isopropil, ciazofamida, cimoxanilo, famoxadona, fluopicolida, folpet, fosetil-Al, hidróxido cúprico, mancozeb (note: not EU-withdrawn in Argentina), maneb, metalaxil, metiram, oxicloruro de cobre, oxido cuproso, piraclostrobin, sulfato cuprocalcico, sulfato tribasico de cobre. [S50]
- Key registered active substances for *Uncinula necator* / *Erysiphe necator* (oídio): azufre (sulfur), myclobutanil, tebuconazole, trifloxystrobin, kresoxim-methyl, bupirimate, proquinazid, metrafenone.
- PHI values follow national product labels; not standardized to EU or US intervals.
- **ISCAMEN** (Irrigated Areas Pest and Disease Control Institute, Mendoza) provides regional phytosanitary advisory.

---

## Datasets & Live Resources

| Resource | Type | Update Frequency | Geographic Scope | URL |
|----------|------|-----------------|------------------|-----|
| NEWA Grape Disease Models | Web DSS (free) | Daily | US Northeast (NY, PA, MI, MD, etc.) | https://newa.cornell.edu/ |
| UC IPM Grape Disease Guidelines | Web guidelines | Annual | California | https://ipm.ucanr.edu/agriculture/grape/ |
| BSV Vigne Bourgogne | Weekly bulletin (PDF) | Weekly | Bourgogne-Franche-Comté (France) | https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/ |
| BSV Vigne Bordeaux/Aquitaine | Weekly bulletin | Weekly | Bordeaux/Nouvelle-Aquitaine | DRAAF regional portal |
| IFV / Décitrait | Web DSS (subscription) | Real-time | France | https://chambres-agriculture.fr/etre-accompagne/nos-solutions-numeriques/decitrait |
| OSCAR Network Bulletins | Annual technical note | Annual | France (national) | https://www.vignevin.com/ |
| RIMpro | Cloud DSS (subscription) | Real-time + 5-day forecast | Global (user-defined stations) | https://rimpro.cloud/ |
| VitiMeteo | Web DSS (free/licensed) | Daily | Germany, Europe | https://www.vitimeteo.de/ |
| FieldClimate (Pessl Metos) | Cloud DSS (station-linked) | Real-time | Global (station network) | https://metos.global/ |
| eVineyard | Cloud + mobile DSS | Real-time | Europe (Slovenia, wider) | https://www.evineyardapp.com/ |
| Vintel (iTK) | Cloud DSS (subscription) | Real-time | France, Europe | https://vintel-itk.com/ |
| FRAC Code List 2025 | Annual PDF | Annual | Global | https://www.frac.info/media/ljsi3qrv/frac-code-list-2025.pdf |
| EU Pesticides Database | Live regulatory DB | Continuous | EU | https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en |
| California DPR Label Database | Regulatory DB | Continuous | California | https://apps.cdpr.ca.gov/docs/label/labelque.cfm |
| SENASA Argentina Product Registry | Regulatory DB | Continuous | Argentina | https://www.argentina.gob.ar/senasa |
| AWRI Disease Management | Web resources + eBulletin | Periodic | Australia | https://www.awri.com.au/industry_support/viticulture/disease_management/ |
| Cornell NY/PA Grape Pest Guide | Annual PDF | Annual | New York, Pennsylvania | https://cropandpestguides.cce.cornell.edu/ |

---

## Sources (Open Access)

[S1] UC IPM. "Powdery Mildew — Grape." UC Agriculture & Natural Resources. Updated 2017. https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/

[S2] Carroll, J., Weigle, T., Wilcox, W. "Weather-driven Grape IPM Forecast Models and Decision Aids from the Network for Environmental and Weather Awareness (NEWA)." Cornell University eCommons. https://ecommons.cornell.edu/server/api/core/bitstreams/2647550e-a854-4187-a49b-fea7f389dd4e/content

[S3] CRA BFC. "BSV VIGNE N°02 du 08/04/2026." DRAAF Bourgogne-Franche-Comté. 2026. https://draaf.bourgogne-franche-comte.agriculture.gouv.fr/IMG/pdf/bsv2026-vigne_02_du_08-04-2026.pdf

[S4] Chambres d'Agriculture France. "Décitrait — Outil d'Aide à la Décision viticole." https://chambres-agriculture.fr/etre-accompagne/nos-solutions-numeriques/decitrait

[S5] Maddalena, G. et al. (2023). "Disease Forecasting for the Rational Management of Grapevine Mildews: EPI Model in Organic Vineyards in Chianti." Università degli Studi di Milano / Air.unimi. https://air.unimi.it/retrieve/74b17617-7d61-449d-9a4e-d1426f245230/Maddalena%202023,%20EPI%20model%20Chianti.pdf; also reviewed in Morales et al. (2023) *Microorganisms* 11(1), doi:10.3390/microorganisms11010087. https://pmc.ncbi.nlm.nih.gov/articles/PMC9866057/

[S6] RIMpro. "Downy mildew (Plasmopara)" and "Grape powdery mildew (Uncinula necator)." RIMpro cloud platform, 2024–2025. https://rimpro.cloud/platform/downy-mildew-plasmopara/ and https://rimpro.cloud/platform/grape-powdery-mildew-uncinula-necator/

[S7] Gessler, C. et al. (2020). "Together for the Better: Improvement of a Model Based Strategy for Downy Mildew Management in Viticulture Using a Participatory Research Approach." *Plants* 9(7):836. DOI: 10.3390/plants9070836. https://pmc.ncbi.nlm.nih.gov/articles/PMC7355483/

[S8] WSU FRAME Networks. "Grower Information — Annual FRAC Code List Updates." https://framenetworks.wsu.edu/grower-information/

[S9] AWRI / Wine Australia. "Managing Powdery Mildew." Wine Australia (GWRDC/AWRI). https://www.wineaustralia.com/getmedia/c1d730e3-7a9a-4d43-b254-d271f1f24d2c/201003-Managing-powdery-mildew; also https://www.awri.com.au/wp-content/uploads/powdery_mildew_manage.pdf

[S10] Arias, M.F. "Oídio de la vid — Uncinula necator." INTA EEA Mendoza, Serie Técnica N°48. Repositorio Digital INTA. https://repositorio.inta.gob.ar/bitstream/handle/20.500.12123/13114/INTA_CRMendozaSanJuan_EEAMendoza_Arias,%20MF_O%C3%ADdio%20de%20la%20vid%20Uncinula%20necator.pdf

[S11] UC IPM. Full PHI/REI table embedded in Grape Powdery Mildew Guidelines. https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/; EU: https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en; Argentina: https://www.argentina.gob.ar/senasa

[S12] UC IPM. "Downy Mildew — Grape." UC Agriculture & Natural Resources. Updated 2017. https://ipm.ucanr.edu/agriculture/grape/downy-mildew/

[S13] Cornell University Cooperative Extension. "2025 New York and Pennsylvania Pest Management Guidelines for Grapes." Preview: https://cropandpestguides.cce.cornell.edu/Preview/2025/2025_Grape_Guide_Preview.pdf

[S14] OSU Extension. "How to deal with a vineyard powdery mildew outbreak." Oregon State University. 2019-08-06. https://extension.oregonstate.edu/crop-production/wine-grapes/how-deal-vineyard-powdery-mildew-outbreak

[S15] WSU HortSense. "Grape: Powdery Mildew." Washington State University. Updated 2025. https://hortsense.cahnrs.wsu.edu/fact-sheet/grape-powdery-mildew/

[S16] Washington Wine Commission / WSU (Moyer, M.). "Basic Training for Combating Mildew." Washington Wine Commission. https://www.washingtonwine.org/wp-content/uploads/2021/05/PM-PWV-2.pdf

[S17] WSU FRAME Networks. "Grower Information." https://framenetworks.wsu.edu/grower-information/

[S18] Hed, B. "Mid to late season control of downy and powdery mildew and bunch and sour rots in 2020." Penn State Extension Wine & Grapes U. 2020-06-24. https://psuwineandgrapes.wordpress.com/2020/06/24/mid-to-late-season-control-of-downy-and-powdery-mildew-and-bunch-and-sour-rots-in-2020/

[S19] Virginia Tech. "Powdery mildew of grapes." Alson H. Smith Jr. AREC, VT. https://www.arec.vaes.vt.edu/content/dam/arec_vaes_vt_edu/alson-h-smith/grapes/pathology/extension/factsheets/powdery_mildew.pdf

[S20] Virginia Tech. "Online Guide to Grapevine Diseases — Fungicides." VT Alson H. Smith Jr. AREC. https://www.arec.vaes.vt.edu/content/dam/arec_vaes_vt_edu/alson-h-smith/grapes/pathology/extension/fungicide/fungicides.pdf

[S21] Virginia Tech Extension. "Fungicide Spray Guidelines for Non-bearing Vineyards." VT Pub. SPES-315. 2021. https://www.pubs.ext.vt.edu/SPES/SPES-315/SPES-315.html

[S22] Delière, L., Cartolaro, P., Léger, B., Naud, O. (2015). "Field evaluation of an expertise-based formal decision system for fungicide management of grapevine downy and powdery mildews." *Pest Management Science* 71(3):339–349. DOI: 10.1002/ps.3917. https://sante-agroecologie-vignoble.bordeaux-aquitaine.hub.inrae.fr/media/publications/acl/2015-acl/2015-acl-deliere-pms

[S23] Delière, L. et al. (2020). "Forecasting severe grape downy mildew attacks using machine learning." *PLoS ONE* 15(3): e0230136. DOI: 10.1371/journal.pone.0230136. https://pmc.ncbi.nlm.nih.gov/articles/PMC7067461/

[S24] INRAE/IFV. (2024). "A participatory approach to involve winegrowers in pesticide use reduction." HAL INRAE hal-04474605v1. https://hal.inrae.fr/hal-04474605v1/document

[S25] IFV. "Oïdium — Fiche Pratique." Institut Français de la Vigne et du Vin. 2022. https://www.vignevin.com/publications/fiches-pratiques/oidium/

[S26] IFV / UGVC. "Note technique nationale résistances 2025 sur les maladies de la vigne." Published 2025-01-22. https://ugvc.fr/2025/01/22/ifv-note-technique-2025-sur-les-resistances-aux-maladies-de-la-vigne/; Full 2026 note embedded in BSV bulletins.

[S27] IFV. "Publication de la note technique nationale OSCAR 2026." 2026-03-12. https://www.vignevin.com/article/publication-de-la-note-technique-nationale-oscar-2026/

[S28] Chambres d'Agriculture Occitanie. "BSV Viticulture Cahors N°6 — 06/05/2025." https://occitanie.chambres-agriculture.fr/fileadmin/user_upload/265_chambre_dagriculture_-_occitanie/BSV/Midi-Pyrenees/Viticulture_Cahors/2025/BSV_VITI_MP_Cahors_N6_06052025.pdf

[S29] ICVV. "Oidio Detection — a project for sustainable application of phytosanitary treatments." Instituto de Ciencias de la Vid y del Vino. 2018. http://www.icvv.es/english/oidio-detection-project-sustainable-application-phytosanitary-treatments

[S30] ICVV / IOBC. "Abstracts: Integrated Protection in Viticulture." ICVV La Rioja. https://www.icvv.es/english/sites/default/files/archivos/abstracts_book_integrated_protection_in_viticulture.pdf

[S31] INTA Argentina. "Estrategias para el manejo de enfermedades en el cultivo de vid." Argentina.gob.ar. 2024-12-19. https://www.argentina.gob.ar/noticias/estrategias-para-el-manejo-de-enfermedades-en-el-cultivo-de-vid

[S32] AWRI. "A wet season update — managing fungal diseases between veraison and harvest." AWRI eBulletin. 2024-01-11. https://www.awri.com.au/information_services/ebulletin/2024/01/11/a-wet-season-update-managing-fungal-diseases-between-veraison-and-harvest/

[S33] ASVO. "Overview of powdery mildew and chemical control." ASVO Proceedings 335. https://www.asvo.com.au/sites/default/files/uploaded-content/website-content/asvo_proceedings_335_overview_of_powdery_mildew_and_chemical_control.pdf

[S34] Barossa Wine / GWRDC. "Managing Powdery Mildew — Q&A." GWRDC Factsheet. 2010. https://www.barossawine.com/wp-content/uploads/2020/10/GWRDC_Powdery-Mildew_QA.pdf

[S35] Agnew, R. et al. (2004). "Effects of spraying strategies based on monitored disease risk on grape disease control and fungicide usage in Marlborough." *NZ Plant Protection Society*. https://nzpps.org/_journal/index.php/nzpp/article/download/6937/6765/9139

[S36] Bragato Research Institute (BRI). "Rapid detection of fungicide-resistance in grapevine powdery mildew." 2026-01-27. https://bri.co.nz/2026/01/27/rapid-detection-of-fungicide/

[S37] Vintel / iTK. "The Solution." Vintel.itk.com. 2025. https://vintel-itk.com/en/the-software/

[S38] Sectormentor / Vidacycle. "Sectormentor for Vines Overview." Napa Green presentation PDF. http://napagreen.org/wp-content/uploads/2025/11/PUBLIC_-Sectormentor-for-Vines-Overview-Vidacycle.pdf; App: https://vines.vidacycle.com/

[S39] eVineyard. "Decision support system for integrated pest management in the vineyard." eVineyard blog. 2018. https://www.evineyardapp.com/blog/2018/07/17/decision-support-system-for-integrated-pest-management-in-the-vineyard/; also https://www.evineyardapp.com/blog/2022/07/29/how-to-decide-when-to-apply-fungicides-in-vineyards/

[S40] Pessl Instruments / METOS. "Disease Models — Grapevine." METOS platform. 2025. https://metos.global/en/disease-models-grapevine/; also disease models brochure: https://metos.global/wp-content/uploads/2022/07/disease-models-brochure-EN.pdf

[S41] Sencrop. "How to combat powdery mildew in vines?" Sencrop Blog. 2025-04-28. https://uk.blog.sencrop.com/how-to-combat-powdery-mildew-in-vines/

[S42] Corteva Agriscience. "Guía Tratamientos Viña 2021." https://www.corteva.com/content/dam/dpagco/corteva/eu/es/es/files/catalogos-d%C3%ADpticos/DOC-GuiaTratamientosVina2021_Corteva_EU_ES.pdf

[S43] FRAC. "FRAC Code List 2025." Fungicide Resistance Action Committee. 2025. https://www.frac.info/media/ljsi3qrv/frac-code-list-2025.pdf

[S44] FRAC CAA Working Group. "Minutes of the 2024 CAA Meeting and Recommendations." FRAC. https://www.frac.info/media/vxijjl0d/minutes-of-the-2024-caa-meeting-recommendations-for-2024.pdf

[S45] FRAC. "By FRAC Mode of Action Group." https://www.frac.info/fungicide-resistance-management/by-frac-mode-of-action-group/

[S46] Integrated Production of Wine (IPW) South Africa. "FRAC Code List for Fungicides IP Coded for Use on Wine Grapes." https://www.ipw.co.za/content/ip_codings/frac_codes.pdf

[S47] VitiScribe. "California DPR Pesticide Reporting for Vineyards." 2025. https://vitiscribe.com/california-dpr-reporting/; CDPR label database: https://apps.cdpr.ca.gov/docs/registration/nod/public_reports/PRO-2500950.pdf

[S48] European Commission. "EU Pesticides Database." DG SANTE Food Safety. https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en

[S49] SENASA Argentina. National Plant Protection Product Registry. https://www.argentina.gob.ar/senasa

[S50] Vitivinicultura.net / ICVV. Chemical control summary for mildiou and oídio in Spain. https://www.vitivinicultura.net/mildiu-de-la-vid-enfermedades-vina.html (representative of Spanish/Argentine registered substances); Argentina.gob.ar INTA disease management: https://www.argentina.gob.ar/noticias/estrategias-para-el-manejo-de-enfermedades-en-el-cultivo-de-vid

---

## Sources (Paywalled — Retrieve via University Credentials)

[P1] Puelles, M., Arbizu, J., et al. (2024). "Predictive models for grape downy mildew (*Plasmopara viticola*) as a decision support system in Mediterranean conditions." *Crop Protection* 175:106484. DOI: 10.1016/j.cropro.2023.106484. Available at ScienceDirect (subscription): https://www.sciencedirect.com/science/article/abs/pii/S0261219423002739

[P2] Delière, L., Cartolaro, P., Léger, B., Naud, O. (2015). Full peer-reviewed paper in *Pest Management Science* (Wiley). DOI: 10.1002/ps.3917. Preprint/INRAE copy is open access at [S22].

[P3] Caffi, T., Rossi, V., Bianchedi, P.L. et al. (2021). "A Weather-Driven Model for Predicting Infections of Grapevines by *Plasmopara viticola*." *Frontiers in Plant Science* 12:636607. DOI: 10.3389/fpls.2021.636607. (Open access via Frontiers.) https://pmc.ncbi.nlm.nih.gov/articles/PMC7985336/

[P4] Morales, M. et al. (2023). "Current Trends and Perspectives on Predictive Models for Mildew Diseases in Vineyard." *Microorganisms* 11(1):87. DOI: 10.3390/microorganisms11010087. (Open access via MDPI.) https://pmc.ncbi.nlm.nih.gov/articles/PMC9866057/
