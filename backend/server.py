from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import re
import uuid
import json
import base64
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import jwt
import bcrypt
import requests
import feedparser
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from bson import ObjectId

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ghaziabad_times")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
AI_MODEL = os.environ.get('GT_AI_MODEL', 'gemini-3-flash-preview')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

app = FastAPI(title="Ghaziabad Times API")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------- Models
PyObjectId = Annotated[str, BeforeValidator(str)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        if not doc:
            return None
        return cls(**doc)

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude_none=True)
        d.pop("_id", None)
        return d


class Article(BaseDocument):
    title: str
    original_title: Optional[str] = None
    body: str = ""
    summary: str = ""
    category: str = "national-politics"      # international | national-politics | breaking | sports | lifestyle
    region: Optional[str] = None             # delhi | haryana | punjab | rajasthan | up | uttarakhand
    district: Optional[str] = None           # ghaziabad | noida | greater-noida | hapur | lucknow
    source_name: str = ""
    source_url: str = ""
    image_url: str = ""
    ai_rewritten: bool = False
    watermarked: bool = False
    is_breaking: bool = False
    status: str = "pending"                  # pending | published | rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    published_at: Optional[str] = None


class LoginReq(BaseModel):
    email: str
    password: str


class RewriteReq(BaseModel):
    is_breaking: Optional[bool] = None


class GenImageReq(BaseModel):
    prompt: str


class AdInquiry(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = ""
    package_id: str
    message: Optional[str] = ""


# ---------------------------------------------------------------- Auth
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="प्रमाणीकरण आवश्यक है")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="उपयोगकर्ता नहीं मिला")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="सत्र समाप्त हो गया")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="अमान्य टोकन")


# ---------------------------------------------------------------- Watermark
def watermark_image_bytes(img_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    text = "GHAZIABAD TIMES ©"
    fsize = max(16, int(w * 0.032))
    try:
        font = ImageFont.truetype(FONT_BOLD, fsize)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = int(fsize * 0.5)
    x, y = w - tw - pad * 2, h - th - pad * 2
    draw.rectangle([x - pad, y - pad, x + tw + pad, y + th + pad * 1.4], fill=(183, 28, 28, 200))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 235))
    out = Image.alpha_composite(img, overlay).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def save_watermarked_from_url(url: str) -> Optional[str]:
    try:
        r = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        wm = watermark_image_bytes(r.content)
        fname = f"{uuid.uuid4().hex}.jpg"
        (UPLOADS_DIR / fname).write_bytes(wm)
        return f"/api/uploads/{fname}"
    except Exception as e:
        logger.warning(f"watermark failed for {url[:60]}: {e}")
        return None


def save_watermarked_bytes(img_bytes: bytes) -> str:
    wm = watermark_image_bytes(img_bytes)
    fname = f"{uuid.uuid4().hex}.jpg"
    (UPLOADS_DIR / fname).write_bytes(wm)
    return f"/api/uploads/{fname}"


