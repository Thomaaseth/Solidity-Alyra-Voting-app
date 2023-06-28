// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/// @title Voting contract
/// @notice This contract allows for a decentralized voting system
/// @dev This contract inherits from the Ownable contract from OpenZeppelin
contract Voting is Ownable {
    uint public winningProposalID;

    /// @notice The structure for a voter
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    /// @notice The structure for a proposal
    struct Proposal {
        string description;
        uint voteCount;
    }

    /// @notice The different stages of the voting process
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    /// @notice The current stage of the voting process
    WorkflowStatus public workflowStatus;

    /// @notice Array of all proposals for the current voting session
    Proposal[] proposalsArray;

    /// @notice Map of the voter addresses to their voter info
    mapping(address => Voter) voters;

    /// @notice Event emitted when a new voter is registered
    event VoterRegistered(address voterAddress);

    /// @notice Event emitted when the stage of the voting process changes
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );

    /// @notice Event emitted when a new proposal is registered
    event ProposalRegistered(uint proposalId);

    /// @notice Event emitted when a vote is registered
    event Voted(address voter, uint proposalId);

    /// @dev Modifier to restrict access to only registered voters
    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter");
        _;
    }

    /// @notice Gets voter details
    /// @param _addr The address of the voter
    /// @return The voter's details
    function getVoter(
        address _addr
    ) external view onlyVoters returns (Voter memory) {
        return voters[_addr];
    }

    /// @notice Gets a proposal
    /// @param _id The ID of the proposal
    /// @return The proposal's details
    function getOneProposal(
        uint _id
    ) external view onlyVoters returns (Proposal memory) {
        return proposalsArray[_id];
    }

    /// @notice Registers a voter
    /// @param _addr The address of the voter
    function addVoter(address _addr) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Voters registration is not open yet"
        );
        require(!voters[_addr].isRegistered, "Already registered");
        voters[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }

    /// @notice Registers a proposal
    /// @param _desc The description of the proposal
    function addProposal(string calldata _desc) external onlyVoters {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Proposals are not allowed yet"
        );
        require(
            keccak256(abi.encodePacked(_desc)) !=
                keccak256(abi.encodePacked("")),
            "You cannot propose nothing"
        );

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);

        emit ProposalRegistered(proposalsArray.length - 1);
    }

    /// @notice Lets a voter vote for a proposal and check if the proposal is now winning
    /// @param _id The ID of the proposal
    function setVote(uint _id) external onlyVoters {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session hasn't started yet"
        );
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(_id < proposalsArray.length, "Proposal not found");

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;

        // Check if this proposal is now winning
        if (
            proposalsArray[_id].voteCount >
            proposalsArray[winningProposalID].voteCount
        ) {
            winningProposalID = _id;
        }

        emit Voted(msg.sender, _id);
    }

    /// @notice Changes the current workflow status to allow proposal registration
    function startProposalsRegistering() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Registering proposals can't be started now"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;

        Proposal memory proposal;
        proposal.description = "GENESIS";
        proposalsArray.push(proposal);

        emit WorkflowStatusChange(
            WorkflowStatus.RegisteringVoters,
            WorkflowStatus.ProposalsRegistrationStarted
        );
    }

    /// @notice Ends the current proposal registration phase
    function endProposalsRegistering() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Registering proposals hasn't started yet"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            WorkflowStatus.ProposalsRegistrationEnded
        );
    }

    /// @notice Starts the voting session
    function startVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnded,
            "Registering proposals phase is not finished"
        );
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            WorkflowStatus.VotingSessionStarted
        );
    }

    /// @notice Ends the voting session
    function endVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session hasn't started yet"
        );
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            WorkflowStatus.VotingSessionEnded
        );
    }
}
