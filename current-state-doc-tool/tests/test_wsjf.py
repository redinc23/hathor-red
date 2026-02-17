from app.models import BacklogItem


def test_wsjf_basic() -> None:
    b = BacklogItem(title="x", cost_of_delay=10, job_size=2, business_value=0)
    assert abs(b.wsjf - 5.0) < 1e-9


def test_wsjf_zero_job_size_safe() -> None:
    b = BacklogItem(title="x", cost_of_delay=10, job_size=0, business_value=0)
    assert b.wsjf == 0.0
