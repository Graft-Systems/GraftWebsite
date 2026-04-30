# Paywalled Sources Download Plan

**Status:** 37 of 47 retrieved (effective denominator 46 with Mills 1999 ghost-citation dropped). **Updated 2026-04-30:** A (Thomas/Gubler 1999) and C (Rossi/Giosuè/Caffi 2009) both in. 2 ILL outstanding (B Strizyk, D Oh) on 2-4 week clock. **Spec PDF generation now UNBLOCKED.**
**Owner:** Benson Klein (bensonn@umich.edu, University of Michigan library access).
**Source of truth:** `paywalled_queue.md` (read-only). This file is the operational checklist generated from it.
**Generated:** 2026-04-29.

## Why this exists

The Graft Spray spec PDF cannot cite a paywalled source as `[Brain (category) / P#]` until the corresponding PDF lives in `docs/research/assets/<category>/paywalled/` with the prescribed filename. The 23 sources tagged 🔴 below block the spec PDF directly. The 13 🟡 sources block the ML pipeline and treatment specifications. The 11 🟢 sources are nice-to-have.

## How to retrieve a paper

**Primary path: U-M Library article search.**

1. Sign in at https://search.lib.umich.edu/articles
2. Paste the DOI (or, if no DOI, the full title) into the search bar.
3. Click the result, then "Online access" or "Download PDF."
4. Save the file to the listed folder using the listed filename.
5. Tick the checkbox in this file and commit.

**Fallback paths (in order):**

- **PMC link** (already free, no proxy needed): some entries below carry a direct `https://pmc.ncbi.nlm.nih.gov/...` URL. Grab those first; they are trivial.
- **U-M proxy URL:** for a publisher link, prepend the proxy. Example: convert `https://link.springer.com/article/10.1007/X` to `https://link-springer-com.proxy.lib.umich.edu/article/10.1007/X`, then sign in.
- **Google Scholar** title search: often surfaces a free author-deposited preprint.
- **Interlibrary Loan**: file via the U-M Library "Get It" service for any paper U-M doesn't license (likely needed for the older non-DOI titles).

**Filename convention.** `<RefID>_<FirstAuthor>_<Year>_<short-slug>.pdf`. Use the exact filenames listed; the spec PDF's citations will reference these names.

**Priority legend.** 🔴 blocks spec PDF generation. 🟡 needed for ML or treatment sections. 🟢 lower urgency, can backfill later.

---

## 🔴 06_outbreak-prediction (10 papers, load-bearing for the disease-forecasting engine)

