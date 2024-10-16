"use server"
import { model } from "@/lib/utils";
import { demographicsPayload } from "@/lib/validators/demographicsSchema";
import { lifestylePayload } from "@/lib/validators/lifestyleSchema";
import { UserMedicalHistory } from "@/store/user-health-store";

// Define interfaces for the health analysis structure
interface HealthAnalysis {
  healthScore: {
    score: number;
    interpretation: {
      rating: number;
      message: string;
    };
    bmiAssessment: {
      bmiValue: number;
      category: string;
      healthImplications: string;
    };
  };
  potentialConditions: Array<{
    name: string;
    probability: number;
    severity: 'low' | 'medium' | 'high';
    medicalAttention: 'monitoring' | 'consult' | 'immediate';
    detailedAnalysis: string;
    recommendedTests: string[];
  }>;
  lifestyleModifications: Array<{
    activity: string;
    impactFactor: number;
    targetConditions: string[];
    implementationPlan: {
      frequency: string;
      duration: string;
      intensity: string;
      precautions: string[];
    };
  }>;
  nutritionalRecommendations: Array<{
    food: string;
    benefits: string;
    targetSymptoms: string[];
    servingGuidelines: {
      amount: string;
      frequency: string;
      bestTimeToConsume: string;
      preparations: string[];
    };
  }>;
  healthSummary: {
    overallAssessment: string;
    urgentConcerns: string[];
    shortTermActions: string[];
    longTermStrategy: string;
    followUpRecommendations: string;
  };
}

export interface GenerateContentResponse {
  success: boolean;
  analysis?: HealthAnalysis;
  error?: string;
}

function createContentGenerationError(message: string): Error {
  return Object.assign(new Error(message), { name: 'ContentGenerationError' });
}

function sanitizeHealthAnalysis(data: any): HealthAnalysis | null {
  try {
    // Validate health score
    if (!data.healthScore?.score || typeof data.healthScore.score !== 'number' || 
        data.healthScore.score < 0 || data.healthScore.score > 100) {
      throw new Error('Invalid health score');
    }

    // Validate potential conditions
    if (!Array.isArray(data.potentialConditions)) {
      throw new Error('Invalid potential conditions');
    }

    // Deep validation of each section
    const sanitizedData: HealthAnalysis = {
      healthScore: {
        score: data.healthScore.score,
        interpretation: {
          rating: Number(data.healthScore.interpretation.rating) || 0,
          message: String(data.healthScore.interpretation.message)
        },
        bmiAssessment: {
          bmiValue: Number(data.healthScore.bmiAssessment.bmiValue) || 0,
          category: String(data.healthScore.bmiAssessment.category),
          healthImplications: String(data.healthScore.bmiAssessment.healthImplications)
        }
      },
      potentialConditions: data.potentialConditions.map((condition: any) => ({
        name: String(condition.name),
        probability: Number(condition.probability) || 0,
        severity: validateSeverity(condition.severity),
        medicalAttention: validateMedicalAttention(condition.medicalAttention),
        detailedAnalysis: String(condition.detailedAnalysis),
        recommendedTests: Array.isArray(condition.recommendedTests) 
          ? condition.recommendedTests.map(String)
          : []
      })),
      lifestyleModifications: validateLifestyleModifications(data.lifestyleModifications),
      nutritionalRecommendations: validateNutritionalRecommendations(data.nutritionalRecommendations),
      healthSummary: validateHealthSummary(data.healthSummary)
    };

    return sanitizedData;
  } catch (error) {
    console.error('Sanitization error:', error);
    return null;
  }
}

function validateSeverity(severity: any): 'low' | 'medium' | 'high' {
  const validSeverities = ['low', 'medium', 'high'];
  return validSeverities.includes(severity) ? severity : 'medium';
}

function validateMedicalAttention(attention: any): 'monitoring' | 'consult' | 'immediate' {
  const validAttentions = ['monitoring', 'consult', 'immediate'];
  return validAttentions.includes(attention) ? attention : 'monitoring';
}

function validateLifestyleModifications(modifications: any[]): HealthAnalysis['lifestyleModifications'] {
  if (!Array.isArray(modifications)) return [];
  
  return modifications.map(mod => ({
    activity: String(mod.activity),
    impactFactor: Number(mod.impactFactor) || 0,
    targetConditions: Array.isArray(mod.targetConditions) 
      ? mod.targetConditions.map(String)
      : [],
    implementationPlan: {
      frequency: String(mod.implementationPlan?.frequency || ''),
      duration: String(mod.implementationPlan?.duration || ''),
      intensity: String(mod.implementationPlan?.intensity || ''),
      precautions: Array.isArray(mod.implementationPlan?.precautions)
        ? mod.implementationPlan.precautions.map(String)
        : []
    }
  }));
}

function validateNutritionalRecommendations(recommendations: any[]): HealthAnalysis['nutritionalRecommendations'] {
  if (!Array.isArray(recommendations)) return [];
  
  return recommendations.map(rec => ({
    food: String(rec.food),
    benefits: String(rec.benefits),
    targetSymptoms: Array.isArray(rec.targetSymptoms)
      ? rec.targetSymptoms.map(String)
      : [],
    servingGuidelines: {
      amount: String(rec.servingGuidelines?.amount || ''),
      frequency: String(rec.servingGuidelines?.frequency || ''),
      bestTimeToConsume: String(rec.servingGuidelines?.bestTimeToConsume || ''),
      preparations: Array.isArray(rec.servingGuidelines?.preparations)
        ? rec.servingGuidelines.preparations.map(String)
        : []
    }
  }));
}

