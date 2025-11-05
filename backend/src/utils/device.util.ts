import { Request } from 'express';

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

export function getDeviceInfo(req: Request): DeviceInfo {
  // Get user agent from headers
  const userAgent = req.headers['user-agent'] || undefined;

  // Get IP address from request
  // Check for forwarded IP (behind proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = forwardedFor
    ? (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : forwardedFor[0])
    : req.socket.remoteAddress || req.ip || undefined;

  return {
    userAgent,
    ipAddress,
  };
}

