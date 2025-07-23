import { NextRequest, NextResponse } from "next/server";
import {
  sendContactEmails,
  sendAdminNotification,
} from "@/utils/sendContactEmail";
import { z } from "zod";

// Validation schema for contact email test
const contactEmailSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  emailType: z.enum(["both", "admin-only"]).default("both"),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();

    const validationResult = contactEmailSchema.safeParse(body);
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

    // Prepare email parameters
    const emailParams = {
      name: validData.name,
      email: validData.email,
      subject: validData.subject,
      message: validData.message,
      company: validData.company,
      phone: validData.phone,
      notifyEmail: "sumitshrm12@gmail.com", // Testing email
    };

    let result;

    if (validData.emailType === "admin-only") {
      // Send only admin notification for testing
      result = await sendAdminNotification(emailParams);
    } else {
      // Send both admin notification and customer confirmation
      result = await sendContactEmails(emailParams);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email(s) sent successfully",
        emailType: validData.emailType,
        result: result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error sending contact email:", error);

    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing SMTP configuration
export async function GET(request: NextRequest) {
  try {
    // Test SMTP configuration
    const requiredEnvVars = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "FROM_EMAIL",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          missing: missingVars,
          current: {
            SMTP_HOST: process.env.SMTP_HOST ? "✓ Set" : "✗ Missing",
            SMTP_PORT: process.env.SMTP_PORT ? "✓ Set" : "✗ Missing",
            SMTP_USER: process.env.SMTP_USER ? "✓ Set" : "✗ Missing",
            SMTP_PASS: process.env.SMTP_PASS ? "✓ Set" : "✗ Missing",
            FROM_EMAIL: process.env.FROM_EMAIL ? "✓ Set" : "✗ Missing",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "SMTP configuration is valid",
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          fromEmail: process.env.FROM_EMAIL,
          testEmail: "sumitshrm12@gmail.com",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error checking SMTP configuration:", error);

    return NextResponse.json(
      {
        error: "Failed to check SMTP configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
