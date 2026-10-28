"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  Tv,
  Sparkles,
  BookmarkPlus,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  Eye,
  Clock,
  Trash2,
  FileText,
  ShoppingBag,
  Send,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase"; // 🚀 Fix 1: Supabase 연동 추가

type Category = "전체" | "유머" | "스포츠" | "섹시" | "연예" | "사건사고" | "정치";

interface BestComment {
  author: string;
  content: string;
  likes: number;
}

interface IssueItem {
  id: string;
  source_site: string;
  category: Exclude<Category, "전체">;
  title: string;
  safe_title: string;
  thumbnail_url: string;
  original_url: string;
  views: number;
  likes: number;
  comments_count: number;
  viral_velocity: number;
  is_nsfw: boolean;
  ai_summary: string[];
  best_comments: BestComment[];
  affiliate_keyword?: string;
  updated_at: string;
}

// 초기 기본 샘플 데이터 (기존 로직 보존)
const INITIAL_ISSUES: IssueItem[] = [
  {
    id: "init-1",
    source_site: "에펨코리아",
    category: "유머",
    title: "현재 알바생 멘탈 터졌다는 역대급 진상 손님 근황 ㅋㅋㅋ",
    safe_title: "현재 알바생 멘탈 터졌다는 역대급 손님 근황 ㅋㅋㅋ",
    thumbnail_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=60",
    original_url: "https://www.fmkorea.com/best",
    views: 84200,
    likes: 1240,
    comments_count: 452,
    viral_velocity: 98.4,
    is_nsfw: false,
    ai_summary: [
      "카페 마감 5분 전에 들어와 빙수 4개를 시킨 손님 사연이 화제.",
      "사장님이 CCTV 확인 후 오히려 알바생에게 보너스를 챙겨주며 사이다 결말.",
    ],
    best_comments: [
      { author: "커피노예", content: "마감 5분 전 빙수는 사탄도 한 수 접고 간다 진짜 ㅋㅋ", likes: 540 },
    ],
    affiliate_keyword: "가정용 눈꽃 빙수기",
    updated_at: "샘플 데이터",
  },
  {
    id: "init-2",
    source_site: "루리웹",
    category: "섹시",
    title: "[후방주의] 동탄 헬스장 트레이너 눈바디 레전드 ㄷㄷ",
    safe_title: "[주의] 동탄 헬스장 트레이너 운동 인증 레전드",
    thumbnail_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=60",
    original_url: "https://bbs.ruliweb.com/best/humor",
    views: 112500,
    likes: 890,
    comments_count: 310,
    viral_velocity: 94.2,
    is_nsfw: true,
    ai_summary: [
      "SNS에서 화제가 된 헬스 트레이너의 눈바디 사진.",
      "체지방률 14%를 유지하는 루틴이 함께 공개됨.",
    ],
    best_comments: [
      { author: "헬창맨", content: "와 어깨 프레임이랑 코어 근육 잡힌 거 봐라 엄청 했네", likes: 420 },
    ],
    affiliate_keyword: "고단백 닭가슴살",
    updated_at: "샘플 데이터",
  },
];

const CATEGORIES: Category[] = ["전체", "유머", "스포츠", "섹시", "연예", "사건사고", "정치"];

