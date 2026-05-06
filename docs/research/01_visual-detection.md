# Visual Detection — Images & Documentation for Powdery and Downy Mildew

## Summary

Powdery mildew (*Erysiphe necator*) and downy mildew (*Plasmopara viticola*) are the two most economically significant fungal diseases of grapevines worldwide, responsible for heavy yield losses and the bulk of fungicide spending in viticulture. Both diseases are visually distinctive once established, but early-stage symptoms are easily confused with each other and with several look-alike conditions including grape erineum mite damage, herbicide drift, sunburn, nutrient deficiency, and trunk diseases (esca, black rot, anthracnose). Accurate visual identification — knowing which surface of the leaf to inspect, which tissue is diagnostic, and what stage of progression is visible — is the foundational competency for any spray-decision system.

For deep-learning classifier development, at least eight curated labeled image datasets now exist covering one or both diseases, ranging from 99 high-resolution tractor-acquired field images (INRAE/IMS Merlot Downy Mildew Dataset, 2021) to 54,306-image multi-crop repositories (PlantVillage). The critical limitation across almost all current datasets is the absence of a granular 1–10 severity scale: most datasets use binary (healthy/diseased) or 3–4 class schemas. The 2025 GDCNet paper from Frontiers in Plant Science is the first to provide a 7-level adaxial and abaxial severity grading schema on a segmentation dataset of 6,740 leaf images, making it the closest match to the 1–10 scale required by Graft Spray.

Standardized severity scales in current use include the EPPO PP 1/004 and PP 1/31 categorical scales (5–7 classes by % leaf area affected), the Horsfall–Barratt ordinal scale (0–11 grades, widely used in North American research), and the Townsend–Heuberger formula (continuous index computed from a class-weighted count). The USDA does not maintain a distinct grapevine mildew severity scale; USDA-funded work typically uses the Horsfall–Barratt or percent-area methods. None of these maps directly to a 1–10 integer scale, requiring the app to define its own mapping — a documented gap.

Geographic specificity is limited in currently available datasets: INRAE data comes from Bordeaux (Merlot Noir); PlantVillage images were collected under controlled lab conditions on unspecified varieties; GDCNet images are from five Chinese grape varieties. No Napa/Sonoma or Burgundy-specific labeled image datasets were identified in the public literature. Napa Valley Grapegrowers and UC IPM maintain online identification resources specific to California conditions, and UC Davis hosts the Gubler-Thomas Powdery Mildew Risk Index used extensively in Napa/Sonoma, but photographic training datasets from those regions are not publicly archived.

---

## Key Findings

- *Erysiphe necator* infects all green grapevine tissues; primary visual sign is white-to-gray powdery conidia on both leaf surfaces, rachises, and berries, with stem infections producing distinctive brown-to-black web scarring visible on dormant canes. [S1]
- Downy mildew (*P. viticola*) sporulation is exclusive to the abaxial (lower) leaf surface — sporangiophores exit through stomata — making abaxial inspection the definitive field diagnostic step. Adaxial oil spots are the symptom; abaxial white cottony mass is the sign. [S2]
- Powdery mildew develops optimally at 23–30°C with an optimum near 26°C; *does not require free water* for secondary infection (conidia can germinate at low humidity), unlike all other major grapevine diseases. Berries become strongly resistant approximately 3–4 weeks post-bloom in *V. vinifera*. [S3]
- Downy mildew requires free water for zoospore release and stomatal entry; incubation period is 7–12 days post-infection; shoot tips infected early form the diagnostic "shepherd's crook" symptom before white sporulation appears. [S4]
- Flag shoots — partially or fully mildew-coated shoots emerging from latently infected buds — are the earliest spring sign of powdery mildew (genotype A populations) and serve as primary inoculum foci; they typically recur on the same vine in consecutive years. [S3]
- Two *E. necator* genotypes (A and B) have distinct overwintering strategies (mycelium in buds vs. ascospores in chasmothecia on bark), different epidemiological timing, and different fungicide sensitivity profiles; visual symptoms alone cannot distinguish them. [S5]
- Cold-climate hybrid cultivars (Frontenac, Marquette, Frontenac gris, La Crosse) frequently show atypical downy mildew symptoms — necrotic lesions without the oil-spot phase, minimal or absent abaxial sporulation, and resistance to fruit cluster infection — creating a significant diagnostic gap for standard reference imagery. [S6]
- Erineum mite (*Colomerus vitis*) creates puckered adaxial leaf areas with dense abaxial trichome growth that can be confused with downy mildew sporulation; erineum trichomes are darker and wiry with defined margins, whereas downy mildew sporulation is fluffy white and directly beneath yellow oil spots. [S7]
- Esca ("black measles") produces a distinctive interveinal tiger-stripe chlorosis/necrosis pattern on leaves and purple/brown berry spotting; unlike mildews it is a wood disease with apoplectic dieback and cannot be identified by surface inspection alone. [S8]
- The EPPO PP 1/31 scale for *Plasmopara viticola* uses 5 classes (0, 1–5%, 5–25%, 25–50%, >50% leaf area); PP 1/004 for *Erysiphe necator* uses a 7-class scale (1–7, representing <5% to >75%). Neither maps cleanly to a 1–10 ordinal integer scale. [S9]
- The Horsfall–Barratt scale (12 grades, 0–100% infection in logarithmically spaced intervals) is widely used in North American grapevine research; Elanco conversion tables translate grades to percent infection. The Townsend–Heuberger formula ID(%) = Σ(ni × vi) / N × V is frequently applied in European and Turkish trials. [S10]
- The 2025 GDCNet paper (Frontiers in Plant Science) introduced a 7-level adaxial and abaxial severity grading system for downy mildew on a 6,740-image segmentation dataset, calibrated to China's GB/T 17980.122-2004 standard; this is currently the closest public analog to a 1–10 visual severity scale for ML. [S11]
- PlantVillage (54,306 images, 4 grape classes including powdery mildew, black measles, black rot, healthy) is the most widely used benchmark but was captured under controlled lab conditions on a uniform background — domain shift to field conditions causes accuracy to drop substantially (from ~99% lab to ~84% field in reported studies). [S12]
- The INRAE/IMS Merlot Downy Mildew Dataset (99 images, 2592×2048 px, 7-class pixel annotations, field-acquired in Bordeaux at BBCH 75–79) uniquely includes confounding factor labels (wounds, necrosis, chemical burns, nutrient deficiency yellowing) alongside mildew classes. [S13]
- The HERMOS dataset (914 images, Turkey, bounding-box labels, Pascal VOC format) provides powdery mildew + downy mildew + dead arm disease + healthy classes in a single field-collected set; DOI confirmed downloadable at 2.92 GB from Mendeley Data. [S14]
- The Niphad Grape Leaf Disease Dataset (NGLD, 2,726 images from Nashik, India, 256×256 JPEG, 2023–2025) includes powdery mildew (406 images), downy mildew (966 images), bacterial leaf spot, and healthy classes with expert annotation; ResNet-18 validation achieves 96% accuracy. [S15]
- No publicly available labeled image datasets with confirmed Napa, Sonoma, or Burgundy provenance were identified. The Napa Valley Grapegrowers and UC Cooperative Extension provide field identification resources online but do not publish downloadable labeled image corpora. [S1][S4]
- Severity scale gap: no existing public dataset links its image labels to a 1–10 visual severity scale validated against EPPO PP 1/004, Horsfall–Barratt, or Townsend–Heuberger simultaneously. GDCNet's 7-level schema is the best available starting point; Graft Spray will need to define and apply its own crosswalk. [S11]

