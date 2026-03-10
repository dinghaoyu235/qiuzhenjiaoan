import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Web 端兼容性工具
 * 处理移动端和 Web 端的差异
 */

/**
 * 检查当前是否为 Web 平台
 */
export const isWeb = Platform.OS === 'web';

/**
 * Web 端文件下载
 */
export const downloadFileWeb = async (url: string, filename: string) => {
  if (!isWeb) {
    throw new Error('This function is only for Web platform');
  }

  try {
    // 使用 fetch 下载文件
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('[Web Download] Failed to download file:', error);
    throw error;
  }
};

/**
 * Web 端图片上传
 */
export const uploadImageWeb = async (file: File): Promise<string> => {
  if (!isWeb) {
    throw new Error('This function is only for Web platform');
  }

  try {
    // 将 File 转换为 base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return base64;
  } catch (error) {
    console.error('[Web Upload] Failed to process image:', error);
    throw error;
  }
};

/**
 * Web 端音频录制器
 */
export class WebAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * 请求麦克风权限并开始录制
   */
  async startRecording(): Promise<void> {
    if (!isWeb) {
      throw new Error('This function is only for Web platform');
    }

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });

      // 收集数据块
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // 开始录制
      this.mediaRecorder.start();
    } catch (error) {
      console.error('[Web Audio] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * 停止录制并返回音频 base64
   */
  async stopRecording(): Promise<string> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = () => {
        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          
          // 转换为 base64
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            
            // 清理
            this.chunks = [];
            if (this.stream) {
              this.stream.getTracks().forEach(track => track.stop());
              this.stream = null;
            }
            this.mediaRecorder = null;
            
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * 取消录制
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.chunks = [];
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }
}

/**
 * Web 端图片选择器
 */
export const pickImageWeb = async (): Promise<string | null> => {
  if (!isWeb) {
    throw new Error('This function is only for Web platform');
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    };
    
    input.oncancel = () => resolve(null);
    
    input.click();
  });
};

/**
 * Web 端复制到剪贴板
 */
export const copyToClipboardWeb = async (text: string): Promise<void> => {
  if (!isWeb) {
    throw new Error('This function is only for Web platform');
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('[Web Clipboard] Failed to copy:', error);
    throw error;
  }
};

/**
 * Web 端保存图片到本地
 */
export const saveImageWeb = async (url: string, filename: string): Promise<void> => {
  if (!isWeb) {
    throw new Error('This function is only for Web platform');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('[Web Save] Failed to save image:', error);
    throw error;
  }
};
