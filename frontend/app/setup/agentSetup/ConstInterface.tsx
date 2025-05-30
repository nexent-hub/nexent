"use client";

// model enum class
export enum OpenAIModel {
  MainModel = 'main_model',
  SubModel = 'sub_model'
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  max_step: number;
  provide_run_summary: boolean;
  tools: Tool[];
  prompt: string;
  business_description?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  source: 'local' | 'mcp';
  initParams: ToolParam[];
}

export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'OpenAIModel' | 'Optional';
  required: boolean;
  value?: any;
  description?: string;
}
// add agent modal props interface
export interface AgentModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSave: (name: string, description: string, model: string, max_step: number, provide_run_summary: boolean, prompt: string, business_description: string) => void;
  onRefresh?: () => void;
  title: string;
  agent?: Agent | null;
  selectedTools?: Tool[];
  systemPrompt?: string;
  readOnly?: boolean;
  agentId: string | null;
}
// business logic input component props interface
export interface BusinessLogicInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedAgents: Agent[];
  systemPrompt: string;
}
// sub agent pool component props interface
export interface SubAgentPoolProps {
  selectedAgents: Agent[];
  onSelectAgent: (agent: Agent, isSelected: boolean) => void;
  onEditAgent: (agent: Agent) => void;
  onCreateNewAgent: () => void;
  subAgentList?: Agent[];
  loadingAgents?: boolean;
  enabledAgentIds?: number[];
}
// tool pool component props interface
export interface ToolPoolProps {
  selectedTools: Tool[];
  onSelectTool: (tool: Tool, isSelected: boolean) => void;
  isCreatingNewAgent?: boolean;
  tools?: Tool[];
  loadingTools?: boolean;
  mainAgentId?: string | null;
  localIsGenerating?: boolean;
}
// main component props interface
export interface BusinessLogicConfigProps {
  businessLogic: string;
  setBusinessLogic: (value: string) => void;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
  selectedTools: Tool[];
  setSelectedTools: (tools: Tool[] | ((prevTools: Tool[]) => Tool[])) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  isCreatingNewAgent: boolean;
  setIsCreatingNewAgent: (value: boolean) => void;
  mainAgentModel: OpenAIModel;
  setMainAgentModel: (value: OpenAIModel) => void;
  mainAgentMaxStep: number;
  setMainAgentMaxStep: (value: number) => void;
  mainAgentPrompt: string;
  setMainAgentPrompt: (value: string) => void;
  tools?: Tool[];
  loadingTools?: boolean;
  subAgentList?: Agent[];
  loadingAgents?: boolean;
  mainAgentId: string | null;
  setMainAgentId: (id: string | null) => void;
  setSubAgentList: (agents: Agent[]) => void;
  enabledAgentIds: number[];
  setEnabledAgentIds: (ids: number[]) => void;
  localIsGenerating: boolean;
}
