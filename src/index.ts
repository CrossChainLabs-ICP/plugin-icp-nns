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
import { Topic } from './topic.ts';
import { ProposalStatus } from './status.ts';

/**
 * Create an authenticated actor for the NNS Governance canister
 */
async function createGovernanceActor(): Promise<ActorSubclass<GovernanceService>> {
  const agent = await HttpAgent.create({ host: 'https://ic0.app' });
  return Actor.createActor<GovernanceService>(idlFactory, {
    agent,
    canisterId: process.env.GOVERNANCE_CANISTER_ID,
  });
}

/**
 * Fetch a list of proposals, optionally filtered by status
 */
async function fetchProposals(
  limit: number = 10,
  statusFilter?: number,
  topicFilter?: number,
): Promise<ListProposalInfoResponse> {
  const governance = await createGovernanceActor();

  let exclude_topic = [];

  if (topicFilter != undefined) {
    for (const [name, value] of Object.entries(Topic)) {
      const topic = parseInt(name);
      if (!isNaN(topic)) {
        if (topic !== topicFilter) {
          exclude_topic.push(topic);
          //logger.info(`name: ${name}, value: ${value}`);
        }
      }
    }
  }

  // Build the request with correct types
  const request: ListProposalInfo = {
    include_reward_status: [],               // Vec<Int32>
    exclude_topic,                           // Vec<Int32>
    // Use include_status per interface
    include_status: statusFilter !== undefined ? Int32Array.from([statusFilter]) : [],
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
 * Provider handling `!proposals [limit] [topic <id>] [status <id>]` commands
 */
const governanceProvider: Provider = {
  name: 'GOVERNANCE_PROVIDER',
  description: 'Fetch NNS Governance proposals via !proposals command',
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    // Regex now captures optional limit, topic, and status
    const match = message.content.text.match(/^!proposals(?:\s+(\d+))?(?:\s+topic\s+(\d+))?(?:\s+status\s+(\d+))?$/i);
    const limit = match && match[1] ? parseInt(match[1], 10) : 10;
    const topicFilter = match && match[2] ? parseInt(match[2], 10) : undefined;
    const statusFilter = match && match[3] ? parseInt(match[3], 10) : undefined;

    const response = await fetchProposals(limit, statusFilter, topicFilter);
    //const content: Content[] = [];

    const proposals: {
      id: string;
      title: string;
      summary: string;
      topic: string;
      status: string;
      timestamp: bigint;
    }[] = [];

    for (const p of response.proposal_info) {
      const id = p.id[0].id.toString();
      const title = p.proposal[0].title[0];
      const summary = p.proposal[0].summary || '';
      const pInfoResult = await fetchProposalInfo(p.id[0].id);
      const pInfo: ProposalInfo = pInfoResult[0];
      const topic = pInfo.topic.toString();
      const status = pInfo.status.toString();
      const proposal_timestamp_seconds = pInfo.proposal_timestamp_seconds;

      // Only include proposals matching filters
      if (topicFilter !== undefined && parseInt(topic) !== topicFilter) continue;
      if (statusFilter !== undefined && parseInt(status) !== statusFilter) continue;

      /*content.push({ type: 'text', text: `#${id} ${title}` });
      content.push({ type: 'text', text: `Topic: ${topic}` });
      content.push({ type: 'text', text: `Status: ${status}` });
      content.push({ type: 'text', text: `Summary: ${summary}` });*/

      proposals.push({ id, title, summary, topic, status, timestamp: proposal_timestamp_seconds });
    }

    return { text: '', values: {}, data: { proposals } };
  },
};

/**
 * Defines the configuration schema for a plugin, including the validation rules for the plugin name.
 *
 * @type {import('zod').ZodObject<{ GOVERNANCE_CANISTER_ID: import('zod').ZodString }>}
 */
const configSchema = z.object({
  GOVERNANCE_CANISTER_ID: z
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

/*
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
*/

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';

  declare runtime: IAgentRuntime;
  // explicitly declare the field
  //protected runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`*** Starting starter service - ${new Date().toISOString()} ***`);
    return new StarterService(runtime);
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** TESTING DEV MODE - STOP MESSAGE CHANGED! ***');
    const service = runtime.getService(StarterService.serviceType);
    if (!service) throw new Error('Starter service not found');
    service.stop();
  }

  async stop() {
    logger.info('*** THIRD CHANGE - TESTING FILE WATCHING! ***');
  }
}


export const nnsPlugin: Plugin = {
  name: 'plugin-icp-nns',
  description: 'Plugin starter for elizaOS',
  config: {
    GOVERNANCE_CANISTER_ID: process.env.GOVERNANCE_CANISTER_ID,
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
  tests: [
    {
      name: 'plugin_starter_test_suite',
      tests: [
        {
          name: 'should_have_governance_provider',
          fn: async () => {
            if (!nnsPlugin.providers.some(p => p.name === 'GOVERNANCE_PROVIDER')) {
              throw new Error('Governance provider not found in plugin providers');
            }
          },
        },
        {
          name: 'governance_proposals_include_topic_status_summary',
          fn: async () => {
            const provider = nnsPlugin.providers.find(p => p.name === 'GOVERNANCE_PROVIDER');
            if (!provider) throw new Error('Governance provider not found');
            const message = { content: { text: '!proposals 10', source: 'test' } } as Memory;
            const result = await provider.get(null as any, message, null as any);
            const { proposals } = result.data as any;
            if (!Array.isArray(proposals) || proposals.length === 0) {
              throw new Error('No proposals returned');
            }
            if (!proposals.some((p: any) => typeof p.topic === 'string' && p.topic.length)) {
              throw new Error('Missing topic in proposals');
            }
            if (!proposals.some((p: any) => typeof p.status === 'string' && p.status.length)) {
              throw new Error('Missing status in proposals');
            }
            if (!proposals.some((p: any) => typeof p.summary === 'string')) {
              throw new Error('Missing summary in proposals');
            }
          },
        },
        {
          name: 'governance_provider_filters_by_topic_ProtocolCanisterManagement',
          fn: async () => {
            const provider = nnsPlugin.providers.find(p => p.name === 'GOVERNANCE_PROVIDER');
            if (!provider) throw new Error('Governance provider not found');
            const topicId = Topic.ProtocolCanisterManagement;
            const message = { content: { text: `!proposals 50 topic ${topicId}`, source: 'test' } } as Memory;
            const result = await provider.get(null as any, message, null as any);
            const { proposals } = result.data as any;
            for (const p of proposals) {
              if (parseInt(p.topic, 10) !== topicId) {
                throw new Error(`Expected topic '${topicId}' but got '${p.topic}'`);
              }
            }
          },
        },
                {
          name: 'governance_provider_filters_by_topic_IcOsVersionElection',
          fn: async () => {
            const provider = nnsPlugin.providers.find(p => p.name === 'GOVERNANCE_PROVIDER');
            if (!provider) throw new Error('Governance provider not found');
            const topicId = Topic.IcOsVersionElection;
            const statusId = ProposalStatus.Executed;
            const message = { content: { text: `!proposals 20 topic ${topicId} status ${statusId}`, source: 'test' } } as Memory;
            const result = await provider.get(null as any, message, null as any);
            const { proposals } = result.data as any;
            for (const p of proposals) {
              if (parseInt(p.topic, 10) !== topicId) {
                throw new Error(`Expected topic '${topicId}' but got '${p.topic}'`);
              }
            }
          },
        },
        {
          name: 'governance_provider_filters_by_status',
          fn: async () => {
            const provider = nnsPlugin.providers.find(p => p.name === 'GOVERNANCE_PROVIDER');
            if (!provider) throw new Error('Governance provider not found');
            const statusId = ProposalStatus.Open;
            const message = { content: { text: `!proposals 10 status ${statusId}`, source: 'test' } } as Memory;
            const result = await provider.get(null as any, message, null as any);
            const { proposals } = result.data as any;
            if (!proposals.length) throw new Error('No proposals returned');
            for (const p of proposals) {
              if (parseInt(p.status, 10) !== statusId) {
                throw new Error(`Expected status '${statusId}' but got '${p.status}'`);
              }
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
  providers: [governanceProvider],
};

export default nnsPlugin;