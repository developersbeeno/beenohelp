import type { Locale } from "./config";

export type Strings = typeof STRINGS.pt;

export const STRINGS = {
  pt: {
    nav: {
      home: "Início",
      assistant: "Assistente IA",
      apiDocs: "API Docs",
      platform: "Acessar plataforma",
      support: "Falar com suporte",
      enableDark: "Ativar modo escuro",
      enableLight: "Ativar modo claro",
      toggleTheme: "Alternar tema",
      menu: "Menu",
      language: "Idioma",
    },
    footer: {
      rights: "© 2025 Beeno by Skeps. Todos os direitos reservados.",
    },
    notFound: {
      message: "Página não encontrada.",
      backHome: "Voltar ao início",
    },
    errorPage: {
      title: "Algo deu errado",
      retry: "Tentar novamente",
    },
    home: {
      heroTitle: "Como podemos ajudar?",
      heroSubtitle: "Explore a documentação do Beeno CRM ou converse com nosso assistente de IA",
      searchPlaceholder: "Buscar artigos, endpoints, integrações...",
      resultsFor: (count: number, query: string) =>
        `${count} resultado${count !== 1 ? "s" : ""} para "${query}"`,
      reference: "Referência",
      exploreByTopic: "Explore por tópico",
      back: "Voltar",
    },
    chat: {
      brand: "Beeno",
      onlineHelp: "Online — assistente de ajuda",
      online: "Online",
      close: "Fechar chat",
      placeholder: "Escreva sua pergunta...",
      recordAudio: "Gravar áudio",
      stopRecording: "Parar gravação",
      recording: "Gravando...",
      send: "Enviar",
      openAssistant: "Abrir assistente Beeno",
      voiceMessage: "🎤 Mensagem de voz",
      networkError: "Erro de rede. Tente novamente.",
      genericError: "Erro ao consultar o assistente.",
      micError:
        "Não foi possível acessar o microfone. Por favor, verifique as permissões ou digite sua pergunta.",
      welcomeDrawer:
        "Olá! Eu sou o **Beeno**. Posso te ajudar com dúvidas sobre o CRM, integrações e automações. Como posso ajudar?\n\nSe precisar de suporte humano, clique em **Falar com suporte** no topo da página.",
      welcomeAssistant:
        "Olá! Eu sou o **Beeno**. Posso te ajudar com dúvidas sobre o CRM, integrações e automações. Como posso ajudar?",
      quick: [
        "Como criar um contato?",
        "Como funciona a distribuição de leads?",
        "Como configurar uma automação?",
        "Como criar um filtro de busca?",
      ],
      rateLimitError: "Limite de requisições atingido. Tente novamente em alguns instantes.",
      creditsError: "Créditos de IA esgotados. Entre em contato com o administrador.",
    },
  },
  en: {
    nav: {
      home: "Home",
      assistant: "AI Assistant",
      apiDocs: "API Docs",
      platform: "Go to platform",
      support: "Contact support",
      enableDark: "Enable dark mode",
      enableLight: "Enable light mode",
      toggleTheme: "Toggle theme",
      menu: "Menu",
      language: "Language",
    },
    footer: {
      rights: "© 2025 Beeno by Skeps. All rights reserved.",
    },
    notFound: {
      message: "Page not found.",
      backHome: "Back to home",
    },
    errorPage: {
      title: "Something went wrong",
      retry: "Try again",
    },
    home: {
      heroTitle: "How can we help?",
      heroSubtitle: "Explore the Beeno CRM documentation or chat with our AI assistant",
      searchPlaceholder: "Search articles, endpoints, integrations...",
      resultsFor: (count: number, query: string) =>
        `${count} result${count !== 1 ? "s" : ""} for "${query}"`,
      reference: "Reference",
      exploreByTopic: "Explore by topic",
      back: "Back",
    },
    chat: {
      brand: "Beeno",
      onlineHelp: "Online — help assistant",
      online: "Online",
      close: "Close chat",
      placeholder: "Type your question...",
      recordAudio: "Record audio",
      stopRecording: "Stop recording",
      recording: "Recording...",
      send: "Send",
      openAssistant: "Open Beeno assistant",
      voiceMessage: "🎤 Voice message",
      networkError: "Network error. Please try again.",
      genericError: "Error contacting the assistant.",
      micError:
        "Couldn't access the microphone. Please check your permissions or type your question instead.",
      welcomeDrawer:
        "Hi! I'm **Beeno**. I can help with questions about the CRM, integrations, and automations. How can I help?\n\nIf you need human support, click **Contact support** at the top of the page.",
      welcomeAssistant:
        "Hi! I'm **Beeno**. I can help with questions about the CRM, integrations, and automations. How can I help?",
      quick: [
        "How do I create a contact?",
        "How does lead distribution work?",
        "How do I set up an automation?",
        "How do I create a search filter?",
      ],
      rateLimitError: "Request limit reached. Please try again in a moment.",
      creditsError: "AI credits exhausted. Please contact your administrator.",
    },
  },
  es: {
    nav: {
      home: "Inicio",
      assistant: "Asistente IA",
      apiDocs: "API Docs",
      platform: "Acceder a la plataforma",
      support: "Hablar con soporte",
      enableDark: "Activar modo oscuro",
      enableLight: "Activar modo claro",
      toggleTheme: "Cambiar tema",
      menu: "Menú",
      language: "Idioma",
    },
    footer: {
      rights: "© 2025 Beeno by Skeps. Todos los derechos reservados.",
    },
    notFound: {
      message: "Página no encontrada.",
      backHome: "Volver al inicio",
    },
    errorPage: {
      title: "Algo salió mal",
      retry: "Intentar de nuevo",
    },
    home: {
      heroTitle: "¿Cómo podemos ayudarte?",
      heroSubtitle: "Explora la documentación del Beeno CRM o conversa con nuestro asistente de IA",
      searchPlaceholder: "Buscar artículos, endpoints, integraciones...",
      resultsFor: (count: number, query: string) =>
        `${count} resultado${count !== 1 ? "s" : ""} para "${query}"`,
      reference: "Referencia",
      exploreByTopic: "Explora por tema",
      back: "Volver",
    },
    chat: {
      brand: "Beeno",
      onlineHelp: "En línea — asistente de ayuda",
      online: "En línea",
      close: "Cerrar chat",
      placeholder: "Escribe tu pregunta...",
      recordAudio: "Grabar audio",
      stopRecording: "Detener grabación",
      recording: "Grabando...",
      send: "Enviar",
      openAssistant: "Abrir asistente Beeno",
      voiceMessage: "🎤 Mensaje de voz",
      networkError: "Error de red. Inténtalo de nuevo.",
      genericError: "Error al consultar al asistente.",
      micError:
        "No se pudo acceder al micrófono. Verifica los permisos o escribe tu pregunta.",
      welcomeDrawer:
        "¡Hola! Soy **Beeno**. Puedo ayudarte con dudas sobre el CRM, integraciones y automatizaciones. ¿Cómo puedo ayudarte?\n\nSi necesitas soporte humano, haz clic en **Hablar con soporte** en la parte superior de la página.",
      welcomeAssistant:
        "¡Hola! Soy **Beeno**. Puedo ayudarte con dudas sobre el CRM, integraciones y automatizaciones. ¿Cómo puedo ayudarte?",
      quick: [
        "¿Cómo creo un contacto?",
        "¿Cómo funciona la distribución de leads?",
        "¿Cómo configuro una automatización?",
        "¿Cómo creo un filtro de búsqueda?",
      ],
      rateLimitError: "Límite de solicitudes alcanzado. Inténtalo de nuevo en unos instantes.",
      creditsError: "Créditos de IA agotados. Contacta a tu administrador.",
    },
  },
} satisfies Record<Locale, unknown>;

export function useStrings(locale: Locale): Strings {
  return STRINGS[locale];
}
