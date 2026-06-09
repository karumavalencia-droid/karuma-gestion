export type ReviewLanguage = "es" | "en" | "zh";

export type ReviewCategory =
  | "5星好评"
  | "4星好评"
  | "3星中评"
  | "1-2星差评"
  | "无文字评论";

export function detectLanguage(text: string): ReviewLanguage {
  const t = text.trim();
  if (!t) return "es";
  if (/[\u4e00-\u9fff]/.test(t)) return "zh";
  if (/[áéíóúñü¿¡]/i.test(t) || /\b(muy|gracias|comida|servicio|pedido|local)\b/i.test(t)) {
    return "es";
  }
  return "en";
}

export function getCategory(rating: number, content: string): ReviewCategory {
  if (!content.trim()) return "无文字评论";
  if (rating >= 5) return "5星好评";
  if (rating === 4) return "4星好评";
  if (rating === 3) return "3星中评";
  return "1-2星差评";
}

const REPLY_TEMPLATES: Record<ReviewCategory, Record<ReviewLanguage, string>> = {
  "5星好评": {
    es: "¡Muchas gracias por su visita y por compartir su experiencia! Nos alegra saber que disfrutó de Karuma Sushi & Grill. Le esperamos de nuevo muy pronto.",
    en: "Thank you so much for visiting and sharing your experience! We're delighted you enjoyed Karuma Sushi & Grill. We hope to see you again soon.",
    zh: "非常感谢您的光临和好评！很高兴您喜欢 Karuma 寿司烧烤。期待您再次光临！",
  },
  "4星好评": {
    es: "Muchas gracias por su valoración y por elegir Karuma. Nos alegra que haya disfrutado de la experiencia y seguiremos trabajando para mejorar cada detalle.",
    en: "Thank you for your rating and for choosing Karuma. We're glad you enjoyed your visit and we'll keep working to improve every detail.",
    zh: "感谢您的评价和光临！我们很高兴您享受这次用餐，并将继续努力改进每一个细节。",
  },
  "3星中评": {
    es: "Gracias por su comentario y por darnos la oportunidad de mejorar. ¿Podría indicarnos qué aspecto podemos mejorar para ofrecerle una mejor experiencia la próxima vez?",
    en: "Thank you for your feedback and for giving us the chance to improve. Could you let us know what we can do better for your next visit?",
    zh: "感谢您的反馈。请问有哪些方面我们可以改进，以便您下次能有更好的体验？",
  },
  "1-2星差评": {
    es: "Lamentamos sinceramente que su experiencia no haya sido la esperada. Pedimos disculpas y nos gustaría resolverlo personalmente. Por favor, contáctenos en el restaurante o por email a manager@karuma.es para que podamos atenderle.",
    en: "We're truly sorry your experience did not meet expectations. Please accept our apologies — we'd like to resolve this personally. Contact us at the restaurant or at manager@karuma.es so we can help.",
    zh: "非常抱歉未能让您满意。我们诚恳地向您道歉，希望能亲自为您解决问题。请致电门店或发送邮件至 manager@karuma.es 与我们联系。",
  },
  无文字评论: {
    es: "¡Muchas gracias por su valoración de 5 estrellas! Nos encanta saber que disfrutó de Karuma.",
    en: "Thank you so much for your 5-star rating! We're glad you enjoyed Karuma.",
    zh: "非常感谢您的五星好评！很高兴您喜欢 Karuma。",
  },
};

export function generateAiReply(rating: number, content: string): string {
  const language = detectLanguage(content);
  const category = getCategory(rating, content);
  return REPLY_TEMPLATES[category][language];
}

export function isBadReview(rating: number): boolean {
  return rating <= 2;
}
