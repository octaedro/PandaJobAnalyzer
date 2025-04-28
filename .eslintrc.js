/**
 * ESLint configuration for WooCommerce (JS/TS without React/JSX)
 * Requiere instalar las dependencias:
 * - eslint (núcleo)
 * - @wordpress/eslint-plugin (reglas WordPress)
 * - @typescript-eslint/eslint-plugin y @typescript-eslint/parser (reglas TypeScript)
 * - eslint-plugin-jsdoc (reglas JSDoc)
 * - eslint-plugin-prettier y prettier (reglas de formateo Prettier)
 */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021, // Soporta últimas características de ES2021
    sourceType: "module", // Permite usar imports/exportes (módulos ES)
    // Si se usa TypeScript con proyecto, podría agregarse: project: './tsconfig.json'
  },
  env: {
    browser: true, // Entorno navegador (window, document, etc.)
    es2021: true, // Entorno ES2021 (ES12)
    node: true, // Permite variables de Node (require, module, etc.)
    jquery: true, // Entorno jQuery (define $ y jQuery como globales)
  },
  plugins: [
    "@wordpress", // Plugin de reglas WordPress
    "@typescript-eslint", // Plugin de reglas TypeScript
    "jsdoc", // Plugin de reglas JSDoc
    "prettier", // Plugin de reglas de formateo Prettier
  ],
  rules: {
    // **Posibles errores (recomendaciones ESLint)**
    "no-cond-assign": ["error", "always"], // Prohíbe asignaciones en condicionales
    "no-console": ["warn", { allow: ["warn", "error"] }], // Evita console.log (solo permite console.warn/error)
    "no-debugger": "error", // Prohíbe el uso de debugger
    "no-alert": "warn", // Desaconseja el uso de alert/confirm/prompt
    "no-constant-condition": ["warn", { checkLoops: false }], // Evita condiciones constantes (excepto bucles intencionales)
    "no-dupe-else-if": "error", // Prohíbe cláusulas else-if duplicadas
    "no-dupe-keys": "error", // Prohíbe claves duplicadas en objetos
    "no-duplicate-case": "error", // Prohíbe casos duplicados en switch
    "no-ex-assign": "error", // Prohíbe reasignar excepciones en catch
    "no-extra-boolean-cast": "error", // Prohíbe conversiones booleanas innecesarias
    "no-extra-semi": "off", // (Desactivada - Prettier/TypeScript se encarga)
    "no-func-assign": "error", // Prohíbe reassignar declaraciones de función
    "no-invalid-regexp": "error", // Prohíbe expresiones regulares inválidas
    "no-irregular-whitespace": "error", // Prohíbe espacios en blanco inválidos
    "no-obj-calls": "error", // Prohíbe llamar objetos globales como funciones (Math(), JSON(), etc.)
    "no-prototype-builtins": "error", // Desaconseja el uso directo de métodos prototipo de Object
    "no-regex-spaces": "error", // Prohíbe múltiples espacios en expresiones regulares
    "no-sparse-arrays": "error", // Prohíbe matrices dispersas [1,,3]
    "no-template-curly-in-string": "error", // Prohíbe usar ${} en strings normales en lugar de template strings
    "no-unexpected-multiline": "error", // Evita coincidencias de expresión multilinea confusas
    "no-unreachable": "error", // Prohíbe código no accesible tras return/throw
    "no-unreachable-loop": "error", // Prohíbe bucles que nunca se terminan o no se pueden alcanzar
    "no-unsafe-finally": "error", // Prohíbe comportamientos inseguros en finally
    "no-unsafe-negation": "error", // Prohíbe negaciones incorrectas en relacionales (ej. `!a in b`)
    "use-isnan": "error", // Requiere usar isNaN() para comparar con NaN
    "valid-typeof": ["error", { requireStringLiterals: true }], // typeof sólo comparado con cadenas válidas

    // **Mejores prácticas**
    curly: "error", // Requiere { } en todos los bloques (if/loops even de una línea)
    eqeqeq: ["error", "always"], // Requiere === y !== en lugar de == o !=
    "no-caller": "error", // Prohíbe usar arguments.caller o .callee
    "no-case-declarations": "error", // Prohíbe declarar variables en case sin bloque
    "no-empty": ["error", { allowEmptyCatch: true }], // Prohíbe bloques vacíos (permite catch vacío)
    "no-empty-pattern": "error", // Prohíbe patrones de desestructuración vacíos
    "no-eval": "error", // Prohíbe usar eval()
    "no-implied-eval": "error", // Prohíbe métodos equivalentes a eval() (setTimeout string)
    "no-fallthrough": "error", // Prohíbe caer de un case al siguiente sin break
    "no-global-assign": "error", // Prohíbe asignar a variables globales nativas
    "no-octal": "error", // Prohíbe literales octales `0123`
    "no-octal-escape": "error", // Prohíbe secuencias de escape octales en strings
    "no-return-await": "error", // Desaconseja usar `return await` dentro de funciones async
    "no-self-assign": "error", // Prohíbe asignarse una variable a sí misma
    "no-self-compare": "error", // Prohíbe compararse una variable consigo misma
    "no-sequences": "error", // Prohíbe el operador coma (sequence operator)
    "no-throw-literal": "error", // Requiere lanzar solo excepciones de tipo Error
    "no-useless-catch": "error", // Prohíbe catch redundantes que solo relanzan el error
    "no-useless-concat": "error", // Prohíbe concatenaciones de strings innecesarias
    "no-useless-return": "error", // Prohíbe `return` innecesario al final de función
    "no-with": "error", // Prohíbe el uso de `with`
    "prefer-promise-reject-errors": "error", // Requiere usar Error al rechazar Promises (Promise.reject(new Error()))
    "require-await": "error", // Prohíbe funciones async que no usan await
    yoda: ["error", "never"], // Prohíbe las condiciones Yoda (literal a la izquierda en comparaciones)

    // **Variables**
    "no-delete-var": "error", // Prohíbe borrar variables declaradas (solo permitir delete propiedades)
    "no-label-var": "error", // Prohíbe etiquetas con el mismo nombre que variables
    "no-undef": "error", // Prohíbe el uso de variables no definidas (desactivada en TypeScript, abajo)
    "no-undef-init": "error", // Prohíbe inicializar variables a undefined (innecesario)
    "no-unused-vars": "off", // Desactivada – se usa la regla de TypeScript abajo para JS/TS
    "no-use-before-define": "off", // Desactivada – se usa la regla de TypeScript abajo
    "no-shadow": "off", // Desactivada – se usa la regla de TypeScript abajo

    // **Node.js y CommonJS (no React, pero por completitud)**
    "global-require": "error", // Requiere llamadas a require() sólo en la cabecera del archivo
    "no-buffer-constructor": "error", // Prohíbe usar Buffer() constructor (deprecated)
    "no-new-require": "error", // Prohíbe crear objetos mediante require (ej: new require('foo'))
    "no-path-concat": "error", // Prohíbe concatenar __dirname + 'file', se sugiere path.join

    // **Estilo de código – manejado por Prettier**
    // (Prettier se encargará del formateo: indentación, comillas, comas, etc.)
    "prettier/prettier": [
      "error",
      {
        useTabs: true, // Usar tabulaciones en lugar de espacios
        tabWidth: 4, // Ancho de tabulación equivalente a 4 espacios
        singleQuote: true, // Usar comillas simples para strings
        semi: true, // Usar punto y coma al final de declaraciones
        trailingComma: "es5", // Coma final en objetos/arrays multilínea (es5),
        printWidth: 80, // Longitud máxima de línea recomendada
        bracketSpacing: true, // Espacio dentro de llaves de objetos: { clave: valor }
      },
    ], // **Requiere plugin: eslint-plugin-prettier** (y tener Prettier configurado, e.g. @wordpress/prettier-config) // **Reglas específicas de WordPress (Automattic/Woo)**

    "@wordpress/dependency-group": "error", // Requiere formato correcto en los bloques de dependencias (/* Dependencies: */)
    "@wordpress/i18n-ellipsis": "error", // Evita tres puntos `...` sin carácter de elipsis en textos traducibles
    "@wordpress/i18n-no-collapsible-whitespace": "error", // Evita espacios colapsables en textos traducibles
    "@wordpress/i18n-no-placeholders-only": "error", // Evita strings traducibles que solo tienen placeholders
    "@wordpress/i18n-no-variables": "error", // Requiere literales de texto en funciones de traducción (no variables sueltas)
    "@wordpress/i18n-text-domain": "error", // Requiere dominio de texto válido en funciones de traducción
    "@wordpress/i18n-translator-comments": "error", // Requiere comentarios de traductor antes de cadenas con placeholders
    "@wordpress/no-base-control-with-label-without-id": "error", // Evita usar BaseControl (component WP) con label sin id
    "@wordpress/no-unguarded-get-range-at": "error", // Prohíbe usar Range.getRangeAt() sin comprobar errores
    "@wordpress/no-unsafe-wp-apis": "error", // Prohíbe uso inseguro de APIs de WordPress (ej: algunas funciones globales)
    "@wordpress/no-unused-vars-before-return": "error", // Evita asignar variables que nunca se usan antes de un return
    "@wordpress/no-wp-process-env": "error", // Prohíbe usar process.env.* de WP (legacy)
    "@wordpress/valid-sprintf": "error", // Requiere uso correcto de sprintf (número de placeholders vs. argumentos)
    // (Para usar estas reglas es necesario instalar el paquete `@wordpress/eslint-plugin`)

    // **Reglas de JSDoc** (comenta y documenta correctamente las funciones)
    "jsdoc/check-alignment": "error", // Asteriscos alignados en comentarios JSDoc
    "jsdoc/check-param-names": "error", // Los nombres de @param en JSDoc deben coincidir con los de la función
    "jsdoc/check-tag-names": "error", // Verifica nombres de etiquetas JSDoc (ej. @returns vs @return)
    "jsdoc/check-types": "error", // Verifica tipos válidos en JSDoc
    "jsdoc/newline-after-description": "error", // Requiere una línea en blanco después de la descripción en JSDoc
    "jsdoc/no-undefined-types": "error", // Evita referenciar tipos no definidos en JSDoc
    "jsdoc/require-param": "error", // Requiere documentar todos los parámetros de función en JSDoc
    "jsdoc/require-param-type": "error", // Requiere indicar el tipo de cada @param
    "jsdoc/require-returns": "error", // Requiere documentar la salida con @returns en funciones públicas
    "jsdoc/require-returns-type": "error", // Requiere indicar el tipo de dato devuelto
    // (Requiere instalar `eslint-plugin-jsdoc` para habilitar estas reglas)

    // **Reglas específicas de TypeScript** (supletorias a las anteriores)
    "@typescript-eslint/no-unused-vars": [
      "error",
      { vars: "all", args: "after-used", ignoreRestSiblings: true },
    ],
    "@typescript-eslint/no-use-before-define": [
      "error",
      { functions: false, classes: true, variables: true },
    ],
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-empty-function": "error", // Prohíbe funciones vacías (sin código) en TS (excepto constructores, etc. si se configura)
    "@typescript-eslint/no-var-requires": "error", // Prohíbe require() de estilo CommonJS en TS (usar imports)
    "@typescript-eslint/no-array-constructor": "error", // Prohíbe Array() constructor (usar literales [])
    "@typescript-eslint/no-extra-semi": "error", // Prohíbe punto y coma extra (igual que no-extra-semi, para compatibilidad TS)
    "@typescript-eslint/no-useless-constructor": "error", // Prohíbe constructores vacíos/useless en clases TS
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"], // Prefiere `interface` sobre `type` para definir objetos
    "@typescript-eslint/explicit-module-boundary-types": "error", // Requiere declarar tipos de retorno en funciones exportadas (fronteras del módulo)
    "@typescript-eslint/ban-ts-comment": "error", // Prohíbe comentarios @ts-ignore/expect/nap excepto con justificación
    // (Requiere instalar `@typescript-eslint/eslint-plugin` y `@typescript-eslint/parser` para usar estas reglas)
  },
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        // Desactiva reglas de ESLint que no aplican en TypeScript (lo maneja el compilador)
        "no-undef": "off", // Las referencias de tipos/interfaces en TS podrían marcarse incorrectamente como indefinidas por no-undef
      },
    },
  ],
};
