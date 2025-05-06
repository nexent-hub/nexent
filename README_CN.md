![Nexent Banner](./assets/NexentBanner.png)

[![English](https://img.shields.io/badge/English-README-blue)](README.md)
[![中文](https://img.shields.io/badge/中文-README-green)](README_CN.md)

Nexent 是一个开源智能体SDK和平台，能够将描述流程的自然语言转化为完整的多模态服务 —— 无需编排，无需复杂拖拉拽。基于 MCP 工具生态系统构建，Nexent 提供灵活的模型集成、可扩展的数据处理和强大的知识库管理。我们的目标很简单：将数据、模型和工具整合到一个智能中心中，让任何人都能轻松地将 Nexent 集成到项目中，使日常工作流程更智能、更互联。

> 一个提示词，无限种可能。

# 🤝 加入我们的社区

> *If you want to go fast, go alone; if you want to go far, go together.*

我们仍处于首个开源阶段，目标是在 **2025 年 6 月发布 Nexent v1 稳定版**。在此之前，我们将持续快速发布核心功能 —— 我们期待您的参与：

* **📋 关注 [路线图(Comming)](#)** 了解我们的下一步计划。  
* **🔍 试用当前版本** 并在 [问题反馈](https://github.com/nexent-hub/nexent/issues) 中留下想法或报告错误。

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
git clone git@github.com:nexent-hub/nexent.git
sh docker/deploy.sh
```

当容器运行后，在浏览器中打开 **http://localhost:3000** 并按照设置向导操作。

### 3. ❓ 需要帮助？

- 浏览 [常见问题](FAQ_CN.md) 了解常见安装问题。  
- 在我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 中提问。  
- 在 [GitHub Issues](https://github.com/nexent-hub/nexent/issues) 中提交错误报告或功能建议。

> ℹ️ 由于开发紧张，目前我们仅支持 Jina Embedding 模型。其他模型的支持将在未来版本中添加。有关 Jina API 密钥获取，请参阅我们的[常见问题](FAQ_CN.md)。

#### 4. 🔧 开发 Nexent

想要从源代码构建或添加新功能？查看 [贡献指南](CONTRIBUTING_CN.md) 获取分步说明。

#### 5. 🛠️ 从源码构建

想要从源码运行 Nexent？查看我们的[开发者指南](DEVELOPPER_NOTE_CN.md)获取详细的设置说明和自定义选项。

## ✨ 主要特性

`1` **智能体提示词自动生成（To release）**  
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
   我们已知知识库刷新机制目前存在一些延迟、偶尔的错误或刷新不生效的情况。我们计划尽快重构这一部分，但请注意这仅是任务管理的逻辑问题，实际的数据处理速度不受影响。

2. 🤖 **模型供应商支持有限**  
   我们目前对不同的模型供应商支持有限，包括语音和多模态模型。我们将在未来几周内快速更新这些支持，请保持关注！

3. 🎨 **缺少Agent制作与配置界面**  
   我们注意到目前还没有提供智能体制作、工具选择与配置的可视化界面。我们计划在未来几周内实现这一功能，使智能体创建过程更加直观和用户友好。

# 👥 贡献指南

我们欢迎各种形式的贡献！无论是修复错误、添加功能还是改进文档，您的帮助都能让 Nexent 变得更好。

- 📖 阅读我们的[贡献指南](CONTRIBUTING_CN.md)开始贡献
- 🐛 在 [GitHub Issues](https://github.com/nexent-hub/nexent/issues) 中报告错误或提出功能建议
- 💬 加入我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 讨论想法

# 💬 社区与联系方式

加入我们的 [Discord 社区](https://discord.gg/tb5H3S3wyv) 与其他开发者交流并获取帮助！

# 📄 许可证

Nexent 采用 [Apache License 2.0](LICENSE) 许可证，并附有额外条件。请阅读 [LICENSE](LICENSE) 文件了解详情。