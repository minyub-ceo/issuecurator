// 🚀 [수정/확인] 최상단 tailwind.config.ts 파일
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // 💡 이 경로가 반드시 있어야 page.tsx에 디자인이 적용됩니다.
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;