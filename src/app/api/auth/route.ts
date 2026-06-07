import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signToken, verifyToken } from '@/lib/authToken';
import { userStore, verifyPassword } from '@/lib/userStore';

export const runtime = 'nodejs';

// Define validation schema for login
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// Rate limiting helper (simple in-memory implementation)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests = new Map<string, { count: number, timestamp: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const requestData = ipRequests.get(ip);
  
  if (!requestData) {
    ipRequests.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    // Reset if window has passed
    ipRequests.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Increment count
  ipRequests.set(ip, { 
    count: requestData.count + 1, 
    timestamp: requestData.timestamp 
  });
  return false;
}

// Login endpoint
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { email, password } = validationResult.data;

    // Find user by email in the server-side user store
    const user = await userStore.findByEmail(email);

    // Check if user exists, is active, and password matches
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    
    // Return user info and token
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error in auth API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Verify token endpoint
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Error in verify token API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
