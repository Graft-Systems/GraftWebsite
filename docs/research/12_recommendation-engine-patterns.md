# 12 — Recommendation Engine Patterns: Citation-Grounded, Prescriptive Advice

**Category:** `12_recommendation-engine-patterns`  
**Date compiled:** 2025-01-31  
**Purpose:** Architecture and design patterns for producing daily `spray / hold / scout` verdicts with inline provenance — which mechanistic model fired, which data point triggered it, which paper underwrites the threshold. Severity 1–10 for powdery mildew and downy mildew, with liability-aware framing.

---

## 1. Provenance & Explainability Patterns

### 1.1 Retrieval-Augmented Generation (RAG) with Source Tracking

RAG is the foundational architecture for citation-grounded recommendation engines in high-stakes domains. The core principle: instead of letting a language model generate claims from parametric memory, constrain it to reason only over retrieved, verified sources — and log every retrieval step [S1].

A 2026 clinical AI framework formalises this as "source verification as a first-class control mechanism": the model is constrained to reason over retrieved sources, and the full retrieval-decision pathway is recorded in an auditable log — not merely attached post-hoc [S1]. Key components of a production-grade provenance-RAG stack:

| Layer | Function | Graft Spray Implementation |
|---|---|---|
| **Knowledge base** | Curated mechanistic-model papers, extension bulletins, threshold tables; each chunk tagged with authors, year, DOI, evidence grade | Model-specific chunks: Gubler-Thomas PM risk index [P1, P2], Caffi-Rossi DM infection model [P3], DMCast [P5] |
| **Semantic retrieval** | Ensemble of dense retrieval (vector search) + BM25 sparse retrieval to surface relevant thresholds | Query: current temp + leaf wetness hours → retrieve relevant Mills-table row |
| **Inference engine** | LLM constrained to cite retrieved IDs; post-hoc critic verifies every claim against retrieved passages | Critic scores each driver sentence; blocks hallucinated threshold values |
| **Audit log** | Immutable, tamper-evident record: query, retrieved doc IDs, inference chain, final output ID, timestamp | Stored as structured JSON; hash committed to append-only store |
| **UI layer** | Progressive disclosure: verdict card → expandable driver list → expandable source passages | Collapsed by default; growers see verdict; consultants expand to paper-level |

The distinction between "citation-assisted generation" (attach citations after reasoning) and embedded verification (constrain reasoning to retrieved sources) is architecturally critical for liability: the former cannot provide a reliable audit trail [S1].

For Graft Spray, every entry in the `drivers` array of the recommendation card (§7) must map to a retrieved chunk ID that resolves to a specific paper, table row, and data value — not a post-hoc rationalisation.

### 1.2 SHAP Feature Attributions

SHAP (SHapley Additive exPlanations) assigns each input feature a unique additive contribution to a specific prediction, derived from cooperative game theory's Shapley values [S2]. For a hybrid system combining mechanistic models with ML-learned corrections (e.g., a gradient-boosted residual on top of the Caffi et al. infection model), SHAP provides:

- **Per-prediction attribution:** "Temp anomaly +2°C contributed +1.4 severity points; leaf wetness duration contributed +0.8 severity points"
- **TreeSHAP** for gradient-boosted ensembles: exact attributions in O(TLD²) time, deterministic across runs [S2]
- **DeepSHAP / Gradient SHAP** if neural residuals are added
- **Counterfactual SHAP** for actionable recourse: "If canopy RH drops below 80% tonight, severity drops from 7 to 4"

Key caution: standard SHAP uses an interventional expectation that breaks feature correlations, which can misattribute correlated predictors (e.g., temperature and leaf wetness duration are correlated). Causal SHAP, which conditions on a causal DAG, avoids spurious attributions [S2]. For Graft Spray's mechanistic-model pipeline, this matters: the Caffi-Rossi model uses temperature and wetness as inputs that have known causal structure.

**Presentation pattern for growers:** avoid raw SHAP waterfall plots. Convert attributions to natural-language sentences: "Leaf wetness lasted 6 h overnight (threshold for moderate infection: 4 h [Caffi et al. 2016]), contributing the highest share of today's severity score."

### 1.3 Decision-Tree Fallbacks

When the primary ML or hybrid model cannot produce a confident output (missing weather data, out-of-distribution conditions), a shallow decision tree provides a transparent, auditable fallback. Hybrid tree methods — a shallow constrained tree backed by a neural "expert" module — achieve near-parity with XGBoost while remaining fully inspectable [S3].

Design for Graft Spray: if primary model confidence < 0.5 or if any required sensor input is missing, fall back to the UC IPM risk index rule-table [S6] (which is itself a lookup decision tree: Risk Index 0–30 → spray interval maximum; 40–50 → intermediate; ≥60 → minimum interval [S7]). Log the fallback event in the audit trail.

**Critical property:** the fallback tree must use the same severity-scale anchors (§6) as the primary model, so growers do not see discontinuous severity jumps when the system falls back.

### 1.4 Attention Attribution

