"""
backend/app/core/clock.py

In-memory clock service supporting simulated time travel for demo and testing.
When no simulated date is set, defaults seamlessly to the system's real date (date.today()).
"""

from __future__ import annotations

from datetime import date, timedelta

_simulated_date: date | None = None


def get_today() -> date:
    """Returns the simulated date if set, otherwise the real host system date."""
    global _simulated_date
    if _simulated_date is not None:
        return _simulated_date
    return date.today()


def set_simulated_date(d: date | None) -> date:
    """Sets or clears the simulated date override."""
    global _simulated_date
    _simulated_date = d
    return get_today()


def is_simulated() -> bool:
    """Returns True if the system is currently running on a simulated date override."""
    return _simulated_date is not None


def advance_days(days: int) -> date:
    """Advances the current clock (simulated or real) forward by N days."""
    global _simulated_date
    new_date = get_today() + timedelta(days=days)
    _simulated_date = new_date
    return new_date


def reset_clock() -> date:
    """Clears the simulated date override and reverts to real host system clock."""
    global _simulated_date
    _simulated_date = None
    return date.today()
