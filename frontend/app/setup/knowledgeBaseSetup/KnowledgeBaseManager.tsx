"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { message } from 'antd'
import { InfoCircleFilled } from '@ant-design/icons'

// Import AppProvider and hooks
import AppProvider from './AppProvider'
import { useKnowledgeBaseContext } from './knowledgeBase/KnowledgeBaseContext'
import { KnowledgeBase } from '@/types/knowledgeBase'
import { useDocumentContext } from './document/DocumentContext'
import { useUIContext } from './UIStateManager'
import knowledgeBaseService from '@/services/knowledgeBaseService'
import knowledgeBasePollingService from '@/services/knowledgeBasePollingService'

// Import new components
import KnowledgeBaseList from './knowledgeBase/KnowledgeBaseList'
import DocumentList from './document/DocumentListContainer'
import ConfirmModal from './components/ConfirmModal'

// Layout Height Constant Configuration (shared with AgentConfig)
export const MAIN_CONTENT_HEIGHT = '72.5vh';

// EmptyState component defined directly in this file
interface EmptyStateProps {
  icon?: React.ReactNode | string
  title: string
  description?: string
  action?: React.ReactNode
  containerHeight?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  action,
  containerHeight = '100%'
}) => {
  return (
    <div 
      className="flex items-center justify-center p-4"
      style={{ height: containerHeight }}
    >
      <div className="text-center">
        {typeof icon === 'string' ? (
          <div className="text-gray-400 text-3xl mb-2">{icon}</div>
        ) : (
          <div className="text-gray-400 mb-2">{icon}</div>
        )}
        <h3 className="text-base font-medium text-gray-700 mb-1">{title}</h3>
        {description && (
          <p className="text-gray-500 max-w-md text-xs mb-4">{description}</p>
        )}
        {action && (
          <div className="mt-2">{action}</div>
        )}
      </div>
    </div>
  )
}

// Update the wrapper component
export default function DataConfigWrapper() {
  return (
    <AppProvider>
      <DataConfig />
    </AppProvider>
  )
}

