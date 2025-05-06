from typing import Optional

from fastapi import HTTPException, Query, Body, Path, Depends, APIRouter
from consts.model import IndexingRequest, IndexingResponse, SearchRequest, HybridSearchRequest

from nexent.vector_database.elasticsearch_core import ElasticSearchCore
from utils.config_utils import config_manager
from backend.services.elasticsearch_service import ElasticSearchService, get_es_core
router = APIRouter(prefix="/indices")


@router.post("/{index_name}")
def create_new_index(
        index_name: str = Path(..., description="Name of the index to create"),
        embedding_dim: Optional[int] = Query(None, description="Dimension of the embedding vectors"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Create a new vector index"""
    try:
        return ElasticSearchService.create_index(index_name, embedding_dim, es_core)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating index: {str(e)}"
        )


@router.delete("/{index_name}")
def delete_index(
        index_name: str = Path(..., description="Name of the index to delete"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Delete an index"""
    try:
        return ElasticSearchService.delete_index(index_name, es_core)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error delete index: {str(e)}")


@router.get("")
def get_list_indices(
        pattern: str = Query("*", description="Pattern to match index names"),
        include_stats: bool = Query(False, description="Whether to include index stats"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """List all user indices with optional stats"""
    try:
        return ElasticSearchService.list_indices(pattern, include_stats, es_core)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error get index: {str(e)}")


@router.get("/{index_name}/info")
def get_es_index_info(
        index_name: str = Path(..., description="Name of the index"),
        include_files: bool = Query(True, description="Whether to include file list"),
        include_chunks: bool = Query(False, description="Whether to include text chunks for each file"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Get comprehensive information about an index including stats, fields, sources and process info"""
    try:
        return ElasticSearchService().get_index_info(index_name, include_files, include_chunks, es_core)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"{str(e)}")


# Document Operations
@router.post("/{index_name}/documents", response_model=IndexingResponse)
def get_index_documents(
        index_name: str = Path(..., description="Name of the index"),
        data: IndexingRequest = Body(..., description="Indexing request to process"),
        embedding_model_name: Optional[str] = Query(None, description="Name of the embedding model to use"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """
    Index documents with embeddings, creating the index if it doesn't exist.
    Accepts an IndexingRequest object from data processing.
    """
    try:
        return ElasticSearchService.index_documents(index_name, data, embedding_model_name, es_core)
    except Exception as e:
        error_msg = str(e)
        print(f"Error indexing documents: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error indexing documents: {error_msg}")


@router.delete("/{index_name}/documents")
def delete_documents(
        index_name: str = Path(..., description="Name of the index"),
        path_or_url: str = Query(..., description="Path or URL of documents to delete"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Delete documents by path or URL"""
    try:
        return ElasticSearchService.delete_documents(index_name, path_or_url, es_core)
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=f"Error delete indexing documents: {e}")


# Search Operations

@router.post("/search/accurate")
def accurate_search(
        request: SearchRequest = Body(..., description="Search request parameters"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Search for documents using fuzzy text matching across multiple indices"""
    try:
      return ElasticSearchService.accurate_search(request, es_core)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}")


@router.post("/search/semantic")
def semantic_search(
        request: SearchRequest = Body(..., description="Search request parameters"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Search for similar documents using vector similarity across multiple indices"""
    try:
       return ElasticSearchService.semantic_search(request, es_core)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}")


@router.post("/search/hybrid")
def hybrid_search(
        request: HybridSearchRequest = Body(..., description="Hybrid search request parameters"),
        es_core: ElasticSearchCore = Depends(get_es_core)
):
    """Search for similar documents using hybrid search across multiple indices"""
    try:
        return ElasticSearchService.hybrid_search(request, es_core)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during hybrid search: {str(e)}")


# Health check
@router.get("/health")
def health_check(es_core: ElasticSearchCore = Depends(get_es_core)):
    """Check API and Elasticsearch health"""
    try:
        # Try to list indices as a health check
        return ElasticSearchService.health_check(es_core)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}")
