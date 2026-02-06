/**
 * Robust Google Cloud authentication utilities
 * Handles both Vertex AI (service account) and Google AI SDK (API key) authentication
 */

/**
 * Parse GOOGLE_APPLICATION_CREDENTIALS from environment variable
 * Supports both JSON string and file path formats
 * 
 * @returns {Object|null} Credentials object or null if not available/invalid
 */
export function parseGoogleCredentials() {
  const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credsEnv) {
    console.warn('[Auth] GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
    return null;
  }

  // Try parsing as JSON string first (common in Vercel/serverless)
  try {
    // Handle both raw JSON and escaped JSON strings
    let jsonString = credsEnv.trim();
    
    // Remove surrounding quotes if present
    if ((jsonString.startsWith('"') && jsonString.endsWith('"')) ||
        (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
      jsonString = JSON.parse(jsonString); // Unescape if needed
    }
    
    // Remove newlines and normalize whitespace (common in .env files with multi-line JSON)
    // Replace newlines with spaces, then collapse multiple spaces
    jsonString = jsonString.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
    jsonString = jsonString.replace(/\s+/g, ' ').trim();
    
    // Try to parse as JSON
    const creds = JSON.parse(jsonString);
    
    // Validate it's a service account key
    if (creds.type === 'service_account' && creds.project_id && creds.private_key) {
      console.log('[Auth] Successfully parsed service account credentials');
      return creds;
    }
    console.warn('[Auth] GOOGLE_APPLICATION_CREDENTIALS is not a valid service account key');
    return null;
  } catch (parseError) {
    // If JSON parsing fails, it might be a file path (not supported in serverless)
    if (credsEnv.startsWith('/') || credsEnv.includes('\\')) {
      console.warn('[Auth] File path credentials not supported in serverless environment');
      return null;
    }
    
    // Try one more time with cleaned string (remove newlines but preserve JSON structure)
    try {
      let cleaned = credsEnv.trim();
      // Remove newlines and carriage returns, but preserve spaces within strings
      // This handles multi-line JSON in .env files
      cleaned = cleaned.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
      // Collapse multiple spaces to single space (but not within quoted strings)
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      if (cleaned.startsWith('{')) {
        const creds = JSON.parse(cleaned);
        if (creds.type === 'service_account' && creds.project_id && creds.private_key) {
          console.log('[Auth] Successfully parsed service account credentials (after cleanup)');
          return creds;
        }
      }
    } catch (e) {
      // Final fallback - log detailed error
      console.error('[Auth] Failed to parse GOOGLE_APPLICATION_CREDENTIALS:', e.message);
      console.error('[Auth] First 200 chars of value:', credsEnv.substring(0, 200));
      console.error('[Auth] Make sure GOOGLE_APPLICATION_CREDENTIALS is a valid JSON string on a single line');
    }
    
    return null;
  }
}

/**
 * Get Vertex AI authentication options
 * @returns {Object} Auth options for VertexAI constructor
 */
export function getVertexAIAuthOptions() {
  const creds = parseGoogleCredentials();
  
  if (creds) {
    return { credentials: creds };
  }
  
  // Return empty object - VertexAI will use default credentials or fail
  return {};
}

/**
 * Initialize Vertex AI with robust error handling
 * Falls back to Google AI SDK if Vertex AI auth fails
 * 
 * @param {string} projectId - Google Cloud project ID
 * @param {string} location - Vertex AI location (default: us-central1)
 * @returns {Promise<{vertexAI: VertexAI|null, fallback: boolean}>}
 */
export async function initVertexAI(projectId, location = 'us-central1') {
  const authOptions = getVertexAIAuthOptions();
  
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ 
      project: projectId, 
      location,
      ...authOptions 
    });
    
    return { vertexAI, fallback: false };
  } catch (error) {
    console.warn('[Auth] Vertex AI initialization failed:', error.message);
    console.log('[Auth] Falling back to Google AI SDK (API key)...');
    return { vertexAI: null, fallback: true };
  }
}

/**
 * Initialize Google AI SDK (fallback) using GEMINI_API_KEY
 * 
 * @returns {Promise<Object|null>} GoogleGenerativeAI instance or null
 */
export async function initGoogleAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('[Auth] GEMINI_API_KEY not found, cannot use Google AI SDK fallback');
    return null;
  }
  
  try {
    // Dynamic import to avoid errors if package not installed
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.warn('[Auth] Failed to initialize Google AI SDK:', error.message);
    return null;
  }
}