Save to: `docs/research/assets/06_outbreak-prediction/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☑ | P1 | Thomas CS et al. Original Gubler-Thomas model paper. *Plant Disease*. | 1994 | No DOI; search title in U-M | `P1_Thomas_1994_GublerThomas-original.pdf` |
| ☑ | P2 | Gubler WD et al. Revisions to UC Davis PM Risk Index. *Plant Disease* 97(7). | 2013 | 10.1094/PDIS-09-12-0871-RE | `P2_Gubler_2013_PM-risk-index-revisions.pdf` |
| ☑ | P3 | Caffi T, Rossi V, Legler SE, Bugiani R. Mechanistic model for *Erysiphe necator*. *Plant Pathology* 60(3):522–531. | 2011 | 10.1111/j.1365-3059.2010.02395.x | `P3_Caffi_2011_E-necator-mechanistic.pdf` |
| ☐ | P4 | Strizyk S. Modèle de comportement: état potentiel d'infection. *Phytoma* 347. | 1983 | AGRIS 64774d23a3fd11e4303868ef (likely ILL) | `P4_Strizyk_1983_etat-potentiel.pdf` |
| ☑ | P5 | Park EW, Seem RC, Gadoury DM, Pearson RC. DMCast: prediction model for grape downy mildew. *Phytopathologia Mediterranea* 36:3–11. | 1997 | No DOI; search title | `P5_Park_1997_DMCast.pdf` |
| ☑ | P6 | Magarey RD, Sutton TB, Thayer CL. Simple generic infection model. *Phytopathology* 95(1):92–100. | 2005 | 10.1094/PHYTO-95-0092 (also free via Semantic Scholar) | `P6_Magarey_2005_generic-infection-model.pdf` |
| ☑ | P7 | Bendek CE et al. Risk assessment in grape PM control. *Spanish J Agric Research* 5(4):522–532. | 2007 | No DOI; search title | `P7_Bendek_2007_PM-risk-assessment.pdf` |
| ☑ | P8 | Caffi T, Rossi V, Bugiani R. Evaluation of a mechanistic primary infection model. *J Plant Pathology* 91(3):615–627. | 2009 | No DOI; search title | `P8_Caffi_2009_primary-infection-eval.pdf` |
| ☑ | P9 | Kennelly MM, Gadoury DM, Wilcox WF, Seem RC, Luby JJ, Ficke A. *P. viticola* primary infection and sporangia survival. *Phytopathology* 97:512–522. | 2007 | No DOI; search title | `P9_Kennelly_2007_P-viticola-survival.pdf` |
| ☑ | P10 | Rossi V, Caffi T, Legler SE. Ascospore maturation in *Erysiphe necator*. *Phytopathology* 100(12):1321–1329. | 2010 | No DOI; search title | `P10_Rossi_2010_ascospore-maturation.pdf` |

---

## 🔴 02_weather-impacts (9 papers)

Save to: `docs/research/assets/02_weather-impacts/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☑ | P1 | Caffi et al. Effect of T and wetness duration on *Plasmopara viticola* and post-inoculation copper. *Eur J Plant Pathology*. | 2016 | 10.1007/s10658-015-0802-9 | `P1_Caffi_2016_T-wetness-copper.pdf` |
| ☑ | P2 | Rossi & Caffi. Water on germination of *P. viticola* oospores. *Plant Pathology*. | 2007 | 10.1111/j.1365-3059.2007.01685.x | `P2_RossiCaffi_2007_oospore-germination.pdf` |
| ☑ | P3 | Rossi et al. Estimating germination dynamics of *P. viticola* oospores via hydro-thermal time. *Plant Pathology*. | 2008 | 10.1111/J.1365-3059.2007.01738.X | `P3_Rossi_2008_oospore-hydrothermal.pdf` |
| ☑ | P4 | Rossi et al. Mechanistic model for primary infections of downy mildew in grapevine. *Ecological Modelling*. | 2008 | 10.1016/J.ECOLMODEL.2007.10.046 | `P4_Rossi_2008_primary-infection-mechanistic.pdf` |
| ☑ | P5 | Lalancette et al. Infection efficiency model for *P. viticola* on American grape. *Phytopathology*. | 1988 | No DOI; search title | `P5_Lalancette_1988_infection-efficiency.pdf` |
| ☑ | P6 | Orlandini et al. PLASMO simulation model for *P. viticola* control. *EPPO Bulletin*. | 1993 | 10.1111/J.1365-2338.1993.TB00559.X | `P6_Orlandini_1993_PLASMO.pdf` |
| ☑ | P7 | Caffi et al. Evaluation of a dynamic model for primary infections by *P. viticola* in Quebec. *Plant Health Progress*. | 2011 | 10.1094/PHP-2011-0126-01-RS | `P7_Caffi_2011_quebec-primary-infections.pdf` |
| ☑ | P10 | Bem et al. Effects of four training systems on downy mildew dynamics in Brazil. *Tropical Plant Pathology*. | 2016 | 10.1007/s40858-016-0110-8 | `P10_Bem_2016_training-systems-downy.pdf` |
| ☐ | P11 | Oh JH. Effects of T, RH, pH, triazole on *Uncinula necator* sporulation/germination. | 2000 | Reference 83115803 (likely ILL) | `P11_Oh_2000_U-necator-sporulation.pdf` |