---

## Detailed Notes

### Powdery Mildew (*Erysiphe necator*) — Visual Identification

**Leaves (Adaxial):**
Early symptoms appear as small chlorotic spots on the upper (adaxial) leaf surface, sometimes with a slightly metallic or shiny sheen before sporulation begins. As the pathogen grows, infected areas develop white, dusty, webby mycelium visible to the naked eye. Colonies can occur singly or coalesce to cover much of the leaf surface. Severely infected leaves develop necrotic blotches, yellow or bronze discoloration, and may drop prematurely. [S3][S1]

**Leaves (Abaxial):**
The abaxial surface shows white powdery conidia chains matching the adaxial colony. Unlike downy mildew, powdery mildew can sporulate on both surfaces. UC IPM notes the pathogen first appears as white, webby mycelium on the lower leaf surface before adaxial symptoms are visible. Late in the season, dark-colored chasmothecia (2–4 mm, black circular fruiting bodies) form on both surfaces. [S4]

**Berries / Clusters:**
Young berries (first 1–2 weeks post-set) are extremely susceptible. The entire berry surface can become coated with white-to-gray powdery conidia. Severe early infection halts epidermal cell growth, causing berry splitting as the interior continues to expand — a distinctive late sign. Berries may appear dull gray or brownish; black web-like necrotic scarring ("russeting") on mature berries indicates past mildew colonies. Chasmothecia (small dark dots visible with hand lens) may appear on berries at the end of the season. Berries become strongly resistant ~3–4 weeks post-bloom in *V. vinifera* but the rachis remains susceptible. [S3][S1]

**Rachises / Cluster Stems:**
Rachises can be covered with gray-to-white powdery mycelium, appearing silvery or blackened under heavy infection. Severe rachis infection causes cluster drop, particularly under mechanical harvest. Powdery mildew on the rachis resembles shoot symptoms. [S4]

**Shoots and Stems (Flag Shoots):**
Shoots arising from latently infected buds emerge as "flag shoots" — heavily coated with white fungal growth, stark white in color, conspicuous in early spring. Less-colonized flag shoots may show infection on a single leaf or one side only. As periderm forms on canes, colonies are killed and produce dark, web-like scars on lignified canes; these red-brown blotchy areas on dormant canes are a retrospective diagnostic sign. [S3][S4]

**Tendrils:**
No specific published visual description for tendrils in isolation was identified in the reviewed sources; tendrils are green tissue and susceptible as shoots; expect similar white powdery mycelium. [Gap noted.]

**Progression Summary (early → late season):**
1. Flag shoot emergence (spring) — white-coated emerging shoot
2. First colonies on young expanding leaves — faint chlorotic spots, then white patches
3. Rachis and berry infection during bloom and pre-bloom — white powdery clusters
4. Colony expansion post-bloom — gray-white coating on leaves and berries; berry splitting if severe
5. Late-season chasmothecia formation — tiny black dots on leaves, berries, rachis
6. Dormant cane scarring — brown-red blotchy lesions visible at pruning

