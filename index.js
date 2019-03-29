const NUMBER_REGEX = new RegExp(/(([1-9][0-9]*)|[0-9])((\.[0-9]+){0,1})/)
const OPERATION_REGEX = new RegExp(/\+|-|\*|\//)

const COMPILER_ERRORS = {
  INCOMPLETE_EXPRESSION: 'Incomplete expression provided',
  INVALID_TOKEN: 'Invalid token provided',
  INVALID_STACK: 'Invalid stack element',
  MULTIPLE_EXPRESSIONS: 'Multiple expressions on a single line',
}

/**
 * Returns a compilation error object
 * @param {COMPILER_ERRORS} error The compiler error as a string
 * @param {string} expected The expression the compiler was expecting
 * @param {string} token The token that caused the compiler error
 * @param {number} lineNumber The line number on which the error occurred
 */
const CompilerError = (error, expected, token, lineNumber) => {
  const generateError = () =>
    `[COMPILATION ERROR]: ${error} => expected ${expected}, got '${token}' on line ${lineNumber}`
  return {
    type: 'ERROR',
    value: generateError,
    print: generateError,
    isNode: false,
  }
}

/**
 * Returns a LangNode object
 * @param {string} type The type of the LangNode, as a string
 * @param {function} value A function which returns the value of the LangNode
 * @param {function} print Prints the LangNode as a string
 */
const LangNode = (type, value, print) => ({
  type,
  value,
  print: () => `[ ${type} ${print()} ]`,
  isNode: true,
})

const VoidNode = () => LangNode(
  'VOID',
  () => null,
  () => 'VOID'
)

/**
 * A number represented as a LangNode
 * @param {string} number The value of the number LangNode
 */
const NumberNode = (number) => LangNode(
  'NUMBER',
  () => Number(number),
  () => `${number}`,
)

/**
 * A binary expression
 * @param {string} operation The operation to execute
 * @param {LangNode} arg1 The first argument of the binary expression as a LangNode
 * @param {LangNode} arg2 The second argument of the binary expression as a LangNode
 */
const BinaryExpressionNode = (operation, arg1, arg2) => LangNode(
  'BINARY_EXPRESSION',
  () => {
    switch (operation) {
      case '+':
        return arg1.value() + arg2.value()

      case '-':
        return arg1.value() - arg2.value()

      case '*':
        return arg1.value() * arg2.value()

      case '/':
        return arg1.value() / arg2.value()
    }
  },
  () => `${operation}, ${arg1.print()}, ${arg2.print()}`,
)

const lexer = (line) => line.split(/\s+/)

const parseExpression = (tokens, lineNumber) => {

  // If there are no tokens, it's a null line
  if (
    !tokens.length ||
    (tokens.length === 1 && tokens[0] === '')
  ) {
    return VoidNode()
  }

  const stack = []

  while (!!tokens.length) {
    // Remove the last token in the stack
    const token = tokens.pop()

    // When the stack is empty
    if (!stack.length) {
      // If it's a number, push it onto the stack as a new node
      if (NUMBER_REGEX.test(token)) {
        stack.push(NumberNode(token))
      } else {
        // We don't end lines with anything other than literals
        return CompilerError(
          COMPILER_ERRORS.INVALID_TOKEN,
          'a number literal',
          token,
          lineNumber,
        )
      }
    } else {
      // Pop the last element off of the stack
      const prevNode = stack.pop()

      // If the last token is not a node, it's a compiler error,
      // thus return it immediately
      if (!prevNode.isNode) {
        return lastToken
      } else {

        // If the last token in the stack was a number or an operation
        if (
          prevNode.type === 'NUMBER' ||
          prevNode.type === 'BINARY_EXPRESSION'
        ) {
          // If the current token is not an operation,
          // throw a compiler error
          if (!OPERATION_REGEX.test(token)) {
            return CompilerError(
              COMPILER_ERRORS.INVALID_TOKEN,
              'an operation token',
              token,
              lineNumber,
            )
          } else {
            // Remove the next token from the list of tokens to
            // fill the left side of the operation
            const nextToken = tokens.pop()

            // If there is no next token, throw a compiler error
            if (!nextToken) {
              return CompilerError(
                COMPILER_ERRORS.INCOMPLETE_EXPRESSION,
                'a number literal',
                nextToken,
                lineNumber,
              )
            } else if (!NUMBER_REGEX.test(nextToken)) {
              // If the next token is not a regex, throw a compiler error
              return CompilerError(
                COMPILER_ERRORS.INVALID_TOKEN,
                'a number literal',
                nextToken,
                lineNumber,
              )
            } else {
              stack.push(BinaryExpressionNode(
                token,
                prevNode,
                NumberNode(nextToken),
              ))
            }
          }
        } else {
          return CompilerError(
            COMPILER_ERRORS.INVALID_STACK,
            'a number or an operation',
            prevNode.type,
            lineNumber,
          )
        }
      }
    }
  }

  // At this point, the stack should be a single expression.
  // If it's not, throw a compiler error
  if (stack.length > 1) {
    return CompilerError(
      COMPILER_ERRORS.MULTIPLE_EXPRESSIONS,
      'a single token',
      stack.toString(),
      lineNumber,
    )
  }

  return stack.pop()
}

const compile = (file) =>
  file.split('\n')
    .map((line, index) =>
      parseExpression(
        lexer(line.trim()),
        index + 1
      )
    )

const execute = (stack) =>
  stack.map(node =>
    node.value()
  )

const run = (file) =>
  execute(compile(file))
    .map(v => console.log(v))

// Expected output:
/*
  null
  1
  7
  5
  2
  1
  Incomplete expression: expected number literal, got ''
  Invalid token: expected number literal, got '/'
  Invalid token: expected number literal, got '+'
  null
*/
run(`
1
1 + 2 * 3
2 + 3
1 + 1
2 / 2
+ 1
/ + 1
1 +
`)