# ---------------------------------------------------------------- Aggregation
RSS_SOURCES = [
    {"name": "NDTV India", "url": "https://feeds.feedburner.com/ndtvnews-india-news", "category": "national-politics"},
    {"name": "Times of India Top", "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "category": "national-politics"},
    {"name": "The Hindu National", "url": "https://www.thehindu.com/news/national/feeder/default.rss", "category": "national-politics"},
    {"name": "India Today", "url": "https://www.indiatoday.in/rss/1206578", "category": "national-politics"},
    {"name": "News18 India", "url": "https://www.news18.com/commonfeeds/v1/eng/rss/india.xml", "category": "national-politics"},
    {"name": "Indian Express India", "url": "https://indianexpress.com/section/india/feed/", "category": "national-politics"},
    {"name": "TOI World", "url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "category": "international"},
    {"name": "The Hindu International", "url": "https://www.thehindu.com/news/international/feeder/default.rss", "category": "international"},
    {"name": "News18 World", "url": "https://www.news18.com/commonfeeds/v1/eng/rss/world.xml", "category": "international"},
    {"name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "category": "international"},
    {"name": "TOI Sports", "url": "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", "category": "sports"},
    {"name": "The Hindu Sport", "url": "https://www.thehindu.com/sport/feeder/default.rss", "category": "sports"},
    {"name": "News18 Sports", "url": "https://www.news18.com/commonfeeds/v1/eng/rss/sports.xml", "category": "sports"},
    {"name": "NDTV Sports", "url": "https://feeds.feedburner.com/ndtvsports-latest", "category": "sports"},
    {"name": "TOI Lifestyle", "url": "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", "category": "lifestyle"},
    {"name": "The Hindu Health", "url": "https://www.thehindu.com/sci-tech/health/feeder/default.rss", "category": "lifestyle"},
    {"name": "News18 Lifestyle", "url": "https://www.news18.com/commonfeeds/v1/eng/rss/lifestyle.xml", "category": "lifestyle"},
    {"name": "Indian Express Education", "url": "https://indianexpress.com/section/education/feed/", "category": "lifestyle"},
    # ---- Local / regional Hindi feeds (Amar Ujala city & state editions) ----
    {"name": "अमर उजाला गाज़ियाबाद", "url": "https://www.amarujala.com/rss/ghaziabad.xml", "category": "national-politics", "region": "up", "district": "ghaziabad"},
    {"name": "अमर उजाला नोएडा", "url": "https://www.amarujala.com/rss/noida.xml", "category": "national-politics", "region": "up", "district": "noida"},
    {"name": "अमर उजाला हापुड़", "url": "https://www.amarujala.com/rss/hapur.xml", "category": "national-politics", "region": "up", "district": "hapur"},
    {"name": "अमर उजाला लखनऊ", "url": "https://www.amarujala.com/rss/lucknow.xml", "category": "national-politics", "region": "up", "district": "lucknow"},
    {"name": "अमर उजाला मेरठ", "url": "https://www.amarujala.com/rss/meerut.xml", "category": "national-politics", "region": "up"},
    {"name": "अमर उजाला उत्तर प्रदेश", "url": "https://www.amarujala.com/rss/uttar-pradesh.xml", "category": "national-politics", "region": "up"},
    {"name": "अमर उजाला दिल्ली", "url": "https://www.amarujala.com/rss/delhi.xml", "category": "national-politics", "region": "delhi"},
    {"name": "अमर उजाला दिल्ली एनसीआर", "url": "https://www.amarujala.com/rss/delhi-ncr.xml", "category": "national-politics", "region": "delhi"},
    {"name": "अमर उजाला हरियाणा", "url": "https://www.amarujala.com/rss/haryana.xml", "category": "national-politics", "region": "haryana"},
    {"name": "अमर उजाला पंजाब", "url": "https://www.amarujala.com/rss/punjab.xml", "category": "national-politics", "region": "punjab"},
    {"name": "अमर उजाला राजस्थान", "url": "https://www.amarujala.com/rss/rajasthan.xml", "category": "national-politics", "region": "rajasthan"},
    {"name": "अमर उजाला उत्तराखंड", "url": "https://www.amarujala.com/rss/uttarakhand.xml", "category": "national-politics", "region": "uttarakhand"},
    {"name": "अमर उजाला देहरादून", "url": "https://www.amarujala.com/rss/dehradun.xml", "category": "national-politics", "region": "uttarakhand"},
]

REGION_KEYWORDS = {
    "up": ["uttar pradesh", "lucknow", "ghaziabad", "noida", "hapur", "kanpur", "varanasi", "prayagraj", "agra", "meerut", "yogi"],
    "delhi": ["delhi", "new delhi", "kejriwal"],
    "haryana": ["haryana", "gurugram", "gurgaon", "faridabad", "chandigarh", "rohtak"],
    "punjab": ["punjab", "amritsar", "ludhiana", "jalandhar", "mohali"],
    "rajasthan": ["rajasthan", "jaipur", "jodhpur", "udaipur", "kota", "ajmer"],
    "uttarakhand": ["uttarakhand", "dehradun", "haridwar", "nainital", "rishikesh"],
}
DISTRICT_KEYWORDS = {
    "ghaziabad": ["ghaziabad", "गाज़ियाबाद", "गाजियाबाद"],
    "noida": ["noida"],
    "greater-noida": ["greater noida"],
    "hapur": ["hapur"],
    "lucknow": ["lucknow"],
}
BREAKING_KEYWORDS = ["breaking", "big news", "just in", "alert", "बड़ी खबर", "ब्रेकिंग"]


def detect_region_district(text: str):
    t = text.lower()
    district = None
    for d, kws in DISTRICT_KEYWORDS.items():
        if any(k.lower() in t for k in kws):
            district = d
            break
    region = None
    if district in ("ghaziabad", "noida", "greater-noida", "hapur", "lucknow"):
        region = "up"
    else:
        for r, kws in REGION_KEYWORDS.items():
            if any(k in t for k in kws):
                region = r
                break
    return region, district


def strip_html(raw: str) -> str:
    return re.sub(r"<[^>]+>", "", raw or "").strip()


def extract_image(entry) -> str:
    if "media_content" in entry and entry.media_content:
        return entry.media_content[0].get("url", "")
    if "media_thumbnail" in entry and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url", "")
    for l in entry.get("links", []):
        if l.get("type", "").startswith("image"):
            return l.get("href", "")
    m = re.search(r'<img[^>]+src="([^"]+)"', entry.get("summary", ""))
    return m.group(1) if m else ""


async def run_aggregation(per_feed: int = 6) -> int:
    def _fetch():
        collected = []
        for src in RSS_SOURCES:
            try:
                parsed = feedparser.parse(src["url"])
                for entry in parsed.entries[:per_feed]:
                    title = strip_html(entry.get("title", ""))
                    if not title:
                        continue
                    summary = strip_html(entry.get("summary", ""))[:1200]
                    region_kw, district_kw = detect_region_district(title + " " + summary)
                    region = src.get("region") or region_kw
                    district = district_kw or src.get("district")
                    text_low = (title + " " + summary).lower()
                    collected.append({
                        "title": title,
                        "summary": summary,
                        "source_name": src["name"],
                        "source_url": entry.get("link", ""),
                        "category": src["category"],
                        "region": region,
                        "district": district,
                        "image_url": extract_image(entry),
                        "is_breaking": any(k in text_low for k in BREAKING_KEYWORDS),
                    })
            except Exception as e:
                logger.warning(f"feed error {src['name']}: {e}")
        return collected

    items = await asyncio.to_thread(_fetch)
    inserted = 0
    for it in items:
        if not it["source_url"]:
            continue
        exists = await db.articles.find_one({"source_url": it["source_url"]})
        if exists:
            continue
        art = Article(
            title=it["title"], original_title=it["title"], body=it["summary"],
            summary=it["summary"][:280], category=it["category"], region=it["region"],
            district=it["district"], source_name=it["source_name"], source_url=it["source_url"],
            image_url=it["image_url"], is_breaking=it["is_breaking"], status="pending",
        )
        await db.articles.insert_one(art.to_mongo())
        inserted += 1
    logger.info(f"aggregation inserted {inserted} new pending articles")
    return inserted


# ---------------------------------------------------------------- AI Rewrite
async def ai_rewrite(title: str, body: str, category: str) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    system = (
        "आप 'गाज़ियाबाद टाइम्स' के वरिष्ठ हिंदी समाचार संपादक हैं। "
        "आपका काम अंग्रेज़ी/हिंदी समाचार को पूरी तरह मौलिक शुद्ध हिंदी में फिर से लिखना है ताकि कॉपीराइट का उल्लंघन न हो। "
        "नियम: (1) शीर्षक को आकर्षक और प्रभावशाली बनाएं। (2) लेख को पूरी तरह अपने शब्दों में दोबारा लिखें। "
        "(3) सभी संख्याएँ, आँकड़े, तिथियाँ, नाम और मूल तथ्य बिल्कुल न बदलें। "
        "(4) व्याकरण, वर्तनी और मात्राएँ 100% शुद्ध रखें। "
        "केवल इस JSON प्रारूप में उत्तर दें: "
        '{"rewritten_title": "...", "rewritten_body": "...", "summary": "..."}'
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"rw-{uuid.uuid4().hex}", system_message=system).with_model("gemini", AI_MODEL)
    prompt = f"श्रेणी: {category}\nमूल शीर्षक: {title}\n\nमूल सामग्री:\n{body}\n\nकृपया मौलिक हिंदी में पुनर्लेखन करें। summary अधिकतम 40 शब्दों की हो।"
    resp = await chat.send_message(UserMessage(text=prompt))
    txt = resp.strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```[a-zA-Z]*\n?", "", txt)
        txt = re.sub(r"\n?```$", "", txt).strip()
    try:
        data = json.loads(txt)
    except Exception:
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        data = json.loads(m.group(0)) if m else {"rewritten_title": title, "rewritten_body": body, "summary": body[:200]}
    return data


async def ai_generate_image(prompt: str) -> Optional[bytes]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"img-{uuid.uuid4().hex}",
                   system_message="You generate high quality editorial news images.").with_model(
        "gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if images:
        return base64.b64decode(images[0]["data"])
    return None


# ---------------------------------------------------------------- Public routes
def _serialize(a: dict) -> dict:
    a["id"] = str(a.pop("_id"))
    return a


@api_router.get("/")
async def root():
    return {"message": "Ghaziabad Times API", "status": "ok"}


@api_router.get("/articles")
async def list_articles(category: Optional[str] = None, region: Optional[str] = None,
                        district: Optional[str] = None, ncr: Optional[bool] = None,
                        breaking: Optional[bool] = None, q: Optional[str] = None,
                        limit: int = 30, skip: int = 0):
    query = {"status": "published"}
    if category:
        query["category"] = category
    if region:
        query["region"] = region
    if district:
        query["district"] = district
    if breaking:
        query["is_breaking"] = True
    if ncr:
        query["$or"] = [{"region": {"$in": ["delhi", "haryana", "rajasthan"]}},
                        {"district": {"$in": ["noida", "greater-noida", "ghaziabad"]}}]
    if q:
        query["title"] = {"$regex": re.escape(q), "$options": "i"}
    cursor = db.articles.find(query).sort("published_at", -1).skip(skip).limit(min(limit, 60))
    docs = await cursor.to_list(length=min(limit, 60))
    return [_serialize(d) for d in docs]


@api_router.get("/ticker")
async def ticker():
    docs = await db.articles.find({"status": "published"}).sort("published_at", -1).limit(12).to_list(12)
    return [{"id": str(d["_id"]), "title": d["title"], "is_breaking": d.get("is_breaking", False)} for d in docs]


@api_router.get("/articles/{article_id}")
async def get_article(article_id: str):
    doc = await db.articles.find_one({"_id": ObjectId(article_id), "status": "published"})
    if not doc:
        raise HTTPException(status_code=404, detail="समाचार नहीं मिला")
    related = await db.articles.find(
        {"status": "published", "category": doc["category"], "_id": {"$ne": doc["_id"]}}
    ).sort("published_at", -1).limit(4).to_list(4)
    return {"article": _serialize(doc), "related": [_serialize(r) for r in related]}


AD_PACKAGES = [
    {"id": "banner-top", "name": "टॉप बैनर विज्ञापन", "price": 15000, "duration": "30 दिन", "features": ["होमपेज टॉप बैनर", "सभी पेज पर दृश्यता", "लाखों इंप्रेशन"]},
    {"id": "sidebar", "name": "साइडबार विज्ञापन", "price": 8000, "duration": "30 दिन", "features": ["श्रेणी पेज साइडबार", "उच्च क्लिक दर", "लक्षित दर्शक"]},
    {"id": "sponsored", "name": "प्रायोजित समाचार", "price": 25000, "duration": "प्रति लेख", "features": ["मुख्य फ़ीड में लेख", "'प्रायोजित' टैग", "सोशल मीडिया प्रचार"]},
    {"id": "district", "name": "जिला स्तरीय विज्ञापन", "price": 5000, "duration": "30 दिन", "features": ["गाज़ियाबाद/नोएडा पेज", "स्थानीय व्यवसायों हेतु", "किफायती दर"]},
]


@api_router.get("/ad-packages")
async def ad_packages():
    return AD_PACKAGES


@api_router.post("/ad-inquiry")
async def ad_inquiry(inq: AdInquiry):
    doc = inq.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["status"] = "new"
    await db.ad_inquiries.insert_one(doc)
    return {"message": "आपका विज्ञापन अनुरोध प्राप्त हो गया है। हमारी टीम जल्द ही आपसे संपर्क करेगी।"}


# ---------------------------------------------------------------- Auth routes
@api_router.post("/auth/login")
async def login(body: LoginReq):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="ईमेल या पासवर्ड गलत है")
    token = create_token(str(user["_id"]), email)
    return {"token": token, "user": {"email": email, "name": user.get("name", "Admin")}}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return {"email": admin["email"], "name": admin.get("name", "Admin")}


# ---------------------------------------------------------------- Admin routes
@api_router.get("/admin/articles")
async def admin_articles(status: str = "pending", region: Optional[str] = None,
                         district: Optional[str] = None, category: Optional[str] = None,
                         limit: int = 80, admin: dict = Depends(get_current_admin)):
    query = {"status": status}
    if region:
        query["region"] = region
    if district:
        query["district"] = district
    if category:
        query["category"] = category
    docs = await db.articles.find(query).sort("created_at", -1).limit(min(limit, 120)).to_list(min(limit, 120))
    return [_serialize(d) for d in docs]


@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_current_admin)):
    pending = await db.articles.count_documents({"status": "pending"})
    published = await db.articles.count_documents({"status": "published"})
    rejected = await db.articles.count_documents({"status": "rejected"})
    inquiries = await db.ad_inquiries.count_documents({})
    return {"pending": pending, "published": published, "rejected": rejected, "inquiries": inquiries}


