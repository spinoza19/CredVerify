# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Verification:
    id: str
    requester: str
    candidate_name: str
    institution: str
    credential_title: str
    verify_url: str
    verdict: str          # VALID | INVALID | UNCERTAIN
    confidence: str       # LOW | MEDIUM | HIGH
    name_match: bool
    institution_match: bool
    title_match: bool
    summary: str


class CredVerify(gl.Contract):
    # request_id -> Verification
    verifications: TreeMap[str, Verification]
    # requester address -> list of request_ids
    by_requester: TreeMap[Address, DynArray[str]]
    # incremental counter to build request ids
    total: u256

    def __init__(self):
        self.total = 0

    def _run_verification(
        self,
        candidate_name: str,
        institution: str,
        credential_title: str,
        verify_url: str,
    ) -> dict:
        def leader_fn() -> str:
            # 1) Pull the credential / verification page LIVE from the web.
            web_data = gl.nondet.web.render(verify_url, mode="text")

            # 2) Ask the LLM to adjudicate. Output is intentionally constrained
            #    to enumerable values so independent validators converge on the
            #    exact same JSON (required by the strict-equality principle).
            task = f"""
You are an expert credential verifier for a hiring platform.
Below is the text content of a certificate / diploma verification page.

Verify whether this page authentically confirms the following credential:
- Candidate name: {candidate_name}
- Institution / issuer: {institution}
- Credential title: {credential_title}

Web page content:
{web_data}

Decide:
- name_match: does the page clearly show the candidate's name?
- institution_match: does the page's issuer match the claimed institution?
- title_match: does the page's credential/course title match the claimed title?
- verdict:
    "VALID"     -> the page authentically confirms the credential,
    "INVALID"   -> the page contradicts the claim, is expired/revoked, or is not a real verification page,
    "UNCERTAIN" -> the page does not contain enough information to decide.
- confidence: "LOW" | "MEDIUM" | "HIGH"

Respond ONLY with JSON in EXACTLY this shape, nothing else:
{{
    "verdict": "VALID" | "INVALID" | "UNCERTAIN",
    "confidence": "LOW" | "MEDIUM" | "HIGH",
    "name_match": true | false,
    "institution_match": true | false,
    "title_match": true | false
}}
Do not add prose, markdown, or code fences. The output must be parsable JSON.
"""
            raw = gl.nondet.exec_prompt(task, response_format="json")
            parsed = (
                raw
                if isinstance(raw, dict)
                else json.loads(str(raw).replace("```json", "").replace("```", ""))
            )

            # Normalise into a stable, canonical structure so validators agree.
            normalized = {
                "verdict": str(parsed.get("verdict", "UNCERTAIN")).upper(),
                "confidence": str(parsed.get("confidence", "LOW")).upper(),
                "name_match": bool(parsed.get("name_match", False)),
                "institution_match": bool(parsed.get("institution_match", False)),
                "title_match": bool(parsed.get("title_match", False)),
            }
            if normalized["verdict"] not in ("VALID", "INVALID", "UNCERTAIN"):
                normalized["verdict"] = "UNCERTAIN"
            if normalized["confidence"] not in ("LOW", "MEDIUM", "HIGH"):
                normalized["confidence"] = "LOW"
            return json.dumps(normalized, sort_keys=True)

        return json.loads(gl.eq_principle.strict_eq(leader_fn))

    @gl.public.write
    def request_verification(
        self,
        candidate_name: str,
        institution: str,
        credential_title: str,
        verify_url: str,
    ) -> None:
        if not verify_url.startswith("http"):
            raise Exception("verify_url must be a valid http(s) URL")

        res = self._run_verification(
            candidate_name, institution, credential_title, verify_url
        )

        request_id = f"cred_{self.total}"
        self.total += 1

        summary = self._build_summary(res)

        record = Verification(
            id=request_id,
            requester=gl.message.sender_address.as_hex,
            candidate_name=candidate_name,
            institution=institution,
            credential_title=credential_title,
            verify_url=verify_url,
            verdict=res["verdict"],
            confidence=res["confidence"],
            name_match=res["name_match"],
            institution_match=res["institution_match"],
            title_match=res["title_match"],
            summary=summary,
        )

        self.verifications[request_id] = record
        self.by_requester.get_or_insert_default(gl.message.sender_address).append(
            request_id
        )

    def _build_summary(self, res: dict) -> str:
        checks = []
        checks.append("name " + ("OK" if res["name_match"] else "MISMATCH"))
        checks.append("issuer " + ("OK" if res["institution_match"] else "MISMATCH"))
        checks.append("title " + ("OK" if res["title_match"] else "MISMATCH"))
        return f"{res['verdict']} ({res['confidence']} confidence): " + ", ".join(checks)

    @gl.public.view
    def get_verification(self, request_id: str) -> dict:
        v = self.verifications[request_id]
        return {
            "id": v.id,
            "requester": v.requester,
            "candidate_name": v.candidate_name,
            "institution": v.institution,
            "credential_title": v.credential_title,
            "verify_url": v.verify_url,
            "verdict": v.verdict,
            "confidence": v.confidence,
            "name_match": v.name_match,
            "institution_match": v.institution_match,
            "title_match": v.title_match,
            "summary": v.summary,
        }

    @gl.public.view
    def get_all(self) -> list:
        out = []
        for request_id, v in self.verifications.items():
            out.append(
                {
                    "id": v.id,
                    "requester": v.requester,
                    "candidate_name": v.candidate_name,
                    "institution": v.institution,
                    "credential_title": v.credential_title,
                    "verify_url": v.verify_url,
                    "verdict": v.verdict,
                    "confidence": v.confidence,
                    "name_match": v.name_match,
                    "institution_match": v.institution_match,
                    "title_match": v.title_match,
                    "summary": v.summary,
                }
            )
        return out

    @gl.public.view
    def get_total(self) -> int:
        return self.total
