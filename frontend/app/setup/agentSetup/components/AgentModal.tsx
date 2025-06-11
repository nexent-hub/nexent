"use client"

import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Button, Switch, Modal, message, Select } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { ScrollArea } from '@/components/ui/scrollArea'
import ToolConfigModal from './ToolConfigModal'
import { AgentModalProps, Tool, OpenAIModel, Agent } from '../ConstInterface'
import { handleToolSelectCommon } from '../utils/toolUtils'
import { updateAgent, deleteAgent, exportAgent } from '@/services/agentConfigService'

const { Text } = Typography
const { TextArea } = Input

const modelOptions = [
  { label: '主模型', value: OpenAIModel.MainModel },
  { label: '副模型', value: OpenAIModel.SubModel },
];

// 添加变量命名规范的正则表达式
const VARIABLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// 添加验证函数
const validateName = (name: string): { isValid: boolean; message: string } => {
  if (!name.trim()) {
    return { isValid: false, message: '名称不能为空' };
  }
  if (!VARIABLE_NAME_REGEX.test(name)) {
    return { 
      isValid: false, 
      message: '名称只能包含字母、数字和下划线，且必须以字母或下划线开头' 
    };
  }
  return { isValid: true, message: '' };
};

const validateDescription = (description: string): { isValid: boolean; message: string } => {
  if (!description.trim()) {
    return { isValid: false, message: '描述不能为空' };
  }
  return { isValid: true, message: '' };
};