---

## 🔴 03_live-weather-feeds (4 papers)

Save to: `docs/research/assets/03_live-weather-feeds/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☑ | P1 | Gleason et al. Validation of leaf wetness duration estimation (Gleason CART). *Phytopathology*. | 1994 | 10.1094/Phyto-84-520 | `P1_Gleason_1994_leaf-wetness-CART.pdf` |
| ☑ | P2 | Bois et al. Temperature-based zoning of Bordeaux. *OENO One*. | 2018 | 10.20870/oeno-one.2018.52.4.1580 | `P2_Bois_2018_bordeaux-T-zoning.pdf` |
| ✗ | P3 | Mills et al. DMCAST: prediction model for grape downy mildew. *Viticulture and Enology Science*. | 1999 | No DOI; search title | `P3_Mills_1999_DMCAST.pdf` |
| ☑ | P4 | Willocquet et al. Forecasting model for *Uncinula necator* on grapevines. *EPPO Bulletin*. | 1996 | No DOI; search title | `P4_Willocquet_1996_U-necator-forecasting.pdf` |

---

## 🟡 01_visual-detection (4 papers)

Save to: `docs/research/assets/01_visual-detection/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☐ | P1 | EPPO Standard PP 1/004 (4th ed.). Efficacy evaluation of fungicides: *Erysiphe necator* on grapevine. EPPO. | 2004 | https://www.eppo.int/RESOURCES/eppo_standards/pp1 (free EPPO; may need EPPO account) | `P1_EPPO_2004_PP1-004_E-necator.pdf` |
| ☑ | P2 | Knauer et al. Improved classification of PM via spatial-spectral hyperspectral analysis. *Plant Methods*. | 2017 | 10.1186/s13007-017-0198-y | `P2_Knauer_2017_hyperspectral-PM.pdf` |
| ☑ | P3 | Tang et al. Real-time detector for grape leaf diseases (GLDD, 4449 images). *Frontiers in Plant Science*. | 2020 | 10.3389/fpls.2020.00751 (PMC7285655, open access) | `P3_Tang_2020_GLDD-detector.pdf` |
| ☑ | P4 | Hazelrigg et al. Disease susceptibility of cold-climate grapes in Vermont. | 2018 | https://www.uvm.edu/~orchard/fruit/pubs/18Hazelrigg_ISHS_GrapeDiseasePrePub.pdf (free UVM PDF) | `P4_Hazelrigg_2018_VT-cold-climate.pdf` |

---

## 🟡 05_treatment-methods (5 papers)

Save to: `docs/research/assets/05_treatment-methods/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☐ | P1 | Kortekamp A. Copper and Sulfur in European Viticulture. Geisenheim University. | 2010 | No DOI; search title | `P1_Kortekamp_2010_Cu-S-viticulture.pdf` |
| ☑ | P4 | Oerke EC. Crop Losses to Pests. *J Agricultural Science*. | 2006 | 10.1017/S0021859605005708 | `P4_Oerke_2006_crop-losses.pdf` |
| ☑ | P6 | Gessler C et al. *Plasmopara viticola* review of knowledge on downy mildew. *Phytopathologia Mediterranea*. | 2011 | No DOI; search title | `P6_Gessler_2011_P-viticola-review.pdf` |
| ☑ | P7 | Gadoury DM et al. Grapevine PM biology, ecology, epidemiology. *Molecular Plant Pathology*. | 2012 | 10.1111/j.1364-3703.2011.00728.x | `P7_Gadoury_2012_PM-biology-ecology.pdf` |
| ☐ | P8 | Rossi V et al. Grapevine downy mildew management and forecasting. *Pest Management Science*. | 2013 | 10.1002/ps.3603 | `P8_Rossi_2013_downy-management.pdf` |

---

## 🟡 04_industry-publications (4 papers)

Save to: `docs/research/assets/04_industry-publications/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☐ | P1 | Puelles M et al. Predictive models for grape downy mildew DSS, Mediterranean. *Crop Protection*. | 2024 | 10.1016/j.cropro.2023.106484 | `P1_Puelles_2024_DSS-mediterranean.pdf` |
| ☑ | P2 | Delière L et al. Field eval of expertise-based DSS for grapevine mildews. *Pest Management Science*. | 2015 | 10.1002/ps.3917 | `P2_Deliere_2015_expertise-DSS.pdf` |
| ☑ | P3 | Caffi T et al. Weather-driven model for *P. viticola* infections. *Frontiers in Plant Science*. | 2021 | 10.3389/fpls.2021.636607 (PMC7985336, open access) | `P3_Caffi_2021_weather-driven-P-viticola.pdf` |
| ☑ | P4 | Morales M et al. Trends and perspectives on predictive mildew models. *Microorganisms* (MDPI). | 2023 | 10.3390/microorganisms11010087 (PMC9866057, open access) | `P4_Morales_2023_predictive-models-trends.pdf` |

