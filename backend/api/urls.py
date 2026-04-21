from django.urls import path

from . import views

app_name = "api"

urlpatterns = [
    path("contact", views.contact, name="contact"),
    path("estimate", views.estimate, name="estimate"),
]
