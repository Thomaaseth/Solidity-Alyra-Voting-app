const Voting = artifacts.require("Voting");

contract("Test Voting", function (accounts) {
  let owner, voting;

  beforeEach(async function () {
    owner = accounts[0];
    voting = await Voting.new({ from: owner });
  });

  describe("Contract initialization", function () {
    it("should deploy the contract", async function () {
      let theOwner = await voting.owner();
      assert.equal(owner, theOwner);
    });
  });

  // Add voter tests //

  describe("Adding voters", function () {
    it("owner should be able to add voters in RegisteringVoters state", async function () {
      let voter1 = accounts[1];
      let result = await voting.addVoter(voter1, { from: owner });
      assert.equal(result.logs[0].event, "VoterRegistered");
      assert.equal(result.logs[0].args.voterAddress, voter1);
    });

    it("adding voters fail if state != RegisteringVoters", async function () {
      let voter1 = accounts[1];
      await voting.startProposalsRegistering({ from: owner });
      await truffleAssert.reverts(voting.addVoter(voter1, { from: owner }), "Voters registration is not open yet");
    });

    it("only owner can add voters", async function () {
      let voter1 = accounts[1];
      let voter2 = accounts[2];
      await truffleAssert.reverts(voting.addVoter(voter2, { from: voter1 }), "Ownable: caller is not the owner");
    });

    it("address already registered", async function () {
      let voter1 = accounts[1];
      await voting.addVoter(voter1, { from: owner });
      await truffleAssert.reverts(voting.addVoter(voter1, { from: owner }), "Already registered");
    });
  });

  // Getter getVoter tests //

  describe("get registered voters", function () {
    beforeEach(async function () {
      let voter1 = accounts[1];
      let voter2 = accounts[2];
      let voter4 = accounts[4];
      let voter5 = accounts[5];
      let voter6 = accounts[6];

      await voting.addVoter(voter1, { from: owner });
      await voting.addVoter(voter2, { from: owner });
      await voting.addVoter(voter4, { from: owner });
      await voting.addVoter(voter5, { from: owner });
      await voting.addVoter(voter6, { from: owner });
    });

    it("retrieves info voters", async function () {
      let voterInfo = await voting.getVoter.call(accounts[1]);
      assert.equal(voterInfo.hasVoted, false);
      assert.equal(voterInfo.votedProposalId, 0);
    });
  });

  // Getter getOneProposal tests //

  describe("get registered proposals", function () {
    beforeEach(async function () {
      let voter1 = accounts[1];
      let voter2 = accounts[2];

      await voting.addVoter(voter1, { from: owner });
      await voting.addVoter(voter2, { from: owner });
      await voting.startProposalsRegistering({ from: owner });
    });

    it("retrieves the proposal content correctly", async function () {
      await voting.addProposal("Proposal 1", { from: accounts[1] });
      await voting.addProposal("Proposal 2", { from: accounts[2] });

      let proposal = await voting.getOneProposal.call(1, { from: accounts[1] });
      assert.equal(proposal.description, "Proposal 1");

      proposal = await voting.getOneProposal.call(2, { from: accounts[2] });
      assert.equal(proposal.description, "Proposal 2");
    });
  });

  // Proposal tests //

  describe("Registering proposal", function () {
    beforeEach(async function () {
      let voter1 = accounts[1];

      await voting.addVoter(voter1, { from: owner });
    });

    describe("before starting/after closing proposal registration", function () {
      it("not in registering proposal state", async function () {
        await truffleAssert.reverts(voting.addProposal("Proposal 1", { from: accounts[1] }), "Proposals are not allowed yet");
      });

      it("proposal registration closed", async function () {
        await voting.startProposalsRegistering({ from: owner });
        await voting.endProposalsRegistering({ from: owner });
        await truffleAssert.reverts(voting.addProposal("Proposal 2", { from: accounts[1] }), "Proposals are not allowed yet");
      });
    });

    describe("after starting proposal registration", function () {
      beforeEach(async function () {
        let voter1 = accounts[1];
        await voting.startProposalsRegistering({ from: owner });
      });

      it("check proposal added successfully", async function () {
        let result = await voting.addProposal("Proposal 1", { from: accounts[1] });
        assert.equal(result.logs[0].event, "ProposalRegistered");
        assert.equal(result.logs[0].args.proposalId, 1);
      });

      it("not a registered voter", async function () {
        let voter2 = accounts[2];
        await truffleAssert.reverts(voting.addProposal("Proposal 2", { from: voter2 }), "You're not a voter");
      });

      it("verify proposal isnt empty", async function () {
        await truffleAssert.reverts(voting.addProposal("", { from: accounts[1] }), "You cannot propose nothing");
      });
    });
  });

  // Voting tests //

  describe("Vote registering", function () {
    beforeEach(async function () {
      let voter1 = accounts[1];
      let voter2 = accounts[2];
      let voter3 = accounts[3];
      let voter4 = accounts[4];
      let voter5 = accounts[5];
      let voter6 = accounts[6];

      await voting.addVoter(voter1, { from: owner });
      await voting.addVoter(voter2, { from: owner });
      await voting.addVoter(voter4, { from: owner });
      await voting.addVoter(voter5, { from: owner });
      await voting.addVoter(voter6, { from: owner });
    });

    describe("before starting/after closing voting session", function () {
      it("check voters are registered", async function () {
        let voter1 = accounts[1];
        let voter2 = accounts[2];
        assert.isRejected(voting.addVoter(voter1, { from: owner }), /Already registered/);
        assert.isRejected(voting.addVoter(voter2, { from: owner }), /Already registered/);
      });

      it("tries to vote but session not started", async function () {
        let voter1 = accounts[1];
        let voter2 = accounts[2];
        assert.isRejected(voting.setVote(1, { from: voter1 }), /Voting session hasn't started yet/);
        assert.isRejected(voting.setVote(1, { from: voter2 }), /Voting session hasn't started yet/);
      });

      it("tries to vote but session ended", async function () {
        let voter1 = accounts[1];
        let voter2 = accounts[2];
        await voting.startProposalsRegistering({ from: owner });
        await voting.addProposal("Proposal 1", { from: voter1 });
        await voting.endProposalsRegistering({ from: owner });
        await voting.startVotingSession({ from: owner });
        await voting.endVotingSession({ from: owner });
        assert.isRejected(voting.setVote(1, { from: voter1 }), /Voting session hasn't started yet/);
        assert.isRejected(voting.setVote(1, { from: voter2 }), /Voting session hasn't started yet/);
      });

      describe("after starting voting session", function () {
        beforeEach(async function () {
          let voter1 = accounts[1];
          let voter2 = accounts[2];
          await voting.startProposalsRegistering({ from: owner });
          await voting.addProposal("Proposal 1", { from: voter1 });
          await voting.addProposal("Proposal 2", { from: voter2 });
          await voting.endProposalsRegistering({ from: owner });
          await voting.startVotingSession({ from: owner });
        });

        it("register vote", async function () {
          let voter1 = accounts[1];
          let result = await voting.setVote(0, { from: voter1 });
          assert.equal(result.logs[0].event, "Voted");
          assert.equal(result.logs[0].args.voter, voter1);
          assert.equal(result.logs[0].args.proposalId, 0);
        });

        it("checks cant vote on inexistent proposal", async function () {
          let voter1 = accounts[1];
          assert.isRejected(voting.setVote(4, { from: voter1 }), /Proposal not found/);
        });

        it("checks cant vote twice", async function () {
          let voter1 = accounts[1];
          await voting.setVote(0, { from: voter1 });
          assert.isRejected(voting.setVote(0, { from: voter1 }), /You have already voted/);
        });

        it("tries to vote but not registered as voter", async function () {
          let voter3 = accounts[3];
          assert.isRejected(voting.setVote(0, { from: voter3 }), /You're not a voter/);
        });

        // We assume Owner isn't allowed to vote by default
        it("owner tries to vote but not registered as a voter", async function () {
          assert.isRejected(voting.setVote(0, { from: owner }), /You're not a voter/);
        });

        it("total vote counts increment properly", async function () {
          let voter1 = accounts[1];
          let voter2 = accounts[2];
          let voter4 = accounts[4];
          let voter5 = accounts[5];
          let voter6 = accounts[6];

          let initLogs = await voting.getPastEvents("Voted");
          let initVoteCount = initLogs.length;

          await voting.setVote(0, { from: voter1 });
          await voting.setVote(0, { from: voter2 });
          await voting.setVote(0, { from: voter4 });
          await voting.setVote(0, { from: voter5 });
          await voting.setVote(1, { from: voter6 });

          let finalLogs = await voting.getPastEvents("Voted");
          let finalVoteCount = finalLogs.length;

          assert.equal(finalVoteCount, initVoteCount + 5);
        });
      });
    });

    // Check that Owner can register as voter and cast a vote //

    describe("check owner can vote only if he registers as voter", function () {
      beforeEach(async function () {
        await voting.addVoter(owner, { from: owner });
        await voting.startProposalsRegistering({ from: owner });
        await voting.endProposalsRegistering({ from: owner });
        await voting.startVotingSession({ from: owner });
      });

      it("owner can vote if he registered himself as voter", async function () {
        let result = await voting.setVote(0, { from: owner });
        assert.equal(result.logs[0].event, "Voted");
        assert.equal(result.logs[0].args.voter, owner);
        assert.equal(result.logs[0].args.proposalId, 0);
      });
    });
  });
});
