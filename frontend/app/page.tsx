"use client"

import { useState, useEffect } from "react"
import { Bot, Globe, Database, Zap, Mic, FileSearch, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Top navigation bar */}
      <header className="w-full py-4 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm fixed top-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-start">
            <img src="/modelengine-logo2.png" alt="ModelEngine" className="h-6" />
            <span className="text-blue-600 dark:text-blue-500 ml-2">Nexent 智能体</span>
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            ModelEngine
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            关于我们
          </Link>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-24 pb-16">
        {/* Hero area */}
        <section className="relative w-full py-16 flex flex-col items-center justify-center text-center px-4">
          <div className="absolute inset-0 bg-grid-slate-200 dark:bg-grid-slate-800 [mask-image:radial-gradient(ellipse_at_center,white_20%,transparent_75%)] -z-10"></div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
          Nexent 智能体<span className="text-blue-600 dark:text-blue-500"> 一个提示词，无限种可能</span>
          </h2>
          <p className="max-w-2xl text-slate-600 dark:text-slate-300 text-lg md:text-xl mb-8">
          无需编排，无需复杂拖拉拽，将数据、模型和工具整合到一个智能中心中。
          </p>

          {/* Two parallel buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/chat">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Bot className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                开始问答
              </Button>
            </Link>
            <Link href="/setup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 group">
                <Zap className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                快速配置
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Shield className="h-4 w-4" />
            <span>安全可靠的企业级数据保护</span>
          </div>
        </section>

        {/* Feature cards */}
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Bot className="h-8 w-8 text-blue-500" />}
              title="智能自主规划"
              description="智能体自动业务判断，根据问题类型智能路由至最佳解决方案"
            />
             <FeatureCard
              icon={<Zap className="h-8 w-8 text-blue-500" />}
              title="高效数据准备"
              description="高效处理大规模数据，快速构建和更新企业专属知识库"
            />
            <FeatureCard
              icon={<Database className="h-8 w-8 text-emerald-500" />}
              title="企业知识库搜索"
              description="深度整合企业内部知识资源，实现精准的内部信息检索"
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8 text-amber-500" />}
              title="互联网搜索"
              description="实时接入互联网数据，提供最新、最全面的信息检索服务"
            />
            <FeatureCard
              icon={<FileSearch className="h-8 w-8 text-rose-500" />}
              title="知识溯源"
              description="提供完整的信息来源追溯，确保回答的可靠性和可验证性"
            />
            <FeatureCard
              icon={<Mic className="h-8 w-8 text-purple-500" />}
              title="语音对话"
              description="支持语音输入和语音播报，提供自然流畅的人机交互体验"
            />
          </div>
        </section>

        {/* Statistics data */}
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">极致体验</h3>
        <section className="bg-slate-50 dark:bg-slate-800/50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
              <StatCard number="98.5%" label="问答准确率" />
              <StatCard number="100MB / 秒" label="数据处理速度" />
              <StatCard number="3秒内" label="平均响应时间" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Nexent 智能体 © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                隐私政策
              </Link>
              <Link
                href="#"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                使用条款
              </Link>
              <Link
                href="#"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                联系我们
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 group">
      <CardContent className="p-6">
        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-fit group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
          {icon}
        </div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h4>
        <p className="text-slate-600 dark:text-slate-300">{description}</p>
      </CardContent>
    </Card>
  )
}

// Statistic card component
interface StatCardProps {
  number: string;
  label: string;
}

function StatCard({ number, label }: StatCardProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">{number}</span>
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  )
}