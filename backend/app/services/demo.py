from app.schemas.demo import DemoCorrelation, DemoPattern, DemoQuote, DemoScenario, DemoSignal


def get_demo_scenario() -> DemoScenario:
    return DemoScenario(
        mode="DEMO MODE",
        title="Your watchlist changed shape.",
        before_quotes=[
            DemoQuote(symbol="RELIANCE", price_change="+0.4%", volume="Normal volume"),
            DemoQuote(symbol="ONGC", price_change="+0.2%", volume="Normal volume"),
        ],
        after_quotes=[
            DemoQuote(symbol="RELIANCE", price_change="+5.8%", volume="2.4x normal volume"),
            DemoQuote(symbol="ONGC", price_change="+4.9%", volume="1.9x normal volume"),
        ],
        correlation=DemoCorrelation(pair="RELIANCE vs ONGC", before=0.31, after=0.78),
        signals=[
            DemoSignal(kind="price", title="Price anomaly", detail="RELIANCE moved +5.8%, well above its recent baseline.", tone="red"),
            DemoSignal(kind="volume", title="Volume anomaly", detail="Trading volume reached 2.4x the recent normal level.", tone="amber"),
            DemoSignal(kind="relationship", title="Relationship anomaly", detail="RELIANCE and ONGC moved more closely together than their baseline.", tone="amber"),
        ],
        historical_pattern=DemoPattern(event_date="2024-07-18", similarity=0.94, future_1d=0.017, future_3d=0.034, future_5d=-0.008),
        historical_outcomes={"1D median": 0.018, "3D median": 0.032, "5D median": 0.011, "Positive 3D frequency": 0.61},
        sample_size=18,
    )
