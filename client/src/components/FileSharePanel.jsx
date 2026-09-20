import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, File, Download, X, AlertCircle, CheckCircle2, Loader2, FolderOpen } from 'lucide-react';
import { fileAPI } from '../services/api';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const FileSharePanel = ({ meetingId, user, socket, onClose }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Load existing files for this meeting
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fileAPI.getMeetingFiles(meetingId);
        if (res.data && res.data.files) {
          setFiles(res.data.files);
        }
      } catch (err) {
        console.warn('Failed to load meeting files:', err.message);
      }
    };

    if (meetingId) {
      fetchFiles();
    }
  }, [meetingId]);

  // Listen for real-time file sharing from other participants
  useEffect(() => {
    if (!socket) return;

    const handleFileShared = (newFile) => {
      setFiles((prev) => [newFile, ...prev]);
    };

    socket.on('file-shared', handleFileShared);

    return () => {
      socket.off('file-shared', handleFileShared);
    };
  }, [socket]);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (!selectedFile) return;

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage('Maximum file size is 15 MB.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Prepare upload
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('meetingId', meetingId);

    try {
      const res = await fileAPI.uploadFile(formData);
      const uploadedFile = res.data.file;

      setFiles((prev) => [uploadedFile, ...prev]);
      setSuccessMessage('File uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Notify other participants via Socket.io
      if (socket) {
        socket.emit('file-uploaded', {
          meetingId,
          file: uploadedFile,
        });
      }
    } catch (err) {
      console.error('File upload failed:', err);
      const errText = err.response?.data?.error || 'Failed to upload file. Please check file type.';
      setErrorMessage(errText);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full sm:w-96 h-full flex flex-col border-l border-white/10 glass-panel z-30 select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-white">Shared File Vault</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File Upload Drop Zone */}
      <div className="p-4 border-b border-white/10 bg-slate-950/20">
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isUploading
              ? 'border-brand-500/50 bg-brand-500/5'
              : 'border-white/15 hover:border-brand-500 hover:bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.txt"
          />

          {isUploading ? (
            <div className="flex flex-col items-center py-1">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin mb-2" />
              <span className="text-xs text-brand-300 font-medium">Uploading file securely...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="w-7 h-7 text-indigo-400 mb-1.5" />
              <p className="text-xs font-medium text-slate-200">
                Click to browse or drop file
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                PDF, Word, Excel, Images, ZIP up to 15 MB
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-1.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <File className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
            <p className="text-xs font-medium text-slate-400">No files shared yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Shared files in this session will appear here for all members.
            </p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id || file._id}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3 overflow-hidden pr-2">
                <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                  <File className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-slate-200 truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatFileSize(file.size)} • {file.senderName || 'Participant'}
                  </p>
                </div>
              </div>

              <a
                href={fileAPI.getDownloadUrl(file.id || file._id)}
                download={file.originalName}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/10 text-slate-300 hover:text-white hover:bg-brand-600 transition-colors flex-shrink-0"
                title="Download File"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileSharePanel;
