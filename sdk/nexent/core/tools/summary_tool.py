from typing import List
from pydantic import Field
from smolagents.models import MessageRole
from smolagents.tools import Tool

from ..models import OpenAIModel
from ..utils import MessageObserver, ProcessType

default_system_prompt = ("# 你是一个总结专家，你的任务是根据检索结果回答用户问题。\n"
                         "你需要按照以下要求进行总结：\n"
                         "1.使用Markdown格式格式化你的输出。\n"
                         "2.在回答的对应位置添加引用标记，格式为'[[index]]'，其中index为引用的序号。注意仅添加引用标记，不需要添加链接、参考文献等多余内容。\n"
                         "3.你的回答需要有标题和正文。\n"
                         "4.注意不要在这里引用变量，直接进行文字输出，这里不会用代码方式执行你输出的内容。")


class SummaryTool(Tool):
    name = "summary_content"
    description = """This is a tool for summarizing content. It can generate a response that satisfies the user. 
    It requires the user's question and the search result of the search tool. 
    The returned content should be directly used as the input of final_answer."
    """
    inputs = {
        "query": {"type": "string", "description": "Input the user's question"},
        "content": {
            "type": "array",
            "description": "A list of strings, each representing the **original information** previously retrieved, directly input the variable after retrieval, do not summarize it."
        }
    }
    output_type = "string"

    def __init__(self, model: OpenAIModel=Field(description="模型"),
                 system_prompt: str = Field(description="系统提示", default=default_system_prompt)):
        super().__init__()
        self.model = model
        self.observer = MessageObserver()
        self.system_prompt = system_prompt
        self.running_prompt = "总结生成中..."

    def forward(self, query: str, content: List[str]) -> str:
        # 发送工具运行消息
        self.observer.add_message("", ProcessType.TOOL, self.running_prompt)

        result_concat = ""
        for content_str in content:
            result_concat += content_str + "\n"

        messages = [{"role": MessageRole.SYSTEM, "content": self.system_prompt},
            {"role": MessageRole.USER, "content": f"### Related information：{result_concat}\n### User question：{query}\n"}]
        model_output_message = self.model(messages=messages)

        return model_output_message.content
