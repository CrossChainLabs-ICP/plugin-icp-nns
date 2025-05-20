//Source: https://github.com/dfinity/ic/blob/master/rs/nns/governance/api/src/types.rs

export const Topic = {
    /**
     * The `Unspecified` topic is used as a fallback when
     * followees for other topics are not specified.
     */
    Unspecified : 0,
    /**
     * Manage neurons: restricted followees, short voting period.
     */
    NeuronManagement : 1,
    /**
     * Exchange rate proposals: real time ICP valuation, short voting period.
     */
    ExchangeRate : 2,
    /**
     * Network economics: node operators' rewards, etc.
     */
    NetworkEconomics : 3,
    /**
     * Governance: freeze malicious canisters, etc.
     */
    Governance : 4,
    /**
     * Node administration: upgrades and config of node software.
     */
    NodeAdmin : 5,
    /**
     * Participant management: grant/revoke DCIDs or NOIDs.
     */
    ParticipantManagement : 6,
    /**
     * Subnet management: create, split, modify subnets.
     */
    SubnetManagement : 7,
    /**
     * Network canister management: NNS-controlled canisters.
     */
    NetworkCanisterManagement : 8,
    /**
     * KYC proposals: regulatory updates on neuron genesis.
     */
    Kyc : 9,
    /**
     * Node provider rewards: proposals to reward providers.
     */
    NodeProviderRewards : 10,
    /**
     * IC OS version deployment: deploy elected IC OS versions.
     */
    IcOsVersionDeployment : 12,
    /**
     * IC OS version election: elect new IC OS versions.
     */
    IcOsVersionElection : 13,
    /**
     * SNS and Community Fund proposals.
     */
    SnsAndCommunityFund : 14,
    /**
     * API boundary node management.
     */
    ApiBoundaryNodeManagement : 15,
    /**
     * Subnet rental proposals.
     */
    SubnetRental : 16,
    /**
     * Protocol canister management.
     */
    ProtocolCanisterManagement : 17,
    /**
     * Service nervous system management.
     */
    ServiceNervousSystemManagement : 18,
  };

   // add reverse mapping:
  Object.entries(Topic).forEach(([name, value]) => {
    Topic[value] = name;
  });