---

### Downy Mildew (*Plasmopara viticola*) — Visual Identification

**Leaves (Adaxial — upper surface):**
First symptoms are roughly circular, shiny, bruised-looking areas slightly darker than surrounding tissue. These rapidly expand to become yellow-to-pale green translucent "oil spots," which eventually turn brown and necrotic, often delimited by veins (giving angular geometry in late stages). Late-season lesions may be smaller than earlier ones. Oil spots can coalesce, turning the leaf bronze or necrotic. [S2][S6]

**Leaves (Abaxial — lower surface):**
This is the definitive diagnostic surface. Under humid conditions, the white, dense, cottony sporulation of *P. viticola* appears directly beneath oil spots, consisting of sporangia borne on branching sporangiophores. Sporulation is exclusive to the abaxial surface, as the pathogen exits only through stomata. Where sporulation is absent (cold-climate hybrids, low humidity), placing a suspected leaf in a moist chamber for 1–3 days will typically induce sporulation. [S2][S6]

**Berries / Clusters:**
Berries are highly susceptible from bloom through ~4 weeks post-bloom. Infected berries of red/black varieties turn color prematurely (pink-red), while white/green varieties turn gray-green (gray rot). Infected berries are covered with white cottony sporulation under high humidity, remain firm and hard when healthy berries soften at veraison, and drop easily. The rachis and pedicels can also be infected, turning brown and causing cluster or partial-cluster drop. [S7][S4]

**Shoots / Shoot Tips:**
Infected shoot tips thicken, curl into a distinctive "shepherd's crook" (also described as similar to the cork-screw of infected inflorescences), and develop white sporulation on the stem under humid conditions. Tips eventually turn brown and die back. [S4][S7]

**Inflorescences:**
Inflorescences are highly susceptible. Severe infection turns them yellow, then brown, and they dry out and drop completely — a catastrophic early-season event. A corkscrew-like twisting is diagnostic. [S7]

**Tendrils and Petioles:**
Affected by the same oily-brown lesions with possible white sporulation under humid conditions; ultimately turn brown, dry up, and drop. [S4]

**Progression Summary:**
1. First oil spots on adaxial surface of young leaves — translucent, green-yellow
2. Abaxial white cottony sporulation beneath oil spots (humid nights/mornings)
3. Shoot tip curling and shepherd's crook — possible sporulation on stems
4. Inflorescence browning and drop — most damaging early-season event
5. Berry infection — white sporulation, premature color change, hard/shriveled
6. Brown necrotic leaf lesions with angular geometry — vein-limited, late season
7. Severe defoliation in untreated vines by late summer

---

### Distinguishing Powdery vs. Downy

| Feature | Powdery Mildew (*E. necator*) | Downy Mildew (*P. viticola*) |
|---|---|---|
| **Leaf surface affected** | Both surfaces | Adaxial symptoms; abaxial sporulation only |
| **Mycelium location** | Entirely external (epiphytic) | Internal; sporulation exits via stomata |
| **Sporulation appearance** | White/gray, dusty, powdery | White, fluffy, cottony, dense |
| **Leaf symptom type** | Chlorotic patches → gray powder coating | Oil spots (translucent yellow) → necrosis |
| **Requires free water?** | No (secondary spread is dry) | Yes (zoospores need liquid water) |
| **Optimal conditions** | 23–30°C, moderate-low humidity | 10–30°C, free water 1–4 hrs, moist |
| **Berry resistance onset** | ~3–4 weeks post-bloom | ~4 weeks post-bloom |
| **Diagnostic early sign** | Flag shoot (spring) | Shepherd's crook on shoot tips |
| **Late-season cane sign** | Brown-red web scarring on dormant canes | None specific |
| **Fruiting bodies visible** | Chasmothecia (black dots, hand lens) | None macroscopically diagnostic |
| **Kingdom** | Ascomycete fungus | Oomycete (water mold) — not a true fungus |

Sources: [S1][S2][S3][S4][S7]

---

### Look-Alike Confounders

**1. Grape Erineum Mite (*Colomerus vitis*)**
- **Adaxial**: Puckered or blistered depressions (erinea) on leaf surface, often looking like virus symptoms
- **Abaxial**: Dense whitish-to-rust trichome mats (erinea) that superficially resemble downy mildew sporulation
- **Distinguish**: Erineum trichomes are attached to the leaf (not wipeable), wiry, and become rust-colored with age; there is no oil spot on the adaxial surface; the puckered depression is raised on top. Downy mildew sporulation wipes off easily and is directly beneath a yellow adaxial spot. PNW Handbooks note this is one of the most common misdiagnoses. [S7]

**2. Herbicide Damage (especially 2,4-D drift)**
- **Symptoms**: Distorted, cupped, elongated or strap-like leaves; mottled yellowing; stunted shoot tips; can look like a virus or nutrient deficiency
- **Distinguish**: Typically appears in blocks adjacent to treated areas; affects shoot tip meristems; no powdery or cottony residue; no oil spots. More pronounced deformation than either mildew. [S7]