@api_router.post("/admin/aggregate")
async def admin_aggregate(admin: dict = Depends(get_current_admin)):
    count = await run_aggregation()
    return {"inserted": count, "message": f"{count} नए समाचार कतार में जोड़े गए"}


@api_router.post("/admin/articles/{article_id}/rewrite")
async def admin_rewrite(article_id: str, admin: dict = Depends(get_current_admin)):
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="समाचार नहीं मिला")
    data = await ai_rewrite(doc.get("original_title") or doc["title"], doc.get("body", ""), doc.get("category", ""))
    update = {
        "title": data.get("rewritten_title", doc["title"]),
        "body": data.get("rewritten_body", doc.get("body", "")),
        "summary": data.get("summary", doc.get("summary", ""))[:300],
        "ai_rewritten": True,
    }
    await db.articles.update_one({"_id": doc["_id"]}, {"$set": update})
    doc.update(update)
    return _serialize(doc)


@api_router.post("/admin/articles/{article_id}/watermark")
async def admin_watermark(article_id: str, admin: dict = Depends(get_current_admin)):
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc or not doc.get("image_url"):
        raise HTTPException(status_code=400, detail="छवि उपलब्ध नहीं है")
    new_url = await asyncio.to_thread(save_watermarked_from_url, doc["image_url"])
    if not new_url:
        raise HTTPException(status_code=422, detail="वॉटरमार्क लगाने में विफल")
    await db.articles.update_one({"_id": doc["_id"]}, {"$set": {"image_url": new_url, "watermarked": True}})
    doc.update({"image_url": new_url, "watermarked": True})
    return _serialize(doc)


