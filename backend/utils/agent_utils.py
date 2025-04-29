import json
import os
import time
import yaml
from threading import Lock, Thread
from typing import List, Dict

from nexent.core import MessageObserver
from nexent.core.agents import CoreAgent
from nexent.core.models import OpenAIModel
from nexent.core.tools import EXASearchTool, KnowledgeBaseSearchTool, SummaryTool
from smolagents import TaskStep, ActionStep

from consts.const import IMAP_SERVER, IMAP_PORT, MAIL_USERNAME, MAIL_PASSWORD, SMTP_SERVER, SMTP_PORT, \
    EXA_SEARCH_API_KEY

from backend.utils.config_utils import ConfigManager


class ThreadManager:
    """Thread manager for tracking and managing all active threads"""

    def __init__(self):
        self.active_threads = {}
        self.lock = Lock()

    def add_thread(self, thread_id: str, thread: Thread, agent: CoreAgent):
        """Add a new thread"""
        with self.lock:
            self.active_threads[thread_id] = {'thread': thread, 'agent': agent, 'start_time': time.time()}

    def remove_thread(self, thread_id: str):
        """Remove a thread"""
        with self.lock:
            if thread_id in self.active_threads:
                del self.active_threads[thread_id]

    def stop_thread(self, thread_id: str):
        """Stop a thread"""
        with self.lock:
            if thread_id in self.active_threads:
                thread_data = self.active_threads[thread_id]
                agent = thread_data['agent']
                # Set stop flag
                agent.should_stop = True
                # Cancel current model request
                if hasattr(agent.model, 'cancel_request'):
                    agent.model.cancel_request()
                # Wait for thread to end
                thread_data['thread'].join(timeout=5)
                del self.active_threads[thread_id]


# Create global thread manager instance
thread_manager = ThreadManager()

# Create global configuration manager instance
config_manager = ConfigManager(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))


def create_agent():
    # Get configuration using configuration manager
    observer = MessageObserver()

    # Create models
    main_model = OpenAIModel(observer=observer, model_id=config_manager.get_config("LLM_MODEL_NAME"),
                             api_key=config_manager.get_config("LLM_API_KEY"),
                             api_base=config_manager.get_config("LLM_MODEL_URL"))
    
    # TODO: Reserve sub model for future sub agent use
    sub_model = OpenAIModel(observer=observer, model_id=config_manager.get_config("LLM_SECONDARY_MODEL_NAME"),
                            api_key=config_manager.get_config("LLM_SECONDARY_API_KEY"),
                            api_base=config_manager.get_config("LLM_SECONDARY_MODEL_URL"))

    # Create tools
    tools = [
        EXASearchTool(
            exa_api_key=EXA_SEARCH_API_KEY,
            observer=observer,
            max_results=5,
            image_filter=config_manager.get_config("IMAGE_FILTER"),
            image_filter_model_path=config_manager.get_config("IMAGE_FILTER_MODEL_PATH"),
            image_filter_threshold=0.5),
        KnowledgeBaseSearchTool(
            index_names=json.loads(config_manager.get_config("SELECTED_KB_NAMES", "[]")),
            base_url=config_manager.get_config("ELASTICSEARCH_SERVICE"),
            top_k=5,
            observer=observer),
        # GetEmailTool(
        #     imap_server=IMAP_SERVER,
        #     imap_port=IMAP_PORT,
        #     username=MAIL_USERNAME,
        #     password=MAIL_PASSWORD),
        # SendEmailTool(
        #     smtp_server=SMTP_SERVER,
        #     smtp_port=SMTP_PORT,
        #     username=MAIL_USERNAME,
        #     password=MAIL_PASSWORD)
    ]

    # Add final answer tool
    summary_tool = SummaryTool(llm=main_model)
    tools.append(summary_tool)
    
    # Read prompt templates
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.normpath(os.path.join(file_path, "../prompts/code_agent.yaml"))
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt_templates = yaml.safe_load(f)

    # Create individual Agent
    agent = CoreAgent(
        observer=observer, 
        tools=tools, 
        model=main_model, 
        name="agent", 
        max_steps=5,
        prompt_templates=prompt_templates
        )

    return agent


def add_history_to_agent(agent: CoreAgent, history: List[Dict]):
    """Add conversation history to agent's memory"""
    if not history:
        return

    # Add conversation history to memory sequentially
    for msg in history:
        if msg['role'] == 'user':
            # Create task step for user message
            agent.memory.steps.append(TaskStep(task=msg['content']))
        elif msg['role'] == 'assistant':
            agent.memory.steps.append(ActionStep(action_output=msg['content'], model_output=msg['content']))
