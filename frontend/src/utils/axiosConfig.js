/**
 * Axios Configuration with Request/Response Logging
 * Provides automatic logging for all API calls
 */

import axios from 'axios';
import logger from './logger';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Log all requests
apiClient.interceptors.request.use(
  (config) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    config.headers['X-Request-ID'] = requestId;

    // Log the request
    const requestData = {
      method: config.method.toUpperCase(),
      url: config.url,
      params: config.params,
      body: config.data,
    };

    logger.apiRequest(config.method.toUpperCase(), config.url, config.data);

    // Store request ID for response correlation
    config.metadata = {
      startTime: new Date(),
      requestId,
    };

    return config;
  },
  (error) => {
    logger.error('Request Interceptor Error', {
      message: error.message,
      config: error.config,
    });
    return Promise.reject(error);
  }
);

// Response Interceptor - Log all responses
apiClient.interceptors.response.use(
  (response) => {
    const { config, data, status } = response;
    const duration = new Date() - config.metadata.startTime;

    logger.apiResponse(
      config.method.toUpperCase(),
      config.url,
      status,
      {
        data: data,
        duration: `${duration}ms`,
        requestId: config.metadata.requestId,
      }
    );

    return response;
  },
  (error) => {
    const { config, response } = error;
    const duration = config?.metadata ? new Date() - config.metadata.startTime : 0;

    // Log error details
    const errorDetails = {
      message: error.message,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      duration: `${duration}ms`,
      requestId: config?.metadata?.requestId,
    };

    logger.apiError(
      config?.method?.toUpperCase() || 'UNKNOWN',
      config?.url || 'unknown',
      error
    );

    // Handle specific error scenarios
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 400:
          logger.warn('Bad Request - Check your input data', errorDetails);
          break;
        case 401:
          logger.warn('Unauthorized - Please check your credentials', errorDetails);
          break;
        case 403:
          logger.warn('Forbidden - You do not have permission', errorDetails);
          break;
        case 404:
          logger.warn('Not Found - The requested resource does not exist', errorDetails);
          break;
        case 429:
          logger.warn('Rate Limited - Too many requests, please try again later', errorDetails);
          break;
        case 500:
          logger.error('Server Error - Please try again later', errorDetails);
          break;
        default:
          logger.error(`HTTP Error ${status}`, errorDetails);
      }
    } else if (error.request) {
      logger.error('No response received from server', {
        message: 'Network error or server unreachable',
        url: config?.url,
        method: config?.method,
      });
    } else {
      logger.error('Error setting up request', {
        message: error.message,
        config,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
