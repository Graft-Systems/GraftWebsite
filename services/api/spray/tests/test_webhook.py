"""Clerk webhook tests (M0-02 step 10).

Signs payloads with a fixed Svix secret and verifies the handler:
  - rejects bad signatures (400)
  - returns 503 when the secret is unset
  - creates a User on user.created
  - is idempotent on replay
  - soft-deletes on user.deleted
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import pytest
from django.test import Client, override_settings
from svix.webhooks import Webhook

from spray.models import AuthEvent, Session, User


WEBHOOK_SECRET = "whsec_dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHM="
WEBHOOK_URL = "/api/spray/clerk/webhook"


pytestmark = pytest.mark.django_db


def _sign(payload: dict, *, msg_id: str = "msg_test_1") -> tuple[bytes, dict]:
    body_str = json.dumps(payload)
    wh = Webhook(WEBHOOK_SECRET)
    now = datetime.now(tz=timezone.utc)
    signature = wh.sign(msg_id, now, body_str)
    headers = {
        "HTTP_SVIX_ID": msg_id,
        "HTTP_SVIX_TIMESTAMP": str(int(now.timestamp())),
        "HTTP_SVIX_SIGNATURE": signature,
    }
    return body_str.encode("utf-8"), headers


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_user_created_creates_local_user():
    payload = {
        "type": "user.created",
        "data": {
            "id": "user_clerk_123",
            "email_addresses": [
                {"id": "ema_1", "email_address": "alice@example.com"}
            ],
            "primary_email_address_id": "ema_1",
            "first_name": "Alice",
            "last_name": "Vine",
        },
    }
    body, headers = _sign(payload)
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    assert resp.status_code == 200
    user = User.objects.get(clerk_user_id="user_clerk_123")
    assert user.email == "alice@example.com"
    assert user.name == "Alice Vine"
    assert AuthEvent.objects.filter(
        user=user, type=AuthEvent.Type.SIGN_UP
    ).exists()


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_user_created_idempotent_on_replay():
    payload = {
        "type": "user.created",
        "data": {
            "id": "user_replay",
            "email_addresses": [{"id": "e1", "email_address": "r@x.com"}],
            "primary_email_address_id": "e1",
        },
    }
    body, headers = _sign(payload, msg_id="msg_replay")
    client = Client()
    r1 = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    r2 = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert User.objects.filter(clerk_user_id="user_replay").count() == 1


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_user_deleted_soft_deletes():
    User.objects.create(clerk_user_id="user_to_del", email="d@x.com")
    payload = {"type": "user.deleted", "data": {"id": "user_to_del"}}
    body, headers = _sign(payload, msg_id="msg_del")
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    assert resp.status_code == 200
    user = User.objects.get(clerk_user_id="user_to_del")
    assert user.deleted_at is not None


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_session_created_creates_session_row():
    User.objects.create(clerk_user_id="user_sess", email="s@x.com")
    payload = {
        "type": "session.created",
        "data": {"id": "sess_abc", "user_id": "user_sess"},
    }
    body, headers = _sign(payload, msg_id="msg_sess")
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    assert resp.status_code == 200
    assert Session.objects.filter(clerk_session_id="sess_abc").exists()


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_invalid_signature_rejected():
    body = json.dumps({"type": "user.created", "data": {}}).encode("utf-8")
    headers = {
        "HTTP_SVIX_ID": "msg_bad",
        "HTTP_SVIX_TIMESTAMP": str(int(time.time())),
        "HTTP_SVIX_SIGNATURE": "v1,bogus",
    }
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json", **headers)
    assert resp.status_code == 400


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET=WEBHOOK_SECRET)
def test_missing_svix_headers_rejected():
    body = json.dumps({"type": "user.created", "data": {}}).encode("utf-8")
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json")
    assert resp.status_code == 400


@override_settings(CLERK_WEBHOOK_SIGNING_SECRET="")
def test_unconfigured_secret_returns_503():
    body = json.dumps({"type": "user.created", "data": {}}).encode("utf-8")
    client = Client()
    resp = client.post(WEBHOOK_URL, body, content_type="application/json")
    assert resp.status_code == 503
