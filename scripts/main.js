// Main JavaScript functionality for Prompty UI

document.addEventListener('DOMContentLoaded', function() {
    // Local Storage Functions
    function saveCardsToStorage() {
        const cards = document.querySelectorAll('.resizable-card');
        const cardsData = [];
        
        cards.forEach(card => {
            const contentArea = card.querySelector('.content-area');
            cardsData.push({
                id: card.dataset.cardId || Date.now().toString(),
                left: card.style.left,
                top: card.style.top,
                width: card.style.width,
                height: card.style.height,
                content: contentArea ? contentArea.innerHTML : '',
                color: card.style.backgroundColor || ''
            });
        });
        
        localStorage.setItem('promptyy_cards', JSON.stringify(cardsData));
    }
    
    function loadCardsFromStorage() {
        const savedCards = localStorage.getItem('promptyy_cards');
        if (savedCards) {
            try {
                const cardsData = JSON.parse(savedCards);
                cardsData.forEach(cardData => {
                    createCardFromData(cardData);
                });
            } catch (e) {
                console.error('Error loading cards from storage:', e);
            }
        }
    }
    
    function createCardFromData(cardData) {
        const card = document.createElement('div');
        card.className = 'resizable-card';
        card.dataset.cardId = cardData.id;
        card.style.left = cardData.left || '100px';
        card.style.top = cardData.top || '100px';
        card.style.width = cardData.width || '250px';
        card.style.height = cardData.height || '200px';
        card.style.position = 'absolute';
        card.style.transform = 'none';
        if (cardData.color) {
            card.style.backgroundColor = cardData.color;
            card.style.setProperty('--card-primary', cardData.color);
            // Set matching border color
            const colorIndex = 0; // Default to first color which matches our initial color
            card.dataset.colorIndex = colorIndex;
            card.style.setProperty('--card-border', '#e6ddc4');
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-controls">
                    <div class="control-dot color-dot" title="Change Color"></div>
                    <div class="control-dot delete-dot" title="Delete Card"></div>
                </div>
            </div>
            <div class="card-content">
                <div class="content-area" contenteditable="true" tabindex="0">${cardData.content || ''}</div>
            </div>
            <div class="resize-handle"></div>
        `;
        
        canvasArea.appendChild(card);
        initializeCardInteractions(card);
    }
    
    function initializeCardInteractions(card) {
        // Use the existing card initialization system
        initializeResizableCard(card);
        
        // Add connection click handler
        card.addEventListener('click', (e) => {
            if (e.shiftKey) {
                handleCardConnection(card, e);
                return;
            }
            
            if (!e.target.closest('.card-header') && !e.target.closest('.card-controls') && !e.target.closest('.resize-handle')) {
                if (isConnectionMode || isDisconnectMode) {
                    handleCardConnection(card, e);
                }
            }
        });
        
        // Add touch handler for mobile
        card.addEventListener('touchend', (e) => {
            console.log('Card touched, connection mode:', isConnectionMode, 'disconnect mode:', isDisconnectMode);
            if (!e.target.closest('.card-header') && !e.target.closest('.card-controls') && !e.target.closest('.resize-handle')) {
                if (isConnectionMode || isDisconnectMode) {
                    console.log('Calling handleCardConnection for mobile');
                    handleCardConnection(card, e);
                }
            }
        });
        
        // Also add click handler as fallback for mobile
        card.addEventListener('click', (e) => {
            console.log('Card clicked, connection mode:', isConnectionMode, 'disconnect mode:', isDisconnectMode);
            if (!e.target.closest('.card-header') && !e.target.closest('.card-controls') && !e.target.closest('.resize-handle')) {
                if (isConnectionMode || isDisconnectMode) {
                    console.log('Calling handleCardConnection for click fallback');
                    handleCardConnection(card, e);
                }
            }
        });
        
        // Add color change functionality
        const colorDot = card.querySelector('.color-dot');
        if (colorDot) {
            colorDot.addEventListener('click', (e) => {
                e.stopPropagation();
                changeCardColor(card);
            });
        }
        
        // Add delete functionality
        const deleteDot = card.querySelector('.delete-dot');
        if (deleteDot) {
            deleteDot.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCard(card);
            });
        }
        
        // Save to storage when content changes
        const contentArea = card.querySelector('.content-area');
        if (contentArea) {
            contentArea.addEventListener('input', debounce(saveCardsToStorage, 500));
        }
        
        // Animate card appearance
        requestAnimationFrame(() => {
            card.classList.add('show');
        });
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    // Initialize zoom functionality
    let currentZoom = 100;
    const zoomLevelElement = document.querySelector('.zoom-level');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const fitScreenBtn = document.getElementById('fit-screen');
    const canvasArea = document.querySelector('.canvas-area');

    // Canvas dragging functionality
    let isCanvasDragging = false;
    let canvasStartX = 0;
    let canvasStartY = 0;
    let canvasOffsetX = 0;
    let canvasOffsetY = 0;
    let canvasCenterX = 0;
    let canvasCenterY = 0;

    // Enable canvas dragging - work from anywhere except cards (mouse and touch)
    function startCanvasDrag(clientX, clientY) {
        // Only drag if clicking on empty canvas (not on cards or controls)
        const touch = clientX.touches ? clientX.touches[0] : clientX;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const isCard = target.closest('.resizable-card');
        const isControl = target.closest('.floating-bar');
        
        if (!isCard && !isControl) {
            isCanvasDragging = true;
            canvasArea.style.cursor = 'grabbing';
            
            canvasStartX = touch.clientX;
            canvasStartY = touch.clientY;
            
            // Get current transform values
            const transform = window.getComputedStyle(canvasArea).transform;
            if (transform !== 'none') {
                const matrix = transform.match(/matrix.*\((.+)\)/)[1].split(', ');
                canvasOffsetX = parseFloat(matrix[4]) || 0;
                canvasOffsetY = parseFloat(matrix[5]) || 0;
            }
            
            return true; // Indicate drag started
        }
        return false; // Indicate drag not started
    }

    function dragCanvas(clientX, clientY) {
        if (!isCanvasDragging) return;
        
        const touch = clientX.touches ? clientX.touches[0] : clientX;
        
        const deltaX = touch.clientX - canvasStartX;
        const deltaY = touch.clientY - canvasStartY;
        
        // Apply new transform with zoom and pan
        const zoomFactor = currentZoom / 100;
        const newOffsetX = canvasOffsetX + deltaX;
        const newOffsetY = canvasOffsetY + deltaY;
        
        canvasArea.style.transform = `scale(${zoomFactor}) translate(${newOffsetX / zoomFactor}px, ${newOffsetY / zoomFactor}px)`;
        canvasArea.style.transformOrigin = 'center center';
    }

    function endCanvasDrag() {
        if (isCanvasDragging) {
            isCanvasDragging = false;
            canvasArea.style.cursor = 'default';
            
            // Update offset values for next drag
            const transform = window.getComputedStyle(canvasArea).transform;
            if (transform !== 'none') {
                const matrix = transform.match(/matrix.*\((.+)\)/)[1].split(', ');
                canvasOffsetX = parseFloat(matrix[4]) || 0;
                canvasOffsetY = parseFloat(matrix[5]) || 0;
            }
        }
    }

    // Mouse events
    document.addEventListener('mousedown', (e) => startCanvasDrag(e));
    document.addEventListener('mousemove', (e) => dragCanvas(e));
    document.addEventListener('mouseup', () => endCanvasDrag());

    // Touch events for mobile - only prevent default when actually dragging
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const isCard = target.closest('.resizable-card');
        const isControl = target.closest('.floating-bar');
        const isCardHeader = target.closest('.card-header');
        const isResizeHandle = target.closest('.resize-handle');
        
        // Only prevent default and start drag if touching empty canvas
        // Don't interfere with any card interactions (drag, resize, connect)
        if (!isCard && !isControl && !isCardHeader && !isResizeHandle) {
            const dragStarted = startCanvasDrag(e);
            if (dragStarted) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isCanvasDragging) {
            e.preventDefault();
            dragCanvas(e);
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (isCanvasDragging) {
            e.preventDefault();
            endCanvasDrag();
        }
    }, { passive: false });

    // Zoom controls
    zoomInBtn.addEventListener('click', function() {
        if (currentZoom < 200) {
            currentZoom += 10;
            updateZoom();
        }
    });

    zoomOutBtn.addEventListener('click', function() {
        if (currentZoom > 50) {
            currentZoom -= 10;
            updateZoom();
        }
    });

    // Fit screen functionality
    fitScreenBtn.addEventListener('click', function() {
        fitToScreen();
    });

    function fitToScreen() {
        // Reset zoom and position
        currentZoom = 100;
        canvasOffsetX = 0;
        canvasOffsetY = 0;
        
        // Apply reset transform
        canvasArea.style.transform = `scale(1) translate(0px, 0px)`;
        canvasArea.style.transformOrigin = 'center center';
        
        // Update zoom display
        zoomLevelElement.textContent = '100%';
        
        // Reset button states
        zoomInBtn.disabled = false;
        zoomOutBtn.disabled = false;
        
        showNotification('Fit to screen');
    }

    function updateZoom() {
        zoomLevelElement.textContent = currentZoom + '%';
        
        // Get viewport center
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        
        // Calculate new offsets to center the zoom
        const zoomFactor = currentZoom / 100;
        const newOffsetX = canvasOffsetX;
        const newOffsetY = canvasOffsetY;
        
        // Apply transform centered on viewport
        canvasArea.style.transform = `scale(${zoomFactor}) translate(${newOffsetX / zoomFactor}px, ${newOffsetY / zoomFactor}px)`;
        canvasArea.style.transformOrigin = 'center center';
        
        // Update connections when zoom changes
        updateAllConnections();
        
        // Disable zoom buttons at limits
        zoomInBtn.disabled = currentZoom >= 200;
        zoomOutBtn.disabled = currentZoom <= 50;
    }

    // Card connection functionality
    let selectedCardForConnection = null;
    let connections = [];
    let connectionId = 0;

    // Mobile connection mode
    let isConnectionMode = false;
    let isDisconnectMode = false;
    const mobileConnectionBtn = document.getElementById('mobile-connection-btn');
    const mobileConnectBtn = document.getElementById('mobile-connect-btn');
    const mobileDisconnectBtn = document.getElementById('mobile-disconnect-btn');
    
    // Mobile connection button functionality
    if (mobileConnectBtn) {
        console.log('Connect button found and initialized');
        mobileConnectBtn.addEventListener('click', () => {
            console.log('Connect button clicked - before toggle');
            isConnectionMode = !isConnectionMode;
            isDisconnectMode = false;
            mobileConnectBtn.classList.toggle('active');
            mobileDisconnectBtn.classList.remove('active');
            selectedCardForConnection = null;
            
            // Clear any existing selections
            document.querySelectorAll('.selected-for-connection').forEach(card => {
                card.classList.remove('selected-for-connection');
            });
            
            // Show feedback
            if (isConnectionMode) {
                console.log('Connection mode activated');
            } else {
                console.log('Connection mode deactivated');
            }
        });
        
        mobileConnectBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Connect button touched');
            mobileConnectBtn.click();
        }, { passive: false });
    } else {
        console.log('Connect button NOT found - check HTML');
    }
    
    if (mobileDisconnectBtn) {
        console.log('Disconnect button found');
        mobileDisconnectBtn.addEventListener('click', () => {
            console.log('Disconnect button clicked');
            isDisconnectMode = !isDisconnectMode;
            isConnectionMode = false;
            mobileDisconnectBtn.classList.toggle('active');
            mobileConnectBtn.classList.remove('active');
            selectedCardForConnection = null;
            
            // Clear any existing selections
            document.querySelectorAll('.selected-for-connection').forEach(card => {
                card.classList.remove('selected-for-connection');
            });
            
            // Show feedback
            if (isDisconnectMode) {
                console.log('Disconnect mode activated');
            } else {
                console.log('Disconnect mode deactivated');
            }
        });
        
        mobileDisconnectBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Disconnect button touched');
            mobileDisconnectBtn.click();
        }, { passive: false });
    } else {
        console.log('Disconnect button not found');
    }
    
    // Add click handler to dismiss keyboard when clicking outside text areas
    document.addEventListener('click', (e) => {
        // Check if clicking outside any contenteditable element
        const isContentEditable = e.target.closest('.content-area');
        if (!isContentEditable) {
            // Blur all contenteditable elements to dismiss keyboard
            document.querySelectorAll('.content-area').forEach(area => {
                area.blur();
            });
        }
    });

    // Add touch handler for mobile
    document.addEventListener('touchstart', (e) => {
        // Check if touching outside any contenteditable element
        const isContentEditable = e.target.closest('.content-area');
        if (!isContentEditable) {
            // Blur all contenteditable elements to dismiss keyboard
            document.querySelectorAll('.content-area').forEach(area => {
                area.blur();
            });
        }
    }, { passive: true });

    // Handle card selection for connection (simple tap system)
    function handleCardConnection(card, e) {
        console.log('handleCardConnection called');
        console.log('selectedCardForConnection:', selectedCardForConnection);
        console.log('isConnectionMode:', isConnectionMode);
        console.log('isDisconnectMode:', isDisconnectMode);
        console.log('current card:', card);
        
        // Handle shift+click for desktop (always works regardless of mode)
        const isShiftClick = e.shiftKey;
        
        // For mobile modes, only work in connection or disconnect mode
        if (!isShiftClick && !isConnectionMode && !isDisconnectMode) {
            console.log('Not in connection mode and not shift click - returning');
            return;
        }
        
        if (!selectedCardForConnection) {
            // First card selection
            console.log('Selecting first card');
            selectedCardForConnection = card;
            card.classList.add('selected-for-connection');
        } else if (selectedCardForConnection === card) {
            // Same card clicked - deselect
            console.log('Deselecting same card');
            card.classList.remove('selected-for-connection');
            selectedCardForConnection = null;
        } else {
            console.log('Selecting second card for connection/disconnection');
            
            // Check if connection already exists
            const existingConnection = connections.find(conn => 
                (conn.card1 === selectedCardForConnection && conn.card2 === card) ||
                (conn.card1 === card && conn.card2 === selectedCardForConnection)
            );
            
            if (isShiftClick) {
                // Desktop shift+click - toggle connection
                if (existingConnection) {
                    // Remove existing connection
                    console.log('Removing existing connection (desktop shift+click)');
                    removeConnection(existingConnection);
                } else {
                    // Create new connection
                    console.log('Creating new connection (desktop shift+click)');
                    createConnection(selectedCardForConnection, card);
                }
            } else if (isConnectionMode) {
                // Mobile connect mode - only create connections
                if (existingConnection) {
                    console.log('Cards already connected (mobile connect mode)');
                } else {
                    console.log('Creating new connection (mobile connect mode)');
                    createConnection(selectedCardForConnection, card);
                }
            } else if (isDisconnectMode) {
                // Mobile disconnect mode - only remove connections
                if (existingConnection) {
                    console.log('Removing connection (mobile disconnect mode)');
                    removeConnection(existingConnection);
                } else {
                    console.log('Cards not connected (mobile disconnect mode)');
                }
            }
            
            selectedCardForConnection.classList.remove('selected-for-connection');
            selectedCardForConnection = null;
        }
    }

    // Remove long press detection - no longer needed
    // let longPressTimer;
    // function handleCardTouchStart(card, e) {
    //     // Start long press timer
    //     longPressTimer = setTimeout(() => {
    //         card.dataset.longPress = 'true';
    //         handleCardConnection(card, e);
    //     }, 500); // 500ms for long press
    // }

    // function handleCardTouchEnd(card, e) {
    //     // Clear long press timer
    //     clearTimeout(longPressTimer);
    //     card.dataset.longPress = 'false';
    // }

    // Remove specific connection
    function removeConnection(connection) {
        // Remove the line element
        if (connection.line && connection.line.parentNode) {
            connection.line.parentNode.removeChild(connection.line);
        }
        
        // Remove from connections array
        connections = connections.filter(conn => conn !== connection);
    }

    // Create connection line between two cards
    function createConnection(card1, card2) {
        const connectionId = `connection-${Date.now()}`;
        
        // Create simple div line element
        const line = document.createElement('div');
        line.setAttribute('id', connectionId);
        line.className = 'connection-line';
        line.style.cssText = `
            position: absolute;
            background: #1a1a1a;
            opacity: 0.6;
            height: 2px;
            transform-origin: left center;
            pointer-events: none;
            z-index: 100;
        `;
        
        canvasArea.appendChild(line);
        
        // Store connection info
        connections.push({
            id: connectionId,
            card1: card1,
            card2: card2,
            line: line
        });
        
        updateConnection(connectionId);
        showNotification('Cards connected');
    }

    // Update connection line position
    function updateConnection(connectionId) {
        const connection = connections.find(c => c.id === connectionId);
        if (!connection) return;
        
        const card1Rect = connection.card1.getBoundingClientRect();
        const card2Rect = connection.card2.getBoundingClientRect();
        const canvasRect = canvasArea.getBoundingClientRect();
        
        // Calculate center points of cards relative to canvas
        const x1 = (card1Rect.left + card1Rect.width / 2) - canvasRect.left;
        const y1 = (card1Rect.top + card1Rect.height / 2) - canvasRect.top;
        const x2 = (card2Rect.left + card2Rect.width / 2) - canvasRect.left;
        const y2 = (card2Rect.top + card2Rect.height / 2) - canvasRect.top;
        
        // Adjust for zoom and pan
        const zoomFactor = currentZoom / 100;
        
        // Calculate line properties
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);
        
        // Apply zoom adjustment
        const adjustedX1 = x1 / zoomFactor;
        const adjustedY1 = y1 / zoomFactor;
        const adjustedDistance = distance / zoomFactor;
        
        // Position and rotate the line
        connection.line.style.left = `${adjustedX1}px`;
        connection.line.style.top = `${adjustedY1}px`;
        connection.line.style.width = `${adjustedDistance}px`;
        connection.line.style.transform = `rotate(${angle}rad)`;
    }

    // Update all connections when cards move or zoom changes
    function updateAllConnections() {
        connections.forEach(connection => {
            updateConnection(connection.id);
        });
    }
    const addBtn = document.querySelector('.action-btn-add');
    addBtn.addEventListener('click', function() {
        console.log('Add functionality triggered');
        createResizableCard();
    });

    // Create resizable card function
    function createResizableCard() {
        // Fixed position for all cards - relative to canvas area
        const xPos = 100; // pixels from left of canvas
        const yPos = 100; // pixels from top of canvas
        
        const cardData = {
            id: Date.now().toString(),
            left: `${xPos}px`,
            top: `${yPos}px`,
            width: '250px',
            height: '200px',
            content: '',
            color: '#f8f5e6'
        };
        
        createCardFromData(cardData);
        saveCardsToStorage();
    }

    // Initialize
    console.log('Prompty UI initialized');
    
    // Load saved cards on page load
    loadCardsFromStorage();
    
    // Also attach event listeners to any existing cards (in case they were added before this script ran)
    document.querySelectorAll('.resizable-card').forEach(card => {
        console.log('Found existing card, attaching event listeners');
        // Re-initialize interactions for existing cards
        const contentArea = card.querySelector('.content-area');
        if (contentArea) {
            contentArea.addEventListener('input', debounce(saveCardsToStorage, 500));
        }
        
        // Add connection handlers
        card.addEventListener('click', (e) => {
            if (e.shiftKey) {
                handleCardConnection(card, e);
                return;
            }
            
            if (!e.target.closest('.card-header') && !e.target.closest('.card-controls') && !e.target.closest('.resize-handle')) {
                if (isConnectionMode || isDisconnectMode) {
                    console.log('Calling handleCardConnection for existing card');
                    handleCardConnection(card, e);
                }
            }
        });
        
        card.addEventListener('touchend', (e) => {
            console.log('Existing card touched, connection mode:', isConnectionMode, 'disconnect mode:', isDisconnectMode);
            if (!e.target.closest('.card-header') && !e.target.closest('.card-controls') && !e.target.closest('.resize-handle')) {
                if (isConnectionMode || isDisconnectMode) {
                    console.log('Calling handleCardConnection for existing card mobile');
                    handleCardConnection(card, e);
                }
            }
        });
    });

    // Initialize resizable card functionality
    function initializeResizableCard(card) {
        let isDragging = false;
        let isResizing = false;
        let startX, startY;
        let startWidth, startHeight;
        let initialCardX, initialCardY;

        const colorDot = card.querySelector('.color-dot');
        const deleteDot = card.querySelector('.delete-dot');
        const contentArea = card.querySelector('.content-area');
        const resizeHandle = card.querySelector('.resize-handle');
        const cardHeader = card.querySelector('.card-header');

        // SIMPLIFIED DRAG FUNCTIONALITY
        function handleDragStart(e) {
            // Don't drag if clicking on control dots
            if (e.target.closest('.control-dot')) return;
            
            console.log('Drag started on header');
            
            isDragging = true;
            card.style.transition = 'none';
            card.classList.add('dragging');
            cardHeader.style.cursor = 'grabbing';
            
            const rect = card.getBoundingClientRect();
            const canvasRect = canvasArea.getBoundingClientRect();
            const zoomFactor = currentZoom / 100;
            
            initialCardX = (rect.left - canvasRect.left) / zoomFactor;
            initialCardY = (rect.top - canvasRect.top) / zoomFactor;
            
            if (e.type === 'mousedown') {
                startX = e.clientX;
                startY = e.clientY;
            } else {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
            
            e.preventDefault();
            e.stopPropagation();
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            
            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            
            const deltaX = (clientX - startX) / (currentZoom / 100);
            const deltaY = (clientY - startY) / (currentZoom / 100);
            
            card.style.left = `${initialCardX + deltaX}px`;
            card.style.top = `${initialCardY + deltaY}px`;
            
            updateAllConnections();
        }

        function handleDragEnd() {
            if (isDragging) {
                isDragging = false;
                card.style.transition = '';
                card.classList.remove('dragging');
                cardHeader.style.cursor = 'grab';
                console.log('Drag ended');
                saveCardsToStorage(); // Save to storage after moving card
            }
        }

        // SIMPLIFIED RESIZE FUNCTIONALITY
        function handleResizeStart(e) {
            console.log('Resize started');
            isResizing = true;
            card.style.transition = 'none';
            
            const rect = card.getBoundingClientRect();
            const zoomFactor = currentZoom / 100;
            
            startWidth = rect.width / zoomFactor;
            startHeight = rect.height / zoomFactor;
            
            if (e.type === 'mousedown') {
                startX = e.clientX;
                startY = e.clientY;
            } else {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
            
            e.preventDefault();
            e.stopPropagation();
        }

        function handleResizeMove(e) {
            if (!isResizing) return;
            
            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            
            const deltaX = (clientX - startX) / (currentZoom / 100);
            const deltaY = (clientY - startY) / (currentZoom / 100);
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            // Apply limits
            newWidth = Math.max(120, Math.min(400, newWidth));
            newHeight = Math.max(120, Math.min(400, newHeight));
            
            card.style.width = `${newWidth}px`;
            card.style.height = `${newHeight}px`;
        }

        function handleResizeEnd() {
            if (isResizing) {
                isResizing = false;
                card.style.transition = '';
                console.log('Resize ended');
                saveCardsToStorage(); // Save to storage after resizing card
            }
        }

        // Add event listeners to header for dragging
        cardHeader.addEventListener('mousedown', handleDragStart);
        cardHeader.addEventListener('touchstart', handleDragStart, { passive: false });

        // Add event listeners to resize handle
        resizeHandle.addEventListener('mousedown', handleResizeStart);
        resizeHandle.addEventListener('touchstart', handleResizeStart, { passive: false });

        // Global move and end listeners
        document.addEventListener('mousemove', (e) => {
            handleDragMove(e);
            handleResizeMove(e);
        });

        document.addEventListener('mouseup', (e) => {
            handleDragEnd(e);
            handleResizeEnd(e);
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging || isResizing) {
                e.preventDefault();
                handleDragMove(e);
                handleResizeMove(e);
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            handleDragEnd(e);
            handleResizeEnd(e);
        });

        // Color change functionality (touch and click)
        colorDot.addEventListener('click', (e) => {
            e.stopPropagation();
            changeCardColor(card);
        });

        colorDot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            changeCardColor(card);
        }, { passive: false });

        // Delete functionality (touch and click)
        deleteDot.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCard(card);
        });

        deleteDot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteCard(card);
        }, { passive: false });

        // Content area functionality
        contentArea.addEventListener('focus', () => {
            // No placeholder to remove
        });

        contentArea.addEventListener('blur', () => {
            // No placeholder to restore
        });
    }

    // Change card color with better contrast
    function changeCardColor(card) {
        const colors = [
    { primary: '#f8f5e6', text: '#1a1a1a', border: '#e6ddc4' }, // Muted Yellow
    { primary: '#e8eef5', text: '#1a1a1a', border: '#d1dce8' }, // Muted Blue
    { primary: '#e8f2e8', text: '#1a1a1a', border: '#d1e6d1' }, // Muted Green
    { primary: '#f5e8f0', text: '#1a1a1a', border: '#e6d1dc' }, // Muted Pink
    { primary: '#ede8f5', text: '#1a1a1a', border: '#dcd1e6' }, // Muted Purple
    { primary: '#f5ede6', text: '#1a1a1a', border: '#e6dcd1' }, // Muted Orange
    { primary: '#f5e8e8', text: '#1a1a1a', border: '#e6d1d1' }, // Muted Red
    { primary: '#f0f0f0', text: '#1a1a1a', border: '#d9d9d9' }, // Muted Gray
    { primary: '#e6f5f2', text: '#1a1a1a', border: '#d1e6e0' }, // Muted Teal
    { primary: '#f0e8f5', text: '#1a1a1a', border: '#e0d1e6' }, // Muted Lavender
    { primary: '#f5f0e6', text: '#1a1a1a', border: '#e6e0d1' }, // Muted Peach
    { primary: '#e8f2f5', text: '#1a1a1a', border: '#d1e6ec' }, // Muted Sky
    { primary: '#e8f5e8', text: '#1a1a1a', border: '#d1e6d1' }, // Muted Mint
    { primary: '#f5e8f2', text: '#1a1a1a', border: '#e6d1e0' }, // Muted Rose
    { primary: '#f0e8f5', text: '#1a1a1a', border: '#e0d1e6' }, // Muted Periwinkle
    { primary: '#f5f0e8', text: '#1a1a1a', border: '#e6e0d1' }, // Muted Amber
    { primary: '#f5e8e8', text: '#1a1a1a', border: '#e6d1d1' }, // Muted Ruby
    { primary: '#f0f2f5', text: '#1a1a1a', border: '#d9dde6' }, // Muted Slate
    { primary: '#e8f2f5', text: '#1a1a1a', border: '#d1e6ec' }, // Muted Alice
    { primary: '#f2f5e8', text: '#1a1a1a', border: '#dde6d1' }, // Muted Lime
    { primary: '#f5f5f5', text: '#1a1a1a', border: '#e0e0e0' }, // Light White
    { primary: '#f0f4f8', text: '#1a1a1a', border: '#d6e3ec' }, // Ice Blue
    { primary: '#f4f1f8', text: '#1a1a1a', border: '#e0d6ec' }, // Haze Purple
    { primary: '#f8f4f0', text: '#1a1a1a', border: '#ece6d6' }, // Cream
    { primary: '#f0f8f4', text: '#1a1a1a', border: '#d6ece6' }, // Sage
    { primary: '#f8f0f4', text: '#1a1a1a', border: '#ecd6e6' }, // Dusty Rose
    { primary: '#f4f8f0', text: '#1a1a1a', border: '#e6ecd6' }, // Moss
    { primary: '#f0f4f8', text: '#1a1a1a', border: '#d6e3ec' }, // Fog
    { primary: '#f8f4f4', text: '#1a1a1a', border: '#ece6e6' }, // Blush
    { primary: '#f4f4f8', text: '#1a1a1a', border: '#e6e6ec' }, // Dust
    { primary: '#f2f8f2', text: '#1a1a1a', border: '#dde6dd' }  // Pale Green
];

        
        const currentColor = card.dataset.colorIndex || '0';
        const nextIndex = (parseInt(currentColor) + 1) % colors.length;
        const color = colors[nextIndex];
        
        card.dataset.colorIndex = nextIndex;
        card.style.backgroundColor = color.primary;
        card.style.setProperty('--card-primary', color.primary);
        card.style.setProperty('--card-text', color.text);
        card.style.setProperty('--card-border', color.border);
    }

    // Delete individual card function
    function deleteCard(card) {
        // Remove connections associated with this card
        connections = connections.filter(connection => {
            if (connection.card1 === card || connection.card2 === card) {
                // Remove the simple line element
                if (connection.line && connection.line.parentNode) {
                    connection.line.parentNode.removeChild(connection.line);
                }
                return false; // Remove from array
            }
            return true; // Keep in array
        });
        
        // Add removing class for animation
        card.classList.add('removing');

        // Remove card after animation
        setTimeout(() => {
            if (card.parentNode) {
                card.parentNode.removeChild(card);
            }
            saveCardsToStorage(); // Save to storage after deletion
        }, 300);
    }

    // Delete button functionality - deletes all cards with confirmation
    const deleteBtn = document.querySelector('.action-btn-delete');
    deleteBtn.addEventListener('click', function() {
        console.log('Delete all cards triggered');
        showDeleteConfirmation();
    });
    
    // Add touch support for delete all button
    deleteBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Delete all button touched');
        deleteBtn.click();
    }, { passive: false });

    // Show delete confirmation dialog
    function showDeleteConfirmation() {
        const allCards = document.querySelectorAll('.resizable-card');
        
        if (allCards.length === 0) {
            showNotification('No cards to delete');
            return;
        }
        
        // Create custom dialog
        const dialogOverlay = document.createElement('div');
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: #ffffff;
            color: #1a1a1a;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            min-width: 320px;
            text-align: center;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;
        
        dialogBox.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 18px;">Delete All Cards?</h3>
            <p style="margin: 0 0 20px 0; opacity: 0.8;">Are you sure you want to delete ${allCards.length} card(s)?</p>
            <p style="margin: 0 0 24px 0; opacity: 0.6; font-size: 14px;">This action cannot be undone.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="confirm-yes" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; min-height: 44px; min-width: 80px;">Yes</button>
                <button id="confirm-no" style="background: #f3f4f6; color: #1a1a1a; border: 1px solid rgba(0, 0, 0, 0.2); padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; min-height: 44px; min-width: 80px;">No</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialogBox);
        document.body.appendChild(dialogOverlay);
        
        // Handle confirmation
        const confirmYes = document.getElementById('confirm-yes');
        const confirmNo = document.getElementById('confirm-no');
        
        confirmYes.addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            deleteAllCards();
        });
        
        confirmNo.addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            showNotification('Delete cancelled');
        });
        
        // Add touch support for confirmation buttons
        confirmYes.addEventListener('touchstart', (e) => {
            e.preventDefault();
            confirmYes.click();
        }, { passive: false });
        
        confirmNo.addEventListener('touchstart', (e) => {
            e.preventDefault();
            confirmNo.click();
        }, { passive: false });
        
        // Close on overlay click
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                document.body.removeChild(dialogOverlay);
                showNotification('Delete cancelled');
            }
        });
        
        // Auto-focus on No for safety
        document.getElementById('confirm-no').focus();
    }

    // Delete all cards function
    function deleteAllCards() {
        const allCards = document.querySelectorAll('.resizable-card');
        
        if (allCards.length === 0) {
            showNotification('No cards to delete');
            return;
        }
        
        // Remove all connections first
        connections.forEach(connection => {
            if (connection.line && connection.line.parentNode) {
                connection.line.parentNode.removeChild(connection.line);
            }
        });
        connections = [];
        
        // Add removing class to all cards for animation
        allCards.forEach(card => {
            card.classList.add('removing');
        });
        
        // Remove all cards after animation
        setTimeout(() => {
            allCards.forEach(card => {
                if (card.parentNode) {
                    card.parentNode.removeChild(card);
                }
            });
            saveCardsToStorage(); // Save to storage after deleting all cards
            showNotification(`Deleted ${allCards.length} card(s)`);
        }, 300);
    }

    // Notification system
    function showNotification(message) {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            transform: translateX(0);
            background-color: #1a1a1a;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Plus for zoom in
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomInBtn.click();
        }
        
        // Ctrl/Cmd + Minus for zoom out
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomOutBtn.click();
        }
        
        // Ctrl/Cmd + 0 for reset zoom
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            currentZoom = 100;
            updateZoom();
        }
        
        // Escape key functionality
        if (e.key === 'Escape') {
            console.log('Escape key pressed');
        }
        
        // Delete key for delete action
        if (e.key === 'Delete') {
            deleteBtn.click();
        }
        
            });
    
    // Canvas click handler removed
    // canvasArea.addEventListener('click', function(e) {
    //     if (e.target === canvasArea) {
    //         console.log('Canvas clicked');
    //         
    //         // Show coordinates for demonstration
    //         const rect = canvasArea.getBoundingClientRect();
    //         const x = Math.round(e.clientX - rect.left);
    //         const y = Math.round(e.clientY - rect.top);
    //         showNotification(`Canvas clicked at (${x}, ${y})`);
    //     }
    // });

    // Initialize
    console.log('Prompty UI initialized');
});
