"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { message } from "antd"
import AppModelConfig from "./modelSetup/config"
import DataConfig from "./knowledgeBaseSetup/KnowledgeBaseManager"
import { configStore } from "@/lib/config"
import { configService } from "@/services/configService"
import knowledgeBaseService from "@/services/knowledgeBaseService"
import modelEngineService, { ConnectionStatus } from "@/services/modelEngineService"
import Layout from "./layout"

export default function CreatePage() {
  const [selectedKey, setSelectedKey] = useState("1")
  const router = useRouter()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("processing")
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [isFromSecondPage, setIsFromSecondPage] = useState(false)

  // 初始化时检查连接状态
  useEffect(() => {
    // 检查连接状态
    checkModelEngineConnection()
    
    // 只在页面初始化时触发一次知识库数据获取
    window.dispatchEvent(new CustomEvent('knowledgeBaseDataUpdated', {
      detail: { forceRefresh: true }
    }))

    // 检查是否需要显示知识库配置选项卡
    const showKbConfig = localStorage.getItem('show_kb_config')
    if (showKbConfig === 'true') {
      // 切换到知识库配置选项卡
      setSelectedKey("2")
      // 清除标志，避免下次访问页面时自动切换
      localStorage.removeItem('show_kb_config')
    }
  }, [])

  // 监听selectedKey变化，在切换页面时进行相应操作
  useEffect(() => {
    if (selectedKey === "2") {
      // 进入第二页时，重置标志
      setIsFromSecondPage(false)
      // 进入第二页时，获取最新知识库数据
      window.dispatchEvent(new CustomEvent('knowledgeBaseDataUpdated', {
        detail: { forceRefresh: true }
      }))
      // 进入第二页时检查连接状态
      checkModelEngineConnection()
    } else if (selectedKey === "1") {
      // 进入第一页时检查连接状态
      checkModelEngineConnection()
    }
  }, [selectedKey])

  // 检查ModelEngine连接状态的函数
  const checkModelEngineConnection = async () => {
    setIsCheckingConnection(true)

    try {
      const result = await modelEngineService.checkConnection()
      setConnectionStatus(result.status)
      setLastChecked(result.lastChecked)
    } catch (error) {
      console.error("检查连接状态失败:", error)
      setConnectionStatus("error")
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const renderContent = () => {
    switch (selectedKey) {
      case "1":
        return <AppModelConfig skipModelVerification={isFromSecondPage} />
      case "2":
        return <DataConfig />
      default:
        return null
    }
  }

  // 处理完成配置
  const handleCompleteConfig = async () => {
    if (selectedKey === "2") {
      setIsSavingConfig(true)
      try {
        // 获取当前全局配置
        const currentConfig = configStore.getConfig()
        
        // 调用后端保存配置API
        const saveResult = await configService.saveConfigToBackend(currentConfig)
        
        if (saveResult) {
          message.success("配置已保存")
          // 保存成功后跳转到聊天页面
          router.push("/chat")
        } else {
          message.error("保存配置失败，请重试")
        }
      } catch (error) {
        console.error("保存配置异常:", error)
        message.error("系统异常，请稍后重试")
      } finally {
        setIsSavingConfig(false)
      }
    } else if (selectedKey === "1") {
      // 从第一页跳转到第二页时验证必填项
      try {
        // 获取当前配置
        const currentConfig = configStore.getConfig()
        
        // 检查应用名称
        if (!currentConfig.app.appName.trim()) {
          message.error("请填写应用名称")
          
          // 触发自定义事件，通知AppConfigSection将应用名称输入框标记为错误
          window.dispatchEvent(new CustomEvent('highlightMissingField', {
            detail: { field: 'appName' }
          }))
          
          return // 中断跳转
        }
        
        // 检查主模型
        if (!currentConfig.models.llm.modelName) {
          message.error("请选择主模型")
          
          // 触发自定义事件，通知ModelConfigSection将主模型下拉框标记为错误
          window.dispatchEvent(new CustomEvent('highlightMissingField', {
            detail: { field: 'llm.main' }
          }))
          
          return // 中断跳转
        }
        
        // 所有必填项都已填写，允许跳转到第二页
        setSelectedKey("2")

        // 调用后端保存配置API
        await configService.saveConfigToBackend(currentConfig)
      } catch (error) {
        console.error("验证配置异常:", error)
        message.error("系统异常，请稍后重试")
      }
    }
  }

  // 处理用户切换到第一页的逻辑
  const handleBackToFirstPage = () => {
    if (selectedKey === "2") {
      setSelectedKey("1")
      // 设置标志，表示用户是从第二页返回第一页
      setIsFromSecondPage(true)
    }
  }

  return (
    <Layout
      connectionStatus={connectionStatus}
      lastChecked={lastChecked}
      isCheckingConnection={isCheckingConnection}
      onCheckConnection={checkModelEngineConnection}
      selectedKey={selectedKey}
      onBackToFirstPage={handleBackToFirstPage}
      onCompleteConfig={handleCompleteConfig}
      isSavingConfig={isSavingConfig}
    >
      {renderContent()}
    </Layout>
  )
}