**3. Sunburn / Heat Bleaching**
- **Symptoms**: Flat, buff-to-white bleached areas on sun-exposed berry or leaf surfaces; may be confused with powdery mildew colonization
- **Distinguish**: Affects exposed surfaces only (south/west-facing side of clusters); no powdery texture; no mycelium under hand lens; sharp border with shaded tissue. [S8]

**4. Nutrient Deficiency (Magnesium, Potassium, Nitrogen)**
- **Symptoms**: Interveinal chlorosis (Mg), marginal leaf scorch (K), general yellowing (N) — may resemble oil spots or late-stage mildew lesions
- **Distinguish**: Nutrient deficiency patterns are systemic (whole vine, lower canopy first for Mg), not focal; no sporulation; no oil spots; respond to fertilization. [S13]

**5. Esca (Black Measles)**
- **Symptoms**: Interveinal "tiger stripe" chlorosis → necrosis on leaves; purple/brown berry spotting (measles symptom); apoplectic sudden dieback
- **Distinguish**: Esca is a wood disease — cross-section of affected cane shows dark staining in vascular tissue; tiger stripe pattern is distinctly interveinal; no powdery or cottony surface growth; affects older vines (>5 years). [S8]

**6. Black Rot (*Guignardia bidwellii*)**
- **Symptoms**: Tan circular leaf lesions with brown border (2–10 mm); clusters develop brown rotted berries that mummify (raisin-like); small black pycnidia visible in lesions
- **Distinguish**: Lesion shape is circular with dark margin, not oil-spot or powdery; berries shrivel and mummify rather than showing cottony growth; no adaxial powdery coating. [S7]

**7. Anthracnose (*Elsinoe ampelina*)**
- **Symptoms**: Small round leaf spots → shot-hole pattern; deep elongated cane cankers (grey center, black edge); berry spots (violet → grey with black edge)
- **Distinguish**: Shot-hole leaf pattern unique; cane cankers are deep and angular; no powdery coating or oil spots. [S7]

**8. Phomopsis Cane and Leaf Spot (*Diaporthe ampelina*)**
- **Symptoms**: Small dark spots on leaves; elongated black lesions on basal cane internodes; can look like dormant powdery mildew scarring on canes
- **Distinguish**: Phomopsis lesions on canes are black, sharply margined, and appear at the base of the shoot; powdery mildew cane scarring is a diffuse red-brown web-like pattern distributed along the cane. [S8]

---

### Severity Scales — Mapping to a 1–10 System

**Existing Published Scales**

| Scale | System | Classes | Application to Grapevine Mildew |
|---|---|---|---|
| EPPO PP 1/004 | Categorical % area | 7 classes: 1=none, 2=<5%, 3=5–10%, 4=10–25%, 5=25–50%, 6=50–75%, 7=>75% | For powdery mildew on leaves and bunches |
| EPPO PP 1/31 | Categorical % area | 5 classes: 1=none, 2=1–5%, 3=5–25%, 4=25–50%, 5=>50% | For downy mildew (*Plasmopara viticola*) |
| Horsfall–Barratt | Ordinal (0–11 grades) | 12 grades on logarithmic scale, 0–100%; Elanco conversion tables translate to % | Used in North American vine disease research (VT, NY) |
| Townsend–Heuberger | Formula-derived % | ID(%) = Σ(ni × vi) / N × V; typically 5–9 damage classes | Used in European/Turkish fungicide trials on grapevine mildews |
| GDCNet (2025) | 7-level lesion grade | z0/f0 = healthy; z1–z7/f1–f7 = 7 lesion severity grades (adaxial/abaxial separately) | Downy mildew only; calibrated to China GB/T 17980.122-2004 |
| USDA | No distinct mildew scale | Typically uses % area or adapted Horsfall–Barratt | Not a separate published standard |

**Proposed 1–10 Mapping for Graft Spray**

The following crosswalk maps a 1–10 integer scale to the existing EPPO PP 1/004 and Horsfall–Barratt systems. It is an expert-defined mapping and should be validated with field imagery:

| Graft Score | % Leaf/Berry Area Infected | EPPO PP 1/004 Class | Horsfall–Barratt Grade | Visual Description |
|---|---|---|---|---|
| 1 | 0 | 1 (none) | 0 | No symptoms — healthy tissue |
| 2 | Trace <1% | Between 1–2 | 1 | Single colony or few scattered spores, hand-lens only |
| 3 | 1–5% | 2 | 2–3 | Early flag shoot or first small colonies, visible to eye |
| 4 | 5–10% | 3 | 3–4 | Multiple coalescing colonies, moderate early infection |
| 5 | 10–25% | 4 | 4–5 | Widespread leaf coating, berries showing gray patches |
| 6 | 25–50% | 5 | 5–6 | >25% canopy affected, berry splitting beginning |
| 7 | 50–75% | 6 | 7 | Majority of leaf area affected, significant cluster infection |
| 8 | 75–90% | 7 | 8–9 | Near-complete leaf coating, severe berry cracking |
| 9 | 90–99% | 7 | 10 | Extensive defoliation, most berries compromised |
| 10 | ~100% | 7 | 11 | Total crop loss, vine health critically affected |

