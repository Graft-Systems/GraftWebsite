from django.urls import path

from . import views

app_name = "api"

urlpatterns = [
    path("contact", views.contact, name="contact"),
    path("estimate", views.estimate, name="estimate"),
    path("estimate/history", views.estimate_history, name="estimate_history"),
    path(
        "estimate/history/<int:batch_id>",
        views.delete_estimate_batch,
        name="delete_estimate_batch",
    ),
    path("waitlist", views.waitlist, name="waitlist"),
]
