// Comprehensive input validation system for security

import { z } from 'zod';

// Basic input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  // Remove dangerous characters
  return input
    .replace(/[<>\"'&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
};

// Ethereum address validation
export const validateEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Token ID validation (0-5000)
export const validateTokenId = (tokenId: string): boolean => {
  const num = parseInt(tokenId);
  return !isNaN(num) && num >= 0 && num <= 5000;
};

// URL validation and sanitization
export const validateAndSanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();

  // Allow only safe protocols
  const allowedProtocols = ['https://', 'http://', 'ipfs://', 'data:'];
  const hasSafeProtocol = allowedProtocols.some(protocol =>
    trimmed.toLowerCase().startsWith(protocol)
  );

  if (!hasSafeProtocol) return '';

  // Remove dangerous content
  return trimmed
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '');
};

// GraphQL query validation
export const validateGraphQLQuery = (query: string): boolean => {
  if (!query || typeof query !== 'string') return false;

  // Block dangerous operations
  const dangerousOperations = [
    'mutation',
    'subscription',
    '__schema',
    'introspection',
    'fragment',
    'directive',
  ];

  const lowerQuery = query.toLowerCase();
  return !dangerousOperations.some(op => lowerQuery.includes(op));
};

// Numeric input validation
export const validateNumericInput = (
  input: string,
  min?: number,
  max?: number
): boolean => {
  const num = parseFloat(input);
  if (isNaN(num)) return false;

  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;

  return true;
};

// String length validation
export const validateStringLength = (
  input: string,
  minLength: number,
  maxLength: number
): boolean => {
  if (typeof input !== 'string') return false;
  return input.length >= minLength && input.length <= maxLength;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// File type validation
export const validateFileType = (
  filename: string,
  allowedTypes: string[]
): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
};

// Zod schemas for API validation
export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const tokenIdSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(val => {
    const num = parseInt(val);
    if (num < 0 || num > 5000) throw new Error('Token ID out of range');
    return num;
  });

export const graphQLQuerySchema = z.object({
  query: z.string().max(10000).refine(validateGraphQLQuery, {
    message: 'Dangerous GraphQL operation detected',
  }),
  variables: z.record(z.string(), z.any()).optional(),
  operationName: z.string().optional(),
});

export const apiRequestSchema = z.object({
  address: ethereumAddressSchema.optional(),
  tokenId: tokenIdSchema.optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// Rate limiting validation
export const validateRateLimit = (
  ip: string,
  requests: Map<string, { count: number; resetTime: number }>,
  maxRequests: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const current = requests.get(ip);

  if (!current || now > current.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
};

// Input sanitization for React components
export const sanitizeReactInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;');
};

// Validate and sanitize user input for forms
export const validateFormInput = (
  input: string,
  type: 'text' | 'email' | 'number' | 'url'
): string => {
  const sanitized = sanitizeInput(input);

  switch (type) {
    case 'email':
      return validateEmail(sanitized) ? sanitized : '';
    case 'number':
      return validateNumericInput(sanitized) ? sanitized : '';
    case 'url':
      return validateAndSanitizeUrl(sanitized);
    default:
      return sanitized;
  }
};

// Validate API parameters
export const validateAPIParams = (params: { [key: string]: any }): boolean => {
  try {
    apiRequestSchema.parse(params);
    return true;
  } catch {
    return false;
  }
};

// Validate file upload
export const validateFileUpload = (
  file: File,
  maxSize: number,
  allowedTypes: string[]
): boolean => {
  if (file.size > maxSize) return false;
  if (!validateFileType(file.name, allowedTypes)) return false;
  return true;
};

// Validate JSON payload
export const validateJSONPayload = (
  payload: string,
  maxSize: number
): boolean => {
  if (payload.length > maxSize) return false;

  try {
    JSON.parse(payload);
    return true;
  } catch {
    return false;
  }
};

// Validate and sanitize search queries
const searchQuerySchema = z
  .string()
  .max(100)
  .transform(val => {
    return val.normalize('NFC').replace(/[<>\"'&]/g, '');
  });

export const validateSearchQuery = (query: string): string => {
  try {
    return searchQuerySchema.parse(query);
  } catch {
    return '';
  }
};

// Path traversal validation
import path from 'path';
const ALLOWED_PATHS = ['/public', '/app'];

export const validatePath = (inputPath: string): string | null => {
  const normalizedPath = path.normalize(inputPath);
  const resolvedPath = path.resolve(normalizedPath);

  const isAllowed = ALLOWED_PATHS.some(allowedPath => {
    const resolvedAllowedPath = path.resolve(allowedPath);
    return resolvedPath.startsWith(resolvedAllowedPath);
  });

  if (isAllowed) {
    return resolvedPath;
  }

  return null;
};

// Validate pagination parameters
export const validatePagination = (page: number, limit: number): boolean => {
  return page >= 1 && limit >= 1 && limit <= 100;
};

// Validate sort parameters
export const validateSortParams = (
  sortBy: string,
  sortOrder: string,
  allowedFields: string[]
): boolean => {
  return (
    allowedFields.includes(sortBy) &&
    ['asc', 'desc'].includes(sortOrder.toLowerCase())
  );
};

export default {
  sanitizeInput,
  validateEthereumAddress,
  validateTokenId,
  validateAndSanitizeUrl,
  validateGraphQLQuery,
  validateNumericInput,
  validateStringLength,
  validateEmail,
  validateFileType,
  validateRateLimit,
  sanitizeReactInput,
  validateFormInput,
  validateAPIParams,
  validateFileUpload,
  validateJSONPayload,
  validateSearchQuery,
  validatePagination,
  validateSortParams,
};
