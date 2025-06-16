import { Modal, Button, message } from 'antd'
import { DeleteOutlined, ExclamationCircleFilled, RightOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { ModelOption, ModelType } from '@/types/config'
import { modelService } from '@/services/modelService'
import { useConfig } from '@/hooks/useConfig'

interface ModelDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  customModels: ModelOption[]
}

export const ModelDeleteDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  customModels 
}: ModelDeleteDialogProps) => {
  const { modelConfig, updateModelConfig } = useConfig()
  const [deletingModelType, setDeletingModelType] = useState<ModelType | null>(null)
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set())

  // 获取模型的颜色方案
  const getModelColorScheme = (type: ModelType): { bg: string; text: string; border: string } => {
    switch (type) {
      case "llm":
        return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" }
      case "embedding":
        return { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" }
      case "multi_embedding":
        return { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100" }
      case "rerank":
        return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" }
      case "vlm":
        return { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" }
      case "stt":
        return { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" }
      case "tts":
        return { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100" }
      default:
        return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-100" }
    }
  }

  // 获取模型的图标
  const getModelIcon = (type: ModelType) => {
    switch (type) {
      case "llm":
        return "🤖"
      case "embedding":
        return "🔢"
      case "multi_embedding":
        return "🖼️🔢"
      case "rerank":
        return "🔍"
      case "stt":
        return "🎤"
      case "tts":
        return "🔊"
      case "vlm":
        return "👁️"
      default:
        return "⚙️"
    }
  }

  // 获取模型的显示名称
  const getModelTypeName = (type: ModelType): string => {
    switch (type) {
      case "llm":
        return "大语言模型"
      case "embedding":
        return "文本向量模型"
      case "multi_embedding":
        return "多模态向量模型"
      case "rerank":
        return "重排模型"
      case "stt":
        return "语音识别模型"
      case "tts":
        return "语音合成模型"
      case "vlm":
        return "视觉语言模型"
      default:
        return "未知模型"
    }
  }

  // 处理删除模型
  const handleDeleteModel = async (displayName: string) => {
    setDeletingModels(prev => new Set(prev).add(displayName))
    try {
      await modelService.deleteCustomModel(displayName)
      let configUpdates: any = {}
      
      // 检查每个模型配置，如果当前使用的是被删除的模型，则清空配置
      if (modelConfig.llm.displayName === displayName) {
        configUpdates.llm = { modelName: "", displayName: "", apiConfig: { apiKey: "", modelUrl: "" } }
      }
      
      if (modelConfig.llmSecondary.displayName === displayName) {
        configUpdates.llmSecondary = { modelName: "", displayName: "", apiConfig: { apiKey: "", modelUrl: "" } }
      }
      
      if (modelConfig.embedding.displayName === displayName) {
        configUpdates.embedding = { modelName: "", displayName: "", apiConfig: { apiKey: "", modelUrl: "" } }
      }
      
      if (modelConfig.multiEmbedding.displayName === displayName) {
        configUpdates.multiEmbedding = { modelName: "", displayName: "", apiConfig: { apiKey: "", modelUrl: "" } }
      }
      
      if (modelConfig.rerank.displayName === displayName) {
        configUpdates.rerank = { modelName: "", displayName: "" }
      }
      
      if (modelConfig.vlm.displayName === displayName) {
        configUpdates.vlm = { modelName: "", displayName: "", apiConfig: { apiKey: "", modelUrl: "" } }
      }
      
      if (modelConfig.stt.displayName === displayName) {
        configUpdates.stt = { modelName: "", displayName: "" }
      }
      
      if (modelConfig.tts.displayName === displayName) {
        configUpdates.tts = { modelName: "", displayName: "" }
      }

      // 如果有配置需要更新，则更新localStorage
      if (Object.keys(configUpdates).length > 0) {
        updateModelConfig(configUpdates)
      }

      // 显示成功消息
      message.success(`删除模型成功: ${displayName}`)
      
      // 直接调用父组件的onSuccess回调刷新模型列表
      // 这会触发一次modelService.getCustomModels()调用，避免重复请求
      await onSuccess()
      
      // 如果当前没有模型了，则返回到模型类型选择界面
      // 使用从父组件传入的customModels来判断，不再单独获取
      const currentTypeModels = customModels.filter(model => 
        model.type === deletingModelType && model.displayName !== displayName
      )
      
      if (currentTypeModels.length === 0) {
        setDeletingModelType(null)
      }
    } catch (error) {
      console.error('删除模型失败:', error)
      message.error(`删除模型失败: ${displayName}`)
    } finally {
      setDeletingModels(prev => {
        const next = new Set(prev)
        next.delete(displayName)
        return next
      })
    }
  }

  // 处理关闭对话框
  const handleClose = () => {
    setDeletingModelType(null)
    onClose()
  }

  return (
    // 重构：风格被嵌入在组件内
    <Modal
      title="删除自定义模型"
      open={isOpen}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>,
      ]}
      width={520}
      destroyOnClose
    >
      {!deletingModelType ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">请选择要删除的模型类型：</p>

          <div className="grid grid-cols-1 gap-2">
            {(["llm", "embedding", "multi_embedding", "rerank", "vlm", "stt", "tts"] as ModelType[]).map((type) => {
              const customModelsByType = customModels.filter((model) => model.type === type)
              const colorScheme = getModelColorScheme(type)

              if (customModelsByType.length === 0) return null

              return (
                <button
                  key={type}
                  onClick={() => setDeletingModelType(type)}
                  disabled={type === "stt" || type === "tts"}
                  className={`p-3 flex justify-between rounded-md border transition-colors ${
                    type === "stt" || type === "tts"
                      ? `${colorScheme.border} bg-gray-100 cursor-not-allowed opacity-60`
                      : `${colorScheme.border} ${colorScheme.bg} hover:bg-opacity-80`
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${colorScheme.text}`}>
                      {getModelIcon(type)}
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="font-medium">{getModelTypeName(type)}</div>
                      <div className="text-xs text-gray-500">
                        {customModelsByType.length} 个自定义模型
                        {(type === "stt" || type === "tts") && " (暂不支持删除)"}
                      </div>
                    </div>
                  </div>
                  <RightOutlined className="h-5 w-5" />
                </button>
              )
            })}
          </div>

          {customModels.length === 0 && (
            <div className="text-center py-8 text-gray-500">没有可删除的自定义模型</div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <button
              onClick={() => setDeletingModelType(null)}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              返回
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-200">
            {customModels
              .filter((model) => model.type === deletingModelType)
              .map((model) => (
                <div key={model.name} className="p-2 flex justify-between items-center hover:bg-gray-50 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" title={model.name}>
                      {model.displayName || model.name} ({model.name})
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteModel(model.displayName || model.name)}
                    disabled={deletingModels.has(model.displayName || model.name) || model.type === "stt" || model.type === "tts"}
                    className={`p-1 ${
                      model.type === "stt" || model.type === "tts" 
                        ? "text-gray-400 cursor-not-allowed" 
                        : "text-red-500 hover:text-red-700"
                    }`}
                    title={model.type === "stt" || model.type === "tts" ? "暂不支持删除此类型模型" : "删除模型"}
                  >
                    {deletingModels.has(model.displayName || model.name) ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <DeleteOutlined className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}

            {customModels.filter((model) => model.type === deletingModelType).length === 0 && (
              <div className="p-4 text-center text-gray-500">
                没有可删除的{getModelTypeName(deletingModelType)}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md text-xs text-yellow-700">
            <div>
              <div className="flex items-center mb-1">
                <ExclamationCircleFilled className="text-md text-yellow-500 mr-3" />
                <p className="font-bold text-medium">注意</p>
              </div>
              <p className="mt-0.5 ml-6">
                删除模型操作不可恢复。如果删除当前正在使用的模型，相关配置将被重置。
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}