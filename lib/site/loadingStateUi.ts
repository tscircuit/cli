export const loadingStateUi = `
  <div id="loader" class="loading-overlay">
    <div class="loading-container">
      <div class="loading">
        <div class="loading-bar"></div>
      </div>
    </div>
  </div>
  
  <style>
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1em;
    }
  
    .loading {
      background-color: lightgrey;
      height: 2px;
      overflow: hidden;
      position: relative;
      width: 12em;
      border-radius: 2px;
    }
  
    .loading-bar {
      animation: side2side 2s ease-in-out infinite;
      background-color: dodgerblue;
      height: 100%;
      position: absolute;
      width: 45%;
    }
  
    @keyframes side2side {
      0%,
      100% {
        transform: translateX(-50%);
      }
      50% {
        transform: translateX(150%);
      }
    }
  </style>
`
