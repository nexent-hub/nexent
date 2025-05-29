import json
import re
import logging
import yaml

from nexent.core.agents import CoreAgent
from nexent.core.models import OpenAIModel
from nexent.core.utils import MessageObserver
from nexent.core.tools import *  # Do not delete

from utils.config_utils import config_manager
from database.agent_db import (
    search_agent_info_by_agent_id,
    query_sub_agents,
    search_tools_for_sub_agent
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent factory")


class AgentCreateFactory:
    def __init__(self, mcp_tool_collection, observer:MessageObserver):
        """
        init the agent create factory   
        
        Args:
            mcp_tool_collection: 
            observer: 
        """
        if config_manager is None:
            raise ValueError("must provide a ConfigManager instance")
            
        self.observer = observer
        self.models_params = dict()
        self.init_models_params()
        self.mcp_tool_collection = mcp_tool_collection

    def init_models_params(self):
        # Main model
        self.models_params["main_model"] = {
            "model_id": config_manager.get_config("LLM_MODEL_NAME", ""),
            "api_key": config_manager.get_config("LLM_API_KEY", ""),
            "api_base": config_manager.get_config("LLM_MODEL_URL", ""),
            "temperature": 0.1
        }

        # Sub model
        self.models_params["sub_model"] = {
            "model_id": config_manager.get_config("LLM_SECONDARY_MODEL_NAME", ""),
            "api_key": config_manager.get_config("LLM_SECONDARY_API_KEY", ""),
            "api_base": config_manager.get_config("LLM_SECONDARY_MODEL_URL", ""),
            "temperature": 0.1
        }

    @staticmethod
    def _replace_env_vars(value):
        """replace the environment variables in the string"""
        if isinstance(value, str) and "${" in value:
            pattern = r'\${([^}]+)}'
            matches = re.findall(pattern, value)
            for match in matches:
                env_value = config_manager.get_config(match, "")
                value = value.replace(f"${{{match}}}", env_value)
                
            # if the value looks like a JSON array, try to parse it
            if value.startswith("[") and value.endswith("]"):
                try:
                    value = json.loads(value)
                except:
                    pass
        return value
    
    def _process_config_values(self, config):
        """recursively process all environment variables in the config"""
        if isinstance(config, dict):
            return {k: self._process_config_values(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [self._process_config_values(item) for item in config]
        else:
            return self._replace_env_vars(config)
    
    def create_model(self, model_config):
        """create a model instance"""
        return OpenAIModel(
            observer=self.observer,
            model_id=model_config.get("model_id", ""),
            api_key=model_config.get("api_key", ""),
            api_base=model_config.get("api_base", ""),
            temperature=model_config.get("temperature", 0.1)
        )
    
    def create_tool(self, tool_config):
        """create a tool instance according to the tool config"""
        try:
            class_name = tool_config.get("class_name")
            params = tool_config.get("params", {})
            source = tool_config.get("source")
            model_name = tool_config.get("model", None)
            try:
                if model_name is not None:
                    model = self.get_model(model_name)
                    params["model"] = model
            except Exception as e:
                print(f"Error in loading tool config: {e}")
        
            if source == "local":
                tool_class = globals().get(class_name)
                if tool_class is None:
                    raise ValueError(f"{class_name} not found in local")
                else:
                    tools_obj = tool_class(**params)
                    if hasattr(tools_obj, 'observer'):
                        tools_obj.observer = self.observer

                    if class_name == "KnowledgeBaseSearchTool":
                        tools_obj.update_search_index_names(
                            json.loads(config_manager.get_config("SELECTED_KB_NAMES", [])))
            elif source == "mcp":
                tools_obj = next(
                    (tool for tool in self.mcp_tool_collection.tools if tool.name == class_name), 
                    None
                )
                if tools_obj is None:
                    raise ValueError(f"{class_name} not found in MCP server")

            else:
                raise ValueError(f"unsupported tool source: {source}")
            
            return tools_obj
        except Exception as e:
            print(f"Error in creating tool: {e}")
            return None

    def get_model(self, model_name):
        model = self.create_model(self.models_params.get(model_name, "main_model"))
        if model is None:
            print(f"Error: {model_name} is not found!")
        return model

    def create_from_db(self, agent_id, tenant_id=None, user_id=None):
        """Create an agent from database information
        
        Args:
            agent_id: ID of the main agent to create
            tenant_id: Tenant ID for filtering
            user_id: Optional user ID for personalization
            
        Returns:
            The created main agent with all its sub-agents and tools
        """
        # Get the main agent info
        try:
            main_agent_info = search_agent_info_by_agent_id(agent_id, tenant_id, user_id)
        except Exception as e:
            logger.error(f"create_from_db error in search_agent_info_by_agent_id_api, detail: {e}")
            raise ValueError(f"create_from_db error in search_agent_info_by_agent_id_api, detail: {e}")
        if not main_agent_info:
            raise ValueError(f"Agent with id {agent_id} not found")
        
        # Get sub-agents
        sub_agents_info = query_sub_agents(agent_id, tenant_id, user_id)
        managed_agents = []
        
        # Create sub-agents
        for sub_agent_info in sub_agents_info:
            if not sub_agent_info.get("enabled"):
                continue
            # Prepare sub-agent config with is_manager=False and default sub-agent prompt template
            sub_agent_config = self._prepare_agent_config(
                agent_info=sub_agent_info,
                tenant_id=tenant_id,
                user_id=user_id,
                prompt_template_path="backend/prompts/managed_system_prompt_template.yaml"
            )
            
            # Create the sub-agent
            sub_agent = self.create_single_agent(agent_config=sub_agent_config, managed_agents=[])
            managed_agents.append(sub_agent)
        
        # Prepare main agent config with is_manager=True and manager prompt template
        main_agent_config = self._prepare_agent_config(
            agent_info=main_agent_info,
            tenant_id=tenant_id,
            user_id=user_id,
            prompt_template_path="backend/prompts/manager_system_prompt_template.yaml" if len(managed_agents) else "backend/prompts/managed_system_prompt_template.yaml"
        )
        
        # Create the main agent
        main_agent = self.create_single_agent(agent_config=main_agent_config, 
                                              managed_agents=managed_agents)

        return main_agent

    @staticmethod
    def _prepare_agent_config(agent_info, tenant_id, user_id, prompt_template_path=None):
        """
        Prepare agent configuration by extracting agent info and tools from the database
        
        Args:
            agent_info: Agent information from the database
            tenant_id: Tenant ID for filtering
            user_id: Optional user ID
            prompt_template_path: Path to the prompt template
            
        Returns:
            Agent configuration dictionary
        """
        agent_id = agent_info.get("agent_id")
        tools_list = search_tools_for_sub_agent(agent_id, tenant_id, user_id)
        for tool in tools_list:
            param_dict = {}
            for param in tool.get("params", []):
                param_dict[param["name"]] = param.get("default")
            tool["params"] = param_dict

        # Prepare agent config
        agent_config = {
            "name": agent_info.get("name"),
            "model": agent_info.get("model_name"),
            "description": agent_info.get("description", ""),
            "max_steps": agent_info.get("max_steps", 10),
            "provide_run_summary": agent_info.get("provide_run_summary", False),
            "prompt_templates_path": prompt_template_path,
            "tools": tools_list,
            "system_prompt": agent_info.get("prompt")
        }

        return agent_config

    def create_single_agent(self, agent_config, managed_agents):
        # get the model
        model_name = agent_config.get("model")
        model = self.get_model(model_name)
        # load the prompt templates
        prompt_templates_path = agent_config.get("prompt_templates_path")

        with open(prompt_templates_path, "r", encoding="utf-8") as f:
            prompt_templates = yaml.safe_load(f)
        prompt_templates["system_prompt"] = agent_config.get("system_prompt")

        tools = self.create_tools_list(agent_config.get("tools", []))
        # create the agent
        agent = CoreAgent(
            observer=self.observer,
            tools=tools,
            model=model,
            name=agent_config.get("name"),
            description=agent_config.get("description", ""),
            max_steps=agent_config.get("max_steps", 5),
            prompt_templates=prompt_templates,
            provide_run_summary=agent_config.get("provide_run_summary", False),
            managed_agents=managed_agents
        )

        return agent

    def create_tools_list(self, tool_config_list):
        # create tools
        tools = []
        for tool_config in tool_config_list:
            try:
                tools.append(self.create_tool(tool_config))
            except Exception as e:
                print(f"Error in create tools: {e}")
        return tools

