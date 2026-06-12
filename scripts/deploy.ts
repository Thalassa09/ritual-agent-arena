import { ethers } from "hardhat";

async function main() {
  const RitualAgentArena = await ethers.getContractFactory("RitualAgentArena");
  const arena = await RitualAgentArena.deploy();

  await arena.waitForDeployment();
  console.log(`RitualAgentArena deployed to: ${await arena.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});