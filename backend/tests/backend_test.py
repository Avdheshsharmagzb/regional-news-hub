"""Backend tests for Ghaziabad Times News Portal."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend .env if not in env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@ghaziabadtimes.com"
ADMIN_PASSWORD = "GhaziabadTimes@2026"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    tk = r.json().get("token") or r.json().get("access_token")
    assert tk, f"no token in {r.json()}"
    return tk


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public endpoints ----------
class TestPublic:
    def test_articles_list(self):
        r = requests.get(f"{API}/articles", timeout=10)
        assert r.status_code == 200
        data = r.json()
        arts = data if isinstance(data, list) else data.get("articles", data.get("items", []))
        assert isinstance(arts, list)
        assert len(arts) >= 10, f"expected >=10 published articles, got {len(arts)}"
        # No mongo _id leakage
        for a in arts:
            assert "_id" not in a

    def test_articles_filter_category(self):
        r = requests.get(f"{API}/articles", params={"category": "sports"}, timeout=10)
        assert r.status_code == 200

    def test_articles_filter_region(self):
        r = requests.get(f"{API}/articles", params={"region": "up"}, timeout=10)
        assert r.status_code == 200

    def test_articles_filter_district(self):
        r = requests.get(f"{API}/articles", params={"district": "ghaziabad"}, timeout=10)
        assert r.status_code == 200

    def test_articles_filter_ncr(self):
        r = requests.get(f"{API}/articles", params={"ncr": "true"}, timeout=10)
        assert r.status_code == 200

    def test_articles_filter_breaking(self):
        r = requests.get(f"{API}/articles", params={"breaking": "true"}, timeout=10)
        assert r.status_code == 200

    def test_articles_search_q(self):
        r = requests.get(f"{API}/articles", params={"q": "भारत"}, timeout=10)
        assert r.status_code == 200

    def test_ticker(self):
        r = requests.get(f"{API}/ticker", timeout=10)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("headlines", data.get("items", []))
        assert isinstance(items, list) and len(items) > 0

    def test_article_detail(self):
        r = requests.get(f"{API}/articles", timeout=10)
        arts = r.json() if isinstance(r.json(), list) else r.json().get("articles", [])
        aid = arts[0].get("id") or arts[0].get("_id")
        r2 = requests.get(f"{API}/articles/{aid}", timeout=10)
        assert r2.status_code == 200
        d = r2.json()
        assert "article" in d and "related" in d, f"unexpected {list(d)}"

    def test_ad_packages(self):
        r = requests.get(f"{API}/ad-packages", timeout=10)
        assert r.status_code == 200
        pkgs = r.json() if isinstance(r.json(), list) else r.json().get("packages", [])
        assert len(pkgs) == 4, f"expected 4 packages got {len(pkgs)}"

    def test_ad_inquiry(self):
        r = requests.get(f"{API}/ad-packages", timeout=10)
        pkgs = r.json() if isinstance(r.json(), list) else r.json().get("packages", [])
        pkg_id = pkgs[0].get("id") or pkgs[0].get("_id") or pkgs[0].get("slug")
        payload = {
            "name": "TEST_User",
            "email": "test@example.com",
            "phone": "9999999999",
            "package_id": pkg_id,
            "message": "TEST inquiry",
        }
        r2 = requests.post(f"{API}/ad-inquiry", json=payload, timeout=10)
        assert r2.status_code in (200, 201), f"{r2.status_code} {r2.text}"
        body = r2.json()
        # Hindi success message expected
        msg = str(body)
        assert any(ord(c) > 127 for c in msg), "expected Hindi text in response"


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, token):
        assert isinstance(token, str) and len(token) > 20

    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code in (400, 401, 403)

    def test_me(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("email") == ADMIN_EMAIL

    def test_admin_no_token(self):
        r = requests.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code in (401, 403)


# ---------- Admin pipeline ----------
class TestAdminPipeline:
    def test_stats(self, auth_headers):
        r = requests.get(f"{API}/admin/stats", headers=auth_headers, timeout=10)
        assert r.status_code == 200

    def test_aggregate(self, auth_headers):
        r = requests.post(f"{API}/admin/aggregate", headers=auth_headers, timeout=120)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"

    def test_pending_list(self, auth_headers):
        r = requests.get(f"{API}/admin/articles", headers=auth_headers, params={"status": "pending"}, timeout=15)
        assert r.status_code == 200
        arts = r.json() if isinstance(r.json(), list) else r.json().get("articles", [])
        assert len(arts) > 0, "no pending articles after aggregate"

    def test_rewrite_watermark_publish(self, auth_headers):
        r = requests.get(f"{API}/admin/articles", headers=auth_headers, params={"status": "pending"}, timeout=15)
        arts = r.json() if isinstance(r.json(), list) else r.json().get("articles", [])
        assert arts
        aid = arts[0].get("id") or arts[0].get("_id")

        # rewrite
        rr = requests.post(f"{API}/admin/articles/{aid}/rewrite", headers=auth_headers, timeout=90)
        assert rr.status_code == 200, f"rewrite {rr.status_code} {rr.text[:300]}"
        rd = rr.json()
        art = rd.get("article", rd)
        assert art.get("ai_rewritten") is True

        # watermark
        wr = requests.post(f"{API}/admin/articles/{aid}/watermark", headers=auth_headers, timeout=90)
        assert wr.status_code == 200, f"watermark {wr.status_code} {wr.text[:300]}"
        wd = wr.json()
        art2 = wd.get("article", wd)
        assert art2.get("watermarked") is True
        img_url = art2.get("image_url", "")
        assert img_url.startswith("/api/uploads") or "/api/uploads" in img_url, f"image_url={img_url}"

        # publish
        pr = requests.post(f"{API}/admin/articles/{aid}/publish", headers=auth_headers, json={"is_breaking": False}, timeout=15)
        assert pr.status_code == 200
        # Verify via public GET
        vg = requests.get(f"{API}/articles/{aid}", timeout=10)
        assert vg.status_code == 200
        assert vg.json()["article"].get("status") == "published"

    def test_reject(self, auth_headers):
        r = requests.get(f"{API}/admin/articles", headers=auth_headers, params={"status": "pending"}, timeout=15)
        arts = r.json() if isinstance(r.json(), list) else r.json().get("articles", [])
        if not arts:
            pytest.skip("no pending to reject")
        aid = arts[-1].get("id") or arts[-1].get("_id")
        rr = requests.post(f"{API}/admin/articles/{aid}/reject", headers=auth_headers, timeout=15)
        assert rr.status_code == 200
        # Verify rejected article is not in pending list anymore
        r2 = requests.get(f"{API}/admin/articles", headers=auth_headers, params={"status": "rejected"}, timeout=15)
        arts2 = r2.json() if isinstance(r2.json(), list) else r2.json().get("articles", [])
        assert any((a.get("id") or a.get("_id")) == aid for a in arts2)
