// firebase-config.js
// Add this to your HTML before your other scripts:
// <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-database-compat.js"></script>

// Import the functions you need from the SDKs you need
    import { initializeApp } from "firebase/app";
    import { getAnalytics } from "firebase/analytics";
    // TODO: Add SDKs for Firebase products that you want to use
    // https://firebase.google.com/docs/web/setup#available-libraries

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
    const analytics = getAnalytics(app);

  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
  // Updated script.js with Firebase integration
  let submissions = [];
  let currentTool = 'brush';
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let canvasHistory = [];
  let historyStep = -1;
  
  const canvas = document.getElementById('drawingCanvas');
  const ctx = canvas.getContext('2d');
  const colorPicker = document.getElementById('colorPicker');
  const brushSize = document.getElementById('brushSize');
  const brushSizeValue = document.getElementById('brushSizeValue');
  const undoBtn = document.getElementById('undoBtn');
  
  // Initialize canvas
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
  
  // Canvas history management
  function saveState() {
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
    if (historyStep > 0) {
      historyStep--;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = canvasHistory[historyStep];
      updateUndoButton();
    }
  }
  
  function updateUndoButton() {
    undoBtn.disabled = historyStep <= 0;
  }
  
  // Drawing functions (unchanged)
  function draw(e) {
    if (!isDrawing) return;
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
      ctx.strokeStyle = colorPicker.value;
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }
  
    ctx.lineWidth = brushSize.value;
    ctx.stroke();
  
    lastX = x;
    lastY = y;
  }
  
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
    lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  
  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  }
  
  // Event listeners for drawing
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
  });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent('mouseup'));
  });
  
  // Tool management
  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tool + 'Tool').classList.add('active');
  }
  
  function clearCanvas() {
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
    document.getElementById(tabName + '-tab').classList.add('active');
  }
  
  // Updated submission management with Firebase
  function saveSubmission(submission) {
    // Save to Firebase
    database.ref('submissions').push(submission)
      .then(() => {
        console.log('Submission saved to Firebase');
      })
      .catch((error) => {
        console.error('Error saving to Firebase:', error);
        // Fallback to localStorage if Firebase fails
        let localSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
        localSubmissions.push(submission);
        localStorage.setItem('submissions', JSON.stringify(localSubmissions));
      });
  }
  
  function showSuccessMessage(messageId) {
    const msg = document.getElementById(messageId);
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
  }
  
  // Event listeners
  brushSize.addEventListener('input', (e) => {
    brushSizeValue.textContent = e.target.value;
  });
  
  document.getElementById('questionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const question = document.getElementById('question').value.trim();
    
    if (question) {
      const submission = {
        id: Date.now(),
        type: 'question',
        content: question,
        timestamp: new Date().toLocaleString()
      };
      
      saveSubmission(submission);
      document.getElementById('question').value = '';
      showSuccessMessage('question-success');
    }
  });
  
  document.getElementById('drawingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const message = document.getElementById('drawingMessage').value.trim();
    const dataURL = canvas.toDataURL();
    
    const submission = {
      id: Date.now(),
      type: 'drawing',
      content: message,
      drawing: dataURL,
      timestamp: new Date().toLocaleString()
    };
    
    saveSubmission(submission);
    document.getElementById('drawingMessage').value = '';
    clearCanvas();
    showSuccessMessage('drawing-success');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undoDrawing();
    }
  });
  
  // Initialize
  setTool('brush');