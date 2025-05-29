import importlib
import inspect
import json
import logging
from typing import Any, List

from pydantic_core import PydanticUndefined
from smolagents import ToolCollection

from database.agent_db import (
    query_tool_instances_by_id,
    create_or_update_tool_by_tool_info,
    update_tool_table_from_scan_tool_list
)
from consts.model import ToolInstanceInfoRequest, ToolInfo, ToolSourceEnum
from utils.config_utils import config_manager
from utils.user_utils import get_user_info

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tool config")

def python_type_to_json_schema(annotation: Any) -> str:
    """
    Convert Python type annotations to JSON Schema types

    Args:
        annotation: Python type annotation

    Returns:
        Corresponding JSON Schema type string
    """
    # Handle case with no type annotation
    if annotation == inspect.Parameter.empty:
        return "string"

    # Get type name
    type_name = getattr(annotation, "__name__", str(annotation))

    # Type mapping dictionary
    type_mapping = {
        "str": "string",
        "int": "integer",
        "float": "float",
        "bool": "boolean",
        "list": "array",
        "List": "array",
        "tuple": "array",
        "Tuple": "array",
        "dict": "object",
        "Dict": "object",
        "Any": "any"
    }

    # Return mapped type, or original type name if no mapping exists
    return type_mapping.get(type_name, type_name)

def get_local_tools() -> List[ToolInfo]:
    """
    Get metadata for all locally available tools

    Returns:
        List of ToolInfo objects for local tools
    """
    tools_info = []
    tools_classes = get_local_tools_classes()
    for tool_class in tools_classes:
        init_params_list = []
        sig = inspect.signature(tool_class.__init__)
        for param_name, param in sig.parameters.items():
            if param_name == "self" or param.default.exclude:
                continue

            param_info = {
                "type": python_type_to_json_schema(param.annotation),
                "name": param_name,
                "description": param.default.description
            }
            if param.default.default is PydanticUndefined:
                param_info["optional"] = False
            else:
                param_info["default"] = param.default.default
                param_info["optional"] = True

            init_params_list.append(param_info)

        # get tool fixed attributes
        tool_info = ToolInfo(
            name=getattr(tool_class, 'name'),
            description=getattr(tool_class, 'description'),
            params=init_params_list,
            source=ToolSourceEnum.LOCAL.value,
            inputs=json.dumps(getattr(tool_class, 'inputs'), ensure_ascii=False),
            output_type=getattr(tool_class, 'output_type'),
            class_name=tool_class.__name__
        )
        tools_info.append(tool_info)
    return tools_info

def get_local_tools_classes() -> List[type]:
    """
    Get all tool classes from the nexent.core.tools package

    Returns:
        List of tool class objects
    """
    tools_package = importlib.import_module('nexent.core.tools')
    tools_classes = []
    for name in dir(tools_package):
        obj = getattr(tools_package, name)
        if inspect.isclass(obj):
            tools_classes.append(obj)
    return tools_classes

def get_mcp_tools() -> List[ToolInfo]:
    """
    Get metadata for all tools available from the MCP service

    Returns:
        List of ToolInfo objects for MCP tools, or empty list if connection fails
    """
    mcp_service = config_manager.get_config("MCP_SERVICE")
    try:
        with ToolCollection.from_mcp({"url": mcp_service}) as tool_collection:
            tools_info = []

            # iterate all MCP tools
            for tool_class in tool_collection.tools:
                tool_info = ToolInfo(
                    name=getattr(tool_class, 'name'),
                    description=getattr(tool_class, 'description'),
                    params=[],
                    source=ToolSourceEnum.MCP.value,
                    inputs=json.dumps(getattr(tool_class, 'inputs'), ensure_ascii=False),
                    output_type=getattr(tool_class, 'output_type'),
                    class_name=getattr(tool_class, 'name')
                )

                tools_info.append(tool_info)
            return tools_info
    except Exception as e:
        logger.error(f"mcp connection error: {str(e)}")
        return []

def scan_tools() -> List[ToolInfo]:
    """
    Scan and gather all available tools from both local and MCP sources

    Returns:
        List of ToolInfo objects containing tool metadata
    """
    local_tools = get_local_tools()
    mcp_tools = get_mcp_tools()
    return local_tools + mcp_tools


class ToolConfigurationService:
    def __init__(self):
        tool_list = scan_tools()
        update_tool_table_from_scan_tool_list(tool_list)

    @staticmethod
    def search_tool_info_impl(agent_id: int, tool_id: int):
        user_id, tenant_id = get_user_info()
        try:
            tool_instance = query_tool_instances_by_id(agent_id, tool_id, tenant_id, user_id)
        except Exception as e:
            logger.error(f"search_tool_info_impl error in query_tool_instances_by_id, detail: {e}")
            raise ValueError(f"search_tool_info_impl error in query_tool_instances_by_id, detail: {e}")

        if tool_instance:
            return {
                "params": tool_instance["params"],
                "enabled": tool_instance["enabled"]
            }
        else:
            return {
                "params": None,
                "enabled": False
            }

    @staticmethod
    def update_tool_info_impl(request: ToolInstanceInfoRequest):
        user_id, tenant_id = get_user_info()
        try:
            tool_instance = create_or_update_tool_by_tool_info(request, tenant_id, user_id)
        except Exception as e:
            logger.error(f"update_tool_info_impl error in create_or_update_tool, detail: {e}")
            raise ValueError(f"update_tool_info_impl error in create_or_update_tool, detail: {e}")

        return {
            "tool_instance": tool_instance
        }


tool_configuration_service = ToolConfigurationService()
