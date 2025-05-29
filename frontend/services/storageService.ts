import { API_ENDPOINTS } from './api';

interface StorageUploadResult {
  message: string;
  success_count: number;
  failed_count: number;
  results: {
    success: boolean;
    object_name: string;
    file_name: string;
    file_size: number;
    content_type: string;
    upload_time: string;
    url: string;
    error?: string;
  }[];
}

export const storageService = {
  /**
   * Upload files to storage service
   * @param files List of files to upload
   * @param folder Optional folder path
   * @returns Upload result
   */
  async uploadFiles(
    files: File[],
    folder: string = 'attachments'
  ): Promise<StorageUploadResult> {
    // Create FormData object
    const formData = new FormData();
    
    // Add files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add folder parameter
    formData.append('folder', folder);
    
    // Send request
    const response = await fetch(API_ENDPOINTS.storage.upload, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`上传文件失败: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Get file list
   * @param prefix Optional file prefix
   * @param limit Maximum number of files to return
   * @returns File list
   */
  async getFiles(prefix: string = '', limit: number = 100): Promise<any> {
    const url = new URL(API_ENDPOINTS.storage.files, window.location.origin);
    url.searchParams.append('prefix', prefix);
    url.searchParams.append('limit', limit.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`获取文件列表失败: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Get the URL of a single file
   * @param objectName File object name
   * @returns File URL
   */
  async getFileUrl(objectName: string): Promise<string> {
    const response = await fetch(API_ENDPOINTS.storage.file(objectName));
    
    if (!response.ok) {
      throw new Error(`获取文件URL失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.url;
  },
  
  /**
   * Delete file
   * @param objectName File object name
   * @returns Delete result
   */
  async deleteFile(objectName: string): Promise<any> {
    const response = await fetch(API_ENDPOINTS.storage.delete(objectName), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`删除文件失败: ${response.statusText}`);
    }
    
    return await response.json();
  }
}; 