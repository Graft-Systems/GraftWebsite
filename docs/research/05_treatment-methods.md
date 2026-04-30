# Powdery and Downy Mildew Treatment Methods

> **Document purpose:** Powers the product recommendation engine of the Graft Spray app — which tells winegrowers when to spray (and when not to) to prevent powdery mildew (*Erysiphe necator*) and downy mildew (*Plasmopara viticola*) spread while saving money vs. indiscriminate spraying.
>
> **Geographic priority:** Napa & Sonoma > Burgundy > Bordeaux > Mendoza > global.
>
> **Citation codes:** [S#] = open-access; [P#] = paywalled.

---

## Summary

Integrated grape disease management draws on five pillars: conventional fungicides (by FRAC group), sulfur and copper as cornerstone contact materials, biological controls, cultural practices, and emerging technologies. The recommendation engine must balance efficacy, resistance risk, regional registration status, pre-harvest intervals (PHI), organic compatibility, and cost. Key inflection points for 2024–2025:

- **Mancozeb (FRAC M03)** is facing proposed US EPA cancellation on grapes due to worker-safety concerns [S25]; mancozeb was already banned in the EU in 2020 as a reproductive toxicant/endocrine disruptor [S30].
- **FRAC 40 (mandipropamid / Revus) resistance** is widespread in NY downy mildew populations (~50–70% of vineyards positive as of 2021) [S2]; similar trends emerging elsewhere.
- **FRAC 11 (strobilurin) resistance** for both powdery and downy mildew is confirmed across most US eastern regions and in Europe [S1].
- **EU copper limits** were tightened to 28 kg/ha over 7 years (avg. 4 kg/ha/yr) under Commission Implementing Regulation 2018/1981; France revoked 19–20 copper products in July 2025 citing worker-safety data gaps; the EU authorization for copper compounds extends to mid-2029 [S5, S6].
- **Biofungicide rotations** incorporating ≥2 biologicals per season provided statistically equivalent downy and powdery mildew control to all-conventional programs over 5 years (2020–2024) at Cornell, at average material cost ~$33–40/A vs. ~$26/A for conventionals [S3, S4].
- **UV-C robotics** (Saga Robotics Thorvald) now commercial at ~2,500 acres in California; nighttime 200 J/m² twice-weekly provided powdery mildew control comparable to conventional programs in Cornell and Oregon trials, but does NOT control downy mildew [S10, S11].
- **RNAi/SIGS sprays** (startup: Varada Agriculture) reached vineyard proof-of-concept across multiple California sites 2020–2023; comparable to chemical gold standard at disease severity <5% [S12].

---

## Key Findings

1. **No silver bullet for both diseases simultaneously.** Powdery mildew (*E. necator*, a true fungus) and downy mildew (*P. viticola*, an oomycete) require different chemistries. DMI fungicides (FRAC 3) have **zero efficacy** against downy mildew [S2]. Only multisite contacts (copper, mancozeb, captan), FRAC 4, 21, 40, 43, 45 target downy.

2. **Resistance management is the central challenge.** FRAC 11 resistance in both diseases, FRAC 3 resistance in powdery mildew, and FRAC 40 resistance in downy mildew are documented in most US and European growing regions. Rotate at minimum 2 (preferably 3+) FRAC groups per season; never apply site-specific fungicides twice in a row [S1, S2].

3. **Critical spray window: immediate pre-bloom to 4–5 weeks post-bloom.** Fruit becomes resistant to powdery and downy mildew infection ~4–6 weeks post-bloom, but leaves remain susceptible all season [S1, S8].

4. **Sulfur is the foundational organic tool for powdery mildew.** Effective at 59–85°F (15–30°C); phytotoxicity risk above 85–90°F (30–32°C); avoid within 10–14 days of oil application; no PHI restriction; no resistance documented after 100+ years of use [S7, S9].

5. **Copper remains irreplaceable for downy mildew in organic systems** despite tightening EU limits. Soil accumulation is a documented ecological concern; >200 mg Cu/kg soil commonly measured in old European vineyards [S5, S6, S14].

6. **Cultural controls (early leaf removal, canopy management) substantially reduce fungicide need.** Pre-bloom leaf removal in the fruit zone reduced rot incidence and improved spray penetration; combining with biofungicide rotation matched conventional-only programs in Washington state trials [S19, S20].

7. **PIWI varieties** can reduce spray applications by up to two-thirds, making them the most economical long-term prevention strategy for new plantings [S21].

8. **Spray timing models outperform calendar schedules.** UC Davis risk-index model achieved 89–90% cluster efficacy vs. 52–54% for simple decision-support or phenology models; reduced residue risk and chemical inputs [S22].

---

## Product Catalog (Structured)

Machine-readable table for recommendation engine. PHI = days before harvest. REI = re-entry interval (hours unless noted). Resistance Risk: H=High, M=Medium, L=Low (site-specific fungicides only). Organic? = USDA NOP / OMRI listed. Regions: US = registered in USA; EU = registered in EU; ARG = registered in Argentina. Strikethrough in EU column indicates banned/not approved.

| Trade Name | Active Ingredient | FRAC | Target | Typical Rate/A | PHI (days) | REI (hr) | Resistance Risk | Organic? | Regions Registered | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| Sulfur 90WP / Microthiol | Sulfur | M02 | PM | 3–10 lb | 0 | 24 | L (none documented) | Yes | US, EU, ARG | [S1],[S7] |
| Lime Sulfur (Sulforix) | Calcium polysulfide | M02 | PM (dormant) | 1–2 gal | 0 | 48 | L | Yes (dormant only) | US, EU | [S1],[S7] |
| Kocide 3000 / Champ WP | Copper hydroxide | M01 | DM, PM (partial) | 0.5–2 lb | 0 | 48 | L | Yes | US (EU: restricted/product-specific — France revoked 19 products Jan 2026) | [S5],[S6] |
| Cueva | Copper octanoate | M01 | DM | 0.5–2 qt | 0 | 4 | L | Yes | US, EU | [S5] |
| Nordox 75WG | Copper(I) oxide | M01 | DM | 0.5–1 lb | 0 | 48 | L | Yes | US, EU | [S5] |
| Bordeaux Mixture | Copper sulfate + lime | M01 | DM | Variable | 0 | 48 | L | Yes | US, EU, ARG | [S5],[S6] |
| Manzate / Dithane / Penncozeb | Mancozeb | M03 | DM, BR, PHOM | 3 lb | 66 | 24 | L | No | US (proposed cancellation 2024); **EU BANNED 2020**; ARG | [S1],[S25] |
| Captan 50WP | Captan | M04 | DM, BR, PHOM | 2–4 lb | 0 | 48 | L | No | US (REI being extended); **EU BANNED**; ARG | [S1],[S25] |
| Ziram 76DF | Ziram | M03 | DM, BR | 3–4 lb | 21 | 48 | L | No | US (proposed ban in grapes); **EU BANNED**; ARG | [S25] |
| Rally 40WSP | Myclobutanil | 3 (DMI) | PM | 4 fl oz | 14 | 24 | H | No | US, ARG; EU registered | [S1],[S2] |
| Elite 45DF | Tebuconazole | 3 (DMI) | PM | 4 oz | 14 | 12 | H | No | US, EU, ARG | [S1] |
| Mettle 125ME | Tetraconazole | 3 (DMI) | PM, BR | 3–5 fl oz | 14 | see label | H | No | US, EU (as Eminent), ARG | [S1],[S15] |
| Procure 480SC | Triflumizole | 3 (DMI) | PM | 4–8 fl oz | 7 | 24 | H | No | US | [S1] |
| Cevya | Mefentrifluconazole | 3 (DMI) | PM | see label | 14 | 12 | H | No | US, EU | [S2],[S15] |
| Rhyme | Flutriafol | 3 (DMI) | PM | see label | 14 | 12 | H | No | US, EU | [S15] |
| Topguard / Topguard EQ | Flutriafol / + azoxystrobin | 3 / 3+11 | PM | see label | 14 | 12 | H | No | US; check EU per formulation | [S15] |
| Aprovia | Benzovindiflupyr | 7 (SDHI) | PM, BR, ANTH | 8.6–10.5 fl oz | 21 | 12 | M | No | US, EU | [S1],[S15] |
| Endura 70WG | Boscalid | 7 (SDHI) | PM, BOT | 4.5–8 oz | 14 | 12 | M | No | US, EU, ARG | [S1] |
| Kenja 400SC | Isofetamid | 7 (SDHI) | PM, BOT, BR | 20–22 fl oz | 16 | 12 | M | No | US, EU (as Boscalid mix) | [S1] |
| Luna Experience | Fluopyram + tebuconazole | 7+3 | PM, BOT, BR | 8–8.6 fl oz | 14 | 4 | M | No | US, EU, ARG | [S1],[S15] |
| Luna Sensation | Fluopyram + trifloxystrobin | 7+11 | PM, BOT | 4–7.6 fl oz | 14 | 12 | M | No | US, EU, ARG | [S1],[S15] |
| Luna Privilege | Fluopyram | 7 (SDHI) | PM, BOT | see label | 0 | 4 | M | No | US, EU | [S15] |
| Miravis Prime | Pydiflumetofen + fludioxonil | 7+12 | PM, BOT | see label | 0 | 12 | M | No | US, EU | [S15] |
| Merivon Xemium | Fluxapyroxad + pyraclostrobin | 7+11 | PM | 4–5.5 fl oz | 14 | 12 | M | No | US, EU | [S1] |
| Pristine | Pyraclostrobin + boscalid | 11+7 | PM, DM, BOT, BR | 8–12.5 oz | 14 | see label | H (FRAC 11) | No | US, EU (FRAC 11 resistance widespread) | [S1],[S2] |
| Abound | Azoxystrobin | 11 (QoI) | PM, DM, BOT, BR | 10–15.5 fl oz | 14 | 4 | H | No | US, EU (resistance widespread) | [S1],[S2] |
| Flint Extra | Trifloxystrobin | 11 (QoI) | PM, DM | 1.5–4 oz | 14 | 12 | H | No | US, EU | [S1] |
| Sovran | Kresoxim-methyl | 11 (QoI) | PM, DM, BR | 3.2–4.8 oz | 14 | 12 | H | No | US, EU | [S1] |
| Intuity | Mandestrobin | 11 (QoI) | PM, BOT | 6 fl oz | 10 | 12 | H | No | US, EU | [S1],[S15] |
| Quadris Top | Azoxystrobin + difenoconazole | 11+3 | PM, DM, BR, ANTH | 12–14 fl oz | 14 | 12 | H | No | US, EU | [S1] |
| Revus Top | Mandipropamid + difenoconazole | 40+3 | DM, PM, BR, ANTH | 7 fl oz | 14 | 12 | M | No | US, EU, ARG | [S1],[S2] |
| Quintec | Quinoxyfen | 13 | PM only | 3–6.6 fl oz | 14–21 | 12 | M | No | US only (not EU-registered for grapes) | [S1],[S16] |
| Torino 0.85F | Cyflufenamid | U6 | PM only | 3.4 fl oz | 3 | 4 | M | No | US, EU (as Miliona), ARG | [S1],[S15] |
| Vivando 2.5F / Prolivo | Metrafenone / Pyriofenone | U8 / 50 | PM only | 10.3–15.4 fl oz | 14 | 12 | M | No | US (Vivando); EU (Vivando/Prolivo) | [S1],[S15] |
| Ranman 400SC | Cyazofamid | 21 | DM only | 2.1–2.75 fl oz | 30 | 12 | M | No | US, EU | [S1],[S8] |
| Revus | Mandipropamid | 40 | DM only | 8 fl oz | 30 | 4 | M (resistance growing in NY) | No | US, EU, ARG | [S2],[S15] |
| Forum | Dimethomorph | 40 | DM only | 6 fl oz | 14 | 12 | M (resistance growing) | No | US (supplemental label), EU | [S1],[S8] |
| Zampro | Ametoctradin + dimethomorph | 45+40 | DM only | 11–14 fl oz | 14 | 12 | M | No | US, EU | [S2],[S15] |
| Presidio | Fluopicolide | 43 | DM only | see label | 21 | 12 | M | No | US, EU | [S8] |
| Ridomil Gold SL | Mefenoxam | 4 | DM (best available) | 3.6 pt (dormant) / 2.5 lb | 60–66 | 48 | H (critical—1× only) | No | US, EU, ARG | [S1],[S2] |
| Ridomil Gold Copper | Mefenoxam + copper | 4+M01 | DM | 2 lb | 42 | 48 | H (for FRAC 4) | No | US | [S1] |
| Ridomil Gold MZ | Mefenoxam + mancozeb | 4+M03 | DM | 2.5 lb | 66 | 48 | H (for FRAC 4) | No | US; **EU BANNED (mancozeb)** | [S1] |
| Tanos | Famoxadone + cymoxanil | 11+27 | DM | 8 oz | 30 | 12 | H (FRAC 11) | No | US, EU | [S1] |
| Prophyt / Phostrol / Agri-Fos | Phosphorous acid (fosetyl-Al) | P07 | DM (post-infection) | see label | 0 | 4 | M | No | US, EU | [S1],[S2] |
| Aliette WDG | Fosetyl-aluminum | 33 | DM (post-infection) | see label | 15 | 12 | M | No | US, EU | [S8] |
| Inspire Super | Difenoconazole + cyprodinil | 3+9 | PM, BOT, BR, ANTH | 16–20 fl oz | 14 | 12 | H | No | US, EU | [S1] |
| Aprovia Top | Benzovindiflupyr + difenoconazole | 7+3 | PM, BOT, BR | 8.6–10.5 fl oz | 21 | 12 | M | No | US, EU | [S15],[S23] |
| Gatten | Flutianil | U13 | PM only | see label | see label | see label | M | No | US, EU | [S23] |
| Serenade OPTI | Bacillus subtilis QST 713 | BM02 | PM, DM (partial) | 14–20 oz | 0 | 4 | L | Yes (OMRI) | US, EU | [S1],[S3] |
| Serenade ASO | Bacillus subtilis QST 713 | BM02 | PM, DM (partial) | 2–4 qt | 0 | 4 | L | Yes (OMRI) | US, EU | [S3],[S23] |
| Stargus | Bacillus amyloliquefaciens F727 | BM02 | PM, DM (partial) | 1–4 qt | 0 | 4 | L | Yes (OMRI) | US | [S2],[S3] |
| Double Nickel 55 | Bacillus amyloliquefaciens D747 | BM02 | PM, DM (partial) | 0.25–3 lb | 0 | 4 | L | Yes (OMRI) | US | [S1],[S2] |
| Sonata | Bacillus pumilus QST 2808 | BM02 | PM | 2–4 qt | 0 | 4 | L | Yes (OMRI) | US | [S8] |
| LifeGard WG | Bacillus mycoides isolate J | — | PM, DM | 4.5 oz/100 gal | 0 | 4 | L | Yes (OMRI) | US | [S2],[S3] |
| Howler | Bacillus amyloliquefaciens PTA-4838 | BM02 | PM, DM | 2.5–7.5 lb | 0 | 4 | L | Yes (OMRI) | US | [S2] |
| Regalia | Reynoutria sachalinensis extract | P05 | PM, DM (partial) | 1–4 qt | 0 | 4 | L | Yes (OMRI) | US, EU (Milsana) | [S8],[S17] |
| AQ10 | Ampelomyces quisqualis AQ10 | — | PM only (hyperparasite) | 35–70 g/ha | 1 day | 0 | L | Yes | EU, limited US | [S18] |
| Kaligreen | Potassium bicarbonate | NC | PM | 2.5–5 lb | 0 | 4 | L | Yes (OMRI) | US, EU | [S1],[S9] |
| MilStop / Armicarb | Potassium bicarbonate | NC | PM | 2.5–5 lb | 0 | 4 | L | Yes (OMRI) | US | [S8],[S9] |
| Vacciplant | Laminarin | P06 | PM elicitor, DM elicitor | see label | 3 | 4 | L | Yes (EU Organic) | EU; limited US | [S26],[S27] |
| JMS Stylet Oil | Paraffinic mineral oil | M | PM | 1–2% | 0 | 12 | L | Yes | US, EU | [S7],[S9] |
| OxiDate 5.0 | H₂O₂ + peroxyacetic acid | — | PM (limited) | see label | 0 | 0 | L | Yes (OMRI) | US | [S23] |
| Mevalone | Eugenol + geraniol + thymol | BM01 | PM | see label | see label | see label | L | Yes | US, EU | [S23] |

**Abbreviations:** PM = powdery mildew; DM = downy mildew; BOT = Botrytis; BR = black rot; ANTH = anthracnose; PHOM = Phomopsis.

---

## Detailed Notes

### Conventional Fungicides by FRAC Group

#### FRAC M01 — Copper (Inorganic multi-site)

**Mode of action:** Contact protectant. Cu²⁺ ions released in moisture inhibit spore germination enzymes; no systemic activity. Must be applied before infection. [S5]

**Target:** DM primary; some PM activity. Non-specific contact kills many fungi/oomycetes.

**Key products:**
- *Kocide 3000* (copper hydroxide, 46.1% Cu) — widely used in US and EU
- *Cueva* (copper octanoate, 10% Cu) — lower Cu load; more compatible with organic production
- *Nordox 75WG* (copper(I) oxide) — popular in EU
- *Bordeaux Mixture* (copper sulfate + lime) — oldest formulation; still dominant in Burgundy, Bordeaux, and Mendoza for organic production

**Rates:** US: 0.5–2 lb metallic Cu/A per application. EU limit: 28 kg Cu/ha over 7 years (≈ 4 kg/ha/yr average); Demeter: ≤ 3 kg/ha/yr averaged over 5 years. [S5, S6]

**PHI/REI:** PHI = 0 days; REI = 24–48 hr (varies by formulation).

**Resistance risk:** L (no documented copper resistance in *P. viticola*; however, overuse can select for less-sensitive strains).

**Organic status:** Yes — USDA NOP, EU Organic (2018/848 + Implementing Reg. 2021/1165), Demeter.

**Regional notes:**
- **France (January 2026):** ANSES revoked 19–20 copper product authorizations (including Kocide 2000/Flow) citing worker-safety data gaps. Only Champ Flo Ampli and Héliocuivre remain authorized with strict new restrictions (max 4 kg/ha/yr, 7-day minimum interval, ban during flowering, no use near waterways/residential areas). EU authorization extended to mid-2029. [S6]
- **Soil accumulation:** After 90%+ of applied Cu deposits in soil; EU vineyards commonly have >200 mg Cu/kg topsoil; can exceed 1,000 mg/kg in old sites. Adversely affects earthworms, microbial diversity, enzyme activity. [S5, S13, S14]
- **Spray timing:** Critical to apply to underside of leaves (where *P. viticola* stomatal entry occurs); coverage + timing before infection events are key [S5].
- **EU emerging restriction:** Copper is designated as "candidate for substitution"; long-term approval contested despite being the only viable option in organic systems [S14].

#### FRAC M02 — Sulfur

**Mode of action:** Volatilizes to SO₂ at temperatures > 20°C (68°F); vapor phase kills spores not in direct contact. Contact activity disrupts cellular respiration. [S7, S9]

**Target:** PM only (no downy mildew efficacy).

**Forms:**
| Form | Particle size | Characteristics |
|---|---|---|
| Dust/elemental | Large (>200 µm) | Longer residual; better rain tolerance; volatile at higher temps |
| Wettable powder (90WP) | Medium | Good coverage; standard workhorse |
| Micronized (Microthiol Special) | <5 µm | Superior coverage; more effective but shorter residual |
| Flowable/SC | Suspension | Easy to mix; good coverage |
| Lime sulfur (calcium polysulfide) | — | Dormant only; eradicant; high PHI 7 days |

**Phytotoxicity windows:**
- > 85–90°F (30–32°C): Risk of leaf burn; do not apply during heat waves [S7, S9]
- > 100°F (38°C): Severe burn risk; reduce rate
- Optimal activity: 70–85°F (21–30°C); sulfur must volatilize to be effective [S9]
- Powdery mildew thermal inactivation: > 86°F (30°C) — spores also killed, reducing disease pressure at same temperatures that increase phytotoxicity risk [S9]

**Compatibility rule — oils:**
- Do NOT mix sulfur with horticultural (paraffinic) oils in tank; forms phytotoxic compounds [S7, S9]
- Maintain minimum 10–14 day interval between sulfur and oil applications [S8, S9]
- Do NOT mix sulfur with captan (phytotoxicity) [S8]

**Fermentation concern:** Sulfur residue > 5 mg/L in grape must can cause H₂S fermentation problems ("rotten egg" character). Final sulfur spray recommended ≥ 5–6 weeks before harvest in hot/dry climates (CA); sooner in wet climates where rainfall reduces residue. [S9]

**Timing model:** Sall et al. (California Agriculture) developed temperature-based sulfur timing: first application at 6 inches shoot growth or 12 days after first leaves emerge; subsequent timing based on daily high/low temperature table; reduced unnecessary sprays in San Joaquin Valley by avg. 2.4 sprays vs. calendar schedule [S28].

**PHI/REI:** PHI = 0 days (sulfur), 7 days (lime sulfur); REI = 24 hr.

**Resistance risk:** L — no documented resistance after >100 years of use [S9].

**Organic status:** Yes (USDA NOP, EU Organic, Demeter).

#### FRAC M03 — Dithiocarbamates (Mancozeb, Ziram)

**Mode of action:** Multi-site contact; inhibits thiol-containing enzymes in multiple metabolic pathways.

**Target:** DM, BR, PHOM (mancozeb); DM, BR (ziram).

**Key note:** **Mancozeb BANNED in EU since 2020** (reproductive toxicant, endocrine disruptor) [S30]. **US EPA proposed cancellation in grapes 2024** due to post-application worker exposure (REI would need to be 45–72 days, precluding normal vineyard activities) [S25]. Mancozeb remains available in Argentina and globally.

**PHI/REI:** Mancozeb: PHI 66 days, REI 24 hr. Ziram: PHI 21 days, REI 48 hr. [S1]

**Resistance risk:** L (multisite; no documented resistance).

#### FRAC M04 — Phthalimides (Captan)

**Target:** DM, BR, PHOM (NOT effective against PM or black rot when used alone).

**US status:** EPA proposed extended REI (3–5 days) for certain high-contact activities; maximum application rate being re-evaluated 2024 [S25].

**EU status:** **NOT APPROVED** for grapes in most EU member states.

**PHI/REI:** PHI = 0 days; REI = 48 hr (50WP) or 72 hr (80WDG).

**Organic status:** No.

#### FRAC 3 — DMI / Sterol Demethylation Inhibitors (Triazoles)

**Mode of action:** Systemic inhibitor of ergosterol biosynthesis (14α-demethylase enzyme); protectant + curative (post-infection activity up to 72–96 hr). [S1]

**Target: PM ONLY.** Note: DMIs have **zero efficacy** against downy mildew (*P. viticola*, an oomycete that lacks ergosterol in its cell membrane) [S2].

**Key products and distinctions:**
- **Rally 40WSP (myclobutanil):** Foundational DMI; widespread resistance in NY and VA powdery mildew populations [S1, S2]
- **Mettle (tetraconazole):** Rainfast within 2 hr; strong curative activity against PM and BR
- **Cevya (mefentrifluconazole):** BASF, labeled as of 2020; no variety restrictions (labeled for Concord) [S2]
- **Rhyme (flutriafol):** Systemic via xylem; translaminar [S15]
- **Topguard (flutriafol):** Corn/grape labeled; systemic; good residual [S15]

**Resistance situation:** High resistance risk. DMI resistance (FRAC 3) documented in NY, VA, and EU powdery mildew populations. Do not apply more than 2–3× per season; never twice consecutively [S1, S2]. Cross-resistance across all DMIs is common.

**PHI/REI:** Varies: PHI 7–21 days; REI 12–24 hr (see individual products).

**Region:** US registered (all major products); EU registered (many, check national lists); ARG registered (tebuconazole, myclobutanil common).

#### FRAC 7 — SDHI / Succinate Dehydrogenase Inhibitors

**Mode of action:** Inhibit succinate dehydrogenase (complex II) in fungal mitochondrial respiratory chain; systemic [S1].

**Target:** PM primary; some products also BOT; NOT effective against DM.

**Key products:**
- **Aprovia (benzovindiflupyr):** Also active against ANTH, BR
- **Endura (boscalid):** Also active against BOT; significant price drop since 2020
- **Kenja (isofetamid):** BOT, BR, PHOM activity
- **Luna Experience (7+3):** PM + BOT combination with tebuconazole
- **Luna Sensation (7+11):** PM + DM combination with trifloxystrobin
- **Miravis Prime (7+12):** PM + BOT

**Resistance risk:** M — resistance documented in *B. cinerea* (SDHI component); monitor in PM. Do not exceed 2× per season.

**PHI/REI:** PHI 0–21 days depending on product; REI 12 hr.

**Region:** US, EU, ARG (varies by product).

#### FRAC 11 — QoI / Strobilurin Fungicides

**Mode of action:** Inhibit mitochondrial respiration at complex III (Qo site); locally systemic; protectant + anti-sporulant [S1].

**Target:** Both PM and DM; however, **resistance is widespread in BOTH pathogens across most US and EU regions** [S1, S2].

**Resistance status:**
- PM resistance to FRAC 11 confirmed in Ohio (2019), Virginia, New York, and throughout Europe; G143A mutation confers complete cross-resistance within the group [S1]
- DM resistance documented in Virginia, Georgia, and EU vineyards [S1, S2]
- **Recommendation:** Do NOT rely on FRAC 11 alone; always tank-mix with another effective FRAC group [S2]

**Key products:** Abound (azoxystrobin), Flint Extra (trifloxystrobin), Sovran (kresoxim-methyl), Intuity (mandestrobin); pre-mixes: Pristine (7+11), Luna Sensation (7+11), Merivon (7+11), Quadris Top (3+11), Topguard EQ (3+11).

**PHI/REI:** PHI 10–14 days; REI 12 hr. No more than 2–3× per season.

#### FRAC 13 — Quinoxyfen (Quintec)

**Mode of action:** Unique — inhibits haustorium formation; not fully elucidated. Redistribution from spray residue provides activity in gaps [S16].

**Target: PM ONLY.** No DM efficacy.

**Key product:** Quintec (quinoxyfen, 2.08F). **Only FRAC 13 fungicide registered in the US** [S16].

**Rates/restrictions:** 3–6.6 fl oz/A; PHI = 14–21 days; REI = 12 hr; max 33 fl oz/acre/year; no more than 2 consecutive applications; no aerial application on grapes [S16].

**Resistance risk:** M — unique mode of action provides resistance management value; rotate carefully.

**Region:** US registered; **NOT registered in EU for grapes** [S16]. Available in some South American markets.

#### FRAC U6 — Cyflufenamid (Torino)

**Target: PM ONLY.** Mode of action unknown (affects germination and hyphal growth).

**Key attributes:** Very short PHI (3 days); short REI (4 hr); excellent late-season tool when proximity to harvest limits other options [S1].

**Resistance risk:** M.

**Region:** US (Torino); EU (Miliona by BASF); ARG.

#### FRAC U8 / 50 — Metrafenone / Pyriofenone (Vivando / Prolivo)

**Target: PM ONLY.** Inhibits actin cytoskeleton organization; no cross-resistance with other PM fungicides known [S8].

**PHI:** 14 days (Vivando); 0 days (Prolivo in some markets).

**Key attribute:** No cross-resistance — valuable in vineyards with multi-resistance issues; excellent late-season option.

**Region:** US (Vivando); EU (Vivando, Prolivo); limited ARG.

#### FRAC 21 — Cyazofamid (Ranman)

**Mode of action:** Inhibitor of complex III (Qi site, distinct from FRAC 11); limited systemic activity [S8].

**Target: DM ONLY** — no PM efficacy.

**PHI/REI:** PHI = 30 days; REI = 12 hr. Max 6 applications per season; no more than 3 consecutive before rotating [S8].

**Resistance risk:** M — documented resistance concerns in other oomycete crops; preventive use only.

**Region:** US, EU.

#### FRAC 40 — CAA Fungicides (Mandipropamid, Dimethomorph)

**Mode of action:** Inhibit phospholipid biosynthesis (CAA = carboxylic acid amides); disrupt cell wall synthesis in oomycetes; systemic/translaminar [S2].

**Target: DM ONLY** — no PM efficacy.

**Key products:** Revus (mandipropamid), Forum (dimethomorph), Revus Top (mandipropamid + difenoconazole 3+40).

**CRITICAL resistance warning:** FRAC 40 resistance in *P. viticola* is **widespread in New York** (~50–70% of vineyards positive as of 2021) and documented in Virginia and EU [S2]. **Do NOT rely on FRAC 40 alone** in NY/eastern US; always tank-mix; use as part of broader program.

**PHI/REI:** PHI = 14–30 days (product-specific); REI = 4–12 hr.

**Resistance risk:** M–H in affected regions.

#### FRAC 43 — Fluopicolide (Presidio)

**Target:** DM + other oomycetes.

**Mode of action:** Novel — disrupts spectrin-like proteins; affects motility of zoospores; locally systemic/translaminar.

**PHI:** 21 days; no more than 2 consecutive applications; always tank-mix.

**Region:** US, EU.

#### FRAC 45 — Ametoctradin (component of Zampro)

**Sold in combination with FRAC 40 dimethomorph as Zampro.** Inhibits respiratory complex III at Qi site (distinct from FRAC 11 and 21).

**Target: DM ONLY.** PHI = 14 days; REI = 12 hr. [S2]

**Region:** US, EU.

#### FRAC P07 — Phosphorous acids (Phostrol, Prophyt, Agri-Fos, Rampart)

**Mode of action:** Absorbed post-infection; inhibits oomycete phospholipid biosynthesis; also triggers plant SAR defense response.

**Target:** DM (post-infection activity — use within 24–48 hr of infection event).

**Key distinction:** PHI = 0 days; REI = 4 hr — valuable near harvest for DM suppression.

**Resistance risk:** M — resistance can develop with overuse; do not use to put down epidemic (accelerates resistance) [S2].

**Organic status:** Not OMRI listed in all formulations; check certifier.

---

### Sulfur

See FRAC M02 detailed section above. Summary of key protocols:

**Application windows by temperature:**

| Temperature | Protocol |
|---|---|
| < 60°F (15°C) | Avoid — sulfur ineffective; spores not active |
| 60–70°F (15–21°C) | Apply at shorter intervals (7–10 days); coverage critical |
| 70–85°F (21–30°C) | Optimal zone; 10–14 day intervals typical |
| 85–90°F (30–32°C) | Caution zone; consider reducing rate; do not apply during afternoon heat |
| > 90°F (32°C) | Avoid or use minimum rate; phytotoxicity risk elevated |
| > 100°F (38°C) | Do not apply |

**Wettable vs. dust formulations:**
- Dust (sulfur): Longer residual; better for arid western regions; applied by duster
- Wettable powder (90WP, Microthiol): Standard; better coverage on complex canopies
- Micronized (Microthiol Special Disperss): Finest particles; best coverage; most expensive; preferred in Napa/Sonoma

**Incompatibility:** Do not combine with oils (10–14 day minimum gap); do not combine with captan (phytotoxicity). [S7, S9]

**Late-season guidance:** Stop sulfur applications 4–6 weeks before harvest in hot/dry climates to prevent fermentation H₂S problems [S9].

---

### Copper

See FRAC M01 detailed section above. Summary of protocols:

**Bordeaux Mixture (bouillie bordelaise):**
- Traditional formula: 10 kg CuSO₄ + 10 kg Ca(OH)₂ per 100 L water
- Non-systemic; contact protectant only; apply before infection
- Adherent due to lime; good rain fastness; longer residual than other copper forms
- Widely used in Burgundy, Bordeaux, Mendoza organic programs

**Copper hydroxide (Kocide 3000):**
- Higher Cu content; more soluble and active than Bordeaux; lower pH may cause phytotoxicity on young tissue
- Preferred in US conventional/organic programs

**Copper octanoate (Cueva):**
- Lower Cu load (~2 lbs metallic Cu/A); premium choice for EU limit compliance; compatible with low-Cu organic strategies

**Soil accumulation protocols:**
- After 90% of applied Cu is deposited in soil; cannot be remediated easily [S14]
- Phytoremediation (Brassica juncea, cover crop legumes) partial mitigation
- Track cumulative Cu application per block; use GPS/logbook in EU regions
- Demeter: Track 5-year average; max 3 kg/ha/yr

**EU compliance (2025 position):**
- Baseline rule: 28 kg Cu/ha over any 7-year rolling period [S5, S6]
- France: Only 2 products authorized from Jan 2026; field stocks may be used 1 year post-sale ban
- Best practice: Use minimal-Cu formulations; time applications to maximize efficiency; supplement with biologicals and laminarin/potassium phosphonates where possible

**Copper + sulfur synergy:** Adding sulfur to copper hydroxide spray significantly improved downy mildew control on fruit clusters in 3 of 5 trial years under high infection pressure in European trials. Effect on leaf infection was not significant. [S27]

---

### Biological Controls

#### Bacillus spp. Products

*B. subtilis*, *B. amyloliquefaciens*, and *B. pumilus* products act through multiple mechanisms: antibiosis (iturin A, fengycin, surfactin lipopeptides), competition for colonization sites, and induction of SAR (stilbene/phytoalexin production) in grapevines [S4, S24].

**Key products:**

| Product | Strain | Mechanism | Target | PHI | REI | Organic |
|---|---|---|---|---|---|---|
| Serenade OPTI/ASO | *B. subtilis* QST 713 | Antibiosis + ISR | PM, DM (partial), BOT | 0 days | 4 hr | Yes |
| Stargus | *B. amyloliquefaciens* F727 | Antibiosis + ISR | PM, DM (partial) | 0 days | 4 hr | Yes |
| Double Nickel 55 | *B. amyloliquefaciens* D747 | Antibiosis | PM, DM (partial), BOT | 0 days | 4 hr | Yes |
| LifeGard WG | *B. mycoides* isolate J | ISR activator | PM, DM | 0 days | 4 hr | Yes |
| Howler | *B. amyloliquefaciens* PTA-4838 | Antibiosis | PM, DM | 0 days | 4 hr | Yes |
| Sonata | *B. pumilus* QST 2808 | Antibiosis | PM | 0 days | 4 hr | Yes |

**Efficacy context:** Cornell 5-year trials (2020–2024): biofungicide rotations (≥2 applications/season) provided equivalent control to conventional-only programs on both PM and DM in Chardonnay under moderate pressure [S3]. Under high disease pressure, performance of biologicals alone was lower, especially for DM. **Biofungicides perform best when:**
1. Rotated with conventional fungicides (not used as standalone in high-pressure years)
2. Applied preventively before infection events
3. Tank-mixed with appropriate adjuvants (nonionic surfactants) [S3, S4]

#### Ampelomyces quisqualis (AQ10)

A hyperparasite specifically targeting powdery mildew hyphae and conidiophores. It invades PM mycelium and destroys cytoplasm, leading to colony death [S18].

- **Formulation:** Water-dispersible granule; viable spores (conidia)
- **Application:** 35–70 g/ha; apply weekly preventively at onset of PM or conducive conditions
- **PHI:** 1 day; no chemical residue
- **Organic:** Yes (EU certified; limited US registration for ornamentals/protected crops)
- **Region:** EU (broad registration); US (limited; ornamentals and protected crops)
- **Limitations:** Requires living PM mycelium to parasitize; works best at early colony stage; less effective standalone at high pressure; best as part of IPM rotation [S18]

#### Trichoderma spp.

Various Trichoderma formulations are used as soil/foliar biocontrol. For foliar PM control, a mixture of *T. harzianum*, *T. hamatum*, and *T. viride* showed 80–90% efficacy against PM incidence and severity in Egyptian vineyard trials, superior to single Trichoderma spp. alone [S17].

- **Commercial products:** Trianum (T-22), Timorex (tea tree oil + *Trichoderma*), Blight Stop
- **Limitations:** Variable results; primarily soil health applications; foliar PM use requires specific strains; limited US grape registration

#### Reynoutria sachalinensis Extract (Regalia)

**Mode of action:** Elicits SA-dependent systemic acquired resistance (SAR); triggers callose papilla formation, H₂O₂ accumulation, increased salicylic acid and phenolic acid production [S17]. Effect is NOT systemic throughout plant — limited to treated leaf.

- **Active ingredient:** 5% extract of giant knotweed (*R. sachalinensis*)
- **Rate:** 1–4 qt/A; use with adjuvant (Nu-Film-P) for optimal results
- **PHI:** 0 days; REI = 4 hr
- **Organic:** Yes (OMRI, USDA NOP)
- **Efficacy:** Moderate to good PM control; moderate DM control; best results when tank-mixed or rotated with conventional product [S3]; Stargus + Regalia combination provided excellent PM control in 2021 Cornell trials and excellent black rot control in 2022 [S2]
- **Region:** US (Regalia by Marrone Bio Innovations/AMVAC); EU (Milsana by BIOFA)
- **Resistance induction lag:** 1–2 days required to induce response; must be applied preventively; requires light for optimal response [S8]

#### Laminarin (Vacciplant)

**Mode of action:** β-1,3-glucan polysaccharide derived from brown algae (*Laminaria digitata*); elicits plant defense responses (SAR/ISR pathway); triggers grapevine natural defense mechanisms against PM and DM.

- **Region:** EU (Vacciplant, UPL); limited US registration (wheat; grape research ongoing)
- **Efficacy:** Italian trials (2016–2017) showed significant reduction of PM on Moscato; less effective than sulfur on its own but provides elicitation value in mixed programs [S26]
- **Limitations:** Under high pressure, laminarin alone insufficient; combine with other fungicides; EU organic-compatible [S26]

#### Potassium Bicarbonate (Kaligreen, MilStop, Armicarb)

**Mode of action:** Disrupts fungal cell walls by osmotic disruption; collapses hyphae and spores of powdery mildew. Contact mode — no systemic activity [S9].

- **Target:** PM ONLY (no DM efficacy)
- **Rate:** 2.5–5 lb/A; apply with canola oil or nonionic surfactant for best results
- **PHI:** 0 days; REI = 4 hr
- **Organic:** Yes (OMRI, EU Organic)
- **Limitations:** Does not protect vine from new infections; requires more frequent application than sulfur; best used when PM is first observed or when disease pressure is low-moderate; do not mix with acidifying agents [S1, S9]
- **Region:** US (Kaligreen, MilStop, Armicarb); EU (Armicarb/similar)

---

### Cultural Controls

#### Canopy Management and Leaf Removal

**Early leaf removal** (pre-bloom, 10–15 days before flowering) is the single most impactful cultural intervention for disease management [S20]:

- Removes 3–6 basal leaves in the fruit zone
- **Effects:** Reduced fruit set → looser cluster architecture → better air circulation → faster drying → reduced Botrytis, PM, and DM colonization; improved spray penetration into canopy
- Produces thicker berry skins; light-induced metabolic changes increase phytoalexins (resveratrol, stilbenes)
- MSU multi-year trials: Significant reduction of Botrytis and sour rot; lower rot incidence even under adverse weather [S20]
- Washington state trials: Early leaf removal + 1 synthetic fungicide at bloom provided PM control comparable to all-synthetic program [S19]

**Timing:** Pre-bloom is critical; post-veraison defoliation less impactful for disease; mechanical leaf removal now available and scalable [S20].

**Shoot thinning and tucking:**
- Remove lateral shoots/suckers to reduce canopy density
- Tuck shoots into catch wires to maintain upright canopy
- Open canopies dry faster; reduce leaf wetness period critical for DM infection [S20, S21]

**Training systems:** VSP (vertical shoot positioning) and Guyot training provide 2-dimensional canopy more amenable to mechanical early leaf removal and improved spray penetration [S19, S20].

#### Irrigation Strategy

- Avoid overhead irrigation during periods of high DM infection risk; overhead irrigation creates leaf wetness periods ideal for *P. viticola* sporulation and zoospore germination
- Drip/subsurface irrigation preferred in disease-prone climates
- Manage irrigation to limit vigorous late-season shoot growth, which extends window of susceptible tissue [S8]

#### Cultivar Resistance Ratings

**PIWI varieties** (German: *pilzwiderstandsfähige Rebsorten* — fungus-resistant varieties) carry *Rpv* loci (*Resistance to P. viticola*) and PM resistance QTLs from wild *Vitis* spp. introgression [S21]:

| Variety | PM resistance | DM resistance | Notes |
|---|---|---|---|
| Regent | Good | Good | Red; cherry/plum flavors; widely planted in Germany |
| Solaris | Very good | Very good | White; tropical flavors; early ripening; clusters susceptible until BBCH 71 |
| Cabernet Cortis | Good | Very good | Red; Merlot-like; resistant until BBCH 65–71 |
| Souvignier Gris | Very good | Very good | Pink-skinned; loose bunches; suitable for skin-contact wines |
| Johanniter | High | High | White; Pinot Blanc/Riesling character |
| Regent | Good | Good | Red wine; stacked Rpv loci |
| Phoenix | High | High | White; elderflower; citrus |
| Merlot Khorus | Good | Very good | Red; Merlot × Kozma 20-3 |

**Spray reduction:** PIWI vineyards can reduce fungicide applications by up to 2/3 vs. *V. vinifera*; still require some protection during early season and under high pressure [S21].

**Traditional cultivar susceptibility:**
- *V. vinifera* (Chardonnay, Cabernet Sauvignon, Pinot Noir, Merlot): Highly susceptible; full-season protection required
- *V. labrusca* hybrids: Moderate susceptibility; shorter critical window
- Berries become resistant to infection ~4–6 weeks post-bloom (BBCH 77–81 for all cultivars) [S21]

#### Sanitation

- Remove infected wood during dormant pruning; mummified berries (source of cleistothecia for PM overwintering)
- Post-harvest copper or lime sulfur application to reduce overwintering DM oospores
- Controlling powdery mildew up to Labor Day (September) reduces cleistothecia inoculum for following spring [S8]

---

### Emerging Methods (2019+)

#### UV-C Light Treatment — Saga Robotics Thorvald

The Thorvald robot applies UV-C light (shortwave ultraviolet, ~254 nm) at night at low travel speeds (~0.5 m/s). UV-C damages fungal DNA, preventing germination and reproduction. Night application exploits dormancy of PM photoreactivation repair mechanisms. [S10, S11]

**Efficacy data:**
- Cornell trials (2020–2023, Geneva NY): Nighttime UV-C at 200 J/m² twice weekly provided excellent suppression of PM — 2.8% foliar severity and 1.2% cluster severity at veraison, comparable to commercial conventional fungicide standards [S2]
- Oregon (SARE GW21-219, 2020–2023): UV-C significantly reduced foliar PM AUDPC in all years; significant cluster PM reduction in 2020, 2021, 2023; **not a standalone replacement for fungicides** in Willamette Valley high-pressure conditions; most useful in combination with reduced fungicide program [S11]
- Bien Nacido Estate (Santa Maria, CA, 2025): UV-C as primary PM control; "zero sprays for powdery mildew" in some blocks; ~2,500 acres under Thorvald in California [S10]

**Key attributes:**
- No PHI; no REI; no fungicide residue
- No resistance risk
- Organic compatible
- Does NOT control downy mildew [S2]
- Suitable for nighttime autonomous operation

**Commercial status:** Thorvald available for hire/purchase; deployed commercially in California, UK, Norway, Switzerland. [S10]

#### RNAi / Spray-Induced Gene Silencing (SIGS)

dsRNA sprays designed to silence specific *E. necator* genes required for growth/reproduction. The plant's RNAi machinery processes the dsRNA into siRNAs that degrade pathogen mRNA. [S12]

**Development status:**
- AVF-funded research (2020–2023) at multiple CA sites (Fresno, Yolo, Stanislaus counties): dsRNA treatments on Chenin Blanc, Sauvignon Blanc, Carignan, Cabernet Sauvignon all reduced PM berry disease severity; correlation r² > 0.7 between dsRNA and chemical gold standard
- 179 *E. necator* gene targets patented; 31 confirmed to reduce PM via SIGS; commercial application via backpack sprayer tested successfully [S12]
- **Company:** Varada Agriculture (startup; CDPR-funded IPM field trials ongoing as of 2025) [S12]
- **Formulation:** BioClay (layered double hydroxide nanoparticles) extends dsRNA stability on leaves to 30+ days; protection 20+ days post-spray [S12]

**Status:** Pre-commercial; USDA/CDPR research phase; no EPA registration yet. Expected commercialization ~2026–2028.

#### Drone Application

Drone-based spraying (DJI Agras T30/T50; Rantizo) offers significant advantages in vineyards [S13]:

| Parameter | Ground sprayer | Drone (DJI Agras T50) |
|---|---|---|
| Water use | 300–500 L/ha | 50–70 L/ha (saves 80–90%) |
| Coverage/day | 4–5 ha | 22 ha |
| Post-rain deployment | 2+ days required | 2–3 hr after rain |
| Chemical use | 100% | 30–40% reduction vs. label rate |
| Terrain | Limited on steep slopes | RTK-guided terrain following |

- Switzerland trials (2022–2024): DJI Agras T30 achieved 77.8% pest control effectiveness after first treatment; 75.9% after second; matched/exceeded ground sprayer efficiency [S13]
- Romania (2024): DJI Agras T50 reduced pesticide costs 70%; reduced spray time from 3–4 days to 2.5 hours [S13]
- Drone downwash ensures coverage of both leaf surfaces; particularly valuable for DM management requiring underside coverage

**Regulatory status:** Drone spraying regulated at national level; approved in EU under specific country exemptions; fully commercial in US (FAA Section 107 compliance required).

#### Electrostatic Sprayers

Electrostatically charged spray droplets are attracted to oppositely charged plant surfaces, achieving 2–3× better coverage per liter compared to conventional air-blast sprayers. Particularly valuable for improving coverage on underside of grape leaves (critical for DM control). Limited commercial adoption in vineyards as of 2024.

#### Nano-formulations

Clay nanoparticle (BioClay) delivery systems extend stability of biologicals and RNAi molecules on foliage (see SIGS section above). Early-stage commercial development for conventional fungicides (nano-encapsulated sulfur, copper) showing reduced phytotoxicity and longer residual in greenhouse trials. No commercial products registered for grapes as of 2025.

---

### Organic & Biodynamic Programs

#### USDA NOP Compliant Approach (US Organic)

Must use OMRI-listed or certified materials. Core spray program:

**Downy mildew:**
- Fixed copper (Kocide 3000, Cueva, Nordox): Backbone; apply preventively [S15]
- Potassium phosphonates (Rampart, Organiphite): Limited; not all NOP certifiers allow; check [S2]
- Copper + sulfur tank mix: Improved DM cluster control vs. copper alone under high pressure [S27]

**Powdery mildew:**
- Sulfur (wettable, micronized, flowable): Primary tool [S7, S9]
- Potassium bicarbonate (Kaligreen, MilStop): Eradicant supplemental [S9]
- JMS Stylet Oil: Post-infection activity; 10–14 day gap from sulfur [S9]
- Regalia: SAR elicitor; moderate activity; best in rotation [S8]
- Serenade OPTI / Stargus / Double Nickel: Biofungicides; most effective in rotation with sulfur/copper [S3]

**Approved vs. not:**

| Material | OMRI/NOP | Notes |
|---|---|---|
| Sulfur | ✓ | Elemental sulfur; no synthetic additives |
| Copper (fixed) | ✓ | All forms; track usage for accumulation |
| Potassium bicarbonate | ✓ | PM only |
| Bacillus products (OMRI-listed) | ✓ | Check specific product's OMRI listing |
| JMS Stylet Oil | ✓ | Paraffinic mineral oil (narrow window acceptable) |
| Regalia | ✓ | Plant extract |
| Laminarin | ✓ (EU) | Check US certifier |
| Mancozeb | ✗ | Synthetic; prohibited |
| All synthetic fungicides | ✗ | Prohibited |

#### EU Organic Regulation (EC 2018/848 + Implementing Reg. 2021/1165)

Lists permitted active substances for organic plant protection. Key permitted materials for grape DM/PM [S5, S6]:

- Copper compounds (all forms): Permitted; 28 kg/ha/7-year cap [S5]
- Sulfur: Permitted; no quantity limit
- Potassium bicarbonate: Permitted
- Laminarin (Vacciplant): Permitted [S26]
- *B. subtilis* (Serenade): Permitted
- *Ampelomyces quisqualis* (AQ10): Permitted
- Basic substances (sodium bicarbonate, lecithin, whey): Permitted

**Mancozeb, captan, ziram, most synthetic fungicides: NOT PERMITTED** in EU Organic. [S30]

#### Demeter Biodynamic Certification

Follows EU Organic rules with additional restrictions:

- Copper: Max 3 kg/ha/yr averaged over 5 years (stricter than EU Organic 4 kg/ha/yr cap) [S5]
- Copper use requires documentation of necessity; preference for lower-rate formulations
- Biodynamic preparations (501 horn silica, 500 horn manure, compost preparations 502–507): Used alongside conventional organic sprays; hypothesized to enhance plant vitality and immune response
- No scientific evidence that biodynamic preparations provide direct fungal disease control; effect may be indirect via soil health [S24]

**Example Demeter vineyards:** Domaine Leflaive (Burgundy) — full biodynamic since 1997; copper within strict limits; canopy management central to disease strategy [S5].

---

### Efficacy Trials & Cost Comparisons

#### Cornell Grape Pathology 5-Year Program Trials (2020–2024)

**Location:** Geneva, NY (high-pressure eastern US conditions)
**Conclusions:**
- Biofungicide-only programs: Acceptable control under low-moderate pressure; not recommended as standalone in high-pressure years for DM
- Mixed programs (2+ biofungicides/season): **Statistically equivalent** to all-conventional programs for both PM and DM on Chardonnay
- No significant difference between 4 timing patterns of biofungicide placement in season (early, late, critical window-centered, or bracketed)
- **Biofungicides work best when used first in the rotation** (pre-conventional), not as a last resort [S3]

**Cost comparison (Cornell Combs 2022):**
- Average biofungicide material cost: ~$33–40/A/application
- Average conventional fungicide material cost: ~$26/A/application
- Mixed programs competitive when factoring resistance management value [S4]

**Best-performing biofungicide rotations included:** LifeGard WG, Howler, Stargus, Regalia, Serenade ASO alternated with Zampro, Vivando, Quintec, Revus [S2, S3]

#### UC Davis 2024 Powdery Mildew Trial (Eskalen Lab)

**Location:** Plant Pathology Field Station, UC Davis; Chenin Blanc; 2024 season
**Untreated control:** 100% incidence, 89.2% severity
**Top performers (Group I conventional/pre-mixed):**
- FRAC 3+7 combinations (Aprovia Top), FRAC 3+9, FRAC 3+11: <8% incidence (<0.5% severity)
- Luna Experience (7+3), Quintec (13), Torino (U6), Vivando (U8): <15% incidence
- Pristine (7+11): Excellent control despite known FRAC 11 resistance (FRAC 7 component carrying)
**Biologicals (Group II):** Variable; best performers included mixtures of biofungicides+organics+adjuvants; standalone biologicals (sulfur, Regalia, biologicals alone) generally 50–100% incidence [S23]

#### Turkey (Bursa Province) 2021–2022 UC Davis Model Validation

UC Davis risk-index model vs. classical phenology model vs. DSS model:

| Model | Sprays | Cluster efficacy (2021) | Cluster efficacy (2022) | Leaf efficacy |
|---|---|---|---|---|
| UC Davis risk index | 8 | 90.4% | 89.8% | ~78% |
| Classical phenology | 6–7 | 77.9% | 73.5% | ~81% |
| DSS model | 4–5 | 52.6% | 55.1% | ~39% |

UC Davis model = fewest residue exceedances when properly timed; classical model adequate with fewer sprays; DSS model insufficient under high pressure [S22].

#### Oregon UV-C SARE Trial (2020–2023)

- UV-C alone: Significant PM reduction in all years; NOT sufficient as standalone replacement in Willamette Valley
- UV-C + reduced fungicide program: Best combined outcome; allows spray interval extension
- UV-C: Does NOT provide DM control [S11]

#### Washington State Biopesticide + Leaf Removal Trial

Moyer et al. (WSU): Biofungicide program + 1 synthetic at bloom → comparable PM control to all-synthetic program. Fruit-zone leaf removal at pre-bloom or bloom improved efficacy of biopesticide programs [S19].

---

## Datasets & Live Resources

| Resource | Content | URL |
|---|---|---|
| Cornell Grape Pathology Efficacy Trials (2020–2024) | Annual disease trial reports; NY wine/grape | https://blogs.cornell.edu/goldlab/seasonal-fungicide-efficacy-trials/ |
| UC Davis IPM Fungicide Timing Guide (2025) | Efficacy ratings; timing; resistance notes | https://ipm.ucanr.edu/pdf/pmg/fungicideefficacytiming.pdf |
| Ohio State Grape Fungicide Spray Guide | FRAC, PHI, REI table; growth stage program | https://ohiograpeweb.cfaes.ohio-state.edu/sites/grapeweb/files/imce/pdf_factsheets/2020Grape-Fungicide-Spray-Guide-FINAL.pdf |
| Cornell Grape Disease Control (Spring 2023) | Resistance status; biofungicide updates | https://blogs.cornell.edu/grapes/ipm/diseases/grape-disease-control-spring-2023/ |
| FRAC Code List | Official FRAC group assignments; resistance risk | https://www.frac.info/working-group/frac-code-list |
| EU Pesticide Database | European approval status by active ingredient | https://food.ec.europa.eu/plant/pesticides/eu-pesticides-database_en |
| OMRI Products List | USDA NOP-certified inputs | https://www.omri.org/omri-lists |
| Saga Robotics Thorvald | UV-C commercial program; trial summaries | https://www.sagarobotics.com/grapevine |
| VitiScribe PHI Reference | PHI quick reference by product/FRAC group | https://vitiscribe.com/phi-fungicides-vineyard-common-products |
| EPPO Global Database | European registration/approval status | https://gd.eppo.int/ |
| CDFA / CDPR PIMS | California label database | https://www.cdpr.ca.gov/docs/label/ |

---

## Sources (Open Access)

[S1] Ohio State University / OhioGrapeWeb. "2020 Grape Fungicide Spray Guide." CFAES. URL: https://ohiograpeweb.cfaes.ohio-state.edu/sites/grapeweb/files/imce/pdf_factsheets/2020Grape-Fungicide-Spray-Guide-FINAL.pdf

[S2] Gold K. "Grape Disease Control, Spring 2023." Cornell Fruit Resources / Cornell Grape Pathology Blog. 2023. URL: https://blogs.cornell.edu/grapes/ipm/diseases/grape-disease-control-spring-2023/

[S3] Combs D. "Are We Standing Out in the Field, Or Are We Outstanding in the Field?" Cornell CALS. May 25, 2025. URL: https://cals.cornell.edu/news/2025/05/are-we-standing-out-field-or-are-we-outstanding-field

[S4] Combs D. "Biopesticides for Grape Disease Control." New England Viticulture & Fruit Conference. 2022. URL: https://newenglandvfc.org/wp-content/uploads/2022/12/Grape2_3_Combs.pdf

[S5] Wine with Seth. "Downy Mildew (Péronospora) — Bordeaux Mixture (Copper Sulfate)." 2026. URL: https://www.winewithseth.com/winewiki/downy-mildew-peronospora-bordeaux-mixture-copper-sulfate/

[S6] The Drinks Business. "French ban on copper fungicides puts organic vintners under strain." September 23, 2025. URL: https://www.thedrinksbusiness.com/2025/09/french-ban-on-copper-fungicides-puts-organic-vintners-under-strain/

[S7] GuildSomm (Cole-Johnson S). "Beyond Sulfur: Viticultural Foliar Spray Programs." February 3, 2023. URL: https://www.guildsomm.com/public_content/features/articles/b/samantha-cole-johnson/posts/viticultural-spray-programs-beyond-sulfur

[S8] Penn State Extension Wine & Grapes. "Mid to Late Season Control of Downy and Powdery Mildew." June 24, 2020. URL: https://psuwineandgrapes.wordpress.com/2020/06/24/mid-to-late-season-control-of-downy-and-powdery-mildew-and-bunch-and-sour-rots-in-2020/

[S9] MSU Extension. "Late-Season Fungicide Sprays in Grapes and Potential Effects on Fermentation." September 23, 2011. URL: https://www.canr.msu.edu/news/late_season_fungicide_sprays_in_grapes_and_potential_effects_on_fermentatio

[S10] Saga Robotics. "Grapevine — Thorvald UV-C mildew control." 2024–2025. URL: https://www.sagarobotics.com/grapevine

[S11] SARE Project GW21-219 Final Report. "Managing Grapevine Powdery Mildew with UV-C Light in Oregon." 2023. URL: https://projects.sare.org/project-reports/gw21-219/

[S12] AVF (American Vineyard Foundation). "Spray-Induced Silencing of Grape Powdery Mildew Genes to Reduce Powdery Mildew Growth." AVF Project #2023-2366. April 2025. URL: https://avf.org/research-summary/spray-induced-silencing-of-grape-powdery-mildew-genes-to-reduce-powdery-mildew-growth-avf-project-2023-2366/

[S13] DJI Agriculture. "Supporting Swiss Vineyards with DJI Agriculture Drones." December 9, 2024. URL: https://ag.dji.com/case-studies/agras-t30-vineyard-switzerland

[S14] Poljak et al. "The Legacy of Copper-Based Fungicide Use in Vineyard Soils." *Earth and Environmental Sustainability* 2(2): 154–168. April 2026. DOI: https://doi.org/10.53941/eesus.2026.100011

[S15] VitiScribe (Mitchell S). "PHI for Common Vineyard Fungicides: Quick Reference." 2026. URL: https://vitiscribe.com/phi-fungicides-vineyard-common-products

[S16] Gowan / Corteva. Quintec Fungicide Label. EPA 2023. URL: https://www3.epa.gov/pesticides/chem_search/ppls/033906-00026-20230413.pdf

[S17] MSU Extension. "Regalia — A New Fungicide for Organic and Conventional Disease Control." 2010. URL: https://www.canr.msu.edu/news/regalia_a_new_fungicide_for_organic_and_conventional_disease_control

[S18] Fargro / HortiPro. "AQ10 Biofungicide Booklet 2023." URL: https://fargro.co.uk/media/1f4n3cn3/aq10-booklet-2023.pdf

[S19] Moyer M et al. "Efficacy of Biopesticides and Leaf Removal in Grapevine Powdery Mildew." Washington Wine Research Foundation / WSU. 2016. URL: https://www.washingtonwine.org/wp-content/uploads/2021/05/MoyerBioPesticides.pdf

[S20] MSU Extension (Sabbatini P). "Cutting to the Core: MSU Research Leads a Canopy Innovation in Cool-Climate Viticulture." June 30, 2025. URL: https://www.canr.msu.edu/news/msu-research-leads-canopy-innovation-in-cool-climate-viticulture

[S21] Austrian Wine / PIWI International. "Fungus-Resistant Grape Varieties (PIWI)." URL: https://www.austrianwine.com/our-wine/grape-varieties/fungus-resistant-grape-varieties

[S22] Bakırcı et al. "Comparative Efficiency and Residue Levels of Spraying Programs Against Powdery Mildew in Grapes." *Open Life Sciences*. August 5, 2025. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC12326300/

[S23] Eskalen A et al. "Evaluating Synthetic, Biological, and Organic Fungicides: 2024 Field Trial." UC Davis / UCANR. January 2025. URL: https://ucanr.edu/sites/default/files/2025-01/400376.pdf

[S24] Vallet J et al. "Broad-Spectrum Efficacy and Modes of Action of Two Bacillus Supernatants." *Journal of Fungi* 10(7). July 2024. PMC: PMC11278100. DOI: 10.3390/jof10070xxx

[S25] Gold K. "Potential EPA Action: All Mancozeb Labels Cancelled for Grapes." UGA Viticulture. August 30, 2024. URL: https://viticulture.uga.edu/2024/08/potential-epa-action-all-mancozeb-labels-cancelled-for-grapes/

[S26] Dagostin S et al. "Application of Laminarin and Calcium Oxide for the Control of Grape Powdery Mildew on Vitis vinifera cv. Moscato." *Journal of Plant Diseases and Protection* 2018. DOI: 10.1007/S41348-018-0162-8. Full text: https://iris.unito.it/retrieve/handle/2318/1693678/600690/JPDP-D-18-00069R1%20CLEAN%20prep.pdf

[S27] Langer U et al. "Sulfur — A Potential Additive to Increase the Efficacy of Copper Fungicides Against Downy Mildew." *OENO One* 58(1). January 2024. URL: https://oeno-one.eu/article/view/7429

[S28] Sall M, Wrysinki J, Schickch F. "Temperature-Based Sulfur Applications to Control Grape Powdery Mildew." *California Agriculture*. URL: https://eap.mcgill.ca/CPG_5.htm

[S29] VitisGen3 / Cornell. "VitisGen3 Variety Trial Enhances Biopesticide Management." University of Minnesota. 2023. URL: https://vitisgen3.umn.edu/sites/vitisgen3.umn.edu/files/2023-09/biologicalpesticides-vitisgen.pdf

[S30] Greenpeace Unearthed. "EU banned pesticide trade expands despite promises to end it." September 22, 2025. URL: https://unearthed.greenpeace.org/2025/09/23/eu-banned-pesticide-trade-expands-despite-promises/ [mancozeb EU ban 2020]

[S31] Double A Vineyards. "Fungicide Injury (Sulfur)." 2012. URL: https://doubleavineyards.com/pages/fungicide-injury-sulfur

[S32] VinePair. "Fighting Vineyard Fungal Disease, With and Without Copper." July 6, 2020. URL: https://vinepair.com/articles/organic-viticulture-copper-alternatives/

[S33] Oregon State University Extension. "Evaluating Compatibility of Horticultural Oils and Sulfur with Vineyard." EM9095. URL: https://extension.oregonstate.edu/sites/extd8/files/documents/em9095.pdf

[S34] Mounier M et al. (Scientific Reports). "Reynoutria sachalinensis Extract Elicits SA-Dependent Defense Responses." February 25, 2020. PMC: PMC7042220. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7042220/

[S35] AWRI (Australian Wine Research Institute). "How to Get the Most Out of Copper Sprays." 2022. URL: https://www.awri.com.au/files/attachment/s2291/

[S36] Cornell CALS. "Life After Broad Spectrums … Can We Survive?" May 10, 2024. URL: https://cals.cornell.edu/news/2024/05/life-after-broad-spectrums-can-we-survive

[S37] ext.grapepathology.org. "At Bloom Grape Disease Management Reminders." May 6, 2025. URL: https://ext.grapepathology.org/at-bloom-grape-disease-management-reminders

[S38] UGA Viticulture. "Powdery and Downy Mildew Recommendations." June 29, 2017. URL: https://viticulture.uga.edu/2017/06/powdery-and-downy-mildew-recommendations/

[S39] SARE Project OS21-144. "Grapevine Disease Management with Biopesticides and Cultural Practices." 2024. URL: https://projects.sare.org/project-reports/os21-144/

[S40] Wine Spectator. "France's Organic Winegrowers Confront Copper Ban." January 12, 2026. URL: https://www.winespectator.com/articles/french-organic-winegrowers-confront-copper-ban

---

## Sources (Paywalled — Retrieve via University Credentials)

[P1] Kortekamp A, Welter K. "Copper and sulfur in European viticulture." *Vitis* (Geisenheim). ISSN 0042-7500. Available via Geisenheim University library.

[P2] Stenger et al. "Functional Diversity of the Above-Ground Fungal Community Under Long-Term Integrated, Organic and Biodynamic Vineyard Management." *Environmental Microbiome* 19:89. November 2024. DOI: 10.1186/s40793-024-00625-x. Open access link: https://pmc.ncbi.nlm.nih.gov/articles/PMC11575106/

[P3] Baus-Reichel S et al. "A Method for Phenotypic Evaluation of Grapevine Resistance to P. viticola." *Scientific Reports* 14:xxx. January 2024. DOI: 10.1038/s41598-024-51455-5. PMC: PMC10776754

[P4] Oerke EC. "Crop losses to pests." *Journal of Agricultural Science* 144(1):31–43. 2006. DOI: 10.1017/S0021859605005708. [Cost-per-acre benchmark data]

[P5] Fontaine MC et al. "Copper content and export in European vineyard soils." *Environmental Science & Technology* 55(11):7275–7285. 2021. DOI: 10.1021/acs.est.0c02093

[P6] Gessler C et al. "Plasmopara viticola: a review of knowledge on downy mildew of grapevine and effective disease management." *Phytopathologia Mediterranea* 50(3):3–44. 2011. [Foundational DM management reference]

[P7] Gadoury DM et al. "Grapevine powdery mildew (Erysiphe necator): a fascinating system for the study of the biology, ecology and epidemiology of an obligate biotroph." *Molecular Plant Pathology* 13(1):1–16. 2012. DOI: 10.1111/j.1364-3703.2011.00728.x

[P8] Rossi V et al. "Grapevine downy mildew management and forecasting." *Pest Management Science* 69(12):1326–1338. 2013. DOI: 10.1002/ps.3603

---

*Document compiled: June 2025. Category §5 of the Graft Spray research dossier.*
*Revision recommended after: Each new growing season; any EPA/ANSES/EFSA regulatory action; Cornell annual trial reports (September–October).*
