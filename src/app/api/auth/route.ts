import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { sign, verify } from 'jsonwebtoken';

// In a real app, this would be stored in a database
// For demo purposes, we'll use a hardcoded list of users
const USERS = [
  {
    id: '1',
    email: 'admin@trayarunyaventures.com',
    password: 'admin123', // In a real app, this would be hashed
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: '2',
    email: 'superadmin@trayarunyaventures.com',
    password: 'superadmin123', // In a real app, this would be hashed
    name: 'Super Admin',
    role: 'superadmin'
  }
];

// JWT secret key - in a real app, this would be an environment variable
const JWT_SECRET = 'trayarunya-ventures-jwt-secret-key';

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
    
    // Find user by email
    const user = USERS.find(u => u.email === email);
    
    // Check if user exists and password matches
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
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
    
    try {
      // Verify token
      const decoded = verify(token, JWT_SECRET);
      
      return NextResponse.json({ valid: true, user: decoded });
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in verify token API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
