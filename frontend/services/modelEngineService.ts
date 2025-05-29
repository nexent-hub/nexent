"use client"

import { API_ENDPOINTS } from './api'

export type ConnectionStatus = "success" | "error" | "processing";

interface ModelEngineCheckResult {
  status: ConnectionStatus;
  lastChecked: string;
}

/**
 * ModelEngine service - responsible for interacting with ModelEngine
 */
const modelEngineService = {
  /**
   * Check ModelEngine connection status
   * @returns Promise<ModelEngineCheckResult> Result object containing connection status and check time
   */
  checkConnection: async (): Promise<ModelEngineCheckResult> => {
    try {
      const response = await fetch(API_ENDPOINTS.modelEngine.healthcheck, {
        method: "GET"
      })

      let status: ConnectionStatus = "error";
      
      if (response.ok) {
        try {
          const resp = await response.json()
          // Parse the data returned by the API
          if (resp.data.status === "Connected") {
            status = "success"
          }
          else if (resp.data.status === "Disconnected") {
            status = "error"
          }
        } catch (parseError) {
          // JSON parsing failed,视为连接失败
          console.error("响应数据解析失败:", parseError)
          status = "error"
        }
      } else {
        status = "error"
      }

      return {
        status,
        lastChecked: new Date().toLocaleTimeString()
      }
    } catch (error) {
      console.error("检查ModelEngine连接状态失败:", error)
      return {
        status: "error",
        lastChecked: new Date().toLocaleTimeString()
      }
    }
  }
}

export default modelEngineService; 