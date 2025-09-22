import { NextRequest, NextResponse } from "next/server";
import {
  Lead,
  LeadSource,
  LeadPriority,
  LeadStatus,
} from "@/app/admin/leads/types";
import { headers } from "next/headers";
import { z } from "zod"; // For validation
import { db } from "@/lib/db";
import {
  sendContactEmails,
  sendAdminNotification,
} from "@/utils/sendContactEmail";

// Define validation schema for lead submission
const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  formType: z.string().optional(),
  pageUrl: z.string().optional(),
});

// Rate limiting helper (simple in-memory implementation)
// In production, use Redis or another distributed cache
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests = new Map<string, { count: number; timestamp: number }>();

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
    timestamp: requestData.timestamp,
  });
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();

    const validationResult = leadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const validData = validationResult.data;

    // Create a new lead object
    const newLead: Omit<Lead, "id"> = {
      name: validData.name,
      email: validData.email,
      company: validData.company || undefined,
      phone: validData.phone || undefined,
      message: `${validData.subject}: ${validData.message}`, // Include subject in the message
      source: (validData.source as LeadSource) || "Website Contact Form",
      status: "New",
      priority: (validData.priority as LeadPriority) || "Medium",
      date: new Date().toISOString(),
      formType: validData.formType || "Contact Form",
      pageUrl: validData.pageUrl || "/contact",
      // Store the subject in formData since it's not part of the Lead type
      formData: {
        subject: validData.subject,
        userAgent: request.headers.get("user-agent") || undefined,
        ipAddress: process.env.NODE_ENV === "production" ? undefined : ip, // Only store IP in development
        referrer: request.headers.get("referer") || undefined,
      },
    };

    // Save to database
    const savedLead = await db.leads.create(newLead);

    // Send email notifications using the new utility
    try {
      await sendContactEmails({
        name: validData.name,
        email: validData.email,
        subject: validData.subject,
        message: validData.message,
        company: validData.company,
        phone: validData.phone,
        notifyEmail: "sumitshrm12@gmail.com", // Testing email
      });
    } catch (emailError) {
      console.error("Failed to send contact emails:", emailError);
      // Log the error but don't fail the request
      // In production, you might want to queue the email for retry
    } // Return a success response
    return NextResponse.json(
      {
        success: true,
        message: "Lead created successfully",
        id: savedLead.id,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error creating lead:", error);

    // Log the error to your monitoring service
    // In production, you would use a service like Sentry
    // Sentry.captureException(error);

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // This endpoint should be protected in production
  // Check for authentication
  const authorization = request.headers.get("authorization") || "";

  // For testing purposes, we'll skip the authentication check
  // In a production environment, you would want to properly validate the token
  /*
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  */

  try {
    // Get the path from the URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Check if this is a stats request
    if (path.endsWith("/stats")) {
      try {
        // Get real stats from the database
        const stats = await db.leads.getStats();

        return NextResponse.json(stats, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        });
      } catch (error) {
        console.error("Error generating lead stats:", error);
        return NextResponse.json(
          { error: "Failed to generate lead statistics" },
          { status: 500 }
        );
      }
    }

    // Regular leads request
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    // Fetch leads from database with pagination and filtering
    const leads = await db.leads.findMany({
      take: Math.min(limit, 100), // Cap at 100 for performance
      skip: offset,
      where: status ? { status: status as LeadStatus } : undefined,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(
      { leads },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
