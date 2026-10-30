"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Eye,
  RefreshCw,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Category = "유머" | "스포츠" | "섹시" | "연예" | "사건사고" | "정치";
const CATEGORIES: Category[] = ["유머", "스포츠", "섹시", "연예", "사건사고", "정치"];

interface BestComment {
  author: string;
  content: string;
  likes: number;
}

interface IssueItem {
  id: string;
  source_site: string;
  category: Category;
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

export default function IssueCuratorDashboard() {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("유머");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("전체");
  const SPORTS_SUB_CATEGORIES = ["전체", "야구", "국내축구", "해외축구"];

  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hoverPreviewId, setHoverPreviewId] = useState<string | null>(null);
  const [nextCrawlSeconds, setNextCrawlSeconds] = useState<number>(15 * 60);
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [lastCrawledKST, setLastCrawledKST] = useState<string>("DB 데이터 로드 중...");

  const fetchIssuesFromDB = useCallback(async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('viral_velocity', { ascending: false })
      .limit(50);

    if (error) {
      console.error("DB 로드 에러:", error);
      setLastCrawledKST("DB 연결 에러 (로그 확인)");
      return;
    }

    if (data && data.length > 0) {
      setIssues(data as IssueItem[]);
      setLastCrawledKST(data[0].updated_at || "방금 전");
    } else {
      setIssues([]);
      setLastCrawledKST("저장된 데이터 없음 (크롤링 필요)");
    }
  }, []);

  const triggerLiveCrawl = useCallback(async () => {
    setIsCrawling(true);
    setLastCrawledKST("크롤링 및 AI 요약 진행 중...");
    try {
      const res = await fetch("/api/cron/crawl", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP 에러 ${res.status}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        await fetchIssuesFromDB();
        setNextCrawlSeconds(15 * 60);
      } else {
        throw new Error(data.message || "파이프라인 실패");
      }
    } catch (err: any) {
      console.error("🚨 실시간 크롤링 호출 실패:", err);
      setLastCrawledKST(`크롤링 실패: ${err.message}`);
    } finally {
      setIsCrawling(false);
    }
  }, [fetchIssuesFromDB]);

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

  // 🚀 Fix 3-1: 프론트엔드 필터 방어선 추가 (과거 핫딜/공지 데이터 화면 노출 차단)
  const filteredIssues = issues.filter((item) => {
    if (item.title.includes("핫딜") || item.title.includes("공지")) return false;

    const matchCategory = item.category === selectedCategory;
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source_site.toLowerCase().includes(searchQuery.toLowerCase());

    let matchSubCategory = true;
    if (selectedCategory === "스포츠" && selectedSubCategory !== "전체") {
      matchSubCategory = item.title.includes(selectedSubCategory) || item.title.includes(selectedSubCategory.replace("축구", "축"));
    }

    return matchCategory && matchSearch && matchSubCategory;
  });

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    if (category !== "스포츠") {
      setSelectedSubCategory("전체");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 font-sans flex flex-col relative pb-[60px]">

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0E14]/90 backdrop-blur-md px-4 lg:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto md:flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
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

          <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
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

        <div className="w-full md:w-auto md:flex-1 flex justify-center order-last md:order-none">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="이슈 키워드 또는 커뮤니티 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131824] border border-slate-700/80 text-slate-200 text-sm rounded-full px-5 py-2 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors placeholder:text-slate-500 shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-auto md:flex-1">
          <button
            onClick={() => setSafeMode(!safeMode)}
            className={`flex items-center gap-2 px-3 py-1.5 lg:py-2 rounded-xl text-[11px] lg:text-xs font-semibold border transition-all ${safeMode ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/40 text-rose-300"
              }`}
          >
            {safeMode ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
            <span className="hidden sm:inline">스트리머 안전: {safeMode ? "ON" : "OFF"}</span>
          </button>
        </div>
      </header>

      <div className="border-b border-slate-800/60 bg-[#0F131C]">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-center overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              const isAdultTab = category === "섹시";
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${isSelected
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

      {selectedCategory === "스포츠" && (
        <div className="border-b border-slate-800/40 bg-[#0B0E14] animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-2 flex items-center justify-center overflow-x-auto no-scrollbar gap-2">
            {SPORTS_SUB_CATEGORIES.map((sub) => {
              const isSubSelected = selectedSubCategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${isSubSelected
                    ? "bg-slate-700 text-white border border-slate-600"
                    : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center w-full max-w-[1800px] mx-auto flex-1 relative">
        <aside className="hidden 2xl:flex w-[220px] shrink-0 flex-col gap-4 py-6 pl-4 sticky top-[120px] h-[calc(100vh-120px)]">
          <div className="w-full h-full bg-[#131824]/50 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-bold text-slate-400">좌측 배너 광고 영역</span>
            <span className="text-[10px] mt-1">(Google AdSense / CPA)</span>
          </div>
        </aside>

        <main className="flex-1 max-w-[1300px] w-full px-4 lg:px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-8">
            <div className="flex flex-col gap-2">
              {filteredIssues.map((issue, idx) => {
                const displayTitle = safeMode ? issue.safe_title : issue.title;

                return (
                  <article
                    key={issue.id}
                    className="group bg-[#131824] hover:bg-[#1E293B] border border-slate-800/80 hover:border-indigo-500/50 rounded-lg px-4 py-2.5 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-slate-500 text-xs font-mono w-4 text-center">{idx + 1}</span>

                      <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {issue.source_site}
                      </span>

                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {issue.category}
                      </span>

                      <a href={issue.original_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-200 hover:text-indigo-400 truncate flex-1">
                        {displayTitle}
                      </a>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {(issue.views / 1000).toFixed(1)}k</span>
                        <span className="flex items-center gap-1 text-rose-400">🔥 {issue.viral_velocity}</span>
                      </div>

                      <div className="flex items-center gap-1 relative">
                        <div
                          className="relative"
                          onMouseEnter={() => setHoverPreviewId(issue.id)}
                          onMouseLeave={() => setHoverPreviewId(null)}
                        >
                          <a
                            href={issue.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 block transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {hoverPreviewId === issue.id && (
                            <div className="absolute bottom-full right-0 mb-2 w-[700px] h-[600px] max-w-[90vw] bg-[#0B0E14] border-2 border-indigo-500 rounded-xl shadow-2xl overflow-hidden z-[120] animate-in fade-in zoom-in flex flex-col origin-bottom-right">
                              <div className="bg-indigo-600 text-white text-[11px] px-3 py-1.5 flex justify-between">
                                <span>트래픽 절감 미리보기</span>
                              </div>
                              <iframe
                                src={issue.original_url}
                                className="w-full flex-1 bg-white"
                                sandbox="allow-same-origin allow-scripts allow-popups"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredIssues.length === 0 && (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-400 text-sm">해당하는 이슈가 없습니다. 검색어나 카테고리를 변경해 보세요.</p>
                </div>
              )}
            </div>
          </section>

          {/* 🚀 Fix 3-2: 우측 사이드바 10개 나열 및 상하 간격 70% 축소 */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="bg-[#131824] border border-slate-800 rounded-2xl p-4 sticky top-24">

              <h3 className="text-sm font-extrabold text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> 방금 올라온 {selectedCategory} 핫이슈
              </h3>

              <div className="space-y-0.5 mb-4">
                {filteredIssues.slice(0, 10).map((item) => (
                  <a
                    key={`latest-${item.id}`}
                    href={item.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-slate-800/50 transition"
                  >
                    <span className="text-indigo-400 text-[11px] font-bold w-14 shrink-0 truncate">{item.source_site}</span>
                    <p className="text-[13px] text-slate-200 truncate flex-1 leading-tight">{item.title}</p>
                  </a>
                ))}
              </div>

              <h3 className="text-sm font-extrabold text-white mb-2 flex items-center justify-between border-t border-slate-800/60 pt-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" /> {selectedCategory} 화력 Top 10
                </div>
                <span className="text-[9px] text-slate-500 font-medium px-2 py-0.5 bg-slate-900 rounded-full">
                  {new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date())}
                </span>
              </h3>

              <div className="space-y-0.5">
                {[...filteredIssues].sort((a, b) => b.views - a.views).slice(0, 10).map((item, idx) => (
                  <a
                    key={`top-${item.id}`}
                    href={item.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-slate-800/50 transition"
                  >
                    <span className="text-rose-400 text-xs font-bold w-4 text-center">{idx + 1}</span>
                    <span className="text-slate-500 text-[10px] font-bold w-12 shrink-0 truncate">{item.source_site}</span>
                    <p className="text-[13px] text-slate-200 truncate flex-1 leading-tight">{item.title}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">{(item.views / 1000).toFixed(1)}k</span>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </main>

        <aside className="hidden 3xl:flex w-[220px] shrink-0 flex-col gap-4 py-6 pr-4 sticky top-[120px] h-[calc(100vh-120px)]">
          <div className="w-full h-full bg-[#131824]/50 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-bold text-slate-400">우측 배너 광고 영역</span>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-[60px] bg-[#131824] border-t border-slate-800 z-50 flex items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="w-[320px] sm:w-[468px] md:w-[728px] xl:w-[970px] h-[50px] bg-slate-900 border border-slate-700/50 rounded flex items-center justify-center text-slate-400 text-xs font-bold transition-all duration-300">
          하단 고정 반응형 배너 광고 (AdSense / CPA)
        </div>
      </div>
    </div>
  );
}