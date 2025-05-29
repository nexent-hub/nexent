import time
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from ..core.models.embedding_model import JinaEmbedding
from .utils import format_size, format_timestamp, build_weighted_query
from elasticsearch import Elasticsearch, exceptions

from urllib.request import urlopen

from ..core.nlp.tokenizer import calculate_term_weights

# Configure elastic_transport logging level
logging.getLogger('elastic_transport').setLevel(logging.WARNING)

class ElasticSearchCore:
    """
    Core class for Elasticsearch operations including:
    - Index management
    - Document insertion with embeddings
    - Document deletion
    - Accurate text search
    - Semantic vector search
    - Hybrid search
    - Index statistics
    """
    
    def __init__(
        self, 
        host: Optional[str],
        api_key: Optional[str],
        embedding_model: Optional[JinaEmbedding],
        verify_certs: bool = False,
        ssl_show_warn: bool = False,
    ):
        """
        Initialize ElasticSearchCore with Elasticsearch client and JinaEmbedding model.
        
        Args:
            host: Elasticsearch host URL (defaults to env variable)
            api_key: Elasticsearch API key (defaults to env variable)
            verify_certs: Whether to verify SSL certificates
            ssl_show_warn: Whether to show SSL warnings
            embedding_model: Optional embedding model instance
        """
        # Get credentials from environment if not provided
        self.host = host
        self.api_key = api_key
        
        # Initialize Elasticsearch client with HTTPS support
        self.client = Elasticsearch(
            self.host,
            api_key=self.api_key,
            verify_certs=verify_certs,
            ssl_show_warn=ssl_show_warn
        )
        
        # Initialize embedding model
        self.embedding_model = embedding_model


    @property
    def embedding_dim(self) -> int:
        """
        Get embedding dimension from the embedding model.
        
        Returns:
            int: Dimension of the embedding vectors
        """
        # Get embedding dimension from the model if available
        if hasattr(self.embedding_model, 'embedding_dim'):
            # Check if it's a string (from env var) and convert to int if needed
            dim = self.embedding_model.embedding_dim
            if isinstance(dim, str):
                return int(dim)
            return dim
        
        # Default dimension if not available from model
        return 1024
    
    # ---- INDEX MANAGEMENT ----
    
    def create_vector_index(self, index_name: str, embedding_dim: Optional[int] = None) -> bool:
        """
        Create a new vector search index with appropriate mappings.
        
        Args:
            index_name: Name of the index to create
            embedding_dim: Dimension of the embedding vectors (optional, will use model's dim if not provided)
            
        Returns:
            bool: True if creation was successful
        """
        try:
            # Use provided embedding_dim or get from model
            actual_embedding_dim = embedding_dim or self.embedding_dim
            
            # Check if index already exists
            if self.client.indices.exists(index=index_name):
                logging.info(f"Index {index_name} already exists, skipping creation")
                return False
                
            # Define the mapping with vector field
            mappings = {
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {"type": "text"},
                    "filename": {"type": "keyword"},
                    "path_or_url": {"type": "keyword"},
                    "language": {"type": "keyword"},
                    "author": {"type": "keyword"},
                    "date": {"type": "date"},
                    "content": {"type": "text"},
                    "process_source": {"type": "keyword"},
                    "embedding_model_name": {"type": "keyword"},
                    "file_size": {"type": "long"},
                    "create_time": {"type": "date"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": actual_embedding_dim,
                        "index": "true",
                        "similarity": "cosine",
                    },
                }
            }
            
            # Create the index with the defined mappings
            self.client.indices.create(
                index=index_name,
                mappings=mappings
            )
            
            logging.info(f"Successfully created index: {index_name}")
            return True
            
        except exceptions.RequestError as e:
            # Handle the case where index already exists (error 400)
            if "resource_already_exists_exception" in str(e):
                logging.info(f"Index {index_name} already exists, skipping creation")
                return True
            logging.error(f"Error creating index: {str(e)}")
            return False
        except Exception as e:
            logging.error(f"Error creating index: {str(e)}")
            return False
    
    def delete_index(self, index_name: str) -> bool:
        """
        Delete an entire index
        
        Args:
            index_name: Name of the index to delete
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            self.client.indices.delete(index=index_name)
            logging.info(f"Successfully deleted the index: {index_name}")
            return True
        except exceptions.NotFoundError:
            logging.info(f"Index {index_name} not found")
            return False
        except Exception as e:
            logging.error(f"Error deleting index: {str(e)}")
            return False
    
    def get_user_indices(self, index_pattern: str = "*") -> List[str]:
        """
        Get list of user created indices (excluding system indices)
        
        Args:
            index_pattern: Pattern to match index names
            
        Returns:
            List of index names
        """
        try:
            indices = self.client.indices.get_alias(index=index_pattern)
            # Filter out system indices (starting with '.')
            return [index_name for index_name in indices.keys() if not index_name.startswith('.')]
        except Exception as e:
            logging.error(f"Error getting user indices: {str(e)}")
            return []
    
    # ---- DOCUMENT OPERATIONS ----
    
    def index_documents(
        self, 
        index_name: str, 
        documents: List[Dict[str, Any]], 
        batch_size: int = 3000,
        content_field: str = "content"
    ) -> int:
        """
        Index documents with embeddings in batches
        
        Args:
            index_name: Name of the index to add documents to
            documents: List of document dictionaries
            batch_size: Number of documents to process at once
            content_field: Field to use for generating embeddings
            
        Returns:
            int: Number of documents successfully indexed
        """
        logging.info(f"Indexing {len(documents)} documents to {index_name}")
        
        operations = []
        total_indexed = 0
        
        # Handle empty documents list
        if not documents:
            return 0
            
        # Ensure all documents have required fields
        current_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
        
        for doc in documents:
            # Set create_time if not present
            if not doc.get("create_time"):
                doc["create_time"] = current_time
            
            # Convert create_time to ISO string if it's a number
            if isinstance(doc.get("create_time"), (int, float)):
                import datetime
                doc["create_time"] = datetime.datetime.fromtimestamp(doc["create_time"]).isoformat()
                
            # Ensure file_size is present (default to 0 if not provided)
            if not doc.get("file_size"):
                doc["file_size"] = 0
                
            # Ensure process_source is present
            if not doc.get("process_source"):
                doc["process_source"] = "Unstructured"
                
            # Ensure all documents have an ID
            if not doc.get("id"):
                doc["id"] = f"{int(time.time())}_{hash(doc[content_field])}"[:20]
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            # Prepare inputs for embedding
            inputs = [{"text": doc[content_field]} for doc in batch]
            
            try:
                # Get embeddings for the batch
                embeddings = self.embedding_model.get_embeddings(inputs)
                
                # Debug:Random an embedding with same dimension
                # embeddings = [np.random.rand(self.embedding_dim).tolist() for _ in range(len(inputs))]
                
                # Add documents with embeddings to operations
                for doc, embedding in zip(batch, embeddings):
                    operations.append({"index": {"_index": index_name}})
                    doc["embedding"] = embedding
                    # Add embedding model name if not present
                    if "embedding_model_name" not in doc:
                        doc["embedding_model_name"] = self.embedding_model.embedding_model_name
                    operations.append(doc)
                    
                logging.info(f"Processed batch {i//batch_size + 1}, documents {i} to {min(i+batch_size, len(documents))}")
                
                # Bulk index the batch
                if operations:
                    self.client.bulk(index=index_name, operations=operations, refresh=True)
                    total_indexed += len(batch)
                    operations = []  # Clear operations after successful bulk
                
                # Add a small delay to avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                logging.error(f"Error processing batch {i//batch_size + 1}: {str(e)}")
                continue
        
        logging.info(f"Indexing completed. Successfully indexed {total_indexed} documents.")
        return total_indexed
    
    def delete_documents_by_path_or_url(self, index_name: str, path_or_url: str) -> int:
        """
        Delete documents based on their path_or_url field
        
        Args:
            index_name: Name of the index to delete documents from
            path_or_url: The URL or path of the documents to delete
            
        Returns:
            int: Number of documents deleted
        """
        try:
            result = self.client.delete_by_query(
                index=index_name,
                body={
                    "query": {
                        "term": {
                            "path_or_url": path_or_url
                        }
                    }
                }
            )
            logging.info(f"Successfully deleted {result['deleted']} documents with path_or_url: {path_or_url} from index: {index_name}")
            return result['deleted']
        except Exception as e:
            logging.error(f"Error deleting documents: {str(e)}")
            return 0
    
    # ---- SEARCH OPERATIONS ----
    
    def accurate_search(self, index_names: List[str], query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents using fuzzy text matching across multiple indices.

        Args:
            index_name: Name of the index to search in
            query_text: The text query to search for
            top_k: Number of results to return
            
        Returns:
            List of search results with scores and document content
        """
        # Join index names for multi-index search
        index_pattern = ",".join(index_names)

        weights = calculate_term_weights(query_text)

        # Prepare the search query using match query for fuzzy matching
        search_query = build_weighted_query(query_text, weights) | {
            "size": top_k,
            "_source": {
                "excludes": ["embedding"]
            }
        }

        # Execute the search across multiple indices
        return self.exec_query(index_pattern, search_query)

    def exec_query(self, index_pattern, search_query):
        response = self.client.search(
            index=index_pattern,
            body=search_query
        )
        # Process and return results
        results = []
        for hit in response["hits"]["hits"]:
            results.append({
                "score": hit["_score"],
                "document": hit["_source"],
                "index": hit["_index"]  # Include source index in results
            })
        return results

    def semantic_search(self, index_names: List[str], query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity across multiple indices.
        
        Args:
            index_names: List of index names to search in
            query_text: The text query to search for
            top_k: Number of results to return
            
        Returns:
            List of search results with scores and document content
        """
        # Join index names for multi-index search
        index_pattern = ",".join(index_names)

        # Get query embedding
        query_embedding = self.embedding_model.get_embeddings([{"text": query_text}])[0]
        
        # Prepare the search query
        search_query = {
            "knn": {
                "field": "embedding",
                "query_vector": query_embedding,
                "k": top_k,
                "num_candidates": top_k * 2,
            },
            "size": top_k,
            "_source": {
                "excludes": ["embedding"]
            }
        }
        
        # Execute the search across multiple indices
        return self.exec_query(index_pattern, search_query)

    def hybrid_search(
        self,
        index_names: List[str],
        query_text: str,
        top_k: int = 5,
        weight_accurate: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search method, combining accurate matching and semantic search results across multiple indices.
        
        Args:
            index_names: List of index names to search in
            query_text: The text query to search for
            top_k: Number of results to return
            weight_accurate: The weight of the accurate matching score (0-1), the semantic search weight is 1-weight_accurate

        Returns:
            List of search results sorted by combined score
        """
        # Get results from both searches
        accurate_results = self.accurate_search(index_names, query_text, top_k=top_k)
        semantic_results = self.semantic_search(index_names, query_text, top_k=top_k)

        # Create a mapping from document ID to results
        combined_results = {}

        # Process accurate matching results
        for result in accurate_results:
            try:
                doc_id = result['document']['id']
                combined_results[doc_id] = {
                    'document': result['document'],
                    'accurate_score': result.get('score', 0),
                    'semantic_score': 0,
                    'index': result['index']  # Keep track of source index
                }
            except KeyError as e:
                logging.warning(f"Warning: Missing required field in accurate result: {e}")
                continue

        # Process semantic search results
        for result in semantic_results:
            try:
                doc_id = result['document']['id']
                if doc_id in combined_results:
                    combined_results[doc_id]['semantic_score'] = result.get('score', 0)
                else:
                    combined_results[doc_id] = {
                        'document': result['document'],
                        'accurate_score': 0,
                        'semantic_score': result.get('score', 0),
                        'index': result['index']  # Keep track of source index
                    }
            except KeyError as e:
                logging.warning(f"Warning: Missing required field in semantic result: {e}")
                continue

        # Calculate maximum scores
        max_accurate = max([r.get('score', 0) for r in accurate_results]) if accurate_results else 1
        max_semantic = max([r.get('score', 0) for r in semantic_results]) if semantic_results else 1

        # Calculate combined scores and sort
        results = []
        for doc_id, result in combined_results.items():
            try:
                # Get scores safely
                accurate_score = result.get('accurate_score', 0)
                semantic_score = result.get('semantic_score', 0)

                # Normalize scores
                normalized_accurate = accurate_score / max_accurate if max_accurate > 0 else 0
                normalized_semantic = semantic_score / max_semantic if max_semantic > 0 else 0

                # Calculate weighted combined score
                combined_score = (weight_accurate * normalized_accurate +
                                (1 - weight_accurate) * normalized_semantic)

                results.append({
                    'score': combined_score,
                    'document': result['document'],
                    'index': result['index'],  # Include source index in results
                    'scores': {
                        'accurate': normalized_accurate,
                        'semantic': normalized_semantic
                    }
                })
            except KeyError as e:
                logging.warning(f"Warning: Error processing result for doc_id {doc_id}: {e}")
                continue

        # Sort by combined score and return top k results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    # ---- STATISTICS AND MONITORING ----
    
    def get_unique_sources_count(self, index_name: str) -> int:
        """Get count of unique path_or_url values in an index"""
        agg_query = {
            "size": 0,
            "aggs": {
                "unique_path_or_url_count": {
                    "cardinality": {
                        "field": "path_or_url"
                    }
                }
            }
        }
        
        try:
            agg_result = self.client.search(
                index=index_name,
                body=agg_query
            )
            return agg_result['aggregations']['unique_path_or_url_count']['value']
        except Exception as e:
            logging.error(f"Error getting unique sources count: {str(e)}")
            return 0
            
    def get_process_source_info(self, index_name: str) -> str:
        """Get information about process_source field"""
        agg_query = {
            "size": 0,
            "aggs": {
                "process_sources": {
                    "terms": {
                        "field": "process_source",
                        "size": 10
                    }
                }
            }
        }
        
        try:
            result = self.client.search(
                index=index_name,
                body=agg_query
            )
            sources = result['aggregations']['process_sources']['buckets']
            if sources:
                return sources[0]['key']  # Return the most common process_source
            return "Unknown"
        except Exception as e:
            logging.error(f"Error getting process source info: {str(e)}")
            return "Unknown"
            
    def get_embedding_model_info(self, index_name: str) -> str:
        """Get information about the embedding model used"""
        agg_query = {
            "size": 0,
            "aggs": {
                "embedding_models": {
                    "terms": {
                        "field": "embedding_model_name",
                        "size": 10
                    }
                }
            }
        }
        
        try:
            result = self.client.search(
                index=index_name,
                body=agg_query
            )
            models = result['aggregations']['embedding_models']['buckets']
            if models:
                return models[0]['key']  # Return the most common embedding model
            return "Unknown"
        except Exception as e:
            logging.error(f"Error getting embedding model info: {str(e)}")
            return "Unknown"
            
    def get_file_list_with_details(self, index_name: str) -> List[Dict[str, Any]]:
        """
        Get a list of unique path_or_url values with their file_size and create_time
        
        Args:
            index_name: Name of the index to query
            
        Returns:
            List of dictionaries with path_or_url, file_size, and create_time
        """
        agg_query = {
            "size": 0,
            "aggs": {
                "unique_sources": {
                    "terms": {
                        "field": "path_or_url",
                        "size": 1000  # Limit to 1000 files for performance
                    },
                    "aggs": {
                        "file_sample": {
                            "top_hits": {
                                "size": 1,
                                "_source": ["path_or_url", "file_size", "create_time", "filename"]
                            }
                        }
                    }
                }
            }
        }
        
        try:
            result = self.client.search(
                index=index_name,
                body=agg_query
            )
            
            file_list = []
            for bucket in result['aggregations']['unique_sources']['buckets']:
                source = bucket['file_sample']['hits']['hits'][0]['_source']
                file_info = {
                    "path_or_url": source["path_or_url"],
                    "filename": source.get("filename", ""),
                    "file_size": source.get("file_size", 0),
                    "create_time": source.get("create_time", None)
                }
                file_list.append(file_info)
            
            return file_list
        except Exception as e:
            logging.error(f"Error getting file list: {str(e)}")
            return []
            
    def get_index_mapping(self, index_names: List[str]) -> Dict[str, List[str]]:
        """Get field mappings for multiple indices"""
        mappings = {}
        for index_name in index_names:
            try:
                mapping = self.client.indices.get_mapping(index=index_name)
                if mapping[index_name].get('mappings') and mapping[index_name]['mappings'].get('properties'):
                    mappings[index_name] = list(mapping[index_name]['mappings']['properties'].keys())
                else:
                    mappings[index_name] = []
            except Exception as e:
                logging.error(f"Error getting mapping for index {index_name}: {str(e)}")
                mappings[index_name] = []
        return mappings
            
    def get_index_stats(self, index_names: List[str]) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """Get formatted statistics for multiple indices"""
        all_stats = {}
        for index_name in index_names:
            try:
                stats = self.client.indices.stats(index=index_name)
                settings = self.client.indices.get_settings(index=index_name)
                unique_sources_count = self.get_unique_sources_count(index_name)
                process_source = self.get_process_source_info(index_name)
                embedding_model = self.get_embedding_model_info(index_name)

                index_stats = stats["indices"][index_name]["primaries"]

                # Get creation and update timestamps from settings
                creation_date = int(settings[index_name]['settings']['index']['creation_date'])
                # Update time defaults to creation time if not modified
                update_time = creation_date

                all_stats[index_name] = {
                    "base_info": {
                        "doc_count": unique_sources_count,
                        "chunk_count": index_stats["docs"]["count"],
                        #"unique_sources_count": unique_sources_count,
                        "store_size": format_size(index_stats["store"]["size_in_bytes"]),
                        "process_source": process_source,
                        "embedding_model": embedding_model,
                        "embedding_dim": self.embedding_dim,
                        "creation_date": format_timestamp(creation_date),
                        "update_date": format_timestamp(update_time)
                    },
                    "search_performance": {
                        "total_search_count": index_stats["search"]["query_total"],
                        "hit_count": index_stats["request_cache"]["hit_count"],
                    }
                }
            except Exception as e:
                logging.error(f"Error getting stats for index {index_name}: {str(e)}")
                all_stats[index_name] = {"error": str(e)}

        return all_stats
        
    def print_all_indices_info(self, index_pattern: str = "*") -> None:
        """Print information for all user indices"""
        user_indices = self.get_user_indices(index_pattern)
        
        if not user_indices:
            logging.info("No user indices found")
            return
        
        logging.info("=== User Index List ===")
        for index_name in user_indices:
            logging.info(f"Index Name: {index_name}")
        
        logging.info("\n=== Knowledge Base Core Statistics ===")
        try:
            stats = self.get_index_stats(user_indices)
            logging.info(stats)
        except Exception as e:
            logging.error(f"Error getting index statistics: {str(e)}")

    def get_all_indices_stats(self, index_pattern: str = "*") -> Dict[str, Dict[str, Dict[str, Any]]]:
        """
        Get statistics for all user indices.
        
        Args:
            index_pattern: Pattern to match index names
            
        Returns:
            Dictionary of index names to statistics
        """
        user_indices = self.get_user_indices(index_pattern)
        
        if not user_indices:
            return {}
        
        try:
            return self.get_index_stats(user_indices)
        except Exception as e:
            logging.error(f"Error getting all indices statistics: {str(e)}")
            return {}

    def get_index_count(self, index_name: str):
        # use count API to get total document count
        count_query = {"query": {"match_all": {}}}

        try:
            # Execute count query
            count_response = self.client.count(index=index_name, body=count_query)
            total_docs = count_response['count']
            logging.info(f"Index {index_name} contains {total_docs} documents")
            return total_docs
        except Exception as e:
            logging.error(f"Error getting document count: {e}")
            return 0

