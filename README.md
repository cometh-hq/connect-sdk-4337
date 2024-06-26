<p align="center">
  <img src="https://github.com/cometh-hq/connect-sdk-4337/blob/feat/sessionKeys/cometh-logo.png" alt="Cometh"/>
</p>

# Cometh Connect ERC-4337 version

This repository contains a the Cometh Connect AA sdk built on top of ERC4337. 

Try it the wallet directly here: [demo.4337.develop.core.cometh.tech/](https://demo.4337.develop.core.cometh.tech/).

## Overview

Cometh Connect is an SDK that enables applications to provide their users a smart wallet controlled with biometrics.

Coupled with a web2 authentication system (or standalone to stay anonymous), users are onboarded with web2 convenience and web3 security: biometric signatures (passwordless, non custodial), gasless transactions, account recovery, etc.

### Features

- Instant wallet creation via account abstraction.
- Gas fees sponsoring via cometh paymaster.
- Session keys for a flawless UX.
- Recovery System for your users.
- Utilizes modern JavaScript and Web3 libraries for an enhanced development experience.

## Folder Architecture Overview

The project is built using a monorepo structure to further enhance modularity and scalability. 

This new structure allows for multiple projects, such as POCs and example applications, to coexist within the same repository while maintaining their individual architectures. Below is the revised directory structure:

### Monorepo Structure

- `packages/`: Root directory for all projects within the monorepo, each project contained within its own subdirectory.
  - `sdk/`: The core functionnalitities of the sdk.
  - `example/`: An example application interacting with the wallet.
  - `example-wagmi/`: An example application interacting with the wallet using wagmi.

Each project within the `packages/` directory follows the same internal architecture, as detailed below:

## Getting Started

### Installation

1. Clone the repository and navigate to the project directory.
2. Run `bun install` to install dependencies.

### Running the Development Server

- Execute `bun dev` to start the development server.

## Built With

- [Bun](https://bun.sh/) - The JS toolkit for maximum efficiency.
- [NextJS](https://nextjs.org/) - The React framework for server-side rendering.
- [Biome](https://biomejs.dev/) - For ultra-fast linting/formatting.
- [TanStack Query](https://tanstack.com/) - For efficient data fetching and async state management.
- [Wagmi 2.0](https://wagmi.sh/) - For Ethereum hooks.
- [Viem 2.0](https://viem.sh/) - For blockchain communication.

### Infrastructure

- [Safe](https://safe.global/): For smart account solutions.

## Contributing

We welcome contributions! Don't hesitate to submit PR :)

## License

Released under the [Apache License](https://github.com/cometh-hq/connect-sdk-4337/blob/main/LICENSE.txt).
