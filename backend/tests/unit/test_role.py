"""Unit tests for the Role value object and its privilege ordering."""

from __future__ import annotations

from app.domain.value_objects.role import Role


def test_admin_satisfies_all_roles() -> None:
    assert Role.ADMIN.satisfies(Role.USER)
    assert Role.ADMIN.satisfies(Role.DOCTOR)
    assert Role.ADMIN.satisfies(Role.ADMIN)


def test_user_does_not_satisfy_higher_roles() -> None:
    assert Role.USER.satisfies(Role.USER)
    assert not Role.USER.satisfies(Role.DOCTOR)
    assert not Role.USER.satisfies(Role.ADMIN)


def test_doctor_ordering() -> None:
    assert Role.DOCTOR.satisfies(Role.USER)
    assert Role.DOCTOR.satisfies(Role.DOCTOR)
    assert not Role.DOCTOR.satisfies(Role.ADMIN)
    assert Role.DOCTOR.rank > Role.USER.rank