**Documented Gaps:**
- No existing dataset provides labeled images on all 10 proposed severity levels for both powdery and downy mildew simultaneously.
- GDCNet provides 7 downy mildew levels (adaxial and abaxial separately) but no powdery mildew grading.
- EPPO PP 1/004 and Horsfall–Barratt do not distinguish severity on berries vs. leaves with separate scales.
- No Napa/Sonoma or Burgundy-specific severity imagery datasets exist in the public domain.
- The 1–10 crosswalk above requires expert validation against real field imagery before deployment.

Sources: [S9][S10][S11][S16]

---

### Sample Imagery Inventory (what we saved to assets/)

All images saved to `/home/user/workspace/graft-spray/research/assets/01_visual-detection/`

| Filename | Subject | Source | License | Notes |
|---|---|---|---|---|
| `DM_02_wikipedia_abaxial_sporulation.jpg` | Downy mildew abaxial sporulation, classic white cottony mass | Wikipedia (Commons) | CC-BY-SA | High-res 2272×1704 px |
| `DM_03_pnw_downy_mildew.jpg` | Downy mildew field photo, PNW | PNW Pest Mgmt Handbooks | Fair use (educational) | Very high res 5318×2892 px |
| `DM_04_aps_disease_cycle.jpg` | Downy mildew disease cycle diagram | APS (American Phytopathological Society) | All rights reserved — reference only | Schematic diagram |
| `DM_05_ontario_sporulating_spots.jpg` | Sporulating downy mildew oil spots | Ontario Crop IPM | Crown copyright | Good field example |
| `DM_06_koppert_dm_abaxial.jpg` | Downy mildew abaxial with spore formation | Koppert | Koppert copyright — reference only | High-contrast close-up |
| `PM_05_koppert_pm.jpg` | Powdery mildew on grapevine | Koppert US | Koppert copyright — reference only | General colony image |
| `PM_06_nmsu_pm.jpg` | Powdery mildew, NMSU extension | New Mexico State University | Educational fair use | Cluster/leaf overview |
| `PM_07_bugwood_gm_cluster.jpg` | Powdery mildew on cluster (Holmes/Bugwood) | Bugwood.org (G. Holmes) | CC-BY-3.0 | Berry infection, good severity |
| `PM_08_bugwood_gm_stem.jpg` | Powdery mildew stem lesions (Holmes/Bugwood) | Bugwood.org (G. Holmes) | CC-BY-3.0 | Brown stem lesions |

**Cornell CALS images** (PM leaf adaxial/abaxial, berries split, berries chasmothecia, DM hero): URL confirmed at `cals.cornell.edu/sites/default/files/2025-04/` but returned 0-byte files — likely require institutional session cookies. Accessible via direct browser at: https://cals.cornell.edu/integrated-pest-management/outreach-education/fact-sheets/grapevine-powdery-mildew-erysiphe-necator-fruit-fact-sheet

**iNaturalist**: Browse field observations at https://www.inaturalist.org/taxa/383694-Plasmopara-viticola/browse_photos (open CC-BY-NC) — individual photo downloads require authentication.

---

## Datasets & Live Resources

### Labeled Image Datasets for ML Training

