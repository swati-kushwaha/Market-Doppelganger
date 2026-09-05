import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings
from app.schemas.explanation import ExplanationFacts, ExplanationResponse

FORBIDDEN_PHRASES = ("buy", "sell", "recommend", "prediction", "will rise", "will fall", "guarantee", "because")


def deterministic_explanation(facts: ExplanationFacts, reason: str | None = None) -> ExplanationResponse:
    fallback_note = f" ({reason})" if reason else ""
    return ExplanationResponse(
        observed_facts=(f"{facts.symbol} moved {facts.price_change:+.1f}% while trading volume was {facts.volume_multiple:.1f}x the recent baseline. "
                        f"The sector moved {facts.sector_change:+.1f}%, and the observed relationship correlation changed by {facts.correlation_change:+.2f}."),
        historical_context=(f"{facts.historical_sample_size} historical situations with similar characteristics were identified "
                            f"at a {facts.historical_similarity:.0%} similarity level."),
        interpretation=("The supplied price, volume, sector, and relationship facts describe a combination that is worth reviewing in context. "
                       f"This explanation uses deterministic fallback text{fallback_note} and is not a prediction."),
        source="deterministic template",
        is_fallback=True,
    )


async def explain_facts(facts: ExplanationFacts) -> ExplanationResponse:
    if not settings.llm_api_url or not settings.llm_api_key:
        return deterministic_explanation(facts, "LLM not configured")
    try:
        result = await asyncio.to_thread(_request_llm, facts)
        response = _parse_llm_response(result)
        if _contains_forbidden_language(response):
            return deterministic_explanation(facts, "LLM response did not meet safety constraints")
        return ExplanationResponse(**response, source="optional LLM", is_fallback=False)
    except (RuntimeError, ValueError, KeyError, TypeError) as error:
        return deterministic_explanation(facts, str(error))


def _request_llm(facts: ExplanationFacts) -> dict:
    prompt = {
        "role": "system",
        "content": (
            "You are a neutral financial information copy editor. Convert only the supplied structured facts into concise text. "
            "Return JSON with exactly these string keys: observed_facts, historical_context, interpretation. "
            "Do not calculate metrics, add facts, invent causes or news, make predictions, or recommend buying or selling. "
            "Observed facts must only restate supplied measurements. Historical context must only describe the supplied similarity and sample size. "
            "Interpretation must remain cautious and explicitly say this is not a prediction."
        ),
    }
    body = json.dumps({"model": settings.llm_model, "messages": [prompt, {"role": "user", "content": facts.model_dump_json()}], "temperature": 0, "response_format": {"type": "json_object"}}).encode()
    request = Request(settings.llm_api_url, data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {settings.llm_api_key}"}, method="POST")
    try:
        with urlopen(request, timeout=settings.llm_timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"LLM explanation request failed: {error}") from error
    content = payload["choices"][0]["message"]["content"]
    return json.loads(content) if isinstance(content, str) else content


def _parse_llm_response(payload: dict) -> dict[str, str]:
    required = ("observed_facts", "historical_context", "interpretation")
    if any(not isinstance(payload.get(key), str) or not payload[key].strip() for key in required):
        raise ValueError("LLM explanation response was incomplete")
    return {key: payload[key].strip() for key in required}


def _contains_forbidden_language(response: dict[str, str]) -> bool:
    text = " ".join(response.values()).lower()
    return any(phrase in text for phrase in FORBIDDEN_PHRASES)
