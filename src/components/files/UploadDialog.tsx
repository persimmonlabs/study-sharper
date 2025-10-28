"use client";

import React, { useState, useRef, useEffect } from "react";

import { Upload, X, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (fileId: string) => void;
}

interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  fileName: string;
  fileId?: string;
  progress: number;
  message: string;
  error?: string;
  chunkCount?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://study-sharper-backend-production.up.railway.app";

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Not authenticated - please log in");
  }

  return session.access_token;
}

export function UploadDialog({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    fileName: "",
    progress: 0,
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = [".pdf", ".docx", ".txt"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_TYPES.includes(extension)) {
      return {
        valid: false,
        error: `File type not supported. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Max size: 50MB`,
      };
    }

    return { valid: true };
  };

  const pollFileStatus = async (
    fileId: string,
    token: string
  ): Promise<void> => {
    const maxAttempts = 60; // 2 minutes with 2-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/files/status/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to get file status");
        }

        const data = await response.json();

        if (data.status === "completed") {
          setUploadProgress({
            status: "completed",
            fileName: data.title,
            fileId: fileId,
            progress: 100,
            message: `✅ Processing complete! ${data.chunk_count} chunks created.`,
            chunkCount: data.chunk_count,
          });
          onUploadSuccess?.(fileId);
          return;
        } else if (data.status === "failed") {
          setUploadProgress({
            status: "error",
            fileName: data.title,
            fileId: fileId,
            progress: 0,
            message: `❌ Processing failed`,
            error: data.error_message,
          });
          return;
        } else {
          // Still processing
          setUploadProgress((prev) => ({
            ...prev,
            status: "processing",
            progress: Math.min(prev.progress + 5, 95),
            message: `Processing... (${data.status})`,
          }));
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error("Error polling file status:", error);
        setUploadProgress((prev) => ({
          ...prev,
          status: "error",
          error: "Failed to check processing status",
        }));
        return;
      }
    }

    setUploadProgress((prev) => ({
      ...prev,
      status: "error",
      error: "Processing timeout - took too long",
    }));
  };

  const handleFileUpload = async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadProgress({
        status: "error",
        fileName: file.name,
        progress: 0,
        message: `❌ ${validation.error}`,
        error: validation.error,
      });
      return;
    }

    // Get auth token
    let token: string;
    try {
      token = await getAuthToken();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setUploadProgress({
        status: "error",
        fileName: file.name,
        progress: 0,
        message: `❌ ${errorMessage}`,
        error: errorMessage,
      });
      return;
    }

    try {
      // Upload file
      setUploadProgress({
        status: "uploading",
        fileName: file.name,
        progress: 30,
        message: "Uploading file...",
      });

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.detail || "Upload failed");
      }

      const uploadData = await uploadResponse.json();
      const fileId = uploadData.file_id;

      setUploadProgress({
        status: "processing",
        fileName: file.name,
        fileId: fileId,
        progress: 50,
        message: "Processing file with AI...",
      });

      // Poll for completion
      await pollFileStatus(fileId, token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setUploadProgress({
        status: "error",
        fileName: file.name,
        progress: 0,
        message: `❌ ${errorMessage}`,
        error: errorMessage,
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const resetUpload = () => {
    setUploadProgress({
      status: "idle",
      fileName: "",
      progress: 0,
      message: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (
      uploadProgress.status !== "uploading" &&
      uploadProgress.status !== "processing"
    ) {
      resetUpload();
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUploadProgress({
        status: "idle",
        fileName: "",
        progress: 0,
        message: "",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const isProgressActive =
    uploadProgress.status === "uploading" || uploadProgress.status === "processing";

  if (!isOpen && !isProgressActive) return null;

  return (
    <>
      {isProgressActive && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
          <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uploadProgress.fileName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {uploadProgress.message}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(uploadProgress.progress)}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && !isProgressActive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload File
              </h2>
              <button
                onClick={handleClose}
                disabled={
                  uploadProgress.status === "uploading" ||
                  uploadProgress.status === "processing"
                }
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {uploadProgress.status === "idle" ? (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-300 bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    <Upload
                      size={48}
                      className={`mx-auto mb-4 ${
                        isDragging
                          ? "text-blue-500"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    />
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      or click to select
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium"
                    >
                      Browse Files
                    </label>
                  </div>

                  {/* File Types Info */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Supported:</strong> PDF, DOCX, TXT
                      <br />
                      <strong>Max size:</strong> 50MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Progress */}
                  <div className="space-y-4">
                    {/* File Name */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {uploadProgress.fileName}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {uploadProgress.status === "uploading" ||
                      uploadProgress.status === "processing" ? (
                        <>
                          <Clock size={18} className="text-blue-600 animate-spin" />
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {uploadProgress.message}
                          </p>
                        </>
                      ) : uploadProgress.status === "completed" ? (
                        <>
                          <CheckCircle size={18} className="text-green-600" />
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {uploadProgress.message}
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} className="text-red-600" />
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {uploadProgress.message}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Error Message */}
                    {uploadProgress.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <p className="text-sm text-red-900 dark:text-red-100">
                          {uploadProgress.error}
                        </p>
                      </div>
                    )}

                    {/* Chunk Count */}
                    {uploadProgress.chunkCount && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm text-green-900 dark:text-green-100">
                          Created <strong>{uploadProgress.chunkCount}</strong> chunks for
                          processing
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
              {uploadProgress.status === "completed" ? (
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Done
                </button>
              ) : uploadProgress.status === "uploading" ||
                uploadProgress.status === "processing" ? (
                <button
                  disabled
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium cursor-not-allowed"
                >
                  Processing...
                </button>
              ) : (
                <>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                  {uploadProgress.status === "error" && (
                    <button
                      onClick={resetUpload}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Try Again
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}