| # | Name | Paper / Citation | License | Image Count | Label Schema | Lab vs Field | Resolution | Year | Download URL | Download Status |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | **PlantVillage** (grape subset) | Hughes & Salathé, 2016, *PLOS ONE*, arXiv:1511.08060 | CC0 (public domain) | ~4,062 grape images (54,306 total; grape classes: Black Rot, Esca/Measles, Leaf Blight, Healthy — **no PM or DM class labeled**) | 4-class classification (no PM/DM for grape) | Lab (controlled background) | ~256×256 JPEG | 2016 | https://github.com/spMohanty/PlantVillage-Dataset or https://github.com/gabrieldgf4/PlantVillage-Dataset | **Downloadable via GitHub git clone — confirmed open** |
| D2 | **INRAE/IMS Merlot Downy Mildew Dataset** | Abdelghafour et al., *Data in Brief* 37, 107250 (2021), PMC8258852 | Not stated (data "with the article") | 99 high-res images (95 annotated) | 7-class pixel-wise annotation: foliar mildew, berries mildew, healthy leaf, healthy berry, vine shoot, leaf border, anomalies | Field (Bordeaux experimental vineyard, tractor-mounted camera) | 2592×2048 px (~4 px/mm) | 2021 | Supplementary: doi.org/10.1016/j.dib.2021.107250 (mmc1.zip, 191.9 MB) | **Accessible — requires ScienceDirect account or institutional access to download supplementary** |
| D3 | **HERMOS** (Gediz River Basin, Turkey) | Özacar T., Mendeley Data (2021), DOI: 10.17632/j4xs3kh3fd.2 | Not stated on page (Mendeley default CC-BY) | 914 images / 13,904 bounding-box labels | 4-class bounding box (Pascal VOC XML): PM, DM, dead arm (Phomopsis), healthy | Field (West Anatolia vineyards) | Not specified | 2021 | https://data.mendeley.com/datasets/j4xs3kh3fd | **Downloadable — 2.92 GB confirmed accessible** |
| D4 | **Niphad Grape Leaf Disease Dataset (NGLD)** | Dharrao et al., *Data in Brief* (2025), DOI: 10.17632/8nnd2ypcv3.5 | CC-BY (Mendeley default) | 2,726 images | 4-class: PM (406), DM (966), Bacterial Leaf Spot (100), Healthy (1,254) | Field (Nashik, Maharashtra, India, 2023–2025) | 256×256 JPEG | 2025 | https://data.mendeley.com/datasets/8nnd2ypcv3/5 | **Downloadable from Mendeley Data — open access confirmed** |
| D5 | **PlantDoc** | Sing et al., CoDS-COMAD 2020, arXiv:1911.10317 | MIT License | 2,598 total (grape leaf included; mix of diseases across 13 species) | Up to 17 disease classes; grape included but PM/DM may be combined with other diseases | Field (internet-sourced images) | Variable | 2019 | https://github.com/pratikkayal/PlantDoc-Dataset | **Downloadable via GitHub — confirmed open** |
| D6 | **GDCNet / GDCData + GDSData** | Liu et al., *Frontiers in Plant Science* 16: 1688315 (2025), doi: 10.3389/fpls.2025.1688315 | Not stated (data available from authors "without undue reservation") | 6,740 segmentation images (from 674 original augmented ×10); GDCData: 5,392 classification images | 8-class per surface (z0/f0=healthy + z1–z7/f1–f7 = 7 severity grades, adaxial/abaxial separately); GDSData: 9-class semantic segmentation | Field (5 Chinese variety vineyards) | Original 2592×2048 px; processed 512×512 | 2025 | Contact corresponding author (CZ); no public repository URL confirmed | **Contact-required — no public URL yet. Correspond via Frontiers article** |
| D7 | **IDADP Grape Disease Dataset** | ScienceDB (undated), DOI not confirmed | Not stated | 3,622 images (7 disease types including PM and DM) | 7-class classification including PM and DM | Field | Not stated | ~2021–2022 | https://www.scidb.cn/en/detail?dataSetId=76b39c9c435d4035b5076412c2ddcb61 | **Accessible from ScienceDB — may require free account** |
| D8 | **Embrapa WGISD** (Wine Grape Instance Segmentation Dataset) | Santos et al., *Frontiers in Plant Science* 2019, doi: 10.3389/fpls.2019.00663; Zenodo DOI: 10.5281/zenodo.3361736 | CC-BY-NC 4.0 | 300 images / 4,432 cluster instances (5 grape varieties; disease labels NOT included — cluster detection only) | Instance segmentation (cluster bounding polygons); no disease class labels | Field (single winery, Brazil) | Variable | 2019 | https://zenodo.org/records/3361736 ; https://github.com/thsant/wgisd | **Downloadable — confirmed open (non-commercial)** |

**Note on PlantVillage grape classes:** The original PlantVillage dataset labels grape leaves as: *Grape__Black_rot*, *Grape__Esca_(Black_Measles)*, *Grape__Leaf_blight_(Isariopsis_Leaf_Spot)*, and *Grape__healthy*. Powdery mildew and downy mildew are **not included** in the grape class, though they appear in other plant species. Some Kaggle mirrors and papers incorrectly claim PlantVillage contains grape PM/DM — verify labels before use.

### Live Reference / Photo Gallery Resources

| Name | Type | Region | Access | URL | License |
|---|---|---|---|---|---|
| Cornell CALS IPM Fact Sheets | Disease ID fact sheets with photos | Northeast US | Open (web) | https://cals.cornell.edu/integrated-pest-management/outreach-education/fact-sheets/grapevine-powdery-mildew-erysiphe-necator-fruit-fact-sheet | © Cornell University |
| UC IPM Grape Pest Management Guidelines | Identification + spray guides, photos | California (Napa/Sonoma priority) | Open (web) | https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ ; https://ipm.ucanr.edu/agriculture/grape/downy-mildew/ | © UC Regents |
| PNW Pest Management Handbooks — Grape | ID guides, look-alike photos, spray info | Pacific Northwest | Open (web) | https://pnwhandbooks.org/plantdisease/host-disease/grape-vitis-spp-downy-mildew | CC-BY (Oregon State) |
| Canada Agriculture Disease ID Guide | Comparative guide with photos | Eastern Canada | Open (web) | https://agriculture.canada.ca/en/agricultural-production/crop-protection/agricultural-pest-management-resources/identification-guide-major-diseases-grapes | Crown copyright |
| Wisconsin Fruit — Photo Guide Cold-Climate Grapes | Season-long photo guide PM/DM/Black Rot | Great Lakes / hybrid varieties | Open PDF | https://fruit.wisc.edu/wp-content/uploads/sites/36/2017/04/Photo-guide-to-diseases-of-cold-climate-grapes-final3.pdf | © UW-Madison Extension |
| iNaturalist — *Plasmopara viticola* | Crowdsourced field photos with GPS | Global (many Napa/Sonoma, Burgundy) | Open (CC-BY-NC) | https://www.inaturalist.org/taxa/383694-Plasmopara-viticola/browse_photos | CC-BY-NC per photo |
| iNaturalist — *Erysiphe necator* | Crowdsourced field photos | Global | Open (CC-BY-NC) | https://www.inaturalist.org/taxa/55928-Erysiphe-necator/browse_photos | CC-BY-NC per photo |
| Bugwood.org Forestry Images | Professional disease photos | Global | Open (CC-BY-3.0) | https://www.bugwood.org (search Erysiphe necator) | CC-BY-3.0 |
| Napa Valley Vintners Powdery Mildew Dashboard | Real-time risk index + regional data | Napa Valley, CA | Open (web) | https://napa.westernweathergroup.com/e8cf29e78a1b45cf9bbead44456649b4 | © Western Weather Group |
| APS Plant Health Progress — Cold-Climate DM Guide | Open-access field ID guide with photos | Northern US hybrids | Open (web) | https://apsjournals.apsnet.org/doi/10.1094/PHP-01-17-0009-DG | © APS |

