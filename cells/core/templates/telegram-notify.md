# Template: Telegram Notification
Description: Sends a message via Telegram.

## Parameters
- target: Chat ID or Name
- message: Text content

## Implementation
```javascript
// Internal call to message tool
message({
  action: 'send',
  target: '{{params.target}}',
  message: '{{params.message}}'
});
```
