import pkg from "../../package.json"

export const getIndex = async () => {
  return `<html>
    <head>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .circuit-loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .circuit-loading.active {
          display: flex;
        }
        .loading-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .loading-spinner {
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <div class="circuit-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>Circuit is rendering...</p>
        </div>
      </div>
      <script>
        globalThis.process = { env: { NODE_ENV: "production" } }
        console.log('Setting up EventSource connection...');
        
        const loadingOverlay = document.querySelector('.circuit-loading');
        const evtSource = new EventSource('/api/events/stream');
        
        evtSource.onopen = () => {
          console.log('EventSource connection established');
        };
        
        evtSource.onerror = (error) => {
          console.error('EventSource error:', error);
        };
        
        evtSource.onmessage = (event) => {
          console.log('Received event:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'FILE_UPDATED') {
            console.log('File update detected, showing loading overlay');
            loadingOverlay.classList.add('active');
            
            console.log('Replacing standalone.js script');
            const oldScript = document.querySelector('script[src="/standalone.min.js"]');
            const newScript = document.createElement('script');
            newScript.src = '/standalone.min.js';
            
            newScript.onload = () => {
              console.log('New script loaded, hiding overlay after delay');
              setTimeout(() => {
                loadingOverlay.classList.remove('active');
                console.log('Loading overlay hidden');
              }, 500);
            };
            
            newScript.onerror = (error) => {
              console.error('Error loading new script:', error);
            };
            
            oldScript.parentNode.replaceChild(newScript, oldScript);
          }
        };
      </script>
      <script src="/standalone.min.js"></script>
    </body>
  </html>`
}

// <script src="https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${pkg.dependencies["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js"></script>
