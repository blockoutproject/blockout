# Application Logging Execution

Execute only validated logging findings. Prefer stable operational boundaries and existing logging stacks. Never log
tokens, credentials, raw JWTs, payloads, or personal data. Preserve production log shape during migration unless the
task explicitly changes observability.

Compile or test the owning runtime and perform a targeted sensitive-field scan over changed log statements.
