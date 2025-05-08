import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';

// Import ICP Governance canister actor utilities and types
import { Actor, HttpAgent, type ActorSubclass } from '@dfinity/agent';
import type {
  _SERVICE as GovernanceService,
  ListProposalInfoResponse,
  ProposalInfo,
  ListProposalInfo
} from './governance/governance.did.js';
import { idlFactory } from './governance/governance.did.js';

// Governance canister ID
const GOVERNANCE_CANISTER_ID = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

/**
 * Create an authenticated actor for the NNS Governance canister
 */
async function createGovernanceActor(): Promise<ActorSubclass<GovernanceService>> {
  const agent = await HttpAgent.create({ host: 'https://ic0.app' });
  return Actor.createActor<GovernanceService>(idlFactory, {
    agent,
    canisterId: GOVERNANCE_CANISTER_ID,
  });
}

/**
 * Fetch a list of proposals from the NNS Governance canister
 */
async function fetchProposals(
  limit: number = 10
): Promise<ListProposalInfoResponse> {
  const governance = await createGovernanceActor();
  // Build the request with correct types
  const request: ListProposalInfo = {
    include_reward_status: [],               // Vec<Int32>
    exclude_topic: [],                       // Vec<Int32>
    include_status: [],                      // Vec<Int32>
    omit_large_fields: [],                   // Opt<Bool>
    before_proposal: [],                     // Opt<ProposalId>
    include_all_manage_neuron_proposals: [], // Opt<Bool>
    limit: limit,                            // Nat32 as number
  };
  return governance.list_proposals(request);
}

/**
 * Fetch detailed info for a specific proposal
 */
async function fetchProposalInfo(
  proposalId: bigint
): Promise<[] | [ProposalInfo]> {
  const governance = await createGovernanceActor();
  return governance.get_proposal_info(proposalId);
}

/**
 * Provider handling `!proposals [limit]` commands
 */
const governanceProvider: Provider = {
  name: 'GOVERNANCE_PROVIDER',
  description: 'Fetch NNS Governance proposals via !proposals command',
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const match = message.content.text.match(/^!proposals(?:\s+(\d+))?$/i);
    const limit = match && match[1] ? parseInt(match[1], 10) : 10;
    const response = await fetchProposals(limit);
    const content: Content[] = [];

    for (const p of response.proposal_info) {
      const id = p.id[0].id.toString();
      const title = p.proposal[0].title[0];
      content.push({ type: 'text', text: `#${id} ${title}` });
    }

    return { text: '', values: {}, data: { content } };
  },
};

/**
 * Defines the configuration schema for a plugin, including the validation rules for the plugin name.
 *
 * @type {import('zod').ZodObject<{ EXAMPLE_PLUGIN_VARIABLE: import('zod').ZodString }>}
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        logger.warn('Example plugin variable is not provided (this is expected)');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Action representing a hello world message.
 * @typedef {Object} Action
 * @property {string} name - The name of the action.
 * @property {string[]} similes - An array of related actions.
 * @property {string} description - A brief description of the action.
 * @property {Function} validate - Asynchronous function to validate the action.
 * @property {Function} handler - Asynchronous function to handle the action and generate a response.
 * @property {Object[]} examples - An array of example inputs and expected outputs for the action.
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ) => {
    try {
      logger.info('Handling HELLO_WORLD action');

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      return responseContent;
    } catch (error) {
      logger.error('Error in HELLO_WORLD action:', error);
      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`*** Starting starter service - MODIFIED: ${new Date().toISOString()} ***`);
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** TESTING DEV MODE - STOP MESSAGE CHANGED! ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** THIRD CHANGE - TESTING FILE WATCHING! ***');
  }
}

export const starterPlugin: Plugin = {
  name: 'plugin-icp-nns',
  description: 'Plugin starter for elizaOS',
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** TESTING DEV MODE - PLUGIN MODIFIED AND RELOADED! ***');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  tests: [
    {
      name: 'plugin_starter_test_suite',
      tests: [
        {
          name: 'should_have_governance_provider',
          fn: async () => {
            if (!starterPlugin.providers.some(p => p.name === 'GOVERNANCE_PROVIDER')) {
              throw new Error('Governance provider not found in plugin providers');
            }
          },
        },
        {
          name: 'governance_provider_returns_content',
          fn: async () => {
            const provider = starterPlugin.providers.find(p => p.name === 'GOVERNANCE_PROVIDER');
            if (!provider) throw new Error('Governance provider not found');
            // Simulate a message with limit=1
            const message = { content: { text: '!proposals 1', source: 'test' } } as Memory;
            const result = await provider.get(null as any, message, null as any);
            const contentArray = (result.data as { content: Content[] }).content;
            if (!contentArray || contentArray.length === 0) throw new Error('Governance provider returned empty content');
          },
        },
        {
          name: 'example_test',
          fn: async (runtime) => {
            logger.debug('example_test run by ', runtime.character.name);
            // Add a proper assertion that will pass
            if (runtime.character.name !== 'Eliza') {
              throw new Error(
                `Expected character name to be "Eliza" but got "${runtime.character.name}"`
              );
            }
            // Verify the plugin is loaded properly
            const service = runtime.getService('starter');
            if (!service) {
              throw new Error('Starter service not found');
            }
            // Don't return anything to match the void return type
          },
        },
        {
          name: 'should_have_hello_world_action',
          fn: async (runtime) => {
            // Check if the hello world action is registered
            // Look for the action in our plugin's actions
            // The actual action name in this plugin is "helloWorld", not "hello"
            const actionExists = starterPlugin.actions.some((a) => a.name === 'HELLO_WORLD');
            if (!actionExists) {
              throw new Error('Hello world action not found in plugin');
            }
          },
        },
      ],
    },
  ],
  routes: [
    {
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.debug('WORLD_CONNECTED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.debug('WORLD_JOINED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
  },
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider, governanceProvider],
};

export default starterPlugin;