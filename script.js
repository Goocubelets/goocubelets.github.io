// Updated script.js with Firebase v9+ modular SDK and Hall of Fame functionality
let submissions = [];
let hallOfFameEntries = [];
let currentTool = 'brush';
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let canvasHistory = [];
let historyStep = -1;

// Firebase will be initialized from the module script
let database;
let firebaseReady = false;

// Initialize Firebase connection after DOM loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Import Firebase modules
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
    const { getDatabase, ref, push, onValue, remove, off } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js");
    const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js");
    
    // Your Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyB4Cl_2tD57-wqc0Zfsi7QBaf-gkv8yLtc",
      authDomain: "goocubelets.firebaseapp.com",
      databaseURL: "https://goocubelets-default-rtdb.firebaseio.com",
      projectId: "goocubelets",
      storageBucket: "goocubelets.firebasestorage.app",
      messagingSenderId: "838931947059",
      appId: "1:838931947059:web:37755dfe600b8ae5aa4d46",
      measurementId: "G-1PD0BVYFV3"
    };
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    const analytics = getAnalytics(app);
    
    // Store Firebase functions globally for use in other functions
    window.firebaseUtils = {
      ref,
      push,
      onValue,
      remove,
      off
    };
    
    firebaseReady = true;
    console.log('Firebase initialized successfully');
    
    // Initialize Hall of Fame after Firebase is ready
    initializeHallOfFame();
    
    // Test Firebase connection
    const testRef = window.firebaseUtils.ref(database, 'test');
    window.firebaseUtils.push(testRef, { message: 'Firebase connection test', timestamp: Date.now() })
      .then(() => {
        console.log('Firebase connection test successful');
      })
      .catch((error) => {
        console.error('Firebase connection test failed:', error);
      });
    
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    firebaseReady = false;
  }
});

// Hall of Fame functionality
function initializeHallOfFame() {
  if (!firebaseReady || !database || !window.firebaseUtils) {
    console.warn('Firebase not ready for Hall of Fame initialization');
    return;
  }

  // Load Hall of Fame entries from Firebase
  const hallOfFameRef = window.firebaseUtils.ref(database, 'halloffame');
  
  window.firebaseUtils.onValue(hallOfFameRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      hallOfFameEntries = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      
      // Sort by date added to Hall of Fame (newest first)
      hallOfFameEntries.sort((a, b) => {
        const timeA = a.addedToHallOfFame || 0;
        const timeB = b.addedToHallOfFame || 0;
        return timeB - timeA;
      });
      
      renderHallOfFame();
    } else {
      hallOfFameEntries = [];
      renderHallOfFame();
    }
  }, (error) => {
    console.error('Error loading Hall of Fame:', error);
  });
}