function validateHealthSummary(summary: any): HealthAnalysis['healthSummary'] {
  return {
    overallAssessment: String(summary?.overallAssessment || ''),
    urgentConcerns: Array.isArray(summary?.urgentConcerns)
      ? summary.urgentConcerns.map(String)
      : [],
    shortTermActions: Array.isArray(summary?.shortTermActions)
      ? summary.shortTermActions.map(String)
      : [],
    longTermStrategy: String(summary?.longTermStrategy || ''),
    followUpRecommendations: String(summary?.followUpRecommendations || '')
  };
}

interface Props {
  medicalHistory : UserMedicalHistory | null
  personalData : demographicsPayload | null
  lifestyleFactors : lifestylePayload | null
}


export async function predictDiseaseWithAI(props : Props): Promise<GenerateContentResponse> {
  try {
    const prompt = `
  You are a medical analysis system that MUST ONLY respond with a valid JSON object. DO NOT include any explanations, comments, or additional text outside the JSON structure.

IMPORTANT RESPONSE RULES: 
- Return ONLY the JSON object
- DO NOT use markdown code blocks
- DO NOT add explanations before or after the JSON
- DO NOT include the word "json" or any other text
- ALL responses MUST be in Bahasa Indonesia
- Use Indonesian medical terms and descriptions
- Ensure all JSON values are properly formatted and enclosed in quotes when needed
- You MUST provide EXACTLY 3 items in potentialConditions array
- You MUST provide EXACTLY 3 items in lifestyleModifications array
- You MUST provide EXACTLY 6 items in nutritionalRecommendations array

Analyze this health data and return a single JSON object:

{
  ${props.medicalHistory},
  ${props.personalData}
  ${props.lifestyleFactors}
  
}

Required response structure (MUST FOLLOW EXACTLY):
{
  "healthScore": {
    "score": <number 0-100>,
    "interpretation": {
      "rating": <number 0-1>,
      "message": <string>
    },
    "bmiAssessment": {
      "bmiValue": <number>,
      "category": <string>,
      "healthImplications": <string>
    }
  },
  "potentialConditions": [
        // EXACTLY 3 ITEMS REQUIRED

    {
      "name": <string>,
      "probability": <number 0-1>,
      "severity": <"low" | "medium" | "high">,
      "medicalAttention": <"monitoring" | "consult" | "immediate">,
      "detailedAnalysis": <string>,
      "recommendedTests": [<string array>]
    }
  ],
  "lifestyleModifications": [
        // EXACTLY 3 ITEMS REQUIRED
    {
      "activity": <string>,
      "impactFactor": <number 0-1>,
      "targetConditions": [<string array>],
      "implementationPlan": {
        "frequency": <string>,
        "duration": <string>,
        "intensity": <string>,
        "precautions": [<string array>]
      }
    }
  ],
  "nutritionalRecommendations": [
        // EXACTLY 6 ITEMS REQUIRED

    {
      "food": <string>,
      "benefits": <string>,
      "targetSymptoms": [<string array>],
      "servingGuidelines": {
        "amount": <string>,
        "frequency": <string>,
        "bestTimeToConsume": <string>,
        "preparations": [<string array>]
      }
    }
  ],
  "healthSummary": {
    "overallAssessment": <string>,
    "urgentConcerns": [<string array>],
    "shortTermActions": [<string array>],
    "longTermStrategy": <string>,
    "followUpRecommendations": <string>
  }
}

STRICT REQUIREMENTS:
1. potentialConditions MUST contain EXACTLY 3 different conditions, ordered by probability (highest first)
2. lifestyleModifications MUST contain EXACTLY 3 different activities, ordered by impactFactor (highest first)
3. nutritionalRecommendations MUST contain EXACTLY 6 different food recommendations, ordered as follows:
   - First 2: High-protein foods for malnutrition
   - Next 2: Vitamin and mineral-rich foods for immune support
   - Last 2: Foods that help with symptom management
4. Include Indonesian context and locally available foods
5. Use Indonesian medical terminology and culturally appropriate recommendations
6. Consider local Indonesian healthcare access and resources
7. Base all predictions on provided symptoms and data
8. Ensure all number values are actual numbers, not strings
9. Arrays must be properly formatted with square brackets
10. All string values must be enclosed in double quotes
11. Severity levels must be exactly "low", "medium", or "high"
12. Medical attention levels must be exactly "monitoring", "consult", or "immediate"
`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let generatedText = response.text();
    // Clean up the response text to ensure it's valid JSON
    generatedText = generatedText.replace(/```json\s*|\s*```/g, '');
    generatedText = generatedText.trim();

    try {
      const jsonResult = JSON.parse(generatedText);      
      // Validate and sanitize the JSON structure
      const sanitizedResult = sanitizeHealthAnalysis(jsonResult);

      if (sanitizedResult) {
        return { success: true, analysis: sanitizedResult };
      } else {
        return { 
          success: false, 
          error: "Invalid health analysis data structure" 
        };
      }
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError);
      return { 
        success: false, 
        error: "Failed to parse health analysis response" 
      };
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return { 
      success: false, 
      error: "Failed to generate health analysis" 
    };
  }
}