function DataConfig() {
  // Get context values
  const { 
    state: kbState, 
    fetchKnowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    selectKnowledgeBase,
    setActiveKnowledgeBase,
    isKnowledgeBaseSelectable,
    refreshKnowledgeBaseData,
    summaryIndex,
  } = useKnowledgeBaseContext();

  const {
    state: docState,
    fetchDocuments,
    uploadDocuments,
    deleteDocument
  } = useDocumentContext();

  const {
    state: uiState,
    setDragging,
  } = useUIContext();

  // Create mode state
  const [isCreatingMode, setIsCreatingMode] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [hasClickedUpload, setHasClickedUpload] = useState(false);

  // 添加监听选中新知识库的事件
  useEffect(() => {
    const handleSelectNewKnowledgeBase = (e: CustomEvent) => {
      const { knowledgeBase } = e.detail;
      if (knowledgeBase) {
        setIsCreatingMode(false);
        setHasClickedUpload(false);
        setActiveKnowledgeBase(knowledgeBase);
        fetchDocuments(knowledgeBase.id);
      }
    };
    
    // 添加监听获取知识库数据的事件
    const handleGetKnowledgeBaseData = () => {
      // 获取当前选中的知识库信息
      const selectedKbNames = kbState.knowledgeBases
        .filter(kb => kbState.selectedIds.includes(kb.id))
        .map(kb => kb.name);
      
      const selectedKbModels = kbState.knowledgeBases
        .filter(kb => kbState.selectedIds.includes(kb.id))
        .map(kb => kb.embeddingModel);
      
      const selectedKbSources = kbState.knowledgeBases
        .filter(kb => kbState.selectedIds.includes(kb.id))
        .map(kb => kb.source);
      
      // 发送响应事件
      window.dispatchEvent(new CustomEvent('knowledgeBaseDataResponse', {
        detail: {
          selectedKbNames,
          selectedKbModels,
          selectedKbSources
        }
      }));
    };
    
    window.addEventListener('selectNewKnowledgeBase', handleSelectNewKnowledgeBase as EventListener);
    window.addEventListener('getKnowledgeBaseData', handleGetKnowledgeBaseData);
    
    return () => {
      window.removeEventListener('selectNewKnowledgeBase', handleSelectNewKnowledgeBase as EventListener);
      window.removeEventListener('getKnowledgeBaseData', handleGetKnowledgeBaseData);
    };
  }, [kbState.knowledgeBases, kbState.selectedIds, setActiveKnowledgeBase, fetchDocuments, setIsCreatingMode, setHasClickedUpload]);

  // Generate unique knowledge base name
  const generateUniqueKbName = (existingKbs: KnowledgeBase[]): string => {
    const baseNamePrefix = "新知识库";
    const existingNames = new Set(existingKbs.map(kb => kb.name));
    
    // 如果基础名称未被使用，直接返回
    if (!existingNames.has(baseNamePrefix)) {
      return baseNamePrefix;
    }
    
    // 否则尝试添加数字后缀，直到找到未被使用的名称
    let counter = 1;
    while (existingNames.has(`${baseNamePrefix}${counter}`)) {
      counter++;
    }
    
    return `${baseNamePrefix}${counter}`;
  };

  // Handle knowledge base click logic, set current active knowledge base
  const handleKnowledgeBaseClick = (kb: KnowledgeBase) => {
    setIsCreatingMode(false); // Reset creating mode
    setHasClickedUpload(false); // 重置上传按钮点击状态

    // 无论是否切换知识库，都需要获取最新文档信息
    const isChangingKB = !kbState.activeKnowledgeBase || kb.id !== kbState.activeKnowledgeBase.id;

    // 如果是切换知识库，更新激活状态
    if (isChangingKB) {
      setActiveKnowledgeBase(kb);
    }

    // 设置活动知识库ID到轮询服务
    knowledgeBasePollingService.setActiveKnowledgeBase(kb.id);

    // 获取文档
    fetchDocuments(kb.id);
    
    // 调用知识库切换处理函数
    handleKnowledgeBaseChange(kb);
  }

  // Handle knowledge base change event
  const handleKnowledgeBaseChange = async (kb: KnowledgeBase) => {
    try {
      // 直接获取最新文档数据，强制从服务器获取最新数据
      const documents = await knowledgeBaseService.getDocuments(kb.id, true);

      // 触发文档更新事件
      knowledgeBasePollingService.triggerDocumentsUpdate(kb.id, documents);

      // 后台更新知识库统计信息
      setTimeout(async () => {
        try {
          await refreshKnowledgeBaseData(true);
        } catch (error) {
          console.error("获取知识库最新数据失败:", error);
        }
      }, 100);
    } catch (error) {
      console.error("获取文档列表失败:", error);
      message.error("获取文档列表失败");
    }
  };

  // Add a drag and drop upload related handler function
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }

  const handleDragLeave = () => {
    setDragging(false);
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    // 如果是创建模式或有活动知识库，则处理文件
    if (isCreatingMode || kbState.activeKnowledgeBase) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setUploadFiles(files);
        handleFileUpload();
      }
    } else {
      message.warning("请先选择一个知识库或创建新知识库");
    }
  }

  // Handle knowledge base deletion
  const handleDelete = (id: string) => {
    ConfirmModal.confirm({
      title: '确定要删除这个知识库吗？',
      content: '删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteKnowledgeBase(id);
          
          // Clear preloaded data, force fetch latest data from server
          localStorage.removeItem('preloaded_kb_data');

          // Delay 1 second before refreshing knowledge base list to ensure backend processing is complete
          setTimeout(async () => {
            await fetchKnowledgeBases(false, false);
            message.success("删除知识库成功");
          }, 1000);
        } catch (error) {
          message.error("删除知识库失败");
        }
      }
    });
  }

  // Handle knowledge base sync
  const handleSync = () => {
    // When manually syncing, force fetch latest data from server
    refreshKnowledgeBaseData(true)
      .then(() => {
        message.success("同步知识库成功");
      })
      .catch((error) => {
        message.error("同步知识库失败: " + (error.message || '未知错误'));
      });
  }

  // Handle new knowledge base creation
  const handleCreateNew = () => {
    // Generate default knowledge base name
    const defaultName = generateUniqueKbName(kbState.knowledgeBases);
    setNewKbName(defaultName);
    setIsCreatingMode(true);
    setHasClickedUpload(false); // 重置上传按钮点击状态
    setActiveKnowledgeBase(null as unknown as KnowledgeBase);
    setUploadFiles([]); // 重置上传文件数组，清空所有待上传文件
  };

  // Handle document deletion
  const handleDeleteDocument = (docId: string) => {
    const kbId = kbState.activeKnowledgeBase?.id;
    if (!kbId) return;

    ConfirmModal.confirm({
      title: '确定要删除这个文档吗？',
      content: '删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDocument(kbId, docId);
          message.success("删除文档成功");
        } catch (error) {
          message.error("删除文档失败");
        }
      }
    });
  }

  // 处理上传文件
  const handleFileUpload = async () => {
    // 确保有文件要上传
    if (!uploadFiles.length) {
      message.warning("请先选择文件");
      return;
    }

    const filesToUpload = uploadFiles;

    // 创建模式逻辑
    if (isCreatingMode) {
      if (!newKbName || newKbName.trim() === "") {
        message.warning("请输入知识库名称");
        return;
      }

      setHasClickedUpload(true); // 已点击上传按钮，则立即锁定知识库名称输入
      
      try {
        // 1. 先进行知识库名称重复校验
        const nameExists = await knowledgeBaseService.checkKnowledgeBaseNameExists(newKbName.trim());

        if (nameExists) {
          message.error(`知识库名称"${newKbName.trim()}"已存在，请更换名称`);
          setHasClickedUpload(false); // 重置上传按钮点击状态，允许用户修改名称
          return; // 如果名称重复，直接返回，不继续执行后续逻辑
        }

        // 2. 创建知识库
        const newKB = await createKnowledgeBase(
          newKbName.trim(),
          "通过文档上传创建的知识库",
          "elasticsearch"
        );
        
        if (!newKB) {
          message.error("知识库创建失败");
          setHasClickedUpload(false); // 重置上传按钮点击状态，允许重试
          return;
        }
        
        // 3. 上传文件到新知识库
        await uploadDocuments(newKB.id, filesToUpload);
        message.success("文件上传成功");
        setUploadFiles([]);
        
        // 立即设置为活动知识库并退出创建模式
        setActiveKnowledgeBase(newKB);
        knowledgeBasePollingService.setActiveKnowledgeBase(newKB.id);
        
        // 退出创建模式，防止用户修改知识库名称
        setIsCreatingMode(false);
        setHasClickedUpload(false); // 重置上传状态
        
        // 使用轮询服务等待知识库创建完成并监控文档处理状态
        knowledgeBasePollingService.waitForKnowledgeBaseCreation(
          newKB.name,
          (found) => {
            if (found) {
              // 知识库创建成功后，设置为活动知识库
              setActiveKnowledgeBase(newKB);

              // 触发文档轮询，监控处理状态
              knowledgeBasePollingService.startDocumentStatusPolling(
                newKB.id,
                (documents) => {
                  knowledgeBasePollingService.triggerDocumentsUpdate(
                    newKB.id,
                    documents
                  );
                }
              );

              // 获取最新文档并触发知识库列表更新
              fetchDocuments(newKB.id);
              knowledgeBasePollingService.triggerKnowledgeBaseListUpdate(true);
            }
          }
        );
        
      } catch (error) {
        console.error("知识库创建失败:", error);
        message.error("知识库创建失败");
        setHasClickedUpload(false); // 重置上传按钮点击状态，允许重试
      }
      return;
    }
    
    // Non-creation mode upload
    const kbId = kbState.activeKnowledgeBase?.id;
    if (!kbId) {
      message.warning("请先选择一个知识库");
      return;
    }
    
    try {
      await uploadDocuments(kbId, filesToUpload);
      message.success("文件上传成功");
      setUploadFiles([]);
      
      // 使用新的轮询服务
      knowledgeBasePollingService.triggerKnowledgeBaseListUpdate(true);

      // 先获取最新文档状态
      const latestDocs = await knowledgeBaseService.getDocuments(kbId, true);

      // 手动触发文档更新，确保UI立即更新
      window.dispatchEvent(new CustomEvent('documentsUpdated', {
        detail: {
          kbId,
          documents: latestDocs
        }
      }));

      // 立即强制获取最新文档
      fetchDocuments(kbId, true);

      // 立即启动文档状态轮询 - 保证即使文档列表为空也能启动轮询
      knowledgeBasePollingService.startDocumentStatusPolling(
        kbId,
        (documents) => {
          console.log(`轮询服务获取到 ${documents.length} 个文档`);
          // 更新文档列表
          knowledgeBasePollingService.triggerDocumentsUpdate(
            kbId,
            documents
          );

          // 同时更新文档上下文
          window.dispatchEvent(new CustomEvent('documentsUpdated', {
            detail: {
              kbId,
              documents
            }
          }));
        }
      );
      
    } catch (error) {
      console.error('文件上传失败:', error);
      message.error("文件上传失败");
    }
  }

  // File selection handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFiles(Array.from(e.target.files));
    }
  }

  // Get current viewing knowledge base documents
  const viewingDocuments = kbState.activeKnowledgeBase 
    ? docState.documentsMap[kbState.activeKnowledgeBase.id] || []
    : [];

  // Get current knowledge base name
  const viewingKbName = kbState.activeKnowledgeBase?.name || "";

  // Handle knowledge base selection
  const handleSelectKnowledgeBase = (id: string) => {
    selectKnowledgeBase(id);
    
    // When selecting knowledge base also get latest data (low priority background operation)
    setTimeout(async () => {
      try {
        // 使用较低优先级刷新数据，因为这不是关键操作
        await refreshKnowledgeBaseData(true);
      } catch (error) {
        console.error("刷新知识库数据失败:", error);
        // Error doesn't affect user experience
      }
    }, 500); // Delay execution, lower priority
  }

  // Handle auto summary
  const handleAutoSummary = async () => {
    if (!viewingKbName) {
      message.warning('请先选择一个知识库');
      return;
    }

    try {
      const summary = await summaryIndex(viewingKbName, 10);
      // Here you can process the returned summary content based on actual needs
      // For example display in dialog or update to some state
      message.success('知识库总结完成');
      // TODO: Handle summary content
    } catch (error) {
      message.error('获取知识库总结失败');
      console.error('获取知识库总结失败:', error);
    } finally {
    }
  };

  // 在组件初始化或活动知识库变化时更新轮询服务中的活动知识库ID
  useEffect(() => {
    if (kbState.activeKnowledgeBase) {
      knowledgeBasePollingService.setActiveKnowledgeBase(kbState.activeKnowledgeBase.id);
    } else if (isCreatingMode && newKbName) {
      knowledgeBasePollingService.setActiveKnowledgeBase(newKbName);
    } else {
      knowledgeBasePollingService.setActiveKnowledgeBase(null);
    }
  }, [kbState.activeKnowledgeBase, isCreatingMode, newKbName]);

  // 在组件卸载时清理轮询
  useEffect(() => {
    return () => {
      // 停止所有轮询
      knowledgeBasePollingService.stopAllPolling();
    };
  }, []);

  return (
    <>
      <div 
        className="flex h-full pl-[16px] pr-[2px]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left knowledge base list - occupies 1/3 space */}
        <div className="w-1/3 pr-3">
          <KnowledgeBaseList
            knowledgeBases={kbState.knowledgeBases}
            selectedIds={kbState.selectedIds}
            activeKnowledgeBase={kbState.activeKnowledgeBase}
            currentEmbeddingModel={kbState.currentEmbeddingModel}
            isLoading={kbState.isLoading}
            onSelect={handleSelectKnowledgeBase}
            onClick={handleKnowledgeBaseClick}
            onDelete={handleDelete}
            onSync={handleSync}
            onCreateNew={handleCreateNew}
            isSelectable={isKnowledgeBaseSelectable}
            getModelDisplayName={(modelId) => modelId}
            containerHeight={MAIN_CONTENT_HEIGHT}
            onKnowledgeBaseChange={() => {}} // No need to trigger repeatedly here as it's already handled in handleKnowledgeBaseClick
          />
        </div>
        
        {/* Right content area - occupies 2/3 space, now unified with config.tsx style */}
        <div className="w-2/3 pr-3.5 flex flex-col h-full">
          <div className="bg-white border border-gray-200 rounded-md flex flex-col overflow-hidden p-4">
            <div style={{
              background: "#fff",
              overflowY: "auto",
              overflowX: "hidden"
            }}>
              {isCreatingMode ? (
                <DocumentList
                  documents={[]}
                  onDelete={() => {}}
                  isCreatingMode={true}
                  knowledgeBaseName={newKbName}
                  onNameChange={setNewKbName}
                  containerHeight={MAIN_CONTENT_HEIGHT}
                  hasDocuments={hasClickedUpload || docState.isUploading}
                  // Upload related props
                  isDragging={uiState.isDragging}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                  selectedFiles={uploadFiles}
                  onUpload={() => handleFileUpload()}
                  isUploading={docState.isUploading}
                />
              ) : kbState.activeKnowledgeBase ? (
                <DocumentList
                  documents={viewingDocuments}
                  onDelete={handleDeleteDocument}
                  knowledgeBaseName={viewingKbName}
                  loading={docState.loadingKbIds.has(kbState.activeKnowledgeBase.id)}
                  modelMismatch={!isKnowledgeBaseSelectable(kbState.activeKnowledgeBase)}
                  currentModel={kbState.currentEmbeddingModel || ''}
                  knowledgeBaseModel={kbState.activeKnowledgeBase.embeddingModel}
                  embeddingModelInfo={
                    !isKnowledgeBaseSelectable(kbState.activeKnowledgeBase) ?
                    `当前模型${kbState.currentEmbeddingModel || ''}与知识库模型${kbState.activeKnowledgeBase.embeddingModel}不匹配，无法使用` :
                    undefined
                  }
                  containerHeight={MAIN_CONTENT_HEIGHT}
                  hasDocuments={viewingDocuments.length > 0}
                  // Upload related props
                  isDragging={uiState.isDragging}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                  selectedFiles={uploadFiles}
                  onUpload={() => handleFileUpload()}
                  isUploading={docState.isUploading}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    title="未选择知识库"
                    description="请在左侧列表选择一个知识库，或创建新的知识库"
                    icon={<InfoCircleFilled style={{ fontSize: 36, color: '#1677ff' }} />}
                    containerHeight={MAIN_CONTENT_HEIGHT}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

