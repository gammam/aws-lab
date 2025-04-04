// utils/logger.js
class Logger {
    _formatMessage(level, message, data) {
      const timestamp = new Date().toISOString();
      let logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      if (data) {
        if (data instanceof Error) {
          logMsg += `\n  Error: ${data.message}`;
          if (data.stack) logMsg += `\n  Stack: ${data.stack}`;
          if (data.code) logMsg += `\n  Code: ${data.code}`;
          if (data.response) logMsg += `\n  Response: ${JSON.stringify(data.response.data || data.response)}`;
        } else {
          logMsg += `\n  Data: ${typeof data === 'object' ? JSON.stringify(data) : data}`;
        }
      }
      return logMsg;
    }
  
    debug(message, data) {
      console.debug(this._formatMessage('debug', message, data));
    }
  
    info(message, data) {
      console.log(this._formatMessage('info', message, data));
    }
  
    warn(message, data) {
      console.warn(this._formatMessage('warn', message, data));
    }
  
    error(message, data) {
      console.error(this._formatMessage('error', message, data));
    }
  }
  