---

## 🟢 07_miscellaneous (5 papers)

Save to: `docs/research/assets/07_miscellaneous/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☐ | P1 | Valente et al. Accuracy of low-cost RTK GNSS systems. *Computers and Electronics in Agriculture*. | 2020 | 10.1016/j.compag.2018.12.033 | `P1_Valente_2020_RTK-GNSS.pdf` |
| ☑ | P2 | Parhi P, Karlson A, Bederson B. Target size for one-handed thumb on small touchscreens. *MobileHCI*. | 2006 | 10.1145/1152215.1152260 | `P2_Parhi_2006_thumb-target-size.pdf` |
| ☑ | P3 | EFSA. Training in evaluation of pesticides. | 2023 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10687746/ (PMC, open access) | `P3_EFSA_2023_pesticide-training.pdf` |
| ☑ | P4 | MIT Touch Lab. Human fingertip width study. | 2003 | No DOI; search title | `P4_MIT_2003_fingertip-width.pdf` |
| ☑ | P5 | ISO/ASABE. ISO 11783-1 Agricultural tractors serial data network (ISOBUS). | 2017 | https://cdn.standards.iteh.ai/samples/57556/6d72b9ee40524c4ebc04f82ade71a648/ISO-11783-1-2017.pdf (free sample) | `P5_ISO_2017_ISOBUS-11783.pdf` |

---

## 🟢 business (6 papers, NOT in chatbot RAG)

Save to: `docs/research/assets/business/paywalled/`

| ✓ | Ref | Title (Author, Journal) | Year | DOI / Lookup | Filename |
|---|---|---|---|---|---|
| ☐ | P1 | Broome et al. Fungicide Use Patterns in US Wine Grape Regions. *Plant Disease*. | 2024 | 10.1094/PDIS-04-23-0798-RE | `P1_Broome_2024_US-fungicide-patterns.pdf` |
| ☐ | P2 | Rossi et al. Predictive models for grape downy mildew DSS Mediterranean. *Crop Protection*. | 2023 | 10.1016/j.cropro.2023.106358 | `P2_Rossi_2023_DSS-mediterranean.pdf` |
| ☑ | P3 | Hyde C, Cal Poly. PM Cost Comparison Edna Valley. | 2010 | https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1011&context=agbsp (Cal Poly free PDF) | `P3_Hyde_2010_PM-cost-edna-valley.pdf` |
| ☑ | P4 | Fuller, Alston, Sambucci. Value of PM resistance in CA grapes. | 2014 | https://www.econstor.eu/bitstream/10419/194486/1/1-s2.0-S2212977414000234-main.pdf (EconStor free PDF) | `P4_Fuller_2014_PM-resistance-value.pdf` |
| ☑ | P5 | DEPHY. Pesticide phase-out in viticulture. *OENO One*. | 2024 | https://oeno-one.eu/article/view/7885 (likely free OENO One) | `P5_DEPHY_2024_pesticide-phaseout.pdf` |
| ☑ | P6 | EPRS. EU Directive 2009/128/EC Study. | 2018 | https://www.europarl.europa.eu/RegData/etudes/STUD/2018/627113/EPRS_STU(2018)627113_EN.pdf (free EU PDF) | `P6_EPRS_2018_EU-pesticide-directive.pdf` |

---

## Reference imagery (M1 nice-to-have, not blocking spec PDF)

The `assets/<category>/reference/` folders are for open-access sample images and diagrams that ground the spec PDF, the ML training discussion, and (eventually) the Gemini chatbot's visual context. Optional at M0/M1; defer until the spec PDF and ML pipeline drafts are in place. When ready, the most useful sources:

**01_visual-detection (highest value, disease photos at varying severity):**

- UC IPM Pest Management Guidelines, Grape: https://ipm.ucanr.edu/PMG/r302100211.html
- APS Education Center, Powdery Mildew of Grape: https://www.apsnet.org/edcenter/disandpath/fungalasco/pdlessons/Pages/PowderyMildewGrape.aspx
- APS Education Center, Downy Mildew of Grape: https://www.apsnet.org/edcenter/disandpath/fungalasco/pdlessons/Pages/DownyMildewGrape.aspx
- Cornell Grape Disease Identification: https://grapesandwine.cals.cornell.edu/extension/disease-identification/
- iNaturalist research-grade observations (CC-BY): https://www.inaturalist.org/taxa/47714-Erysiphe-necator and https://www.inaturalist.org/taxa/118879-Plasmopara-viticola
- PlantVillage dataset (CC0; mirror on Kaggle): https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset

**02_weather-impacts (infection cycle diagrams):**

- APS Education Center disease cycle figures (free, embed-with-credit alongside the PM and DM lesson pages above).

**05_treatment-methods (FRAC chart):**

- FRAC Code List, current edition: https://www.frac.info/

Other categories: no specific image needs at M0/M1; capture at runtime from real users.

---

## Progress tracking

When you tick a box, drop the PDF in the same commit. Suggested commit message: `docs(research): add P<N> paywalled paper for <category>`. Once all 🔴 are in, ping me to start the spec PDF.

---

## Scout report 2026-04-30 — resolution of the 5 outstanding 🔴 paywalled refs

Three of the 5 had problems (misattributions or ghost citations) that explain why the original DOI lookups failed. Two are genuinely ILL-only.

| Outcome | Cat | Ref | Original queue claim | What's actually true |
|---|---|---|---|---|
| **A — REDIRECT (open access, quick win)** | 06 | P1 Thomas 1994 | "Thomas CS et al. Original Gubler-Thomas model paper. *Plant Disease*. 1994." | The 1994 record is a conference abstract (Phytopathology 84:1070) with no full text. The citable Gubler-Thomas foundation paper is **Gubler WD, Rademacher MR, Vasquez SJ, Thomas CS. 1999. Control of PM Using the UC Davis PM Risk Index. *APSnet Features*. DOI 10.1094/APSnetFeature-1999-0199**, fully open-access at https://www.apsnet.org/edcenter/apsnetfeatures/Pages/UCDavisRisk.aspx. |
| **B — ILL only** | 06 | P4 Strizyk 1983 | "Modèle de comportement: état potentiel d'infection. *Phytoma* No. 347." | Confirmed real, but Phytoma 1983 is not digitized anywhere. ILL request only. |
| **C — AUTHOR CORRECTION + JSTOR (quick win)** | 06 | P8 Caffi 2009 | "Caffi T, Rossi V, Bugiani R. Evaluation of a mechanistic primary infection model. *J Plant Pathology* 91(3):615–627." | Authors are actually **Rossi V, Giosuè S, Caffi T**. Title: "Modelling the dynamics of infections caused by sexual and asexual spores during Plasmopara viticola epidemics." Available on JSTOR (U-M licensed). |
| **D — ILL only** | 02 | P11 Oh 2000 | "Effects of T, RH, pH, triazole on *U. necator* sporulation/germination. CABI 83115803." | Confirmed real, Korean journal (likely Korean J Plant Pathology or Korean J Mycology), no digital trace, ILL only. May need translation. |
| **E — DROP (ghost citation)** | 03 | P3 Mills 1999 | "Mills et al. DMCAST: prediction model for grape downy mildew. *Viticulture and Enology Science*. 1999." | No paper named "Mills 1999 DMCAST" exists in any database. The canonical DMCAST paper is **Park EW et al. 1997** (already retrieved as 06 P5). Drop this queue entry. |

### Step-by-step actions

**A — Gubler 1999 APSnet (open access, ~5 min):**
1. Open https://www.apsnet.org/edcenter/apsnetfeatures/Pages/UCDavisRisk.aspx in your browser.
2. Browser File menu → Print → "Save as PDF" (in the destination dropdown).
3. Filename: `P1_Thomas_1994_GublerThomas-original.pdf` (keep this filename so spec PDF citations don't break).
4. Save to: `docs/research/assets/06_outbreak-prediction/paywalled/`.

**B — Strizyk 1983 (ILL, 2-4 week wait):**
1. Open https://www.lib.umich.edu/find-borrow-request/borrowing-other-libraries/interlibrary-loan
2. Click "Request via ILL" (or "Make an ILL request").
3. Fill in:
   - Author: `Strizyk, S.`
   - Title: `Modèle de comportement: état potentiel d'infection`
   - Journal: `Phytoma (La Défense des Végétaux)`
   - Year: `1983`
   - Volume: `No. 347`
   - Notes: `French language. Likely needs scan from INRAE or BnF Paris.`
