![Nexent Banner](./assets/NexentBanner.png)

[![English](https://img.shields.io/badge/English-README-blue)](README.md)
[![中文](https://img.shields.io/badge/中文-README-green)](README_CN.md)

Nexent 是一个开源智能体平台，能够将流程的自然语言转化为完整的多模态智能体 —— 无需编排，无需复杂拖拉拽。基于 MCP 工具生态，Nexent 提供强大的模型集成、数据处理、知识库管理、零代码智能体开发能力。我们的目标很简单：将数据、模型和工具整合到一个智能中心中，使日常工作流程更智能、更互联。

> 一个提示词，无限种可能。

### 🌟 立即体验 Nexent

- 🌐 访问我们的[官方网站](http://nexent.tech/)了解更多信息
- 🚀 [一键试用](http://nexent.tech/try)体验 Nexent 的强大功能

https://github.com/user-attachments/assets/0758629c-3477-4cd4-a737-0aab330d53a7

# 🤝 加入我们的社区

> *If you want to go fast, go alone; if you want to go far, go together.*

我们仍处于首个开源阶段，目标是在 **2025 年 6 月发布 Nexent v1 稳定版**。在此之前，我们将持续快速发布核心功能 —— 我们期待您的参与：

* **🗺️ 查看我们的 [功能地图](https://github.com/orgs/ModelEngine-Group/projects/6)** 探索当前和即将推出的功能。
* **🔍 试用当前版本** 并在 [问题反馈](https://github.com/ModelEngine-Group/nexent/issues) 中留下想法或报告错误。

> *Rome wasn't built in a day.*

虽然许多关键功能仍在积极开发中，但如果我们的愿景与您产生共鸣，请通过 **[贡献指南](CONTRIBUTING_CN.md)** 加入我们，共同塑造 Nexent。

早期贡献者不会被忽视：从特殊徽章和纪念品到其他实质性奖励，我们致力于感谢那些帮助 Nexent 诞生的先驱者。

最重要的是，我们需要关注度。请为仓库点星 ⭐ 并关注，与朋友分享，帮助更多开发者发现 Nexent —— 您的每一次点击都能为项目带来新的参与者，保持发展势头。

# ⚡ 先来试试看

### 1. 📋 系统要求  

| 资源 | 最低要求 |
|----------|---------|
| **CPU**  | 2 核 |
| **内存**  | 6 GiB   |
| **软件** | 已安装 Docker 和 Docker Compose |

### 2. 🛠️ 使用 Docker Compose 快速开始

```bash
git clone https://github.com/ModelEngine-Group/nexent.git
cd nexent/docker
cp .env.example .env # fill only nessasary configs
bash deploy.sh
```

当容器运行后，在浏览器中打开 **http://localhost:3000** 并按照设置向导操作。

### 3. 🤖 模型配置与模型提供商推荐

我们建议使用以下模型提供商：

| 模型类型 | 提供商 | 说明 |
|------------|----------|-------|
| LLM 与 VLLM | [硅基流动](https://siliconflow.cn/) | 提供免费额度 |
| LLM 与 VLLM | [阿里云百炼](https://bailian.console.aliyun.com/) | 提供免费额度 |
| Embedding | [Jina](https://jina.ai/) | 提供免费额度 |
| TTS 与 STT | [火山引擎语音](https://www.volcengine.com/product/voice-tech) | 个人用户免费 |
| 搜索 | [EXA](https://exa.ai/) | 提供免费额度 |

您需要在模型配置页面输入以下信息：
- Base URL
- API Key
- Model Name

以下配置需要添加到您的 `.env` 文件中（我们将尽快把这些配置前端化）：
- TTS 与 STT 相关配置
- EXA 搜索 API Key

> ℹ️ 由于开发紧张，目前我们仅支持 Jina Embedding 模型。其他模型的支持将在未来版本中添加。有关 Jina API 密钥获取，请参阅我们的[常见问题](FAQ_CN.md)。

### 4. ❓ 需要帮助？

- 浏览 [常见问题](FAQ_CN.md) 了解常见安装问题。  
- 在我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 中提问。  
- 在 [GitHub Issues](https://github.com/ModelEngine-Group/nexent/issues) 中提交错误报告或功能建议。

### 5. 🔧 开发 Nexent

想要从源代码构建或添加新功能？查看 [贡献指南](CONTRIBUTING_CN.md) 获取分步说明。

### 6. 🛠️ 从源码构建

想要从源码运行 Nexent？查看我们的[开发者指南](DEVELOPPER_NOTE_CN.md)获取详细的设置说明和自定义选项。

## ✨ 主要特性

`1` **智能体提示词自动生成**  
   将自然语言转化为可被Agent执行的提示词。Nexent可以根据你的需要自动选择正确的工具并为每个请求规划最佳执行路径。

   ![Feature 1](./assets/Feature1.png)

`2` **可扩展数据处理引擎**  
   支持 20+ 数据格式的快速 OCR 和表格结构提取，从单进程到大规模批处理管道都能平滑扩展。

   ![Feature 2](./assets/Feature2.png)

`3` **个人级知识库**  
   实时导入文件，自动总结，让智能体能够即时访问个人和全局知识，并了解每个知识库能提供什么。

   ![Feature 3](./assets/Feature3.png)

`4` **互联网知识搜索**  
   连接 5+ 个网络搜索提供商，让智能体能够将最新的互联网信息与您的私有数据结合。

   ![Feature 4](./assets/Feature4.png)

`5` **知识级可追溯性**  
   提供来自网络和知识库来源的精确引用，使每个事实都可验证。

   ![Feature 5](./assets/Feature5.png)

`6` **多模态理解与对话**  
   说话、打字、文件或展示图片。Nexent 理解语音、文本和图片，甚至可以根据需求生成新图像。

   ![Feature 6](./assets/Feature6.png)

`7` **MCP 工具生态系统**  
   插入或构建符合 MCP 规范的 Python 插件；无需修改核心代码即可更换模型、工具和链。

   ![Feature 7](./assets/Feature7.png)

# 🐛 已知问题

1. 🔄 **知识库刷新延迟**  
   我们已知知识库刷新机制目前存在一些延迟的情况。我们计划尽快重构这一部分，但请注意这仅是任务管理的逻辑问题，实际的数据处理速度不受影响。

2. 🤖 **模型供应商支持有限**  
   我们目前对不同的模型供应商支持有限，包括语音和多模态模型。我们将在未来几周内快速更新这些支持，请保持关注！

3. 📦 **Docker镜像体积较大**  
   我们注意到当前的Docker镜像体积较大（10GB左右），这是因为包含了强大的可扩展的数据处理引擎和数据处理算法与模型，我们会尽快推出Lite版的镜像以减少镜像体积，以便让部署更快更轻量。

# 👥 贡献指南

我们欢迎各种形式的贡献！无论是修复错误、添加功能还是改进文档，您的帮助都能让 Nexent 变得更好。

- 📖 阅读我们的[贡献指南](CONTRIBUTING_CN.md)开始贡献
- 🐛 在 [GitHub Issues](https://github.com/ModelEngine-Group/nexent/issues) 中报告错误或提出功能建议
- 💬 加入我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 讨论想法

# 💬 社区与联系方式

加入我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 与其他开发者交流并获取帮助！

# 📄 许可证

Nexent 采用 [MIT](LICENSE) 许可证，并附有额外条件。请阅读 [LICENSE](LICENSE) 文件了解详情。
