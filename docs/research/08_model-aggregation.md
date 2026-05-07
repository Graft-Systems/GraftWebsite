# Model Aggregation & Ensemble Architecture for Graft Spray

> **Graft Spray Project — Category 8**
> Umbrella goal: "Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying."
> This document builds on the mechanistic model inventory in `06_outbreak-prediction.md`. It does **not** re-document model equations. Its purpose is to specify how outputs from multiple models are aggregated into a single per-block daily verdict and 7-day forecast, with calibrated uncertainty.

---

## Summary

Running a single disease model per block is fragile: different models excel under different epidemiological regimes, and every model has known blind spots (e.g., DMCast fails for late-season secondary DM in Italian vineyards; EPI over-estimates secondary cycles; Gubler-Thomas ignores rain-wash of conidia). A well-architected ensemble layer:

1. **Improves accuracy** — even ensembles of correlated, simple models outperform the best single model (Shah et al. 2021 [S2]).
2. **Quantifies disagreement** — when models split, a grower deserves to know the forecast is uncertain, not that one arbitrarily-chosen model says "spray."
3. **Localises the signal** — on-site sensors can shift model thresholds so a block-level microclimate is reflected rather than the nearest weather station.
4. **Separates PM from DM** — because *Erysiphe necator* and *Plasmopara viticola* have fundamentally different infection biology, each disease requires its own ensemble, with results combined into a single daily advisory.

---

## Key Findings

1. **Stacking with penalised meta-learners** (ridge, lasso, elastic-net) is the most accurate ensembling approach for correlated plant-disease models; it outperformed soft voting and weighted averaging on Fusarium head blight epidemics [S2].
2. **Bayesian Model Averaging (BMA)** provides a posterior weight proportional to each model's marginal likelihood; crop model ensembles using BMA reduced RMSE by ~25% versus the best individual model in multiple independent studies [S3, S4].
3. The Italian MISFITS-DSS achieved 88% balanced accuracy for DM infection risk by post-processing mechanistic model outputs with ML classifiers and issuing results on a five-point verbal scale [S5].
4. **RIMpro** (commercial) uniquely avoids event-based single-day logic: it tracks cumulative disease accumulation across cohorts season-long, outputting risk on a 0–100 scale with intervention recommended near 100 [S7, S8].
5. **VitiMeteo-Plasmopara** (Agroscope/Freiburg) allowed Swiss and German growers to cut DM applications from 8–12 to 0–4 per season through mechanistic simulation validated over nine years in Changins [S9, S10].
6. Leaf wetness sensor **position** substantially changes model outputs: sensors in the lower canopy can record up to 2× more wetness hours than those in the upper canopy, with direct consequences for infection period calculations [S12].
7. **Conformal prediction** is the only framework providing distribution-free finite-sample coverage guarantees for any black-box model; it is tractable for daily time-series outputs and has been demonstrated for earth-observation surrogates [S20, S21].
8. A severity scale of 1–10 (not raw model indices) is the recommended output to growers. Both MISFITS-DSS (five verbal levels) and RIMpro (0–100 continuous) map naturally to this range.
9. A normalised **RiskRecord** JSON schema that any model runner can emit allows the ensemble layer to consume heterogeneous outputs uniformly.

---

## 1. Ensembling Theory for Plant Disease Forecasting

### 1.1 Why ensembles? The diversity–accuracy trade-off

Ensemble methods combine predictions from \(M\) base learners \(\{f_1, \ldots, f_M\}\) to produce an aggregate prediction \(\hat{y}\). The expected squared error of the ensemble decomposes as:

\[
\text{MSE}(\hat{y}_\text{ens}) = \overline{\text{bias}}^2 + \overline{\text{variance}} - \overline{\text{covariance}}
\]

where \(\overline{\text{covariance}}\) is the average pairwise covariance of the individual models' errors. Diversity (low covariance) reduces ensemble error. However, Shah et al. (2021) demonstrated that even **highly correlated** base models (mean Pearson \(r = 0.78\) among 38 logistic regression models for FHB epidemics) still benefited from ensembling — stacking improved ROC-AUC by 12.7% over the median base learner [S2]. This directly applies to the Graft Spray setting, where PM and DM models are all driven by the same weather station inputs.

### 1.2 Weighted averaging (performance-weighted soft voting)

The simplest approach averages predicted probabilities with per-model weights \(w_m\):

\[
\hat{p}_\text{ens} = \sum_{m=1}^{M} w_m \hat{p}_m, \quad \sum w_m = 1
\]

Weights are typically proportional to inverse Brier score, AUROC, or balanced accuracy on a held-out calibration set. Shah et al. used dendrogram-based subsampling to select one model per cluster before weighted averaging — this is specifically important in viticulture where models share weather inputs and produce correlated errors [S2]. Chauvin et al. (2025) further showed that spatial aggregation of models (assigning each spatial unit to a local model via model averaging) is more robust than relying on any single "best" model for spatio-temporal plant disease risk [S22].

**Recommended implementation for Graft Spray:**
- For each disease (PM/DM), maintain a calibration dataset of block × day × observed infection (boolean or categorical). After each season, refit model weights. Use balanced accuracy as the loss metric to handle class imbalance (infection events are rare).

### 1.3 Bayesian Model Averaging (BMA)

BMA assigns posterior weight to each model conditional on observed data \(D\):

