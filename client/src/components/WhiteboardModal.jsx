import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Edit3,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  X,
  Highlighter,
  Minus,
  Square,
  Circle,
  Type,
} from 'lucide-react';

const COLORS = [
  '#ffffff', // White
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
];

const WhiteboardModal = ({ meetingId, socket, onClose }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'text'
  const [color, setColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);

  const currentStrokeRef = useRef(null);
  const strokesRef = useRef([]);
  const redoStackRef = useRef([]);

  // Redraw complete canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark canvas background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render strokes
    strokesRef.current.forEach((stroke) => {
      ctx.save();

      if (stroke.tool === 'highlighter') {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = stroke.size * 3.5;
        ctx.lineCap = 'square';
      } else if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#0b0f19';
        ctx.lineWidth = stroke.size * 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1.0;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1.0;
      }
      ctx.lineJoin = 'round';

      // Shape: Rectangle
      if (stroke.tool === 'rect' && stroke.points?.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.strokeRect(
          start.x * width,
          start.y * height,
          (end.x - start.x) * width,
          (end.y - start.y) * height
        );
      }
      // Shape: Circle
      else if (stroke.tool === 'circle' && stroke.points?.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(
          Math.pow((end.x - start.x) * width, 2) + Math.pow((end.y - start.y) * height, 2)
        );
        ctx.beginPath();
        ctx.arc(start.x * width, start.y * height, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Shape: Line
      else if (stroke.tool === 'line' && stroke.points?.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
      // Text
      else if (stroke.tool === 'text' && stroke.text && stroke.points?.length > 0) {
        ctx.fillStyle = stroke.color;
        ctx.font = `${stroke.size * 5 + 12}px Inter, sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0].x * width, stroke.points[0].y * height);
      }
      // Freehand Pen / Highlighter / Eraser
      else if (stroke.points && stroke.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
        }
        ctx.stroke();
      }

      ctx.restore();
    });
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleStrokeDrawn = (incomingStroke) => {
      strokesRef.current.push(incomingStroke);
      redrawCanvas();
    };

    const handleWhiteboardHistory = (history) => {
      strokesRef.current = history || [];
      redrawCanvas();
    };

    const handleWhiteboardCleared = () => {
      strokesRef.current = [];
      redrawCanvas();
    };

    socket.on('stroke-drawn', handleStrokeDrawn);
    socket.on('whiteboard-history', handleWhiteboardHistory);
    socket.on('whiteboard-cleared', handleWhiteboardCleared);

    return () => {
      socket.off('stroke-drawn', handleStrokeDrawn);
      socket.off('whiteboard-history', handleWhiteboardHistory);
      socket.off('whiteboard-cleared', handleWhiteboardCleared);
    };
  }, [socket, redrawCanvas]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    // Text tool click prompt
    if (tool === 'text') {
      const text = prompt('Enter text for whiteboard:');
      if (text && text.trim()) {
        const textStroke = {
          tool: 'text',
          color,
          size: brushSize,
          text: text.trim(),
          points: [{ x, y }],
        };
        strokesRef.current.push(textStroke);
        redrawCanvas();
        if (socket && meetingId) {
          socket.emit('draw-stroke', { meetingId, stroke: textStroke });
        }
      }
      return;
    }

    setIsDrawing(true);
    redoStackRef.current = [];
    const newStroke = {
      tool,
      color,
      size: brushSize,
      points: [{ x, y }],
    };

    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    redrawCanvas();
  };

  const draw = (e) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    if (tool === 'rect' || tool === 'circle' || tool === 'line') {
      // Shape tools: update end point
      if (currentStrokeRef.current.points.length === 1) {
        currentStrokeRef.current.points.push({ x, y });
      } else {
        currentStrokeRef.current.points[1] = { x, y };
      }
    } else {
      // Freehand drawing
      currentStrokeRef.current.points.push({ x, y });
    }
    redrawCanvas();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      if (socket && meetingId) {
        socket.emit('draw-stroke', {
          meetingId,
          stroke: currentStrokeRef.current,
        });
      }
    }
    currentStrokeRef.current = null;
  };

  const handleUndo = () => {
    if (strokesRef.current.length > 0) {
      const popped = strokesRef.current.pop();
      if (popped) redoStackRef.current.push(popped);
      redrawCanvas();
      if (socket && meetingId) {
        socket.emit('undo-whiteboard', { meetingId });
      }
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length > 0) {
      const restored = redoStackRef.current.pop();
      if (restored) {
        strokesRef.current.push(restored);
        redrawCanvas();
        if (socket && meetingId) {
          socket.emit('draw-stroke', { meetingId, stroke: restored });
        }
      }
    }
  };

  const handleClear = () => {
    if (confirm('Clear the entire whiteboard for all participants?')) {
      strokesRef.current = [];
      redrawCanvas();
      if (socket && meetingId) {
        socket.emit('clear-whiteboard', { meetingId });
      }
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${meetingId}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-fadeIn">
      {/* Top Toolbar */}
      <div className="w-full h-16 rounded-2xl glass-dock px-3 sm:px-4 flex items-center justify-between mb-4 border border-white/10 overflow-x-auto">
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <h3 className="text-sm font-bold text-white tracking-wide">Whiteboard Studio</h3>
            <p className="text-[10px] text-slate-400">Live multi-user collaboration</p>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'pen'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Pen Tool"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setTool('highlighter')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'highlighter'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Line */}
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'line'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Straight Line"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Rectangle */}
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'rect'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Circle */}
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'circle'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'text'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Text Tool (Click canvas to place text)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-xl transition-all ${
              tool === 'eraser'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block" />

          {/* Color Palette */}
          <div className="hidden md:flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('pen');
                }}
                className={`w-5 h-5 rounded-full transition-transform ${
                  color === c && tool !== 'eraser' ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          {/* Undo */}
          <button
            onClick={handleUndo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Clear Board"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Download PNG */}
          <button
            onClick={handleExport}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Download PNG"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Close Whiteboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full rounded-2xl overflow-hidden glass-panel border border-white/10 relative shadow-2xl">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};

export default WhiteboardModal;
