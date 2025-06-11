"use client"

import { Steps } from 'antd'
import { useEffect } from 'react'

// Timeline Step Configuration
const GUIDE_STEPS = {
  normal: [
    {
      title: '选择Agent',
      description: '从Agent池中选择需要的Agent',
    },
    {
      title: '选择工具',
      description: '从工具池中选择需要的工具',
    },
    {
      title: '描述业务',
      description: '输入业务场景和需求描述',
    },
    {
      title: '生成提示词',
      description: '生成系统提示词并微调',
    },
    {
      title: '调试Agent（可选）',
      description: '输入问题调试主Agent',
    },
    {
      title: '完成配置',
      description: '点击完成配置开始问答',
    }
  ],
  creating: [
    {
      title: '选择工具',
      description: '从工具池中选择需要的工具',
    },
    {
      title: '描述业务',
      description: '输入业务场景和需求描述',
    },
    {
      title: '生成提示词',
      description: '生成系统提示词并微调',
    },
    {
      title: '调试Agent（可选）',
      description: '输入问题调试当前Agent',
    },
    {
      title: '保存Agent',
      description: '配置并保存到Agent池',
    },
  ]
};

interface GuideStepsProps {
  isCreatingNewAgent: boolean;
  systemPrompt: string;
  businessLogic: string;
  selectedTools: any[];
  selectedAgents: any[];
  mainAgentId: string | null;
  currentStep?: number;
}

export default function GuideSteps({
  isCreatingNewAgent,
  systemPrompt,
  businessLogic,
  selectedTools,
  selectedAgents,
  mainAgentId,
  currentStep,
}: GuideStepsProps) {
  // print mainAgentId in the console
  useEffect(() => {
    console.log('当前 mainAgentId:', mainAgentId);
  }, [mainAgentId]);

  // Get Current Step
  const getCurrentStep = () => {
    if (isCreatingNewAgent) {
      // New Agent creation mode step sequence
      if (systemPrompt) return 3;
      if (businessLogic) return 2;
      if (selectedTools.length > 0) return 1;
      return 0;
    } else {
      // Main Agent configuration mode step sequence
      if (systemPrompt) return 4;
      if (businessLogic) return 3;
      if (selectedTools.length > 0) return 2;
      if (selectedAgents.length > 0) return 1;
      return 0;
    }
  };

  // Use external currentStep if provided
  const step = typeof currentStep === 'number' ? currentStep : getCurrentStep();

  return (
    <div className="h-[65vh]">
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden">
        <h2 className="text-xl font-bold mb-4">{isCreatingNewAgent ? '新建Agent' : '主Agent配置'}</h2>
        <Steps
          direction="vertical"
          current={step}
          items={isCreatingNewAgent ? GUIDE_STEPS.creating : GUIDE_STEPS.normal}
          className="px-2 custom-guide-steps h-full"
        />
      </div>
      <style jsx global>{`
        .custom-guide-steps.ant-steps-vertical {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .custom-guide-steps .ant-steps-item {
          flex: 1;
          min-height: 0;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .custom-guide-steps .ant-steps-item-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100%;
        }
      `}</style>
    </div>
  );
} 