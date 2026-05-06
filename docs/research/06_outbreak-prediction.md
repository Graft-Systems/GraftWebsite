# Outbreak Prediction Models for Powdery and Downy Mildew

> **Graft Spray Project — Category 6**  
> Umbrella goal: "Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying."  
> This document is the technical recipe for the app's forecasting engine: full equations, decision rules, input variable lists, and citations to validation studies.

---

## Summary

Two fungal diseases dominate spray decisions in most of the world's wine regions:

- **Powdery mildew** (*Erysiphe necator* syn. *Uncinula necator*): an obligate biotrophic ascomycete. Does **not** require free water for conidial infection; driven by moderate temperature (21–30 °C) and a relative humidity > 40 %. Primary season is controlled by ascospore release from chasmothecia; secondary season by conidial cycling.
- **Downy mildew** (*Plasmopara viticola*): an oomycete. **Does** require free water (leaf wetness or rainfall) for zoospore release, dispersal, and stomatal penetration. Primary infections arise from soil-overwintering oospores; secondary cycles from sporangia produced on existing lesions.

Environmental conditions that favour each disease are fundamentally different, which is why the app must run **two parallel forecasting engines**. The gold standard remains mechanistic, weather-driven models calibrated to the pathogen's biology. Modern machine-learning (ML) and hybrid approaches complement—but do not yet replace—these mechanistic engines for real-time spray decisions.

---

## Key Findings

1. **Gubler-Thomas (UC Davis)** is the most validated, most-deployed model for powdery mildew in the world; its 0–100 daily risk index directly drives fungicide interval decisions. The 2013 revision (Gubler et al., *Plant Disease*) raised the high-temperature kill threshold from 35 °C to 38 °C for 2 hours [S2].
2. **Caffi et al. (UCSC)** provide the most biologically complete mechanistic model for downy mildew, with published full equations, hourly time-step, and 93 % accuracy over 43 Italian vineyards × 12 years [S7]. This is the recommended primary engine for DM in Graft Spray.
3. **DMCast** (Park et al., 1997) performs very well for oospore-season primary infection prediction in North America (100 % accuracy over 9 NY years) but has shown 25 % accuracy in Italian validation trials, indicating the 30-year historical rainfall series requirement is a hard practical constraint [S4].
4. **EPI** (Strizyk 1983) remains widely used in France and Europe; it successfully halved treatments in Portuguese validation, but requires site-specific calibration and misses some late-season secondary infections [S6].
5. **RIMpro** is the leading commercial platform; it uses an undisclosed but published-structure mechanistic model with variety susceptibility modifiers and microclimate correction—suitable to evaluate as a benchmark [S9].
6. **Modern ML image classifiers** (CNN/YOLOv5/GDCNet) achieve 73–99 % accuracy for disease detection on leaf images; these are **detection** tools, not **outbreak forecasting** tools. They are valuable for confirming first-infection dates to trigger mechanistic model phase transitions [S15, S16, S17].
7. **Gradient boosting + weather** (Chen et al., 2020, Bordeaux) achieved AUC = 0.86 for leaf incidence prediction and showed >50 % treatment reduction vs. current Bordeaux practices—demonstrating ML's value for **seasonal risk forecasting** rather than daily spray timing [S18].
8. **Hybrid sensor-fusion** (VineAI, Deep Planet + NIAB 2024–2025) using Sentinel-2 + PlanetScope + weather achieved 89.6 %, 93.7 %, 91.5 % accuracy for downy mildew, powdery mildew, and botrytis across UK vineyards [S22].
9. A minimum viable forecasting engine for Graft Spray requires: **hourly temperature**, **hourly relative humidity**, **hourly leaf wetness**, and **daily rainfall**. These four inputs power Gubler-Thomas, Caffi, and the secondary infection model.

---

## Model Comparison Matrix

| Model | Disease | Type | Required Inputs | Output | Validation Region | Accuracy / Metric | Source |
|---|---|---|---|---|---|---|---|
| Gubler-Thomas (1994/2013) | PM | Mechanistic | Hourly T, daily Tmax | 0–100 daily risk index | CA, Chile, Italy | ~3 fewer sprays/yr in CA | [S1][S2] |
| Mills Table (modified) | PM | Empirical table | Daily avg T, leaf wetness hours | Infection probability (yes/no) | CA (UC IPM) | Threshold-based | [S3] |
| Snyder-Sall PMI | PM | Empirical index | Daily Tmin, Tmax | Accumulated powder mildew index; spray at Δ1.0 | CA (raisin, wine) | Threshold-based | [S3] |
| DMCast | DM | Stochastic/empirical | Daily rainfall (21 Sep–31 Mar, 30-yr series), T, leaf wetness | Date of first primary infection | NY (9 yrs 100 %), Italy (25 %) | High NY; low EU | [S4] |
| EPI | DM | Empirical, energy-based | T, RH (diurnal/nocturnal), rainfall; 30-yr climatology | Daily EPI index; cumulative risk | France (Bordeaux), Portugal, Italy | 50 % treatment reduction PT | [S6] |
| POM | DM | Empirical | Daily rainfall (Sep–Mar) | DOM date → epidemic severity | France, Portugal | Robust in some years | [S6] |
| Caffi Primary (UCSC 2009) | DM | Mechanistic (hourly) | Hourly T, rainfall, RH/VPD | Oospore cohort infection probability | N. Italy (43 vineyards × 12 yr) | Acc = 0.93, TPP = 1.0 | [S7] |
| Caffi Secondary (2021) | DM | Mechanistic (hourly) | Hourly T, RH, rainfall, leaf wetness | Sporangia dose + infection severity SEV | N. Italy (3-yr vineyard) | P(P−O−) = 0.87 | [S8] |
| RIMpro-Plasmopara | DM | Mechanistic + variety | T, RH, leaf wetness, rainfall; variety sensitivity | Seasonal disease accumulation index + infection events | Europe (commercial) | Commercial benchmark | [S9] |
| RIMpro-Powdery | PM | Mechanistic + Gubler-Thomas core | T, rainfall; variety | Risk index + ascospore season | Europe (commercial) | Commercial benchmark | [S9] |
| Magarey Generic | PM/DM | Generic parametric | T, wetness duration; 5 parameters (Tmin, Topt, Tmax, Wmin, Wmax) | P(infection) at any T-wetness combo | 53 lab studies (r = 0.83) | RMSE = 4.9 h | [S10] |
| PLASMO / Goidanich | DM | Semi-mechanistic | Daily T, RH | % incubation progress; triggers symptoms at 100 % | Italy | Extended by Caffi | [S5][S11] |
| Bove-Savary (2020) | DM | Process-based | T, moisture modifiers, LP, IP | Full epidemic progress curve | Scenario simulation | Matches literature | [S12] |
| Chen et al. 2020 (GB) | DM | ML (gradient boosting) | Monthly T + precip (Mar–Jun) + onset date | P(high season-end severity) | Bordeaux (153 sites × 9 yr) | AUC = 0.86 | [S18] |
| TabPFN (Zhao & Efremova 2024) | DM/PM/9 | ML (Transformer) | Sentinel-2 VIs + ECMWF climate + soil + terrain | Block-level disease probability | Australia (76 vineyards, 2 seasons) | AUC = 0.85 | [S19] |
| YOLOv5-CA | DM | CNN detection | Leaf images (field) | Bounding box + class (GDM) | Chinese vineyard (820 images) | mAP = 89.55 % | [S15] |
| GDCNet (2025) | DM | CNN (lightweight) | Leaf images (512×512) | 7-grade severity (adaxial+abaxial) | China (5,392 images) | Acc = 81.43 %, 5.08 MB | [S16] |
| ResNet50 (He et al. 2022) | DM | CNN | Leaf images | 4-class infection stage | China | Acc = 99.92 % | [S16] |
| VineAI (Deep Planet 2025) | DM/PM | RF + satellite | Sentinel-2 + PlanetScope + weather | Per-pixel disease probability | SE England (4 vineyards) | 89.6/93.7/91.5 % | [S22] |
| ANN (wheat PM, 2025) | PM | ANN | Weather (Tmin, Tmax, RH, rainfall, sunshine) | Disease severity (R² = 0.98) | India (wheat; transferable concept) | R² = 0.98 cal, 0.95 val | [S23] |

