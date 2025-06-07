import concurrent.futures
import logging

import yaml
from smolagents import OpenAIServerModel
from smolagents.utils import BASE_BUILTIN_MODULES
from smolagents.agents import populate_template
from jinja2 import StrictUndefined, Template

from consts.model import AgentInfoRequest
from services.agent_service import get_enable_tool_id_by_agent_id
from database.agent_db import query_sub_agents, update_agent, \
    query_tools_by_ids
from utils.user_utils import get_user_info
from utils.config_utils import config_manager

# Configure logging
logger = logging.getLogger("prompt service")


def call_llm_for_system_prompt(user_prompt: str, system_prompt: str) -> str:
    """
    Call LLM to generate system prompt

    Args:
        user_prompt: description of the current task
        system_prompt: system prompt for the LLM

    Returns:
        str: Generated system prompt
    """
    logger.info("Calling LLM for system prompt generation")

    llm = OpenAIServerModel(
        model_id=config_manager.get_config('LLM_MODEL_NAME'),
        api_base=config_manager.get_config('LLM_MODEL_URL'),
        api_key=config_manager.get_config('LLM_API_KEY'),
        temperature=0.3,
        top_p=0.95
    )
    messages = [{"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}]
    try:
        response = llm(messages)
        logger.info("Successfully generated prompt from LLM")
        return response.content.strip()
    except Exception as e:
        logger.error(f"Failed to generate prompt from LLM: {str(e)}")
        raise e


def generate_and_save_system_prompt_impl(agent_id: int, task_description: str):
    logger.info(f"Starting prompt generation for agent_id: {agent_id}")
    user_id, tenant_id = get_user_info()

    # Get description of tool and agent
    tool_info_list = get_enabled_tool_description_for_generate_prompt(
        tenant_id=tenant_id, agent_id=agent_id, user_id=user_id
    )
    sub_agent_info_list = get_enabled_sub_agent_description_for_generate_prompt(
        tenant_id=tenant_id, agent_id=agent_id, user_id=user_id
    )
    system_prompt = generate_system_prompt(sub_agent_info_list, task_description, tool_info_list)

    # Update agent with task_description and prompt
    logger.info("Updating agent with business_description and prompt")
    agent_info = AgentInfoRequest(
        agent_id=agent_id,
        business_description=task_description,
        prompt=system_prompt
    )
    update_agent(
        agent_id=agent_id,
        agent_info=agent_info,
        tenant_id=tenant_id,
        user_id=user_id
    )

    logger.info("Prompt generation and agent update completed successfully")
    return system_prompt


def generate_system_prompt(sub_agent_info_list, task_description, tool_info_list):
    with open('backend/prompts/utils/prompt_generate.yaml', "r", encoding="utf-8") as f:
        prompt_for_generate = yaml.safe_load(f)
    
    # Get app information from environment variables
    app_name = config_manager.get_config('APP_NAME', 'Nexent')
    app_description = config_manager.get_config('APP_DESCRIPTION', 'Nexent 是一个开源智能体SDK和平台')
    
    # Add app information to the template variables
    content = join_info_for_generate_system_prompt(prompt_for_generate, sub_agent_info_list, task_description,
                                                   tool_info_list)
    # Generate prompts using thread pool
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        duty_future = executor.submit(call_llm_for_system_prompt, content, prompt_for_generate["DUTY_SYSTEM_PROMPT"])
        constraint_future = executor.submit(call_llm_for_system_prompt, content,
                                            prompt_for_generate["CONSTRAINT_SYSTEM_PROMPT"])
        few_shots_future = executor.submit(call_llm_for_system_prompt, content,
                                           prompt_for_generate["FEW_SHOTS_SYSTEM_PROMPT"])
        duty_prompt = duty_future.result()
        constraint_prompt = constraint_future.result()
        few_shots_prompt = few_shots_future.result()
    prompt_template_path = "backend/prompts/manager_system_prompt_template.yaml" if len(sub_agent_info_list) > 0 else \
        "backend/prompts/managed_system_prompt_template.yaml"
    with open(prompt_template_path, "r", encoding="utf-8") as file:
        prompt_template = yaml.safe_load(file)
    # Populate template with variables
    logger.info("Populating template with variables")
    system_prompt = populate_template(
        prompt_template["system_prompt"],
        # need_filled_system_prompt,
        variables={
            "duty": duty_prompt,
            "constraint": constraint_prompt,
            "few_shots": few_shots_prompt,
            "tools": {tool.get("name"): tool for tool in tool_info_list},
            "managed_agents": {sub_agent.get("name"): sub_agent for sub_agent in sub_agent_info_list},
            "authorized_imports": str(BASE_BUILTIN_MODULES),
            "APP_NAME": app_name,
            "APP_DESCRIPTION": app_description
        },
    )
    return system_prompt

def join_info_for_generate_system_prompt(prompt_for_generate, sub_agent_info_list, task_description, tool_info_list, app_name=None, app_description=None):
    tool_description = "\n".join(
        [f"- {tool['name']}: {tool['description']} \n 接受输入: {tool['inputs']}\n 返回输出类型: {tool['output_type']}"
         for tool in tool_info_list])
    agent_description = "\n".join(
        [f"- {sub_agent_info['name']}: {sub_agent_info['description']}" for sub_agent_info in sub_agent_info_list])
    # Generate content using template
    compiled_template = Template(prompt_for_generate["USER_PROMPT"], undefined=StrictUndefined)
    content = compiled_template.render({
        "tool_description": tool_description,
        "agent_description": agent_description,
        "task_description": task_description,
        "APP_NAME": app_name,
        "APP_DESCRIPTION": app_description
    })
    return content

def get_enabled_tool_description_for_generate_prompt(agent_id: int, tenant_id: str, user_id: str = None):
    # Get tool information
    logger.info("Fetching tool instances")
    tool_id_list = get_enable_tool_id_by_agent_id(agent_id=agent_id, tenant_id=tenant_id, user_id=user_id)
    tool_info_list = query_tools_by_ids(tool_id_list)
    return tool_info_list

def get_enabled_sub_agent_description_for_generate_prompt(agent_id: int, tenant_id: str, user_id: str = None):
    logger.info("Fetching sub-agents information")
    sub_agent_raw_info_list = query_sub_agents(main_agent_id=agent_id, tenant_id=tenant_id, user_id=user_id)
    logger.info(f"Found {len(sub_agent_raw_info_list)} sub-agents")

    sub_agent_info_list = []
    for sub_agent_raw_info in sub_agent_raw_info_list:
        if not sub_agent_raw_info["enabled"]:
            continue
        sub_agent_info_list.append(sub_agent_raw_info)
    return sub_agent_info_list


def fine_tune_prompt(system_prompt: str, command: str):
    logger.info("Starting prompt fine-tuning")

    try:
        with open('backend/prompts/utils/prompt_fine_tune.yaml', "r", encoding="utf-8") as f:
            prompt_for_fine_tune = yaml.safe_load(f)

        compiled_template = Template(prompt_for_fine_tune["FINE_TUNE_USER_PROMPT"], undefined=StrictUndefined)
        content = compiled_template.render({
            "prompt": system_prompt,
            "command": command
        })

        logger.info("Calling LLM for prompt fine-tuning")
        regenerate_prompt = call_llm_for_system_prompt(
            user_prompt=content,
            system_prompt=prompt_for_fine_tune["FINE_TUNE_SYSTEM_PROMPT"]
        )
        logger.info("Successfully completed prompt fine-tuning")
        return regenerate_prompt

    except Exception as e:
        logger.error(f"Error in prompt fine-tuning process: {str(e)}")
        raise e
