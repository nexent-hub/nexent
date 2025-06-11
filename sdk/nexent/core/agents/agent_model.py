from __future__ import annotations
from threading import Event
from typing import Optional, List, Dict, Any
from pydantic import Field, BaseModel
from ..utils.observer import MessageObserver


class ModelConfig(BaseModel):
    cite_name: str = Field(description="模型别名")
    api_key: str = Field(description="api-key", default="")
    model_name: str = Field(description="模型调用名称")
    url: str = Field(description="模型调用地址")
    temperature: Optional[float] = Field(description="温度", default=0.1)
    top_p: Optional[float] = Field(description="top_p", default=0.95)


class ToolConfig(BaseModel):
    class_name: str = Field(description="工具类名")
    params: Dict[str, Any] = Field(description="初始化参数")
    source: str = Field(description="工具来源，可选local or mcp")
    metadata: Optional[Dict[str, Any]] = Field(description="元数据", default=None)

class AgentConfig(BaseModel):
    name: str = Field(description="Agent名称")
    description: str = Field(description="Agent描述")
    prompt_templates: Dict[str, Any] = Field(description="提示词模板")
    tools: List[ToolConfig] = Field(description="工具信息列表")
    max_steps: int = Field(description="当前Agent最大运行步骤数", default=5)
    model_name: str = Field(description="ModelConfig 中的模型别名")
    provide_run_summary: Optional[bool] = Field(description="是否向上一级Agent提供运行摘要", default=False)
    managed_agents: List[AgentConfig] = Field(description="管理的Agent", default=[])


class AgentHistory(BaseModel):
    role: str = Field(description="角色, 可选 user 和 assistant")
    content : str = Field(description="对话内容")


class AgentRunInfo(BaseModel):
    query: str = Field(description="用户问题")
    model_config_list: List[ModelConfig] = Field(description="模型配置信息列表")
    observer: MessageObserver = Field(description="返回数据")
    agent_config: AgentConfig = Field(description="Agent详细配置")
    mcp_host: Optional[str] = Field(description="mcp服务器地址", default=None)
    history: Optional[List[AgentHistory]] = Field(description="历史对话信息", default=None)
    stop_event: Event = Field(description="停止事件控制")

    class Config:
        arbitrary_types_allowed = True
