from django.apps import AppConfig


class SprayConfig(AppConfig):
    """Graft Spray Django app.

    Owns the multi-tenant data model for the Spray product: Org, User,
    Membership, Session, AuthEvent, ConsentRecord (M0-02), plus Vineyard,
    Block, Capture, MLPrediction, Recommendation, ExternalRiskIndex, etc.
    in subsequent milestones per CODEBASE_PLAN.md section 8.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "spray"
    verbose_name = "Graft Spray"

    def ready(self) -> None:
        # Wire signals (M0-05 centroid recompute, etc.) at startup.
        # Import is local so Django's app-loading sequence sees the models
        # before the signal handlers reference them.
        from spray import signals  # noqa: F401
