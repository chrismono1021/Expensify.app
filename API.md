# API Details
# Philosophy
- We desire to have a 1:1:1 ratio of user action to web server (PHP) commands to database server (Auth) commands.
- Each user action should generate at most 1 API call.
- There should be no client-side handling that is unique to any API call.
# Response Handling
## READ Responses
## WRITE Responses
## Hybrid READ/WRITE Responses
# Command Naming Conventions
- Names must be unique for every user action.
- Names must not be shared with our old (now deprecated API)
- Names must always have the format of `<Verb><Noun>` eg. `TransferMoney` `SelectEmoji`
- Verbs should be unique and indicate the user's action (as perceived by the user). eg. `Request`, `Open`, `Accept`, `Pay`
  - If a unique verb cannot be used, then use only the standard verbs: `Update`, `Add`, `Delete`
