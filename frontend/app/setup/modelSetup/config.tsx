"use client"

import { useState, useEffect, useRef } from "react"
import { Typography, Row, Col } from "antd"
import { AppConfigSection } from './appConfig'
import { ModelConfigSection, ModelConfigSectionRef } from './modelConfig'

const { Title } = Typography

// 添加布局高度常量配置
const LAYOUT_CONFIG = {
  MAIN_CONTENT_HEIGHT: "67.2vh",
}

// 添加接口定义
interface AppModelConfigProps {
  skipModelVerification?: boolean;
}

export default function AppModelConfig({ skipModelVerification = false }: AppModelConfigProps) {
  const [isClientSide, setIsClientSide] = useState(false)
  const modelConfigRef = useRef<ModelConfigSectionRef | null>(null)

  // 添加useEffect钩子用于初始化加载配置
  useEffect(() => {
    setIsClientSide(true)
    
    return () => {
      setIsClientSide(false)
    }
  }, [skipModelVerification])

  return (
    <div className="w-full mx-auto px-4" style={{ maxWidth: "1920px" }}>
      {isClientSide ? (
        <div className="w-full">
          <Row gutter={[24, 16]}>
            <Col xs={24} md={24} lg={10} xl={9} xxl={8}>
              <div className="bg-white border border-gray-200 rounded-md flex flex-col overflow-hidden p-4">
                <div className="mb-4 px-2">
                  <Title level={4}>应用设置</Title>
                  <div className="h-[1px] bg-gray-200 mt-2"></div>
                </div>
                <div style={{ 
                  height: LAYOUT_CONFIG.MAIN_CONTENT_HEIGHT, 
                  overflowY: "auto",
                  overflowX: "hidden"
                }}>
                  <AppConfigSection />
                </div>
              </div>
            </Col>
            
            <Col xs={24} md={24} lg={14} xl={15} xxl={16}>
              <div className="bg-white border border-gray-200 rounded-md flex flex-col overflow-hidden p-4">
                <div className="mb-4 px-2">
                  <Title level={4}>模型设置</Title>
                  <div className="h-[1px] bg-gray-200 mt-2"></div>
                </div>
                <div style={{ 
                  height: LAYOUT_CONFIG.MAIN_CONTENT_HEIGHT, 
                  background: "#fff", 
                  overflowY: "auto",
                  overflowX: "hidden"
                }}>
                  <ModelConfigSection ref={modelConfigRef as any} skipVerification={skipModelVerification} />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="h-[300px] flex items-center justify-center">
            <span>加载中...</span>
          </div>
        </div>
      )}
    </div>
  )
}