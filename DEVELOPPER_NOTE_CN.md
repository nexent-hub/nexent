# Nexent 开发者指南 🛠️

[![English](https://img.shields.io/badge/English-Guide-blue)](DEVELOPPER_NOTE.md)
[![中文](https://img.shields.io/badge/中文-指南-green)](DEVELOPPER_NOTE_CN.md)

本指南将帮助开发者快速上手 Nexent 的开发工作，包括环境搭建、工具开发和智能体定制。

## 第一章：环境搭建与运行 🚀

### 1. 安装依赖
```bash
# 进入 SDK 目录
cd sdk

# 安装核心依赖
pip install .
```

### 2. 启动后端服务
Nexent 包含三个核心后端服务，需要分别启动：

```bash
# 启动数据处理服务
python backend/data_process_service.py

# 启动主服务
python backend/main_service.py

# 启动 MCP 服务
python backend/mcp_service.py
```

### 3. 启动前端服务
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 第二章：开发自定义工具 🛠️

Nexent 基于 [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/python-sdk) 实现工具系统。开发新工具需要：

1. 在 `mcp_service.py` 中实现工具逻辑
2. 使用 `@mcp.tool()` 装饰器注册工具
3. 重启 MCP 服务使新工具生效

示例：
```python
@mcp.tool(name="my_tool", description="我的自定义工具")
def my_tool(param1: str, param2: int) -> str:
    # 实现工具逻辑
    return f"处理结果: {param1} {param2}"
```

## 第三章：开发自定义智能体 🤖

### 1. 系统提示词
系统提示词模板位于 `sdk/nexent/core/prompts` 目录下，包括：
- `code_agent.yaml`: 基础智能体提示词
- `code_agent_demo.yaml`: 演示用途智能体提示词

### 2. 智能体实现
参考 `agent_utils.py` 中的实现方式：

1. 创建智能体实例：
```python
from nexent.core.agents import CoreAgent
from nexent.core.models import OpenAIModel

# 创建模型实例
model = OpenAIModel(
    model_id="your-model-id",
    api_key="your-api-key",
    api_base="your-api-base"
)

# 创建智能体
agent = CoreAgent(
    model=model,
    tools=[your_tools],  # 添加你的工具
    system_prompt="你的系统提示词"  # 自定义系统提示词
)
```

2. 添加工具和配置：
- 在 `tools` 参数中添加自定义工具
- 通过 `system_prompt` 设置智能体行为
- 配置其他参数如 `max_steps`、`temperature` 等

## 注意事项 ⚠️

1. 确保所有服务都正确启动后再进行测试
2. 修改代码后需要重启相应服务
3. 建议在开发环境中使用调试模式
4. 遵循 MCP 协议规范开发工具
5. 系统提示词需要经过充分测试

## 获取帮助 💬

- 查看 [常见问题](FAQ_CN.md)
- 加入 [Discord 社区](https://discord.gg/tb5H3S3wyv)
- 提交 [GitHub Issues](https://github.com/nexent-hub/nexent/issues)
