"""P0 RBAC: roles, departments, job roles, and a (role, department, resource) matrix.

Enforcement belongs in FastAPI dependencies. The sidebar is display-only.
"""
from typing import Iterable, Optional

from fastapi import Depends, HTTPException

ROLES = ("owner", "admin", "operations_manager", "employee", "client")
LEADERSHIP_ROLES = ("owner", "admin", "operations_manager")
AGENCY_ROLES = ("owner", "admin", "operations_manager", "employee")

DEPARTMENTS = (
    "administration",
    "marketing",
    "creative",
    "technology",
    "operations",
    "external",
)

JOB_ROLES = {
    "owner": ("administration", "Owner"),
    "admin": ("administration", "Admin"),
    "operations_manager": ("administration", "Operations Manager"),
    "digital_marketer": ("marketing", "Digital Marketer"),
    "smm": ("marketing", "SMM"),
    "seo": ("marketing", "SEO"),
    "data_analyst": ("marketing", "Data Analyst"),
    "senior_editor": ("creative", "Senior Editor"),
    "junior_editor": ("creative", "Junior Editor"),
    "content_writer": ("creative", "Content Writer"),
    "designer": ("creative", "Designer"),
    "cinematographer": ("creative", "Cinematographer"),
    "web_developer": ("technology", "Web Developer"),
    "operations_staff": ("operations", "Operations"),
    "custom": ("operations", "Custom"),
    "client": ("external", "Client"),
}

# Legacy dashboard sub_role → job_role
SUB_ROLE_MAP = {
    "editor": "junior_editor",
    "videographer": "cinematographer",
    "management": "operations_staff",
    "digital_marketer": "digital_marketer",
    "graphic_designer": "designer",
    "content_writer": "content_writer",
    "smm": "smm",
    "seo": "seo",
    "data_analyst": "data_analyst",
    "senior_editor": "senior_editor",
    "junior_editor": "junior_editor",
    "designer": "designer",
    "cinematographer": "cinematographer",
    "web_developer": "web_developer",
    "operations_staff": "operations_staff",
}

RESOURCES = (
    "users",
    "clients",
    "packages",
    "invoices",
    "tasks",
    "assets",
    "calendar",
    "ads",
    "kpis",
    "post_reports",
    "chat",
    "strategy",
    "dashboard",
    "approvals",
    "clips",
    "seo",
    "web",
    "competitors",
    "notifications",
    "audit",
    "performance",
    "insights",
)

