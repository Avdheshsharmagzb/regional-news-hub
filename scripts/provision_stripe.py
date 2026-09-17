import os, json, urllib.request, urllib.error

base = os.environ["INTEGRATION_PROXY_URL"]
job_id = "c91ecc49-ddb1-4b48-80f0-7b0fd72a6c37"
key = "sk-emergent-69f6bB063020924Fc3"
req = urllib.request.Request(
    base + "/stripe/sandboxes",
    data=json.dumps({"job_id": job_id}).encode(),
    headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req) as r:
        sandbox = json.load(r)
    print(json.dumps({
        "secret": sandbox["sandbox_secret_key"],
        "publishable": sandbox["sandbox_publishable_key"],
        "account": sandbox["sandbox_account_id"],
        "webhook_secret": sandbox.get("preview_webhook_secret", ""),
        "onboarding_url": sandbox.get("onboarding_url", ""),
    }))
except urllib.error.HTTPError as e:
    print("ERROR", e.code, e.read().decode())
