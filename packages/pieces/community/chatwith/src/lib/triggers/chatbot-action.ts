
import { chatwithAuth } from '../../index';
import { createTrigger, Property, TriggerStrategy } from '@activepieces/pieces-framework';

const markdown = `
- Go to your Chatwith dashboard.
- Select the chatbot that should use this trigger.
- Click on "Actions" section.
- Find "Webhooks" item and click on "Install".
- In the Webhook settings, paste this URL: 
  \`{{webhookUrl}}\`
- Define the payload, usage description and click on "Save Webhook".
`;

export const chatbotAction = createTrigger({
    // auth: check https://www.activepieces.com/docs/developers/piece-reference/authentication,
    auth: chatwithAuth,
    name: 'chatbotAction',
    displayName: 'Chatbot Action',
    description: 'Triggered when your chatbot decides to perform a task and call a previously defined Action',
    props: {
        md: Property.MarkDown({
            value: markdown,
        }),
    },
    sampleData: {
      action_id: 'add_contact',
      payload: {
        name: 'John',
        email: 'john@wick.com'
      }
    },
    type: TriggerStrategy.WEBHOOK,
    async onEnable(){
        // empty
    },
    async onDisable(){
        // empty
    },
    async run(context) {
        return [context.payload];
      },
    async test(context) {
       return [context.payload];
    },
})