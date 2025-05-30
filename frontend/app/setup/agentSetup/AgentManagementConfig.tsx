"use client"

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Typography, Input, Button, Switch, Modal, message, Select, InputNumber } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import ToolConfigModal from './components/ToolConfigModal'
import AgentModalComponent from './components/AgentModal'
import { mockAgents, mockTools } from './mockData'
import { AgentModalProps, Tool, BusinessLogicInputProps, SubAgentPoolProps, ToolPoolProps, BusinessLogicConfigProps, Agent, OpenAIModel } from './ConstInterface'
import { ScrollArea } from '@/components/ui/scrollArea'
import { getCreatingSubAgentId, fetchAgentList, updateToolConfig, searchToolConfig, updateAgent } from '@/services/agentConfigService'

const { Text } = Typography
const { TextArea } = Input

const modelOptions = [
  { label: '主模型', value: OpenAIModel.MainModel },
  { label: '副模型', value: OpenAIModel.SubModel },
];

// 提取公共的 handleToolSelect 逻辑
const handleToolSelectCommon = async (
  tool: Tool,
  isSelected: boolean,
  mainAgentId: string | null | undefined,
  onSuccess?: (tool: Tool, isSelected: boolean) => void
) => {
  if (!mainAgentId) {
    message.error('主代理ID未设置，无法更新工具状态');
    return { shouldProceed: false, params: {} };
  }

  try {
    // step 1: get tool config from database
    const searchResult = await searchToolConfig(parseInt(tool.id), parseInt(mainAgentId));
    if (!searchResult.success) {
      message.error('获取工具配置失败');
      return { shouldProceed: false, params: {} };
    }

    let params: Record<string, any> = {};

    // use config from database or default config
    if (searchResult.data?.params) {
      params = searchResult.data.params || {};
    } else {
      // if there is no saved config, use default value
      params = (tool.initParams || []).reduce((acc, param) => {
        if (param && param.name) {
          acc[param.name] = param.value;
        }
        return acc;
      }, {} as Record<string, any>);
    }

    // step 2: if the tool is enabled, check required fields
    if (isSelected && tool.initParams && tool.initParams.length > 0) {
      const missingRequiredFields = tool.initParams
        .filter(param => param && param.required && (params[param.name] === undefined || params[param.name] === '' || params[param.name] === null))
        .map(param => param.name);

      if (missingRequiredFields.length > 0) {
        return { shouldProceed: false, params };
      }
    }

    // step 3: if all checks pass, update tool config
    const updateResult = await updateToolConfig(
      parseInt(tool.id),
      parseInt(mainAgentId),
      params,
      isSelected
    );

    if (updateResult.success) {
      if (onSuccess) {
        onSuccess(tool, isSelected);
      }
      message.success(`工具"${tool.name}"${isSelected ? '已启用' : '已禁用'}`);
      return { shouldProceed: true, params };
    } else {
      message.error(updateResult.message || '更新工具状态失败');
      return { shouldProceed: false, params };
    }
  } catch (error) {
    message.error('更新工具状态失败，请稍后重试');
    return { shouldProceed: false, params: {} };
  }
};

/**
 * Business Logic Input Component
 */
function BusinessLogicInput({ value, onChange, selectedAgents, systemPrompt }: BusinessLogicInputProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-medium mb-2">业务描述</h2>
      <div className="flex-1 flex flex-col">
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请描述您的业务场景和需求..."
          className="w-full h-full resize-none p-3 text-sm"
          style={{ height: '100%' }}
          autoSize={false}
        />
      </div>
    </div>
  )
}

/**
 * Sub Agent Pool Component
 */
