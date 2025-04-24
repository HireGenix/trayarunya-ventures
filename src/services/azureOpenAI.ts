/**
 * Azure OpenAI Service
 * This service handles communication with Azure OpenAI API for generating content
 */

// Azure OpenAI API configuration
const AZURE_OPENAI_ENDPOINT = process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_API_KEY = process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_API_VERSION = process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1';
const AZURE_OPENAI_MODEL_ID = 'azureml://registries/azure-openai/models/gpt-4.1/versions/2025-04-14';

interface GenerateICPParams {
  industry: string;
  companySize: string;
  targetMarket: string;
  productType: string;
  businessGoals: string;
  competitorInfo: string;
}

interface ICPResponse {
  demographic: {
    age: string;
    gender: string;
    income: string;
    education: string;
    occupation: string;
    location: string;
    jobTitle: string;
    industryExperience: string;
    companySize: string;
    familyStatus: string;
  };
  psychographic: {
    values: string[];
    interests: string[];
    painPoints: string[];
    goals: string[];
    motivations: string[];
    fears: string[];
    aspirations: string[];
    personalityTraits: string[];
  };
  behavioral: {
    purchaseProcess: string;
    brandInteractions: string;
    contentPreferences: string;
    decisionFactors: string[];
    buyingFrequency: string;
    preferredChannels: string[];
    researchMethods: string[];
    influencers: string[];
    budgetConsiderations: string;
    loyaltyFactors: string[];
  };
  technographic: {
    deviceUsage: string[];
    softwarePlatforms: string[];
    techAdoptionStage: string;
    socialMediaUsage: string[];
    onlineActivityLevel: string;
  };
}

/**
 * Generate an Ideal Customer Profile (ICP) using Azure OpenAI
 * @param params Parameters for ICP generation
 * @returns Generated ICP data
 */
