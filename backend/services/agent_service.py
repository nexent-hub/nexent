from fastapi import HTTPException
from nexent.core.utils.agent_utils import agent_run_with_observer
from smolagents import ToolCollection

from consts.model import AgentInfoRequest
from database.agent_db import create_agent, query_all_enabled_tool_instances, \
    query_or_create_main_agent_id, query_sub_agents, search_sub_agent_by_main_agent_id, \
    search_tools_for_sub_agent, search_agent_info_by_agent_id, update_agent, delete_agent_by_id
from agents.agent_create_factory import AgentCreateFactory
from utils.agent_utils import add_history_to_agent
from utils.config_utils import config_manager
from utils.user_utils import get_user_info
import logging

logger = logging.getLogger("agent service")

def get_enable_tool_id_by_agent_id(agent_id: int, tenant_id: str = None, user_id: str = None):
    all_tool_instance = query_all_enabled_tool_instances(tenant_id=tenant_id, user_id=user_id, agent_id=agent_id)
    enable_tool_id_set = set()
    for tool_instance in all_tool_instance:
        if tool_instance["enabled"]:
            enable_tool_id_set.add(tool_instance["tool_id"])
    return list(enable_tool_id_set)

def get_enable_sub_agent_id_by_agent_id(agent_id: int, tenant_id: str = None, user_id: str = None):
    sub_agents = query_sub_agents(main_agent_id=agent_id, tenant_id=tenant_id, user_id=user_id)
    sub_agents_list = []
    for sub_agent in sub_agents:
        if sub_agent["enabled"]:
            sub_agents_list.append(sub_agent["agent_id"])

    return sub_agents_list

def get_creating_sub_agent_id_service(main_agent_id: int, tenant_id: str, user_id: str = None) -> int:
    #  first find the sub agent, if it exists, it means the agent was created before, but exited prematurely; if it does not exist, create a new one
    sub_agent_id = search_sub_agent_by_main_agent_id(main_agent_id, tenant_id)
    if sub_agent_id:
        return sub_agent_id
    else:
        return create_agent(agent_info={"enabled": False,
                                        "parent_agent_id": main_agent_id}, tenant_id=tenant_id, user_id=user_id)["agent_id"]


def query_or_create_main_agents_api(tenant_id: str, user_id: str = None):
    main_agents_id = query_or_create_main_agent_id(tenant_id, user_id=user_id)
    return main_agents_id


def query_sub_agents_api(main_agent_id: int, tenant_id: str = None, user_id: str = None):
    sub_agents = query_sub_agents(main_agent_id, tenant_id, user_id)

    for sub_agent in sub_agents:
        tool_info = search_tools_for_sub_agent(agent_id=sub_agent["agent_id"], tenant_id=tenant_id, user_id=user_id)
        sub_agent["tools"] = tool_info

    return sub_agents


def agent_run_thread(observer, query, agent_id, tenant_id, user_id, history=None):
    try:
        mcp_host = config_manager.get_config("MCP_SERVICE")

        with ToolCollection.from_mcp({"url": mcp_host}) as tool_collection:
            factory = AgentCreateFactory(observer=observer,
                                         mcp_tool_collection=tool_collection)
            agent = factory.create_from_db(agent_id, tenant_id, user_id)
            add_history_to_agent(agent, history)

            agent_run_with_observer(agent=agent, query=query, reset=False)

    except Exception as e:
        print(f"mcp connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"MCP server not connected: {str(e)}")


def list_main_agent_info_impl():
    user_id, tenant_id = get_user_info()

    try:
        main_agent_id = query_or_create_main_agents_api(tenant_id=tenant_id, user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to get main agent id: {str(e)}")
        raise ValueError(f"Failed to get main agent id: {str(e)}")
        
    try:
        main_agent_info = search_agent_info_by_agent_id(agent_id=main_agent_id, tenant_id=tenant_id, user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to get main agent info: {str(e)}")
        raise ValueError(f"Failed to get main agent info: {str(e)}")

    try:
        sub_agent_list = query_sub_agents_api(main_agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to get sub agent list: {str(e)}")
        raise ValueError(f"Failed to get sub agent list: {str(e)}")

    try:
        enable_tool_id_list = get_enable_tool_id_by_agent_id(main_agent_id, tenant_id, user_id)
        enable_agent_id_list = get_enable_sub_agent_id_by_agent_id(main_agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to get enable tool id list: {str(e)}")
        raise ValueError(f"Failed to get enable tool id list: {str(e)}")

    return {
        "main_agent_id": main_agent_id,
        "sub_agent_list": sub_agent_list,
        "enable_tool_id_list": enable_tool_id_list,
        "enable_agent_id_list": enable_agent_id_list,
        "model_name": main_agent_info["model_name"],
        "max_steps": main_agent_info["max_steps"],
        "business_description": main_agent_info["business_description"],
        "prompt": main_agent_info["prompt"]
    }


def get_agent_info_impl(agent_id: int):
    user_id, tenant_id = get_user_info()
    
    try:    
        agent_info = search_agent_info_by_agent_id(agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to get agent info: {str(e)}")
        raise ValueError(f"Failed to get agent info: {str(e)}")

    return agent_info

def get_creating_sub_agent_info_impl(agent_id: int):
    user_id, tenant_id = get_user_info()
    
    try:
        sub_agent_id = get_creating_sub_agent_id_service(agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to get creating sub agent id: {str(e)}")
        raise ValueError(f"Failed to get creating sub agent id: {str(e)}")

    try:
        agent_info = search_agent_info_by_agent_id(agent_id=sub_agent_id, tenant_id=tenant_id, user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to get sub agent info: {str(e)}")
        raise ValueError(f"Failed to get sub agent info: {str(e)}")
    
    try:
        enable_tool_id_list = get_enable_tool_id_by_agent_id(sub_agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to get sub agent enable tool id list: {str(e)}")
        raise ValueError(f"Failed to get sub agent enable tool id list: {str(e)}")
    
    return {"agent_id": sub_agent_id,
            "enable_tool_id_list": enable_tool_id_list,
            "model_name": agent_info["model_name"],
            "max_steps": agent_info["max_steps"],
            "business_description": agent_info["business_description"],
            "prompt": agent_info["prompt"]}

def update_agent_info_impl(request: AgentInfoRequest):
    user_id, tenant_id = get_user_info()
    
    try:
        update_agent(request.agent_id, request, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to update agent info: {str(e)}")
        raise ValueError(f"Failed to update agent info: {str(e)}")

def delete_agent_impl(agent_id: int):
    user_id, tenant_id = get_user_info()

    try:
        delete_agent_by_id(agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to delete agent: {str(e)}")
        raise ValueError(f"Failed to delete agent: {str(e)}")