\[
w_m^{\text{BMA}} = \frac{p(D \mid f_m) \cdot p(f_m)}{\sum_{m'} p(D \mid f_{m'}) \cdot p(f_{m'})}
\]

The predictive distribution is then the mixture:

\[
p(y^* \mid D) = \sum_{m=1}^{M} w_m^{\text{BMA}} \cdot p(y^* \mid D, f_m)
\]

This naturally collapses to the best-supported model when one model has overwhelming predictive likelihood and broadens uncertainty when models disagree. BMA has been validated in crop model ensembles [S3, S4], environmental risk prediction [S23], and Bayesian causal models for *Plasmopara viticola* treatment decisions [S24]. A hybrid combining BMA with conformal prediction (CBMA) provides coverage guarantees even when the true model is not among the candidates [S25].

**Practical constraint:** True BMA requires estimating marginal likelihoods \(p(D \mid f_m)\), which is intractable for deterministic mechanistic models. A common approximation uses leave-one-season-out cross-validation likelihood or Brier score on held-out data as a proxy.

### 1.4 Stacking (two-level ensemble)

Stacking trains a meta-learner \(g\) on the cross-validated predictions of base models:

\[
\hat{y}_\text{stack} = g(\hat{p}_1^{(cv)}, \hat{p}_2^{(cv)}, \ldots, \hat{p}_M^{(cv)})
\]

Shah et al. used penalised logistic regression (ridge/lasso/elastic-net) as meta-learner, with nested 10-fold outer and 5-fold inner cross-validation to tune \(\lambda\) [S2]. This is the **recommended approach** when ≥2 seasons of labelled vineyard data are available per block. Stacking consistently outperformed soft voting and weighted averaging across all metrics in the FHB study.

Key advantage: the meta-learner can learn non-linear combinations — e.g., "when DMCast says low risk but Caffi Secondary says high, trust Caffi Secondary because it has better secondary-cycle accuracy."

### 1.5 Bayesian Causal (Directed Acyclic Graph) models

Stefanini & Valleggi (2022) built a Bayesian Causal Model (BCM) specifically for *Plasmopara viticola* treatment decisions in a single vineyard [S24]. A Directed Acyclic Graph encoded causal relationships among microclimate, host susceptibility, treatment history, and infection probability. The model was updated weekly using on-site observations, producing a predictive distribution of incidence for competing treatment decisions. This framework is powerful for single-block calibration but requires expert elicitation of prior distributions. The same group (Stefanini et al. 2023) extended this into a full Bayesian selection model for control strategy [S26].

### 1.6 Conformal prediction for uncertainty quantification

Conformal prediction (CP) is a distribution-free framework producing prediction sets with guaranteed coverage \(1-\alpha\) under the exchangeability assumption [S20]:

\[
\Pr(y_{n+1} \in C(x_{n+1})) \geq 1 - \alpha
\]

For a binary spray/no-spray decision, a conformal prediction set might be \(\{1\}\) (certain spray), \(\{0\}\) (certain no-spray), or \(\{0,1\}\) (uncertain — abstain or apply cautionary spray). For a 7-day forecast, conformal intervals widen as forecast horizon increases. Gopakumar et al. (2024) demonstrated that CP applied to weather-forecasting surrogates achieves guaranteed coverage regardless of model architecture, at near-zero computational cost [S21]. Melki et al. (2025) specifically applied CP to precision spraying decisions in agriculture, showing that abstention when uncertainty is excessive provides safer recommendations [S27]. Khan et al. (2026) extended CP to risk-aware agronomic prescriptions with an 18–28% abstention rate when competing options were indistinguishable — an exact analogue for fungicide timing [S28].

**Key advantage for growers:** CP tells the system when to say "we don't know enough to advise today" rather than forcing a binary verdict from conflicting models.

### 1.7 Comparison of ensemble approaches

| Method | Accuracy gain | Uncertainty output | Requires labelled history | Complexity |
|---|---|---|---|---|
| Soft voting (unweighted) | Small–moderate | None (point estimate) | No | Low |
| Weighted average (Brier/AUROC) | Moderate | None (point estimate) | Yes (≥1 season) | Low |
| BMA | Moderate–high | Posterior distribution | Yes (≥1 season) | Medium |
| Stacking (ridge/lasso) | High | None (point estimate) | Yes (≥2 seasons) | Medium |
| Bayesian Causal DAG | High (single block) | Full posterior | Yes (expert elicitation) | High |
| Stacking + Conformal | High + guaranteed | Prediction interval | Yes (≥2 seasons) | Medium |

**Recommended progression for Graft Spray:**
- **Year 0 (no history):** Soft voting with equal weights across Gubler-Thomas, Caffi Secondary, and DMCast (for DM); Gubler-Thomas and Magarey (for PM). Display all three individual scores to grower.
- **Year 1+:** Fit season-level calibration weights (weighted average). Replace soft voting.
- **Year 2+:** Fit per-block stacking meta-learner. Add conformal prediction intervals. Enable abstention.

---

## 2. How Commercial DSS Combine Models

### 2.1 RIMpro (ADAMA/independent, Belgium/Netherlands)

RIMpro is arguably the most technically sophisticated commercial DSS for tree-fruit and vine diseases. Key design choices [S7, S8]:

- **Not event-based:** Unlike most DM models that evaluate each day in isolation, RIMpro's Plasmopara model tracks disease accumulation across successive oospore cohorts through the full season. This prevents false negatives from short rain events that do not reach thresholds.
- **Risk scale 0–100:** Infection below 10 is negligible; treatment recommended as value approaches 100. Intermediate values map naturally to a 1–10 severity scale by decade.
- **Variety susceptibility modifier:** User-selectable (very susceptible / less susceptible / resistant), shifts the accumulation rate proportionally.
- **Microclimate correction:** User can offset sensor humidity to reflect a more humid valley position or drier hilltop — a practical acknowledgement of weather station placement error.
- **Powdery mildew (Uncinula necator):** Separate model tracking ascospore ejection, conidial germination (temperature and RH driven), and symptom onset on a logarithmic scale. Fruit sensitivity flagged BBCH 61 to cluster closure.
- **Disease reconciliation:** RIMpro runs PM and DM as **independent models**; no cross-disease ensemble is described. The two graphs are displayed side by side, and the grower or adviser synthesises them. There is no documented multi-model vote within a disease.

### 2.2 VitiMeteo / Agrometeo (Agroscope Changins + WBI Freiburg + GEOsens)

VitiMeteo-Plasmopara is a mechanistic model simulating P. viticola developmental stages from oospore maturation through secondary sporulation [S9, S10]. It is embedded in Agrometeo (Switzerland) and VitiMeteo (Germany, Austria, parts of northern Italy):

- **Model foundation:** Scientific mechanistic model based on biology of the pathogen relative to meteorological factors. Authors report 9-year validation at Changins showing consistent undertreatment risk compared to calendar spraying.
- **Validation in Tuscany:** Bregaglio et al. (2022) MISFITS-DSS extended this family of process-based models. Hindcast outputs were post-processed by ML classifiers (random forest and gradient boosting) to predict a 5-class infection risk, achieving 88% balanced accuracy [S5].
- **Expert version vs. user version:** VitiMeteo Black Rot (Molitor et al. 2016) exemplifies the VitiMeteo model family's output pattern: two tiers — user-accessible graphical risk summary, plus expert parameter access for model evaluation and calibration [S11].

### 2.3 MISFITS-DSS (CREA + 9 Italian Plant Protection Services, 2022)

The MISFITS-DSS is the most architecturally documented public DSS for viticulture disease [S5]:

- **Layer 1 — Mechanistic process models:** Grapevine phenology models (RMSE 4–14 days), host susceptibility curves, and primary/secondary infection process models for DM. Sensitivity analysis (Morris method) used to identify critical parameters.
- **Layer 2 — ML post-processing:** Hindcast simulation outputs (phenology stage, host susceptibility, accumulated infection pressure) fed to ML classifiers. The classifiers predict reference infection risk from expert field observations. Balanced accuracy: 88%.
- **Output scale:** Five verbal classes — very low, low, medium, high, very high.
- **Uncertainty:** Not explicitly described; the balanced accuracy metric implies calibration to handle class imbalance in rare infection events.
- **Weather forecast integration:** Short-range weather forecast (3–5 day) used as model input, providing forward-looking risk.

### 2.4 Vintel (ITK, France)

Vintel models soil–vine–atmosphere interactions for water stress, disease risks, nitrogen, and climate hazards [S13]. Technical documentation is proprietary; inferred design:

- Runs separate DM and PM disease modules. Outputs are "personalised indicators and recommendations."
- Weather data-driven; can operate without on-site sensors.
- No published validation of the ensemble or reconciliation method. Likely uses a single proprietary model per disease with ITK's validated agronomic rules.

### 2.5 eVineyard (Slovakia)

eVineyard states that model-driven DSS informs fungicide application timing for PM [S14]. No published technical description of which models are deployed or how outputs are combined. User-facing output appears to be a risk alert (spray / monitor / low risk) per block, likely based on a single mechanistic model per disease fed by regional weather API.

### 2.6 Sectormentor (Vidacycle, UK)

Sectormentor is primarily a viticulture monitoring and record-keeping app with block-level yield and vine health tracking [S15]. Disease risk forecasting is not documented as a core feature; disease management data entry (observation logs) is supported. No disease model aggregation described.

### 2.7 Agrometeo.ch (Switzerland — VitiMeteo integration)

The Swiss Agrometeo platform integrates VitiMeteo models with national weather station data for public access by growers, and combines DM (VitiMeteo-Plasmopara) and PM (OidiumPro / separate module) as **parallel independent dashboards** [S10]. No documented cross-disease ensemble; grower integrates both visually.

### 2.8 Inferred best practice from commercial systems

| DSS | DM model basis | PM model basis | Ensemble method | Output format |
|---|---|---|---|---|
| RIMpro | Proprietary mechanistic (cohort-based) | Mechanistic (conidial cycle) | None (independent) | 0–100 continuous |
| VitiMeteo / Agrometeo | Mechanistic (PLASMO-derived) | OidiumPro | None (independent displays) | Graphical / alert |
| MISFITS-DSS | Process-based + ML classifier | — (DM only published) | 2-layer hybrid | 5-class verbal |
| Vintel | Proprietary | Proprietary | Unknown | Indicator |
| eVineyard | Unspecified | Unspecified | Unknown | Alert |
| Sectormentor | None | None | N/A | Record-keeping |

**Key observation:** No commercial system documents a formal mathematical ensemble across PM and DM models. This is a competitive whitespace for Graft Spray. The MISFITS-DSS is the closest documented precedent for a hybrid mechanistic+ML ensemble, and provides direct validation of the architecture recommended here.

---

## 3. Calibration to Local Sensor Data

### 3.1 The weather station placement problem

All mechanistic models (Gubler-Thomas, Caffi, DMCast, EPI) were validated using data from standard weather stations positioned in open, unshaded locations — often at airport or research station sites. Vineyard microclimates can differ substantially:

- **Leaf wetness duration (LWD):** Di Marta et al. demonstrated that sensor position within a vine canopy materially changes LWD measurements with direct consequences for DM simulation outputs [S12]. Lower-canopy sensors record longer wetness periods due to reduced air circulation and delayed drying.
- **Temperature inversion:** Valley-bottom vineyards routinely experience overnight temperatures 2–4°C lower than hilltop or weather station values, extending infection periods for both PM and DM.
- **Radiation interception:** Dense canopy reduces drying rate after rain. Magarey et al. (2005) note that their generic infection model requires canopy-representative temperature and wetness, not open-station data [S16].
- **Station vs. vineyard LWD:** Sentelhas & Gillespie (2008) reviewed methods for estimating LWD when sensors are absent, recommending the Penman-Monteith-derived SLD (surface leaf dryness) model as a portable standard [S17]. The CART algorithm outperformed simple RH-threshold methods in Brazilian vineyard trials.

### 3.2 Sensor calibration methods

**Method 1 — Empirical threshold offset (additive correction):**
For each block \(b\), fit an offset \(\delta T_b\), \(\delta \text{RH}_b\) from a reference season's on-site data:

\[
T_b(t) = T_\text{station}(t) + \delta T_b, \quad \text{RH}_b(t) = \text{RH}_\text{station}(t) + \delta \text{RH}_b
\]

Simple to implement. Assumes linear relationship and stationary bias. Useful when one full season of on-site vs. station paired data is available.

**Method 2 — Physical canopy microclimate model:**
Magarey, Russo & Seem (2006) published a water budget and energy balance approach to surface wetness simulation [S18]. The model explicitly estimates canopy surface wetness from radiation, wind, rainfall, and vapour pressure deficit — far more accurate than RH thresholds alone. This is the approach used in NEWA (Network for Environment and Weather Applications) deployed in the US and Europe. For blocks where canopy structure is characterised (LAI, row orientation, training system), this model provides a principled correction.

**Method 3 — Bayesian sequential updating:**
Mai et al. (2022) demonstrated Bayesian sequential updating to calibrate crop phenology models, progressively incorporating new observations each season and updating parameter distributions [S19]. The same approach applies to disease model thresholds: after each observed infection event (confirmed by scouting or lab), the model's threshold parameters \(\theta\) (e.g., temperature optimum, wetness minimum) are updated via Bayes' theorem. This is the richest approach but requires reliable ground-truth observations.

**Method 4 — Kriging interpolation from station network:**
For multi-block estates or regional advisory services, Mukundi et al. (2016) showed that spatial kriging of meteorological variables with block-level correction factors can predict disease-relevant microclimatic variables at unsampled locations [S29]. This is an option for cooperatives or regional DSS operators.

### 3.3 Practical sensor placement guidelines

Based on the literature, the following canopy positioning standard is recommended for Graft Spray leaf wetness sensors:

1. **Position:** Mid-canopy, cluster zone (~40–60 cm above soil), oriented at 45° facing south-west (northern hemisphere). This position best captures infection-relevant wetness on cluster-zone tissue.
2. **Replication:** Minimum two sensors per block at the uphill and downhill ends of a row. If only one sensor: place at the canopy bottom (worst-case LWD captures the most conservative infection risk).
3. **Cross-validation:** Compare sensor LWD to the station-derived Penman-Monteith estimate monthly. Persistent divergence >10% of hours per month flags a sensor calibration or placement issue.

### 3.4 Calibrating against observed disease onset

The most powerful calibration approach for Graft Spray is to use confirmed first-infection dates from scouting or spore traps as biofix events:

- When the first DM oil spot is confirmed in block \(b\), back-calculate what each model would have needed to predict that event and adjust parameters accordingly for the rest of the season.
- Leoni et al. (2022) demonstrated a real-time spore trap device that counts *Plasmopara* and *Erysiphe* spores independently, enabling true biological triggering of model phase transitions [S30]. Adding this sensor type to Graft Spray blocks provides the most reliable biofix signal available.

---

## 4. Confidence and Uncertainty Surfacing

### 4.1 When models agree vs. disagree

Consider running three DM models for a block: Caffi Secondary, DMCast (secondary cycle), and EPI. Their daily risk outputs (normalised 0–1) might be:

| Scenario | Caffi | DMCast | EPI | Interpretation |
|---|---|---|---|---|
| A | 0.85 | 0.82 | 0.79 | **Consensus HIGH** — spray |
| B | 0.15 | 0.12 | 0.18 | **Consensus LOW** — no spray |
| C | 0.78 | 0.45 | 0.22 | **Split** — alert, cautionary |
| D | 0.52 | 0.48 | 0.51 | **Borderline consensus** — advisory with uncertainty flag |

The standard deviation \(\sigma_\text{models}\) across model predictions is the simplest disagreement metric. When \(\sigma > 0.2\), report as "models disagree — increased uncertainty." When \(\sigma < 0.1\), report high confidence.

### 4.2 Severity 1–10 conversion

Most mechanistic models output non-comparable raw indices. Normalisation to a 1–10 severity scale requires per-model calibration. Recommended mapping:

| Source model | Raw output | Normalisation to 1–10 |
|---|---|---|
| Gubler-Thomas | Daily index 0–100 | \(\text{severity} = \lceil \text{GT} / 10 \rceil\), capped at 10 |
| Caffi Secondary (SEV) | 0–1 infection probability | \(\text{severity} = 1 + 9 \times \text{SEV}\) |
| DMCast (% mature oospores) | 0–100% | Season-stage mapping: 0–10% → 1–3; 10–30% → 4–6; >30% → 7–10 |
| EPI | EPI + KE value | Percentile-ranked within local climatology; percentile × 9 + 1 |
| RIMpro | 0–100 continuous | Divide by 10, round |
| MISFITS-DSS | 1–5 verbal | \(\text{severity} = 2 \times \text{class} - 1\) (maps 1→1, 5→9) |

**Ensemble severity** is the weighted average of per-model severities, rounded to nearest integer:

\[
\text{severity\_ensemble} = \text{round}\left(\sum_{m=1}^{M} w_m \cdot s_m\right)
\]

**Confidence** is expressed as a 0–1 float derived from the inverse of model standard deviation, clipped:

\[
\text{confidence} = \max\left(0, 1 - \frac{2 \sigma_\text{models}}{\overline{s}}\right)
\]

where \(\overline{s}\) is the mean severity. Confidence = 1 means all models agree exactly; confidence = 0 means models span the full range.

### 4.3 Conveying uncertainty to growers

The MISFITS-DSS team explicitly involved plant protection services in DSS definition to ensure outputs matched actual user needs [S5]. The following three-tier communication framework is recommended:

**Tier 1 — Numeric (API / expert view):**
- `severity_pm`: integer 1–10
- `severity_dm`: integer 1–10
- `confidence_pm`: float 0–1
- `confidence_dm`: float 0–1
- `models_agree_pm`: boolean (`confidence >= 0.7`)
- `models_agree_dm`: boolean
- Prediction interval: `[severity_low, severity_high]` from conformal prediction

**Tier 2 — Visual (app dashboard):**
- Traffic light: green (1–3), amber (4–6), red (7–10)
- Confidence shown as fill opacity: full opacity = high confidence, semi-transparent = uncertain
- 7-day bar chart with uncertainty bands

**Tier 3 — Plain English (push notification):**
- Consensus high: "High powdery mildew risk today. All models agree — spray recommended."
- Consensus low: "Low mildew risk today. No spray needed."
- Split: "Downy mildew risk uncertain — models disagree. Inspect canopy; consider cautionary spray if rain forecast."
- Borderline: "Moderate risk. Models broadly agree. Monitor and spray within 48 h if conditions persist."

### 4.4 Conformal prediction for 7-day forecast intervals

For each day in the 7-day forecast horizon \(h\), a conformal prediction interval \([L_h, U_h]\) is computed from the empirical distribution of past forecast errors at that horizon. Coverage widens with \(h\) automatically because forecast errors increase at longer horizons. Example interval at 90% coverage:

\[
[s_\text{ens}(h) - q_{90}(\epsilon_h),\; s_\text{ens}(h) + q_{90}(\epsilon_h)]
\]

where \(q_{90}(\epsilon_h)\) is the 90th percentile of absolute forecast errors at horizon \(h\) from the calibration set. This non-parametric approach requires no distributional assumptions and is directly applicable to both PM and DM severity forecasts.

---

## 5. Output Schema Recommendation

Every model runner (Gubler-Thomas executor, Caffi Secondary executor, DMCast executor, etc.) should emit a **RiskRecord** object. The ensemble layer consumes a list of RiskRecords and emits a **BlockVerdict** object. Below is the normalized schema in JSON.

### 5.1 RiskRecord (per model, per disease, per block, per day)

```json
{
  "schema_version": "1.0",
  "record_type": "RiskRecord",
  "model_id": "caffi_secondary_v2021",
  "model_citation": {
    "authors": "Caffi T, Rossi V, Bugiani R",
    "year": 2021,
    "title": "Mechanistic model for Plasmopara viticola secondary infections",
    "doi": "10.1094/PHYTO-09-20-0398-R",
    "url": "https://doi.org/10.1094/PHYTO-09-20-0398-R"
  },
  "disease": "downy_mildew",
  "pathogen": "Plasmopara viticola",
  "block_id": "estate-abc/block-07",
  "valid_from": "2025-06-14T00:00:00Z",
  "valid_to": "2025-06-14T23:59:59Z",
  "forecast_horizon_days": 0,
  "severity_raw": 0.74,
  "severity_raw_unit": "probability_0_1",
  "severity_1_10": 7,
  "confidence": 0.82,
  "input_snapshot": {
    "source": "on_site_sensor",
    "sensor_id": "block07-imeteo-node1",
    "T_hourly_mean_C": 18.4,
    "RH_hourly_mean_pct": 91.2,
    "leaf_wetness_hours": 6.0,
    "rainfall_mm": 12.5,
    "T_max_C": 22.1,
    "phenology_BBCH": 65
  },
  "model_phase": "secondary_infection",
  "run_timestamp": "2025-06-14T06:00:00Z",
  "flags": ["high_RH_event", "rainfall_threshold_exceeded"]
}
```

**Field definitions:**

| Field | Type | Required | Description |
|---|---|---|---|
| `schema_version` | string | Y | Schema version for forward compatibility |
| `record_type` | string | Y | Always "RiskRecord" |
| `model_id` | string | Y | Unique stable identifier for the model+version |
| `model_citation.doi` | string | Y | DOI of the model's canonical publication |
| `disease` | enum | Y | `powdery_mildew` or `downy_mildew` |
| `pathogen` | string | Y | Latin binomial |
| `block_id` | string | Y | Estate-scoped block identifier |
| `valid_from` / `valid_to` | ISO 8601 | Y | Temporal validity window |
| `forecast_horizon_days` | int | Y | 0 = today; 1–7 = forecast day |
| `severity_raw` | float | Y | Raw model output in its native units |
| `severity_raw_unit` | string | Y | One of: `probability_0_1`, `index_0_100`, `index_0_10`, `verbal_1_5` |
| `severity_1_10` | int 1–10 | Y | Normalised severity after calibration mapping |
| `confidence` | float 0–1 | Y | Model-internal confidence; 0=unknown, 1=maximum |
| `input_snapshot` | object | Y | Frozen copy of all weather/sensor inputs used |
| `model_phase` | string | N | e.g., `primary_ascospore`, `secondary_infection`, `quiescent` |
| `run_timestamp` | ISO 8601 | Y | When the model was executed |
| `flags` | string[] | N | Audit flags for notable conditions |

### 5.2 BlockVerdict (ensemble output, per block, per day)

```json
{
  "schema_version": "1.0",
  "record_type": "BlockVerdict",
  "block_id": "estate-abc/block-07",
  "verdict_date": "2025-06-14",
  "generated_at": "2025-06-14T06:05:00Z",

  "powdery_mildew": {
    "severity_ensemble": 5,
    "confidence": 0.73,
    "models_agree": true,
    "severity_interval_90pct": [4, 7],
    "model_ids_contributing": ["gubler_thomas_2013", "magarey_generic_2005"],
    "individual_severities": {"gubler_thomas_2013": 5, "magarey_generic_2005": 6},
    "recommendation": "monitor",
    "recommendation_reason": "Moderate risk; models broadly agree. Spray within 48 h if T >25°C continues."
  },

  "downy_mildew": {
    "severity_ensemble": 8,
    "confidence": 0.61,
    "models_agree": false,
    "severity_interval_90pct": [5, 10],
    "model_ids_contributing": ["caffi_secondary_v2021", "dmcast_1997", "epi_strizyk_1983"],
    "individual_severities": {
      "caffi_secondary_v2021": 9,
      "dmcast_1997": 8,
      "epi_strizyk_1983": 5
    },
    "split_summary": "EPI lower than Caffi/DMCast; likely EPI underestimating secondary cycle risk. Caffi favoured by local calibration history.",
    "recommendation": "spray",
    "recommendation_reason": "High risk flagged by two of three models. Caffi has strongest local validation. Do not delay treatment."
  },

  "combined_recommendation": "spray",
  "combined_recommendation_urgency": "high",

  "7day_forecast": [
    {"date": "2025-06-15", "pm_severity": 5, "dm_severity": 7, "pm_confidence": 0.70, "dm_confidence": 0.55},
    {"date": "2025-06-16", "pm_severity": 4, "dm_severity": 6, "pm_confidence": 0.65, "dm_confidence": 0.50},
    {"date": "2025-06-17", "pm_severity": 4, "dm_severity": 5, "pm_confidence": 0.60, "dm_confidence": 0.45},
    {"date": "2025-06-18", "pm_severity": 3, "dm_severity": 4, "pm_confidence": 0.55, "dm_confidence": 0.40},
    {"date": "2025-06-19", "pm_severity": 3, "dm_severity": 3, "pm_confidence": 0.50, "dm_confidence": 0.35},
    {"date": "2025-06-20", "pm_severity": 2, "dm_severity": 3, "pm_confidence": 0.45, "dm_confidence": 0.30},
    {"date": "2025-06-21", "pm_severity": 2, "dm_severity": 2, "pm_confidence": 0.40, "dm_confidence": 0.25}
  ],

  "source_records": ["uuid-001", "uuid-002", "uuid-003", "uuid-004", "uuid-005"]
}
```

**Combined recommendation logic:**

| PM severity | DM severity | Combined |
|---|---|---|
| ≤3 | ≤3 | `no_spray` |
| 4–6 | ≤3 | `monitor_pm` |
| ≤3 | 4–6 | `monitor_dm` |
| 4–6 | 4–6 | `monitor_both` |
| ≥7 (either) | any | `spray` |
| any | ≥7 (either) | `spray` |

Urgency is `high` when severity ≥8 for either disease, `medium` for ≥6, `low` otherwise.

### 5.3 Schema design principles

1. **Immutability of inputs:** `input_snapshot` captures the exact values used; any model re-run with new data creates a new record rather than overwriting.
2. **Model citation as first-class field:** Every record carries its DOI, making audit trails of "why did we recommend spray today" complete and reproducible.
3. **Separation of raw output from normalised severity:** Raw values are preserved so future calibration can revise the severity mapping without losing historical information.
4. **Horizon-aware confidence:** Forecast horizon is explicit, so consumers can display widening intervals at day 5–7.
5. **Extensibility:** Additional disease modules (botrytis, black rot) can emit RiskRecords with `disease: "botrytis"` or `"black_rot"` without schema changes.
6. **Source record lineage:** BlockVerdict lists UUIDs of source RiskRecords, enabling full provenance.

---

## Synthesis: Recommended Ensemble Architecture for Graft Spray

```
┌─────────────────────────────────────────────┐
│  SENSOR LAYER (per block)                    │
│  Hourly T, RH, leaf wetness, rainfall        │
│  On-site biofix (first spore / oil spot)     │
└──────────────────┬──────────────────────────┘
                   │ Calibrated inputs
                   ▼
┌─────────────────────────────────────────────┐
│  MODEL RUNNER LAYER (independent executors) │
│  PM: Gubler-Thomas 2013 → RiskRecord        │
│  PM: Magarey Generic 2005 → RiskRecord      │
│  DM: Caffi Secondary 2021 → RiskRecord      │
│  DM: DMCast (secondary) → RiskRecord        │
│  DM: EPI (when long-term climate avail.) → RiskRecord │
└──────────────────┬──────────────────────────┘
                   │ List<RiskRecord>
                   ▼
┌─────────────────────────────────────────────┐
│  ENSEMBLE LAYER                              │
│  1. Normalise severity_1_10 per record       │
│  2. Compute weighted average (per-season     │
│     calibrated weights or equal in Year 0)  │
│  3. Compute σ_models → confidence           │
│  4. Conformal prediction intervals (Year 2+) │
│  5. Generate split_summary if models disagree│
└──────────────────┬──────────────────────────┘
                   │ BlockVerdict
                   ▼
┌─────────────────────────────────────────────┐
│  PRESENTATION LAYER                          │
│  Daily verdict + traffic light               │
│  7-day forecast with uncertainty bands       │
│  Push notification (plain English)           │
└─────────────────────────────────────────────┘
```

---

## Sources

| ID | Title | Authors | Year | Venue | URL | Access | Notes |
|---|---|---|---|---|---|---|---|
| S1 | Forecasting Plant and Crop Disease: An Explorative Study on Current Algorithms | Malloci FM, Fenu G | 2021 | Big Data and Cognitive Computing 5(1):2 | https://www.mdpi.com/2504-2289/5/1/2 | Open | Taxonomy of disease forecast algorithms |
| S2 | Accuracy in the prediction of disease epidemics when ensembling simple but highly correlated models | Shah DA, De Wolf ED, Paul PA, Madden LV | 2021 | PLOS Computational Biology 17(3):e1008831 | https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008831 | Open | FHB case study; stacking >> soft voting; foundational |
| S3 | A multiple crop model ensemble for improving broad-scale yield prediction using Bayesian model averaging | Huang X et al. | 2017 | Field Crops Research 211:211-220 | https://doi.org/10.1016/J.FCR.2017.06.011 | Paywalled | BMA for crop model ensemble; RMSE reduction |
| S4 | Evaluation of crop model prediction and uncertainty using Bayesian parameter estimation and Bayesian model averaging | Gao Y et al. | 2021 | Agricultural and Forest Meteorology 311:108686 | https://doi.org/10.1016/j.agrformet.2021.108686 | Paywalled | BMA vs individual crop models |
| S5 | A public decision support system for the assessment of plant disease infection risk shared by Italian regions | Bregaglio S et al. | 2022 | Journal of Environmental Management 317:115365 | https://pubmed.ncbi.nlm.nih.gov/35642822/ | Open | MISFITS-DSS; 88% balanced accuracy; 5-class output |
| S6 | Factor Analysis and Prediction of Disease Risk Based on Large Ensembles of Models | Chauvin D et al. | 2025 | Phytopathology | https://doi.org/10.1094/PHYTO-01-25-0014-FI | Paywalled | Spatial aggregation more robust than best single model |
| S7 | Downy mildew (Plasmopara) — RIMpro platform documentation | RIMpro | 2024 | rimpro.cloud | https://rimpro.cloud/platform/downy-mildew-plasmopara/ | Open | 0–100 scale; cohort-based; variety modifier |
| S8 | Grape powdery mildew (Uncinula necator) — RIMpro platform documentation | RIMpro | 2025 | rimpro.cloud | https://rimpro.cloud/platform/grape-powdery-mildew-uncinula-necator/ | Open | Ascospore ejection; BBCH phenology calibration |
| S9 | Using VitiMeteo-Plasmopara to better control downy mildew in grapevine | Dubuis PH et al. | 2012 | Revue suisse de viticulture, arboriculture, horticulture | https://agris.fao.org/search/en/providers/122607/records/647355f953aa8c8963066b78 | Open | 9-yr Changins validation; 0–4 vs 8–12 sprays |
| S10 | VitiMeteo workshop summary / Agrometeo platform — Wine Australia workshop report | Various | 2014 | Wine Australia International Workshop Report | https://www.wineaustralia.com/getmedia/1fd736bf-5fe3-4758-940a-5368b41e77f9/GWT-1322-Final-Report | Open | VitiMeteo models; validation at multiple EU sites |
| S11 | VitiMeteo Black rot: A novel decision support system for black rot | Molitor D et al. | 2016 | European Journal of Plant Pathology 145:785–798 | https://flore.unifi.it/retrieve/handle/2158/1073527/208051/2016%20Molitor%20et%20al.pdf | Open | Two-tier output pattern; model assembly architecture |
| S12 | Influence of different sensor positions on leaf wetness duration measurements and their effect on the simulation of grapevine downy mildew | Di Marta A, Orlandini S et al. | n.d. | Semanticscholar | https://www.semanticscholar.org/paper/71da900d1d65226bd251e039ad3a30a4309e1478 | Paywalled | Canopy position critical for LWD accuracy |
| S13 | Vintel — How does it work? | ITK | 2024 | vintel-itk.com | https://vintel-itk.com/en/how-does-it-work/ | Open | Agronomic modelling overview |
| S14 | Powdery mildew (Uncinula necator) — eVineyard blog | eVineyard | 2015 | evineyardapp.com | https://www.evineyardapp.com/blog/2015/08/31/powdery-mildew/ | Open | Model-driven DSS for fungicide timing |
| S15 | Sectormentor: The Regenerative Viticulture Platform | Vidacycle | 2025 | vines.vidacycle.com | https://vines.vidacycle.com | Open | Monitoring/record-keeping; no disease models |
| S16 | A simple generic infection model for foliar fungal plant pathogens | Magarey RD, Sutton TB, Thayer CL | 2005 | Phytopathology 95(1):92–100 | https://doi.org/10.1094/PHYTO-95-0092 | Open (via Semanticscholar) | 5-parameter model; requires canopy-representative inputs |
| S17 | Agrometeorology and plant disease management: a happy marriage | Sentelhas PC, Gillespie TJ | 2008 | Scientia Agricola 65(Spe):71–80 | https://www.scielo.br/j/sa/a/8sP6XcBGLRX5kTMmd4RDzVr/ | Open | LWD estimation methods; PM-SLD model review |
| S18 | Simulation of surface wetness with a water budget and energy balance approach | Magarey RD, Russo JM, Seem RC | 2006 | Agricultural and Forest Meteorology 139:373–381 | https://doi.org/10.1016/J.AGRFORMET.2006.08.016 | Paywalled | Surface wetness model; superior to RH threshold |
| S19 | A Bayesian sequential updating approach to predict phenology of silage maize | Mai J et al. | 2022 | Biogeosciences 19:2187–2209 | https://bg.copernicus.org/articles/19/2187/2022/ | Open | BSU for crop model calibration; analogue for disease model threshold updating |
| S20 | A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification | Angelopoulos AN, Bates S | 2022 | arXiv:2107.07511 | https://arxiv.org/abs/2107.07511 | Open | Standard reference for conformal prediction |
| S21 | Uncertainty quantification of surrogate models using conformal prediction | Gopakumar V et al. | 2024 | Machine Learning: Science and Technology | https://doi.org/10.1088/2632-2153/ae2e7b | Open | CP for weather-forecast surrogates; guaranteed coverage |
| S22 | Factor Analysis and Prediction of Disease Risk Based on Large Ensembles of Models (full data) | Chauvin D et al. | 2025 | Phytopathology | https://doi.org/10.1094/PHYTO-01-25-0014-FI | Paywalled | Spatial ensemble more robust than best individual model |
| S23 | Performance of Bayesian Model Averaging for Short-Term Prediction of PM10 | Ramli N et al. | 2023 | Atmosphere 14(2):311 | https://www.mdpi.com/2073-4433/14/2/311 | Open | BMA applied to environmental risk; analogue for disease risk |
| S24 | A Bayesian Causal Model to Support Decisions on Treating of a Vineyard | Stefanini F, Valleggi L | 2022 | Mathematics 10(22):4326 | https://www.mdpi.com/2227-7390/10/22/4326 | Open | BCM for P. viticola treatment decisions; DAG framework |
| S25 | CBMA: Improving Conformal Prediction through Bayesian Model Averaging | Bhagwat P, Kong L, Jiang B | 2025 | arXiv | https://www.semanticscholar.org/paper/d149484d85e607b4fdcd5246e1f57793f4550b35 | Open | BMA + CP hybrid; coverage guarantee under model uncertainty |
| S26 | A Bayesian model for control strategy selection against Plasmopara viticola infections | Stefanini F et al. | 2023 | Frontiers in Plant Science 14:1117498 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10399454/ | Open | Extended BCM for DM control strategy; Bayesian posterior over treatments |
| S27 | Uncertainty Guarantees on Automated Precision Weeding using Conformal Prediction | Melki P et al. | 2025 | arXiv:2501.07185 | https://arxiv.org/html/2501.07185v1 | Open | CP applied to precision spray decisions in agriculture |
| S28 | Smart sensing-enabled risk-aware nitrogen prescriptions via conformal profit bounds | Khan A et al. | 2026 | Frontiers in Plant Science | https://www.frontiersin.org/articles/10.3389/fpls.2026.1821003/full | Open | CP for agronomic prescriptions; abstention when indistinguishable |
| S29 | Spatial Modelling of Weather Variables for Plant Disease Applications in Mwea Region | Mukundi J et al. | 2016 | Journal of Geosciences and Environment Protection 4(5) | https://www.scirp.org/journal/PaperDownload.aspx?paperID=66626 | Open | Kriging + linear regression correction for disease-relevant weather variables |
| S30 | Highly sensitive spore detection to follow real-time epidemiology of downy and powdery mildew | Leoni S et al. | 2022 | BIO Web of Conferences 50:04003 | https://www.bio-conferences.org/10.1051/bioconf/20225004003 | Open | Real-time spore counter for PV and EN; enables biological biofix |
| S31 | Current Trends and Perspectives on Predictive Models for Mildew Diseases in Vineyards | Velasquez-Camacho L et al. | 2022 | Microorganisms 11(1):73 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9866057/ | Open | Comprehensive review; PM/DM model comparison; gaps in multi-model ensembles |
| S32 | Predicting plant disease epidemics using boosted regression trees | Peng C, Wang W, Zhang X | 2024 | Infectious Disease Modelling 9:765–779 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11253225/ | Open | BRT for disease epidemics; ensemble methods section covers FHB |
| S33 | Disease Forecasting for the Rational Management of Grapevine Mildews in the Chianti Bio-District | Marone Fassolo E et al. | 2023 | Plants 12(2):285 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9865324/ | Open | EPI model in Italian organic viticulture; −40% spray treatments |
| S34 | Forecasting severe grape downy mildew attacks using machine learning | Makowski D, Brun F, Raynal M, Chen M | 2020 | PLOS ONE 15(3):e0230254 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7067461/ | Open | GB/RF for seasonal DM severity; Bordeaux 9-yr; AUC 0.86 |
| S35 | Predicting plant disease epidemics from functionally represented weather series | Shah DA et al. | 2019 | Philosophical Transactions Royal Society B 374:20180273 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6553612/ | Open | Functional regression weather series for FHB; foundational for ensemble base learner design |
| S36 | Estimating leaf wetness duration over turfgrass and in a Niagara Rosada vineyard | Lulu J et al. | 2008 | Scientia Agricola 65(7):696–700 | http://www.scielo.br/scielo.php?script=sci_arttext&pid=S0103-90162008000700004 | Open | CART model best for vineyard LWD estimation |
| S37 | Datasets of harmonized risk assessment of grapevine downy mildew and phenological observations in eight Italian regions | Morelli D et al. | 2022 | Data in Brief 43:108409 | https://doi.org/10.1016/j.dib.2022.108409 | Open | Multi-region benchmark dataset for DSS calibration |
| S38 | A deep learning model for predicting risks of crop pests and diseases from sequential environmental data | Yun CM, Lee S | 2023 | Plant Methods 19:145 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10720067/ | Open | AUROC 0.917 for crop disease risk from sequential weather; KAIST framework |
