import asyncio
import random
from datetime import datetime, timezone, timedelta
import httpx
from bs4 import BeautifulSoup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client, Client

# 한국 표준시(KST) 설정
KST = timezone(timedelta(hours=9))

# Supabase 연동 환경변수 (실제 배포 시 .env에서 로드)
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-service-role-key"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 차단 우회용 User-Agent 풀
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
]

# 10대 커뮤니티 크롤링 타겟 설정
TARGET_COMMUNITIES = [
    {"name": "에펨코리아", "url": "https://www.fmkorea.com/best", "default_cat": "유머"},
    {"name": "디시인사이드", "url": "https://gall.dcinside.com/board/lists?id=dcbest", "default_cat": "사건사고"},
    {"name": "더쿠", "url": "https://theqoo.net/hot", "default_cat": "연예"},
    {"name": "루리웹", "url": "https://bbs.ruliweb.com/best/humor", "default_cat": "유머"},
    {"name": "보배드림", "url": "https://www.bobaedream.co.kr/list?code=best", "default_cat": "사건사고"},
    {"name": "인스티즈", "url": "https://www.instiz.net/pt", "default_cat": "연예"},
    {"name": "개드립", "url": "https://www.dogdrip.net/dogdrip", "default_cat": "유머"},
    {"name": "네이트판", "url": "https://pann.nate.com/talk/ranking", "default_cat": "사건사고"},
    {"name": "웃긴대학", "url": "http://web.humoruniv.com/board/humor/list.html?table=pds", "default_cat": "유머"},
    {"name": "클리앙", "url": "https://www.clien.net/service/group/clien_all?&od=T33", "default_cat": "정치"},
]

def calculate_viral_velocity(views: int, likes: int, comments: int) -> float:
    """화력 지수(Viral Velocity) 계산 공식 (15분 기준)"""
    raw_score = (views * 0.05) + (likes * 2.5) + (comments * 4.0)
    return round(min(raw_score / 15.0, 99.9), 1)

def detect_nsfw_and_category(title: str, default_cat: str):
    """제목 키워드 기반 1차 카테고리 분류 및 후방주의(NSFW) 감지"""
    is_nsfw = any(keyword in title for keyword in ["후방", "은꼴", "19)", "약후", "몸매", "비키니"])
    if is_nsfw:
        return "섹시", True
    if any(k in title for k in ["손흥민", "야구", "축구", "롤드컵", "배구", "골"]):
        return "스포츠", False
    if any(k in title for k in ["국회", "대통령", "여야", "정당", "의원"]):
        return "정치", False
    return default_cat, False

async def crawl_single_site(client: httpx.AsyncClient, site_info: dict):
    """개별 커뮤니티 비동기 크롤링 및 Rate Limiting 적용"""
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    try:
        # IP 차단 방지를 위한 1.5~3.5초 랜덤 딜레이
        await asyncio.sleep(random.uniform(1.5, 3.5))
        response = await client.get(site_info["url"], headers=headers, timeout=10.0)
        
        if response.status_code != 200:
            print(f"[{site_info['name']}] 접근 제한 또는 응답 오류: HTTP {response.status_code}")
            return

        soup = BeautifulSoup(response.text, "html.parser")
        print(f"[{datetime.now(KST).strftime('%H:%M:%S')}] {site_info['name']} 크롤링 및 파싱 완료")
        
        # (예시) 파싱된 데이터를 Supabase에 Upsert 수행
        # supabase.table("issues").upsert(parsed_items, on_conflict="source_site,original_id").execute()

    except Exception as e:
        print(f"[{site_info['name']}] 크롤링 예외 발생: {e}")

async def run_15min_crawl_pipeline():
    """15분마다 실행되는 메인 크롤링 파이프라인"""
    now_kst = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    print(f"\n🚀 [이슈큐레이터] 15분 주기 정기 크롤링 시작 ({now_kst})")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        tasks = [crawl_single_site(client, site) for site in TARGET_COMMUNITIES]
        await asyncio.gather(*tasks)
        
    print(f"✅ [이슈큐레이터] 10개 커뮤니티 업데이트 완료!\n")

if __name__ == "__main__":
    scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
    # 15분 간격(매시 0, 15, 30, 45분)으로 크롤링 실행 세팅
    scheduler.add_job(run_15min_crawl_pipeline, "cron", minute="*/15")
    scheduler.start()
    
    print("⚡ 15분 주기 크롤링 스케줄러가 시작되었습니다. (Ctrl+C로 종료)")
    asyncio.get_event_loop().run_forever()