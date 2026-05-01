# Known Issues

Operational issues observed in production that have not yet been addressed. Each issue carries a unique ID, severity, symptom, root cause analysis (where known), workarounds, and a pointer to the milestone where it gets a permanent fix.

When an issue is resolved, its entry moves to the `Resolved` section at the bottom with the resolution-commit reference.

---

## Active

### KI-001: `/api/estimate` cold-start OOM on the v2 grape-weight ML path

**Severity:** Medium. Intermittent; affects only the FIRST ML inference after the Render service has been idle. Subsequent requests within roughly 5 minutes are fast and reliable.

**Reported:** 2026-04-30 (observed in pre-M0-01 Render logs).

**Symptom:** A POST to `https://graftwebsite.onrender.com/api/estimate` after extended idle takes 60 seconds or more and frequently returns HTTP 500. Render's deploy log shows:

```
[CRITICAL] WORKER TIMEOUT (pid:N)
[ERROR] Error handling request POST /api/estimate
...
[ERROR] Worker (pid:N) was sent SIGKILL! Perhaps out of memory?
```

The traceback originates inside `prediction_tool_adapter.py::_load_v2_runtime()` at `import torchvision.transforms as T`, which transitively imports `torch._dynamo`, `torch.fx.experimental.symbolic_shapes`, and ultimately `sympy`. The lazy-import chain pages in several hundred MB of RAM and exceeds the available headroom on the current Render instance, triggering the OOM killer.

**Root cause:** The v2 inference path uses `torchvision` plus `torch._dynamo` plus `sympy` and lazy-loads them on the first request. The combined cold-import is too heavy for the current Render instance class, especially when paired with Django's request worker memory.

**Workarounds (any one suffices):**

1. **Pre-warm at startup.** Add a Django `AppConfig.ready()` hook that imports `torchvision` and the rest of the inference dependencies during gunicorn worker initialization. The first user request then skips the import entirely. Cheap. Implementable in a small follow-up PR before M0-02.
2. **Bump Render instance size.** Move from the current tier to one with more RAM. Ongoing cost increase.
3. **Split inference into a dedicated service.** Move `prediction_tool_adapter.py`'s v2 path into the new `services/ml/` FastAPI service introduced in M1-10. The marketing API stops importing `torchvision` entirely, and the cold-start OOM disappears. This is the planned permanent fix.

**Fix milestone:** **M1-10** (`graft-spray/m1/ml-inference-cloud`) per CODEBASE_PLAN.md section 6.

**Tracking:** This file. Reference KI-001 in commit messages and CHANGELOG when fixing.

---

## Resolved

(Empty. Issues move here with the commit SHA that resolves them and the milestone they were resolved in.)
