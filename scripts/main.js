(function () {
  const boardViewport = document.getElementById('boardViewport');
  const cardsLayer = document.getElementById('cardsLayer');
  const connectionLayer = document.getElementById('connectionLayer');

  const addCardBtn = document.getElementById('addCardBtn');
  const clearCanvasBtn = document.getElementById('clearCanvasBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');

  const cardToolbar = document.getElementById('cardToolbar');
  const cardEditBtn = document.getElementById('cardEditBtn');
  const cardDeleteBtn = document.getElementById('cardDeleteBtn');
  const cardColorBtn = document.getElementById('cardColorBtn');
  const cardConnectBtn = document.getElementById('cardConnectBtn');

  if (!boardViewport || !cardsLayer || !connectionLayer) return;

  const COLOR_CLASSES = ['card-yellow', 'card-blue', 'card-pink', 'card-green', 'card-purple', 'card-gray'];
  let cards = [];
  let connections = [];
  let colorIndex = 0;

  let dragState = null;
  let resizeState = null;
  let pendingConnectionSourceId = null;
  let selectedCardId = null;
  let zoomLevel = 1;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  function saveState() {
    const payload = { cards, connections, colorIndex, zoomLevel };
    try {
      localStorage.setItem('promptyy-playground-v1', JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save state', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem('promptyy-playground-v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cards)) cards = parsed.cards;
      if (Array.isArray(parsed.connections)) connections = parsed.connections;
      if (typeof parsed.colorIndex === 'number') colorIndex = parsed.colorIndex;
      if (typeof parsed.zoomLevel === 'number') zoomLevel = parsed.zoomLevel;
    } catch (e) {
      console.warn('Failed to load state', e);
    }
  }

  function createCardData(clientPos) {
    const rect = boardViewport.getBoundingClientRect();
    const id = 'c-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    const colorClass = COLOR_CLASSES[colorIndex % COLOR_CLASSES.length];
    colorIndex = (colorIndex + 1) % COLOR_CLASSES.length;

    const width = 180;
    const height = 110;
    const x = clientPos.x - rect.left - width / 2;
    const y = clientPos.y - rect.top - height / 2;

    return {
      id,
      x,
      y,
      width,
      height,
      text: '',
      colorClass,
    };
  }

  function renderCard(card) {
    let el = document.querySelector('[data-id="' + card.id + '"]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'card ' + card.colorClass;
      el.dataset.id = card.id;

      const header = document.createElement('div');
      header.className = 'card-header';

      const meta = document.createElement('div');
      meta.className = 'card-meta';
      const dot = document.createElement('span');
      dot.className = 'color-dot';
      meta.appendChild(dot);
      header.appendChild(meta);

      const controls = document.createElement('div');
      controls.className = 'card-header-controls';
      
      const colorBtn = document.createElement('button');
      colorBtn.className = 'card-header-btn color';
      colorBtn.innerHTML = '<span style="display: block; width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; border: 1px solid rgba(251, 191, 36, 0.3); flex-shrink: 0;"></span>';
      colorBtn.title = 'Change color';
      colorBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        changeCardColor(card.id);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'card-header-btn delete';
      deleteBtn.innerHTML = '<span style="display: block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 1px solid rgba(239, 68, 68, 0.3); flex-shrink: 0;"></span>';
      deleteBtn.title = 'Delete card';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteCard(card.id);
      });
      
      controls.appendChild(colorBtn);
      controls.appendChild(deleteBtn);
      header.appendChild(controls);

      const content = document.createElement('div');
      content.className = 'card-content';

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Write a thought…';
      textarea.value = card.text || '';
      textarea.addEventListener('input', function () {
        card.text = textarea.value;
        saveState();
      });

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'card-resize';

      content.appendChild(textarea);
      el.appendChild(header);
      el.appendChild(content);
      el.appendChild(resizeHandle);
      cardsLayer.appendChild(el);

      header.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        beginDragCard(card, e);
      });

      el.addEventListener('click', function (e) {
        if (e.shiftKey) {
          handleConnectionClick(card.id);
        } else {
          selectCard(card.id, e);
        }
      });

      resizeHandle.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        beginResizeCard(card, e);
      });
    }

    el.className = 'card ' + card.colorClass;
    el.style.left = card.x + 'px';
    el.style.top = card.y + 'px';
    el.style.width = card.width + 'px';
    el.style.height = card.height + 'px';
  }

  function renderAll() {
    cardsLayer.innerHTML = '';
    connectionLayer.innerHTML = '';
    cards.forEach(renderCard);
    drawConnections();
  }

  function deleteCard(id) {
    cards = cards.filter(c => c.id !== id);
    connections = connections.filter(c => c.from !== id && c.to !== id);
    selectedCardId = null;
    hideCardToolbar();
    renderAll();
    saveState();
  }

  function selectCard(id, e) {
    selectedCardId = id;
    showCardToolbar(id, e);
  }

  function showCardToolbar(cardId, e) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const el = document.querySelector('[data-id="' + cardId + '"]');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    cardToolbar.style.left = rect.left + 'px';
    cardToolbar.style.top = (rect.top - 44) + 'px';
    cardToolbar.classList.add('visible');
  }

  function hideCardToolbar() {
    cardToolbar.classList.remove('visible');
  }

  function beginDragCard(card, e) {
    const rect = boardViewport.getBoundingClientRect();
    dragState = {
      id: card.id,
      offsetX: e.clientX - rect.left - card.x,
      offsetY: e.clientY - rect.top - card.y,
    };
    const el = document.querySelector('[data-id="' + card.id + '"]');
    if (el) el.classList.add('dragging');
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', endDrag);
  }

  function onDragMove(e) {
    if (!dragState) return;
    const card = cards.find(c => c.id === dragState.id);
    if (!card) return;
    const rect = boardViewport.getBoundingClientRect();
    card.x = e.clientX - rect.left - dragState.offsetX;
    card.y = e.clientY - rect.top - dragState.offsetY;
    const el = document.querySelector('[data-id="' + card.id + '"]');
    if (el) {
      el.style.left = card.x + 'px';
      el.style.top = card.y + 'px';
    }
    updateConnectionPositions();
  }

  function endDrag() {
    if (!dragState) return;
    const el = document.querySelector('[data-id="' + dragState.id + '"]');
    if (el) el.classList.remove('dragging');
    dragState = null;
    saveState();
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', endDrag);
  }

  function beginResizeCard(card, e) {
    resizeState = {
      id: card.id,
      startWidth: card.width,
      startHeight: card.height,
      startX: e.clientX,
      startY: e.clientY,
    };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', endResize);
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    const card = cards.find(c => c.id === resizeState.id);
    if (!card) return;
    const dx = e.clientX - resizeState.startX;
    const dy = e.clientY - resizeState.startY;
    
    const newWidth = Math.max(140, Math.min(600, resizeState.startWidth + dx));
    const newHeight = Math.max(90, Math.min(400, resizeState.startHeight + dy));
    
    card.width = newWidth;
    card.height = newHeight;
    const el = document.querySelector('[data-id="' + card.id + '"]');
    if (el) {
      el.style.width = card.width + 'px';
      el.style.height = card.height + 'px';
    }
    updateConnectionPositions();
  }

  function endResize() {
    resizeState = null;
    saveState();
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', endResize);
  }
  function handleConnectionClick(cardId) {
    // first click: remember source card
    if (!pendingConnectionSourceId) {
      pendingConnectionSourceId = cardId;
      return;
    }

    // second click on same card: cancel
    if (pendingConnectionSourceId === cardId) {
      pendingConnectionSourceId = null;
      return;
    }

    // second click on a different card: toggle connection
    const a = pendingConnectionSourceId;
    const b = cardId;
    pendingConnectionSourceId = null;

    const existingIndex = connections.findIndex(c =>
      (c.from === a && c.to === b) || (c.from === b && c.to === a)
    );

    if (existingIndex >= 0) {
      connections.splice(existingIndex, 1);
    } else {
      connections.push({ from: a, to: b });
    }

    drawConnections();
    saveState();
  }

  function cardCenter(card) {
    return {
      x: card.x + card.width / 2,
      y: card.y + card.height / 2,
    };
  }

  function drawConnections() {
    connectionLayer.innerHTML = '';
    connections.forEach(conn => {
      const from = cards.find(c => c.id === conn.from);
      const to = cards.find(c => c.id === conn.to);
      if (!from || !to) return;
      const a = cardCenter(from);
      const b = cardCenter(to);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', b.y);
      line.setAttribute('class', 'connection-line');
      connectionLayer.appendChild(line);
    });
  }

  function updateConnectionPositions() {
    drawConnections();
  }

  function addCardAtClientPos(clientPos) {
    const card = createCardData(clientPos);
    cards.push(card);
    renderCard(card);
    drawConnections();
    saveState();
  }

  
  addCardBtn && addCardBtn.addEventListener('click', function () {
    const rect = boardViewport.getBoundingClientRect();
    addCardAtClientPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });

  function changeCardColor(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const currentIdx = COLOR_CLASSES.indexOf(card.colorClass);
    const nextIdx = (currentIdx + 1) % COLOR_CLASSES.length;
    card.colorClass = COLOR_CLASSES[nextIdx];
    renderAll();
    saveState();
  }

  function setZoom(level) {
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    const board = document.getElementById('board');
    board.style.transform = `scale(${zoomLevel})`;
    saveState();
  }

  function zoomIn() {
    setZoom(zoomLevel + ZOOM_STEP);
  }

  function zoomOut() {
    setZoom(zoomLevel - ZOOM_STEP);
  }

  clearCanvasBtn && clearCanvasBtn.addEventListener('click', function () {
    if (!confirm('Clear all cards from the canvas? This cannot be undone.')) return;
    cards = [];
    connections = [];
    selectedCardId = null;
    hideCardToolbar();
    renderAll();
    saveState();
  });

  zoomInBtn && zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn && zoomOutBtn.addEventListener('click', zoomOut);

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    }
  });

  cardEditBtn && cardEditBtn.addEventListener('click', function () {
    if (!selectedCardId) return;
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    const textarea = document.querySelector('[data-id="' + selectedCardId + '"] textarea');
    if (textarea) textarea.focus();
  });

  cardDeleteBtn && cardDeleteBtn.addEventListener('click', function () {
    if (!selectedCardId) return;
    deleteCard(selectedCardId);
  });

  cardColorBtn && cardColorBtn.addEventListener('click', function () {
    if (!selectedCardId) return;
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    const currentIdx = COLOR_CLASSES.indexOf(card.colorClass);
    const nextIdx = (currentIdx + 1) % COLOR_CLASSES.length;
    card.colorClass = COLOR_CLASSES[nextIdx];
    renderAll();
    saveState();
  });

  cardConnectBtn && cardConnectBtn.addEventListener('click', function () {
    if (!selectedCardId) return;
    if (!pendingConnectionSourceId) {
      pendingConnectionSourceId = selectedCardId;
      cardConnectBtn.textContent = 'Cancel';
    } else {
      pendingConnectionSourceId = null;
      cardConnectBtn.textContent = 'Connect';
    }
  });

  document.addEventListener('click', function (e) {
    if (!cardToolbar.contains(e.target)) {
      hideCardToolbar();
      selectedCardId = null;
    }
  });

  loadState();
  renderAll();
  setZoom(zoomLevel);
})();