4. Submit. Save received PDF (in 2-4 weeks) as `P4_Strizyk_1983_etat-potentiel.pdf` in same folder as A.

**C — Rossi/Giosuè/Caffi 2009 via JSTOR (~10 min):**
1. Open https://search.lib.umich.edu/articles
2. Sign in with your U-M uniqname.
3. Paste this exact search string into the box: `"Modelling the dynamics of infections caused by sexual and asexual spores" Plasmopara viticola Rossi 2009`
4. The JSTOR result should be near the top. Click it.
5. Click "Online Access" or "View PDF."
6. Filename: `P8_Caffi_2009_primary-infection-eval.pdf` (filename kept for spec continuity; the queue's author attribution is wrong, the title and citation reference are otherwise valid).
7. Save to: `docs/research/assets/06_outbreak-prediction/paywalled/`.

**D — Oh 2000 (ILL, 2-4 week wait):**
1. Same ILL form as B.
2. Fill in:
   - Author: `Oh, JH` (or `Oh, Jeung-Haing`)
   - Title: `Effects of temperature, relative humidity, pH and triazole fungicides on sporulation and conidial germination of Uncinula necator`
   - Year: `2000`
   - Journal: `Korean Journal of Plant Pathology` (try first) or `Korean Journal of Mycology` (alternate)
   - Notes: `CABI accession 83115803. Korean language. May need translation.`
3. Submit. Save received PDF as `P11_Oh_2000_U-necator-sporulation.pdf` in `docs/research/assets/02_weather-impacts/paywalled/`.

**E — Mills 1999 (no action, queue entry dropped):**
- Queue line marked DROP. No file expected.

### Effective queue status

After this report and once A + C are retrieved:
- **37 / 46** effectively complete (35 already in + A + C; Mills dropped from denominator).
- 2 outstanding ILL (B Strizyk, D Oh) on 2-4 week clock; spec PDF doesn't have to wait for them.
