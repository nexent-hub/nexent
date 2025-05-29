import time
import logging

from threading import Lock, Thread
from typing import List, Dict

from nexent.core.agents import CoreAgent
from smolagents import TaskStep, ActionStep

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent_util")


class ThreadManager:
    """Thread manager for tracking and managing all active threads"""

    def __init__(self):
        self.active_threads = {}
        self.lock = Lock()

    def add_thread(self, thread_id: str, thread: Thread):
        """Add a new thread to the manager with its ID and start time"""
        with self.lock:
            self.active_threads[thread_id] = {'thread': thread, 'start_time': time.time()}

    def remove_thread(self, thread_id: str):
        """Remove a thread from the manager by its ID"""
        with self.lock:
            if thread_id in self.active_threads:
                del self.active_threads[thread_id]

    def stop_thread(self, thread_id: str):
        """Stop a running thread by its ID and remove it from the manager"""
        with self.lock:
            if thread_id in self.active_threads:
                thread_data = self.active_threads[thread_id]
                thread_data['thread'].join(timeout=5)
                del self.active_threads[thread_id]


# Create global thread manager instance
thread_manager = ThreadManager()


def add_history_to_agent(agent: CoreAgent, history: List[Dict]):
    """
    Add conversation history to agent's memory
    
    Args:
        agent: The CoreAgent instance to update
        history: List of conversation messages with role and content
    """
    if not history:
        return

    agent.memory.reset()
    # Add conversation history to memory sequentially
    for msg in history:
        if msg['role'] == 'user':
            # Create task step for user message
            agent.memory.steps.append(TaskStep(task=msg['content']))
        elif msg['role'] == 'assistant':
            agent.memory.steps.append(ActionStep(action_output=msg['content'], model_output=msg['content']))