---

## Sources (Open Access)

| # | Title | Author/Org | Year | Type | URL |
|---|---|---|---|---|---|
| S1 | Grapevine Powdery Mildew (*Erysiphe necator*) Fruit Fact Sheet | Cornell CALS IPM | 2025 | Fact sheet | https://cals.cornell.edu/integrated-pest-management/outreach-education/fact-sheets/grapevine-powdery-mildew-erysiphe-necator-fruit-fact-sheet |
| S2 | Distinctive Symptoms and Signs of Downy Mildew on Cold-Climate Grapevines | Schilder et al. | 2017 | APS Plant Health Progress article | https://apsjournals.apsnet.org/doi/10.1094/PHP-01-17-0009-DG |
| S3 | Grapevine powdery mildew (*Erysiphe necator*): a fascinating system for the study of the biology, ecology and epidemiology of an obligate biotroph | Gadoury et al. | 2011 | Review, *Molecular Plant Pathology* | https://pmc.ncbi.nlm.nih.gov/articles/PMC6638670/ |
| S4 | Downy Mildew / Grape / Agriculture — UC IPM | UC ANR / UC Davis | 2017 | Extension guideline | https://ipm.ucanr.edu/agriculture/grape/downy-mildew/ |
| S4b | Powdery Mildew / Grape / Agriculture — UC IPM | UC ANR / UC Davis | 2017 | Extension guideline | https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ |
| S5 | A Fresh Look at Grape Powdery Mildew (*Erysiphe necator*) A and B Genotypes | Váczy et al. | 2020 | Research article, *Plants* (MDPI) | https://pmc.ncbi.nlm.nih.gov/articles/PMC7570353/ |
| S6 | Distinctive Symptoms and Signs of Downy Mildew on Cold-Climate Grapevines — Full | Schilder et al. | 2017 | APS open-access article with photos | https://apsjournals.apsnet.org/doi/10.1094/PHP-01-17-0009-DG |
| S7 | Grape (Vitis spp.)-Downy Mildew — PNW Pest Mgmt Handbooks | Oregon State / PNW Extension | 2024 | Online guideline | https://pnwhandbooks.org/plantdisease/host-disease/grape-vitis-spp-downy-mildew |
| S8 | Esca (Black Measles) / Grape — UC IPM | UC ANR / UC Davis | 2015 | Extension guideline | https://ipm.ucanr.edu/agriculture/grape/esca-black-measles/ |
| S9 | EPPO PP 1/004 — Efficacy Trials for Fungicides on Grapevines (Powdery Mildew) | EPPO | 2004 | Standard (via Scribd) | https://www.scribd.com/document/109325735/pp1-004-e |
| S10 | Differences in incidence and severity of powdery mildew and downy mildew (Horsfall-Barratt) | Berkett et al. / UVM | 2009 | Conference proceedings PDF | https://www.uvm.edu/~orchard/fruit/pubs/09Berkett_INRA_GrapePM_DM.pdf |
| S11 | Grading for grapevine downy mildew and feature extraction methods for predicting abaxial lesions from adaxial leaf images (GDCNet, 6,740 images) | Liu et al. | 2025 | Research article, *Frontiers in Plant Science* | https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2025.1688315/full ; PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC12586135/ |
| S12 | An Open Access Repository of Images on Plant Health (PlantVillage) | Hughes & Salathé | 2016 | Dataset paper, arXiv | https://github.com/spMohanty/PlantVillage-Dataset |
| S13 | An annotated image dataset of downy mildew symptoms on Merlot grape variety (INRAE/IMS dataset) | Abdelghafour et al. | 2021 | Dataset paper, *Data in Brief* | https://pmc.ncbi.nlm.nih.gov/articles/PMC8258852/ |
| S14 | HERMOS: An Annotated Image Dataset for Visual Detection of Grape Leaf Diseases | Özacar T. | 2021 | Dataset, Mendeley Data | https://data.mendeley.com/datasets/j4xs3kh3fd |
| S15 | Grapes leaf disease dataset for precision agriculture (NGLD) | Dharrao et al. | 2025 | Dataset paper, *Data in Brief* | https://pmc.ncbi.nlm.nih.gov/articles/PMC12210286/ |
| S16 | Determination of downy mildew and powdery mildew severity (Townsend-Heuberger formula application) | Yıldız et al. | 2017 | Research article, *South African Journal of Enology and Viticulture* | http://www.scielo.org.za/scielo.php?script=sci_arttext&pid=S2224-79042017000100002 |
| S17 | Photo Guide to Diseases of Cold-Climate Grapes (UW-Madison, season-long) | Smiley et al. / Wisconsin Extension | 2017 | Photo guide PDF | https://fruit.wisc.edu/wp-content/uploads/sites/36/2017/04/Photo-guide-to-diseases-of-cold-climate-grapes-final3.pdf |
| S18 | Identification Guide to the Major Diseases of Grapes | Agriculture Canada | 2018 | Identification guide | https://agriculture.canada.ca/en/agricultural-production/crop-protection/agricultural-pest-management-resources/identification-guide-major-diseases-grapes |
| S19 | Automated detection of downy mildew and powdery mildew symptoms in grapevines | Ghiani et al. | 2025 | Research article, *Smart Agricultural Technology* | https://www.sciencedirect.com/science/article/pii/S2772375525001108 |
| S20 | How to Identify Downy Mildew vs. Powdery Mildew in Grapevines | Wikifarmer | 2025 | Reference article | https://wikifarmer.com/library/en/article/how-to-identify-downy-mildew-vs-powdery-mildew-in-grapevines-practical-guide-for-farmers |
| S21 | Grapevine Downy Mildew Fact Sheet — Cornell CALS | Cornell CALS IPM | 2025 | Fact sheet | https://cals.cornell.edu/integrated-pest-management/grapevine-downy-mildew-plasmopara-viticola-fruit-fact-sheet |
| S22 | Embrapa WGISD — Wine Grape Instance Segmentation Dataset | Santos et al. / Embrapa | 2019 | Dataset paper + Zenodo | https://zenodo.org/records/3361736 |
| S23 | PlantDoc: A Dataset for Visual Plant Disease Detection | Singh et al. | 2020 | Dataset/conference paper | https://github.com/pratikkayal/PlantDoc-Dataset |
| S24 | Machine Learning-Based Classification of Powdery Mildew Severity | Pérez-Roncal et al. (hyperspectral) | 2020 | Research article, *Image and Signal Processing* | https://pmc.ncbi.nlm.nih.gov/articles/PMC7340913/ |
| S25 | Grapevine Disease Dataset (environmental sensor dataset) | Gawande et al. | 2024 | Dataset paper, *Data in Brief* | https://pmc.ncbi.nlm.nih.gov/articles/PMC11190471/ |
| S26 | METOS Disease Models — Grapevine | Pessl Instruments | 2025 | Online reference | https://metos.global/en/disease-models-grapevine/ |
| S27 | Effects of Different Fungicide Treatments on Grape (Townsend-Heuberger, 9-class scale) | SINAB/CRA-PAV | ~2010 | Technical report PDF | https://sinab.it/wp-content/uploads/2024/10/UO-1-3-CRA-PAVa9.pdf |
| S28 | Embrapa — Database brings photos on agricultural diseases (Digipathos) | Embrapa | 2019 | News article | https://www.embrapa.br/en/busca-de-noticias/-/noticia/42625970/database-brings-photos-and-information-about-main-agricultural-diseases |
| S29 | Napa Valley Grapegrowers — Grapevine Diseases | Napa Valley Grapegrowers | 2024 | Industry resource | https://www.napagrowers.org/grapevine-diseases.html |

