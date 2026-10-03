import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AiRecommendationDto } from './dto/ai-recommendation.dto.js';

export interface AiRecommendationResult {
  situation: string;
  recommendations: string[];
  suggestedInstructions: string;
  model: string;
}

@Injectable()
export class AlertsAiService {
  private readonly logger = new Logger(AlertsAiService.name);

  async generateRecommendations(
    dto: AiRecommendationDto,
  ): Promise<AiRecommendationResult> {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('AI service not configured');
    }

    const baseUrl = (
      process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/+$/, '');
    const model = process.env.QWEN_MODEL ?? 'qwen-turbo';

    const systemPrompt = `Tu es l'assistant de gestion de crise municipale de la ville de Nova Terra.
Ta mission est d'aider les agents municipaux à formuler des consignes de sécurité claires, bienveillantes et concrètes adaptées aux personnes vulnérables (personnes âgées, à mobilité réduite, isolées, avec enfants en bas âge ou sous traitement médical) lors d'un incident ou d'une alerte municipale.
Réponds EXCLUSIVEMENT sous forme d'un objet JSON valide contenant :
- "recommendations": un tableau de 3 à 5 conseils d'action ciblés pour les personnes vulnérables (phrases claires et concrètes).
- "suggestedInstructions": un texte synthétique et structuré de consignes de sécurité prêt à être publié dans l'alerte municipale.`;

    const userPrompt = `Situation d'alerte : ${dto.situation}
${dto.district ? `Quartier concerné : ${dto.district}` : 'Quartier : Toute la ville'}
${dto.targetAudience ? `Public prioritaire : ${dto.targetAudience}` : 'Public : Personnes vulnérables'}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(
          `AI API error status=${response.status}: ${errorText.substring(0, 300)}`,
        );
        throw new BadGatewayException('AI provider returned an error');
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        throw new BadGatewayException('Empty response from AI provider');
      }

      let parsed: {
        recommendations?: string[];
        suggestedInstructions?: string;
      };

      try {
        parsed = JSON.parse(rawContent);
      } catch {
        // Fallback if not pure JSON
        parsed = {
          recommendations: [rawContent],
          suggestedInstructions: rawContent,
        };
      }

      return {
        situation: dto.situation,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [dto.situation],
        suggestedInstructions:
          typeof parsed.suggestedInstructions === 'string'
            ? parsed.suggestedInstructions
            : rawContent,
        model,
      };
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException || err instanceof BadGatewayException) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GatewayTimeoutException('AI request timed out');
      }
      this.logger.error('AI call failure:', err);
      throw new BadGatewayException('Failed to communicate with AI provider');
    } finally {
      clearTimeout(timeout);
    }
  }
}
