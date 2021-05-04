require('dotenv').config()

const projectId = process.env.PROJECT_ID;

module.exports = {
  contracts_directory: "./src/contracts",
  networks: {
     development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
     },
     fork: {
      host: "localhost",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "1",       // Any network (default: none)
     },
     ropsten: {
      url:`wss://ropsten.infura.io/ws/v3/${projectId}`,
      network_id: '3',
      websockets: true
    },
  },
  compilers: {
    solc: {
       version: "0.6.6",   // Fetch exact version from solc-bin (default: truffle's version)
    },
  },
};
