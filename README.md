# ts-quiz-mcp

LLMs are great at information retrieval and by extension generating unique quiz questions. This MCP library give LLMs the ability to save the tests and the results. This not only allows you to identify the weak points, it allows you to analyse the results over a long period of time.

As a developer I am used to doing technical tests for interviews. Its never ending!! Something I have threatened to do for years was build a test platform for coders, not companies! Most test platforms charge hundreds of pounds for access, or would not make them accessible to job seekers. This caused a great deal of anxiety for developers, certainly within me. Well the AI gods made a great testing tool called a LLM. Only thing missing is long term memory and a way to track your results, I managed to build that in an afternoon and that is this project!

## Setup

This is a MCP run as an express service. It is made up of native TypeScript, no compilation needed. Most services are docker, so I have included that file in the project, modify how you like. Currently it sets up its own private network, which you will need to add to your LLMs docker service to access.

### Update your LLM docker file

```yml
...
services:
  LLM:
    ...
    networks:
      - default
      - mcp_network
...
networks:
  mcp_network:
    external: true
    name: mcp-tools-net
...
```

Simple run it and it should be accessibly to your LLM. SOme LLM have their own unique config. You will need to use their instructions, too many clients!

## Commands

| code               | description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `npm install`      | install dependencies                                                       |
| `nvm use`          | use node version specified in projects .nvmrc file. (NVM needs installing) |
| `npm run test`     | run node:test library                                                      |
| `npm run clean`    | clean project using prettier                                               |
| `npm run validate` | validate code using typescript compiler. Does not generate files           |
| `npm run serve`    | serve MCP locally                                                          |

Im trying to get test to work
