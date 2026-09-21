import React, { useState } from 'react';
import { FileText, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

export const DocumentViewer = ({ blobUrl, fileName, contentType }) => {
  const [zoom, setZoom] = useState(100);

  // Construct absolute file URL
  const fileUrl = blobUrl?.startsWith('http')
    ? blobUrl
    : `${API_BASE_URL}${blobUrl || ''}`;

  const isPdf = fileName?.toLowerCase().endsWith('.pdf') || contentType?.includes('pdf');
  const isImage = fileName?.match(/\.(jpe?g|png|webp)$/i) || contentType?.includes('image');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="flex flex-col h-full bg-[#181b21] rounded-3xl overflow-hidden border border-[#252932] shadow-xl">
      {/* Viewer Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#14161b] border-b border-[#252932] text-[#7e8695] text-xs">
        <div className="flex items-center gap-2 truncate max-w-[60%]">
          <FileText className="w-4 h-4 text-[#8ff59c] shrink-0" />
          <span className="truncate font-medium text-slate-200">{fileName || 'Invoice Document'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-[#252932] rounded-lg text-[#7e8695] hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-[#7e8695] w-10 text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-[#252932] rounded-lg text-[#7e8695] hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-[#252932] rounded-lg text-[#7e8695] hover:text-white transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-[#252932] mx-1" />
            </>
          )}

          {blobUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252932]/80 hover:bg-[#252932] text-slate-200 rounded-full font-medium text-xs transition-colors border border-[#252932]"
            >
              <span>Pop Out</span>
              <ExternalLink className="w-3 h-3 text-[#8ff59c]" />
            </a>
          )}
        </div>
      </div>

      {/* Viewer Content Canvas */}
      <div className="relative flex-1 bg-[#0c0e12] overflow-auto flex items-center justify-center min-h-[520px]">
        {isPdf ? (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            title="Invoice PDF"
            className="w-full h-full min-h-[620px] border-0"
          />
        ) : isImage ? (
          <div className="p-4 flex items-center justify-center w-full h-full overflow-auto">
            <img
              src={fileUrl}
              alt="Invoice Preview"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              className="max-w-full max-h-[600px] object-contain rounded-2xl shadow-2xl border border-[#252932] transition-transform duration-150"
            />
          </div>
        ) : (
          <div className="text-center p-8 text-[#7e8695]">
            <FileText className="w-12 h-12 text-[#7e8695]/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">Document preview unavailable</p>
            <p className="text-xs text-[#7e8695] mt-1">
              File can be inspected via external viewer or downloaded.
            </p>
            {blobUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] text-xs font-semibold rounded-full shadow transition-colors"
              >
                Open Document
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
