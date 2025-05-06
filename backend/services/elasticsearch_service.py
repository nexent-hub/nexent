"""
Elasticsearch应用程序接口模块

这个模块提供了与Elasticsearch交互的REST API接口，包括索引管理、文档操作和搜索功能。
主要功能包括：
1. 索引的创建、删除和查询
2. 文档的索引、删除和搜索
3. 支持多种搜索方式：精确搜索、语义搜索和混合搜索
4. 健康检查接口
"""

import os
import time
from typing import Optional

import requests
from nexent.core.models.embedding_model import JinaEmbedding
from nexent.vector_database.elasticsearch_core import ElasticSearchCore
from fastapi import HTTPException, Query, Body, Path, Depends

from consts.const import ES_API_KEY, DATA_PROCESS_SERVICE, CREATE_TEST_KB, ES_HOST
from consts.model import IndexingRequest, IndexingResponse, SearchRequest, HybridSearchRequest
from utils.agent_utils import config_manager
from utils.elasticsearch_utils import get_active_tasks_status


# Initialize ElasticSearchCore instance with HTTPS support
elastic_core = ElasticSearchCore(
    init_test_kb=CREATE_TEST_KB,
    host=ES_HOST,
    api_key=ES_API_KEY,
    embedding_model=None,
    verify_certs=False,
    ssl_show_warn=False,
)


def get_es_core():
    # ensure embedding model is latest
    elastic_core.embedding_model = JinaEmbedding(api_key=config_manager.get_config("EMBEDDING_API_KEY"))
    return elastic_core


