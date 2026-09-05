import unittest

from app.services.demo import get_demo_scenario


class DemoScenarioTests(unittest.TestCase):
    def test_scenario_is_deterministic_and_complete(self) -> None:
        first = get_demo_scenario().model_dump()
        second = get_demo_scenario().model_dump()
        self.assertEqual(first, second)
        self.assertEqual(first["correlation"]["before"], 0.31)
        self.assertEqual(first["correlation"]["after"], 0.78)
        self.assertEqual(len(first["signals"]), 3)
        self.assertEqual(first["sample_size"], 18)


if __name__ == "__main__":
    unittest.main()
