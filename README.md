# Trayarunya Ventures Website

This is the official website for Trayarunya Ventures, built with Next.js, Material UI, and Azure OpenAI integration.

## Features

- Modern, responsive design with Material UI components
- Interactive components like ROI Calculator and ICP Generator
- Azure OpenAI integration for generating Ideal Customer Profiles
- Component-based architecture for maintainability and reusability

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

To use the Azure OpenAI integration for the ICP Generator, you need to set up the following environment variables:

1. Copy the `.env.local.example` file to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update the `.env.local` file with your Azure OpenAI credentials:
   ```
   NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
   NEXT_PUBLIC_AZURE_OPENAI_API_KEY=your-api-key
   NEXT_PUBLIC_AZURE_OPENAI_API_VERSION=2023-05-15
   NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-1
   ```

You can obtain these credentials from your Azure OpenAI resource in the Azure portal.

## Project Structure

- `src/app`: Next.js app router pages
- `src/components`: Reusable React components
- `src/services`: Service modules including Azure OpenAI integration
- `src/theme.ts`: Material UI theme configuration

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Azure OpenAI Integration

The project uses Azure OpenAI to generate Ideal Customer Profiles (ICPs) based on business information. The integration is implemented in:

- `src/services/azureOpenAI.ts`: Service for communicating with Azure OpenAI API
- `src/components/Solutions/DigitalMarketing/ICPGenerator.tsx`: Component that uses the service

The ICP Generator uses GPT-4.1 to create detailed customer profiles with demographic, psychographic, and behavioral data.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Make sure to add the environment variables in your Vercel project settings.