// 🚀 Fix 2: 찌꺼기 공백 제거 및 선언부 클린업
export default function IssueCuratorDashboard() {
  const [issues, setIssues] = useState<IssueItem[]>([]); // 🚀 빈 배열로 시작 (DB 연동)
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [streamerLayout, setStreamerLayout] = useState<boolean>(false);
  const [scriptBucket, setScriptBucket] = useState<IssueItem[]>([]);
  const [activeShortsModal, setActiveShortsModal] = useState<IssueItem | null>(null);
  
  // iframe 미리보기를 위한 Hover 상태 관리
  const [hoverPreviewId, setHoverPreviewId] = useState<string | null>(null);

  const [nextCrawlSeconds, setNextCrawlSeconds] = useState<number>(15 * 60);
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  
  // 🚀 Fix 3: 잃어버린 DB 호출 함수 복구 및 크롤링 완료 시 갱신
  const [lastCrawledKST, setLastCrawledKST] = useState<string>("DB 데이터 로드 중...");

  // 1. DB 로드 함수 복구
  const fetchIssuesFromDB = useCallback(async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('viral_velocity', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setIssues(data as IssueItem[]);
      setLastCrawledKST(data[0].updated_at || "방금 전");
    }
  }, []);

  // 2. 크롤러가 DB에 저장하고 나면, DB에서 다시 깔끔하게 불러오기
  const triggerLiveCrawl = useCallback(async () => {
    setIsCrawling(true);
    try {
      const res = await fetch("/api/cron/crawl");
      const data = await res.json();
      
      if (data.status === "success") {
        await fetchIssuesFromDB(); 
        setNextCrawlSeconds(15 * 60);
      }
    } catch (err) {
      console.error("실시간 크롤링 호출 실패:", err);
    } finally {
      setIsCrawling(false);
    }
  }, [fetchIssuesFromDB]);

  // 3. 페이지 로드 시 DB부터 불러오고 크롤링 실행
  useEffect(() => {
    fetchIssuesFromDB().then(() => {
      triggerLiveCrawl();
    });
  }, [fetchIssuesFromDB, triggerLiveCrawl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextCrawlSeconds((prev) => {
        if (prev <= 1) {
          triggerLiveCrawl();
          return 15 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [triggerLiveCrawl]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const filteredIssues = issues.filter((item) =>
    selectedCategory === "전체" ? true : item.category === selectedCategory
  );

  const toggleBucket = (issue: IssueItem) => {
    setScriptBucket((prev) =>
      prev.some((i) => i.id === issue.id)
        ? prev.filter((i) => i.id !== issue.id)
        : [...prev, issue]
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 font-sans flex flex-col relative pb-[60px] lg:pb-0">
      
      {/* 1. 상단 컨트롤 헤더 (기존 코드 유지) */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0E14]/90 backdrop-blur-md px-4 lg:px-6 py-3.5">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-white hidden sm:block">이슈큐레이터</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden lg:block">마지막 수집: {lastCrawledKST}</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400">다음 자동 수집:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {formatTimer(nextCrawlSeconds)}
              </span>
              <button
                onClick={triggerLiveCrawl}
                disabled={isCrawling}
                className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCrawling ? "animate-spin" : ""}`} />
                <span>{isCrawling ? "크롤링 중..." : "즉시 실행"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={`flex items-center gap-2 px-3 py-1.5 lg:py-2 rounded-xl text-[11px] lg:text-xs font-semibold border transition-all ${
                safeMode ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/40 text-rose-300"
              }`}
            >
              {safeMode ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
              <span className="hidden sm:inline">스트리머 안전: {safeMode ? "ON" : "OFF"}</span>
            </button>

            <button
              onClick={() => setStreamerLayout(!streamerLayout)}
              className={`flex items-center gap-2 px-3 py-1.5 lg:py-2 rounded-xl text-[11px] lg:text-xs font-semibold border transition-all ${
                streamerLayout ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">OBS 송출 모드</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. 카테고리 네비게이션 */}
      <div className="border-b border-slate-800/60 bg-[#0F131C]">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              const isAdultTab = category === "섹시";
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? isAdultTab ? "bg-rose-600 text-white" : "bg-indigo-600 text-white"
                      : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-800/80"
                  }`}
                >
                  {isAdultTab && <span className="text-[9px] px-1 bg-rose-500/30 rounded text-rose-200">19</span>}
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 중앙 집중형 레이아웃 + 좌우 배너 시스템 */}
      <div className="flex justify-center w-full max-w-[1800px] mx-auto flex-1 relative">
        
        {/* [왼쪽 배너 영역] 데스크탑 환경에서만 노출 (광고 배너 영역) */}
        {!streamerLayout && (
          <aside className="hidden 2xl:flex w-[220px] shrink-0 flex-col gap-4 py-6 pl-4 sticky top-[120px] h-[calc(100vh-120px)]">
            <div className="w-full h-full bg-[#131824]/50 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500">
              <span className="text-xs font-bold text-slate-400">좌측 배너 광고 영역</span>
              <span className="text-[10px] mt-1">(Google AdSense / CPA)</span>
            </div>
          </aside>
        )}

        {/* [메인 워크스페이스] 중앙 정렬 (이슈 리스트 + 큐시트 장바구니) */}
        <main className="flex-1 max-w-[1300px] w-full px-4 lg:px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className={streamerLayout ? "xl:col-span-12" : "xl:col-span-8"}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* 썸네일 축소(1/4) 적용 가로형 리스트 카드 렌더링 */}
              {filteredIssues.map((issue) => {
                const isBucketed = scriptBucket.some((i) => i.id === issue.id);
                const shouldBlur = safeMode && issue.is_nsfw;
                const displayTitle = safeMode ? issue.safe_title : issue.title;

                return (
                  <article
                    key={issue.id}
                    className="group bg-[#131824] border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all flex flex-col"
                  >
                    {/* 가로형 디자인: 좌측 썸네일(w-28), 우측 메타데이터 */}
                    <div className="flex p-3 gap-3">
                      <a
                        href={issue.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-950 cursor-pointer border border-slate-800"
                      >
                        <img
                          src={issue.thumbnail_url}
                          alt={displayTitle}
                          className={`w-full h-full object-cover transition-all duration-300 ${shouldBlur ? "blur-xl scale-110 brightness-75" : ""}`}
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/85 text-white border border-slate-700/60 text-[9px] font-bold">
                          {issue.source_site}
                        </div>
                      </a>

                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">{issue.category}</span>
                          <span className="flex items-center gap-2 font-medium text-rose-400">
                            🔥 {issue.viral_velocity}
                          </span>
                        </div>
                        <a
                          href={issue.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm font-bold text-slate-200 hover:text-indigo-400 line-clamp-2 leading-snug mb-1.5"
                        >
                          {displayTitle}
                        </a>
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-medium">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {(issue.views / 1000).toFixed(1)}k</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /> {issue.likes}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {issue.comments_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* 하단 액션 바 및 Iframe 미리보기 트리거 */}
                    <div className="px-3 pb-3 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 bg-[#0B0E14]/30 relative">
                      <button
                        onClick={() => setActiveShortsModal(issue)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> 쇼츠 대본
                      </button>

                      <button
                        onClick={() => toggleBucket(issue)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isBucketed ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        <BookmarkPlus className="w-4 h-4" />
                      </button>

                      {/* 미리보기 지원 원본 글 아웃링크 버튼 (Hover 이벤트 적용) */}
                      <div
                        className="relative"
                        onMouseEnter={() => setHoverPreviewId(issue.id)}
                        onMouseLeave={() => setHoverPreviewId(null)}
                      >
                        <a
                          href={issue.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          미리보기 ↗
                        </a>

                        {/* Iframe 팝업 창 */}
                        {hoverPreviewId === issue.id && (
                          <div className="absolute bottom-full right-0 mb-2 w-[350px] h-[400px] bg-[#0B0E14] border-2 border-indigo-500 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-200 flex flex-col">
                            <div className="bg-indigo-600 text-white text-[10px] px-2 py-1 text-center font-bold flex items-center justify-between">
                              <span>트래픽 절감 미리보기 창</span>
                              <span className="font-normal text-indigo-200">일부 사이트는 차단될 수 있습니다</span>
                            </div>
                            <iframe 
                              src={issue.original_url} 
                              className="w-full flex-1 bg-white" 
                              title="preview"
                              sandbox="allow-same-origin allow-scripts allow-popups"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 우측 방송 큐시트 장바구니 영역 */}
          {!streamerLayout && (
            <aside className="xl:col-span-4 space-y-6">
              <div className="bg-[#131824] border border-slate-800 rounded-2xl p-5 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookmarkPlus className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-extrabold text-white">방송 대본 큐시트</h3>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300">
                    {scriptBucket.length}개
                  </span>
                </div>

                {scriptBucket.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl p-4">
                    <p className="text-[11px] text-slate-400">이슈를 담아 순서를 구성하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {scriptBucket.map((item, index) => (
                      <div key={item.id} className="bg-[#0B0E14] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <a
                          href={item.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-slate-300 hover:text-indigo-400 line-clamp-1 w-full"
                        >
                          <span className="text-indigo-500 font-bold mr-1">{index + 1}.</span> 
                          [{item.source_site}] {safeMode ? item.safe_title : item.title}
                        </a>
                        <button onClick={() => toggleBucket(item)} className="text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}
        </main>

        {/* [우측 배너 영역] 초광각 모니터용 배너 (BM) */}
        {!streamerLayout && (
          <aside className="hidden 3xl:flex w-[220px] shrink-0 flex-col gap-4 py-6 pr-4 sticky top-[120px] h-[calc(100vh-120px)]">
            <div className="w-full h-full bg-[#131824]/50 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500">
              <span className="text-xs font-bold text-slate-400">우측 배너 광고 영역</span>
            </div>
          </aside>
        )}
      </div>

      {/* [모바일 하단 고정 배너] 반응형 모바일 광고 영역 */}
      {!streamerLayout && (
        <div className="fixed bottom-0 left-0 w-full h-[60px] bg-[#131824] border-t border-slate-800 z-50 lg:hidden flex items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <div className="w-[320px] h-[50px] bg-slate-900 border border-slate-700/50 rounded flex items-center justify-center text-slate-400 text-[10px] font-bold">
            모바일 하단 고정 광고 (AdSense 320x50)
          </div>
        </div>
      )}

      {/* 4. 기존 1클릭 쇼츠 대본 모달 유지 */}
      {activeShortsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#131824] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">1클릭 60초 쇼츠 대본</h3>
              <button onClick={() => setActiveShortsModal(null)} className="text-xs text-slate-400 px-2 py-1 rounded bg-slate-800">
                닫기 ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-3">
                <span className="text-indigo-400 font-bold">[오프닝 후킹]</span>
                <p className="text-slate-200 mt-1">지금 {activeShortsModal.source_site}에서 난리 난 &ldquo;{activeShortsModal.safe_title}&rdquo; 보셨나요?</p>
              </div>
              <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-3">
                <span className="text-emerald-400 font-bold">[본문 요약]</span>
                {activeShortsModal.ai_summary.map((line, i) => (
                  <p key={i} className="text-slate-300 mt-1">• {line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}