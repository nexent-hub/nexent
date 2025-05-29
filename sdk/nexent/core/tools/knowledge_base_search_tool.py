import json
from typing import List

import requests
from smolagents.tools import Tool

from ..utils import MessageObserver, ProcessType
from ..utils.tools_common_message import SearchResultTextMessage
from pydantic import Field

class KnowledgeBaseSearchTool(Tool):
    """Knowledge base search tool supporting Chinese and English"""
    name = "knowledge_base_search"
    description = "Performs a local knowledge base search based on your query then returns the top search results. " \
                  "A tool for retrieving internal company documents, policies, processes and proprietary information. Use this tool when users ask questions related to internal company matters, product details, organizational structure, internal processes, or confidential information. " \
                  "Prioritize for company-specific queries. " \
                  "Use for proprietary knowledge or restricted information" \
                  "Avoid for publicly available general knowledge"
    inputs = {"query": {"type": "string", "description": "The search query to perform."}}
    output_type = "string"

    tool_sign = "a"  # Used to distinguish different index sources for summaries

    base_url = "http://localhost:5010/api"
    index_names = []

    def __init__(self, top_k: int = Field(description="返回结果数量", default=5),
                 observer: MessageObserver = Field(description="消息观察者", default=None, exclude=True)):
        """Initialize the KBSearchTool.
        
        Args:
            top_k (int, optional): Number of results to return. Defaults to 5.
            observer (MessageObserver, optional): Message observer instance. Defaults to None.
        
        Raises:
            ValueError: If language is not supported
        """
        super().__init__()
        self.top_k = top_k
        self.observer = observer
        self.record_ops = 0  # To record serial number
        self.running_prompt = "知识库检索中..."

    def update_search_index_names(self, index_names: List[str]):
        self.index_names = index_names

    def update_base_url(self, base_url):
        self.base_url = base_url

    def forward(self, query: str) -> str:
        # Send tool run message
        self.observer.add_message("", ProcessType.TOOL, self.running_prompt)
        card_content = [{"icon": "search", "text": query}]
        self.observer.add_message("", ProcessType.CARD, json.dumps(card_content, ensure_ascii=False))

        kb_search_response = requests.post(f"{self.base_url}/indices/search/hybrid",
            json={"index_names": self.index_names, "query": query, "top_k": self.top_k})

        if kb_search_response.status_code != 200:
            raise Exception(f"Search request failed: {kb_search_response.text}")

        kb_search_data = kb_search_response.json()
        kb_search_results = kb_search_data["results"]

        if not kb_search_results:
            raise Exception("No results found! Try a less restrictive/shorter query.")

        search_results_json = []  # Organize search results into a unified format
        search_results_return = []  # Format for input to the large model
        for index, single_search_result in enumerate(kb_search_results):
            search_result_message = SearchResultTextMessage(title=single_search_result.get("title", ""),
                text=single_search_result.get("content", ""), source_type=single_search_result.get("source_type", ""),
                url=single_search_result.get("path_or_url", ""), filename=single_search_result.get("filename", ""),
                published_date=single_search_result.get("create_time", ""), score=single_search_result.get("score", 0),
                score_details=single_search_result.get("score_details", {}), cite_index=self.record_ops + index,
                search_type=self.name, tool_sign=self.tool_sign)

            search_results_json.append(search_result_message.to_dict())
            search_results_return.append(search_result_message.to_model_dict())

        self.record_ops += len(search_results_return)

        # Record the detailed content of this search
        if self.observer:
            search_results_data = json.dumps(search_results_json, ensure_ascii=False)
            self.observer.add_message("", ProcessType.SEARCH_CONTENT, search_results_data)
        return json.dumps(search_results_return, ensure_ascii=False)