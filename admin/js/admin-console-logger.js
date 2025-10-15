/* ====== Professional Admin Console Logger Module ====== */

// UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Log levels enum
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  LOG: 'log',
  DEBUG: 'debug'
};

// Log level colors
const LOG_COLORS = {
  [LOG_LEVELS.ERROR]: '#ef4444',
  [LOG_LEVELS.WARN]: '#f59e0b',
  [LOG_LEVELS.INFO]: '#3b82f6',
  [LOG_LEVELS.LOG]: '#6b7280',
  [LOG_LEVELS.DEBUG]: '#8b5cf6'
};

class ConsoleLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // Reduced from 1000 for better performance
    this.sessionId = this.getSessionId();
    this.init();
  }

  init() {
    // Store original console methods
    this.originalLog = console.log;
    this.originalError = console.error;
    this.originalWarn = console.warn;
    this.originalInfo = console.info;
    this.originalDebug = console.debug;

    // Override console methods
    this.overrideConsole();
    
    this.originalLog('📝 Professional Console Logger initialized');
  }

  overrideConsole() {
    const self = this;
    
    console.log = function(...args) {
      self.addLog(LOG_LEVELS.LOG, args);
      self.originalLog.apply(console, args);
    };

    console.error = function(...args) {
      self.addLog(LOG_LEVELS.ERROR, args);
      self.originalError.apply(console, args);
    };

    console.warn = function(...args) {
      self.addLog(LOG_LEVELS.WARN, args);
      self.originalWarn.apply(console, args);
    };

    console.info = function(...args) {
      self.addLog(LOG_LEVELS.INFO, args);
      self.originalInfo.apply(console, args);
    };

    console.debug = function(...args) {
      self.addLog(LOG_LEVELS.DEBUG, args);
      self.originalDebug.apply(console, args);
    };
  }

  addLog(level, args, context = {}) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    // Extract source information from stack trace (only for errors)
    let source = null;
    if (level === LOG_LEVELS.ERROR) {
      const stack = new Error().stack;
      const stackLines = stack.split('\n');
      if (stackLines.length > 2) {
        const sourceLine = stackLines[2];
        const match = sourceLine.match(/\((.+):(\d+):\d+\)/);
        if (match) {
          source = `${match[1].split('/').pop()}:${match[2]}`;
        }
      }
    }

    const logEntry = {
      id: generateUUID(),
      timestamp: timestamp,
      level: level,
      message: message,
      context: context,
      source: source,
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);

    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs() {
    return this.logs;
  }

  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByDateRange(startDate, endDate) {
    return this.logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  searchLogs(query) {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.level.toLowerCase().includes(lowerQuery)
    );
  }

  getLogStatistics() {
    const stats = {
      total: this.logs.length,
      levels: {},
      oldest: null,
      newest: null
    };

    // Count by level
    Object.values(LOG_LEVELS).forEach(level => {
      stats.levels[level] = this.logs.filter(log => log.level === level).length;
    });

    // Get date range
    if (this.logs.length > 0) {
      const sortedLogs = [...this.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      stats.oldest = sortedLogs[0].timestamp;
      stats.newest = sortedLogs[sortedLogs.length - 1].timestamp;
    }

    return stats;
  }

  clearLogs() {
    this.logs = [];
    this.originalLog('📝 Console logs cleared');
  }

  exportLogs(format = 'txt') {
    if (this.logs.length === 0) {
      alert('İndirilecek log bulunamadı.');
      return;
    }

    let content, mimeType, extension;

    if (format === 'json') {
      content = JSON.stringify(this.logs, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.logs.map(log => 
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      ).join('\n');
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-console-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.originalLog(`📁 Console logs exported as ${extension.toUpperCase()}`);
    alert(`✅ ${this.logs.length} log mesajı başarıyla indirildi!`);
  }

  async sendLogsToServer() {
    try {
      this.originalLog('📤 Sending logs to server...');
      const token = localStorage.getItem('admin_token');
      if (!token) {
        this.originalError('No admin token found');
        alert('Admin token bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      if (this.logs.length === 0) {
        alert('Gönderilecek log bulunamadı.');
        return;
      }

      const response = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          logs: this.logs,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.sessionId
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.originalLog('📤 Console logs sent to server:', result);
        alert(`✅ ${this.logs.length} log mesajı başarıyla sunucuya gönderildi!`);
        // Refresh log files list
        if (typeof loadLogFiles === 'function') {
          loadLogFiles();
        }
      } else {
        const errorText = await response.text();
        this.originalError('Failed to send logs to server:', response.status, errorText);
        alert('❌ Loglar sunucuya gönderilirken hata oluştu: ' + response.status);
      }
    } catch (error) {
      this.originalError('Error sending logs to server:', error);
      alert('❌ Loglar sunucuya gönderilirken hata oluştu: ' + error.message);
    }
  }

  getSessionId() {
    // Try to get session ID from localStorage or generate one
    let sessionId = localStorage.getItem('current_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + generateUUID().substring(0, 8);
      localStorage.setItem('current_session_id', sessionId);
    }
    return sessionId;
  }
}

// Enhanced log files loading with filtering and pagination
async function loadLogFiles(filters = {}) {
  try {
    console.log('📁 Loading log files with filters:', filters);
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('No admin token found');
      return;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (filters.level) params.append('level', filters.level);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const url = `/api/admin/logs${params.toString() ? '?' + params.toString() : ''}`;
    console.log('📁 Fetching from URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📁 API Response:', data);
    
    // Render log files to HTML
    const logFilesList = document.getElementById('logFilesList');
    if (logFilesList) {
      if (data.logs && data.logs.length > 0) {
        logFilesList.innerHTML = data.logs.map(logEntry => `
          <div class="log-file-item">
            <div class="log-file-info">
              <span class="log-file-date">${new Date(logEntry.timestamp).toLocaleString('tr-TR')}</span>
              <span class="log-file-user">Kullanıcı: ${logEntry.user}</span>
              <span class="log-file-count">${logEntry.logCount} log mesajı</span>
              ${logEntry.levels ? `
                <div class="log-levels">
                  ${Object.entries(logEntry.levels).map(([level, count]) => 
                    count > 0 ? `<span class="log-level-badge log-level-${level}">${level}: ${count}</span>` : ''
                  ).join('')}
                </div>
              ` : ''}
            </div>
            <div class="log-file-actions">
              <button class="btn btn-sm btn-info" onclick="downloadSpecificLog('${logEntry.timestamp}')" title="Bu log dosyasını indir">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                İndir
              </button>
              <button class="btn btn-sm btn-secondary" onclick="viewLogDetails('${logEntry.timestamp}')" title="Log detaylarını görüntüle">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                </svg>
                Detayları Gör
              </button>
            </div>
          </div>
        `).join('');
      } else {
        logFilesList.innerHTML = '<p class="muted">Henüz log dosyası oluşturulmamış.</p>';
      }
    }

    // Update pagination if available
    if (data.pagination) {
      updatePagination(data.pagination);
    }

    console.log('📁 Log files loaded successfully');
    if (data.logs && data.logs.length > 0) {
      console.log(`📁 ${data.logs.length} log dosyası yüklendi`);
    } else {
      console.log('📁 Henüz log dosyası bulunamadı');
    }
  } catch (error) {
    console.error('Error loading log files:', error);
    alert('❌ Log dosyaları yüklenirken hata oluştu: ' + error.message);
  }
}

// Download specific log file
async function downloadSpecificLog(timestamp) {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('No admin token found');
      return;
    }

    const response = await fetch(`/api/admin/logs?date=${timestamp.split('T')[0]}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch log details');
    }

    const data = await response.json();
    
    // Find specific log entry
    const logEntry = data.logs.find(log => log.timestamp === timestamp);
    if (logEntry) {
      const logsText = logEntry.logs.map(log => 
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      ).join('\n');
      
      // Format filename
      const fileName = `admin-console-logs-${timestamp.replace(/[:.]/g, '-').replace('T', '_')}.txt`;
      
      // Create and download blob
      const blob = new Blob([logsText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`📁 Log dosyası indirildi: ${fileName}`);
    } else {
      console.error('Log entry not found for timestamp:', timestamp);
    }

  } catch (error) {
    console.error('Error downloading specific log:', error);
  }
}

// Enhanced log details viewer with filtering
async function viewLogDetails(timestamp) {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('No admin token found');
      return;
    }

    const response = await fetch(`/api/admin/logs?date=${timestamp.split('T')[0]}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch log details');
    }

    const data = await response.json();
    
    // Find log entry
    const logEntry = data.logs.find(log => log.timestamp === timestamp);
    if (logEntry) {
      // Create enhanced modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content log-details-modal">
          <div class="modal-header">
            <h3>📝 Log Detayları</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="log-details-info">
              <p><strong>Tarih:</strong> ${new Date(logEntry.timestamp).toLocaleString('tr-TR')}</p>
              <p><strong>Kullanıcı:</strong> ${logEntry.user}</p>
              <p><strong>Toplam Log:</strong> ${logEntry.logCount} mesaj</p>
              ${logEntry.levels ? `
                <div class="log-levels-summary">
                  ${Object.entries(logEntry.levels).map(([level, count]) => 
                    count > 0 ? `<span class="log-level-badge log-level-${level}">${level}: ${count}</span>` : ''
                  ).join('')}
                </div>
              ` : ''}
            </div>
            <div class="log-details-content">
              <div class="log-filters">
                <select id="logLevelFilter" onchange="filterLogDetails()">
                  <option value="">Tüm Seviyeler</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="log">Log</option>
                  <option value="debug">Debug</option>
                </select>
                <input type="text" id="logSearchFilter" placeholder="Log mesajında ara..." onkeyup="filterLogDetails()">
              </div>
              <h4>Log Mesajları:</h4>
              <div class="log-messages" id="logMessagesContainer">
                ${logEntry.logs.map(log => `
                  <div class="log-message log-level-${log.level}" data-level="${log.level}" data-message="${log.message.toLowerCase()}">
                    <span class="log-timestamp">[${new Date(log.timestamp).toLocaleString('tr-TR')}]</span>
                    <span class="log-level-badge log-level-${log.level}">${log.level.toUpperCase()}</span>
                    <span class="log-content">${log.message}</span>
                    ${log.source ? `<span class="log-source">${log.source}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Kapat</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    } else {
      alert('Log detayları bulunamadı.');
    }

  } catch (error) {
    console.error('Error viewing log details:', error);
    alert('Log detayları yüklenirken hata oluştu: ' + error.message);
  }
}

// Filter log details in modal
function filterLogDetails() {
  const levelFilter = document.getElementById('logLevelFilter')?.value || '';
  const searchFilter = document.getElementById('logSearchFilter')?.value.toLowerCase() || '';
  const logMessages = document.querySelectorAll('.log-message');

  logMessages.forEach(message => {
    const level = message.dataset.level;
    const messageText = message.dataset.message;
    
    const levelMatch = !levelFilter || level === levelFilter;
    const searchMatch = !searchFilter || messageText.includes(searchFilter);
    
    message.style.display = (levelMatch && searchMatch) ? 'block' : 'none';
  });
}

// Update pagination controls
function updatePagination(pagination) {
  const paginationContainer = document.getElementById('logPagination');
  if (!paginationContainer) return;

  const { currentPage, totalPages, hasNext, hasPrev } = pagination;
  
  let paginationHTML = '<div class="pagination">';
  
  if (hasPrev) {
    paginationHTML += `<button class="btn btn-sm" onclick="loadLogFiles({page: ${currentPage - 1}})">Önceki</button>`;
  }
  
  paginationHTML += `<span class="pagination-info">Sayfa ${currentPage} / ${totalPages}</span>`;
  
  if (hasNext) {
    paginationHTML += `<button class="btn btn-sm" onclick="loadLogFiles({page: ${currentPage + 1}})">Sonraki</button>`;
  }
  
  paginationHTML += '</div>';
  paginationContainer.innerHTML = paginationHTML;
}

// Global functions for backward compatibility
if (typeof window !== 'undefined') {
  window.ConsoleLogger = ConsoleLogger;
  window.LOG_LEVELS = LOG_LEVELS;
  window.LOG_COLORS = LOG_COLORS;
  
  // Initialize logger
  window.consoleLogger = new ConsoleLogger();
  
  // Global function exports
  window.exportConsoleLogs = () => window.consoleLogger.exportLogs('txt');
  window.exportConsoleLogsJSON = () => window.consoleLogger.exportLogs('json');
  window.clearConsoleLogs = () => window.consoleLogger.clearLogs();
  window.sendLogsToServer = () => window.consoleLogger.sendLogsToServer();
  window.loadLogFiles = loadLogFiles;
  window.viewLogDetails = viewLogDetails;
  window.downloadSpecificLog = downloadSpecificLog;
  window.filterLogDetails = filterLogDetails;
}

console.log('📦 Professional Admin Console Logger Module loaded');