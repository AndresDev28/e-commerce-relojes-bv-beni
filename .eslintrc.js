// .eslintrc.js

module.exports = {
  // El parser le dice a ESLint cómo entender tu código TypeScript
  parser: '@typescript-eslint/parser',
  
  // 'extends' es una lista de configuraciones predefinidas
  extends: [
    'eslint:recommended', // Reglas base de ESLint
    'plugin:@typescript-eslint/recommended', // Reglas recomendadas para TypeScript
    'plugin:react/recommended', // Reglas recomendadas para React
    'plugin:react-hooks/recommended', // Reglas para los hooks de React
    'next/core-web-vitals', // Reglas específicas de Next.js (muy importante)
    'prettier', // ¡AÑADE ESTO AL FINAL! Integra con Prettier
  ],
  
  // 'plugins' son las "cajas de herramientas" que contienen las reglas
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],
  
  // 'rules' te permite personalizar reglas específicas
  rules: {
    // Es una buena práctica desactivar esta regla en proyectos de Next.js,
    // ya que no necesitas importar React en cada archivo.
    'react/react-in-jsx-scope': 'off',
    
    // Puedes añadir otras reglas personalizadas aquí si quieres
  },
  
  // 'settings' permite configurar el comportamiento de los plugins
  settings: {
    react: {
      // Le dice a eslint-plugin-react que detecte automáticamente
      // la versión de React que estás usando.
      version: 'detect',
    },
  },
};