---

## Detailed Notes

### Gubler-Thomas (Powdery Mildew)

**Citation:** Thomas, C. S., Gubler, W. D., et al. (1994). [S1] Revised by Gubler, W. D., et al. (2013), *Plant Disease* 97(7):879–888. [S2]

**Disease:** Powdery mildew (*Erysiphe necator*)  
**License/IP:** Open; published and implemented in UC IPM tools; re-implementable.

#### Stage 1: Ascospore Sub-Model (Primary Infection)

Triggered from bud break. Requires measurement of leaf wetness and daily average temperature. The model uses a **modified Mills Table** (originally for apple scab *Venturia inaequalis*) with a 2/3 reduction factor — powdery mildew requires less wetness than the original Mills scab table:

```
TREAT if: cumulative_leaf_wetness_hours >= W_threshold(T_daily_avg)
```

**Modified Mills Table** (from UC IPM [S3]):

| Daily Avg T (°F) | Leaf Wetness Hours for Heavy Ascospore Infection (2/3 Mills) | Original Mills Value |
|---|---|---|
| 42 | 40 | 60 |
| 46 | 25.3 | 38 |
| 50 | 19.3 | 29 |
| 55 | 16 | 24 |
| 63–75 | 12 | 18 |
| 77 | 14 | 21 |
| 78 | 17.3 | 26 |

*Wetness requirement is a U-shaped function of temperature with minimum at ~70°F (21°C). Outside 42–78°F (5.5–25.5°C), the ascospore model does not trigger.*

Degree-days after bud break also control ascospore maturation. Rossi et al. (2010) [S13] documented that 90 % of ascospores are mature after **153 degree-days (base 10°C)** post-budbreak using a Gompertz equation (R² = 0.92).

**Initiation rule:** Once the first ascospore infection has been confirmed (wetness + temperature threshold met), the model switches to the conidial risk index phase.

#### Stage 2: Conidial Risk Index (Secondary Infection)

**Risk index range:** 0–100.  
**Initiation requirement:** 3 consecutive days with ≥ 6 hours of temperature between 21 °C (70 °F) and 30 °C (85 °F). If this is not met, the index resets to zero.

```python
# Gubler-Thomas daily risk index calculation (pseudocode)
def update_gt_index(risk_index, hours_in_optimal_T, daily_Tmax):
    """
    hours_in_optimal_T: hours where 21 <= T_hourly <= 30 (°C)
    daily_Tmax: maximum temperature for the day (°C)
    Returns: updated risk index (0-100)
    """
    # HIGH TEMPERATURE THRESHOLD (original model)
    if daily_Tmax >= 35:   # 35°C / 95°F
        risk_index -= 10
    elif hours_in_optimal_T >= 6:   # Favorable day
        risk_index += 20
    else:                            # Unfavorable day
        risk_index -= 10

    # Clamp to [0, 100]
    return max(0, min(100, risk_index))

# Model must be triggered by 3-day streak before any index accumulates
```

**2013 High-Temperature Revision** [S2]:  
Lab work (Gubler et al., 2013) showed that lethal effects on *E. necator* start at **36–38 °C**, and that exposure time is as important as temperature. Revised threshold rules:

| Lethal Condition | Lethal Effect |
|---|---|
| 38 °C for ≥ 2 hours | Lethal (colony growth + sporulation arrested) |
| 36 °C for ≥ 4 hours | Lethal |
| 34 °C for ≥ 12 hours | Sublethal → delays spore production |
| < 35 °C (original threshold) | NOT lethal (revised upward from prior 35 °C = kill) |

The **revised rule** used in field trials: subtract 10 points if daily Tmax ≥ 38 °C for ≥ 2 h (or Tmax ≥ 36 °C for ≥ 4 h). Field validation showed equal or better disease control vs. original model with **5 fewer applications** over 2 years [S2].

The revised model also includes a **refractory period**: no points are added for several days after a high-temperature spike, mimicking observed growth delays.

**Decision rules for spray timing:**

| Risk Index | Spray Material | Spray Interval |
|---|---|---|
| 0–30 | Sulfur dust | 14 days |
| 0–30 | Micronized sulfur | 18 days |
| 0–30 | DMI fungicides | 21 days |
| 40–50 | Sulfur dust | 10 days |
| 40–50 | Micronized sulfur | 14 days |
| 40–50 | DMI fungicides | 17 days |
| 60–100 | Sulfur dust | 7 days |
| 60–100 | Micronized sulfur | 10 days |
| 60–100 | DMI fungicides | 14 days |

After each treatment, reset index to zero.

**Inputs:**
- Hourly average temperature (°C or °F)
- Daily maximum temperature
- Hourly leaf wetness (for ascospore stage only)

**Validation:** CA vineyards (original field studies); Chile (Bendek et al. 2007 showed index valid at Chilean conditions, R² = 0.68 for conidial germination regression [S14]); Oregon (cooperator field trials for high-T revision [S2]).

**Code/implementation:** Free open access via UC IPM [S3]; available in AgWeatherNet, NEWA, Davis Instruments stations, Wildeye [S1].

---

### Snyder-Sall Powdery Mildew Index (PMI Model)

**Citation:** Snyder, E., Sall, M. A. (1983). [S3]  
**Disease:** Powdery mildew, optimized for raisin and wine grapes in Central Valley CA.

Based on the assumption that host tissue growth and sulfur weathering (not just pathogen biology) drive re-application needs. Uses a **daily mildew index (DMI)** accumulated into a **powdery mildew index (PMI)**:

```
PMI starts accumulating: 12 days after leaf appearance or 6-inch shoot growth
PMI ends: when berries reach 12-15% sugar
SPRAY when: current PMI - PMI_at_last_spray >= 1.0
RE-SPRAY if: precipitation > 0.10 inch (sulfur wash-off)
```

**DMI Table** (abbreviated, from UC IPM [S3]):

| Daily Low T (°F) | Daily High T range (°F): 60-65 | 70-75 | 80-85 | 90-95 | 100-105 |
|---|---|---|---|---|---|
| 40-45 | 0.083 | 0.083 | 0.077 | 0.067 | 0.056 |
| 50-55 | 0.083 | 0.083 | 0.091 | 0.083 | 0.063 |
| 60-65 | — | 0.083 | 0.111 | 0.100 | 0.077 |
| 65-70 | — | 0.100 | 0.125 | 0.125 | 0.091 |
| 70-75 | — | — | 0.143 | 0.125 | 0.091 |

*DMI = 0 for temperature combinations with "—" (too hot/humid — unfavorable conditions).*

---

### Mills Table & Leaf Wetness Models

**Original citation:** Mills, W. D. (1944), apple scab. Adapted to *E. necator* by Thomas & Gubler (1994).  
**Applied disease:** Originally apple scab (*Venturia inaequalis*) ascospore infection; adapted for powdery mildew ascospore sub-model and for downy mildew leaf-wetness infection periods.

The Mills table specifies minimum leaf wetness duration (hours) required for **severe infection** at a given average temperature. The Gubler-Thomas model uses **2/3 of the original Mills values** for powdery mildew ascospore infection.

