import { chatwithAuth } from '../../index';
import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod, httpClient } from '@activepieces/pieces-common';

export const askChatbot = createAction({
  auth: chatwithAuth,
  name: 'askChatbot',
  displayName: 'Ask Chatbot',
  description: 'Send a query to your chatbot in Chatwith and receive the chatbot’s response',
  props: {
    chatbot_id: Property.ShortText({
      displayName: 'Chatbot ID',
      description: 'Can be found in the dashboard',
      required: true,
    }),
    message: Property.ShortText({
      displayName: 'Message',
      description: 'Message to send the chatbot',
      required: true,
    }),
    conv_id: Property.ShortText({
      displayName: 'Conversation ID',
      description: 'If provided, must be UUID4',
      required: false,
    }),
    stream: Property.Checkbox({
      displayName: 'Stream',
      required: false,
      defaultValue: false
    }),
  },
  async run({ auth, propsValue }) {
    const { chatbot_id, message, conv_id, stream } = propsValue;
    
    const response = await httpClient.sendRequest({
      url: `https://api.chatwith.tools/v1/chatbot/${chatbot_id}/chat`,
      method: HttpMethod.POST,
      headers: {
        Authorization: `Bearer ${auth}`
      },
      body: conv_id === undefined ? {
        message: message,
        stream: stream
      } : {
        message: message,
        conversationId: conv_id,
        stream: stream
      },
    });
    return response.body;
  },
});
