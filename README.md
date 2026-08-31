# platform-data

Blockchain data collectors / enrichers / loaders (CDK). Archived snapshot, as-is.

This tree is a **new public commit** with no git history. The original private archive is `eulertools/platform-data-archive`.

Generated `cdk.context.json` dropped. p2pify RPCs replaced with public seeds. `.env.example` VPC/SG/account ids placeholdered. **Rotate those p2pify keys** if they are still live (they remain in the private archive).

No contract deployments recorded in this repo.

## What was built (EN)

platform-data is a blockchain data ingestion platform built on AWS CDK that extracts data from Ethereum and EVM-compatible chains and loads it into a data warehouse. `CollectorStack` / `EnrichersStack` / `LoadersStack` cover ECS, WebSocket ingestion, DynamoDB streams, and DEX event extractors.

## Qué se construyó (ES)

Ingesta de datos on-chain (collectors, enrichers, loaders). Contexto CDK de AWS eliminado.

---

## Notice / Aviso

**Euler Tools ha cerrado. Euler Tools is closed.**

La empresa quebró. Este repositorio está archivado y no se mantiene. El software se ofrece tal cual (as is), sin garantía ni soporte. Parte del material puede ser reclamado por acreedores.

The company went bankrupt. This repository is archived and unmaintained. Software is provided as is, with no warranty and no support. Some material may be claimed by creditors.

Site: https://euler.tools  
Org: https://github.com/eulertools  
Enquiries: https://sinequix.com · https://github.com/tebayoso