---

## Sources (Paywalled — Retrieve via University Credentials)

| # | Title | Author/Org | Year | Type | DOI | Publisher | URL | Why It Matters |
|---|---|---|---|---|---|---|---|---|
| P1 | EPPO Standard PP 1/004 (4th ed.) — Efficacy evaluation of fungicides: Erysiphe necator on grapevine | EPPO | 2004 | Regulatory standard | Not applicable (EPPO publication) | EPPO | https://www.eppo.int/RESOURCES/eppo_standards/pp1 | Defines the official 7-class European severity assessment scale for powdery mildew on grapevines; required reference for regulatory trials and any severity scale crosswalk |
| P2 | Improved classification accuracy of powdery mildew infection levels of wine grapes by spatial-spectral analysis of hyperspectral images | Knauer et al. | 2017 | Research article | 10.1186/S13007-017-0198-Y | Plant Methods / BioMed Central | https://plantmethods.biomedcentral.com/articles/10.1186/s13007-017-0198-Y | Provides hyperspectral imaging approach to classify PM infection levels on Chardonnay bunches; relevant to severity quantification for ML without manual scoring |
| P3 | A Deep-Learning-Based Real-Time Detector for Grape Leaf Diseases (GLDD dataset, 4,449 images) | Tang et al. | 2020 | Research article | 10.3389/fpls.2020.00751 | Frontiers in Plant Science | https://pmc.ncbi.nlm.nih.gov/articles/PMC7285655/ | Documents the GLDD (4,449 original, 62,286 augmented images) for Black rot, Esca, Leaf blight, Mites — benchmark for non-PM/DM grape diseases; useful for training look-alike detection |
| P4 | Disease Susceptibility of Cold-Climate Grapes in Vermont | Hazelrigg et al. | 2018 | Pre-publication PDF | N/A | ISHS | https://www.uvm.edu/~orchard/fruit/pubs/18Hazelrigg_ISHS_GrapeDiseasePrePub.pdf | Demonstrates Horsfall-Barratt scale application for severity rating in PM/DM on cold-climate cultivars; relevant methodology for severity ground-truth data collection |