export default function AgentModal({ 
  isOpen, 
  onCancel, 
  onSave, 
  onRefresh,
  title, 
  agent, 
  selectedTools = [], 
  systemPrompt,
  readOnly = false,
  agentId
}: AgentModalProps) {
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [business_description, setBusinessDescription] = useState(agent?.business_description || "");
  const [model, setModel] = useState(agent?.model || OpenAIModel.MainModel);
  const [maxStep, setMaxStep] = useState(agent?.max_step || 5);
  const [provideSummary, setProvideSummary] = useState(agent?.provide_run_summary ?? true);
  const [prompt, setPrompt] = useState(agent?.prompt || systemPrompt || "");
  const [currentTools, setCurrentTools] = useState<Tool[]>([]);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool | null>(null);
  const [pendingToolSelection, setPendingToolSelection] = useState<{tool: Tool, isSelected: boolean} | null>(null);
  const [nameError, setNameError] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<string>('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (agent) {

        console.log('agent', agent);
        // 编辑模式：使用 agent 中的业务描述
        setName(agent.name);
        setDescription(agent.description);
        setBusinessDescription(agent.business_description || "");
        setModel(agent.model);
        setMaxStep(agent.max_step);
        setProvideSummary(agent.provide_run_summary);
        setPrompt(agent.prompt);

        // 直接使用 agent 中的工具配置
        const fetchToolConfigs = () => {
          setCurrentTools(agent.tools);
        };

        fetchToolConfigs();
      } else {
        // 创建模式：使用空业务描述
        setName("");
        setDescription("");
        setBusinessDescription("");
        setModel(OpenAIModel.MainModel);
        setMaxStep(5);
        setProvideSummary(true);
        setPrompt(systemPrompt || "");
        setCurrentTools(selectedTools.map(tool => ({
          ...tool,
          initParams: tool.initParams.map(param => ({
            ...param,
            value: param.value
          }))
        })));
      }
    }
  }, [isOpen, agent, systemPrompt, selectedTools, agentId]);

  // 添加一个计算属性来判断表单是否有效
  const isFormValid = useMemo(() => {
    const nameValidation = validateName(name);
    const descriptionValidation = validateDescription(description);
    return nameValidation.isValid && descriptionValidation.isValid;
  }, [name, description]);

  const handleSave = async () => {
    if (!agentId) {
      message.error('Agent ID 不存在');
      return;
    }

    if (!isFormValid) {
      return;
    }

    try {
      const result = await updateAgent(
        parseInt(agentId),
        name,
        description,
        model,
        maxStep,
        provideSummary,
        prompt,
        undefined, // enabled
        business_description
      );

      if (result.success) {
        message.success('保存成功');
        onSave(name, description, model, maxStep, provideSummary, prompt, business_description);
        onRefresh?.();
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存 Agent 失败:', error);
      message.error('保存失败，请稍后重试');
    }
  };

  const handleToolSelect = async (tool: Tool, isSelected: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { shouldProceed, params } = await handleToolSelectCommon(
      tool,
      isSelected,
      agentId,
      (tool, isSelected) => {
        setCurrentTools(prevTools => {
          if (isSelected) {
            return [...prevTools, tool];
          } else {
            return prevTools.filter(t => t.id !== tool.id);
          }
        });
      }
    );

    if (!shouldProceed && params) {
      // 确保使用从后端获取的参数值
      const updatedTool = {
        ...tool,
        initParams: tool.initParams.map(param => {
          // 如果后端返回了参数值，优先使用后端值
          // 如果后端没有返回该参数值，则使用默认值
          const paramValue = params[param.name] !== undefined ? params[param.name] : param.value;
          return {
            ...param,
            value: paramValue
          };
        })
      };
      
      console.log('Tool params from backend:', params);
      console.log('Updated tool with params:', updatedTool);
      
      setCurrentTool(updatedTool);
      setPendingToolSelection({ tool: updatedTool, isSelected });
      setIsToolModalOpen(true);
    }
  };

  const handleToolSave = (updatedTool: Tool) => {
    // if there is pending tool selection, check required fields
    if (pendingToolSelection) {
      const { tool, isSelected } = pendingToolSelection;
      const missingRequiredFields = updatedTool.initParams
        .filter(param => param.required && (param.value === undefined || param.value === '' || param.value === null))
        .map(param => param.name);

      if (missingRequiredFields.length > 0) {
        message.error(`以下必填字段未填写: ${missingRequiredFields.join(', ')}`);
        return;
      }

      // all required fields are filled, continue to enable tool
      // create a mock click event
      const mockEvent = {
        stopPropagation: () => {},
        preventDefault: () => {},
        nativeEvent: new MouseEvent('click'),
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {}
      } as React.MouseEvent;
      
      handleToolSelect(updatedTool, isSelected, mockEvent);
    }
    
    setIsToolModalOpen(false);
    setPendingToolSelection(null);
  };

  // 修改 handleConfigClick 函数，确保在点击配置按钮时也获取最新参数
  const handleConfigClick = async (tool: Tool) => {
    try {
      // 获取工具的最新配置
      const { shouldProceed, params } = await handleToolSelectCommon(
        tool,
        true, // 假设工具是启用的
        agentId,
        () => {} // 不需要更新工具列表
      );

      if (params) {
        const updatedTool = {
          ...tool,
          initParams: tool.initParams.map(param => {
            const paramValue = params[param.name] !== undefined ? params[param.name] : param.value;
            return {
              ...param,
              value: paramValue
            };
          })
        };
        
        console.log('Tool params from backend (config click):', params);
        console.log('Updated tool with params (config click):', updatedTool);
        
        setCurrentTool(updatedTool);
      } else {
        setCurrentTool(tool);
      }
    } catch (error) {
      console.error('获取工具配置失败:', error);
      message.error('获取工具配置失败，使用默认配置');
      setCurrentTool(tool);
    }
    setIsToolModalOpen(true);
  };

  // 修改名称输入框的处理函数
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    const validation = validateName(newName);
    setNameError(validation.message);
  };

  // 修改描述输入框的处理函数
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    const validation = validateDescription(newDescription);
    setDescriptionError(validation.message);
  };

  const handleDelete = async () => {
    if (!agentId) {
      message.error('Agent ID 不存在');
      return;
    }

    try {
      const result = await deleteAgent(parseInt(agentId));
      if (result.success) {
        message.success('Agent 删除成功');
        setIsDeleteConfirmOpen(false);
        onCancel(); // 关闭编辑弹窗
        onRefresh?.(); // 刷新列表
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除 Agent 失败:', error);
      message.error('删除失败，请稍后重试');
    }
  };

  const handleExport = async () => {
    if (!agentId) {
      message.error('Agent ID 不存在');
      return;
    }

    try {
      const result = await exportAgent(parseInt(agentId));
      if (result.success && result.data) {
        // 处理JSON数据
        let jsonContent;
        if (typeof result.data === 'string') {
          // 如果后端返回的已经是JSON字符串，尝试解析并重新格式化
          try {
            const parsedData = JSON.parse(result.data);
            jsonContent = JSON.stringify(parsedData, null, 2);
          } catch (e) {
            // 如果解析失败，直接使用原字符串
            jsonContent = result.data;
          }
        } else {
          // 如果是对象，转换为格式化的JSON字符串
          jsonContent = JSON.stringify(result.data, null, 2);
        }
        
        // 创建Blob对象
        const blob = new Blob([jsonContent], { type: 'application/json' });
        
        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agent_${name}_config.json`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        
        // 清理
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        message.success('Agent 配置导出成功');
      } else {
        message.error(result.message || '导出失败');
      }
    } catch (error) {
      console.error('导出 Agent 失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  return (
    <div>
      <Modal
        title={title}
        open={isOpen}
        onCancel={onCancel}
        footer={readOnly ? (
          <div className="flex justify-end gap-2">
            <button 
              key="cancel" 
              onClick={onCancel}
              className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              style={{ border: "none" }}
            >
              关闭
            </button>
          </div>
        ) : (
          <div className="flex justify-between">
            <div className="flex gap-2">
              <button 
                key="delete" 
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-red-50 text-red-600 hover:bg-red-100"
                style={{ border: "none" }}
              >
                删除Agent
              </button>
              <button 
                key="export" 
                onClick={handleExport}
                className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-green-50 text-green-600 hover:bg-green-100"
                style={{ border: "none" }}
              >
                导出Agent
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                key="cancel" 
                onClick={onCancel}
                className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                style={{ border: "none" }}
              >
                取消
              </button>
              <button 
                key="submit" 
                onClick={handleSave}
                disabled={!isFormValid}
                className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: "none" }}
                title={!isFormValid ? "请确保名称和描述符合要求" : ""}
              >
                保存
              </button>
            </div>
          </div>
        )}
        width={1000}
      >
        <ScrollArea className="max-h-[70vh]">
          <div className="flex gap-6 pr-2">
            {/* 左侧：基本信息 */}
            <div className="flex-1 flex flex-col gap-4 border-r border-gray-200 pr-6">
              <div>
                <Text>名称</Text>
                <Input 
                  value={name} 
                  onChange={handleNameChange}
                  placeholder="请输入代理名称（只能包含字母、数字和下划线，且必须以字母或下划线开头）"
                  disabled={readOnly}
                  status={nameError ? 'error' : ''}
                />
                {nameError && <Text type="danger" className="text-xs mt-1">{nameError}</Text>}
              </div>
              <div>
                <Text>描述</Text>
                <TextArea
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="请输入代理描述"
                  rows={3}
                  disabled={readOnly}
                  status={descriptionError ? 'error' : ''}
                />
                {descriptionError && <Text type="danger" className="text-xs mt-1">{descriptionError}</Text>}
              </div>
              <div>
                <Text>使用的工具</Text>
                <div className="border rounded-md p-3 bg-gray-50 min-h-[80px] text-sm">
                  {currentTools.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {currentTools.map(tool => {
                        const isAvailable = tool.is_available !== false; // 默认为true，只有明确为false时才不可用
                        return (
                          <div 
                            key={tool.id} 
                            className={`px-2 py-1 rounded-md text-xs flex items-center cursor-pointer transition-colors ${
                              isAvailable 
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-gray-300'
                            }`}
                            title={!isAvailable ? '工具不可用，但可以查看配置' : undefined}
                            onClick={() => !readOnly && handleConfigClick(tool)}
                          >
                            {tool.name}
                            {!isAvailable && <span className="ml-1 text-red-500">(不可用)</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Text className="text-gray-400">未选择任何工具</Text>
                  )}
                </div>
              </div>
              <div>
                <Text>模型</Text>
                <div className={readOnly ? 'opacity-70' : ''}>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={readOnly}
                  >
                    {modelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Text>最大步骤数</Text>
                  <Input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={maxStep} 
                    onChange={(e) => setMaxStep(parseInt(e.target.value) || 5)}
                    disabled={readOnly}
                  />
                </div>
                <div className="flex-1">
                  <Text>是否提供运行摘要</Text>
                  <div className="mt-2">
                    <Switch 
                      checked={provideSummary} 
                      onChange={(checked) => setProvideSummary(checked)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Text>业务描述</Text>
                <TextArea
                  value={business_description}
                  readOnly
                  placeholder="暂无业务描述"
                  rows={4}
                  className="bg-gray-50 cursor-default"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            {/* 右侧：提示词 */}
            <div className="w-[400px] flex flex-col pl-2">
              <div className="flex-1 flex flex-col">
                <Text className="text-base font-medium mb-2">系统提示词</Text>
                <div className="flex-1 mt-2 border border-gray-200 rounded-md overflow-hidden">
                  <TextArea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="请输入系统提示词"
                    disabled={readOnly}
                    className="w-full h-full border-0"
                    style={{ height: '100%', resize: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              style={{ border: "none" }}
            >
              取消
            </button>
            <button 
              onClick={handleDelete}
              className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-red-500 text-white hover:bg-red-600"
              style={{ border: "none" }}
            >
              确认删除
            </button>
          </div>
        }
        width={400}
      >
        <div className="py-4">
          <Text>确定要删除该 Agent 吗？此操作不可恢复。</Text>
        </div>
      </Modal>

      <ToolConfigModal
        isOpen={isToolModalOpen}
        onCancel={() => setIsToolModalOpen(false)}
        onSave={handleToolSave}
        tool={currentTool}
        mainAgentId={parseInt(agentId || '0')}
        selectedTools={currentTools}
      />
    </div>
  );
} 