export const generateICP = async (params: GenerateICPParams): Promise<ICPResponse> => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI credentials not configured. Please check your environment variables.');
  }

  const prompt = `
    Generate a detailed Ideal Customer Profile (ICP) for a business with the following characteristics:
    
    Industry: ${params.industry}
    Company Size: ${params.companySize}
    Target Market: ${params.targetMarket}
    Product/Service Type: ${params.productType}
    Business Goals: ${params.businessGoals}
    Competitor Information: ${params.competitorInfo}
    
    Please provide a comprehensive ICP with the following sections:
    
    1. Demographic Profile (age range, gender, income level, education, occupation, location, job title, industry experience, company size, family status)
    2. Psychographic Profile (values, interests, pain points, goals, motivations, fears, aspirations, personality traits)
    3. Behavioral Profile (purchase process, brand interactions, content preferences, decision factors, buying frequency, preferred channels, research methods, influencers, budget considerations, loyalty factors)
    4. Technographic Profile (device usage, software platforms, tech adoption stage, social media usage, online activity level)
    
    Format the response as a structured JSON object with exactly this structure:
    
    {
      "demographic": {
        "age": "string",
        "gender": "string",
        "income": "string",
        "education": "string",
        "occupation": "string",
        "location": "string",
        "jobTitle": "string",
        "industryExperience": "string",
        "companySize": "string",
        "familyStatus": "string"
      },
      "psychographic": {
        "values": ["string", "string", ...],
        "interests": ["string", "string", ...],
        "painPoints": ["string", "string", ...],
        "goals": ["string", "string", ...],
        "motivations": ["string", "string", ...],
        "fears": ["string", "string", ...],
        "aspirations": ["string", "string", ...],
        "personalityTraits": ["string", "string", ...]
      },
      "behavioral": {
        "purchaseProcess": "string",
        "brandInteractions": "string",
        "contentPreferences": "string",
        "decisionFactors": ["string", "string", ...],
        "buyingFrequency": "string",
        "preferredChannels": ["string", "string", ...],
        "researchMethods": ["string", "string", ...],
        "influencers": ["string", "string", ...],
        "budgetConsiderations": "string",
        "loyaltyFactors": ["string", "string", ...]
      },
      "technographic": {
        "deviceUsage": ["string", "string", ...],
        "softwarePlatforms": ["string", "string", ...],
        "techAdoptionStage": "string",
        "socialMediaUsage": ["string", "string", ...],
        "onlineActivityLevel": "string"
      }
    }
    
    Ensure all fields are present in your response, even if you need to use placeholder values.
  `;

  const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI assistant that specializes in creating detailed Ideal Customer Profiles for businesses. You provide structured, actionable insights based on business information. Always return your response in the exact JSON structure requested, with all fields present, even if you need to use placeholder values. Never deviate from the requested structure.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_format: { type: 'json_object' },
      model: AZURE_OPENAI_MODEL_ID
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Azure OpenAI API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorMessage;
    } catch (e) {
      // If parsing fails, use the raw error text
      errorMessage += ` - ${errorText}`;
    }
    
    console.error('Azure OpenAI API error:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response format from Azure OpenAI API');
  }
  
  const content = data.choices[0].message.content;
  console.log('Raw API response content:', content);
  
  try {
    // Parse the JSON response
    const icpData = JSON.parse(content);
    console.log('Parsed ICP data:', icpData);
    
    // Create a default structure to ensure all required fields exist
    const defaultICP: ICPResponse = {
      demographic: {
        age: 'Not specified',
        gender: 'Not specified',
        income: 'Not specified',
        education: 'Not specified',
        occupation: 'Not specified',
        location: 'Not specified',
        jobTitle: 'Not specified',
        industryExperience: 'Not specified',
        companySize: 'Not specified',
        familyStatus: 'Not specified'
      },
      psychographic: {
        values: [],
        interests: [],
        painPoints: [],
        goals: [],
        motivations: [],
        fears: [],
        aspirations: [],
        personalityTraits: []
      },
      behavioral: {
        purchaseProcess: 'Not specified',
        brandInteractions: 'Not specified',
        contentPreferences: 'Not specified',
        decisionFactors: [],
        buyingFrequency: 'Not specified',
        preferredChannels: [],
        researchMethods: [],
        influencers: [],
        budgetConsiderations: 'Not specified',
        loyaltyFactors: []
      },
      technographic: {
        deviceUsage: [],
        softwarePlatforms: [],
        techAdoptionStage: 'Not specified',
        socialMediaUsage: [],
        onlineActivityLevel: 'Not specified'
      }
    };
    
    // Merge the API response with the default structure
    const mergedICP: ICPResponse = {
      demographic: {
        ...defaultICP.demographic,
        ...(icpData.demographic || {}),
      },
      psychographic: {
        ...defaultICP.psychographic,
        ...(icpData.psychographic || {}),
        values: icpData.psychographic?.values || defaultICP.psychographic.values,
        interests: icpData.psychographic?.interests || defaultICP.psychographic.interests,
        painPoints: icpData.psychographic?.painPoints || defaultICP.psychographic.painPoints,
        goals: icpData.psychographic?.goals || defaultICP.psychographic.goals,
        motivations: icpData.psychographic?.motivations || defaultICP.psychographic.motivations,
        fears: icpData.psychographic?.fears || defaultICP.psychographic.fears,
        aspirations: icpData.psychographic?.aspirations || defaultICP.psychographic.aspirations,
        personalityTraits: icpData.psychographic?.personalityTraits || defaultICP.psychographic.personalityTraits,
      },
      behavioral: {
        ...defaultICP.behavioral,
        ...(icpData.behavioral || {}),
        decisionFactors: icpData.behavioral?.decisionFactors || defaultICP.behavioral.decisionFactors,
        preferredChannels: icpData.behavioral?.preferredChannels || defaultICP.behavioral.preferredChannels,
        researchMethods: icpData.behavioral?.researchMethods || defaultICP.behavioral.researchMethods,
        influencers: icpData.behavioral?.influencers || defaultICP.behavioral.influencers,
        loyaltyFactors: icpData.behavioral?.loyaltyFactors || defaultICP.behavioral.loyaltyFactors,
      },
      technographic: {
        ...defaultICP.technographic,
        ...(icpData.technographic || {}),
        deviceUsage: icpData.technographic?.deviceUsage || defaultICP.technographic.deviceUsage,
        softwarePlatforms: icpData.technographic?.softwarePlatforms || defaultICP.technographic.softwarePlatforms,
        socialMediaUsage: icpData.technographic?.socialMediaUsage || defaultICP.technographic.socialMediaUsage,
      },
    };
    
    console.log('Processed ICP data:', mergedICP);
    return mergedICP;
  } catch (error) {
    console.error('Error parsing ICP data:', error);
    throw new Error('Failed to parse ICP data from API response. Please check the console for details.');
  }
};
