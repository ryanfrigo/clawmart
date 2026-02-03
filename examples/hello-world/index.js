// Simple implementation for hello-world skill
module.exports = {
  name: 'hello-world',
  version: '1.0.0',
  
  config: {
    language: 'en'
  },
  
  greetings: {
    en: { hello: 'Hello', goodbye: 'Goodbye' },
    es: { hello: '¡Hola', goodbye: 'Adiós' },
    fr: { hello: 'Bonjour', goodbye: 'Au revoir' },
    de: { hello: 'Hallo', goodbye: 'Auf Wiedersehen' }
  },
  
  init(config = {}) {
    this.config = { ...this.config, ...config };
    return this;
  },
  
  tools: {
    greet({ name = 'World', enthusiasm = 1 } = {}) {
      const lang = this.config.language;
      const greeting = this.greetings[lang]?.hello || this.greetings.en.hello;
      const marks = '!'.repeat(Math.min(Math.max(enthusiasm, 1), 3));
      
      return {
        success: true,
        greeting: `${greeting}, ${name}${marks}`,
        timestamp: new Date().toISOString()
      };
    },
    
    farewell({ name = 'Friend' } = {}) {
      const lang = this.config.language;
      const farewell = this.greetings[lang]?.goodbye || this.greetings.en.goodbye;
      
      return {
        success: true,
        farewell: `${farewell}, ${name}! 👋`,
        timestamp: new Date().toISOString()
      };
    }
  }
};