@api_router.post("/admin/articles/{article_id}/generate-image")
async def admin_generate_image(article_id: str, body: GenImageReq, admin: dict = Depends(get_current_admin)):
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="समाचार नहीं मिला")
    img_bytes = await ai_generate_image(body.prompt)
    if not img_bytes:
        raise HTTPException(status_code=422, detail="छवि जनरेट करने में विफल")
    url = await asyncio.to_thread(save_watermarked_bytes, img_bytes)
    await db.articles.update_one({"_id": doc["_id"]}, {"$set": {"image_url": url, "watermarked": True}})
    doc.update({"image_url": url, "watermarked": True})
    return _serialize(doc)


@api_router.post("/admin/articles/{article_id}/publish")
async def admin_publish(article_id: str, body: RewriteReq, admin: dict = Depends(get_current_admin)):
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="समाचार नहीं मिला")
    update = {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}
    if body.is_breaking is not None:
        update["is_breaking"] = body.is_breaking
    await db.articles.update_one({"_id": doc["_id"]}, {"$set": update})
    return {"message": "समाचार प्रकाशित हो गया", "id": article_id}


@api_router.post("/admin/articles/{article_id}/reject")
async def admin_reject(article_id: str, admin: dict = Depends(get_current_admin)):
    await db.articles.update_one({"_id": ObjectId(article_id)}, {"$set": {"status": "rejected"}})
    return {"message": "समाचार अस्वीकृत", "id": article_id}


