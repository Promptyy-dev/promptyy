// Main JavaScript functionality for Prompty UI

document.addEventListener('DOMContentLoaded', function() {
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

    // Enable canvas dragging - work from anywhere except cards
    document.addEventListener('mousedown', (e) => {
        // Only drag if clicking on empty canvas (not on cards or controls)
        const isCard = e.target.closest('.resizable-card');
        const isControl = e.target.closest('.floating-bar');
        
        if (!isCard && !isControl) {
            isCanvasDragging = true;
            canvasArea.style.cursor = 'grabbing';
            
            canvasStartX = e.clientX;
            canvasStartY = e.clientY;
            
            // Get current transform values
            const transform = window.getComputedStyle(canvasArea).transform;
            if (transform !== 'none') {
                const matrix = transform.match(/matrix.*\((.+)\)/)[1].split(', ');
                canvasOffsetX = parseFloat(matrix[4]) || 0;
                canvasOffsetY = parseFloat(matrix[5]) || 0;
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isCanvasDragging) return;
        
        e.preventDefault();
        const deltaX = e.clientX - canvasStartX;
        const deltaY = e.clientY - canvasStartY;
        
        // Apply new transform with zoom and pan
        const zoomFactor = currentZoom / 100;
        const newOffsetX = canvasOffsetX + deltaX;
        const newOffsetY = canvasOffsetY + deltaY;
        
        canvasArea.style.transform = `scale(${zoomFactor}) translate(${newOffsetX / zoomFactor}px, ${newOffsetY / zoomFactor}px)`;
        canvasArea.style.transformOrigin = 'center center';
    });

    document.addEventListener('mouseup', () => {
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
    });

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

    // Handle card selection for connection
    function handleCardConnection(card, e) {
        if (e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!selectedCardForConnection) {
                // First card selection
                selectedCardForConnection = card;
                card.classList.add('selected-for-connection');
                showNotification('Select second card to connect');
            } else if (selectedCardForConnection === card) {
                // Same card clicked - deselect
                card.classList.remove('selected-for-connection');
                selectedCardForConnection = null;
                showNotification('Connection cancelled');
            } else {
                // Check if connection already exists
                const existingConnection = connections.find(conn => 
                    (conn.card1 === selectedCardForConnection && conn.card2 === card) ||
                    (conn.card1 === card && conn.card2 === selectedCardForConnection)
                );
                
                if (existingConnection) {
                    // Remove existing connection
                    removeConnection(existingConnection);
                    showNotification('Connection removed');
                } else {
                    // Create new connection
                    createConnection(selectedCardForConnection, card);
                    showNotification('Cards connected');
                }
                
                selectedCardForConnection.classList.remove('selected-for-connection');
                selectedCardForConnection = null;
            }
        }
    }

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
            background: #ffffff;
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

        // Create card element
        const card = document.createElement('div');
        card.className = 'resizable-card';
        card.style.left = `${xPos}px`;
        card.style.top = `${yPos}px`;
        card.style.position = 'absolute'; // Use absolute positioning within canvas
        card.style.transform = 'none'; // Remove center transform
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-controls">
                    <div class="control-dot color-dot" title="Change Color"></div>
                    <div class="control-dot delete-dot" title="Delete Card"></div>
                </div>
            </div>
            <div class="card-content">
                <div class="content-area" contenteditable="true" tabindex="0"></div>
            </div>
            <div class="resize-handle"></div>
        `;

        // Add card to canvas area instead of body
        canvasArea.appendChild(card);

        // Add connection click handler
        card.addEventListener('click', (e) => {
            handleCardConnection(card, e);
        });

        // Initialize card functionality
        initializeResizableCard(card);

        // Animate card appearance
        requestAnimationFrame(() => {
            card.classList.add('show');
        });
    }

    // Initialize resizable card functionality
    function initializeResizableCard(card) {
        let isDragging = false;
        let isFollowingCursor = false;
        let isResizing = false;
        let startX, startY, initialX, initialY;
        let startWidth, startHeight;
        let currentX = 0, currentY = 0;

        const colorDot = card.querySelector('.color-dot');
        const deleteDot = card.querySelector('.delete-dot');
        const contentArea = card.querySelector('.content-area');
        const resizeHandle = card.querySelector('.resize-handle');
        const cardHeader = card.querySelector('.card-header');

        // Drag functionality - only works on header
        cardHeader.addEventListener('mousedown', startDrag);
        card.addEventListener('click', toggleDragMode);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // Resize functionality
        resizeHandle.addEventListener('mousedown', startResize);

        function toggleDragMode(e) {
            if (e.target.closest('.card-controls') || e.target.closest('.resize-handle')) return;
            
            if (isFollowingCursor) {
                // Drop the card
                isFollowingCursor = false;
                card.style.transition = '';
                card.classList.remove('dragging');
                cardHeader.style.cursor = 'grab';
            }
        }

        function startDrag(e) {
            if (e.target.closest('.card-controls')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (!isFollowingCursor) {
                // Start following cursor mode
                isFollowingCursor = true;
                card.style.transition = 'none';
                card.classList.add('dragging');
                cardHeader.style.cursor = 'grabbing';
                
                // Calculate offset from mouse to card top-left
                const canvasRect = canvasArea.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                const zoomFactor = currentZoom / 100;
                
                // Store the offset between mouse and card position
                const mouseX = (e.clientX - canvasRect.left) / zoomFactor;
                const mouseY = (e.clientY - canvasRect.top) / zoomFactor;
                const cardX = (cardRect.left - canvasRect.left) / zoomFactor;
                const cardY = (cardRect.top - canvasRect.top) / zoomFactor;
                
                startX = mouseX - cardX;
                startY = mouseY - cardY;
            }
        }

        function drag(e) {
            if (!isFollowingCursor) return;
            
            e.preventDefault();
            
            // Get canvas rect for positioning
            const canvasRect = canvasArea.getBoundingClientRect();
            const zoomFactor = currentZoom / 100;
            
            // Calculate position relative to canvas
            const mouseX = (e.clientX - canvasRect.left) / zoomFactor;
            const mouseY = (e.clientY - canvasRect.top) / zoomFactor;
            
            // Position card maintaining the offset from where you clicked
            currentX = mouseX - startX;
            currentY = mouseY - startY;
            
            card.style.left = `${currentX}px`;
            card.style.top = `${currentY}px`;
            
            // Update connections when card moves
            updateAllConnections();
        }

        function endDrag() {
            // Don't end drag on mouseup - wait for click to drop
        }

        function startResize(e) {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get current card size accounting for zoom
            const cardRect = card.getBoundingClientRect();
            const zoomFactor = currentZoom / 100;
            
            startWidth = cardRect.width / zoomFactor;
            startHeight = cardRect.height / zoomFactor;
            
            card.style.transition = 'none';
            resizeHandle.style.cursor = 'nwse-resize';
        }

        function resize(e) {
            if (!isResizing) return;
            
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // Adjust for zoom level
            const zoomFactor = currentZoom / 100;
            const adjustedDeltaX = deltaX / zoomFactor;
            const adjustedDeltaY = deltaY / zoomFactor;
            
            let newWidth = startWidth + adjustedDeltaX;
            let newHeight = startHeight + adjustedDeltaY;
            
            // Apply size limits
            const maxWidth = 400;
            const maxHeight = 400;
            const minWidth = 120;
            const minHeight = 120;
            
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            // Resize from bottom-right only - keep left/top fixed
            card.style.width = `${newWidth}px`;
            card.style.height = `${newHeight}px`;
            // Don't update left/top - keep them fixed
        }

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                card.style.transition = '';
                resizeHandle.style.cursor = '';
            }
        });

        // Color change functionality
        colorDot.addEventListener('click', (e) => {
            e.stopPropagation();
            changeCardColor(card);
        });

        // Delete functionality
        deleteDot.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCard(card);
        });

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
    { primary: '#c08762ff', text: '#f1f5f9' }, // Slate Deep — calm, neutral  
    { primary: '#aeb273ff', text: '#f8fafc' }, // Navy Black — high focus  
    { primary: '#8397b3ff', text: '#e2e8f0' }, // Steel Slate — balanced  
    { primary: '#58588fff', text: '#f4f4f5' }, // Warm Gray — gentle dark  
    { primary: '#452478ff', text: '#f3e8ff' }, // Deep Violet — creative  
    { primary: '#1e3a8a', text: '#dbeafe' }, // Dark Indigo — structured  
    { primary: '#499065ff', text: '#dcfce7' }, // Forest Green — clarity  
    { primary: '#9e4949ff', text: '#fee2e2' }  // Burgundy Deep — emotional  
];

        
        const currentColor = card.dataset.colorIndex || '0';
        const nextIndex = (parseInt(currentColor) + 1) % colors.length;
        const color = colors[nextIndex];
        
        card.dataset.colorIndex = nextIndex;
        card.style.setProperty('--card-primary', color.primary);
        card.style.setProperty('--card-text', color.text);
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
        
        card.classList.add('removing');
        setTimeout(() => {
            if (card.parentNode) {
                card.parentNode.removeChild(card);
            }
            showNotification('Card deleted');
        }, 300);
    }

    // Delete button functionality - deletes all cards with confirmation
    const deleteBtn = document.querySelector('.action-btn-delete');
    deleteBtn.addEventListener('click', function() {
        console.log('Delete all cards triggered');
        showDeleteConfirmation();
    });

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
            background: #2d3748;
            color: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            min-width: 320px;
            text-align: center;
        `;
        
        dialogBox.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 18px;">Delete All Cards?</h3>
            <p style="margin: 0 0 20px 0; opacity: 0.8;">Are you sure you want to delete ${allCards.length} card(s)?</p>
            <p style="margin: 0 0 24px 0; opacity: 0.6; font-size: 14px;">This action cannot be undone.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="confirm-yes" style="background: #e53e3e; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Yes</button>
                <button id="confirm-no" style="background: #4a5568; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">No</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialogBox);
        document.body.appendChild(dialogOverlay);
        
        // Handle confirmation
        document.getElementById('confirm-yes').addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            deleteAllCards();
        });
        
        document.getElementById('confirm-no').addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            showNotification('Delete cancelled');
        });
        
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
            background-color: #3e5b7bff;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
        
        // A key for add action
        if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            addBtn.click();
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
