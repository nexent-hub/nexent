![Nexent Banner](./assets/NexentBanner.png)

[![English](https://img.shields.io/badge/English-README-blue)](README.md)
[![中文](https://img.shields.io/badge/中文-README-green)](README_CN.md)

Nexent is an open-source agent SDK and platform that turns a single prompt into a complete multimodal service — no diagrams, no wiring. Built on MCP tool ecosystem, Nexent provides flexible model integration, scalable data processing, and robust knowledge-base management. Our goal is simple: to bring data, models, and tools together in one smart hub, so anyone can easily integrate Nexent into projects and make daily workflows smarter and more connected.

> One prompt. Endless reach.

# 🤝 Join Our Community

> *If you want to go fast, go alone; if you want to go far, go together.*

We're still in our very first open-source phase and aiming for **Nexent v1-stable in June 2025**. Until then we'll keep shipping core features rapidly — and we'd love your help:

* **📋 Follow the [Roadmap(Comming)](#)** to see what's next.  
* **🔍 Try the current build** and leave ideas or bugs in the [Issues](https://github.com/nexent-hub/nexent/issues) tab.

> *Rome wasn't built in a day.*

Many of our key capabilities are still under active development, but if our vision speaks to you, jump in via the **[Contribution Guide](CONTRIBUTING.md)** and shape Nexent with us.

Early contributors won't go unnoticed: from special badges and swag to other tangible rewards, we're committed to thanking the pioneers who help bring Nexent to life.

Most of all, we need visibility. Star ⭐ and watch the repo, share it with friends, and help more developers discover Nexent — your click brings new hands to the project and keeps the momentum growing.

# ⚡ Have a try first

### 1. 📋 Prerequisites  

| Resource | Minimum |
|----------|---------|
| **CPU**  | 2 cores |
| **RAM**  | 6 GiB   |
| **Software** | Docker & Docker Compose installed |

### 2. 🛠️ Quick start with Docker Compose

```bash
git clone git@github.com:nexent-hub/nexent.git
sh docker/deploy.sh
```

When the containers are running, open **http://localhost:3000** in your browser and follow the setup wizard.

### 3. ❓ Need help?

- Browse the [FAQ](FAQ.md) for common install issues.  
- Drop questions in our [Discord community](https://discord.gg/tb5H3S3wyv).  
- File bugs or feature ideas in [GitHub Issues](https://github.com/nexent-hub/nexent/issues).

> ℹ️ Due to core features development, currently, we only support Jina Embedding model. Support for other models will be added in future releases. For Jina API key setup, please refer to our [FAQ](FAQ.md).

#### 4. 🔧 Hack on Nexent

Want to build from source or add new features? Check the [Contribution Guide](CONTRIBUTING.md) for step-by-step instructions.

#### 5. 🛠️ Build from Source

Prefer to run Nexent from source code? Follow our [Developer Guide](DEVELOPPER_NOTE.md) for detailed setup instructions and customization options.

## ✨ Key Features

`1` **Smart agent prompt generation (To Release)**  
   Turn plain language into runnable prompts. Nexent automatically chooses the right tools and plans the best action path for every request.

   ![Feature 1](./assets/Feature1.png)

`2` **Scalable data process engine**  
   Process 20+ data formats with fast OCR and table structure extraction, scaling smoothly from a single process to large-batch pipelines.

   ![Feature 2](./assets/Feature2.png)

`3` **Personal-grade knowledge base**  
   Import files in real time, auto-summarise them, and let agents access both personal and global knowledge instantly, also knowing what it can get from each knowledge base.

   ![Feature 3](./assets/Feature3.png)

`4` **Internet knowledge search**  
   Connect to 5+ web search providers so agents can mix fresh internet facts with your private data.

   ![Feature 4](./assets/Feature4.png)

`5` **Knowledge-level traceability**  
   Serve answers with precise citations from web and knowledge-base sources, making every fact verifiable.

   ![Feature 5](./assets/Feature5.png)

`6` **Multimodal understanding & dialogue**  
   Speak, type, files, or show images. Nexent understands voice, text, and pictures, and can even generate new images on demand.

   ![Feature 6](./assets/Feature6.png)

`7` **MCP tool ecosystem**  
   Drop in or build Python plug-ins that follow the MCP spec; swap models, tools, and chains without touching core code.

   ![Feature 7](./assets/Feature7.png)

# 🐛 Known Issues

1. 🔄 **Knowledge Base Refresh Delays**  
   We are aware that the knowledge base refresh mechanism currently has some delays, occasional errors, or instances where refreshes don't take effect. We plan to refactor this part soon, but please note that this is only a task management logic issue - the actual data processing speed is not affected.

2. 🤖 **Limited Model Provider Support**  
   We currently have limited support for different model providers, including voice and multimodal models. We will be rapidly updating this support in the coming weeks - stay tuned for updates!

3. 🎨 **Missing Agent Creation & Configuration Interface**  
   We acknowledge that we currently don't provide a visualization interface for agent creation, tool selection, and configuration. We plan to implement this feature in the coming weeks to make the agent creation process more intuitive and user-friendly.

# 👥 Contributing

We welcome all kinds of contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes Nexent better for everyone. 

- 📖 Read our [Contribution Guide](CONTRIBUTING.md) to get started
- 🐛 Report bugs or suggest features in [GitHub Issues](https://github.com/nexent-hub/nexent/issues)
- 💬 Join our [Discord community](https://discord.gg/tb5H3S3wyv) to discuss ideas

# 💬 Community & contact

Join our [Discord community](https://discord.gg/tb5H3S3wyv) to chat with other developers and get help!

# 📄 License

Nexent is licensed under the [Apache License 2.0](LICENSE) with additional conditions. Please read the [LICENSE](LICENSE) file for details.

