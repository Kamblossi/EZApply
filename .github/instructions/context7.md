## Use the context7 server to answer any code or library-specific question --

- 1. When the user requests code examples, setup or configuration steps, or library/API documentation, call the "resolve-library-id" tool to find the correct library ID.
- 2. If the user provides a specific library ID (e.g., /supabase/supabase), call the "get-library-docs" tool directly with that ID.
- 3. Otherwise, call the "get-library-docs" tool with the resolved library ID to fetch the relevant documentation.
- 4. Use the fetched documentation to provide a working code example or answer the user's question.