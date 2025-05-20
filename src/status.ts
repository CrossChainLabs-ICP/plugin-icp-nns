//Source: https://github.com/dfinity/ic/blob/master/rs/nns/governance/api/src/types.rs
export const ProposalStatus = {
    Unspecified : 0,
    /// A decision (adopt/reject) has yet to be made.
    Open : 1,
    /// The proposal has been rejected.
    Rejected : 2,
    /// The proposal has been adopted (sometimes also called
    /// "accepted"). At this time, either execution as not yet started,
    /// or it has but the outcome is not yet known.
    Adopted : 3,
    /// The proposal was adopted and successfully executed.
    Executed : 4,
    /// The proposal was adopted, but execution failed.
    Failed : 5,
 };

 // add reverse mapping:
Object.entries(ProposalStatus).forEach(([name, value]) => {
  ProposalStatus[value] = name;
});