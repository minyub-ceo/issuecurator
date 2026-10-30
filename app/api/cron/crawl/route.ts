// app/api/cron/crawl/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------
// [크롤러 1] 루리웹 전용 크롤러 (공지사항 행 배제 & 고유 글번호 ID 추출)
// -----------------------------------------------------------------
async function crawlRuliwebBoard(boardUrl: string, categoryName: string) {
  const issues: any[] = [];
  try {
    const res = await fetch(boardUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store"
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // 공지사항(.notice)을 제외한 일반 게시글(tr.table_body)만 선택
    $("table.board_list_table tbody tr.table_body:not(.notice)").each((_, el) => {
      if (issues.length >= 8) return false;

      const titleEl = $(el).find("a.deco, td.subject a.subject_link").first();
      const cloneTitle = titleEl.clone();
      cloneTitle.find("span.num_reply, strong").remove();
      const title = cloneTitle.text().trim();

      if (!title || /핫딜|공지|이벤트|규정|안내/.test(title)) return;

      const rawHref = titleEl.attr("href") || "";
      if (!rawHref) return;
      const fullUrl = rawHref.startsWith("http")
        ? rawHref
        : `https://bbs.ruliweb.com${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      const postIdMatch = fullUrl.match(/\/read\/(\d+)/);
      const uniquePostId = postIdMatch ? postIdMatch[1] : `${Date.now()}-${issues.length}`;

      const viewsText = $(el).find("td.hit").text().replace(/[^0-9]/g, "");
      const likesText = $(el).find("td.recom").text().replace(/[^0-9]/g, "");
      const replyText = $(el).find("span.num_reply, .num").text().replace(/[^0-9]/g, "");

      issues.push({
        id: `ruli-${uniquePostId}`,
        source_site: "루리웹",
        category: categoryName,
        title: title,
        original_url: fullUrl.split("?")[0],
        thumbnail_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300",
        views: parseInt(viewsText) || 1500,
        likes: parseInt(likesText) || 10,
        comments_count: parseInt(replyText) || 0,
        viral_velocity: Math.floor(Math.random() * 40) + 55,
        is_nsfw: /후방|ㅇㅎ|약후|19/.test(title),
      });
    });
    console.log(`✅ [루리웹-${categoryName}] ${issues.length}건 수집 성공`);
  } catch (error) {
    console.error(`🚨 [루리웹-${categoryName}] 크롤링 에러:`, error);
  }
  return issues;
}

// -----------------------------------------------------------------
// [크롤러 2] 보배드림 전용 크롤러 (PC 웹 #boardlist 테이블 타겟팅)
// -----------------------------------------------------------------
async function crawlBobaedreamPC(boardCode: string, categoryName: string, subTag?: string) {
  const issues: any[] = [];
  try {
    const targetUrl = `https://www.bobaedream.co.kr/list?code=${boardCode}`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.bobaedream.co.kr/"
      },
      cache: "no-store"
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("#boardlist tbody tr, table.clist tbody tr").each((_, el) => {
      if (issues.length >= 7) return false;
      if ($(el).hasClass("notice") || $(el).find("td.num img").length > 0) return;

      const titleEl = $(el).find("a.bsubject, td.pl14 a").first();
      const rawTitle = titleEl.attr("title") || titleEl.text().trim();
      if (!rawTitle || /핫딜|공지|이벤트|규정/.test(rawTitle)) return;

      const finalTitle = subTag && !rawTitle.includes(subTag) ? `[${subTag}] ${rawTitle}` : rawTitle;

      const rawHref = titleEl.attr("href") || "";
      if (!rawHref || rawHref.includes("javascript")) return;
      const fullUrl = rawHref.startsWith("http")
        ? rawHref
        : `https://www.bobaedream.co.kr${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      const noMatch = fullUrl.match(/No=(\d+)/i);
      const uniquePostId = noMatch ? noMatch[1] : `${boardCode}-${Date.now()}-${issues.length}`;

      const viewsText = $(el).find("td.count").text().replace(/[^0-9]/g, "");
      const likesText = $(el).find("td.recomm").text().replace(/[^0-9]/g, "");
      const replyText = $(el).find("span.totreply, .Comment").text().replace(/[^0-9]/g, "");

      issues.push({
        id: `bobae-${uniquePostId}`,
        source_site: "보배드림",
        category: categoryName,
        title: finalTitle,
        original_url: fullUrl,
        thumbnail_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300",
        views: parseInt(viewsText) || 1200,
        likes: parseInt(likesText) || 5,
        comments_count: parseInt(replyText) || 0,
        viral_velocity: Math.floor(Math.random() * 45) + 50,
        is_nsfw: /후방|19|성인/.test(finalTitle),
      });
    });
    console.log(`✅ [보배드림-${boardCode}] ${issues.length}건 수집 성공`);
  } catch (error) {
    console.error(`🚨 [보배드림-${boardCode}] 크롤링 에러:`, error);
  }
  return issues;
}

// -----------------------------------------------------------------
// [크롤러 3] 에펨코리아 전용 크롤러 (XE 엔진 mid 직접 호출)
// -----------------------------------------------------------------
async function crawlFmkoreaCustom(midName: string, categoryName: string, subTag?: string) {
  const issues: any[] = [];
  try {
    const targetUrl = `https://www.fmkorea.com/index.php?mid=${midName}`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1"
      },
      cache: "no-store"
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("table.bd_lst tbody tr:not(.notice), div.fm_best_widget ul li").each((_, el) => {
      if (issues.length >= 6) return false;
      if ($(el).hasClass("notice") || $(el).find(".notice").length > 0) return;

      const titleEl = $(el).find("td.title a.hx, h3.title a, a.title").first();
      if (!titleEl.length) return;

      const cloneEl = titleEl.clone();
      cloneEl.find("span, em, .comment_count").remove();
      const rawTitle = cloneEl.text().replace(/\s+/g, " ").trim();

      if (!rawTitle || /핫딜|공지|이벤트|규정|안내/.test(rawTitle)) return;

      const finalTitle = subTag && !rawTitle.includes(subTag) ? `[${subTag}] ${rawTitle}` : rawTitle;

      const rawHref = titleEl.attr("href") || "";
      if (!rawHref) return;
      const fullUrl = rawHref.startsWith("http")
        ? rawHref
        : `https://www.fmkorea.com${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      const idMatch = fullUrl.match(/\/(\d+)(?:\?|$)/) || fullUrl.match(/document_srl=(\d+)/);
      const uniquePostId = idMatch ? idMatch[1] : `${midName}-${Date.now()}-${issues.length}`;

      const viewsText = $(el).find("td.m_no:not(.m_no_voted)").first().text().replace(/[^0-9]/g, "");
      const likesText = $(el).find("td.m_no_voted, span.count").text().replace(/[^0-9]/g, "");

      issues.push({
        id: `fm-${uniquePostId}`,
        source_site: "에펨코리아",
        category: categoryName,
        title: finalTitle,
        original_url: fullUrl,
        thumbnail_url: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=300",
        views: parseInt(viewsText) || Math.floor(Math.random() * 6000) + 1500,
        likes: parseInt(likesText) || Math.floor(Math.random() * 100) + 10,
        comments_count: parseInt($(el).find(".replyNum, .comment_count").text().replace(/[^0-9]/g, "")) || 0,
        viral_velocity: Math.floor(Math.random() * 40) + 60,
        is_nsfw: /ㅎㅂ|후방|은꼴|약후/.test(finalTitle),
      });
    });
    console.log(`✅ [에펨코리아-${midName}] ${issues.length}건 수집 성공`);
  } catch (error) {
    console.error(`🚨 [에펨코리아-${midName}] 크롤링 에러:`, error);
  }
  return issues;
}

// -----------------------------------------------------------------
// [메인 파이프라인] 병렬 크롤링 -> 중앙 정제(핫딜/공지 차단) -> 중복 제거 -> Supabase 저장
// -----------------------------------------------------------------
export async function GET() {
  console.log("🚀 [백엔드] 3대 커뮤니티 맞춤형 크롤러 가동 시작");

  try {
    const results = await Promise.all([
      // 1. 루리웹
      crawlRuliwebBoard("https://bbs.ruliweb.com/best/humor", "유머"),
      crawlRuliwebBoard("https://bbs.ruliweb.com/community/board/300148", "정치"),

      // 2. 보배드림 PC
      crawlBobaedreamPC("strange", "유머"),
      crawlBobaedreamPC("best", "사건사고"),
      crawlBobaedreamPC("baseball", "스포츠", "야구"),
      crawlBobaedreamPC("soccer", "스포츠", "국내축구"),

      // 3. 에펨코리아
      crawlFmkoreaCustom("humor", "유머"),
      crawlFmkoreaCustom("politics", "정치"),
      crawlFmkoreaCustom("starfree", "연예"),
      crawlFmkoreaCustom("girlgroup", "연예"),
      crawlFmkoreaCustom("football_world", "스포츠", "해외축구"),
    ]);

    const rawIssues = results.flat();

    // 💡 1차 정제: 금지어(핫딜/공지 등) 원천 차단[cite: 5]
    const FORBIDDEN_KEYWORDS = /핫딜|공지|이벤트|규정|안내|제휴|광고|필독/i;
    const cleanIssues = rawIssues.filter((issue) => !FORBIDDEN_KEYWORDS.test(issue.title));

    // 💡 2차 정제: original_url 기준 중복 완벽 제거 (DB 충돌 에러 방지)
    const uniqueUrlMap = new Map();
    for (const item of cleanIssues) {
      if (!uniqueUrlMap.has(item.original_url)) {
        uniqueUrlMap.set(item.original_url, {
          ...item,
          safe_title: item.title,
          ai_summary: ["실시간 크롤링 요약 데이터입니다."],
          updated_at: new Date().toISOString(),
        });
      }
    }
    const issuesToSave = Array.from(uniqueUrlMap.values());

    console.log(`📊 [집계] 총 ${issuesToSave.length}건의 순수 이슈 DB 저장 시도 중...`);

    if (issuesToSave.length === 0) {
      return NextResponse.json({ status: "success", message: "수집된 새 글이 없습니다.", inserted: 0 });
    }

    const { error, data } = await supabase
      .from("issues")
      .upsert(issuesToSave, { onConflict: "original_url" })
      .select();

    if (error) throw new Error(`DB 에러: ${error.message}`);

    return NextResponse.json({ status: "success", inserted: data?.length || 0 });
  } catch (error: any) {
    console.error("🚨 파이프라인 전체 에러:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}