function SubAgentPool({ 
  selectedAgents, 
  onSelectAgent, 
  onEditAgent, 
  onCreateNewAgent, 
  subAgentList = [], 
  loadingAgents = false,
  enabledAgentIds = []
}: SubAgentPoolProps) {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Agent</h2>
        {loadingAgents && <span className="text-sm text-gray-500">加载中...</span>}
      </div>
      <ScrollArea className="flex-1 min-h-0 border-t pt-2 pb-2">
        <div className="grid grid-cols-1 gap-3 pr-2">
          <div 
            className="border rounded-md p-3 flex flex-col justify-center items-center cursor-pointer transition-colors duration-200 h-[80px] hover:border-blue-300 hover:bg-blue-50"
            onClick={onCreateNewAgent}
          >
            <div className="flex items-center justify-center h-full text-blue-500">
              <span className="text-lg mr-2">+</span>
              <span className="text-sm">新建Agent</span>
            </div>
          </div>
          
          {subAgentList.map((agent) => {
            const isEnabled = enabledAgentIds.includes(Number(agent.id));
            return (
              <div 
                key={agent.id} 
                className={`border rounded-md p-3 flex flex-col justify-center cursor-pointer transition-colors duration-200 h-[80px] ${
                  isEnabled ? 'bg-blue-100 border-blue-400' : 'hover:border-blue-300'
                }`}
                onClick={() => onSelectAgent(agent, !isEnabled)}
              >
                <div className="flex items-center h-full">
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm truncate" title={agent.name}>{agent.name}</div>
                    <div 
                      className="text-xs text-gray-500 line-clamp-2" 
                      title={agent.description}
                    >
                      {agent.description}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAgent(agent);
                    }}
                    className="ml-2 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-blue-500 bg-transparent"
                    style={{ border: "none", padding: "4px" }}
                  >
                    <SettingOutlined style={{ fontSize: '16px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

/**
 * Tool Pool Component
 */
function ToolPool({ 
  selectedTools, 
  onSelectTool, 
  isCreatingNewAgent, 
  tools = [], 
  loadingTools = false,
  mainAgentId,
  localIsGenerating
}: ToolPoolProps) {
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool | null>(null);
  const [pendingToolSelection, setPendingToolSelection] = useState<{tool: Tool, isSelected: boolean} | null>(null);

  // Use useMemo to cache the tool list to avoid unnecessary recalculations
  const displayTools = useMemo(() => {
    return tools.length > 0 ? tools : mockTools;
  }, [tools]);

  // Use useMemo to cache the selected tool ID set to improve lookup efficiency
  const selectedToolIds = useMemo(() => {
    return new Set(selectedTools.map(tool => tool.id));
  }, [selectedTools]);

  // Use useCallback to cache the tool selection processing function
  const handleToolSelect = useCallback(async (tool: Tool, isSelected: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { shouldProceed, params } = await handleToolSelectCommon(
      tool,
      isSelected,
      mainAgentId,
      (tool, isSelected) => onSelectTool(tool, isSelected)
    );

    if (!shouldProceed && params) {
      setCurrentTool({
        ...tool,
        initParams: tool.initParams.map(param => ({
          ...param,
          value: params[param.name] || param.value
        }))
      });
      setPendingToolSelection({ tool, isSelected });
      setIsToolModalOpen(true);
    }
  }, [mainAgentId, onSelectTool]);

  // Use useCallback to cache the tool configuration click processing function
  const handleConfigClick = useCallback((tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTool(tool);
    setIsToolModalOpen(true);
  }, []);

  // Use useCallback to cache the tool save processing function
  const handleToolSave = useCallback((updatedTool: Tool) => {
    if (pendingToolSelection) {
      const { tool, isSelected } = pendingToolSelection;
      const missingRequiredFields = updatedTool.initParams
        .filter(param => param.required && (param.value === undefined || param.value === '' || param.value === null))
        .map(param => param.name);

      if (missingRequiredFields.length > 0) {
        message.error(`以下必填字段未填写: ${missingRequiredFields.join(', ')}`);
        return;
      }

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
  }, [pendingToolSelection, handleToolSelect]);

  // Use useCallback to cache the modal close processing function
  const handleModalClose = useCallback(() => {
    setIsToolModalOpen(false);
    setPendingToolSelection(null);
  }, []);

  // Use memo to optimize the rendering of tool items
  const ToolItem = memo(({ tool }: { tool: Tool }) => {
    const isSelected = selectedToolIds.has(tool.id);
    
    return (
      <div 
        className={`border rounded-md p-3 flex flex-col justify-center transition-colors duration-200 h-[80px] ${
          isSelected ? 'bg-blue-100 border-blue-400' : 'hover:border-blue-300'
        } ${localIsGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={(e) => {
          if (localIsGenerating) return;
          handleToolSelect(tool, !isSelected, e);
        }}
      >
        <div className="flex items-center h-full">
          <div className="flex-1 overflow-hidden">
            <div className="font-medium text-sm truncate" title={tool.name}>{tool.name}</div>
            <div 
              className="text-xs text-gray-500 line-clamp-2" 
              title={tool.description}
            >
              {tool.description}
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              if (localIsGenerating) return;
              handleConfigClick(tool, e);
            }}
            disabled={localIsGenerating}
            className={`ml-2 flex-shrink-0 flex items-center justify-center bg-transparent ${
              localIsGenerating ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-500'
            }`}
            style={{ border: "none", padding: "4px" }}
          >
            <SettingOutlined style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">工具</h2>
        {loadingTools && <span className="text-sm text-gray-500">加载中...</span>}
      </div>
      <ScrollArea className="flex-1 min-h-0 border-t pt-2 pb-2">
        {loadingTools ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">加载工具中...</span>
          </div>
        ) : (
          <div className={`grid ${isCreatingNewAgent ? 'grid-cols-4' : 'grid-cols-2'} gap-3 pr-2`}>
            {displayTools.map((tool) => (
              <ToolItem key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </ScrollArea>

      <ToolConfigModal
        isOpen={isToolModalOpen}
        onCancel={handleModalClose}
        onSave={handleToolSave}
        tool={currentTool}
        mainAgentId={parseInt(mainAgentId || '0')}
        selectedTools={selectedTools}
      />
    </div>
  );
}

// Use memo to optimize the rendering of ToolPool component
export const MemoizedToolPool = memo(ToolPool);

/**
 * Business Logic Configuration Main Component
 */
export default function BusinessLogicConfig({
  businessLogic,
  setBusinessLogic,
  selectedAgents,
  setSelectedAgents,
  selectedTools,
  setSelectedTools,
  systemPrompt,
  setSystemPrompt,
  isCreatingNewAgent,
  setIsCreatingNewAgent,
  mainAgentModel,
  setMainAgentModel,
  mainAgentMaxStep,
  setMainAgentMaxStep,
  mainAgentPrompt,
  setMainAgentPrompt,
  tools,
  loadingTools,
  subAgentList = [],
  loadingAgents = false,
  mainAgentId,
  setMainAgentId,
  setSubAgentList,
  enabledAgentIds,
  setEnabledAgentIds,
  localIsGenerating
}: BusinessLogicConfigProps) {
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [enabledToolIds, setEnabledToolIds] = useState<number[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  const fetchSubAgentIdAndEnableToolList = async () => {
    setIsLoadingTools(true);
    // Clear the tool selection status when loading starts
    setSelectedTools([]);
    setEnabledToolIds([]);
    
    try {
      const result = await getCreatingSubAgentId(mainAgentId);
      if (result.success && result.data) {
        const { agentId, enabledToolIds, modelName, maxSteps, businessDescription, prompt } = result.data;
        
        // Update the main agent ID
        setMainAgentId(agentId);
        // Update the enabled tool ID list
        setEnabledToolIds(enabledToolIds);
        // Update the model
        if (modelName) {
          setMainAgentModel(modelName as OpenAIModel);
        }
        // Update the maximum number of steps
        if (maxSteps) {
          setMainAgentMaxStep(maxSteps);
        }
        // Update the business description
        if (businessDescription) {
          setBusinessLogic(businessDescription);
        }
        // Update the system prompt
        if (prompt) {
          setSystemPrompt(prompt);
        }
      } else {
        message.error(result.message || '获取新Agent ID失败');
      }
    } catch (error) {
      console.error('创建新Agent失败:', error);
      message.error('创建新Agent失败，请稍后重试');
    } finally {
      setIsLoadingTools(false);
    }
  };

  // Listen for changes in the creation of a new Agent
  useEffect(() => {
    if (isCreatingNewAgent) {
      // When switching to the creation of a new Agent, clear the relevant status
      setSelectedAgents([]);
      setBusinessLogic('');
      fetchSubAgentIdAndEnableToolList();
    } else {
      // When exiting the creation of a new Agent, reset the main Agent configuration and refresh the list
      setBusinessLogic('');
      setMainAgentModel(OpenAIModel.MainModel);
      setMainAgentMaxStep(10);
      setMainAgentPrompt('');
      refreshAgentList();
    }
  }, [isCreatingNewAgent]);

  // Listen for changes in the tool status, update the selected tool
  useEffect(() => {
    if (!tools || !enabledToolIds || isLoadingTools) return;

    const enabledTools = tools.filter(tool => 
      enabledToolIds.includes(Number(tool.id))
    );

    setSelectedTools(prevTools => {
      // Only update when the tool list is确实不同时
      if (JSON.stringify(prevTools) !== JSON.stringify(enabledTools)) {
        return enabledTools;
      }
      return prevTools;
    });
  }, [tools, enabledToolIds, isLoadingTools]);

  // Handle the creation of a new Agent
  const handleCreateNewAgent = async () => {
    setIsCreatingNewAgent(true);
  };

  // Reset the status when the user cancels the creation of an Agent
  const handleCancelCreating = async () => {
    setIsCreatingNewAgent(false);
  };

  // Handle the creation of a new Agent
  const handleSaveNewAgent = async (name: string, description: string, model: string, max_step: number, provide_run_summary: boolean, prompt: string, business_description: string) => {
    if (name.trim()) {
      const newAgent: Agent = {
        id: `custom_${Date.now()}`,
        name: name,
        description: description || businessLogic.substring(0, 50) + (businessLogic.length > 50 ? "..." : ""),
        model: model,
        max_step: max_step,
        provide_run_summary: provide_run_summary,
        tools: selectedTools.map(tool => ({
          ...tool,
          initParams: tool.initParams.map(param => ({
            ...param,
            value: param.value
          }))
        })),
        prompt: prompt,
        business_description: business_description
      };
      
      mockAgents.unshift(newAgent);
      setIsAgentModalOpen(false);
      message.success(`Agent:"${name}"创建成功`);
      
      // First exit the creation mode
      setIsCreatingNewAgent(false);
      // Reset the status
      setBusinessLogic('');
      setSelectedTools([]);
      // Refresh the list
      refreshAgentList();
    }
  };

  const handleSaveAsAgent = () => {
    if (systemPrompt.trim()) {
      setIsAgentModalOpen(true);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setIsEditModalOpen(true);
  };

  const handleUpdateAgent = (name: string, description: string, model: string, max_step: number, provide_run_summary: boolean, prompt: string, business_description: string) => {
    if (currentAgent && name.trim()) {
      // Update the agent and maintain independent tool configuration
      const index = mockAgents.findIndex(a => a.id === currentAgent.id);
      if (index !== -1) {
        mockAgents[index] = {
          ...currentAgent,
          name,
          description,
          model,
          max_step,
          provide_run_summary,
          tools: currentAgent.tools, // Keep the original tool configuration
          prompt,
          business_description
        };
      }
      
      // Close pop-up window
      setIsEditModalOpen(false);
      
      // Display success message
      message.success(`子代理"${name}"更新成功`);
    }
  };

  // Processing mode box closed
  const handleModalClose = () => {
    setIsAgentModalOpen(false);
  };

  const canSaveAsAgent = selectedAgents.length === 0 && systemPrompt.trim().length > 0;
  
  // Generate more intelligent prompt information according to conditions
  const getButtonTitle = () => {
    if (selectedAgents.length > 0) {
      return "请确保未选择Agent";
    }
    if (systemPrompt.trim().length === 0) {
      return "请先生成系统提示词";
    }
    return "";
  };

  // Remove the fetchAgentToolsState function and merge its functionality into refreshAgentList
  const refreshAgentList = async () => {
    if (!mainAgentId) return;
    
    setIsLoadingTools(true);
    // Clear the tool selection status when loading starts
    setSelectedTools([]);
    setEnabledToolIds([]);
    
    try {
      const result = await fetchAgentList();
      if (result.success) {
        // Update all related states
        setSubAgentList(result.data.subAgentList);
        setMainAgentId(result.data.mainAgentId);
        const newEnabledToolIds = result.data.enabledToolIds || [];
        setEnabledToolIds(newEnabledToolIds);
        
        // Update the status of the newly added fields
        if (result.data.modelName) {
          setMainAgentModel(result.data.modelName as OpenAIModel);
        }
        if (result.data.maxSteps) {
          setMainAgentMaxStep(result.data.maxSteps);
        }
        if (result.data.businessDescription) {
          setBusinessLogic(result.data.businessDescription);
        }
        if (result.data.prompt) {
          setSystemPrompt(result.data.prompt);
        }
        
        // Update the selected tools
        if (tools && tools.length > 0) {
          const enabledTools = tools.filter(tool => 
            newEnabledToolIds.includes(Number(tool.id))
          );
          setSelectedTools(enabledTools);
        }
      } else {
        message.error(result.message || '获取 Agent 列表失败');
      }
    } catch (error) {
      console.error('获取 Agent 列表失败:', error);
      message.error('获取 Agent 列表失败，请稍后重试');
    } finally {
      setIsLoadingTools(false);
    }
  };

  // Handle the update of the Agent selection status
  const handleAgentSelect = async (agent: Agent, isSelected: boolean) => {
    try {
      const result = await updateAgent(
        Number(agent.id),
        undefined, // name
        undefined, // description
        undefined, // modelName
        undefined, // maxSteps
        undefined, // provideRunSummary
        undefined, // prompt
        isSelected // enabled
      );

      if (result.success) {
        if (isSelected) {
          setSelectedAgents([...selectedAgents, agent]);
          setEnabledAgentIds([...enabledAgentIds, Number(agent.id)]);
        } else {
          setSelectedAgents(selectedAgents.filter((a) => a.id !== agent.id));
          setEnabledAgentIds(enabledAgentIds.filter(id => id !== Number(agent.id)));
        }
        message.success(`Agent"${agent.name}"${isSelected ? '已启用' : '已禁用'}`);
      } else {
        message.error(result.message || '更新 Agent 状态失败');
      }
    } catch (error) {
      console.error('更新 Agent 状态失败:', error);
      message.error('更新 Agent 状态失败，请稍后重试');
    }
  };

  // Handle the update of the model
  const handleModelChange = async (value: OpenAIModel) => {
    if (!mainAgentId) {
      message.error('主代理ID未设置，无法更新模型');
      return;
    }

    try {
      const result = await updateAgent(
        Number(mainAgentId),
        undefined, // name
        undefined, // description
        value, // modelName
        undefined, // maxSteps
        undefined, // provideRunSummary
        undefined, // prompt
        undefined // enabled
      );

      if (result.success) {
        setMainAgentModel(value);
        message.success('模型更新成功');
      } else {
        message.error(result.message || '更新模型失败');
      }
    } catch (error) {
      console.error('更新模型失败:', error);
      message.error('更新模型失败，请稍后重试');
    }
  };

  // Handle the update of the maximum number of steps
  const handleMaxStepChange = async (value: number | null) => {
    if (!mainAgentId) {
      message.error('主代理ID未设置，无法更新最大步骤数');
      return;
    }

    const newValue = value ?? 10;
    try {
      const result = await updateAgent(
        Number(mainAgentId),
        undefined, // name
        undefined, // description
        undefined, // modelName
        newValue, // maxSteps
        undefined, // provideRunSummary
        undefined, // prompt
        undefined // enabled
      );

      if (result.success) {
        setMainAgentMaxStep(newValue);
        message.success('最大步骤数更新成功');
      } else {
        message.error(result.message || '更新最大步骤数失败');
      }
    } catch (error) {
      console.error('更新最大步骤数失败:', error);
      message.error('更新最大步骤数失败，请稍后重试');
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-0 justify-between">
      {/* Upper part: Agent pool + Tool pool */}
      <div className="flex gap-4 flex-1 min-h-0 pb-4 pr-4 pl-4">
        <div className={`w-[360px] h-full ${isCreatingNewAgent ? 'hidden' : ''}`}>
          <SubAgentPool
            selectedAgents={selectedAgents}
            onSelectAgent={handleAgentSelect}
            onEditAgent={handleEditAgent}
            onCreateNewAgent={handleCreateNewAgent}
            subAgentList={subAgentList}
            loadingAgents={loadingAgents}
            enabledAgentIds={enabledAgentIds}
          />
        </div>
        <div className={`${isCreatingNewAgent ? 'w-full' : 'flex-1'} h-full`}>
          <MemoizedToolPool
            selectedTools={isLoadingTools ? [] : selectedTools}
            onSelectTool={(tool, isSelected) => {
              if (isLoadingTools) return;
              setSelectedTools(prevTools => {
                if (isSelected) {
                  return [...prevTools, tool];
                } else {
                  return prevTools.filter(t => t.id !== tool.id);
                }
              });
            }}
            isCreatingNewAgent={isCreatingNewAgent}
            tools={tools}
            loadingTools={isLoadingTools}
            mainAgentId={mainAgentId}
            localIsGenerating={localIsGenerating}
          />
        </div>
      </div>

      {/* The second half: business logic description */}
      <div className="flex gap-4 h-[240px] pb-4 pr-4 pl-4">
        <div className="flex-1 h-full">
          <BusinessLogicInput 
            value={businessLogic} 
            onChange={setBusinessLogic} 
            selectedAgents={selectedAgents}
            systemPrompt={systemPrompt}
          />
        </div>
        <div className="w-[280px] h-[200px] flex flex-col">
          <div className="flex flex-col gap-5 flex-1">
            <div>
              <span className="block text-lg font-medium mb-2">模型</span>
              <Select
                value={mainAgentModel}
                onChange={handleModelChange}
                className="w-full"
                options={modelOptions}
              />
            </div>
            <div>
              <span className="block text-lg font-medium mb-2">最大步骤数</span>
              <InputNumber
                min={1}
                max={50}
                value={mainAgentMaxStep}
                onChange={handleMaxStepChange}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 w-full mt-2">
              {isCreatingNewAgent && (
                <>
                  <button
                    onClick={handleCancelCreating}
                    className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                    style={{ border: "none" }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveAsAgent}
                    disabled={!canSaveAsAgent}
                    title={getButtonTitle()}
                    className="px-4 py-1.5 rounded-md flex items-center justify-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ border: "none" }}
                  >
                    保存到Agent池
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Agent pop-up window */}
      <AgentModalComponent 
        isOpen={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onSave={handleUpdateAgent}
        onRefresh={refreshAgentList}
        title="修改Agent"
        agent={currentAgent}
        selectedTools={selectedTools}
        readOnly={false}
        agentId={currentAgent?.id || null}
      />

      {/* New Agent pop-up window */}
      <AgentModalComponent 
        isOpen={isAgentModalOpen}
        onCancel={handleModalClose}
        onSave={(name, description, model, max_step, provide_run_summary, prompt, business_description) => {
          handleSaveNewAgent(name, description, model, max_step, provide_run_summary, prompt, business_description);
        }}
        onRefresh={refreshAgentList}
        title="保存到Agent池"
        selectedTools={selectedTools}
        systemPrompt={systemPrompt}
        agentId={mainAgentId}
        agent={{
          id: '',
          name: '',
          description: '',
          model: mainAgentModel,
          max_step: mainAgentMaxStep,
          provide_run_summary: true,
          tools: selectedTools,
          prompt: systemPrompt,
          business_description: businessLogic
        }}
      />
    </div>
  )
}