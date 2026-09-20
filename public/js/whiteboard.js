/**
 * Enhanced Whiteboard Module (Undo/Redo, Text Tool, Arrow Tool, Remote Live Cursors)
 */

const AppWhiteboard = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  tool: 'pencil', // pencil, line, rect, circle, arrow, text, eraser
  color: '#6366f1',
  size: 3,
  startX: 0,
  startY: 0,
  snapshot: null,
  socket: null,
  roomId: null,

  undoStack: [],
  redoStack: [],
  remoteCursors: {}, // socketId -> { username, x, y }

  init(socketInstance, roomId) {
    this.socket = socketInstance;
    this.roomId = roomId;

    this.canvas = document.getElementById('whiteboard-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.bindEvents();
    this.bindSocket();
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    if (!container) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.canvas, 0, 0);

    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 500;
    this.ctx.drawImage(tempCanvas, 0, 0);
  },

  bindEvents() {
    // Tool Buttons
    const toolBtns = document.querySelectorAll('.wb-tool-btn[data-tool]');
    toolBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = btn.dataset.tool;
      });
    });

    // Color & Size
    const colorInput = document.getElementById('wb-color');
    if (colorInput) {
      colorInput.addEventListener('input', (e) => (this.color = e.target.value));
    }

    const sizeInput = document.getElementById('wb-size');
    if (sizeInput) {
      sizeInput.addEventListener('input', (e) => (this.size = parseInt(e.target.value, 10)));
    }

    // Undo / Redo
    const undoBtn = document.getElementById('wb-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());

    const redoBtn = document.getElementById('wb-redo');
    if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

    // Clear
    const clearBtn = document.getElementById('wb-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearBoard(true));

    // Export PNG
    const exportBtn = document.getElementById('wb-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
      });
    }

    // Canvas Mouse / Touch Events
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => {
      this.draw(e);
      this.emitCursor(e);
    });
    this.canvas.addEventListener('mouseup', (e) => this.stopDraw(e));
    this.canvas.addEventListener('mouseleave', (e) => this.stopDraw(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDraw(e.touches[0]);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => this.stopDraw(e));
  },

  bindSocket() {
    if (!this.socket) return;

    this.socket.on('stroke-drawn', (stroke) => {
      this.renderStroke(stroke);
    });

    this.socket.on('canvas-cleared', () => {
      this.clearBoard(false);
    });

    this.socket.on('whiteboard-history', (strokes) => {
      this.clearBoard(false);
      strokes.forEach((s) => this.renderStroke(s));
    });

    // Remote Cursor Tracker Sync
    this.socket.on('peer-cursor', ({ socketId, username, x, y }) => {
      this.remoteCursors[socketId] = { username, x, y };
      this.renderRemoteCursors();
    });
  },

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  emitCursor(e) {
    if (!this.socket || !this.roomId) return;
    const pos = this.getPos(e);
    this.socket.emit('cursor-position', { x: pos.x, y: pos.y });
  },

  renderRemoteCursors() {
    const layer = document.getElementById('remote-cursors-layer');
    if (!layer) return;

    layer.innerHTML = '';
    Object.entries(this.remoteCursors).forEach(([sId, cursor]) => {
      const el = document.createElement('div');
      el.className = 'remote-cursor-tag';
      el.style.left = `${cursor.x}px`;
      el.style.top = `${cursor.y}px`;
      el.innerHTML = `📍 ${cursor.username}`;
      layer.appendChild(el);
    });
  },

  saveState() {
    if (!this.ctx || !this.canvas) return;
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    this.redoStack = []; // Clear redo stack on new action
  },

  undo() {
    if (this.undoStack.length > 0) {
      this.redoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
      const prevState = this.undoStack.pop();
      this.ctx.putImageData(prevState, 0, 0);
    }
    if (this.socket && this.roomId) {
      this.socket.emit('whiteboard-undo', { roomId: this.roomId });
    }
  },

  redo() {
    if (this.redoStack.length > 0) {
      this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
      const nextState = this.redoStack.pop();
      this.ctx.putImageData(nextState, 0, 0);
    }
  },

  startDraw(e) {
    this.isDrawing = true;
    this.saveState();
    const pos = this.getPos(e);
    this.startX = pos.x;
    this.startY = pos.y;

    if (this.tool === 'text') {
      const text = prompt('Enter text for canvas:');
      if (text) {
        const stroke = {
          type: 'text',
          tool: 'text',
          x1: this.startX,
          y1: this.startY,
          text: text,
          color: this.color,
          size: Math.max(14, this.size * 5)
        };
        this.renderStroke(stroke);
        this.emitStroke(stroke);
      }
      this.isDrawing = false;
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  },

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);

    if (this.tool === 'pencil' || this.tool === 'eraser') {
      const color = this.tool === 'eraser' ? '#ffffff' : this.color;
      const strokeSize = this.tool === 'eraser' ? Math.max(16, this.size * 3) : this.size;
      const stroke = {
        type: 'freehand',
        tool: this.tool,
        x1: this.startX,
        y1: this.startY,
        x2: pos.x,
        y2: pos.y,
        color: color,
        size: strokeSize
      };
      this.renderStroke(stroke);
      this.emitStroke(stroke);
      this.startX = pos.x;
      this.startY = pos.y;
    } else {
      this.ctx.putImageData(this.snapshot, 0, 0);
      const stroke = {
        type: 'shape',
        tool: this.tool,
        x1: this.startX,
        y1: this.startY,
        x2: pos.x,
        y2: pos.y,
        color: this.color,
        size: this.size
      };
      this.renderStroke(stroke);
    }
  },

  stopDraw(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.tool !== 'pencil' && this.tool !== 'eraser' && this.tool !== 'text' && e) {
      const pos = this.getPos(e.touches ? e.changedTouches[0] : e);
      const stroke = {
        type: 'shape',
        tool: this.tool,
        x1: this.startX,
        y1: this.startY,
        x2: pos.x,
        y2: pos.y,
        color: this.color,
        size: this.size
      };
      this.emitStroke(stroke);
    }
  },

  renderStroke(s) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = s.color;
    this.ctx.fillStyle = s.color;
    this.ctx.lineWidth = s.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (s.tool === 'text') {
      this.ctx.font = `${s.size}px sans-serif`;
      this.ctx.fillText(s.text, s.x1, s.y1);
    } else if (s.tool === 'freehand' || s.tool === 'pencil' || s.tool === 'eraser') {
      this.ctx.moveTo(s.x1, s.y1);
      this.ctx.lineTo(s.x2, s.y2);
      this.ctx.stroke();
    } else if (s.tool === 'line') {
      this.ctx.moveTo(s.x1, s.y1);
      this.ctx.lineTo(s.x2, s.y2);
      this.ctx.stroke();
    } else if (s.tool === 'rect') {
      this.ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
    } else if (s.tool === 'circle') {
      const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
      this.ctx.arc(s.x1, s.y1, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    } else if (s.tool === 'arrow') {
      this.drawArrow(s.x1, s.y1, s.x2, s.y2, s.size);
    }
  },

  drawArrow(fromX, fromY, toX, toY, size) {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    this.ctx.lineTo(toX, toY);
    this.ctx.fill();
  },

  emitStroke(stroke) {
    if (this.socket && this.roomId) {
      this.socket.emit('draw-stroke', { roomId: this.roomId, stroke });
    }
  },

  clearBoard(emit = true) {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (emit && this.socket && this.roomId) {
      this.socket.emit('clear-canvas', { roomId: this.roomId });
    }
  }
};

window.AppWhiteboard = AppWhiteboard;
