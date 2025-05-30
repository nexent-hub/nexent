"use client"

import { useState, useEffect } from 'react'
import { message, Typography } from 'antd'
import SystemPromptDisplay from './components/SystemPromptDisplay'
import { Agent, Tool } from './ConstInterface'

const { Text } = Typography

// 主组件Props接口
interface SystemPromptConfigProps {
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  isGenerating: boolean;
  onDebug?: () => void;
  onGenerate?: () => void;
  agentId?: number;
  taskDescription?: string;
  selectedAgents?: Agent[];
  selectedTools?: Tool[];
  onLocalIsGeneratingChange?: (value: boolean) => void;
}

/**
 * System prompt configuration main component
 */
export default function SystemPromptConfig({
  systemPrompt,
  setSystemPrompt,
  isGenerating,
  onDebug,
  agentId,
  taskDescription,
  selectedAgents = [],
  selectedTools = [],
  onLocalIsGeneratingChange
}: SystemPromptConfigProps) {
  const [localIsGenerating, setLocalIsGenerating] = useState(false);

  useEffect(() => {
    if (onLocalIsGeneratingChange) {
      onLocalIsGeneratingChange(localIsGenerating);
    }
  }, [localIsGenerating, onLocalIsGeneratingChange]);

  return (
    <div className="flex flex-col h-full gap-4 pl-4">
      <div className="flex-grow overflow-hidden">
        <div className="h-full">
          <SystemPromptDisplay 
            prompt={systemPrompt} 
            isGenerating={isGenerating} 
            onPromptChange={setSystemPrompt}
            onDebug={onDebug}
            agentId={agentId}
            taskDescription={taskDescription}
            selectedAgents={selectedAgents}
            selectedTools={selectedTools}
            onLocalIsGeneratingChange={setLocalIsGenerating}
          />
        </div>
      </div>
    </div>
  )
} 