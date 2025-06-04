"use strict";
import { Select, Tooltip, Tag } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { ModelConnectStatus, ModelOption, ModelSource, ModelType } from '@/types/config'
import { useEffect, useState, useRef } from 'react'

// 重构：风格被嵌入在组件内
const pulsingAnimation = `
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(41, 128, 185, 0.7);
    }
    
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 5px rgba(41, 128, 185, 0);
    }
    
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(41, 128, 185, 0);
    }
  }
`;

const getStatusStyle = (status?: ModelConnectStatus): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    width: '12px',  // 扩大尺寸
    height: '12px', // 扩大尺寸
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '4px',
    cursor: 'pointer', // 添加指针样式表明可点击
    transition: 'all 0.2s ease', // 添加过渡效果
    position: 'relative', // 用于伪元素定位
  };
  
  if (status === "检测中") {
    return {
      ...baseStyle,
      backgroundColor: '#2980b9',
      boxShadow: '0 0 3px #2980b9',
      animation: 'pulse 1.5s infinite'
    };
  }
  
  return baseStyle;
};

const { Option } = Select


interface ModelListCardProps {
  type: ModelType
  modelId: string
  modelName: string
  selectedModel: string
  onModelChange: (value: string) => void
  officialModels: ModelOption[]
  customModels: ModelOption[]
  onVerifyModel?: (modelName: string, modelType: ModelType) => void // 新增验证模型的回调
  errorFields?: {[key: string]: boolean} // 新增错误字段状态
}

// 获取模型来源对应的标签样式
const getSourceTagStyle = (source: string): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    marginRight: '4px',
    fontSize: '12px',
    lineHeight: '16px',
    padding: '0 6px',
    borderRadius: '10px',
  };
  
  if (source === "ModelEngine") {
    return {
      ...baseStyle,
      color: '#1890ff',
      backgroundColor: '#e6f7ff',
      borderColor: '#91d5ff',
    };
  } else if (source === "自定义") {
    return {
      ...baseStyle,
      color: '#722ed1',
      backgroundColor: '#f9f0ff',
      borderColor: '#d3adf7',
    };
  } else {
    return {
      ...baseStyle,
      color: '#595959',
      backgroundColor: '#fafafa',
      borderColor: '#d9d9d9',
    };
  }
};

