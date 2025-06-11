import threading

import json
import yaml
import logging
from nexent.core.utils.observer import MessageObserver
from nexent.core.agents.agent_model import AgentRunInfo, ModelConfig, AgentConfig, ToolConfig

from database.agent_db import search_agent_info_by_agent_id, search_tools_for_sub_agent, query_sub_agents, \
    query_or_create_main_agent_id
from services.elasticsearch_service import ElasticSearchService
from utils.config_utils import config_manager
from utils.user_utils import get_user_info

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("build agent")

async def create_model_config_list():
     return [ModelConfig(cite_name="main_model",
                         api_key=config_manager.get_config("LLM_API_KEY"),
                         model_name=config_manager.get_config("LLM_MODEL_NAME"),
                         url=config_manager.get_config("LLM_MODEL_URL")),
            ModelConfig(cite_name="sub_model",
                         api_key=config_manager.get_config("LLM_SECONDARY_API_KEY"),
                         model_name=config_manager.get_config("LLM_SECONDARY_MODEL_NAME"),
                         url=config_manager.get_config("LLM_SECONDARY_MODEL_URL"))]


async def create_agent_config(agent_id, tenant_id, user_id):
    agent_info = search_agent_info_by_agent_id(agent_id=agent_id, tenant_id=tenant_id, user_id=user_id)

    # create sub agent
    sub_agents_info = query_sub_agents(agent_id, tenant_id, user_id)
    managed_agents = []
    for sub_agent_info in sub_agents_info:
        if not sub_agent_info.get("enabled"):
            continue
        sub_agent_config = await create_agent_config(
            agent_id=sub_agent_info["agent_id"],
            tenant_id=tenant_id,
            user_id=user_id)
        managed_agents.append(sub_agent_config)

    tool_list = await create_tool_config_list(agent_id, tenant_id, user_id)
    system_prompt = agent_info.get("prompt")

    # special logic
    for tool in tool_list:
        if "KnowledgeBaseSearchTool" == tool.class_name:
            knowledge_base_summary = "\n\n### 本地知识库信息 ###\n"
            for knowledge_name in json.loads(config_manager.get_config("SELECTED_KB_NAMES", "[]")):
                message = ElasticSearchService().get_summary(index_name=knowledge_name)
                knowledge_base_summary += f"{knowledge_name}:{message['summary']}\n"
            system_prompt += knowledge_base_summary

    agent_config = AgentConfig(
        name="" if agent_info["name"] is None else agent_info["name"],
        description="" if agent_info["description"] is None else agent_info["description"],
        prompt_templates=await prepare_prompt_templates(is_manager=len(managed_agents)>0, system_prompt=system_prompt),
        tools=tool_list,
        max_steps=agent_info.get("max_steps", 10),
        model_name=agent_info.get("model_name"),
        provide_run_summary=agent_info.get("provide_run_summary", False),
        managed_agents=managed_agents
    )
    return agent_config


async def create_tool_config_list(agent_id, tenant_id, user_id):
    # create tool
    tool_config_list = []
    tools_list = search_tools_for_sub_agent(agent_id, tenant_id, user_id)
    for tool in tools_list:
        param_dict = {}
        for param in tool.get("params", []):
            param_dict[param["name"]] = param.get("default")
        tool_config = ToolConfig(
            class_name=tool.get("class_name"),
            params=param_dict,
            source=tool.get("source")
        )

        # special logic for knowledge base search tool
        if tool_config.class_name == "KnowledgeBaseSearchTool":
            tool_config.metadata = {"index_names": json.loads(config_manager.get_config("SELECTED_KB_NAMES", "[]"))}
        tool_config_list.append(tool_config)
    return tool_config_list


async def prepare_prompt_templates(is_manager: bool, system_prompt: str):
    manager_prompt_templates = "backend/prompts/manager_system_prompt_template.yaml"
    managed_prompt_templates = "backend/prompts/managed_system_prompt_template.yaml"

    prompt_template_path = manager_prompt_templates if is_manager else managed_prompt_templates
    with open(prompt_template_path, "r", encoding="utf-8") as f:
        prompt_templates = yaml.safe_load(f)
    prompt_templates["system_prompt"] = system_prompt
    return prompt_templates


async def join_minio_file_description_to_query(minio_files, query):
    final_query = query
    if minio_files and isinstance(minio_files, list):
        file_descriptions = []
        for file in minio_files:
            if isinstance(file, dict) and "description" in file and file["description"]:
                file_descriptions.append(file["description"])

        if file_descriptions:
            final_query = "User provided some reference files:\n"
            final_query += "\n".join(file_descriptions) + "\n\n"
            final_query += f"User wants to answer questions based on the above information: {query}"
    return final_query


async def create_agent_run_info(agent_id, minio_files, query, history):
    user_id, tenant_id = get_user_info()
    if not agent_id:
        agent_id = query_or_create_main_agent_id(tenant_id=tenant_id, user_id=user_id)
    final_query = await join_minio_file_description_to_query(minio_files=minio_files, query=query)

    model_list = await create_model_config_list()
    agent_run_info = AgentRunInfo(
        query=final_query,
        model_config_list= model_list,
        observer=MessageObserver(),
        agent_config=await create_agent_config(agent_id=agent_id, tenant_id=tenant_id, user_id=user_id),
        mcp_host=config_manager.get_config("MCP_SERVICE"),
        history=history,
        stop_event=threading.Event()
    )
    return agent_run_info
