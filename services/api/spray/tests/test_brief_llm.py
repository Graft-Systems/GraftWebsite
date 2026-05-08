"""LLM brief module tests (M1.5 PR-F.5 step 9).

Mocks the Anthropic SDK at the call boundary. No live API hits.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings

from spray.recommendation.llm_brief import (
    LLMMalformed,
    LLMUnavailable,
    generate,
)


VERDICT = {
    "id": "v-1",
    "powdery_severity_1_10": 7.2,
    "downy_severity_1_10": 3.1,
    "drivers": [
        {"model": "gubler_thomas_2013", "value": 7.2, "citation_id": "GUBLER_2013"}
    ],
}


def _mock_response(text: str, *, in_tokens: int = 200, out_tokens: int = 50):
    block = MagicMock()
    block.text = text
    resp = MagicMock()
    resp.content = [block]
    resp.usage = MagicMock(input_tokens=in_tokens, output_tokens=out_tokens)
    return resp


@override_settings(ANTHROPIC_API_KEY="x")
def test_generate_happy_path():
    fake_resp = _mock_response(
        '{"headline": "Spray now.", "paragraphs": ["Powdery at 7.2/10."]}'
    )
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_resp
    with patch("anthropic.Anthropic", return_value=fake_client):
        result = generate(VERDICT)
    assert result.headline == "Spray now."
    assert result.paragraphs == ["Powdery at 7.2/10."]
    assert result.prompt_tokens == 200
    assert result.completion_tokens == 50


@override_settings(ANTHROPIC_API_KEY="x")
def test_generate_extracts_json_embedded_in_chatter():
    fake_resp = _mock_response(
        'Sure! Here is the brief: {"headline": "ok", "paragraphs": ["a"]} done.'
    )
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_resp
    with patch("anthropic.Anthropic", return_value=fake_client):
        result = generate(VERDICT)
    assert result.headline == "ok"


@override_settings(ANTHROPIC_API_KEY="x")
def test_generate_malformed_raises():
    fake_resp = _mock_response("this is not json at all")
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_resp
    with patch("anthropic.Anthropic", return_value=fake_client):
        with pytest.raises(LLMMalformed):
            generate(VERDICT)


@override_settings(ANTHROPIC_API_KEY="x")
def test_generate_missing_headline_raises():
    fake_resp = _mock_response('{"paragraphs": ["x"]}')
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_resp
    with patch("anthropic.Anthropic", return_value=fake_client):
        with pytest.raises(LLMMalformed):
            generate(VERDICT)


@override_settings(ANTHROPIC_API_KEY="x")
def test_generate_too_many_paragraphs_raises():
    fake_resp = _mock_response(
        '{"headline": "x", "paragraphs": ["a", "b", "c", "d", "e"]}'
    )
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_resp
    with patch("anthropic.Anthropic", return_value=fake_client):
        with pytest.raises(LLMMalformed):
            generate(VERDICT)


@override_settings(ANTHROPIC_API_KEY="")
def test_generate_no_key_raises_unavailable():
    with pytest.raises(LLMUnavailable):
        generate(VERDICT)
