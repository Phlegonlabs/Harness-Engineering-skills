#!/usr/bin/env bun

import { dirname } from "path"
import { runRuntimeUpgrade } from "./setup/core"
import { createLogger } from "./setup/shared"

const skillRoot = dirname(import.meta.dir)
const logger = createLogger()

await runRuntimeUpgrade({ skillRoot, logger })
