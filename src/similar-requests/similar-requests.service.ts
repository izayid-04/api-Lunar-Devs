import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitizenMessage } from '../messages/entities/citizen-message.entity.js';

export interface SimilarMessageItem {
  id: number;
  reference: string | null;
  subject: string;
  body: string;
  category: string | null;
  district: string | null;
  status: string;
  createdAt: Date;
  similarityScore: number;
}

export interface SimilarRequestsResponse {
  targetMessage: {
    id: number;
    reference: string | null;
    subject: string;
    body: string;
    category: string | null;
    district: string | null;
  };
  similarMessages: SimilarMessageItem[];
  explanation: string;
  aiEnhanced: boolean;
}


@Injectable()
export class SimilarRequestsService {
  private readonly logger = new Logger(SimilarRequestsService.name);

  constructor(
    @InjectRepository(CitizenMessage)
    private readonly messageRepository: Repository<CitizenMessage>,
  ) {}

  async findSimilar(messageId: number): Promise<SimilarRequestsResponse> {
    const target = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!target) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Query candidates: same category and/or same district, excluding self
    const qb = this.messageRepository
      .createQueryBuilder('msg')
      .where('msg.id != :id', { id: messageId });

    if (target.category && target.district) {
      qb.andWhere(
        '(msg.category = :category OR msg.district = :district)',
        { category: target.category, district: target.district },
      );
    } else if (target.category) {
      qb.andWhere('msg.category = :category', { category: target.category });
    } else if (target.district) {
      qb.andWhere('msg.district = :district', { district: target.district });
    }

    // Order by most recent candidates, limit to 20
    const candidates = await qb.orderBy('msg.createdAt', 'DESC').take(20).getMany();

    const targetText = `${target.subject} ${target.body}`.toLowerCase();
    const targetTokens = this.tokenize(targetText);

    // Compute basic text similarity (Jaccard token similarity + bonus for same category/district)
    const scoredCandidates = candidates.map((cand) => {
      const candText = `${cand.subject} ${cand.body}`.toLowerCase();
      const candTokens = this.tokenize(candText);
      let score = this.calculateJaccardSimilarity(targetTokens, candTokens);

      if (cand.category && target.category && cand.category === target.category) {
        score += 0.2;
      }
      if (cand.district && target.district && cand.district === target.district) {
        score += 0.2;
      }

      // Bound score between 0 and 1
      score = Math.min(1, Math.max(0, Number(score.toFixed(2))));

      return {
        id: cand.id,
        reference: cand.reference,
        subject: cand.subject,
        body: cand.body,
        category: cand.category,
        district: cand.district,
        status: cand.status,
        createdAt: cand.createdAt,
        similarityScore: score,
      };
    });

    // Sort by score descending and take top 5
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);
    const topCandidates = scoredCandidates.slice(0, 5);

    // Check if QWEN_API_KEY is available to refine
    const apiKey = process.env.QWEN_API_KEY;
    if (apiKey && topCandidates.length > 0) {
      try {
        const aiResult = await this.refineWithQwen(apiKey, target, topCandidates);
        return {
          targetMessage: {
            id: target.id,
            reference: target.reference,
            subject: target.subject,
            body: target.body,
            category: target.category,
            district: target.district,
          },
          similarMessages: aiResult.similarMessages,
          explanation: aiResult.explanation,
          aiEnhanced: true,
        };
      } catch (err) {
        this.logger.warn('Qwen refinement failed, falling back to basic similarity:', err);
      }
    }

    // Clean fallback without AI
    const count = topCandidates.length;
    let fallbackExplanation = `Analyse basée sur la proximité textuelle, le quartier (${target.district ?? 'tous'}) et la catégorie (${target.category ?? 'toutes'}). `;
    if (count === 0) {
      fallbackExplanation += 'Aucune demande similaire récente trouvée.';
    } else {
      fallbackExplanation += `${count} demande(s) connexe(s) identifiée(s) présentant des mots-clés et contextes communs.`;
    }

    return {
      targetMessage: {
        id: target.id,
        reference: target.reference,
        subject: target.subject,
        body: target.body,
        category: target.category,
        district: target.district,
      },
      similarMessages: topCandidates,
      explanation: fallbackExplanation,
      aiEnhanced: false,
    };
  }

  private tokenize(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return new Set(words);
  }

  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const elem of setA) {
      if (setB.has(elem)) {
        intersection++;
      }
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private async refineWithQwen(
    apiKey: string,
    target: CitizenMessage,
    candidates: SimilarMessageItem[],
  ): Promise<{ similarMessages: SimilarMessageItem[]; explanation: string }> {
    const baseUrl = (
      process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/+$/, '');
    const model = process.env.QWEN_MODEL ?? 'qwen-turbo';

    const systemPrompt = `Tu es l'assistant d'analyse municipale de Nova Terra.
Ta mission est de comparer une demande citoyenne avec une liste de demandes candidates et de déterminer lesquelles sont réellement similaires (même incident, problème récurrent, cause commune).
Réponds EXCLUSIVEMENT au format JSON avec les clés suivantes :
- "selectedIds": un tableau des IDs des demandes véritablement similaires classées par pertinence
- "explanation": une synthèse explicative courte (2 à 3 phrases) expliquant le lien de similarité entre les demandes et les causes partagées.`;

    const userPrompt = `Demande cible:
ID: ${target.id}
Titre: ${target.subject}
Description: ${target.body}
Quartier: ${target.district ?? 'Non précisé'}
Catégorie: ${target.category ?? 'Non précisé'}

Demandes candidates:
${candidates
  .map(
    (c) =>
      `- ID: ${c.id} | Titre: ${c.subject} | Description: ${c.body} | Quartier: ${c.district} | Catégorie: ${c.category}`,
  )
  .join('\n')}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

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
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI status ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty AI response');

      const parsed = JSON.parse(content) as {
        selectedIds?: number[];
        explanation?: string;
      };

      let filtered = candidates;
      if (Array.isArray(parsed.selectedIds) && parsed.selectedIds.length > 0) {
        const idMap = new Map(candidates.map((c) => [c.id, c]));
        const aiSorted: SimilarMessageItem[] = [];
        for (const id of parsed.selectedIds) {
          const item = idMap.get(id);
          if (item) aiSorted.push(item);
        }
        if (aiSorted.length > 0) {
          filtered = aiSorted;
        }
      }

      return {
        similarMessages: filtered,
        explanation: parsed.explanation || 'Demandes similaires confirmées par analyse IA.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
