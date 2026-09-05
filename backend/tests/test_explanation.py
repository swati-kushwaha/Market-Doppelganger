import asyncio
import unittest

from app.schemas.explanation import ExplanationFacts
from app.services.explanation import deterministic_explanation, explain_facts


class ExplanationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.facts = ExplanationFacts(symbol="RELIANCE", price_change=5.8, volume_multiple=2.4, sector_change=2.1, correlation_change=0.47, historical_similarity=0.94, historical_sample_size=23)

    def test_deterministic_fallback_preserves_fact_buckets(self) -> None:
        result = deterministic_explanation(self.facts)
        self.assertEqual(result.source, "deterministic template")
        self.assertTrue(result.is_fallback)
        self.assertIn("5.8%", result.observed_facts)
        self.assertIn("23 historical", result.historical_context)
        self.assertIn("not a prediction", result.interpretation)

    def test_unconfigured_llm_uses_fallback(self) -> None:
        result = asyncio.run(explain_facts(self.facts))
        self.assertTrue(result.is_fallback)
        self.assertIn("LLM not configured", result.interpretation)


if __name__ == "__main__":
    unittest.main()