# action -> roles that always have it (department refinements applied after)
# Format: resource -> action -> allowed roles, optional department allow-list for employees
MATRIX = {
    "users": {
        "read": ("owner", "admin", "operations_manager"),
        "write": ("owner", "admin", "operations_manager"),
        "delete": ("owner", "admin"),
        "manage": ("owner", "admin"),
        "directory": ("owner", "admin", "operations_manager", "employee"),
    },
    "clients": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager"),
        "delete": ("owner", "admin"),
    },
    "packages": {
        "read": ("owner", "admin", "operations_manager"),
        "write": ("owner", "admin"),
    },
    "invoices": {
        "read": ("owner", "admin", "operations_manager", "client"),
        "write": ("owner", "admin"),
    },
    "tasks": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "assets": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "calendar": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "ads": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "employee"),
    },
    "kpis": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "employee"),
    },
    "post_reports": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "chat": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee", "client"),
    },
    "strategy": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "dashboard": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
    },
    "approvals": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "clips": {
        "read": ("owner", "admin", "operations_manager", "employee"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "seo": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "web": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "competitors": {
        "read": ("owner", "admin", "operations_manager", "employee"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
    "notifications": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee", "client"),
    },
    "audit": {
        "read": ("owner", "admin", "operations_manager"),
    },
    "performance": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
    },
    "insights": {
        "read": ("owner", "admin", "operations_manager", "employee", "client"),
        "write": ("owner", "admin", "operations_manager", "employee"),
    },
}

EMPLOYEE_STRATEGY_WRITE_JOBS = {
    "digital_marketer", "smm", "seo", "operations_staff",
}
EMPLOYEE_ADS_WRITE_DEPTS = {"marketing"}
EMPLOYEE_KPI_WRITE_DEPTS = {"marketing"}
EMPLOYEE_SEO_WRITE_DEPTS = {"marketing"}
EMPLOYEE_WEB_WRITE_DEPTS = {"technology"}
EMPLOYEE_COMPETITOR_WRITE_DEPTS = {"marketing"}
CLIENT_ASSET_BUCKETS = {"approved", "published", "reports", "invoices", "brand"}

_CREATIVE_DESK = frozenset({
    "dashboard", "clients", "tasks", "assets", "calendar", "chat",
    "strategy", "approvals", "notifications", "clips",
})
_MARKETING_CORE = frozenset({
    "dashboard", "clients", "tasks", "assets", "calendar", "chat",
    "strategy", "approvals", "notifications", "post_reports",
})

# Floor staff only see the desk for their job. Leadership is not in this map.
EMPLOYEE_JOB_RESOURCES = {
    "digital_marketer": _MARKETING_CORE | {"ads", "performance", "kpis", "insights", "competitors"},
    "smm": _MARKETING_CORE,
    "seo": _MARKETING_CORE | {"seo", "competitors", "insights", "web"},
    "data_analyst": frozenset({
        "dashboard", "clients", "tasks", "chat", "notifications",
        "ads", "performance", "kpis", "insights", "seo",
    }),
    "senior_editor": _CREATIVE_DESK,
    "junior_editor": _CREATIVE_DESK,
    "cinematographer": _CREATIVE_DESK,
    "content_writer": _CREATIVE_DESK,
    "designer": _CREATIVE_DESK,
    "web_developer": frozenset({
        "dashboard", "clients", "tasks", "assets", "chat", "approvals",
        "notifications", "web", "seo",
    }),
    "operations_staff": frozenset({
        "dashboard", "clients", "tasks", "assets", "calendar", "chat",
        "strategy", "approvals", "notifications",
    }),
    "custom": frozenset({
        "dashboard", "clients", "tasks", "calendar", "chat", "notifications",
    }),
}


def is_agency(user: dict) -> bool:
    return (user or {}).get("role") in AGENCY_ROLES


def is_leadership(user: dict) -> bool:
    return (user or {}).get("role") in LEADERSHIP_ROLES


def department_for_job(job_role: Optional[str], role: str) -> str:
    if role == "owner":
        return "administration"
    if role == "admin":
        return "administration"
    if role == "operations_manager":
        return "administration"
    if role == "client":
        return "external"
    meta = JOB_ROLES.get(job_role or "")
    if meta:
        return meta[0]
    return "operations"


def job_label(user: dict) -> str:
    role = (user or {}).get("role")
    job = (user or {}).get("job_role")
    if job and job in JOB_ROLES:
        return JOB_ROLES[job][1]
    if role == "owner":
        return "Owner"
    if role == "admin":
        return "Admin"
    if role == "operations_manager":
        return "Operations Manager"
    if role == "client":
        return "Client"
    custom = (user or {}).get("job_title") or (user or {}).get("sub_role")
    return custom or "Employee"


def normalized_job(user: dict) -> str:
    raw = (user or {}).get("job_role") or (user or {}).get("sub_role") or ""
    return SUB_ROLE_MAP.get(raw, raw) or "custom"


def employee_resources(user: dict) -> frozenset:
    job = normalized_job(user)
    if job in EMPLOYEE_JOB_RESOURCES:
        return EMPLOYEE_JOB_RESOURCES[job]
    if (user or {}).get("department") == "creative":
        return _CREATIVE_DESK
    if (user or {}).get("department") == "marketing":
        return _MARKETING_CORE
    if (user or {}).get("department") == "technology":
        return EMPLOYEE_JOB_RESOURCES["web_developer"]
    return EMPLOYEE_JOB_RESOURCES["custom"]


def can(user: dict, resource: str, action: str) -> bool:
    if not user:
        return False
    role = user.get("role")
    if role == "owner":
        return True
    allowed = MATRIX.get(resource, {}).get(action, ())
    if role not in allowed:
        return False
    if role == "employee":
        if resource not in employee_resources(user):
            return False
        dept = user.get("department") or department_for_job(user.get("job_role"), role)
        if resource == "ads" and action == "write" and dept not in EMPLOYEE_ADS_WRITE_DEPTS:
            return False
        if resource == "strategy" and action == "write" and normalized_job(user) not in EMPLOYEE_STRATEGY_WRITE_JOBS:
            return False
        if resource == "kpis" and action == "write" and dept not in EMPLOYEE_KPI_WRITE_DEPTS:
            return False
        if resource == "seo" and action == "write" and dept not in EMPLOYEE_SEO_WRITE_DEPTS:
            return False
        if resource == "web" and action == "write" and dept not in EMPLOYEE_WEB_WRITE_DEPTS:
            return False
        if resource == "competitors" and action == "write" and dept not in EMPLOYEE_COMPETITOR_WRITE_DEPTS:
            return False
    return True


def insight_kinds_for(user: dict) -> Optional[list]:
    """None = every kind (leadership). Employees get only kinds for their job."""
    if not user:
        return []
    if is_leadership(user) or user.get("role") == "owner":
        return None
    if user.get("role") == "client":
        return None
    job = normalized_job(user)
    by_job = {
        "digital_marketer": ["ads_health", "ads_budget", "ads_ab", "overdue_task", "strategy_gap"],
        "smm": ["overdue_content", "overdue_task", "strategy_gap", "clip_idea"],
        "seo": ["seo_rank", "overdue_task", "strategy_gap", "web_stage"],
        "data_analyst": ["ads_health", "ads_budget", "ads_ab", "seo_rank"],
        "web_developer": ["web_stage", "seo_rank", "overdue_task"],
        "senior_editor": ["overdue_task", "clip_idea", "overdue_content"],
        "junior_editor": ["overdue_task", "clip_idea", "overdue_content"],
        "cinematographer": ["overdue_task", "clip_idea"],
        "content_writer": ["overdue_task", "clip_idea"],
        "designer": ["overdue_task", "clip_idea"],
        "operations_staff": ["overdue_task", "overdue_content", "strategy_gap"],
        "custom": ["overdue_task"],
    }
    return by_job.get(job, ["overdue_task"])


def permission_keys(user: dict) -> list:
    keys = []
    for resource, actions in MATRIX.items():
        for action in actions:
            if can(user, resource, action):
                keys.append(f"{resource}.{action}")
    return keys


def public_user(user: dict) -> dict:
    if not user:
        return {}
    skip = {"password_hash", "_id"}
    out = {k: v for k, v in user.items() if k not in skip}
    out["permissions"] = permission_keys(user)
    out["job_label"] = job_label(user)
    return out


def can_internal_review(user: dict, client_id: Optional[str] = None) -> bool:
    """Anyone on that client, or leadership. Small teams do not split junior/senior."""
    if not user or user.get("role") == "client":
        return False
    if is_leadership(user) or user.get("role") == "owner":
        return True
    if user.get("role") not in AGENCY_ROLES:
        return False
    if not client_id:
        return True
    ids = accessible_client_ids(user)
    if ids is None:
        return True
    return client_id in ids


def is_creative_staff(user: dict) -> bool:
    job = normalized_job(user)
    if job in EMPLOYEE_JOB_RESOURCES and job not in {
        "senior_editor",
        "junior_editor",
        "cinematographer",
        "content_writer",
        "designer",
    }:
        return False
    if (user or {}).get("department") == "creative":
        return True
    return job in {
        "senior_editor",
        "junior_editor",
        "cinematographer",
        "content_writer",
        "designer",
    }


def assigned_client_ids(user: dict) -> list:
    ids = list(user.get("assigned_client_ids") or [])
    if user.get("client_id") and user.get("role") == "client":
        return [user["client_id"]]
    return [i for i in ids if i]


def accessible_client_ids(user: dict) -> Optional[list]:
    """None means all clients (leadership). Empty list means none."""
    role = (user or {}).get("role")
    if role in LEADERSHIP_ROLES or role == "owner":
        return None
    if role == "client":
        cid = user.get("client_id")
        return [cid] if cid else []
    return assigned_client_ids(user)


def client_query(user: dict, field: str = "client_id") -> Optional[dict]:
    ids = accessible_client_ids(user)
    if ids is None:
        return None
    if not ids:
        return {"__none__": True}
    if len(ids) == 1:
        return {field: ids[0]}
    return {field: {"$in": ids}}


def apply_client_query(query: dict, user: dict, field: str = "client_id") -> dict:
    extra = client_query(user, field)
    if extra is None:
        return query
    if extra.get("__none__"):
        query[field] = {"$in": []}
        return query
    query.update(extra)
    return query


def assert_client_access(user: dict, client_id: Optional[str], *, allow_empty: bool = False):
    if not client_id:
        if allow_empty and is_leadership(user):
            return
        raise HTTPException(status_code=400, detail="client_id is required")
    ids = accessible_client_ids(user)
    if ids is None:
        return
    if client_id not in ids:
        raise HTTPException(status_code=403, detail="You do not have access to this client")


def assert_can(user: dict, resource: str, action: str):
    if not can(user, resource, action):
        raise HTTPException(status_code=403, detail="You do not have permission for this action")


def make_require(get_current_user, resource: str, action: str):
    async def _dep(current_user: dict = Depends(get_current_user)) -> dict:
        assert_can(current_user, resource, action)
        return current_user
    return _dep


def map_legacy_job(sub_role: Optional[str], role: str) -> tuple:
    if role == "owner":
        return "administration", "owner", None
    if role == "admin":
        return "administration", "admin", None
    if role == "operations_manager":
        return "administration", "operations_manager", None
    if role == "client":
        return "external", "client", None
    mapped = SUB_ROLE_MAP.get((sub_role or "").strip())
    if mapped:
        dept, _ = JOB_ROLES[mapped]
        return dept, mapped, None
    if sub_role:
        return "operations", "custom", sub_role
    return "operations", "custom", None


def normalize_create_role(
    actor: dict,
    role: Optional[str],
    job_role: Optional[str],
    sub_role: Optional[str],
) -> dict:
    """Decide role/department/job_role for a user being created or edited."""
    actor_role = actor.get("role")
    requested = (role or "").strip() or "employee"

    if requested == "owner":
        raise HTTPException(status_code=400, detail="Owner accounts cannot be created here")

    if requested == "admin":
        if actor_role != "owner":
            raise HTTPException(status_code=403, detail="Only the owner can create admins")
        return {
            "role": "admin",
            "department": "administration",
            "job_role": "admin",
            "job_title": None,
            "sub_role": None,
            "client_id": None,
        }

    if requested == "operations_manager":
        if actor_role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Only owner or admin can create operations managers")
        return {
            "role": "operations_manager",
            "department": "administration",
            "job_role": "operations_manager",
            "job_title": None,
            "sub_role": None,
            "client_id": None,
        }

    if requested == "client":
        return {
            "role": "client",
            "department": "external",
            "job_role": "client",
            "job_title": None,
            "sub_role": None,
        }

    # Staff / custom job
    jr = (job_role or "").strip() or SUB_ROLE_MAP.get((sub_role or "").strip()) or "custom"
    if jr not in JOB_ROLES or jr in ("owner", "admin", "operations_manager", "client"):
        jr = "custom"
    dept = department_for_job(jr, "employee")
    title = None
    if jr == "custom":
        title = (sub_role or "").strip() or None
    return {
        "role": "employee",
        "department": dept,
        "job_role": jr,
        "job_title": title,
        "sub_role": title if jr == "custom" else jr,
        "client_id": None,
    }


def can_mutate_user(actor: dict, target: dict, *, deleting: bool = False) -> None:
    if actor["id"] == target.get("id") and deleting:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    target_role = target.get("role")
    if target_role == "owner":
        raise HTTPException(status_code=400, detail="The owner account cannot be changed this way")
    actor_role = actor.get("role")
    if deleting and not can(actor, "users", "delete"):
        raise HTTPException(status_code=403, detail="You cannot delete users")
    if actor_role == "operations_manager":
        if target_role in ("admin", "operations_manager", "owner"):
            raise HTTPException(status_code=403, detail="Operations cannot modify leadership accounts")
    if actor_role == "admin" and target_role == "admin" and deleting:
        raise HTTPException(status_code=403, detail="Admins cannot delete other admins")


def chat_visible_query(user: dict) -> dict:
    """Mongo query for users this person may see as chat contacts."""
    me = user["id"]
    base = {"id": {"$ne": me}, "is_active": True}
    role = user.get("role")
    if role in LEADERSHIP_ROLES or role == "owner":
        return base
    if role == "employee":
        ids = assigned_client_ids(user)
        return {
            **base,
            "$or": [
                {"role": {"$in": list(AGENCY_ROLES)}},
                {"role": "client", "client_id": {"$in": ids or ["__none__"]}},
            ],
        }
    # client: leadership + staff assigned to this client
    cid = user.get("client_id")
    return {
        **base,
        "$or": [
            {"role": {"$in": list(LEADERSHIP_ROLES)}},
            {"role": "employee", "assigned_client_ids": cid},
        ],
    }


def migrate_user_doc(doc: dict) -> dict:
    """Return $set fields to bring a legacy user up to P0 shape."""
    role = doc.get("role") or "employee"
    updates = {}
    if "assigned_client_ids" not in doc:
        updates["assigned_client_ids"] = []
    if "job_role" not in doc or not doc.get("job_role"):
        dept, job, title = map_legacy_job(doc.get("sub_role"), role)
        updates["department"] = doc.get("department") or dept
        updates["job_role"] = job
        if title:
            updates["job_title"] = title
    elif "department" not in doc or not doc.get("department"):
        updates["department"] = department_for_job(doc.get("job_role"), role)
    return updates
