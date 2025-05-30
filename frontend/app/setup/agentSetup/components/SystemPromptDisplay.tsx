"use client"

import { Input, Button, Modal, Spin, message } from 'antd'
import { useState, useRef, useEffect } from 'react'
import AdditionalRequestInput from './AdditionalRequestInput'
import { MarkdownRenderer } from '@/components/ui/markdownRenderer'
import { ScrollArea } from '@/components/ui/scrollArea'
import { Agent, Tool } from '../ConstInterface'
import { generatePrompt, fineTunePrompt, savePrompt } from '@/services/promptService'

const { TextArea } = Input

// System prompt display component Props interface
export interface SystemPromptDisplayProps {
  prompt: string;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onDebug?: () => void;
  agentId?: number;
  taskDescription?: string;
  selectedAgents?: Agent[];
  selectedTools?: Tool[];
  onLocalIsGeneratingChange?: (value: boolean) => void;
}

/**
 * System Prompt Display Component
 */
export default function SystemPromptDisplay({ 
  prompt, 
  isGenerating, 
  onPromptChange, 
  onDebug, 
  agentId, 
  taskDescription,
  selectedAgents = [],
  selectedTools = [],
  onLocalIsGeneratingChange
}: SystemPromptDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [tunedPrompt, setTunedPrompt] = useState("")
  const [isTuning, setIsTuning] = useState(false)
  const [isEditingTuned, setIsEditingTuned] = useState(false)
  const [localIsGenerating, setLocalIsGenerating] = useState(false)
  const originalPromptRef = useRef(prompt)

  // Use API to generate system prompt
  const handleGenerateWithApi = async () => {
    if (!taskDescription || taskDescription.trim() === '') {
      message.warning("请先输入业务描述");
      return;
    }
    
    if (!agentId) {
      message.warning("无法生成提示词：未指定Agent ID");
      return;
    }
    
    try {
      setLocalIsGenerating(true);
      onLocalIsGeneratingChange?.(true);
      console.log("开始调用API生成提示词", { agent_id: agentId, task_description: taskDescription });
      
      const result = await generatePrompt({
        agent_id: agentId,
        task_description: taskDescription
      });
      
      console.log("API返回结果", result);
      
      onPromptChange(result);
      message.success("提示词生成成功");
    } catch (error) {
      console.error("生成提示词失败:", error);
      message.error(`生成提示词失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLocalIsGenerating(false);
      onLocalIsGeneratingChange?.(false);
    }
  };
  
  // Handle generate button click
  const handleGenerate = async () => {
    // Only use API call method
    await handleGenerateWithApi();
  };

  // Handle fine-tuning request
  const handleSendAdditionalRequest = async (request: string) => {
    if (!prompt) {
      message.warning("请先生成系统提示词");
      return;
    }
    
    if (!request || request.trim() === '') {
      message.warning("请输入微调指令");
      return;
    }

    setIsTuning(true);
    
    try {
      // Use service for fine-tuning
      const result = await fineTunePrompt({
        agent_id: agentId!,
        system_prompt: prompt,
        command: request
      });
      
      setTunedPrompt(result);
      message.success("提示词微调成功");
    } catch (error) {
      console.error("微调提示词失败:", error);
      message.error(`微调提示词失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsTuning(false);
    }
  };
  
  const handleSaveTunedPrompt = async () => {
    try {
      if (!agentId) {
        message.warning("无法保存提示词：未指定Agent ID");
        return;
      }
      // Call save interface
      await savePrompt({
        agent_id: agentId,
        prompt: tunedPrompt
      });
      onPromptChange(tunedPrompt);
      setIsModalOpen(false);
      setTunedPrompt("");
      message.success("已保存微调后的提示词");
    } catch (error) {
      console.error("保存提示词失败:", error);
      message.error("保存提示词失败，请重试");
    }
  };

  // Handle prompt edit complete
  const handlePromptEditComplete = async (newPrompt: string) => {
    setIsEditMode(false);
    // Check if the prompt has changed
    if (newPrompt !== originalPromptRef.current) {
      try {
        if (!agentId) {
          message.warning("无法保存提示词：未指定Agent ID");
          return;
        }
        // Call save interface
        await savePrompt({
          agent_id: agentId,
          prompt: newPrompt
        });
        message.success("提示词已自动保存");
        originalPromptRef.current = newPrompt; // Update the original prompt reference
      } catch (error) {
        console.error("保存提示词失败:", error);
        message.error("保存提示词失败，请重试");
      }
    }
  };

  // Handle start editing
  const handleStartEditing = () => {
    originalPromptRef.current = prompt; // Record the prompt when editing starts
    setIsEditMode(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">系统提示词</h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || localIsGenerating}
            className="px-4 py-1.5 rounded-md flex items-center text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: "none" }}
          >
            {(isGenerating || localIsGenerating) ? "生成中..." : "生成"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-1.5 rounded-md flex items-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            style={{ border: "none" }}
          >
            微调
          </button>
          <button
            onClick={onDebug}
            className="px-4 py-1.5 rounded-md flex items-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            style={{ border: "none" }}
          >
            调试
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-hidden border border-gray-200 rounded-md">
        {isEditMode ? (
          <TextArea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={isGenerating || localIsGenerating ? "正在生成系统提示词..." : "系统提示词将在这里显示..."}
            className="w-full h-full resize-none border-none"
            style={{ height: '100%', minHeight: '100%' }}
            autoFocus
            onBlur={() => handlePromptEditComplete(prompt)}
          />
        ) : (
          <div 
            className="w-full h-full cursor-text"
            onDoubleClick={handleStartEditing}
            title="双击编辑"
          >
            <ScrollArea className="h-full">
              <div className="p-3 markdown-content" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                {prompt ? (
                  <MarkdownRenderer content={prompt} />
                ) : (
                  <div className="text-gray-400 italic">
                    {isGenerating || localIsGenerating ? "正在生成系统提示词..." : "系统提示词将在这里显示..."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      <Modal
        title="提示词微调"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false)
          setTunedPrompt("")
        }}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <div className="flex flex-col">
          <AdditionalRequestInput 
            onSend={handleSendAdditionalRequest} 
            isTuning={isTuning}
          />
          
          {isTuning && (
            <div className="mt-4 flex justify-center">
              <Spin tip="正在生成微调后的提示词..." />
            </div>
          )}
          
          {tunedPrompt && !isTuning && (
            <div className="mt-4">
              <div className="font-medium text-gray-700 mb-2">微调后的提示词:</div>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                {isEditingTuned ? (
                  <TextArea
                    value={tunedPrompt}
                    onChange={(e) => setTunedPrompt(e.target.value)}
                    className="w-full resize-none border-none"
                    style={{ minHeight: '200px' }}
                    autoFocus
                    onBlur={() => setIsEditingTuned(false)}
                  />
                ) : (
                  <div style={{ height: '400px' }}>
                    <ScrollArea className="h-full">
                      <div 
                        className="p-3 cursor-text markdown-content"
                        onDoubleClick={() => setIsEditingTuned(true)}
                        title="双击编辑"
                        style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                      >
                        <MarkdownRenderer content={tunedPrompt} />
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveTunedPrompt}
                  className="px-4 py-1.5 rounded-md flex items-center text-sm bg-blue-500 text-white hover:bg-blue-600"
                  style={{ border: "none" }}
                >
                  保存到配置
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
} 