For **downy mildew secondary infection** the concept is repurposed: infection by *P. viticola* zoospores requires as little as **2 hours of wetness at 20 °C** (optimal) and up to **9 hours at 43 °F (6 °C)**. The Caffi secondary model [S8] formalizes this as:

```
INF = 1 (infection occurs) when:
  - Wet period (WP) >= W_min(T_WP)
  - T_WP is the average temperature during the wet period
  - Optimal: T = 21°C, min WP = 2 h
  - Infection range: 4.0 – 30.2°C
```

---

### DMCast (Downy Mildew)

**Citation:** Park, E. W., Seem, R. C., Gadoury, D. M., Pearson, R. C. (1997). DMCast: a prediction model for grape downy mildew development. *Phytopathologia Mediterranea*. [S4]  
**Disease:** Downy mildew (*Plasmopara viticola*)  
**Origin:** Cornell University / NEWA, Geneva, NY

DMCast is an adaptation of the POM (Prévision de l'Optimum de Maturation) model, reformulated for North American conditions. It uses a **probability density function for oospore maturation** based on long-term rainfall climatology.

**Primary infection trigger:**
```
Inputs:
  - Daily rainfall (September 21 to March 31)
  - 30-year historical daily rainfall climatology (same station)
  
Calculation:
  - Cumulative deviation of current-year daily rainfall from
    30-year daily mean (September 21 onward)
  - Probability density function generates % oospores mature
  
Trigger:
  - When ~3% of oospores are mature (Park et al. 1997)
  - PLUS: daily temperature > 11°C (52°F)
  - PLUS: phenological stage > EL-12 (5+ leaves unfolded)
  - PLUS: recent rain event > 2.5 mm [confirmed by Kennelly et al. 2007, S24]
```

**Secondary infection module:**
```
Requirements for secondary infection event:
  - Temperature > 13°C
  - Darkness >= 4 hours
  - Leaf wetness (or RH >= 95%) >= 2-3 hours near dawn
  - Active oil spots must be present
```

**Validation:**
- Geneva, NY 1985–1992: 100 % accuracy for primary infection over 9 years [S4]
- Italy: ~1/5 infections predicted correctly; average 42-day delay vs. actual infections
- 2001–2003 trials: 25 % accuracy (likely due to difference in 30-year climatology)
- **Practical constraint:** Requires ≥ 30 years of local rainfall data. Poor transferability outside its calibration region [S6].

**Code availability:** Available in NEWA (Network for Environment and Weather Applications), Cornell AgriMet; parameters published.

---

### EPI — État Potentiel d'Infection (Downy Mildew)

**Citation:** Strizyk, S. (1983). Modèle de comportement: état potentiel d'infection. *Phytoma* (France). ACTA, Paris. [S6]  
**Disease:** Downy mildew (*Plasmopara viticola*)  
**Origin:** ACTA (Association de Coordination Technique Agricole), Bordeaux region, France

EPI is an **empirical energy-based model** based on the ecological assumption that *P. viticola* is adapted to local climate, so deviations from long-term climatological norms drive risk.

**Two-component structure:**

```
EPI = PE + KE

PE (Potential Energy — oospore maturation over winter):
  - Calculated daily from November 1 to March 31
  - Based on: difference between current season temperature & rainfall
    vs. 30-year historical averages for the same period
  - PE_daily = f(T_current - T_30yr_mean, R_current - R_30yr_mean)
  - Cumulative PE indicates oospore maturation status

KE (Kinetic Energy — epidemic risk during season):
  - Calculated daily from April 1 to August 31
  - Inputs:
      T_nocturnal_monthly_avg  (nighttime temperature)
      RH_nocturnal_monthly_avg (nighttime relative humidity)  
      T_diurnal_daily_avg      (daytime 10am–6pm temperature)
      RH_diurnal_daily_avg     (daytime 10am–6pm relative humidity)
  - KE = g(T_nocturnal, RH_nocturnal, T_diurnal, RH_diurnal)

Total: EPI = PE + KE
```

**Decision rule:** Spray when cumulative EPI exceeds a threshold (site-specific calibration). An early DOM (date of most oospore maturity) indicates higher season risk.

**Validation:**
- Bordeaux region: Reliable, developed here [S6]
- Portugal (Bairrada, 1970–1999): Halved fungicide treatments [S6]
- Italy (Lombardy, 1989–1995, modified version): Effective for early infections; 57 % average treatment reduction, zero applications in 3 vineyards [S6, S25]
- **Limitation:** Overestimates secondary infections; some false negatives reported; requires calibration outside Bordeaux [S6]
- Proposed improvement: add leaf wetness sensor input to reduce false negatives

---

### Plasmo (UC Davis / ITALCO Downy Mildew Model)

**Citation:** Referenced in Goidanich (1959) and extended by Italian research groups; implemented in Italian advisory systems (Horta, 4Agri platform) [S5][S11]  
**Disease:** Downy mildew (*Plasmopara viticola*)  
**Origin:** Italian agricultural advisory systems, derived from Goidanich's incubation tables

PLASMO is a **semi-mechanistic daily-step incubation model**. It calculates the percentage completion of the incubation period for each infection cohort:

```
PLASMO calculates daily % incubation progress:
  - Based on: daily T, RH (and optionally leaf wetness)
  - Sum across days; when cumulative % >= 100 → symptoms expected
  - Reset after each reset event (rain, new inoculum cohort)

Incubation period temperature dependence:
  - Optimal: 18–25°C (symptoms in ~4–7 days)
  - Slower at 10–15°C (12–21 days)
  - Very slow below 10°C or above 27°C

Decision: When PLASMO incubation >= 100%, symptoms are imminent; treat if untreated
```

PLASMO is most commonly used as the **secondary infection incubation tracker** embedded within larger advisory systems. It is available in the Italian 4Agri/Horta precision agriculture platform [S11].

The **3–10 Rule** (Baldacci 1947) defines the trigger for the entire Goidanich/PLASMO system:
- Air temperature ≥ 10 °C
- Shoot length ≥ 10 cm
- ≥ 10 mm rainfall in preceding 24–48 hours

---

### RIMpro (Commercial)

**Citation:** RIMpro website and documentation [S9]; Rossi, V., Caffi, T. (model structure published in academic literature)  
**Disease:** Both PM (*E. necator*) and DM (*P. viticola*) — separate models  
**Origin:** Netherlands-based commercial platform (rimpro.eu/rimpro.cloud)  
**License/IP:** Commercial (subscription). Model equations not fully public, but structure is disclosed.

**Published structure — RIMpro-Plasmopara:**
1. **Primary inoculum season:** Simulates oospore maturation using a hydrothermal time approach (similar to Caffi 2009 [S7]), based on T + rainfall
2. **Primary infection events:** Each rainfall triggers a cohort of oospores; the model tracks sporangia production, zoospore release, dispersal, and leaf penetration (hourly time step)
3. **Secondary infection accumulation:** Tracks sporulation from existing lesions; each "RIM value" unit represents the probability of disease increase per infection event
4. **Season-long accumulation:** Unlike event-based models, RIMpro accumulates a **quantitative disease pressure index** across the whole season — key differentiator from EPI/DMCast
5. **Variety susceptibility:** User-selectable sensitivity level (very sensitive, less sensitive, resistant)
6. **Microclimate correction:** Adjustable correction factor for station vs. vineyard microclimate (valley bottom humidity vs. hillside)

**Published structure — RIMpro-Powdery:**
- Core based on Gubler-Thomas risk index logic
- Adds ascospore season start/end simulation (using hydrothermal time for chasmothecial maturation, similar to Rossi et al. 2010 [S13])
- Degree-day accumulation for ascospore release phase

**Deployment:** Used by commercial decision support services across Europe and Australia; available via API and web platform.

---

### Magarey et al. Generic Infection Model

**Citation:** Magarey, R. D., Sutton, T. B., Thayer, C. L. (2005). A simple generic infection model for foliar fungal plant pathogens. *Phytopathology* 95(1):92–100. DOI: 10.1094/PHYTO-95-0092. [S10]  
**Disease:** Generic (parameterized for any foliar pathogen, including PM and DM)  
**License/IP:** Open; published equations; re-implementable.

The Magarey model predicts whether infection occurs at a given temperature and wetness duration using **five parameters**:

```
Parameters:
  Tmin    = minimum temperature for infection (°C)
  Topt    = optimum temperature for infection (°C)  
  Tmax    = maximum temperature for infection (°C)
  Wmin    = minimum wetness duration for infection at Topt (h)
  Wmax    = optimum wetness duration for 100% infection (h)

Temperature response function (Yin et al. 1995):
  f(T) = [(T - Tmin) / (Topt - Tmin)]^α × [(Tmax - T) / (Tmax - Topt)]^β
  where α and β are shape parameters derived from Tmin, Topt, Tmax

Wetness Duration Requirement:
  W(T) = Wmin / f(T)    [when f(T) > 0, else W(T) = ∞]

Critical Disease Threshold:
  CDT = 20% disease incidence or 5% disease severity at non-limiting inoculum
  Infection occurs when: actual_wetness_hours >= W(T)
```

**Parameters for DM (*P. viticola*):**
```
Tmin = 4–5°C
Topt ≈ 21°C (Caffi 2021: optimal = 21.0°C)
Tmax = 30–30.2°C (Caffi 2021: 30.2°C)
Wmin ≈ 2 h (at optimal T of 21°C; from Blaeser & Weltzien 1977)
```

**Parameters for PM (*E. necator*):**
```
Tmin ≈ 6°C (conidial germination)
Topt ≈ 25°C
Tmax ≈ 33°C (conidial; 35–38°C for fungicidal effect)
Wmin = 0 h (no free water required for conidial infection; use RH threshold instead)
Note: PM is an exception — uses RH > 40% rather than wetness duration
```

**Dry-period interruption:** D50 = the dry-period duration (in hours, RH < 95 %) that reduces disease by 50 % vs. continuous wetting. For most fungi: D50 ≈ 12–24 h.

```python
# Wet-period summation with dry-period interruption
def sum_wetness(W1, D, W2, D50):
    if D < D50:
        return W1 + W2
    else:
        return max(W1, W2)  # periods are independent
```

**Validation:** 53 published controlled environment studies; mean r = 0.83, RMSE = 4.9 h. Suitable as a fallback model for any new pathogen with cardinal temperature data [S10].

---

### Caffi et al. Mechanistic Plasmopara Models (2009+)

**Citations:**  
- Caffi, T., Rossi, V., Bugiani, R. (2009). Evaluation of a mechanistic primary infection model for *Plasmopara viticola*. *Journal of Plant Pathology* 91(3):615–627. [S7]  
- Caffi, T., Rossi, V., Carisse, O. (2011). Evaluation of a dynamic model for primary infections in Quebec. *Plant Health Progress*. [S25]  
- Caffi, T., Rossi, V., Legler, S. E., Bugiani, R. (2011). A mechanistic model simulating ascosporic infections by *Erysiphe necator*. *Plant Pathology* 60(3):522–531. [S13 extended]  
- Caffi, T., et al. (2021). A weather-driven model for predicting infections of grapevines by *P. viticola* (secondary infections). *Frontiers in Plant Science* 12:636607. [S8]

**Disease:** Downy mildew (primary + secondary) — two linked sub-models  
**License/IP:** Open; equations fully published; re-implementable.

#### Sub-model A: Primary Infection (Caffi 2009)

Hourly time-step mechanistic model. Seven state variables (SOD → MMO → PMO → GEO → ZRE → ZDI → ZIN → OSL):

```
State variables (each cohort c progresses independently):

1. SOD = Seasonal Oospore Dose = 1.0 (normalized at leaf fall)

2. MMO (Morphologically Mature Oospores):
   MMO_h = SOD  [all oospores reach MMO stage by January 1]

3. PMO (Physiologically Mature Oospores):
   PMO_h = MMO_h × DOR_h
   
   where DOR_h (dormancy breaking rate, Gompertz):
   DOR_h = exp(-15.891 × exp(-0.653 × (HT_h + 1)))
   
   Hydro-thermal time:
   HT_h = Σ(h=1 to η) [(1330.1 - 116.19×T_h + 2.6256×T_h²) × M_h]
   (sum only when T_h > 0°C)
   
   Moisture factor M_h:
     M_h = 1 if R_h > 0 mm OR VPD_h ≤ 4.5 hPa
     M_h = 0 if R_h = 0 mm AND VPD_h > 4.5 hPa
   
   PIS (Primary Inoculum Season):
     Starts when HT = 1.3
     Ends when HT = 8.6
     (corresponds to 3–97% of SOD entering PMO stage)

4. GEO (Germinated Oospores = oospores that produced sporangia):
   Triggered when R_h ≥ 0.2 mm (starts germination event j)
   Germination heat sum per cohort:
   GER_h = Σ[(1330.1 - 116.19×T_h + 2.6256×T_h²) × M_h]
   GEO_ε = PMO_ε when GER_h = 1

5. ZRE (Zoospores Released from sporangia):
   Sporangia survival:
   SUS_h = f(T_h, RH_h)  [Blaeser & Weltzien 1979 equations]
   ZRE occurs when: T > 10°C AND sufficient moisture AND ≥ rainfall

6. ZDI (Zoospores Dispersed from soil to leaves):
   Requires rain splash (≥ threshold mm)

7. ZIN (Zoospores causing Infection):
   INF = 1 when: wet period WD ≥ W_min(T_WD)
   W_min at T=20°C ≈ 2h; range 4–30.2°C

8. OSL (Oil Spots on Leaves = visible symptoms):
   INC = f(T) [incubation period accumulation]
   OSL appears when INC = 1.0
```

**Validation:** 43 vineyards × 12 years (Emilia-Romagna, N. Italy 1995–2006). Data set **not used in model building**.
- TPP (true positive proportion) = 1.000
- TNP (true negative proportion) = 0.920  
- Overall accuracy = 0.93
- Youden's J = 1 (perfect; FPP = 0)
- P(infection | oospore cohort) = 0.994; P(no infection | not predicted) = 0.999

Extended validation: Quebec (20 vineyards 2008, 23 vineyards 2009): TPP = 0.996, TNP = 0.907 [S25]

#### Sub-model B: Secondary Infection (Caffi 2021)

Three-compartment model: sporulation → dispersal → infection:

```
Input: First visible DM lesion detected in vineyard (scouting required)

Compartment 1: Sporulation
  SPO = 1 (sporulation occurs) when:
    - Moist period (MP) ≥ 3 hours at night
    - Temperature during MP: 10°C ≤ T_MP ≤ 30°C
    - An hour is "moist" if: RH ≥ 80%, OR R > 0 mm, OR LW > 30 min
  
  Sporulation rate SPOR:
    SPOR = f(T, WD) [Lalancette et al. 1988 parameterization]
    Dose D' = D' + SPOR_rate × (modulated by SPOn events)
  
  Sporangia mortality on lesions:
    MOR' = g(VPD_h)  [Blaeser & Weltzien 1979]

Compartment 2: Dispersal & Deposition
  D&DR = 1 (all detached sporangia have equal dispersal probability)
  Sporangia mortality after detachment:
    MOR'' = h(VPD_h)
  Available dose on DM-free sites: D'' = f(D', MOR'')

Compartment 3: Infection
  INF = 1 when:
    D'' > 0 AND wet period WP ≥ W_min(T_WP)
    T range: 4.0 – 30.2°C
    Optimal T: 21°C; Optimal WP: 2 h
  
  Infection severity:
    SEV = f(WP, T_WP) [Caffi et al. 2016]
  
  Output: SEV (relative severity) — continuous risk score
  Binary logistic regression converts SEV to P(infection):
    P(Y) = 1/(1 + exp(-(B0 + B1×SEV)))
    P(any infection): B0 = ..., B1 = ... (Table 3 in Caffi 2021)
```

**Validation (3-yr vineyard, N. Italy 2015–2017):**
- P(no sporangia when not predicted) = 0.67 (2× prior probability)
- P(no infection when not predicted) = 0.87; only 9/108 infections missed
- Missed infections = mild, = 4.4 % of total lesions

---

### Modern ML Image Classifiers (2019+)

These models detect or quantify disease symptoms from leaf/canopy images. They serve as **confirmation tools** to detect first-infection onset, which triggers phase transitions in mechanistic models (e.g., switching Gubler-Thomas from ascospore to conidial phase, or providing the first-lesion date for Caffi secondary infection model).

#### YOLOv5-CA (2022)

**Citation:** (Frontiers in Plant Science, 2022) [S15]  
**Task:** Downy mildew lesion detection (bounding box) in field conditions  
**Architecture:** YOLOv5 + Coordinate Attention (CA) mechanism  
**Dataset:** 820 field images (Chinese vineyard; complex lighting, shadows, occlusions)  
**Results:** Precision 85.59 %, Recall 83.70 %, mAP@0.5 = 89.55 %, 58.82 fps  
**Comparison:** Faster R-CNN (80.65 %), YOLOv4 (82.65 %), YOLOv5 (87.41 %)  
**Code:** Not published; model weight availability unclear  
**Limitation:** Detection only; no severity grading; field deployment suitable

#### GDCNet (2025)

**Citation:** Frontiers in Plant Science (October 2025). [S16]  
**Task:** Fine-grained severity grading of grape downy mildew (7 grades, adaxial + abaxial)  
**Architecture:** Custom lightweight CNN; Cross-Receptive Field Fusion (CRFF) + Coordinate Attention; 5.08 MB  
**Dataset:** GDCData — 5,392 images (5 grape varieties; Kyoho, Cabernet Sauvignon, etc.; China); 7:2:1 train/val/test split  
**Results:** Acc = 81.43 %, mP = 82.16 %, mR = 81.43 %; 0.56 ms/frame  
**Comparison vs. 12 models:**
- ResNet50 (99.92 % on 4-class [He et al. 2022] but much larger)
- MobileNetV3_S: Fast, less severe-grade accuracy
- VGG16: High accuracy, 5.99 ms/frame (10× slower)
- Swin Transformer: Good on severe grades; high FLOPs  
**Segmentation method:** K-CNN-VC (K-Means++ + CNN + voting consolidation) for automated lesion area quantification without complex annotation  
**Novelty:** Adaxial-to-abaxial lesion inversion model — can predict abaxial (sporulation-side) severity from adaxial (visible-side) image  
**Code:** Not yet public at publication

#### ResNet50 for Downy Mildew Staging (He et al. 2022)

**Citation:** He et al. (2022), cited in GDCNet paper. [S16]  
**Task:** 4-class infection staging (healthy, pre-, mid-, late-infection)  
**Architecture:** Improved ResNet50  
**Accuracy:** 99.92 %  
**Limitation:** Large parameter size, not edge-deployable; 4-class only

#### CNN Models for General Grapevine Disease Classification

| Architecture | Accuracy | Dataset | Source |
|---|---|---|---|
| Ji et al. 2020 CNN (grape diseases) | 98.57 % | Multi-class grape diseases | [S15] |
| DICNN (Inception-based) | 97.22 % | Single-leaf datasets | [S15] |
| VGG16 improved | 98.4 % | 5 disease types | [S15] |
| YOLOv5-CA | 89.55 % mAP | Field GDM | [S15] |
| GDCNet | 81.43 % (7-grade fine) | GDCData | [S16] |

**Key limitation of all image classifiers for Graft Spray:** These detect existing symptoms. They cannot predict outbreaks 3–14 days in advance (which is what fungicide scheduling requires). Use for: (1) confirming first infection date, (2) real-time monitoring, (3) generating ground-truth training labels for outbreak forecasting models.

---

### Time-Series ML for Outbreak Forecasting

#### Chen et al. 2020 (Gradient Boosting — Seasonal Forecasting)

**Citation:** Chen M, Brun F, Raynal M, Makowski D (2020). Forecasting severe grape downy mildew attacks using machine learning. *PLoS ONE* 15(3):e0230254. [S18]  
**Disease:** Downy mildew (*P. viticola*)

**Inputs:**
1. GDM onset date (week of first 1 % incidence, from scouting)
2. Monthly average precipitation (mm/day): March, April, May, June
3. Monthly average temperature (°C): March, April, May, June

**Output:** P(high season-end GDM severity > median) on leaves and bunches

**Models tested:** GLM (binomial-logit), LASSO, Random Forest (500 trees), Gradient Boosting (100 trees)  
**Dataset:** 153 site-years × 9 years (2010–2018), Bordeaux, France. Weather from SAFRAN grid (8×8 km).  
**Validation:** Year-by-year leave-one-out cross-validation

**Results:**

| Model | Inputs | AUC (leaf incidence) |
|---|---|---|
| Gradient Boosting | All (onset + weather) | **0.86** |
| Random Forest | All | 0.85 |
| LASSO | All | 0.83 |
| GLM | Onset only | ~0.79 |
| Gradient Boosting | Weather only | 0.77 |

**Variable importance:** Onset date > May precipitation > June precipitation >> temperature  
**Treatment reduction vs. current Bordeaux practice (avg 10.1 sprays):**
- Threshold 0.5: 53 % reduction
- Threshold 0.75: 81 % reduction

**Code:** R (glm, glmnet, ranger, gbm); no GitHub repository published.  
**Limitation:** Seasonal forecast only; requires disease onset date from scouting. Cannot replace daily spray-timing models.

#### TabPFN + Multi-Sensor Remote Sensing (Zhao & Efremova 2024)

**Citation:** Zhao W, Efremova N (2024). Grapevine Disease Prediction Using Climate Variables from Multi-Sensor Remote Sensing Imagery via a Transformer Model. ICLR 2024 Climate Workshop. arXiv:2406.07094. [S19]  
**Disease:** 9 diseases including DM + PM

**Inputs (~450 features per sample):**
- Sentinel-2 spectral features + NDVI, NDWI
- ECMWF macroclimate + MODIS microclimate (at season-start to measurement time)
- Soil attributes (type, nutrients, carbon, pH, bulk density, AWC)
- Terrain (DEM, slope, aspect)
- Block attributes (variety, row direction, geolocation)

**Output:** Block-level binary P(disease present)  
**Dataset:** 76 vineyards, 627 blocks, 2 seasons, Australia; 1,335 samples  
**Results:** AUC = 0.85 (TabPFN), vs. XGBoost (0.82), LightGBM (0.82), CatBoost (0.87 on balanced dataset)  
**Architecture:** TabPFN — Transformer-based Bayesian inference approximator; 12 layers; no hyperparameter tuning; single-forward-pass inference

---

### Hybrid Mechanistic + ML Approaches

#### Grapevine Disease Risk via Multi-Modal Data (2026)

**Citation:** Grapevine Disease Risk Assessment Through Multi-modal Data (ScienceDirect, 2026). [S20]  
**Status:** Recent; full details pending review.  
**Concept:** Neural network combining weather-parameter time series with mechanistic model outputs (infection periods) for enhanced grape disease risk scoring.

#### VineAI (Deep Planet + NIAB 2024–2025) — Sensor Fusion + ML

**Citation:** Zhao (Deep Planet), IVES Open Science presentation, GiESCO 2025. [S22]  
**Disease:** DM, PM, Botrytis  
**Inputs:**
- Sentinel-2 (10 m) + PlanetScope (3 m) satellite spectral data + VIs
- Weather station data (T, RH, precipitation)
- SoilGrids attributes  

**Model:** Tree-based ML (random forest / gradient boosting on tabular satellite + weather features)  
**Region:** SE England (Chardonnay, Pinot Noir; 4 vineyards; Gusbourne, Nyetimber, Rathfinny; data Aug–Oct 2024)  
**Results:**
- Downy mildew: 89.6 %
- Powdery mildew: 93.7 %
- Botrytis: 91.5 %  
**Output:** Per-pixel disease probability overlaid on vineyard map  
**Commercial:** VineSignal platform; funded £144,500 by Growing Kent & Medway [S22]

#### IoT Sensor + ML (India, HMM approach)

**Citation:** Referenced in Velasquez-Camacho et al. 2023 review [S6].  
**Disease:** DM + PM  
**Approach:** Hidden Markov Model (HMM) + IoT sensor array  
**Accuracy:** 91 % for combined DM/PM detection in Indian vineyard conditions  
**Sensor array:** Temperature, RH, leaf wetness, soil moisture, atmospheric pressure

#### Chen et al. ANN weather regression (wheat, 2025) — Transferable Concept

**Citation:** Scientific Reports (2025). [S23]  
**Disease:** Powdery mildew (wheat *Blumeria graminis* — concept transferable to *E. necator*)  
**Architecture:** ANN (artificial neural network) with weather inputs  
**Inputs:** Tmin, Tmax, RH, evapotranspiration, wind speed, sunshine hours, rainfall  
**R² calibration/validation:** 0.98/0.95 for powdery mildew  
**Key finding:** Tmin and sunshine hours are the dominant PM predictors (temperature-humidity interaction); consistent with Gubler-Thomas biological basis.

---

### Sensor-Fusion Approaches

#### PV-Sensing Project (Italy 2018–2019)

**Citation:** PV-Sensing project brochure [S21]  
**Disease:** Downy mildew  
**Approach:** Novel in-canopy sensors + standard weather station + canopy volume measurement

**Sensor array:**
1. Standard weather station (T, RH, rainfall, wind speed)
2. **LWS-PLUS** sensor: leaf wetness + dew-drip detection (detects when overnight dew accumulates sufficiently to drip leaf-to-leaf, carrying zoospores)
3. **Patented soil moisture sensor**: measures only the top few mm of soil — precisely where oospores overwinter and germinate (vs. standard soil probes at deeper depths)
4. **WCAM** device: camera measuring canopy volume and leaf area (adapts fungicide dose calculations to actual canopy size)

**Scope:** 11 vineyards across 2 seasons (Glera variety, conventional + organic); 5 vineyards in NE Italy  
**Model fusion:** New variables integrated into mechanistic DM forecast model; preliminary results showed treatment reduction vs. reference

**Key innovation:** Dew-drip detection is novel — standard models assume leaf wetness from rain only; canopy-internal dripping is not captured by standard LWS sensors.

#### Smart Vineyard IoT + LabView (Bioengineering 2023)

**Citation:** Intelligent Grapevine Disease Detection Using IoT Sensor Network. *Bioengineering* (2023). PMC10525083. [S26]  
**Approach:** IoT sensor array in vineyard plots, processed by LabView with disease threshold rules  
**Sensors:** Temperature, humidity, atmospheric pressure, wind direction  
**Disease targets:** DM (*P. viticola*), PM (*E. necator*), grey rot (*Botrytis cinerea*)  
**DM threshold conditions programmed:**
```
DM favorable when:
  12°C ≤ T ≤ 25°C
  RH = 92–100%
  Leaf humidity ≥ 24%
```

#### VineAI (Satellite fusion — see Hybrid section above)

#### Technical Survey of IoT in Viticulture (2024)

**Citation:** Scientific Reports (November 2024). PMC11608269. [S27]  
**Summary:** Comprehensive review of IoT stations for vineyard disease monitoring; confirms that climate parameter monitoring (T, RH, precipitation) is the essential foundation; highlights gap between real-time detection and actionable spray decisions.

---

## Input Requirements Table

| Model | Required Inputs | Optional / Enhancing Inputs | Temporal Resolution | Spatial Resolution | Output |
|---|---|---|---|---|---|
| **Gubler-Thomas (PM)** | Hourly T (°C); daily Tmax; leaf wetness hours (ascospore phase) | None | Hourly T; daily Tmax | Station-level (~10 ha) | 0–100 daily risk index; spray interval |
| **Snyder-Sall PMI (PM)** | Daily Tmin, Tmax; rainfall (>0.10 in trigger) | None | Daily | Station-level | PMI (cumulative); spray when Δ ≥ 1.0 |
| **Modified Mills Table (PM)** | Daily avg T; daily total leaf wetness hours | None | Daily avg | Station-level | Infection event (yes/no) |
| **DMCast (DM primary)** | Daily rainfall (Sep 21–Mar 31); 30-yr historical daily rainfall; T (daily); T (>11°C threshold); phenology (EL stage) | Leaf wetness (secondary phase) | Daily | Station-level; 30-yr climate record required | Date of 3 % oospore maturity; primary infection events |
| **EPI (DM)** | T (daily nocturnal/diurnal avg); RH (nocturnal/diurnal monthly avg); rainfall (daily, monthly); 30-yr historical climatology | Leaf wetness (proposed improvement) | Daily (monthly aggregates) | Station + 30-yr climatology | EPI daily index; cumulative PE + KE |
| **Caffi Primary (DM)** | Hourly T, hourly rainfall, hourly RH (for VPD calculation) | None | Hourly | Station-level | Oospore cohort infection probability; predicted oil-spot emergence date |
| **Caffi Secondary (DM)** | Hourly T, hourly RH, hourly rainfall, hourly leaf wetness; first-lesion detection date | None | Hourly | Station-level | SEV (sporulation/infection severity); P(infection) |
| **PLASMO / Goidanich (DM)** | Daily T, daily RH | Leaf wetness (optional) | Daily | Station-level | % incubation progress (0–100 %); symptom date |
| **RIMpro (both)** | Hourly T, RH, rainfall, leaf wetness | Variety susceptibility; microclimate factor | Hourly | Station-level | Disease accumulation index; infection events; sporangia dose |
| **Magarey Generic** | Hourly T; wetness duration (h); 5 pathogen parameters | D50 (dry-period interruption) | Hourly | Station-level | P(infection) at each temperature-wetness combo |
| **Chen et al. GB (DM)** | Monthly avg T (Mar–Jun); monthly avg precipitation (Mar–Jun); disease onset date | None | Monthly + onset date | Regional weather grid | P(high season-end severity); seasonal alert |
| **TabPFN / Satellite ML** | Sentinel-2 bands + VIs; ECMWF/MODIS climate; soil attributes; terrain | Phenology, temporal climate time series | Scene-level (5–10 day revisit) | 3–10 m pixel; block-level | Per-pixel P(disease) |
| **YOLOv5-CA / GDCNet** | RGB leaf image (512×512 or higher) | None | On-demand (camera) | Leaf-level | Bounding box (detection) or severity grade (0–7) |
| **PV-Sensing enhanced DM** | Standard weather (T, RH, rain, wind) + LWS-PLUS (dew drip) + patented soil-surface moisture + canopy volume | Standard DM mechanistic inputs | Hourly | In-canopy sensors | Enhanced DM infection risk index |

---

## Implementation Recommendations for Graft Spray

### Tier 1: Must-Implement (MVP)

**For powdery mildew:**
1. **Gubler-Thomas revised (2013)** — the proven, open, minimal-input model. Implement BOTH stages: (a) ascospore infection phase using modified Mills leaf-wetness table; (b) conidial risk index with the revised 38 °C / 2 h high-temperature threshold.  
   *Why first:* Most extensively validated, lowest barrier (only hourly T + Tmax + leaf wetness), directly produces actionable spray intervals.

**For downy mildew:**
2. **Caffi Primary + Secondary (2009 + 2021)** — the most biologically rigorous mechanistic models with the best validation record. Full hourly equations are published and re-implementable.  
   *Why first:* No black box, full equations in literature, validated across multiple continents (N. Italy, Quebec), no long historical rainfall record required (unlike DMCast/EPI).

### Tier 2: Implement for Comparison / Validation

3. **EPI** — widely used in Europe; valuable for users in Bordeaux-climate regions; requires ≥ 30-year local climatology download (ERA5 or Météo-France SAFRAN). Implement as an alternative DM risk signal.
4. **Modified Mills Table as standalone leaf wetness checker** — lightweight, interpretable; useful as a secondary trigger confirmation for the ascospore season.

### Tier 3: ML Augmentation (Post-MVP)

5. **Gradient Boosting seasonal risk (Chen et al. 2020 architecture)** — train on local historical weather + scouting data as a **seasonal severity forecast** to adjust spray intensity at season start (not daily timing).
6. **Image classifier (GDCNet or YOLOv5-CA)** — integrate as an optional smartphone-camera feature for growers to confirm first lesion dates (improving Caffi secondary trigger precision) and severity monitoring.

### Data Layer Requirements (Minimum)

```
Required sensors per vineyard / cluster:
  - Hourly air temperature (°C) — accuracy ±0.3°C
  - Hourly relative humidity (%) — accuracy ±3%
  - Hourly leaf wetness (minutes wet per hour) — dielectric or impedance sensor
  - Daily accumulated rainfall (mm) — tipping-bucket, ≥ 0.2 mm resolution

Preferred sensors:
  - In-canopy T and RH (vs. standard 2m station height)
  - Soil surface moisture (top 5 mm — for oospore germination accuracy)
  
Weather forecast integration:
  - 7-day hourly T and RH from NWP (ECMWF HRES or GFS)
  - For Graft Spray: use forecast data to project 7-day risk index trajectory
```

### Decision Logic Summary

```
Daily app engine pseudocode:

FOR each vineyard:
  # Powdery mildew
  gt_index = update_gubler_thomas(hourly_T, daily_Tmax, leaf_wetness)
  IF gt_index >= 60: recommend 7-day interval (sulfur) or 14-day (DMI)
  IF gt_index 40-50: recommend 10-day interval (sulfur) or 17-day (DMI)
  IF gt_index < 30:  recommend 14-day interval (sulfur) or 21-day (DMI)
  
  # Downy mildew
  caffi_primary = run_caffi_primary_model(hourly_T, hourly_R, hourly_RH_VPD)
  IF caffi_primary.oil_spot_predicted:
    caffi_secondary = run_caffi_secondary_model(T, RH, R, LW, first_lesion_date)
    IF caffi_secondary.SEV > 0.065:  # optimal cut-off from Caffi 2021
      dm_risk = "HIGH"
    ELSE:
      dm_risk = "LOW/MODERATE"
  
  # Generate spray recommendation
  output = generate_spray_recommendation(gt_index, dm_risk, last_spray_date, 
                                          forecast_7day, fungicide_type)
```

---

## Datasets & Live Resources

| Resource | Description | URL |
|---|---|---|
| UC IPM Grape Powdery Mildew Model | Gubler-Thomas interactive model + tables (free) | https://ipm.ucanr.edu/DISEASE/DATABASE/grapepowderymildew.html |
| NEWA Cornell | DMCast and other disease models, live weather data | https://newa.cornell.edu/ |
| Wildeye Platform | GT model implementation description | https://info.mywildeye.com/info/mildew-risk-models |
| RIMpro Cloud | Commercial DM + PM mechanistic model | https://rimpro.cloud/ |
| 4Agri / Horta (Italy) | PLASMO + Caffi-based models (Italian) | https://wiki.wiforagri.com/wiki/wikieng/models-fungal-pathogens |
| GDCData (GDCNet) | Grape downy mildew severity image dataset | Accessible via Frontiers supplementary (2025) |
| Frontiers 2025 GDCNet paper | Full GDCNet architecture + dataset description | https://pmc.ncbi.nlm.nih.gov/articles/PMC12586135/ |
| Chen et al. 2020 S1 Data | 9-year Bordeaux GDM dataset (XLSX) | https://doi.org/10.1371/journal.pone.0230254 |
| PlantVillage Dataset | 54,000+ labeled plant disease leaf images | https://plantvillage.psu.edu/ |
| APSNET Education Center | Magarey generic infection model case study + R code | https://www.apsnet.org/edcenter/sites/EcologyAndEpidemiologyInR/ |

---

## Sources (Open Access)

[S1] UC Davis Powdery Mildew Risk Index — Gubler, Rademacher, Vasquez, Thomas (1999). APS Features. https://www.apsnet.org/edcenter/apsnetfeatures/Pages/UCDavisRisk.aspx

[S2] Revisions to the UC Davis Powdery Mildew Risk Index — Gubler et al. (2013). *Plant Disease* 97(7):879–888. PubMed: 30708457. https://pubmed.ncbi.nlm.nih.gov/30708457/

[S3] UC IPM: Models for Grape Powdery Mildew (Thomas et al. 1994; Snyder & Sall 1983). https://ipm.ucanr.edu/DISEASE/DATABASE/grapepowderymildew.html

[S4] DMCAST: A Prediction Model for Grape Downy Mildew — Park EW, Seem RC, Gadoury DM, Pearson RC (1997). *Phytopathologia Mediterranea*. INIST: 2244697. https://pascal-francis.inist.fr/vibad/index.php?action=getRecordDetail&idt=2244697

[S5] Grapevine Downy Mildew — UC IPM Agriculture page. https://ipm.ucanr.edu/agriculture/grape/downy-mildew/

[S6] Current Trends and Perspectives on Predictive Models for Mildew Diseases in Vineyards — Velasquez-Camacho L, Otero M, Basile B, Pijuan J, Corrado G (2023). *Microorganisms* 11(1):150. PMC9866057. https://pmc.ncbi.nlm.nih.gov/articles/PMC9866057/

[S7] A Mechanistic Model Simulating Primary Infections of Downy Mildew in Grapevine — Caffi T, Rossi V, Bugiani R (2009). *Journal of Plant Pathology* 91(3):615–627. Academia.edu: https://www.academia.edu/14032502/

[S8] A Weather-Driven Model for Predicting Infections of Grapevines by *Plasmopara viticola* — Caffi T, et al. (2021). *Frontiers in Plant Science* 12:636607. PMC7985336. https://pmc.ncbi.nlm.nih.gov/articles/PMC7985336/

[S9] RIMpro-Plasmopara model description. RIMpro Cloud. https://rimpro.cloud/platform/downy-mildew-plasmopara/

[S10] A Simple Generic Infection Model for Foliar Fungal Plant Pathogens — Magarey RD, Sutton TB, Thayer CL (2005). *Phytopathology* 95(1):92–100. PubMed: 18943841. https://pubmed.ncbi.nlm.nih.gov/18943841/

[S11] Models of Fungal Pathogens — 4Agri / Horta wiki (Italian; Caffi & Rossi models). https://wiki.wiforagri.com/wiki/wikieng/models-fungal-pathogens

[S12] Simulation of Potential Epidemics of Downy Mildew of Grapevine — Bove F, Savary S, Willocquet L, Rossi V (2020). *European Journal of Plant Pathology*. HAL: hal-02946487. https://hal.inrae.fr/hal-02946487v1/document

[S13] Dynamics of Ascospore Maturation and Discharge in *Erysiphe necator* — Rossi V, Caffi T, Legler SE (2010). *Phytopathology* 100(12):1321–1329. PubMed: 21062172. https://pubmed.ncbi.nlm.nih.gov/21062172/

[S14] Risk Assessment Index in Grape Powdery Mildew Control Decisions — Bendek CE, et al. (2007). *Spanish Journal of Agricultural Research* 5(4):522–532. Semanticscholar: 042a4486f54c5247a955267015d898bc9a9ba953. https://pdfs.semanticscholar.org/042a/4486f54c5247a955267015d898bc9a9ba953.pdf

[S15] Deep Learning Based Automatic Grape Downy Mildew Detection (YOLOv5-CA) — (2022). *Frontiers in Plant Science* 13:872107. https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2022.872107/full

[S16] Grading for Grapevine Downy Mildew and Feature Extraction Methods (GDCNet) — (2025). *Frontiers in Plant Science*. PMC12586135. https://pmc.ncbi.nlm.nih.gov/articles/PMC12586135/

[S17] APS Education Center: Case Study #1 — Simple Generic Infection Model. https://www.apsnet.org/edcenter/sites/EcologyAndEpidemiologyInR/DiseaseForecasting/Pages/CaseStudy1SimpleGenericInfectionModel.aspx

[S18] Forecasting Severe Grape Downy Mildew Attacks Using Machine Learning — Chen M, Brun F, Raynal M, Makowski D (2020). *PLoS ONE* 15(3):e0230254. PMC7067461. https://pmc.ncbi.nlm.nih.gov/articles/PMC7067461/

[S19] Grapevine Disease Prediction Using Climate Variables from Multi-Sensor Remote Sensing Imagery via a Transformer Model — Zhao W, Efremova N (2024). ICLR Climate Workshop. arXiv:2406.07094. https://arxiv.org/html/2406.07094v1

[S20] Grapevine Disease Risk Assessment Through Multi-modal Data — ScienceDirect (2026). https://www.sciencedirect.com/science/article/pii/S2772375526002637

[S21] PV-Sensing: Innovative Sensors in the Vineyard for Downy Mildew Infections Forecasting. Project brochure. https://www.pvsensing.it/wp-content/uploads/2020/06/brochure_pvsensing_2_versione_web_ENGL.pdf

[S22] VineAI: Artificial Intelligence for Fungal Disease — Zhao et al. IVES Open Science, GiESCO 2025. https://ives-openscience.eu/55832/

[S23] Predicting Crop Disease Severity Using Real-Time Weather Variability — ANN models for powdery mildew (2025). *Scientific Reports*. PMC12501241. https://pmc.ncbi.nlm.nih.gov/articles/PMC12501241/

[S24] Primary Infection, Lesion Productivity, and Survival of Sporangia in *P. viticola* — Kennelly MM et al. (2007). *Phytopathology*. PubMed: 18943292. https://pubmed.ncbi.nlm.nih.gov/18943292/

[S25] Evaluation of a Dynamic Model for Primary Infections by *Plasmopara viticola* in Quebec — Caffi T, Rossi V, Carisse O (2011). *Plant Health Progress*. APS PDF. https://apsjournals.apsnet.org/doi/pdf/10.1094/PHP-2011-0126-01-RS

[S26] Intelligent Grapevine Disease Detection Using IoT Sensor Network — (2023). *Bioengineering* 10(9):1103. PMC10525083. https://pmc.ncbi.nlm.nih.gov/articles/PMC10525083/

[S27] A Technical Survey on Practical Applications and Guidelines for IoT Sensors in Viticulture — (2024). *Scientific Reports*. PMC11608269. https://pmc.ncbi.nlm.nih.gov/articles/PMC11608269/

[S28] Can Spore Sampler Data Be Used to Predict *Plasmopara viticola* Infections? — (2020). *Frontiers in Plant Science* 11:1187. https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2020.01187/full

[S29] Empirical vs. Mechanistic Models for Primary Infections of *Plasmopara viticola* on Grapevine — (2007). *EPPO Bulletin* 37:369–378. https://onlinelibrary.wiley.com/doi/10.1111/j.1365-2338.2007.01120.x

[S30] Revising the Gubler-Thomas Model: Adding Real-Time PCR and Revised High Temperature Threshold — AVF Research Summary (2009). https://avf.org/research-summary/revising-the-gubler-thomas-model-for-powdery-mildew-adding-real-time-pcr-and-a-revised-high-temperature-threshold/

[S31] Mildew Risk Models — Wildeye Support (GT + DM model descriptions). https://info.mywildeye.com/info/mildew-risk-models

[S32] Quantitative Model for Describing Sporulation of *Plasmopara viticola* — Lalancette et al. (1988). *Phytopathology* 78(10):1316. https://www.apsnet.org/publications/phytopathology/backissues/Documents/1988Articles/Phyto78n10_1316.pdf

---

## Sources (Paywalled — Retrieve via University Credentials)

[P1] Thomas CS et al. (1994). Original Gubler-Thomas model paper. *Plant Disease*.

[P2] Gubler WD et al. (2013). Revisions to the UC Davis Powdery Mildew Risk Index. *Plant Disease* 97(7). DOI: 10.1094/PDIS-09-12-0871-RE.

[P3] Caffi T, Rossi V, Legler SE, Bugiani R (2011). A mechanistic model simulating ascosporic infections by *Erysiphe necator*. *Plant Pathology* 60(3):522–531. DOI: 10.1111/j.1365-3059.2010.02395.x.

[P4] Strizyk S (1983). Modèle de comportement: état potentiel d'infection. *Phytoma* No. 347. AGRIS: 64774d23a3fd11e4303868ef.

[P5] Park EW, Seem RC, Gadoury DM, Pearson RC (1997). DMCast: A prediction model for grape downy mildew development. *Phytopathologia Mediterranea* 36:3–11.

[P6] Magarey RD, Sutton TB, Thayer CL (2005). A simple generic infection model. *Phytopathology* 95(1):92–100. DOI: 10.1094/PHYTO-95-0092. (Also open access via Semanticscholar.)

[P7] Bendek CE et al. (2007). Risk assessment index in grape powdery mildew control. *Spanish Journal of Agricultural Research* 5(4):522–532.

[P8] Caffi T, Rossi V, Bugiani R (2009). Evaluation of a mechanistic primary infection model. *Journal of Plant Pathology* 91(3):615–627.

[P9] Kennelly MM, Gadoury DM, Wilcox WF, Seem RC, Luby JJ, Ficke A (2007). Primary infection, lesion productivity, and survival of sporangia in *P. viticola*. *Phytopathology* 97:512–522.

[P10] Rossi V, Caffi T, Legler SE (2010). Dynamics of ascospore maturation in *Erysiphe necator*. *Phytopathology* 100(12):1321–1329.
