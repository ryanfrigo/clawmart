# SKILL.md Specification v1.0

The standard format for agent skills in the clawmart ecosystem.

## Overview

A SKILL.md file describes capabilities that agents can discover, verify, and execute. It follows a structured format for maximum compatibility across agent frameworks.

## File Structure

```markdown
# Skill Name

> One-line description of what this skill does

## Metadata

| Field | Value |
|-------|-------|
| **name** | `skill-name` |
| **version** | `1.0.0` |
| **author** | `@username` or author name |
| **tags** | `tag1`, `tag2`, `tag3` |
| **tools** | `tool1`, `tool2` |
| **runtime** | `node`, `python`, `bash`, `docker` |
| **entry** | `index.js` or command to run |

## Description

Full description of what this skill does, when to use it, and what problems it solves.

## Tools Provided

### toolName

**Purpose:** What this tool does

**Parameters:**
```json
{
  "param1": {
    "type": "string",
    "required": true,
    "description": "What this parameter does"
  },
  "param2": {
    "type": "number",
    "required": false,
    "default": 42
  }
}
```

**Returns:**
```json
{
  "success": true,
  "data": {}
}
```

**Example:**
```javascript
const result = await skill.tools.toolName({
  param1: "value",
  param2: 100
});
```

## Configuration

```json
{
  "apiKey": {
    "type": "string",
    "required": true,
    "env": "SERVICE_API_KEY",
    "description": "API key for external service"
  },
  "timeout": {
    "type": "number",
    "required": false,
    "default": 30000,
    "description": "Request timeout in milliseconds"
  }
}
```

## Dependencies

- `other-skill` ^1.0.0 - Why this is needed
- `node-fetch` ^3.0.0 - For HTTP requests

## Examples

### Basic Usage

```javascript
const skill = await loadSkill('skill-name');
const result = await skill.tools.search({ query: "hello world" });
console.log(result);
```

### Advanced Configuration

```javascript
const skill = await loadSkill('skill-name', {
  apiKey: process.env.MY_API_KEY,
  timeout: 60000
});
```

## Verification

### Test Cases

```yaml
tests:
  - name: "Basic search works"
    input:
      tool: "search"
      params:
        query: "test"
    expect:
      success: true
      data: "should be defined"
  
  - name: "Handles empty query"
    input:
      tool: "search"
      params:
        query: ""
    expect:
      success: false
      error: "should contain 'required'"
```

### Benchmarks

```yaml
benchmarks:
  - name: "Search latency"
    target: "< 500ms"
    samples: 100
```

## API Reference

### Direct HTTP

If the skill exposes HTTP endpoints:

```
POST /api/v1/search
Content-Type: application/json

{
  "query": "search term"
}
```

## Changelog

### v1.0.0
- Initial release
- Basic search functionality
- Authentication support

## License

MIT