function renderHallOfFame() {
  const hallOfFameGrid = document.getElementById('halloffameGrid');
  const noDrawings = document.getElementById('noDrawings');
  
  if (!hallOfFameGrid || !noDrawings) return;
  
  if (hallOfFameEntries.length === 0) {
    hallOfFameGrid.innerHTML = '';
    noDrawings.style.display = 'block';
    return;
  }
  
  noDrawings.style.display = 'none';
  
  const itemsHTML = hallOfFameEntries.map(entry => {
    const originalDate = new Date(entry.timestamp).toLocaleDateString();
    const addedDate = entry.addedToHallOfFame ? 
      new Date(entry.addedToHallOfFame).toLocaleDateString() : 
      'Unknown';
    
    return `
      <div class="halloffame-item">
        <div class="halloffame-drawing-container">
          <img src="${entry.drawing}" alt="Featured drawing" class="halloffame-drawing">
        </div>
        <div class="halloffame-content">
          ${entry.content ? `<div class="halloffame-text">"${escapeHtml(entry.content)}"</div>` : ''}
          <div class="halloffame-meta">
            <div class="halloffame-date">Originally submitted: ${originalDate}</div>
            <div class="halloffame-featured">Featured: ${addedDate}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  hallOfFameGrid.innerHTML = itemsHTML;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const undoBtn = document.getElementById('undoBtn');

// Initialize canvas
if (canvas) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

// Canvas history management
function saveState() {
  if (!canvas) return;
  historyStep++;
  if (historyStep < canvasHistory.length) canvasHistory.length = historyStep;
  canvasHistory.push(canvas.toDataURL());
  if (canvasHistory.length > 50) {
    canvasHistory.shift();
    historyStep--;
  }
  updateUndoButton();
}

function undoDrawing() {
  if (!canvas || historyStep <= 0) return;
  historyStep--;
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = canvasHistory[historyStep];
  updateUndoButton();
}

function updateUndoButton() {
  if (undoBtn) {
    undoBtn.disabled = historyStep <= 0;
  }
}

// Drawing functions
function floodFill(startX, startY, fillColor) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const startPos = (startY * canvas.width + startX) * 4;
  const startR = pixels[startPos];
  const startG = pixels[startPos + 1];
  const startB = pixels[startPos + 2];
  const startA = pixels[startPos + 3];
  
  // Convert fill color to RGB
  const fillR = parseInt(fillColor.slice(1, 3), 16);
  const fillG = parseInt(fillColor.slice(3, 5), 16);
  const fillB = parseInt(fillColor.slice(5, 7), 16);
  
  // Don't fill if clicking on the same color
  if (startR === fillR && startG === fillG && startB === fillB) return;
  
  // Tolerance for color matching (helps with anti-aliasing)
  const tolerance = 30;
  
  // Helper function to check if colors match within tolerance
  function colorMatch(r, g, b, a) {
    return Math.abs(r - startR) <= tolerance &&
           Math.abs(g - startG) <= tolerance &&
           Math.abs(b - startB) <= tolerance &&
           Math.abs(a - startA) <= tolerance;
  }
  
  const pixelsToCheck = [startX, startY];
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Set();
  
  while (pixelsToCheck.length > 0) {
    const y = pixelsToCheck.pop();
    const x = pixelsToCheck.pop();
    
    const currentPos = (y * width + x) * 4;
    const key = `${x},${y}`;
    
    if (x < 0 || y < 0 || x >= width || y >= height || visited.has(key)) continue;
    
    const r = pixels[currentPos];
    const g = pixels[currentPos + 1];
    const b = pixels[currentPos + 2];
    const a = pixels[currentPos + 3];
    
    if (colorMatch(r, g, b, a)) {
      visited.add(key);
      pixels[currentPos] = fillR;
      pixels[currentPos + 1] = fillG;
      pixels[currentPos + 2] = fillB;
      pixels[currentPos + 3] = 255;
      
      pixelsToCheck.push(x + 1, y);
      pixelsToCheck.push(x - 1, y);
      pixelsToCheck.push(x, y + 1);
      pixelsToCheck.push(x, y - 1);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  saveState();
}

function draw(e) {
  if (!isDrawing || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);

  if (currentTool === 'brush') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = colorPicker ? colorPicker.value : '#000000';
  } else if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#FFFFFF';
  }

  ctx.lineWidth = brushSize ? brushSize.value : 3;
  ctx.stroke();

  lastX = x;
  lastY = y;
}

function startDrawing(e) {
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  
  // Handle paint bucket tool
  if (currentTool === 'bucket') {
    const fillColor = colorPicker ? colorPicker.value : '#000000';
    floodFill(x, y, fillColor);
    return;
  }
  
  isDrawing = true;
  lastX = (e.clientX - rect.left) * scaleX;
  lastY = (e.clientY - rect.top) * scaleY;
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
}

// Event listeners for drawing
if (canvas) {
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events for mobile - prevent scrolling
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mouseEvent = new MouseEvent('mousedown', { 
      clientX: touch.clientX, 
      clientY: touch.clientY,
      bubbles: true
    });
    canvas.dispatchEvent(mouseEvent);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', { 
      clientX: touch.clientX, 
      clientY: touch.clientY,
      bubbles: true
    });
    canvas.dispatchEvent(mouseEvent);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, { passive: false });
}

// Tool management
function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  const toolBtn = document.getElementById(tool + 'Tool');
  if (toolBtn) {
    toolBtn.classList.add('active');
  }
}

function clearCanvas() {
  if (!canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

// UI functions
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  event.target.classList.add('active');
  const tabContent = document.getElementById(tabName + '-tab');
  if (tabContent) {
    tabContent.classList.add('active');
  }
}

// Updated submission management with Firebase v9+ and better error handling
function saveSubmission(submission) {
  console.log('Attempting to save submission:', submission);
  
  if (!firebaseReady || !database || !window.firebaseUtils) {
    console.warn('Firebase not ready, falling back to localStorage');
    saveToLocalStorage(submission);
    return;
  }

  // Save to Firebase
  const submissionsRef = window.firebaseUtils.ref(database, 'submissions');
  window.firebaseUtils.push(submissionsRef, submission)
    .then(() => {
      console.log('Submission saved to Firebase successfully:', submission.type);
    })
    .catch((error) => {
      console.error('Error saving to Firebase:', error);
      // Fallback to localStorage if Firebase fails
      saveToLocalStorage(submission);
    });
}

function saveToLocalStorage(submission) {
  try {
    let localSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    localSubmissions.push(submission);
    localStorage.setItem('submissions', JSON.stringify(localSubmissions));
    console.log('Submission saved to localStorage as fallback');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function showSuccessMessage(messageId) {
  const msg = document.getElementById(messageId);
  if (msg) {
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
  }
}

// Event listeners
if (brushSize) {
  brushSize.addEventListener('input', (e) => {
    if (brushSizeValue) {
      brushSizeValue.textContent = e.target.value;
    }
  });
}

// Question form submission
const questionForm = document.getElementById('questionForm');
if (questionForm) {
  questionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const questionInput = document.getElementById('question');
    const question = questionInput.value.trim();
    
    if (question) {
      const submission = {
        id: Date.now(),
        type: 'question',
        content: question,
        timestamp: new Date().toLocaleString()
      };
      
      console.log('Submitting question:', submission);
      saveSubmission(submission);
      questionInput.value = '';
      showSuccessMessage('question-success');
    } else {
      console.log('Empty question submitted, ignoring');
    }
  });
}

// Drawing form submission
const drawingForm = document.getElementById('drawingForm');
if (drawingForm) {
  drawingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const messageInput = document.getElementById('drawingMessage');
    const message = messageInput.value.trim();
    const dataURL = canvas ? canvas.toDataURL() : '';
    
    if (dataURL) {
      const submission = {
        id: Date.now(),
        type: 'drawing',
        content: message,
        drawing: dataURL,
        timestamp: new Date().toLocaleString()
      };
      
      console.log('Submitting drawing:', submission);
      saveSubmission(submission);
      messageInput.value = '';
      clearCanvas();
      showSuccessMessage('drawing-success');
    }
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    undoDrawing();
  }
});

// Initialize
setTool('brush');

// Debug function to check Firebase status
window.checkFirebaseStatus = function() {
  console.log('Firebase Ready:', firebaseReady);
  console.log('Database:', database);
  console.log('Firebase Utils:', window.firebaseUtils);
  console.log('Hall of Fame Entries:', hallOfFameEntries);
};

// Make functions available globally
window.switchTab = switchTab;
window.setTool = setTool;
window.undoDrawing = undoDrawing;
window.clearCanvas = clearCanvas;