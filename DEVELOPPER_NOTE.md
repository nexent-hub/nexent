# Nexent Developer Guide 🛠️

[![English](https://img.shields.io/badge/English-Guide-blue)](DEVELOPPER_NOTE.md)
[![中文](https://img.shields.io/badge/中文-指南-green)](DEVELOPPER_NOTE_CN.md)

This guide will help developers quickly get started with Nexent development, including environment setup, tool development, and agent customization.

## Chapter 1: Environment Setup and Running 🚀

### 1. Install Dependencies
```bash
# Navigate to SDK directory
cd sdk

# Install core dependencies
pip install .
```

### 2. Start Backend Services
Nexent consists of three core backend services that need to be started separately:

```bash
# Start data processing service
python backend/data_process_service.py

# Start main service
python backend/main_service.py

# Start MCP service
python backend/mcp_service.py
```

### 3. Start Frontend Service
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Chapter 2: Developing Custom Tools 🛠️

Nexent implements its tool system based on [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/python-sdk). To develop a new tool:

1. Implement the tool logic in `mcp_service.py`
2. Register the tool using the `@mcp.tool()` decorator
3. Restart the MCP service to activate the new tool

Example:
```python
@mcp.tool(name="my_tool", description="My custom tool")
def my_tool(param1: str, param2: int) -> str:
    # Implement tool logic
    return f"Processing result: {param1} {param2}"
```

## Chapter 3: Developing Custom Agents 🤖

### 1. System Prompts
System prompt templates are located in the `sdk/nexent/core/prompts` directory, including:
- `code_agent.yaml`: Base agent prompt
- `code_agent_demo.yaml`: Demo agent prompt

### 2. Agent Implementation
Refer to the implementation in `agent_utils.py`:

1. Create an agent instance:
```python
from nexent.core.agents import CoreAgent
from nexent.core.models import OpenAIModel

# Create model instance
model = OpenAIModel(
    model_id="your-model-id",
    api_key="your-api-key",
    api_base="your-api-base"
)

# Create agent
agent = CoreAgent(
    model=model,
    tools=[your_tools],  # Add your tools
    system_prompt="Your system prompt"  # Custom system prompt
)
```

2. Add tools and configuration:
- Add custom tools in the `tools` parameter
- Set agent behavior through `system_prompt`
- Configure other parameters like `max_steps`, `temperature`, etc.

## Important Notes ⚠️

1. Ensure all services are properly started before testing
2. Restart the relevant service after code modifications
3. Use debug mode in development environment
4. Follow MCP protocol specifications when developing tools
5. System prompts need thorough testing

## Getting Help 💬

- Check the [FAQ](FAQ.md)
- Join our [Discord community](https://discord.gg/tb5H3S3wyv)
- Submit [GitHub Issues](https://github.com/nexent-hub/nexent/issues) 