#!/usr/bin/env python3
"""Run a live Supabase smoke test against the Causelaw site schema.

Environment variables:
  CAUSELAW_SUPABASE_URL
  CAUSELAW_SUPABASE_ANON_KEY
  CAUSELAW_SUPABASE_SERVICE_ROLE_KEY
  CAUSELAW_DB_SCHEMA                Optional, defaults to causelaw_yinguo_v1
  CAUSELAW_SMOKE_PASSWORD           Optional, defaults to SmokeTest!20260306
  CAUSELAW_SMOKE_EMAIL_DOMAIN       Optional, defaults to mailinator.com

Public URL/anon key fall back to causelaw-config.js in this repo.
The service role key must be provided explicitly.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "causelaw-config.js"
DEFAULT_SCHEMA = "causelaw_yinguo_v1"
DEFAULT_PASSWORD = "SmokeTest!20260306"
DEFAULT_EMAIL_DOMAIN = "mailinator.com"
TZ_TAIPEI = timezone(timedelta(hours=8))


def load_public_defaults() -> dict[str, str]:
    defaults: dict[str, str] = {}
    if not CONFIG_PATH.exists():
        return defaults
    text = CONFIG_PATH.read_text(encoding="utf-8")
    url_match = re.search(r"CAUSELAW_SUPABASE_URL\s*=.*?'([^']+)'", text)
    anon_match = re.search(r"CAUSELAW_SUPABASE_ANON_KEY\s*=.*?'([^']+)'", text)
    if url_match:
        defaults["url"] = url_match.group(1)
    if anon_match:
        defaults["anon_key"] = anon_match.group(1)
    return defaults


PUBLIC_DEFAULTS = load_public_defaults()


def env_or_default(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name, "").strip()
    return value or default


def current_taipei_date() -> str:
    return datetime.now(TZ_TAIPEI).date().isoformat()


def run(cmd: list[str], input_text: str | None = None) -> tuple[int, str, str]:
    proc = subprocess.run(
        cmd,
        input=input_text,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=False,
    )
    return proc.returncode, proc.stdout, proc.stderr


class SmokeError(RuntimeError):
    pass


class SmokeRunner:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.url = env_or_default("CAUSELAW_SUPABASE_URL", PUBLIC_DEFAULTS.get("url"))
        self.anon_key = env_or_default("CAUSELAW_SUPABASE_ANON_KEY", PUBLIC_DEFAULTS.get("anon_key"))
        self.service_role_key = env_or_default("CAUSELAW_SUPABASE_SERVICE_ROLE_KEY")
        self.schema = env_or_default("CAUSELAW_DB_SCHEMA", DEFAULT_SCHEMA)
        self.password = env_or_default("CAUSELAW_SMOKE_PASSWORD", DEFAULT_PASSWORD)
        self.email_domain = env_or_default("CAUSELAW_SMOKE_EMAIL_DOMAIN", DEFAULT_EMAIL_DOMAIN)

        if not self.url:
            raise SmokeError("Missing CAUSELAW_SUPABASE_URL and no fallback found in causelaw-config.js")
        if not self.anon_key:
            raise SmokeError("Missing CAUSELAW_SUPABASE_ANON_KEY and no fallback found in causelaw-config.js")
        if not self.service_role_key:
            raise SmokeError("Missing CAUSELAW_SUPABASE_SERVICE_ROLE_KEY")

        self.ts = time.strftime("%Y%m%d%H%M%S")
        self.email = f"causelaw.smoke.member.{self.ts}@{self.email_domain}"
        self.display_name = "Smoke Member"
        self.prefix = f"SMOKE-{self.ts}"
        self.today = current_taipei_date()

        self.user_id: str | None = None
        self.user_token: str | None = None
        self.post_ids: list[str] = []
        self.wall_ids: list[str] = []
        self.task_ids: list[str] = []
        self.checkin_ids: list[str] = []
        self.audit_ids: list[str] = []
        self.results: list[dict[str, Any]] = []
        self.cleanup_errors: list[str] = []

    def curl_json(
        self,
        method: str,
        url: str,
        headers: dict[str, str] | None = None,
        body: Any | None = None,
    ) -> Any:
        cmd = ["curl", "-sS", "-X", method, url]
        for key, value in (headers or {}).items():
            cmd.extend(["-H", f"{key}: {value}"])
        if body is not None:
            cmd.extend(["--data-binary", "@-"])
            code, out, err = run(cmd, input_text=json.dumps(body, ensure_ascii=False))
        else:
            code, out, err = run(cmd)
        if code != 0:
            raise SmokeError(err.strip() or out.strip() or f"curl failed: {' '.join(cmd)}")
        if out == "":
            return None
        try:
            return json.loads(out)
        except json.JSONDecodeError as exc:
            raise SmokeError(f"Non-JSON response: {out}") from exc

    def rest(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        body: Any | None = None,
        service: bool = False,
        extra_headers: dict[str, str] | None = None,
    ) -> Any:
        headers: dict[str, str] = {}
        is_auth = path.startswith("/auth/")
        key = self.service_role_key if service else self.anon_key
        headers["apikey"] = key
        if is_auth:
            if service:
                headers["Authorization"] = f"Bearer {self.service_role_key}"
            elif token:
                headers["Authorization"] = f"Bearer {token}"
        else:
            headers["Accept-Profile"] = self.schema
            headers["Content-Profile"] = self.schema
            if service:
                headers["Authorization"] = f"Bearer {self.service_role_key}"
            elif token:
                headers["Authorization"] = f"Bearer {token}"
        if body is not None:
            headers["Content-Type"] = "application/json"
        if extra_headers:
            headers.update(extra_headers)
        return self.curl_json(method, f"{self.url}{path}", headers=headers, body=body)

    def expect(self, condition: bool, message: str, details: Any | None = None) -> None:
        if not condition:
            raise SmokeError(f"{message}: {details}")

    def record(self, check: str, **extra: Any) -> None:
        row: dict[str, Any] = {"check": check, "ok": True}
        row.update(extra)
        self.results.append(row)

    @staticmethod
    def is_permission_error(resp: Any) -> bool:
        if not isinstance(resp, dict):
            return False
        text = " ".join(str(resp.get(k, "")) for k in ("code", "message", "details", "hint")).lower()
        return "42501" in text or "permission denied" in text

    def create_confirmed_user(self) -> None:
        out = self.rest(
            "POST",
            "/auth/v1/admin/users",
            service=True,
            body={
                "email": self.email,
                "password": self.password,
                "email_confirm": True,
                "user_metadata": {"display_name": self.display_name},
            },
        )
        self.expect(isinstance(out, dict) and out.get("id"), "Failed to create confirmed smoke user", out)
        self.user_id = out["id"]
        self.record("create_confirmed_user", user_id=self.user_id, email=self.email)

    def sign_in(self) -> None:
        out = self.rest(
            "POST",
            "/auth/v1/token?grant_type=password",
            body={"email": self.email, "password": self.password},
        )
        self.expect(isinstance(out, dict) and out.get("access_token"), "Failed to sign in smoke user", out)
        self.user_token = out["access_token"]
        self.record("sign_in_member")

    def ensure_member_profile(self) -> None:
        out = self.rest(
            "POST",
            "/rest/v1/rpc/ensure_member_profile",
            token=self.user_token,
            body={"p_display_name": self.display_name},
        )
        self.expect(
            isinstance(out, dict) and out.get("id") == self.user_id and out.get("role") == "member",
            "ensure_member_profile failed",
            out,
        )
        self.record("ensure_member_profile")

    def patch_member_role(self, role: str) -> None:
        out = self.rest(
            "PATCH",
            f"/rest/v1/members?id=eq.{self.user_id}",
            service=True,
            body={"role": role, "status": "active"},
            extra_headers={"Prefer": "return=representation"},
        )
        self.expect(isinstance(out, list) and len(out) == 1 and out[0]["role"] == role, f"Failed to set role={role}", out)

    def create_seed_task(self) -> None:
        out = self.rest(
            "POST",
            "/rest/v1/tasks",
            service=True,
            body=[
                {
                    "member_id": self.user_id,
                    "task_date": self.today,
                    "task_type": "chanting",
                    "task_title": f"{self.prefix} task",
                    "target_count": 3,
                    "completed_count": 0,
                    "status": "pending",
                    "evidence_note": "seeded by live smoke",
                    "points_reward": 10,
                }
            ],
            extra_headers={"Prefer": "return=representation"},
        )
        self.expect(isinstance(out, list) and len(out) == 1 and out[0].get("id"), "Failed to seed task", out)
        self.task_ids.append(out[0]["id"])
        self.record("seed_task", task_id=out[0]["id"])

    def run_checks(self) -> None:
        self.create_confirmed_user()
        self.sign_in()
        self.ensure_member_profile()

        self._check_profile_access()
        self._check_post_flow()
        self._check_comment_flow()
        self._check_wall_flow()
        self._check_task_and_checkin_flow()

    def _check_profile_access(self) -> None:
        profile = self.rest(
            "GET",
            f"/rest/v1/members?id=eq.{self.user_id}&select=id,email,role,status",
            token=self.user_token,
        )
        self.expect(
            isinstance(profile, list)
            and len(profile) == 1
            and profile[0]["role"] == "member"
            and profile[0]["status"] == "active",
            "Member cannot read own profile",
            profile,
        )
        self.record("member_read_self_profile")

        anon_tasks = self.rest("GET", "/rest/v1/tasks?select=id&limit=1")
        self.expect(self.is_permission_error(anon_tasks), "Anon unexpectedly read tasks", anon_tasks)
        self.record("anon_cannot_read_tasks")

        direct_post = self.rest(
            "POST",
            "/rest/v1/posts",
            token=self.user_token,
            body={"display_name": self.display_name, "title": f"{self.prefix} direct", "content": "blocked", "category": "其他"},
            extra_headers={"Prefer": "return=representation"},
        )
        self.expect(self.is_permission_error(direct_post), "Member direct post insert should fail", direct_post)
        self.record("member_direct_insert_post_blocked")

        self.rest(
            "PATCH",
            f"/rest/v1/members?id=eq.{self.user_id}",
            token=self.user_token,
            body={"role": "admin"},
            extra_headers={"Prefer": "return=representation"},
        )
        profile_after = self.rest(
            "GET",
            f"/rest/v1/members?id=eq.{self.user_id}&select=id,role,status",
            token=self.user_token,
        )
        self.expect(profile_after[0]["role"] == "member", "Member self role escalation unexpectedly persisted", profile_after)
        self.record("member_self_role_escalation_blocked")

    def _check_post_flow(self) -> None:
        for idx in range(1, 5):
            out = self.rest(
                "POST",
                "/rest/v1/rpc/submit_post",
                token=self.user_token,
                body={
                    "p_display_name": self.display_name,
                    "p_title": f"{self.prefix} post {idx}",
                    "p_category": "其他",
                    "p_content": f"{self.prefix} content {idx}",
                },
            )
            if idx <= 3:
                self.expect(isinstance(out, dict) and out.get("id"), f"submit_post {idx} failed", out)
                self.post_ids.append(out["id"])
                self.record(f"submit_post_{idx}", post_id=out["id"])
            else:
                self.expect(
                    isinstance(out, dict)
                    and "message" in out
                    and "今日投稿已達 3 篇上限" in out["message"],
                    "submit_post 4th should be blocked",
                    out,
                )
                self.record("submit_post_4_blocked", message=out["message"])

        approved_post_id = self.post_ids[0]
        rejected_post_id = self.post_ids[1]

        pending_self = self.rest(
            "GET",
            f"/rest/v1/posts?id=eq.{approved_post_id}&select=id,status,title",
            token=self.user_token,
        )
        self.expect(len(pending_self) == 1 and pending_self[0]["status"] == "pending", "Member cannot read own pending post", pending_self)
        self.record("member_can_read_own_pending_post")

        pending_anon = self.rest("GET", f"/rest/v1/posts?id=eq.{approved_post_id}&select=id,status,title")
        self.expect(pending_anon == [], "Anon unexpectedly read pending post", pending_anon)
        self.record("anon_cannot_read_pending_post")

        self.rest(
            "PATCH",
            f"/rest/v1/posts?id=eq.{approved_post_id}",
            token=self.user_token,
            body={"status": "approved"},
            extra_headers={"Prefer": "return=representation"},
        )
        pending_after_member_patch = self.rest(
            "GET",
            f"/rest/v1/posts?id=eq.{approved_post_id}&select=id,status",
            token=self.user_token,
        )
        self.expect(
            pending_after_member_patch[0]["status"] == "pending",
            "Member unexpectedly approved own post",
            pending_after_member_patch,
        )
        self.record("member_cannot_approve_post")

        self.patch_member_role("admin")
        admin_profile = self.rest(
            "GET",
            f"/rest/v1/members?id=eq.{self.user_id}&select=id,role,status",
            token=self.user_token,
        )
        self.expect(admin_profile[0]["role"] == "admin", "Role promotion to admin is not visible", admin_profile)
        self.record("promote_to_admin")

        pending_list = self.rest(
            "GET",
            "/rest/v1/posts?status=eq.pending&select=id,title,status&order=created_at.desc",
            token=self.user_token,
        )
        self.expect(any(row["id"] == approved_post_id for row in pending_list), "Admin cannot list pending posts", pending_list)
        self.record("admin_can_list_pending_posts", pending_count=len(pending_list))

        approve_res = self.rest(
            "PATCH",
            f"/rest/v1/posts?id=eq.{approved_post_id}",
            token=self.user_token,
            body={"status": "approved", "moderation_reason": "smoke approve"},
            extra_headers={"Prefer": "return=representation"},
        )
        reject_res = self.rest(
            "PATCH",
            f"/rest/v1/posts?id=eq.{rejected_post_id}",
            token=self.user_token,
            body={"status": "rejected", "moderation_reason": "smoke reject"},
            extra_headers={"Prefer": "return=representation"},
        )
        self.expect(len(approve_res) == 1 and approve_res[0]["status"] == "approved", "Admin approve failed", approve_res)
        self.expect(len(reject_res) == 1 and reject_res[0]["status"] == "rejected", "Admin reject failed", reject_res)
        self.record("admin_can_approve_post")
        self.record("admin_can_reject_post")

        approve_audit = self.rest(
            "POST",
            "/rest/v1/moderation_audit_log",
            token=self.user_token,
            body={
                "target_type": "post",
                "target_id": approved_post_id,
                "action": "approve",
                "actor_id": self.user_id,
                "reason": "smoke approve",
                "before_state": {"status": "pending"},
                "after_state": {"status": "approved"},
            },
        )
        reject_audit = self.rest(
            "POST",
            "/rest/v1/moderation_audit_log",
            token=self.user_token,
            body={
                "target_type": "post",
                "target_id": rejected_post_id,
                "action": "reject",
                "actor_id": self.user_id,
                "reason": "smoke reject",
                "before_state": {"status": "pending"},
                "after_state": {"status": "rejected"},
            },
        )
        self.expect(approve_audit in (None, {}, []), "Unexpected approve audit response", approve_audit)
        self.expect(reject_audit in (None, {}, []), "Unexpected reject audit response", reject_audit)
        audit_rows = self.rest(
            "GET",
            f"/rest/v1/moderation_audit_log?select=id,action&actor_id=eq.{self.user_id}&order=created_at.asc",
            service=True,
        )
        self.expect(isinstance(audit_rows, list) and len(audit_rows) >= 2, "Admin audit rows missing", audit_rows)
        self.audit_ids.extend([row["id"] for row in audit_rows[-2:]])
        self.record("admin_can_insert_audit_log")

        approved_anon = self.rest("GET", f"/rest/v1/posts?id=eq.{approved_post_id}&select=id,status,title")
        rejected_anon = self.rest("GET", f"/rest/v1/posts?id=eq.{rejected_post_id}&select=id,status,title")
        self.expect(len(approved_anon) == 1 and approved_anon[0]["status"] == "approved", "Anon cannot read approved post", approved_anon)
        self.expect(rejected_anon == [], "Anon unexpectedly read rejected post", rejected_anon)
        self.record("anon_only_reads_approved_posts")

        self.patch_member_role("member")
        member_profile_again = self.rest(
            "GET",
            f"/rest/v1/members?id=eq.{self.user_id}&select=id,role,status",
            token=self.user_token,
        )
        self.expect(member_profile_again[0]["role"] == "member", "Role demotion back to member failed", member_profile_again)
        self.record("demote_back_to_member")

        member_modlog = self.rest("GET", "/rest/v1/moderation_audit_log?select=id&limit=1", token=self.user_token)
        self.expect(self.is_permission_error(member_modlog), "Member unexpectedly read moderation audit log", member_modlog)
        self.record("member_cannot_read_audit_log")

    def _check_comment_flow(self) -> None:
        approved_post_id = self.post_ids[0]
        comment_ids: list[str] = []
        for idx in range(1, 22):
            out = self.rest(
                "POST",
                "/rest/v1/rpc/submit_comment",
                token=self.user_token,
                body={
                    "p_post_id": approved_post_id,
                    "p_display_name": self.display_name,
                    "p_content": f"{self.prefix} comment {idx}",
                    "p_parent_id": None,
                },
            )
            if idx <= 20:
                self.expect(
                    isinstance(out, dict)
                    and isinstance(out.get("comment"), dict)
                    and out["comment"].get("id"),
                    f"submit_comment {idx} failed",
                    out,
                )
                comment_ids.append(out["comment"]["id"])
            else:
                self.expect(
                    isinstance(out, dict)
                    and "message" in out
                    and "今日留言已達 20 則上限" in out["message"],
                    "submit_comment 21st should be blocked",
                    out,
                )
                self.record("submit_comment_21_blocked", message=out["message"])
        self.record("submit_comment_1_20", count=len(comment_ids))

        first_comment = comment_ids[0]
        anon_comment = self.rest(
            "GET",
            f"/rest/v1/comments?id=eq.{first_comment}&select=id,post_id,like_count,content",
        )
        self.expect(len(anon_comment) == 1, "Anon cannot read comment on approved post", anon_comment)
        self.record("anon_can_read_comments_on_approved_post")

        like_1 = self.rest(
            "POST",
            "/rest/v1/rpc/increment_comment_like",
            token=self.user_token,
            body={"p_comment_id": first_comment},
        )
        like_2 = self.rest(
            "POST",
            "/rest/v1/rpc/increment_comment_like",
            token=self.user_token,
            body={"p_comment_id": first_comment},
        )
        comment_after_like = self.rest(
            "GET",
            f"/rest/v1/comments?id=eq.{first_comment}&select=id,like_count",
            token=self.user_token,
        )
        self.expect(
            isinstance(like_1, int)
            and isinstance(like_2, int)
            and like_1 == like_2 == comment_after_like[0]["like_count"],
            "Comment like dedup failed",
            {"first": like_1, "second": like_2, "row": comment_after_like},
        )
        self.record("comment_like_dedup", like_count=like_1)

    def _check_wall_flow(self) -> None:
        wall_1 = self.rest(
            "POST",
            "/rest/v1/rpc/create_wall_entry",
            token=self.user_token,
            body={
                "p_entry_type": "bless",
                "p_target": "世界和平",
                "p_author_name": self.display_name,
                "p_text_content": f"{self.prefix} wall 1",
                "p_is_anonymous": False,
            },
        )
        self.expect(isinstance(wall_1, dict) and wall_1.get("id"), "First wall entry failed", wall_1)
        self.wall_ids.append(wall_1["id"])
        self.record("wall_entry_1")

        wall_dup = self.rest(
            "POST",
            "/rest/v1/rpc/create_wall_entry",
            token=self.user_token,
            body={
                "p_entry_type": "bless",
                "p_target": "世界和平",
                "p_author_name": self.display_name,
                "p_text_content": f"{self.prefix} wall 1",
                "p_is_anonymous": False,
            },
        )
        self.expect(
            isinstance(wall_dup, dict)
            and "message" in wall_dup
            and "內容需要與前幾則略有不同" in wall_dup["message"],
            "Duplicate wall entry should be blocked",
            wall_dup,
        )
        self.record("wall_duplicate_blocked", message=wall_dup["message"])

        for idx in range(2, 7):
            out = self.rest(
                "POST",
                "/rest/v1/rpc/create_wall_entry",
                token=self.user_token,
                body={
                    "p_entry_type": "confess" if idx % 2 == 0 else "bless",
                    "p_target": "測試目標",
                    "p_author_name": self.display_name,
                    "p_text_content": f"{self.prefix} wall {idx}",
                    "p_is_anonymous": idx % 2 == 0,
                },
            )
            if idx <= 5:
                self.expect(isinstance(out, dict) and out.get("id"), f"wall entry {idx} failed", out)
                self.wall_ids.append(out["id"])
            else:
                self.expect(
                    isinstance(out, dict)
                    and "message" in out
                    and "今日懺悔與祈福合計已達 5 則上限" in out["message"],
                    "6th wall entry should be blocked",
                    out,
                )
                self.record("wall_entry_6_blocked", message=out["message"])
        self.record("wall_entry_1_5", count=len(self.wall_ids))

        wall_self = self.rest(
            "GET",
            "/rest/v1/wall_entries?select=id,entry_type,is_anonymous&order=created_at.desc",
            token=self.user_token,
        )
        self.expect(isinstance(wall_self, list) and len(wall_self) >= len(self.wall_ids), "Member cannot read own wall entries", wall_self)
        self.record("member_can_read_own_wall_entries")

        anon_wall = self.rest("GET", "/rest/v1/wall_entries?select=id&limit=1")
        self.expect(self.is_permission_error(anon_wall), "Anon unexpectedly read wall entries", anon_wall)
        self.record("anon_cannot_read_wall_entries")

    def _check_task_and_checkin_flow(self) -> None:
        self.create_seed_task()

        tasks = self.rest(
            "GET",
            "/rest/v1/tasks?select=id,task_title,completed_count,status&order=created_at.desc",
            token=self.user_token,
        )
        self.expect(any(row["id"] == self.task_ids[0] for row in tasks), "Member cannot read own task", tasks)
        self.record("member_can_read_own_tasks")

        task_update = self.rest(
            "PATCH",
            f"/rest/v1/tasks?id=eq.{self.task_ids[0]}",
            token=self.user_token,
            body={"completed_count": 2, "status": "pending"},
            extra_headers={"Prefer": "return=representation"},
        )
        self.expect(
            isinstance(task_update, list) and len(task_update) == 1 and task_update[0]["completed_count"] == 2,
            "Member cannot update own task",
            task_update,
        )
        self.record("member_can_update_own_task")

        checkin_upsert = self.rest(
            "POST",
            f"/rest/v1/daily_checkin?on_conflict=member_id,checkin_date",
            token=self.user_token,
            body={
                "member_id": self.user_id,
                "checkin_date": self.today,
                "mood_level": 2,
                "conflict_level": 1,
                "temptation_level": 1,
                "primary_risk_code": "speech_harm",
            },
            extra_headers={"Prefer": "resolution=merge-duplicates, return=representation"},
        )
        self.expect(
            isinstance(checkin_upsert, list) and len(checkin_upsert) == 1 and checkin_upsert[0].get("id"),
            "daily_checkin upsert failed",
            checkin_upsert,
        )
        self.checkin_ids.append(checkin_upsert[0]["id"])
        self.record("member_can_upsert_daily_checkin", checkin_id=checkin_upsert[0]["id"])

    def cleanup(self) -> None:
        if self.args.keep_data:
            return
        try:
            if self.audit_ids:
                self.rest(
                    "DELETE",
                    "/rest/v1/moderation_audit_log?id=in.(" + ",".join(self.audit_ids) + ")",
                    service=True,
                )
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"audit cleanup failed: {exc}")
        try:
            if self.post_ids:
                self.rest(
                    "DELETE",
                    "/rest/v1/posts?id=in.(" + ",".join(self.post_ids) + ")",
                    service=True,
                )
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"post cleanup failed: {exc}")
        try:
            if self.task_ids:
                self.rest(
                    "DELETE",
                    "/rest/v1/tasks?id=in.(" + ",".join(self.task_ids) + ")",
                    service=True,
                )
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"task cleanup failed: {exc}")
        try:
            if self.wall_ids:
                self.rest(
                    "DELETE",
                    "/rest/v1/wall_entries?id=in.(" + ",".join(self.wall_ids) + ")",
                    service=True,
                )
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"wall cleanup failed: {exc}")
        try:
            if self.checkin_ids:
                self.rest(
                    "DELETE",
                    "/rest/v1/daily_checkin?id=in.(" + ",".join(self.checkin_ids) + ")",
                    service=True,
                )
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"checkin cleanup failed: {exc}")
        try:
            if self.user_id:
                self.rest("DELETE", f"/auth/v1/admin/users/{self.user_id}", service=True)
        except Exception as exc:  # pragma: no cover - cleanup best effort
            self.cleanup_errors.append(f"user cleanup failed: {exc}")

    def output(self, ok: bool, error: str | None = None) -> None:
        payload: dict[str, Any] = {
            "ok": ok,
            "email": self.email,
            "user_id": self.user_id,
            "results": self.results,
        }
        if error:
            payload["error"] = error
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        if self.cleanup_errors:
            print(
                json.dumps({"cleanup_errors": self.cleanup_errors}, ensure_ascii=False, indent=2),
                file=sys.stderr,
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Causelaw Supabase live smoke suite.")
    parser.add_argument(
        "--keep-data",
        action="store_true",
        help="Keep smoke data and user for debugging instead of deleting them at the end.",
    )
    return parser.parse_args()


def main() -> int:
    runner = SmokeRunner(parse_args())
    exit_code = 0
    error: str | None = None
    try:
        runner.run_checks()
    except Exception as exc:  # pragma: no cover - top-level error aggregation
        exit_code = 1
        error = str(exc)
    finally:
        runner.cleanup()
    runner.output(exit_code == 0, error)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
