# Graft Spray data model.
#
# At M0-02 step 1 (this commit) the spray app is a skeleton; models land in
# step 2 of M0-02 per docs/spec/_plans/M0-02-plan.md:
#
#   - Org              (tenant boundary)
#   - User             (mirrors Clerk user)
#   - Membership       (Org-User-Role bridge)
#   - Session          (Clerk session record)
#   - AuthEvent        (immutable auth audit trail)
#   - ConsentRecord    (per-category consent toggles per spec section 19)
#
# Subsequent milestones add: Vineyard, Block (PostGIS), WeatherStation,
# WeatherObservation, ExternalRiskIndex, RiskIndexRun, SprayRecord, Product,
# UserProductPreference, Capture, MLPrediction, MLCorrection, Recommendation,
# RecommendationOutcome, Notification, NotificationEvent, IntegrationConnection,
# ResearchDocument, ChatSession, ChatMessage, DataLakeEvent. See
# Graft-Spray-App-Spec.md section 9 for the full table.

# from django.db import models  # uncomment in M0-02 step 2