class ElasticSearchService:
    # 索引管理接口
    @staticmethod
    def create_index(
            index_name: str = Path(..., description="Name of the index to create"),
            embedding_dim: Optional[int] = Query(None, description="Dimension of the embedding vectors"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        创建新的向量索引

        Args:
            index_name: 要创建的索引名称
            embedding_dim: 向量维度（可选）
            es_core: ElasticSearchCore实例

        Returns:
            成功时返回索引创建信息，失败时抛出HTTP异常
        """
        try:
            success = es_core.create_vector_index(index_name, embedding_dim)

            if success:
                return {
                    "status": "success",
                    "message": f"Index {index_name} created successfully",
                    "embedding_dim": embedding_dim or es_core.embedding_dim
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create index {index_name}"
                )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error creating index: {str(e)}"
            )

    @staticmethod
    def delete_index(
            index_name: str = Path(..., description="Name of the index to delete"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        success = es_core.delete_index(index_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Index {index_name} not found or could not be deleted")
        return {"status": "success", "message": f"Index {index_name} deleted successfully"}

    @staticmethod
    def list_indices(
            pattern: str = Query("*", description="Pattern to match index names"),
            include_stats: bool = Query(False, description="Whether to include index stats"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """List all user indices with optional stats"""
        indices = es_core.get_user_indices(pattern)

        if include_stats:
            # 获取所有索引的统计信息
            all_stats = es_core.get_all_indices_stats(pattern)

            # 构建包含统计信息的索引信息列表
            indices_info = []
            for index_name in indices:
                index_info = {
                    "name": index_name,
                    "stats": all_stats.get(index_name, {})
                }
                indices_info.append(index_info)

            return {
                "indices": indices,
                "count": len(indices),
                "indices_info": indices_info
            }
        else:
            return {"indices": indices, "count": len(indices)}

    @staticmethod
    def _get_file_actual_size(source_type: str, path_or_url: str) -> int:
        """查询文件的实际大小"""
        try:
            if source_type == "url":
                # 对于URL类型，使用requests库获取文件大小
                response = requests.head(path_or_url)
                if 'content-length' in response.headers:
                    return int(response.headers['content-length'])
                return 0
            else:
                # 对于本地文件，使用os.path.getsize获取文件大小
                return os.path.getsize(path_or_url)
        except Exception as e:
            print(f"Error getting file size for {path_or_url}: {str(e)}")
            return 0


    def get_index_info(self,
            index_name: str = Path(..., description="Name of the index"),
            include_files: bool = Query(True, description="Whether to include file list"),
            include_chunks: bool = Query(False, description="Whether to include text chunks for each file"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        获取索引的详细信息，包括统计信息、字段映射、文件列表和处理信息

        Args:
            index_name: 索引名称
            include_files: 是否包含文件列表
            include_chunks: 是否包含每个文件的文本块
            es_core: ElasticSearchCore实例

        Returns:
            包含索引详细信息的字典
        """
        try:
            # Get all the info in one combined response
            stats = es_core.get_index_stats([index_name])
            mappings = es_core.get_index_mapping([index_name])

            # Get file list if requested
            files = []
            if include_files:
                # Get existing files from ES
                existing_files = es_core.get_file_list_with_details(index_name)

                # Get active tasks status from data process service
                active_tasks = get_active_tasks_status(DATA_PROCESS_SERVICE, index_name)

                # Create a set of path_or_urls from existing files for quick lookup
                existing_paths = {file_info.get('path_or_url') for file_info in existing_files}

                # Get text chunks if requested
                if include_chunks:
                    for file_info in existing_files:
                        path_or_url = file_info.get('path_or_url')
                        chunks_query = {
                            "query": {
                                "term": {
                                    "path_or_url": path_or_url
                                }
                            },
                            "size": 100,
                            "_source": ["id", "title", "content", "create_time"]
                        }

                        try:
                            chunks_response = es_core.client.search(
                                index=index_name,
                                body=chunks_query
                            )

                            chunks = []
                            for hit in chunks_response["hits"]["hits"]:
                                source = hit["_source"]
                                chunks.append({
                                    "id": source.get("id"),
                                    "title": source.get("title"),
                                    "content": source.get("content"),
                                    "create_time": source.get("create_time")
                                })

                            file_info['chunks'] = chunks
                            file_info['chunks_count'] = len(chunks)

                        except Exception as e:
                            print(f"Error getting chunks for {path_or_url}: {str(e)}")
                            file_info['chunks'] = []
                            file_info['chunks_count'] = 0

                # Update existing files with status information
                for file_info in existing_files:
                    path_or_url = file_info.get('path_or_url')
                    source_type = file_info.get('source_type', 'file')
                    if path_or_url in active_tasks:
                        # If file is in active tasks, use its status
                        file_info['status'] = active_tasks[path_or_url]
                    else:
                        # If file is not in active tasks, it's completed
                        file_info['status'] = 'COMPLETED'
                        # 更新文件大小
                        if file_info['file_size'] <= 0:
                            file_info['file_size'] = self._get_file_actual_size(source_type, path_or_url)

                # Add active tasks that don't exist in ES
                for path_or_url, status in active_tasks.items():
                    if path_or_url not in existing_paths:
                        # Create a new file info entry for the active task
                        file_info = {
                            'path_or_url': path_or_url,
                            'file': path_or_url.split('/')[-1],  # Use last part of path as filename
                            'file_size': 0,  # Size unknown for active tasks
                            'create_time': time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
                            'status': status,
                            'chunks': [],
                            'chunks_count': 0
                        }
                        files.append(file_info)

                # Add existing files to the final list
                files.extend(existing_files)

            return {
                "base_info": stats[index_name]["base_info"],
                "search_performance": stats[index_name]["search_performance"],
                "fields": mappings[index_name],
                "files": files if include_files else None
            }
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Error getting info for index {index_name}: {str(e)}")


    @staticmethod
    def index_documents(
            index_name: str = Path(..., description="Name of the index"),
            data: IndexingRequest = Body(..., description="Indexing request to process"),
            embedding_model_name: Optional[str] = Query(None, description="Name of the embedding model to use"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        索引文档并创建向量嵌入，如果索引不存在则创建

        Args:
            index_name: 索引名称
            data: 包含要索引的文档数据的IndexingRequest对象
            embedding_model_name: 要使用的嵌入模型名称（可选）
            es_core: ElasticSearchCore实例

        Returns:
            IndexingResponse对象，包含索引结果信息
        """
        try:
            print(f"Received request for index {index_name}")

            # Extract index_name from IndexingRequest if present
            if data.index_name:
                # Override path parameter with value from the data itself
                print(f"Using index name from request: {data.index_name}")
                index_name = data.index_name

            if not index_name:
                raise HTTPException(status_code=400, detail="Index name is required")

            # Check if index exists, create if it doesn't
            indices = es_core.get_user_indices()

            # Create index if needed (ElasticSearchCore will handle embedding_dim automatically)
            if index_name not in indices:
                print(f"Creating new index: {index_name}")
                success = es_core.create_vector_index(index_name, embedding_dim=es_core.embedding_dim)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to auto-create index {index_name}")

            # Handle indexing request format
            task_id = data.task_id
            results = data.results

            print(f"Processing {len(results)} documents for task {task_id}")

            # Transform indexing request results to documents
            documents = []

            for idx, item in enumerate(results):
                # All items should be dictionaries
                if not isinstance(item, dict):
                    print(f"Skipping item {idx} - not a dictionary")
                    continue

                # Extract metadata
                metadata = item.get("metadata", {})
                source = item.get("source", "")
                text = item.get("text", "")
                source_type = item.get("source_type", "file")

                file_name = metadata.get("filename", os.path.basename(source) if source else "unknown")

                # Get title from metadata, or use filename
                title = metadata.get("title", file_name)

                # Get other metadata
                language = metadata.get("languages", ["null"])[0] if metadata.get("languages") else "null"
                author = metadata.get("author", "null")
                date = metadata.get("date", time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()))
                file_size = metadata.get("file_size", 0)

                # Get create_time from metadata or current time
                create_time = metadata.get("creation_date", time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()))
                if isinstance(create_time, (int, float)):
                    import datetime
                    create_time = datetime.datetime.fromtimestamp(create_time).isoformat()

                # Create document
                document = {
                    "id": f"{task_id}_{idx}",
                    "title": title,
                    "filename": file_name,
                    "path_or_url": source,
                    "source_type": source_type,
                    "language": language,
                    "author": author,
                    "date": date,
                    "content": text,
                    "process_source": "Unstructured",
                    "file_size": file_size,
                    "create_time": create_time,
                    # Add additional metadata fields
                    "languages": metadata.get("languages", [])
                }

                documents.append(document)

            # Ensure all documents have required fields
            current_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
            for doc in documents:
                # Set embedding model name if provided or use the default from the embedding model
                if embedding_model_name:
                    doc["embedding_model_name"] = embedding_model_name
                elif not doc.get("embedding_model_name"):
                    doc["embedding_model_name"] = es_core.embedding_model.model

                # Set create_time if not present
                if not doc.get("create_time"):
                    doc["create_time"] = current_time

                # Ensure file_size is present (default to 0 if not provided)
                if not doc.get("file_size"):
                    doc["file_size"] = 0

                # Ensure process_source is present
                if not doc.get("process_source"):
                    doc["process_source"] = "Unstructured"

            total_submitted = len(documents)
            if total_submitted == 0:
                return {
                    "success": True,
                    "message": "No documents to index",
                    "total_indexed": 0,
                    "total_submitted": 0
                }

            print(f"Submitting {total_submitted} documents to Elasticsearch")

            # Index documents (use default batch_size and content_field)
            try:
                total_indexed = es_core.index_documents(
                    index_name=index_name,
                    documents=documents
                )

                print(f"Successfully indexed {total_indexed} documents")

                return {
                    "success": True,
                    "message": f"Successfully indexed {total_indexed} documents",
                    "total_indexed": total_indexed,
                    "total_submitted": total_submitted
                }
            except Exception as e:
                error_msg = str(e)
                print(f"Error during indexing: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Error during indexing: {error_msg}")

        except Exception as e:
            error_msg = str(e)
            print(f"Error indexing documents: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Error indexing documents: {error_msg}")

    @staticmethod
    def delete_documents(
            index_name: str = Path(..., description="Name of the index"),
            path_or_url: str = Query(..., description="Path or URL of documents to delete"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        deleted_count = es_core.delete_documents_by_path_or_url(index_name, path_or_url)
        return {"status": "success", "deleted_count": deleted_count}

    @staticmethod
    # Search Operations
    def accurate_search(
            request: SearchRequest = Body(..., description="Search request parameters"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        使用模糊文本匹配在多个索引中搜索文档

        Args:
            request: 包含搜索参数的SearchRequest对象
            es_core: ElasticSearchCore实例

        Returns:
            包含搜索结果、总数和查询时间的响应
        """
        try:
            # 验证查询不为空
            if not request.query.strip():
                raise HTTPException(status_code=400, detail="Search query cannot be empty")

            # 验证索引名称
            if not request.index_names:
                raise HTTPException(status_code=400, detail="At least one index name is required")

            start_time = time.time()
            results = es_core.accurate_search(request.index_names, request.query, request.top_k)
            query_time = (time.time() - start_time) * 1000  # 转换为毫秒

            # 格式化结果
            formatted_results = []
            for result in results:
                doc = result["document"]
                doc["score"] = result["score"]
                doc["index"] = result["index"]  # 在结果中包含源索引
                formatted_results.append(doc)

            return {
                "results": formatted_results,
                "total": len(formatted_results),
                "query_time_ms": query_time
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error during accurate search: {str(e)}")

    @staticmethod
    def semantic_search(
            request: SearchRequest = Body(..., description="Search request parameters"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        使用向量相似度在多个索引中搜索相似文档

        Args:
            request: 包含搜索参数的SearchRequest对象
            es_core: ElasticSearchCore实例

        Returns:
            包含搜索结果、总数和查询时间的响应
        """
        try:
            # 验证查询不为空
            if not request.query.strip():
                raise HTTPException(status_code=400, detail="Search query cannot be empty")

            # 验证索引名称
            if not request.index_names:
                raise HTTPException(status_code=400, detail="At least one index name is required")

            start_time = time.time()
            results = es_core.semantic_search(request.index_names, request.query, request.top_k)
            query_time = (time.time() - start_time) * 1000  # 转换为毫秒

            # 格式化结果
            formatted_results = []
            for result in results:
                doc = result["document"]
                doc["score"] = result["score"]
                doc["index"] = result["index"]  # 在结果中包含源索引
                formatted_results.append(doc)

            return {
                "results": formatted_results,
                "total": len(formatted_results),
                "query_time_ms": query_time
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error during semantic search: {str(e)}")

    @staticmethod
    def hybrid_search(
            request: HybridSearchRequest = Body(..., description="Hybrid search request parameters"),
            es_core: ElasticSearchCore = Depends(get_es_core)
    ):
        """
        使用混合搜索在多个索引中搜索相似文档

        Args:
            request: 包含搜索参数的HybridSearchRequest对象
            es_core: ElasticSearchCore实例

        Returns:
            包含搜索结果、总数、查询时间和详细分数信息的响应
        """
        try:
            # 验证查询不为空
            if not request.query.strip():
                raise HTTPException(status_code=400, detail="Search query cannot be empty")

            # 验证索引名称
            if not request.index_names:
                raise HTTPException(status_code=400, detail="At least one index name is required")

            start_time = time.time()
            results = es_core.hybrid_search(request.index_names, request.query, request.top_k, request.weight_accurate)
            query_time = (time.time() - start_time) * 1000  # 转换为毫秒

            # 格式化结果
            formatted_results = []
            for result in results:
                doc = result["document"]
                doc["score"] = result["score"]
                doc["index"] = result["index"]  # 在结果中包含源索引
                # 添加详细的分数信息
                doc["score_details"] = {
                    "accurate": result["scores"]["accurate"],
                    "semantic": result["scores"]["semantic"]
                }
                formatted_results.append(doc)

            return {
                "results": formatted_results,
                "total": len(formatted_results),
                "query_time_ms": query_time
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error during hybrid search: {str(e)}")

    @staticmethod
    def health_check(es_core: ElasticSearchCore = Depends(get_es_core)):
        """
        检查API和Elasticsearch的健康状态

        Args:
            es_core: ElasticSearchCore实例

        Returns:
            包含健康状态信息的响应
        """
        try:
            # 尝试列出索引作为健康检查
            indices = es_core.get_user_indices()
            return {
                "status": "healthy",
                "elasticsearch": "connected",
                "indices_count": len(indices)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")