For transformer-based components (e.g., an LLM summarising a 7-day forecast into narrative text), attention attribution — specifically integrated gradients over input tokens — can surface which data tokens the model weighted most. This is weaker than SHAP for tabular data but provides a rough sanity check that the narrative is driven by the correct weather data.

Do not expose raw attention weights to growers. Use them only internally for QA: verify that the "high-risk" narrative sentence attends strongly to the temperature and wetness tokens, not noise tokens. Flag for human review if attribution is diffuse.

---

## 2. Prior Art: Agricultural DSS Recommendation Engines

### 2.1 RIMpro

[RIMpro](https://rimpro.cloud) is a commercial cloud DSS for fruit and viticulture disease management, serving thousands of growers and consultants worldwide [S4]. Architecture observations:

- **Models:** >20 validated disease/pest models, updated every 30 minutes using real-time weather forecast data [S4]
- **Risk presentation:** Per-disease "risk severity indicator" displayed as graphical time-series bars with clear high/medium/low colour coding; no numeric 1–10 scale, but visual band encoding
- **Citations:** Models described as "developed, tested, and regularly updated by scientists in production regions" — model pedigree stated but specific paper citations are not inline with alerts in the grower UI; scientific documentation is separate
- **Disclaimers:** Minimal in the consumer product; the framing is "decision support for smart treatment decisions" — the "smart" qualifier does implicit epistemic work
- **Notification pattern:** Push alert when disease risk threshold is crossed; alert includes: disease name, risk level, weather-driven trigger, suggested action

**What Graft Spray should borrow:** the 30-minute update cadence and push-alert-on-threshold-crossing pattern. **What to improve on:** inline citation to specific papers and specific data values, which RIMpro does not surface to growers.

### 2.2 Cornell NEWA

[NEWA (Network for Environment and Weather Applications)](https://newa.cornell.edu/) was established in 1995 through Cornell University's New York State IPM Program and the Northeast Regional Climate Center [S5]. It provides 31+ crop-specific decision support tools covering disease forecasting, pest risk, and crop management.

- **Grape Diseases Model:** Infection risk tools for black rot, Phomopsis, and powdery mildew; integrates real-time local weather from 1,000+ stations [S5]
- **Recommendation format:** Risk level output (low / moderate / high) with management guidelines; the model architecture is documented in extension literature but not surfaced inline in the alert
- **Validation documented:** The grape diseases model has been validated in peer-reviewed literature, with Rutto, Mersha & Nita (2021) showing improved fungicide timing effectiveness [S5]
- **Disclaimers:** Open-access, Extension-operated; implicit "use alongside local scouting" framing; no signed acknowledgement

**Key NEWA pattern to adopt:** the tight coupling between weather-station geolocation and model output — risk is calculated per station, not per region. Graft Spray's block-level recommendation should similarly be grounded in the nearest validated weather station plus interpolation.

### 2.3 UC IPM Powdery Mildew Risk Index

The UC Davis Risk Index (Gubler-Thomas model) is one of the most rigorously validated ag DSS recommendation engines in viticulture [S6, S7]. Key design patterns for Graft Spray:

- **Two-stage model:** ascospore stage (primary infection, Mills table lookup: wetness hours × temperature) → conidial stage (Risk Index accumulation: daily index from temperature bands) [S7]
- **Risk Index thresholds linked to specific management actions:**

| Risk Index | Pathogen status | Spray interval (sulfur dust) | Citation |
|---|---|---|---|
| 0–30 | Not reproducing | 14 days (label max) | [S7] Thomas et al. 1994; Gubler implementation |
| 40–50 | Reproducing every 15 days | 10 days | [S7] |
| 60–100 | Reproducing every 5 days — epidemic risk | 7 days (label min) | [S7] |

- **Threshold basis:** each band is grounded in laboratory temperature-response studies documenting fungal reproduction rates — the recommendation is mechanistically anchored, not heuristic
- **Reset logic:** index resets to 0 after each fungicide application — a statefulness pattern Graft Spray must replicate
- **Calibration evidence:** validated since 1995 across California (wine, table, raisin grapes), New York, Washington, Oregon, Germany, Austria, and Australia [S7]
- **Comparative effectiveness:** UC Davis RI model achieved 89.8% efficacy vs 73.5% for classical calendar-based model in 2021–2022 trials [S8]

**What Graft Spray should borrow:** the explicit mechanistic basis for each threshold band; the reset-after-treatment statefulness; multi-region validation history. Each Graft Spray severity tier should reference the equivalent RI band so that the recommendation card cites the model's empirical grounding.

### 2.4 VitiMeteo / VineForecast / Metos Pessl

VitiMeteo (now also offered via [VineForecast](https://www.vineforecast.com)) and [Metos by Pessl Instruments](https://metos.global/en/disease-models-grapevine/) implement both powdery and downy mildew models with 50×50 m spatial resolution [S9, S10]:

- **California Risk Model** (Metos): 0–100 point index; bands 0–30 (not reproducing), 40–50 (moderate, ~15-day cycle), >60 (rapid, epidemic risk) — identical band structure to UC IPM [S10]
- **Pessl modified Risk Model:** adds leaf wetness correction: >8 h wetness decreases index by 10 points (antagonistic fungus *Ampelomyces quisqualis* effect) [S10]
- **Downy mildew presentation:** separate graphs for weak / moderate / severe infection probability; infection assumed complete when graph reaches 100% [S10]
- **Bulletin format:** daily bulletin showing sporangia forecasts, infection period probabilities, and recommended action timing; no inline paper citations in the grower-facing UI

**Graft Spray improvement opportunity:** the Metos/VitiMeteo system presents multiple model outputs in parallel graphs, which requires growers to synthesise. A single severity score per disease (1–10) with a single action verdict eliminates this cognitive load [S9, S10].

### 2.5 Plasmopara viticola Mechanistic Model (Brischetto et al. 2021)

The [Frontiers paper by Brischetto, Bove, Fedele & Rossi (2021)](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.636607/full) is the most rigorous publicly available mechanistic model for DM secondary infection severity [S11]. Key design parameters relevant to Graft Spray's severity calibration:

- **Sporulation trigger (SPO=1):** night-time moist period ≥3 h with temperature 10–30°C; moist = RH ≥80% OR rain >0 mm OR leaf wetness >30 min [S11]
- **Infection trigger (INF=1):** wetness period at temperature exceeding minimum: optimal temperature 21°C, minimum 4°C, maximum 30.2°C; minimum wetness at optimal = 2 h [S11]
- **SEV (relative infection severity):** cumulative infection rate; maps to observed lesion density (NLL) via logistic regression; SEV 0.065 is the optimal ROC cutoff (81% overall accuracy) [S11]
- **Negative prognosis reliability:** P(P−O−) = 0.87 — if the model predicts no infection, there is an 87% probability no infection occurs; only 4.4% of total DM lesions were missed [S11]

The high reliability of the negative prognosis is the key commercial selling point: growers can safely skip sprays when SEV < 0.065, avoiding unnecessary chemistry and cost.

**FAO materials:** FAO pest forecasting bulletins rely on a similar structured-evidence citation approach, using author-date referencing with explicit evidence grading in their formal guidance documents [S12].

---

## 3. Lessons from Clinical Decision Support

### 3.1 UpToDate: Grade-Anchored Recommendations

[UpToDate](https://www.wolterskluwer.com/en/solutions/uptodate/clinical-decision-support/frequently-asked-questions) is the gold standard for citation-grounded clinical recommendations, used by >2 million clinicians worldwide. Key transferable patterns [S13]:

| UpToDate Pattern | Clinical Implementation | Ag DSS Adaptation |
|---|---|---|
| **GRADE strength × evidence quality matrix** | Strong/Weak × High/Moderate/Low/Very-Low | Spray/Scout/Hold × High/Moderate/Low model confidence |
| **Explicit evidentiary basis stated** | "Based on RCT evidence, we recommend..." | "Based on Brischetto et al. (2021) SEV threshold 0.065: infection risk confirmed" |
| **Weak recommendation with high-quality evidence** | When patient values make the call close | Scout recommendation when model outputs are near the spray threshold |
| **Strong recommendation with low-quality evidence** | When harm is clear even if evidence is limited | Spray recommendation in pre-bloom period when any infection risk exists |
| **Inline citation to specific paper and section** | Superscript reference with full bibliographic detail | `citation_id` in drivers array resolving to DOI + page/table |

The UpToDate GRADE adherence study (2017, BMJ Open) found only 0.6% truly problematic strong recommendations [S14] — a useful benchmark for Graft Spray's calibration target.

### 3.2 IBM Watson for Oncology: What Not to Do

Watson for Oncology's ~$4 billion failure provides the clearest negative-case lessons for Graft Spray [S15, S16]:

| Watson Failure Mode | Root Cause | Graft Spray Mitigation |
|---|---|---|
| Recommendations diverged from local clinical practice | Trained on MSK data; not validated outside controlled settings | Validate severity thresholds per region, variety, and microclimate before commercial use |
| Trust became binary: once clinicians doubted one output, adoption collapsed | No transparent reasoning chain | Every driver in the recommendation card must show its data value, threshold, and paper citation |
| Scaled globally before core assumptions validated | Go-to-market pressure exceeded validation | Soft-launch per region; require scouting cross-validation of model outputs before advisory is trusted |
| Curated training data created a "MSK in a box" problem | Model reflected one institution's protocols | Graft Spray must incorporate local extension guidance (e.g., Cornell NEWA, UC IPM, CropWatch) not just a single model |
| Scalability required heavy per-deployment customisation | Platform treated as finished product, not service | Expose model configuration as transparent, adjustable parameters per block |

The core Watson lesson, directly applicable: *"In decision-support systems, trust is not incremental but binary, and once confidence in outputs is questioned, adoption becomes difficult to sustain regardless of theoretical capabilities."* [S15] — a transparent audit trail is not optional; it is the product.

### 3.3 FDA Software as a Medical Device (SaMD) Framework

The [FDA SaMD framework](https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software-frequently-asked-questions-faqs) defines when CDS software is and is not a regulated medical device via a four-criteria test [S17]:

1. Software does not acquire/process/analyze medical images or signals
2. Displays medical information normally communicated between professionals
3. Provides recommendations (lists, options) to a professional, not a specific directive
4. **Provides the basis of the recommendations** so the professional does not rely primarily on the software to make a decision

Criterion 4 is the pivotal one. Software that provides only a recommendation **without** showing its reasoning is classified as a device (regulated). Software that shows its reasoning — the underlying model, data, threshold, and paper — so the professional can independently evaluate it, can be non-device CDS.

**Direct transfer to Graft Spray:** the `drivers` array in every recommendation card (§7) is not cosmetic — it is the mechanism that keeps the system in the "decision support, not decision making" category, consistent with the spirit of FDA criterion 4. A spray/hold/scout verdict issued without visible drivers is a directive; one with visible drivers is a recommendation. This distinction matters for product liability positioning even outside FDA jurisdiction.

### 3.4 Patterns That Transfer vs. Those That Don't

| Pattern | Transfers to Ag DSS? | Notes |
|---|---|---|
| Citation-grounded recommendations (UpToDate) | ✅ Fully | Thresholds are paper-backed; drivers cite specific papers |
| GRADE evidence grading | ✅ Partially | Adapt: model validation quality (replicated/validated vs. theoretical) maps to high/moderate/low confidence |
| Audit log / tamper-evident replay | ✅ Fully | Immutable JSON log with hash; grower can request audit trail |
| Human-in-the-loop review gate | ✅ With modification | Agronomist review flag for severity ≥8 or when model confidence <0.4 |
| FDA device regulation compliance | ❌ Does not transfer | Ag DSS is not subject to FDA SaMD; but the *design philosophy* of criterion 4 (show your reasoning) is directly applicable |
| Clinical trial RCT evidence hierarchy | ⚠️ Partial | Ag science has observational, field-trial, and multi-year validation data; adapt GRADE accordingly |
| HL7/FHIR data interoperability | ❌ Does not transfer | Replace with open ag data standards (ISO 11783, AgGateway AGIIS) |

---

## 4. Liability Framing for Prescriptive Agricultural Advice

### 4.1 The "Decision Support, Not Decision Making" Doctrine

Extension services and ag software providers universally frame their tools as decision support, not decision-making, to limit liability exposure. The [ComBase food safety DSS disclaimer](https://combasebrowser.errc.ars.usda.gov/membership/disclaimer.aspx) provides the archetype language:

> *"This tool is offered without warranty or guarantee as to its accuracy, as a useful — but not infallible — way of modelling... As a modelling tool only, it cannot be relied upon to make [final] decisions. Situations requiring any such decisions should be referred to [a domain expert] for assessment."* [S18]

This framing has three legal functions:
1. Establishes that the tool is an *input* to a human decision, not a directive
2. Places the reliance obligation on the user's own expertise
3. Limits implied warranty claims by establishing "as is" delivery

### 4.2 Who Bears Liability Under Current Law

Under current U.S. law, **the farmer bears the burden** of regulatory violations caused by erroneous AI recommendations (e.g., pesticide applied at wrong concentration, pre-harvest interval violated) [S19]. Developers face liability primarily through:

- **Product liability claims** if marketing language creates an implied warranty of accuracy
- **Negligence** if reasonable precautions against bias or error were not taken and documented
- **Emerging defamation-adjacent theories** (LTL LED v. Google, D. Minn. 2025) as AI misinformation claims develop [S19]

**Practical implication:** Graft Spray must:
- Choose marketing language that sets "reasonable, bounded expectations" on model accuracy [S20]
- Document precautions against biased outputs (training data provenance, validation results by region/variety)
- Provide explicit spray-interval and pre-harvest-interval cross-checks against label requirements, noting that label compliance is the farmer's responsibility

### 4.3 Specific Disclaimer Architecture

The following layered disclaimer architecture is recommended, drawing on extension service and ag software precedents:

**Layer 1 — Footer on every recommendation card:**
> *"This recommendation is a model-generated decision aid. It does not replace scouting, professional agronomic judgment, or label requirements. The grower retains sole responsibility for all spray decisions and regulatory compliance."*

**Layer 2 — Signed acknowledgement at onboarding (analogous to ADT Model Ag Data Use Agreement [S19]):**
> *"I understand that Graft Spray outputs are informational forecasts based on mechanistic disease models and weather data. I will independently evaluate each recommendation against my vineyard observations. I will comply with all applicable pesticide label requirements regardless of model output. Graft Spray LLC is not liable for crop losses, regulatory violations, or other damages arising from my spray decisions."*

**Layer 3 — In-app audit log access:**
Every grower can download a PDF of the recommendation card with model versions, input data values, thresholds, and citations — creating a record that documents they received the reasoning, not just a verdict.

### 4.4 NIST AI RMF Alignment

The [NIST AI Risk Management Framework (AI RMF 1.0)](https://aglawjournal.wp.drake.edu/wp-content/uploads/sites/66/2025/11/c.-Pohl-Final.pdf) provides non-sector-specific guidance applicable to precision agriculture AI [S19, S30]. Relevant functions for Graft Spray:
- **Govern:** Document model development decisions, validation data provenance, update policies
- **Map:** Identify affected parties (grower, agronomist, environment), potential harms (crop loss, pesticide overuse)
- **Measure:** Continuous monitoring of recommendation accuracy against scouting outcomes
- **Manage:** Version-controlled model updates; users notified of significant threshold changes

---

## 5. LLM-Authored Daily Brief Patterns

### 5.1 Structured Output Architecture

The safest pattern for LLM involvement in high-stakes prescriptive systems is **function-call-only outputs**: the LLM never generates free-form text that could contain hallucinated claims. Instead, it is constrained to fill a typed JSON schema, with all numeric and citation fields drawn from the mechanistic model outputs and knowledge base [S21].

Constrained decoding using finite-state machine (FSM)-based approaches guarantees 100% schema compliance by masking grammatically invalid tokens at each decoding step [S21, S22]. A ServiceNow study (2024) demonstrated RAG + constrained decoding significantly reduces hallucinations in structured JSON outputs vs. unconstrained generation [S29]:

```
Constrained decoding flow:
JSON Schema → Regex → DFA → per-step token mask → valid JSON output
```

For the recommendation card (§7), every field except `narrative_summary` should be constrained-decoded (enum for `action`, integer range for severity scores, UUID format for citation IDs). The `narrative_summary` field should be generated last, after all structured fields are filled, using the structured data as ground-truth context — never the reverse.

### 5.2 Post-Hoc Citation Checking (P-Cite)

A 2025 arXiv study comparing Generation-Time Citation (G-Cite) vs Post-hoc Citation (P-Cite) approaches found [S23]. The FRONT framework (ACL 2024) further established that grounding LLM outputs in fine-grained supporting quotes before generation — rather than citing document identifiers — achieves 14.21% improvement in citation quality on the ALCE benchmark [S28].

**GRADE adaptation:** The GRADE system's strong/weak recommendation × evidence quality matrix [S27] maps to the recommendation card's `action` × `confidence_tier` pairing: a `spray` action with `confidence_tier: high` is equivalent to a strong recommendation with high-quality evidence, while `scout` with `confidence_tier: low` flags the grower to exercise independent judgment.

Results from the comparison:
- P-Cite achieves **higher citation coverage** with competitive correctness; human evaluators consistently rate P-Cite outputs as more accurate and trustworthy
- G-Cite achieves higher precision but at the cost of coverage and speed
- **Recommendation for high-stakes applications:** retrieval-centric P-Cite-first approach — draft the structured output, then verify every claim against retrieved source chunks

The [Provenance lightweight fact-checker](https://aclanthology.org/2024.emnlp-industry.97/) (EMNLP 2024 Industry Track) provides a compact NLI-based implementation [S24]:
- Uses compact open-source NLI models (not a second LLM call)
- Low latency, low cost at runtime
- Traces hallucinations back to specific context chunks
- High ROC-AUC across attribution datasets

**For Graft Spray:** run P-Cite verification on the `narrative_summary` field only (the free-text component). The structured fields are constrained by schema; only free text needs post-hoc grounding verification.

### 5.3 Actor-Critic Hallucination Reduction

For the narrative layer, an actor-critic loop [S25] provides additional hallucination suppression:
1. **Actor:** LLM generates narrative summary from structured fields
2. **Critic prompt:** "Go through the narrative line by line. Does each sentence follow from the structured data fields provided? Flag any sentence that introduces a claim not in the structured data."
3. **Severity classification:** NONE / LOW / HIGH per sentence
4. **If any HIGH:** actor regenerates with previous HIGH sentences as negative examples

This reduces hallucination without unreasonable latency overhead (typically 1–2 iterations converge).

### 5.4 Evaluation Framework for Prescriptive Correctness

Standard LLM evals (BLEU, ROUGE, perplexity) are insufficient for prescriptive recommendation correctness. Proposed eval suite:

| Eval Dimension | Metric | Ground Truth |
|---|---|---|
| **Threshold correctness** | Does the driver correctly report the model's threshold value? | Knowledge base lookup |
| **Data value correctness** | Does the driver correctly report the actual sensor reading? | Raw weather data |
| **Citation resolveability** | Does every `citation_id` resolve to a valid DOI/URL? | Citation registry |
| **Action consistency** | Is `action` consistent with the severity scores and confidence level? | Rule-based logic gate |
| **Narrative grounding** | Does narrative contain zero HIGH-severity hallucinations? | P-Cite + actor-critic score |
| **Scale stability** | Does severity 5 today correspond to the same model output band as severity 5 last week? | Severity anchor registry |

The LLMs for Agricultural Meteorological Recommendations study (Park & Choi, 2024) used GPT-4 as judge with criteria of clarity, specificity, and practicality — a reasonable starting point, but insufficient alone for high-stakes ag advice [S26]. Adding the first four deterministic dimensions above eliminates dependence on LLM-as-judge for factual correctness.

### 5.5 Prompt Template Pattern

A minimal system prompt template for the narrative generation stage:

```
SYSTEM:
You are a viticulture decision-support assistant. Generate ONLY a brief (2–3 sentence) 
narrative summary of the recommendation card data provided below. 
DO NOT introduce any numbers, thresholds, or model names not present in the 
structured data. DO NOT recommend specific pesticide products.
Every factual claim must be traceable to a field in the structured data.

USER:
Structured recommendation card:
{recommendation_card_json}

Generate: narrative_summary field only.
```

The `DO NOT introduce any numbers...not present in the structured data` constraint is the key hallucination guardrail for the numeric domain. Combined with P-Cite verification, this prevents the LLM from fabricating temperature thresholds or severity values.

---

## 6. Severity 1–10 Scale Design

### 6.1 Anchoring the Scale to Mechanistic-Model Output Bands

A 1–10 severity scale is only useful if growers develop a stable mental model of what each number means — and that mental model cannot break when the underlying mechanistic model is updated [S2, S10]. The solution: **anchor each severity tier to a named mechanistic threshold, not to a percentile of historical data**.

Proposed mapping for powdery mildew (Gubler-Thomas Risk Index → Graft Spray severity):

| Severity | Risk Index Band | Pathogen Status | Action signal | Anchor paper |
|---|---|---|---|---|
| 1–2 | RI = 0 | No reproduction; below ascospore infection threshold | Hold | Thomas et al. 1994; Gubler impl. [P1, P2] |
| 3 | RI = 1–30 | Reproducing slowly; >14-day spray interval adequate | Hold | [S7] |
| 4–5 | RI = 30–40 | Moderate; intermediate interval | Scout | [S7] |
| 6–7 | RI = 40–60 | Moderate-high; 10–14 day interval | Scout → Spray | [S7] |
| 8–9 | RI = 60–85 | Rapid reproduction; 7-day minimum | Spray | [S7] |
| 10 | RI = 85–100 + pre-bloom OR ascospore infection event | Epidemic imminent; maximum pressure | Spray (urgent) | [S7]; [P3] Caffi et al. 2011 |

For downy mildew, anchor to Brischetto et al. (2021) SEV thresholds [S11]:

| Severity | SEV / Probability Band | Status | Action |
|---|---|---|---|
| 1–2 | SEV = 0; D'' = 0 | No sporangia; no infection risk | Hold |
| 3–4 | SEV < 0.065; P(infection) < 0.4 | Below ROC threshold; low risk | Hold |
| 5–6 | SEV = 0.065–0.5; P(infection) 0.4–0.7 | Above ROC threshold; moderate infection likely | Scout |
| 7–8 | SEV = 0.5–2.0; P(infection) > 0.7 | High infection probability (NLL > 2.2 lesion density likely) | Spray |
| 9–10 | SEV > 2.0; NLL > 4.8 likely; peak sporangia conditions | Severe; epidemic-level inoculum | Spray (urgent) |

### 6.2 Stability Across Model Updates

The core stability principle: **severity scores are defined by mechanistic threshold crossings, not by model output percentiles**. When the underlying model (e.g., Caffi-Rossi) is updated, the anchor table is reviewed and any tier boundary changes are announced to growers with a version number and explanation — not silently applied.

Protocol for model updates:
1. New model version tagged (e.g., `caffi_rossi_v2.1`)
2. Back-test on historical data: do severity tier transitions occur at the same calendar events?
3. If ≥10% of historical tier assignments change: issue a "scale recalibration notice" to growers explaining what changed and why
4. Growers' mental model is preserved by keeping the action mapping (1–3 = hold, 4–6 = scout, 7–10 = spray) fixed even if tier boundaries shift marginally

**Why this matters:** IBM Watson's loss of clinician trust often stemmed from inconsistent outputs without explanation [S15]. The same dynamic applies to growers: if severity 6 means "scout" today but severity 6 was previously a "spray" indicator, trust collapses without transparent communication.

### 6.3 Confidence vs. Severity

Severity and confidence are orthogonal dimensions and must not be conflated:

- **Severity 7, confidence 0.3** = model output suggests high risk but input data is incomplete / sensor quality is poor → action: `scout` (do not spray on uncertain data)
- **Severity 4, confidence 0.95** = model output suggests moderate risk with high certainty → action: `scout` (clear basis for monitoring)

The `action` field in the recommendation card is a function of both dimensions, not severity alone. Graft Spray should implement an explicit 3×3 action matrix (severity low/mid/high × confidence low/mid/high) with stable mapping, documented and cited.

---

## 7. Recommendation Card Schema

The following JSON schema captures the full daily verdict including inline drivers with mechanistic model, data value, threshold, and citation — designed for both grower display and audit replay.

```json
{
  "$schema": "https://graftspr.ay/schemas/recommendation-card/v1.2",
  "block_id": "string",
  "date": "ISO-8601 date",
  "powdery_severity_1_10": "integer [1-10]",
  "downy_severity_1_10": "integer [1-10]",
  "action": "enum: spray | hold | scout",
  "confidence": "float [0.0-1.0]",
  "confidence_tier": "enum: high | moderate | low",
  "narrative_summary": "string (LLM-generated, P-Cite verified, ≤120 words)",
  "drivers": [
    {
      "model": "string (e.g., 'gubler_thomas_risk_index_v1')",
      "variable": "string (e.g., 'risk_index_conidial')",
      "value": "number",
      "unit": "string",
      "threshold": "number",
      "threshold_context": "string (e.g., 'Lower bound of spray-interval-minimum band')",
      "comparison": "enum: above | below | at",
      "citation_id": "string (resolves to sources registry entry)",
      "citation_label": "string (human-readable, e.g., 'Gubler WD et al. 1996, UC IPM')"
    }
  ],
  "forecast_7d": [
    {
      "date": "ISO-8601 date",
      "powdery_severity_1_10": "integer [1-10]",
      "downy_severity_1_10": "integer [1-10]",
      "action": "enum: spray | hold | scout",
      "confidence": "float [0.0-1.0]",
      "forecast_basis": "string (e.g., '48h weather model; 72h+ climatological baseline')"
    }
  ],
  "data_inputs": {
    "weather_station_id": "string",
    "station_distance_m": "number",
    "temp_avg_c": "number",
    "temp_max_c": "number",
    "temp_min_c": "number",
    "leaf_wetness_hours": "number",
    "rh_avg_pct": "number",
    "rainfall_mm": "number",
    "data_completeness_pct": "number",
    "missing_fields": ["string"]
  },
  "vine_state": {
    "growth_stage": "string (BBCH code or descriptive)",
    "last_spray_date": "ISO-8601 date or null",
    "last_spray_product": "string or null",
    "days_since_last_spray": "integer or null"
  },
  "model_versions": {
    "powdery_mildew_model": "string",
    "downy_mildew_model": "string",
    "llm_narrative_model": "string",
    "schema_version": "string"
  },
  "fallback_applied": "boolean",
  "fallback_reason": "string or null",
  "generated_at": "ISO-8601 datetime with timezone",
  "audit_hash": "string (SHA-256 of canonical JSON minus this field)"
}
```

**Design notes:**
- `audit_hash` is the SHA-256 of the canonical (deterministically serialised) JSON with `audit_hash` set to null — enables tamper-evident replay
- `citation_id` in each driver resolves to a DOI/URL in the sources registry; this is the mechanistic anchor for liability
- `fallback_applied` must be true and `fallback_reason` populated whenever the system falls back to the rule-table (§1.3)
- `data_completeness_pct` below 80% should auto-demote confidence to `low` regardless of model output
- `vine_state.last_spray_date` enables the Risk Index reset logic (UC IPM: index resets to 0 after treatment [S7])
- `forecast_7d` entries beyond 48 h should have `confidence` ≤ 0.5 and `forecast_basis` note the climatological basis

---

## Sources

| Ref | Title / Description | Author / Org | Year | Type | URL | Access |
|---|---|---|---|---|---|---|
| S1 | An auditable and source-verified framework for clinical AI decision support | Alu & Oluwadare; Frontiers in AI | 2026 | Journal | https://pmc.ncbi.nlm.nih.gov/articles/PMC12913532/ | Open |
| S2 | SHAP Feature Attribution — comprehensive review | EmergentMind (synthesising Lundberg et al.) | 2025 | Review | https://www.emergentmind.com/topics/shap-shapley-additive-explanations-feature-attribution | Open |
| S3 | Improving the Validity of Decision Trees as Explanations | arXiv 2306.06777 | 2024 | Preprint | https://arxiv.org/html/2306.06777v5 | Open |
| S4 | RIMpro Decision Support System — product overview | RIMpro | 2024 | Product | https://rimpro.cloud | Open |
| S5 | An Overview of the Digital Pest Management Decision Support Tools: NEWA | AETR Journal | 2025 | Journal | https://www.aetrjournal.org/UserFiles/file/AETR_2025_0218%20Final.pdf | Open |
| S6 | UC IPM Grape Powdery Mildew | UC ANR / ipm.ucanr.edu | 2017 | Extension | https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ | Open |
| S7 | Models: Powdery Mildew of Grape — UC IPM Disease Model Database | UC ANR / ipm.ucanr.edu | 2020 | Model doc | https://ipm.ucanr.edu/DISEASE/DATABASE/grapepowderymildew.html | Open |
| S8 | Comparative efficiency and residue levels of spraying strategies (PM efficacy 89.8% vs 73.5%) | PMC / Open Life Sciences | 2025 | Journal | https://pmc.ncbi.nlm.nih.gov/articles/PMC12326300/ | Open |
| S9 | VineForecast — digital forecasting system for viticulture | VineForecast | 2026 | Product | https://www.vineforecast.com/en/functions/digital-forecasting-system/ | Open |
| S10 | Disease models — grapevine (Metos / Pessl Instruments) | Metos by Pessl Instruments | 2025 | Product doc | https://metos.global/en/disease-models-grapevine/ | Open |
| S11 | A Weather-Driven Model for Predicting Infections of Grapevines by Sporangia of *Plasmopara viticola* | Brischetto, Bove, Fedele, Rossi; Frontiers in Plant Science | 2021 | Journal | https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.636607/full | Open |
| S12 | FAO Style — Referencing and crediting sources | FAO Open Knowledge | 2024 | Style guide | https://openknowledge.fao.org/server/api/core/bitstreams/1fcf6527-d70a-423c-8483-a741bb1c3794/content/referencing.html | Open |
| S13 | FAQs About UpToDate Evidence-Based Decision Support | Wolters Kluwer / UpToDate | n.d. | FAQ | https://www.wolterskluwer.com/en/solutions/uptodate/clinical-decision-support/frequently-asked-questions | Open |
| S14 | UpToDate adherence to GRADE criteria for strong recommendations | BMJ Open | 2017 | Journal | https://pmc.ncbi.nlm.nih.gov/articles/PMC5701989/ | Open |
| S15 | The $4 Billion AI Failure of IBM Watson for Oncology | Henrico Dolfing | 2026 | Analysis | https://www.henricodolfing.ch/en/case-study-20-the-4-billion-ai-failure-of-ibm-watson-for-oncology/ | Open |
| S16 | 4 lessons from IBM's failure to transform medicine with Watson | STAT News | 2021 | News | https://www.statnews.com/2021/03/10/ibm-watson-health-sale-lessons/ | Open |
| S17 | Clinical Decision Support Software Frequently Asked Questions | FDA Center for Devices & Radiological Health | 2025 | Guidance | https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software-frequently-asked-questions-faqs | Open |
| S18 | ComBase disclaimer — decision support tool, food safety | USDA ERRC / ComBase Partners | n.d. | Legal | https://combasebrowser.errc.ars.usda.gov/membership/disclaimer.aspx | Open |
| S19 | Mitigating Legal Risks from Using AI in Agriculture | Drake Ag Law Journal (Pohl) | 2025 | Journal | https://aglawjournal.wp.drake.edu/wp-content/uploads/sites/66/2025/11/c.-Pohl-Final.pdf | Open |
| S20 | AI in Precision Agriculture Makes Legal Issues Sprout | JD Supra | 2024 | Legal news | https://www.jdsupra.com/legalnews/ai-in-precision-agriculture-makes-legal-1819584/ | Open |
| S21 | A Guide to Structured Generation Using Constrained Decoding | Aidan Cooper | 2024 | Technical | https://www.aidancooper.co.uk/constrained-decoding/ | Open |
| S22 | LLM Structured Output and Constrained Decoding | Chaos and Order (youngju.dev) | 2026 | Technical | https://www.youngju.dev/blog/llm/2026-03-07-llm-structured-output-constrained-decoding-json-schema.en | Open |
| S23 | Generation-Time vs. Post-hoc Citation (G-Cite vs P-Cite) | arXiv 2509.21557 | 2025 | Preprint | https://arxiv.org/html/2509.21557 | Open |
| S24 | Provenance: A Light-weight Fact-checker for RAG LLM Output (EMNLP 2024 Industry) | Sankararaman et al.; ACL Anthology | 2024 | Conference | https://aclanthology.org/2024.emnlp-industry.97/ | Open |
| S25 | An Actor-Critic Approach to Reduce Hallucinations in RAG | Intercom / Fin.ai | 2025 | Technical | https://fin.ai/research/an-actor-critic-approach-to-squash-hallucinations/ | Open |
| S26 | LLMs for Enhanced Agricultural Meteorological Recommendations | Park & Choi; arXiv 2408.04640 | 2024 | Preprint | https://arxiv.org/html/2408.04640v1 | Open |
| S27 | GRADE: an emerging consensus on rating quality of evidence and strength of recommendations | BMJ / PMC | 2008 | Journal | https://pmc.ncbi.nlm.nih.gov/articles/PMC2335261/ | Open |
| S28 | Learning Fine-Grained Grounded Citations for Attributed LLMs (FRONT / ALCE) | Huang et al.; ACL 2024 | 2024 | Conference | https://aclanthology.org/2024.findings-acl.838/ | Open |
| S29 | Reducing Hallucination in Structured Outputs via RAG | arXiv 2404.08189 | 2024 | Preprint | https://arxiv.org/abs/2404.08189 | Open |
| S30 | AI in Agriculture Legal Risks (Buckley Law) | Buckley Law P.C. | 2025 | Legal | https://www.buckley-law.com/articles/artificial-intelligence-is-clashing-with-agriculture-law/ | Open |

---

## Paywalled Sources (tag: `[12-reco]`)

| Ref | Title | Author | Year | DOI |
|---|---|---|---|---|
| P11 | Comparison of SHAP and clinician-friendly explanations for AI-based CDSS (NPJ Digital Medicine) | npj Digital Medicine | 2025 | PMC12475050 |
| P12 | Additive-feature-attribution methods: A review on explainable AI for fluid dynamics (Sciencedirect) | ScienceDirect | 2024 | 10.1016/j.ijheatfluidflow.2024... |
| P13 | Efficient Fact-Checking of LLMs on Grounding Documents (MiniCheck, EMNLP 2024) | EMNLP 2024 | 2024 | aclanthology.org/2024.emnlp-main.499 |
| P14 | Social acceptance of LLMs in agricultural extension advisory (QOpen Oxford) | Oxford QOpen | 2026 | 10.1093/qopen/qoag001 |
| P15 | AI for crop production — Where can LLMs help? (Computers and Electronics in Agriculture) | ScienceDirect | 2024 | 10.1016/j.compag.2024.109124 |
