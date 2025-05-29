"use client"

import { ReactNode } from "react"
import { FiRefreshCw, FiArrowLeft } from "react-icons/fi"
import { Badge, Button, Tooltip } from "antd"
import { useRouter } from "next/navigation"
import { BugOutlined } from '@ant-design/icons'

// ================ Header 组件 ================
interface HeaderProps {
  connectionStatus: "success" | "error" | "processing";
  lastChecked: string | null;
  isCheckingConnection: boolean;
  onCheckConnection: () => void;
}

function Header({
  connectionStatus,
  lastChecked,
  isCheckingConnection,
  onCheckConnection
}: HeaderProps) {
  const router = useRouter()

  // 获取状态文本
  const getStatusText = () => {
    switch (connectionStatus) {
      case "success":
        return "ModelEngine 已连接"
      case "error":
        return "ModelEngine 未连接"
      case "processing":
        return "检查中"
      default:
        return "未知状态"
    }
  }

  // 重构：风格被嵌入在组件内
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-[1800px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/")}
              className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="返回首页"
            >
              <FiArrowLeft className="text-gray-600 text-xl" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">快速配置</h1>
            <div className="mx-2 h-6 border-l border-gray-300"></div>
            <span className="text-gray-500 text-sm">精准解答每一个问题，高效支撑每一次决策</span>
          </div>
          <div className="flex items-center">
            {/* ModelEngine连通性状态 */}
            <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <Badge 
                status={connectionStatus} 
                text={getStatusText()} 
                className="[&>.ant-badge-status-dot]:w-[8px] [&>.ant-badge-status-dot]:h-[8px] [&>.ant-badge-status-text]:text-base [&>.ant-badge-status-text]:ml-2 [&>.ant-badge-status-text]:font-medium"
              />
              <Tooltip title={lastChecked ? `上次检查: ${lastChecked}` : "点击检查连接状态"}>
                <Button
                  icon={<FiRefreshCw className={isCheckingConnection ? "animate-spin" : ""} />}
                  size="small"
                  type="text"
                  onClick={onCheckConnection}
                  disabled={isCheckingConnection}
                  className="ml-2"
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// ================ Navigation 组件 ================
interface NavigationProps {
  selectedKey: string;
  onBackToFirstPage: () => void;
  onCompleteConfig: () => void;
  isSavingConfig: boolean;
  showDebugButton?: boolean;
}

function Navigation({
  selectedKey,
  onBackToFirstPage,
  onCompleteConfig,
  isSavingConfig,
  showDebugButton = false,
}: NavigationProps) {
  return (
    <div className="mt-3 flex justify-between px-6">
      <div className="flex gap-2">
        {selectedKey !== "1" && (
          <button
            onClick={onBackToFirstPage}
            className={"px-6 py-2.5 rounded-md flex items-center text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"}
          >
            上一步
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCompleteConfig}
          disabled={isSavingConfig}
          className={"px-6 py-2.5 rounded-md flex items-center text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"}
          style={{ border: "none" }}
        >
          {selectedKey === "3" ? (isSavingConfig ? "保存中..." : "完成配置") : "下一步"}
        </button>
      </div>
    </div>
  )
}

// ================ Layout 组件 ================
interface LayoutProps {
  children: ReactNode;
  connectionStatus: "success" | "error" | "processing";
  lastChecked: string | null;
  isCheckingConnection: boolean;
  onCheckConnection: () => void;
  selectedKey: string;
  onBackToFirstPage: () => void;
  onCompleteConfig: () => void;
  isSavingConfig: boolean;
  showDebugButton?: boolean;
}

function Layout({
  children,
  connectionStatus,
  lastChecked,
  isCheckingConnection,
  onCheckConnection,
  selectedKey,
  onBackToFirstPage,
  onCompleteConfig,
  isSavingConfig,
  showDebugButton = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header
        connectionStatus={connectionStatus}
        lastChecked={lastChecked}
        isCheckingConnection={isCheckingConnection}
        onCheckConnection={onCheckConnection}
      />

      {/* Main content */}
      <div className="max-w-[1800px] mx-auto px-8 pb-4 mt-6">
        <div className="bg-white p-5 rounded-lg shadow-md">
          {children}

          <Navigation
            selectedKey={selectedKey}
            onBackToFirstPage={onBackToFirstPage}
            onCompleteConfig={onCompleteConfig}
            isSavingConfig={isSavingConfig}
            showDebugButton={showDebugButton}
          />
        </div>
      </div>
    </div>
  )
}

export { Header, Navigation, Layout }
export default Layout 