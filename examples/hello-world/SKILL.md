# Hello World

> A simple skill that greets users and demonstrates the SKILL.md format

## Metadata

| Field | Value |
|-------|-------|
| **name** | `hello-world` |
| **version** | `1.0.0` |
| **author** | `@clawmart` |
| **tags** | `example`, `greeting`, `utility` |
| **tools** | `greet`, `farewell` |
| **runtime** | `node` |
| **entry** | `index.js` |

## Description

A basic skill for greeting and saying goodbye. Perfect for testing agent skill loading and as a template for new skills.

## Tools Provided

### greet

**Purpose:** Returns a personalized greeting message

**Parameters:**
```json
{
  "name": {
    "type": "string",
    "required": false,
    "default": "World",
    "description": "Name to include in the greeting"
  },
  "enthusiasm": {
    "type": "number",
    "required": false,
    "default": 1,
    "description": "Enthusiasm level (1-3) determines exclamation marks"
  }
}
```

**Returns:**
```json
{
  "success": true,
  "greeting": "Hello, Alice!!",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example:**
```javascript
const result = await skill.tools.greet({
  name: "Agent",
  enthusiasm: 2
});
// Returns: { greeting: "Hello, Agent!!" }
```

### farewell

**Purpose:** Returns a personalized farewell message

**Parameters:**
```json
{
  "name": {
    "type": "string",
    "required": false,
    "default": "Friend",
    "description": "Name to include in the farewell"
  }
}
```

**Returns:**
```json
{
  "success": true,
  "farewell": "Goodbye, Friend! 👋",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuration

```json
{
  "language": {
    "type": "string",
    "required": false,
    "default": "en",
    "enum": ["en", "es", "fr", "de"],
    "description": "Language for greetings"
  }
}
```

## Dependencies

None - this is a zero-dependency example skill.

## Examples

### Basic Greeting

```javascript
const skill = await loadSkill('hello-world');
const result = await skill.tools.greet({ name: "Developer" });
console.log(result.greeting); // "Hello, Developer!"
```

### With Configuration

```javascript
const skill = await loadSkill('hello-world', { language: 'es' });
const result = await skill.tools.greet({ name: "Mundo" });
console.log(result.greeting); // "¡Hola, Mundo!"
```

## Verification

### Test Cases

```yaml
tests:
  - name: "Default greeting works"
    input:
      tool: "greet"
      params: {}
    expect:
      success: true
      greeting: "should contain 'Hello'"
  
  - name: "Personalized greeting"
    input:
      tool: "greet"
      params:
        name: "Test"
        enthusiasm: 3
    expect:
      success: true
      greeting: "should be 'Hello, Test!!!'"
  
  - name: "Farewell works"
    input:
      tool: "farewell"
      params:
        name: "User"
    expect:
      success: true
      farewell: "should contain 'User'"
```

### Benchmarks

```yaml
benchmarks:
  - name: "Greeting latency"
    target: "< 1ms"
    samples: 1000
```

## Changelog

### v1.0.0
- Initial release
- Basic greet and farewell tools
- Multi-language support framework

## License

MIT
