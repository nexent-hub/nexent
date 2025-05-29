import time
from typing import List

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# Create MCP server
mcp = FastMCP("Nexent_MCP", port=5011)

# Load environment variables
load_dotenv()

# ===== Example of how to register a tool =====

# from typing import List, Optional
# from arxiv_mcp_server.server import Server, settings
# from arxiv_mcp_server.tools import search_tool, download_tool, list_tool, read_tool
# from arxiv_mcp_server.tools import handle_search, handle_download, handle_list_papers, handle_read_paper

# # Create Arxiv server
# arxiv_server = Server(settings.APP_NAME)

# # Register Arxiv search tool
# @mcp.tool(name=search_tool.name, description=search_tool.description)
# async def search_papers(
#     query: str,
#     date_from: Optional[str] = "2017-07-01",
#     categories: Optional[List[str]] = ["cs.AI", "cs.LG"]
# ) -> str:
#     """search papers from arxiv

#     parameters:
#         query (str): search keywords, required to use English
#         date_from (str, optional): start date, format as YYYY-MM-DD, default is "2025-01-01"
#         categories (List[str], optional): paper categories, default is ["cs.AI", "cs.LG"]

#     return:
#         str: all search results
#     """
#     arguments = {
#         "query": query,
#         "max_results": 1,
#         "date_from": date_from,
#         "categories": categories
#     }
#     results = await handle_search(arguments)
#     # merge all results into a string
#     return "\n\n".join(result.text for result in results)

# # Register Arxiv paper download tool
# @mcp.tool(name=download_tool.name, description=download_tool.description)
# async def download_paper(paper_id: str) -> str:
#     """download the paper from arxiv.

#     parameters:
#         paper_id (str): arxiv paper id, e.g. "2401.12345"

#     return:
#         str: download results
#     """
#     arguments = {"paper_id": paper_id}
#     results = await handle_download(arguments)
#     return "\n\n".join(result.text for result in results)

# # Register Arxiv paper list tool
# @mcp.tool(name=list_tool.name, description=list_tool.description)
# async def list_papers() -> str:
#     """list all downloaded papers from arxiv.

#     return:
#         str: all papers list
#     """
#     arguments = {}
#     results = await handle_list_papers(arguments)
#     return "\n\n".join(result.text for result in results)

# # Register Arxiv paper read tool
# @mcp.tool(name=read_tool.name, description=read_tool.description)
# async def read_paper(paper_id: str) -> str:
#     """read the downloaded paper from arxiv.
#
#     parameters:
#         paper_id (str): arxiv paper id, e.g. "2401.12345"
#
#     return:
#         str: paper content
#     """
#     arguments = {"paper_id": paper_id}
#     results = await handle_read_paper(arguments)
#     return "\n\n".join(result.text for result in results)

@mcp.tool(name="test_tool_name", description="test_tool_description")
async def demo_tool(para_1: str, para_2: int, para_3: List[str], para_4: dict, para_5: bool) -> str:
    time.sleep(1)
    return ""


if __name__ == "__main__":
    print("Starting Search Tools MCP Server...")
    mcp.run(transport="sse")