app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- Seed
SEED_ARTICLES = [
    {"title": "गाज़ियाबाद में स्मार्ट सिटी परियोजना को मिली नई रफ्तार, 250 करोड़ की योजनाएं मंज़ूर", "category": "national-politics", "region": "up", "district": "ghaziabad", "is_breaking": True,
     "image_url": "https://images.pexels.com/photos/5548399/pexels-photo-5548399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "गाज़ियाबाद विकास प्राधिकरण ने शहर के बुनियादी ढांचे को मजबूत करने के लिए 250 करोड़ रुपये की परियोजनाओं को हरी झंडी दी है।"},
    {"title": "उत्तर प्रदेश में बड़ा प्रशासनिक फेरबदल, 18 आईएएस अधिकारियों के तबादले", "category": "national-politics", "region": "up", "district": "lucknow", "is_breaking": True,
     "image_url": "https://images.pexels.com/photos/19883685/pexels-photo-19883685.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "राज्य सरकार ने देर रात जारी आदेश में 18 वरिष्ठ आईएएस अधिकारियों के स्थानांतरण किए, कई जिलों के डीएम बदले गए।"},
    {"title": "नोएडा एक्सप्रेसवे पर नया इंटरचेंज तैयार, रोज़ाना 2 लाख वाहनों को राहत", "category": "national-politics", "region": "up", "district": "noida",
     "image_url": "https://images.pexels.com/photos/10464454/pexels-photo-10464454.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "नोएडा-ग्रेटर नोएडा एक्सप्रेसवे पर बहुप्रतीक्षित इंटरचेंज का निर्माण पूरा, जाम की समस्या से मिलेगी बड़ी राहत।"},
    {"title": "भारतीय क्रिकेट टीम की शानदार जीत, सीरीज़ में बनाई 2-0 की अजेय बढ़त", "category": "sports", "region": None, "district": None,
     "image_url": "https://images.pexels.com/photos/36230651/pexels-photo-36230651.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "गेंदबाज़ों के दमदार प्रदर्शन के दम पर भारत ने दूसरा मुकाबला 6 विकेट से जीतकर सीरीज़ में निर्णायक बढ़त बना ली।"},
    {"title": "आईपीएल नीलामी में युवा भारतीय खिलाड़ियों पर टूटे रिकॉर्ड, 12 करोड़ की बोली", "category": "sports", "region": None, "district": None,
     "image_url": "https://images.pexels.com/photos/31739439/pexels-photo-31739439.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "मेगा नीलामी में घरेलू क्रिकेट के सितारों पर फ्रेंचाइज़ियों ने जमकर पैसा लुटाया, कई युवा खिलाड़ी करोड़पति बने।"},
    {"title": "अमेरिका-भारत व्यापार समझौते पर बड़ी प्रगति, तकनीकी क्षेत्र में निवेश बढ़ेगा", "category": "international", "region": None, "district": None,
     "image_url": "https://images.pexels.com/photos/10464476/pexels-photo-10464476.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "दोनों देशों के बीच द्विपक्षीय व्यापार वार्ता में अहम सफलता, भारतीय आईटी और फार्मा कंपनियों को होगा सीधा लाभ।"},
    {"title": "दिल्ली-एनसीआर में वायु गुणवत्ता सुधार के लिए नई कार्ययोजना लागू", "category": "national-politics", "region": "delhi", "district": None,
     "image_url": "https://images.pexels.com/photos/10464454/pexels-photo-10464454.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "प्रदूषण पर लगाम कसने के लिए दिल्ली, नोएडा और गुरुग्राम में समन्वित कदम, निर्माण गतिविधियों पर निगरानी बढ़ी।"},
    {"title": "सर्दियों में इम्यूनिटी बढ़ाने के 5 आयुर्वेदिक उपाय, विशेषज्ञों की राय", "category": "lifestyle", "region": None, "district": None,
     "image_url": "https://images.pexels.com/photos/5548399/pexels-photo-5548399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "बदलते मौसम में सेहत का ख्याल रखना ज़रूरी है, जानिए घरेलू और आयुर्वेदिक तरीकों से रोग प्रतिरोधक क्षमता बढ़ाने के उपाय।"},
    {"title": "हरियाणा में नई औद्योगिक नीति की घोषणा, 50 हज़ार नौकरियों का लक्ष्य", "category": "national-politics", "region": "haryana", "district": None,
     "image_url": "https://images.pexels.com/photos/19883685/pexels-photo-19883685.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "राज्य सरकार ने निवेश आकर्षित करने और युवाओं को रोज़गार देने के लिए महत्वाकांक्षी औद्योगिक नीति का ऐलान किया।"},
    {"title": "राजस्थान पर्यटन को नई उड़ान, विदेशी सैलानियों की संख्या में 30% इज़ाफा", "category": "national-politics", "region": "rajasthan", "district": None,
     "image_url": "https://images.pexels.com/photos/10464476/pexels-photo-10464476.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "जयपुर, उदयपुर और जोधपुर में पर्यटकों की भारी आमद, हेरिटेज होटल और स्थानीय व्यवसायों को मिला बड़ा फायदा।"},
    {"title": "पंजाब में गेहूं की रिकॉर्ड पैदावार, किसानों को मिला बेहतर समर्थन मूल्य", "category": "national-politics", "region": "punjab", "district": None,
     "image_url": "https://images.pexels.com/photos/5548399/pexels-photo-5548399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "इस रबी सीज़न में पंजाब के किसानों ने रिकॉर्ड उत्पादन दर्ज किया, मंडियों में खरीद प्रक्रिया सुचारू रूप से जारी।"},
    {"title": "उत्तराखंड में शीतकालीन पर्यटन शुरू, चारधाम के कपाट बंद होने के बाद बढ़ी रौनक", "category": "national-politics", "region": "uttarakhand", "district": None,
     "image_url": "https://images.pexels.com/photos/10464454/pexels-photo-10464454.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "summary": "औली और नैनीताल में बर्फबारी का इंतज़ार कर रहे पर्यटकों की भीड़, राज्य सरकार ने पर्यटन सुविधाओं को किया दुरुस्त।"},
]


async def seed():
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@ghaziabadtimes.com').lower()
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password),
                                   "name": "संपादक", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.articles.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        for i, s in enumerate(SEED_ARTICLES):
            art = Article(
                title=s["title"], original_title=s["title"], summary=s["summary"],
                body=s["summary"] + "\n\n" + s["summary"] + " विस्तृत रिपोर्ट के अनुसार, स्थानीय प्रशासन और संबंधित विभागों ने इस दिशा में ठोस कदम उठाए हैं। नागरिकों ने इस पहल का स्वागत किया है और आने वाले दिनों में इसके सकारात्मक परिणाम देखने को मिलेंगे।",
                category=s["category"], region=s.get("region"), district=s.get("district"),
                source_name="Ghaziabad Times ब्यूरो", source_url=f"seed-{i}",
                image_url=s["image_url"], is_breaking=s.get("is_breaking", False),
                ai_rewritten=True, watermarked=True, status="published",
                published_at=(now - timedelta(hours=i * 2)).isoformat(),
            )
            await db.articles.insert_one(art.to_mongo())
        logger.info("seeded sample published articles")


@app.on_event("startup")
async def on_startup():
    await db.articles.create_index("status")
    await db.articles.create_index("source_url")
    await db.users.create_index("email", unique=True)
    await seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
