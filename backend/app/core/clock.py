"""
backend/app/core/clock.py

Clock service supporting simulated time travel for demo, testing, and devtool controls.
Persists the simulated date so that the system strictly follows dates set via DevTools
or student onboarding, never unexpectedly defaulting to the host machine clock.
"""

from __future__ import annotations

import os
from datetime import date, timedelta

DEFAULT_SIMULATED_DATE = date(2026, 7, 15)
_CLOCK_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    ".simulated_clock",
)

_simulated_date: date | None = None


def _load_persisted_date() -> date | None:
    if os.path.exists(_CLOCK_FILE):
        try:
            with open(_CLOCK_FILE, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val:
                    return date.fromisoformat(val)
        except Exception:
            pass
    return None


def _save_persisted_date(d: date | None) -> None:
    try:
        if d is not None:
            with open(_CLOCK_FILE, "w", encoding="utf-8") as f:
                f.write(d.isoformat())
        elif os.path.exists(_CLOCK_FILE):
            os.remove(_CLOCK_FILE)
    except Exception:
        pass


def get_today() -> date:
    """Returns the simulated date if set, otherwise the persisted or default simulated date."""
    global _simulated_date
    if _simulated_date is not None:
        return _simulated_date

    persisted = _load_persisted_date()
    if persisted is not None:
        _simulated_date = persisted
        return _simulated_date

    _simulated_date = DEFAULT_SIMULATED_DATE
    return _simulated_date


def set_simulated_date(d: date | None) -> date:
    """Sets or clears the simulated date override and persists it."""
    global _simulated_date
    _simulated_date = d
    _save_persisted_date(d)
    return get_today()


def is_simulated() -> bool:
    """Returns True if running on a simulated date."""
    return True


def advance_days(days: int) -> date:
    """Advances the current clock forward by N days."""
    global _simulated_date
    new_date = get_today() + timedelta(days=days)
    _simulated_date = new_date
    _save_persisted_date(new_date)
    return new_date


def reset_clock() -> date:
    """Resets clock back to the baseline semester start date."""
    global _simulated_date
    _simulated_date = DEFAULT_SIMULATED_DATE
    _save_persisted_date(DEFAULT_SIMULATED_DATE)
    return DEFAULT_SIMULATED_DATE
