import { createPiece, PieceAuth } from "@activepieces/pieces-framework";
import { askChatbot } from "./lib/actions/ask-chatbot";
import { chatbotAction } from "./lib/triggers/chatbot-action";

export const chatwithAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: "Go to 'Account' in your Chatwith dashboard.\n \nScroll down to 'Your API Key' section and copy the API Key.",
});

export const chatwith = createPiece({
  displayName: "Chatwith",
  auth: chatwithAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: "https://chatwith.tools/assets/icon.svg",
  authors: [],
  actions: [askChatbot],
  triggers: [chatbotAction],
});