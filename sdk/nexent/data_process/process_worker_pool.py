import logging
import asyncio
import ray
import time
import os
from typing import Dict, Any, List, Tuple, TYPE_CHECKING
from concurrent.futures import ThreadPoolExecutor

from .task_store import TaskStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("data process")

if TYPE_CHECKING:
    from .async_task_manager import AsyncTaskManager


def ensure_ray_initialized():
    if not ray.is_initialized():
        try:
            # Initialize Ray with more container-friendly settings
            ray.init(
                ignore_reinit_error=True,
                include_dashboard=False,
                _temp_dir="/tmp/ray",
                log_to_driver=True,
                logging_level=logging.DEBUG
            )
            logger.info("Ray successfully initialized", extra={'task_id': ' ' * 36, 'stage': 'STARTUP', 'source': 'ray'})
        except Exception as e:
            logger.error(f"Failed to initialize Ray: {e}", extra={'task_id': ' ' * 36, 'stage': 'ERROR', 'source': 'ray'})

@ray.remote
def ray_process_file(file_path: str, source_type: str, max_characters: int = 1500, 
                    new_after_n_chars: int = 500, strategy: str = "fast", 
                    infer_table_structure: bool = True, **kwargs) -> Dict[str, Any]:
    """
    Ray remote function to process a single file
    
    Args:
        file_path: Path to the file
        source_type: Type of source file
        max_characters: Maximum characters per chunk
        new_after_n_chars: Start new chunk after n characters
        strategy: Processing strategy
        infer_table_structure: Whether to infer table structure
        **kwargs: Additional parameters
    
    Returns:
        Dictionary with processing results
    """
    # Dynamic imports with error handling
    try:
        from unstructured.partition.auto import partition
        from unstructured.chunking.basic import chunk_elements
        from unstructured.file_utils.filetype import detect_filetype
    except ImportError:
        raise ImportError(
            "Processing features require additional dependencies. "
            "Please install them with: pip install nexent[process]"
        )
    
    start_time = time.time()
    # 从kwargs中安全地提取task_id，确保在记录日志时可用
    task_id = kwargs.pop("task_id", "unknown")
    
    try:
        # Log start of processing
        logger.info(f"Ray worker starting to process file: {file_path}", 
                   extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'ray'})
        
        # Debug info about the file
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            logger.info(f"File exists, size: {file_size} bytes", 
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
            
            # Check file type
            try:
                filetype = detect_filetype(file_path=file_path)
                logger.info(f"Detected file type: {filetype}", 
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
                
                # Skip unsupported file types
                unsupported_types = ["image", "audio", "video", "unknown"]
                if filetype in unsupported_types:
                    logger.warning(f"Skipping unsupported file type {filetype}: {file_path}", 
                                 extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'ray'})
                    return {
                        "file": file_path,
                        "error": f"Unsupported file type: {filetype}",
                        "processing_time": time.time() - start_time,
                        "status": "skipped"
                    }
            except Exception as e:
                logger.warning(f"Could not detect file type: {str(e)}", 
                             extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'ray'})
        else:
            logger.error(f"File does not exist: {file_path}", 
                       extra={'task_id': task_id, 'stage': 'ERROR', 'source': 'ray'})
            raise FileNotFoundError(f"File does not exist: {file_path}")
        
        # Process file based on source type
        if source_type == "file":
            logger.info(f"Starting partition with strategy={strategy}, max_chars={max_characters}", 
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
            elements = partition(
                filename=file_path, 
                max_characters=max_characters, 
                new_after_n_chars=new_after_n_chars, 
                strategy=strategy,
                infer_table_structure=infer_table_structure, 
                **kwargs
            )
            logger.info(f"Partition complete, got {len(elements)} elements", 
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
        else:
            # Handle other source types
            raise ValueError(f"Source type {source_type} not supported for Ray processing")
        
        # Apply chunking
        elements = chunk_elements(elements, max_characters=max_characters, new_after_n_chars=new_after_n_chars)
        
        # Process elements
        result = []
        for element in elements:
            metadata = element.metadata.to_dict()
            result.append({
                "text": element.text, 
                "metadata": metadata, 
                "source": file_path, 
                "source_type": source_type
            })
        
        processing_time = time.time() - start_time
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        size_mb = file_size / (1024 * 1024)
        
        logger.info(f"Ray worker completed processing file: {file_path} in {processing_time:.2f}s, " 
                   f"elements: {len(elements)}, size: {size_mb:.2f}MB, " 
                   f"speed: {size_mb/processing_time:.2f}MB/s",
                   extra={'task_id': task_id, 'stage': 'COMPLETED', 'source': 'ray'})
        
        return {
            "file": file_path,
            "elements": result,
            "num_elements": len(elements),
            "processing_time": processing_time,
            "file_size": file_size,
            "status": "success"
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Ray worker failed to process file {file_path}: {str(e)}", 
                    extra={'task_id': task_id, 'stage': 'FAILED', 'source': 'ray'})
        return {
            "file": file_path,
            "error": str(e),
            "processing_time": processing_time,
            "status": "failed"
        }


class ProcessWorkerPool:
    def __init__(self, max_workers: int, use_ray: bool = True):
        """
        Initialize the Process Worker Pool
        
        Args:
            max_workers: Maximum number of worker threads
            use_ray: Whether to use Ray for distributed processing
        """
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.task_manager = None  # Will be set after initialization
        self.use_ray = use_ray
        
        if self.use_ray:
            ensure_ray_initialized()
            logger.info(f"Process Worker Pool initialized with Ray distributed processing and {max_workers} threads",
                      extra={'task_id': ' ' * 36, 'stage': 'STARTUP', 'source': 'pool'})
        else:
            logger.info(f"Process Worker Pool initialized with {max_workers} threads (Ray disabled)",
                      extra={'task_id': ' ' * 36, 'stage': 'STARTUP', 'source': 'pool'})

    def set_task_manager(self, task_manager: 'AsyncTaskManager') -> None:
        """
        Set the task manager instance
        
        Args:
            task_manager: Async task manager instance
        """
        self.task_manager = task_manager

    def submit(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """
        Submit a task to the worker pool
        
        Args:
            task_id: Task ID
            task_data: Task data dictionary
        """
        self.executor.submit(self._process_task, task_id, task_data)

        logger.info(f"Submitted task to worker pool", extra={'task_id': task_id, 'stage': 'SUBMIT', 'source': 'pool'})

    def _process_task(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """
        Process a task in the worker pool
        
        Args:
            task_id: Task ID
            task_data: Task data dictionary
        """
        try:
            # Update status to processing
            asyncio.run(self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.PROCESSING))

            # Extract task parameters
            source = task_data.get("source")
            source_type = task_data.get("source_type", "file")
            chunking_strategy = task_data.get("chunking_strategy")

            # Extract additional parameters
            kwargs = {k: v for k, v in task_data.items() if k not in ["source", "source_type", "chunking_strategy"]}
            
            # Add task_id to kwargs for Ray processing
            kwargs["task_id"] = task_id

            # Process data
            logger.info(f"Processing source: {source} ({source_type})",
                        extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'pool'})
            
            # Debug log for Ray state
            logger.info(f"Ray enabled: {self.use_ray}, Ray initialized: {ray.is_initialized()}",
                       extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})

            # Check if we should use Ray for this task
            is_batch_file_processing = False
            files_to_process = []
            
            # Check if the source is a file or directory and source_type is "file"
            if source_type == "file" and self.use_ray:
                # Check if source exists
                logger.info(f"Checking source path: {source}, absolute path: {os.path.abspath(source) if source else 'None'}",
                           extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                
                if not os.path.exists(source):
                    logger.warning(f"Source path does not exist: {source}",
                                 extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'pool'})
                    result = []
                    asyncio.run(
                        self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.FAILED, 
                                                           error=f"Source path does not exist: {source}"))
                    return
                
                # If source is a directory, collect all files
                if os.path.isdir(source):
                    logger.info(f"Source is a directory: {source}",
                               extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                    is_batch_file_processing = True
                    # Collect all valid files in the directory
                    for root, _, files in os.walk(source):
                        for file in files:
                            if not file.startswith('.') and not file.startswith('~'):
                                file_path = os.path.join(root, file)
                                try:
                                    file_size = os.path.getsize(file_path)
                                    files_to_process.append((file_path, file_size))
                                except Exception as e:
                                    logger.warning(f"Could not get size for file {file_path}: {str(e)}",
                                                 extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'ray'})
                    
                    logger.info(f"Found {len(files_to_process)} files for Ray batch processing in directory {source}",
                              extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'ray'})
                # If source is a single file, add it to the list
                elif os.path.isfile(source):
                    logger.info(f"Source is a single file: {source}",
                               extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                    is_batch_file_processing = True
                    try:
                        file_size = os.path.getsize(source)
                        files_to_process.append((source, file_size))
                        logger.info(f"Using Ray to process single file: {source}",
                                  extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'ray'})
                    except Exception as e:
                        logger.warning(f"Could not get size for file {source}: {str(e)}",
                                     extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'ray'})
                else:
                    logger.warning(f"Source is neither a file nor a directory: {source}",
                                 extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'pool'})
            else:
                logger.info(f"Not using Ray for this task: source_type={source_type}, use_ray={self.use_ray}",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
            
            if is_batch_file_processing and files_to_process:
                # 检查并移除kwargs中的task_id，防止与位置参数重复
                if "task_id" in kwargs:
                    logger.info(f"Removing task_id from kwargs to prevent parameter duplication",
                              extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                    del kwargs["task_id"]
                result = self._process_with_ray(task_id, files_to_process, source_type, chunking_strategy, **kwargs)
            else:
                # Use standard processing for non-directory sources
                # 也检查并移除kwargs中的task_id
                if "task_id" in kwargs:
                    # 作为额外参数传递给_process_data，而不是作为关键字参数
                    logger.info(f"Keeping task_id in kwargs for _process_data",
                              extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                result = self._process_data(source, source_type, chunking_strategy, **kwargs)

            if not result:
                # Update status to completed
                asyncio.run(
                    self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.COMPLETED, result=result))

                logger.info("Task completed successfully",
                            extra={'task_id': task_id, 'stage': 'COMPLETED', 'source': 'pool'})

                return

            # Update status to forwarding
            asyncio.run(
                self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.FORWARDING, result=result))

            # Forward to Elasticsearch
            logger.info("Forwarding data to Elasticsearch",
                        extra={'task_id': task_id, 'stage': 'FORWARDING', 'source': 'pool'})

            self._forward_to_elasticsearch(task_id, result, task_data)

            # Update status to completed
            asyncio.run(
                self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.COMPLETED, result=result))

            logger.info("Task completed successfully",
                        extra={'task_id': task_id, 'stage': 'COMPLETED', 'source': 'pool'})

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Task failed with error: {error_msg}",
                         extra={'task_id': task_id, 'stage': 'FAILED', 'source': 'pool'})

            # Update status to failed
            asyncio.run(
                self.task_manager.update_task_status(task_id=task_id, status=TaskStatus.FAILED, error=error_msg))
                
    def _process_with_ray(self, task_id: str, files_to_process: List[Tuple[str, int]], 
                         source_type: str, chunking_strategy: str, **kwargs) -> list[Dict[str, Any]]:
        """
        Process files in parallel using Ray
        
        Args:
            task_id: Task ID
            files_to_process: List of (file_path, file_size) tuples
            source_type: Type of source
            chunking_strategy: Chunking strategy
            **kwargs: Additional parameters
            
        Returns:
            List of processed data items
        """
        try:
            start_time = time.time()
            logger.info(f"Starting Ray distributed processing for {len(files_to_process)} files",
                      extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'ray'})
            
            # Check Ray initialization status
            if not ray.is_initialized():
                logger.warning("Ray is not initialized, initializing now...",
                             extra={'task_id': task_id, 'stage': 'WARNING', 'source': 'ray'})
                ensure_ray_initialized()
            
            # Log Ray status
            logger.info(f"Ray initialized: {ray.is_initialized()}, Ray resources: {ray.cluster_resources()}",
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
            
            # Set up Ray parameters
            strategy = "fast"
            if chunking_strategy == "hi_res":
                strategy = "hi_res"
            
            # Create Ray tasks
            futures = []
            for file_path, file_size in files_to_process:
                ray_kwargs = kwargs.copy()
                if chunking_strategy:
                    ray_kwargs["chunking_strategy"] = chunking_strategy
                
                logger.info(f"Creating Ray task for file: {file_path} ({file_size} bytes)",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
                    
                futures.append(ray_process_file.remote(
                    file_path, 
                    source_type, 
                    max_characters=1500,
                    new_after_n_chars=500,
                    strategy=strategy,
                    infer_table_structure=True,
                    **ray_kwargs
                ))
            
            # Wait for all tasks to complete
            logger.info(f"Waiting for {len(futures)} Ray tasks to complete",
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
            results = ray.get(futures)
            logger.info(f"All Ray tasks completed, processing results",
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'ray'})
            
            # Process results
            all_elements = []
            success_count = 0
            failed_count = 0
            total_elements = 0
            total_processed_size = 0
            
            for result in results:
                if result["status"] == "success":
                    all_elements.extend(result["elements"])
                    success_count += 1
                    total_elements += result["num_elements"]
                    total_processed_size += result["file_size"]
                else:
                    failed_count += 1
                    logger.warning(f"Failed to process file {result['file']}: {result.get('error', 'Unknown error')}",
                                 extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'ray'})
            
            total_time = time.time() - start_time
            total_mb = total_processed_size / (1024 * 1024)
            
            logger.info(f"Ray processing completed in {total_time:.2f}s - "
                       f"Files: {len(files_to_process)} (Success: {success_count}, Failed: {failed_count}), "
                       f"Elements: {total_elements}, Size: {total_mb:.2f}MB, "
                       f"Speed: {total_mb/total_time:.2f}MB/s",
                       extra={'task_id': task_id, 'stage': 'COMPLETED', 'source': 'ray'})
            
            return all_elements
            
        except Exception as e:
            logger.error(f"Ray processing failed: {str(e)}",
                       extra={'task_id': task_id, 'stage': 'FAILED', 'source': 'ray'})
            raise ValueError(f"Ray processing failed: {str(e)}")

    @staticmethod
    def process_data(source: Any) -> list[Dict[str, Any]]:
        """
        Process data from xlsx to markdown data

        Args:
            source: Source data (file path, URL, or text)

        Returns:
            List of processed data items
        """

        from .excel_process import ExcelProcessor
        if isinstance(source, str):
            clean_excel = ExcelProcessor(input_file=source)
        elif isinstance(source, bytes):
            clean_excel = ExcelProcessor(file_data=source)
        elements = clean_excel.process()

        result = []
        for element in elements:
            result.append({"text": element, "metadata": "", "source": "", "source_type": ""})
        return result

    def _process_data(self, source: str, source_type: str, chunking_strategy: str, **kwargs) -> list[Dict[str, Any]]:
        """
        Process data from various sources
        
        Args:
            source: Source data (file path, URL, or text)
            source_type: Type of source ("file", "url", or "text")
            chunking_strategy: Strategy for chunking the document
            **kwargs: Additional parameters
            
        Returns:
            List of processed data items
        """
        # 提取并移除task_id，以便使用它进行日志记录
        task_id = kwargs.pop("task_id", "unknown") if "task_id" in kwargs else "unknown"
        
        logger.info(f"Processing data with standard method: source_type={source_type}, chunking_strategy={chunking_strategy}",
                  extra={'task_id': task_id, 'stage': 'PROCESSING', 'source': 'pool'})
        
        # Dynamic imports with error handling
        try:
            from unstructured.partition.auto import partition
            from unstructured.chunking.basic import chunk_elements
        except ImportError:
            logger.error(f"Missing required dependencies for processing",
                      extra={'task_id': task_id, 'stage': 'ERROR', 'source': 'pool'})
            raise ImportError(
                "Processing features require additional dependencies. "
                "Please install them with: pip install nexent[process]"
            )

        # Validate source_type
        if source_type not in ["file", "url", "text"]:
            raise ValueError("source_type must be one of: 'file', 'url', 'text'")

        # Set up partition parameters
        partition_kwargs = kwargs.copy()
        if chunking_strategy:
            partition_kwargs["chunking_strategy"] = chunking_strategy

        # Process based on source type
        try:
            logger.info(f"Starting document processing with source_type: {source_type}",
                      extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
            
            if source_type == "file":
                # 检查文件是否存在
                if not os.path.exists(source):
                    logger.error(f"File does not exist: {source}",
                               extra={'task_id': task_id, 'stage': 'ERROR', 'source': 'pool'})
                    raise FileNotFoundError(f"File does not exist: {source}")
                
                file_size = os.path.getsize(source) if os.path.exists(source) else 0
                logger.info(f"Processing file: {source}, size: {file_size} bytes",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                
                elements = partition(filename=source, max_characters=1500, new_after_n_chars=500, strategy="fast",
                                     infer_table_structure=True, **partition_kwargs)
                logger.info(f"File partitioning complete, got {len(elements)} elements",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
            elif source_type == "url":
                logger.info(f"Processing URL: {source}",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                elements = partition(filename=source, max_characters=1500, new_after_n_chars=500, **partition_kwargs)
            else:  # text
                # For text type, write to temporary file
                logger.info(f"Processing text content (length: {len(source) if source else 0})",
                          extra={'task_id': task_id, 'stage': 'DEBUG', 'source': 'pool'})
                import tempfile
                with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as temp_file:
                    temp_file.write(source)
                    temp_path = temp_file.name

                try:
                    elements = partition(filename=source, max_characters=1500, new_after_n_chars=500,
                                         **partition_kwargs)
                finally:
                    import os
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)

            elements = chunk_elements(elements, max_characters=1500, new_after_n_chars=500)

            # Process elements
            result = []
            for element in elements:
                metadata = element.metadata.to_dict()
                result.append(
                    {"text": element.text, "metadata": metadata, "source": source, "source_type": source_type})

            return result

        except Exception as e:
            raise ValueError(f"Error processing document: {str(e)}")

    def _forward_to_elasticsearch(self, task_id: str, result: list[Dict[str, Any]], task_data: Dict[str, Any]) -> None:
        """
        Forward processed data to Elasticsearch
        
        Args:
            task_id: Task ID
            result: Processed data
            task_data: Task data dictionary
        """
        import httpx
        import os

        # Get Elasticsearch service URL
        es_service_url = os.environ.get("ELASTICSEARCH_SERVICE", "http://localhost:8000")
        index_name = task_data.get("index_name", "knowledge_base")

        # Prepare payload
        payload = {"task_id": task_id, "index_name": index_name, "results": result}

        # Send request to Elasticsearch service
        with httpx.Client(timeout=600.0) as client:
            try:
                response = client.post(f"{es_service_url}/indices/{index_name}/documents", json=payload, timeout=500.0)
                response.raise_for_status()

                logger.info(f"Successfully indexed {response.json().get('total_indexed', 0)} documents",
                            extra={'task_id': task_id, 'stage': 'FORWARDING', 'source': 'pool'})

            except httpx.HTTPStatusError as e:
                raise ValueError(
                    f"HTTP error during Elasticsearch indexing ({e.response.status_code}): {e.response.text}")
            except httpx.TimeoutException:
                raise ValueError("Timeout during Elasticsearch indexing")
            except Exception as e:
                raise ValueError(f"Unexpected error during Elasticsearch indexing: {str(e)}")

    def shutdown(self) -> None:
        """Shutdown the worker pool"""
        self.executor.shutdown()
        
        # Shutdown Ray if initialized
        if self.use_ray and ray.is_initialized():
            ray.shutdown()
            logger.info("Ray shutdown complete", 
                      extra={'task_id': ' ' * 36, 'stage': 'SHUTDOWN', 'source': 'ray'})
            
        logger.info("Process Worker Pool shutdown complete",
                    extra={'task_id': ' ' * 36, 'stage': 'SHUTDOWN', 'source': 'pool'})