export const ModelListCard = ({
  type,
  modelId,
  modelName,
  selectedModel,
  onModelChange,
  officialModels,
  customModels,
  onVerifyModel,
  errorFields
}: ModelListCardProps) => {
  // 添加模型列表状态，用于更新
  const [modelsData, setModelsData] = useState({
    official: [...officialModels],
    custom: [...customModels]
  });

  // 组件唯一ID，用于注册表
  const instanceIdRef = useRef(`${type}-${modelId}-${Math.random().toString(36).substring(2, 9)}`);

  // 在组件中创建一个style元素，包含动画定义
  useEffect(() => {
    // 创建style元素
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = pulsingAnimation;
    document.head.appendChild(styleElement);

    // 清理函数，组件卸载时移除style元素
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 获取模型列表时需要考虑具体的选项类型
  const getModelsBySource = (): Record<ModelSource, ModelOption[]> => {
    // 每种类型只显示对应类型的模型
    return {
      official: modelsData.official.filter(model => model.type === type),
      custom: modelsData.custom.filter(model => model.type === type)
    }
  }

  // 获取模型来源
  const getModelSource = (modelName: string): string => {
    if (type === 'tts' || type === 'stt' || type === 'vlm') {
      const modelOfType = modelsData.custom.find((m) => m.type === type && m.name === modelName)
      if (modelOfType) return "自定义"
    }

    const officialModel = modelsData.official.find((m) => m.type === type && m.name === modelName)
    if (officialModel) return "ModelEngine"

    const customModel = modelsData.custom.find((m) => m.type === type && (m.name === modelName || m.displayName === modelName))
    return customModel ? "自定义" : "未知来源"
  }

  // 获取连接状态指示器的颜色
  const getConnectStatusColor = (status?: ModelConnectStatus): string => {
    if (!status) return "#17202a";
    
    switch (status) {
      case "可用":
        return "#52c41a";
      case "不可用":
        return "#ff4d4f";
      case "检测中":
        return "#2980b9";
      case "未检测":
      default:
        return "#95a5a6";
    }
  }

  const modelsBySource = getModelsBySource()

  // 处理模型变更，需要清除连接状态样式
  const handleModelChange = (value: string) => {
    onModelChange(value)
  }

  // 本地更新模型状态
  const updateLocalModelStatus = (modelName: string, status: ModelConnectStatus) => {
    setModelsData(prevData => {
      // 查找要更新的模型
      const modelToUpdate = prevData.custom.find(m => m.name === modelName && m.type === type);
      
      if (!modelToUpdate) {
        console.warn(`未找到要更新的模型: ${modelName}, 类型: ${type}`);
        return prevData;
      }
      
      const updatedCustomModels = prevData.custom.map(model => {
        if (model.name === modelName && model.type === type) {
          return {
            ...model,
            connect_status: status
          };
        }
        return model;
      });
      
      return {
        official: prevData.official,
        custom: updatedCustomModels
      };
    });
  };

  // 当父组件传入的模型列表更新时，更新本地状态
  useEffect(() => {
    // 更新本地状态，但不触发fetchModelsStatus
    setModelsData(prevData => {
      const updatedOfficialModels = officialModels.map(model => {
        // 保留已有的connect_status，如果存在的话
        const existingModel = prevData.official.find(m => m.name === model.name && m.type === model.type);
        return {
          ...model,
          connect_status: existingModel?.connect_status || "可用" as ModelConnectStatus
        };
      });
      
      const updatedCustomModels = customModels.map(model => {
        // 优先使用新传入的状态，这样能反映后端的最新状态
        return {
          ...model,
          connect_status: model.connect_status || "未检测" as ModelConnectStatus
        };
      });
      
      return {
        official: updatedOfficialModels,
        custom: updatedCustomModels
      };
    });
  }, [officialModels, customModels, type, modelId]);

  // 处理状态指示灯点击事件
  const handleStatusClick = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation(); // 阻止事件冒泡
    e.preventDefault(); // 阻止默认行为
    e.nativeEvent.stopImmediatePropagation(); // 阻止所有同级事件处理程序
    
    if (onVerifyModel && modelName) {
      // 先更新本地状态为"检测中"
      updateLocalModelStatus(modelName, "检测中");
      // 然后调用验证函数
      onVerifyModel(modelName, type);
    }
    
    return false; // 确保不会继续冒泡
  };

  // 动态hover效果的样式
  const getHoverStyle = {
    transform: 'scale(1.2)', // hover时放大效果
    boxShadow: '0 0 5px currentColor', // 增加阴影效果
  };

  return (
    <div>
      <div className="font-medium mb-1.5 flex items-center justify-between">
        <div className="flex items-center">
          {modelName}
          {(modelName === "主模型") && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </div>
        {selectedModel && (
          <div className="flex items-center">
            <Tag style={getSourceTagStyle(getModelSource(selectedModel))}>
              {getModelSource(selectedModel)}
            </Tag>
          </div>
        )}
      </div>
      <Select
        style={{ 
          width: "100%",
        }}
        placeholder="选择模型"
        value={selectedModel || undefined}
        onChange={handleModelChange}
        allowClear={{ 
          clearIcon: <CloseOutlined />,
        }}
        onClear={() => handleModelChange("")}
        size="middle"
        onClick={(e) => e.stopPropagation()}
        getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
        status={errorFields && errorFields[`${type}.${modelId}`] ? "error" : ""}
        className={errorFields && errorFields[`${type}.${modelId}`] ? "error-select" : ""}
      >
        {modelsBySource.official.length > 0 && (
          <Select.OptGroup label="ModelEngine模型">
            {modelsBySource.official.map((model) => (
              <Option key={`${type}-${model.name}-official`} value={model.name}>
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate" title={model.name}>
                    {model.displayName || model.name}
                  </div>
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}
        {modelsBySource.custom.length > 0 && (
          <Select.OptGroup label="自定义模型">
            {modelsBySource.custom.map((model) => (
              <Option key={`${type}-${model.displayName || model.name}-custom`} value={model.name || model.displayName }>
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate" title={model.displayName || model.name}>
                    {model.displayName || model.name}
                  </div>
                  <Tooltip title="点击可验证连通性">
                    <span 
                      onClick={(e) => handleStatusClick(e, model.displayName || model.name)}
                      onMouseDown={(e: React.MouseEvent) => {
                        e.stopPropagation(); 
                        e.preventDefault();
                        if (onVerifyModel) {
                          updateLocalModelStatus(model.displayName || model.name, "检测中");
                          onVerifyModel(model.displayName || model.name, type);
                        }
                        return false;
                      }}
                      style={{ 
                        ...getStatusStyle(model.connect_status),
                        backgroundColor: model.connect_status === "检测中" 
                          ? "#2980b9" 
                          : getConnectStatusColor(model.connect_status),
                        boxShadow: model.connect_status === "检测中"
                          ? "0 0 3px #2980b9"
                          : `0 0 3px ${getConnectStatusColor(model.connect_status)}`
                      }}
                      className="status-indicator"
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        Object.assign(target.style, getHoverStyle);
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.transform = '';
                        target.style.boxShadow = model.connect_status === "检测中"
                          ? "0 0 3px #2980b9"
                          : `0 0 3px ${getConnectStatusColor(model.connect_status)}`;
                      }}
                    />
                  </Tooltip>
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        )}
      </Select>
    </div>
  )
} 