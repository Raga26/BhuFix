"""Simple SMB payroll from attendance summaries + advances."""
from __future__ import annotations

from calendar import monthrange
from typing import Any


def generate_payslips(
    company: dict,
    employees: list[dict],
    day_summaries: list[dict],
    advances: list[dict],
    month: int,
    year: int,
) -> list[dict]:
    days_in_month = monthrange(year, month)[1]
    summaries_by_emp: dict[str, list[dict]] = {}
    for s in day_summaries:
        summaries_by_emp.setdefault(s["employee_id"], []).append(s)

    adv_by_emp: dict[str, float] = {}
    for a in advances:
        if a.get("month") == month and a.get("year") == year:
            adv_by_emp[a["employee_id"]] = adv_by_emp.get(a["employee_id"], 0) + float(a.get("amount", 0))

    slips = []
    for emp in employees:
        if not emp.get("is_active", True):
            continue
        days = summaries_by_emp.get(emp["id"], [])
        present = sum(1 for d in days if d["status"] in ("present", "late"))
        half = sum(1 for d in days if d["status"] == "half_day")
        absent = sum(1 for d in days if d["status"] == "absent")
        ot_hours = round(sum(float(d.get("ot_hours") or 0) for d in days), 2)
        late_days = sum(1 for d in days if d["status"] == "late")

        pay_type = emp.get("pay_type", "monthly")
        if pay_type == "daily":
            daily = float(emp.get("daily_wage") or 0)
            base = daily * present + daily * 0.5 * half
        else:
            monthly = float(emp.get("monthly_salary") or 0)
            per_day = monthly / days_in_month if days_in_month else 0
            base = per_day * present + per_day * 0.5 * half

        ot_pay = ot_hours * float(emp.get("ot_rate_per_hour") or 0)
        advance = adv_by_emp.get(emp["id"], 0)
        gross = round(base + ot_pay, 2)
        net = round(max(0, gross - advance), 2)

        slips.append(
            {
                "employee_id": emp["id"],
                "employee_name": emp.get("name"),
                "employee_code": emp.get("employee_code"),
                "month": month,
                "year": year,
                "pay_type": pay_type,
                "present_days": present,
                "half_days": half,
                "absent_days": absent,
                "late_days": late_days,
                "ot_hours": ot_hours,
                "base_pay": round(base, 2),
                "ot_pay": round(ot_pay, 2),
                "advance": advance,
                "gross": gross,
                "net": net,
                "company_name": company.get("name"),
            }
        )
    return slips


def slips_whatsapp_summary(company: dict, slips: list[dict], month: int, year: int) -> str:
    total = sum(s["net"] for s in slips)
    lines = [
        f"*{company.get('name', 'Business')} — Payroll {month}/{year}*",
        f"Employees: {len(slips)}",
        f"Total payout: ₹{total:,.2f}",
        "",
    ]
    for s in slips:
        lines.append(f"• {s['employee_name']}: ₹{s['net']:,.2f} (P{s['present_days']} H{s['half_days']} A{s['absent_days']})")
    return "\n".join(lines)
